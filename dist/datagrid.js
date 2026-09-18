/* =============================================================================
 * DataGrid — a dependency-free datagrid framework in pure JavaScript.
 *
 * No module system: load with a plain <script> tag; the constructor is
 * exposed as `DataGrid` on window (or globalThis in Node, for testing).
 *
 *   const grid = new DataGrid(containerEl, {
 *     columnDefs: [{ field: 'name', headerName: 'Name', sortable: true }],
 *     rowData: [{ name: 'Alice' }],
 *   });
 * ============================================================================= */
(global => {
  'use strict';

  /* ---------------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------------- */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 요소를 잘라내는 가장 가까운 스크롤/클립 조상의 rect (없으면 뷰포트).
   * absolute로 띄우는 목록이 어디까지 보일 수 있는지 판단하는 데 쓴다 —
   * `overflow: auto`인 조상은 그 밖으로 나간 자손을 그리지 않는다.
   */
  function clippingRect(node) {
    let cur = node && node.parentElement;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') return cur.getBoundingClientRect();
      cur = cur.parentElement;
    }
    const h = (global.innerHeight || document.documentElement.clientHeight || 0);
    return { top: 0, bottom: h };
  }

  function el(tag, className, parent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  const SORT_ICON_SVG =
    '<svg class="dg-sort-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M8 3v10M8 3L4 7M8 3l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const FILTER_ICON_SVG =
    '<svg class="dg-filter-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M1.5 2.5h13l-5 6v4.2l-3 1.3V8.5l-5-6z"/></svg>';
  const MENU_ICON_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<path d="M2 4.5h12v1.4H2zM2 7.3h12v1.4H2zM2 10.1h12v1.4H2z"/></svg>';
  const EDIT_ICON_SVG =
    '<svg class="dg-editable-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">' +
    '<path d="M11.9 1.3a1.1 1.1 0 0 1 1.6 0l1.2 1.2a1.1 1.1 0 0 1 0 1.6l-1.1 1.1-2.8-2.8 1.1-1.1z"/>' +
    '<path d="M10.1 3.1l2.8 2.8-7.2 7.2-3.5.7.7-3.5 7.2-7.2z"/></svg>';
  const CLOSE_SVG =
    '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">' +
    '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const CHEVRON_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">' +
    '<path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------------------------------------------------------------------
   * i18n (localeText)
   *
   * 그리드가 직접 그리는 모든 UI 문자열은 여기 한 곳에 모인다. JS 안에 문자열을
   * 다시 하드코딩하지 말 것 — 새 UI 텍스트가 생기면 이 표에 키를 추가하고
   * `this._t(key, params)`로 읽는다.
   *
   * `{name}` 토큰은 `interpolate`가 치환한다. 값이 안 주어진 토큰은 그대로 남겨
   * 커스텀 로케일의 오타가 화면에 드러나게 한다.
   * ------------------------------------------------------------------------- */

  const LOCALE_EN = {
    /* 필터 메뉴 · 헤더 필터 행 */
    filterPlaceholder: 'Filter…',
    filterToPlaceholder: 'To…',
    filterApply: 'Apply',
    filterClear: 'Clear',
    filterAll: '(All)',
    blanks: '(Blanks)',
    opContains: 'Contains',
    opNotContains: 'Does not contain',
    opEquals: 'Equals',
    opNotEqual: 'Not equal',
    opStartsWith: 'Starts with',
    opEndsWith: 'Ends with',
    opLessThan: 'Less than',
    opLessThanOrEqual: 'Less than or equal',
    opGreaterThan: 'Greater than',
    opGreaterThanOrEqual: 'Greater than or equal',
    opInRange: 'In range',

    /* 헤더 (대부분 aria-label · title) */
    selectAllRows: 'Select all rows',
    selectRow: 'Select row',
    selectSubtree: 'Select subtree',
    editableColumn: 'Editable column',
    filterMenuLabel: '{column} filter menu',
    columnFilterLabel: '{column} filter',

    /* 페이지네이션 */
    pageSizeLabel: 'Page size:',
    pageSummary: '{from} to {to} of {total}',
    firstPage: 'First page',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    lastPage: 'Last page',

    /* 오버레이 */
    noRowsToShow: 'No rows to show',
    loading: 'Loading…',

    /* 무한 스크롤 하단 상태 바 (infiniteScroll) */
    loadingMore: 'Loading more…',
    rowsLoaded: '{loaded} rows loaded',
    rowsLoadedOfTotal: '{loaded} of {total} rows loaded',
    noMoreRows: 'All {loaded} rows loaded',

    /* 그룹 헤더 · 전체 요약 행 */
    groupTotal: 'Total',
    rowCount: '({count})',

    /* 검색형 select/multiselect 에디터 (editorSearch) */
    searchPlaceholder: 'Search…',
    searchMinLength: 'Type {count}+ characters',
    noResults: 'No results',
    loadFailed: 'Load failed',
    removeChipLabel: 'Remove {label}',

    /* 상태 컬럼 (statusColumn) — statusColumn 설정이 있으면 그쪽이 우선 */
    statusColumnHeader: 'Status',
    statusAdded: 'New',
    statusUpdated: 'Updated',
    statusDeleted: 'Deleted',

    /* 팝업 에디터 (popupEditor) */
    popupEditTitle: 'Editing {value}',
    popupSave: 'Save',
    popupCancel: 'Cancel',
    popupCloseLabel: 'Close editor',
    popupReadonlySuffix: ' (readonly)',

    /* 필수 컬럼 (column.required) */
    requiredValue: '{column} is required',
    requiredIndicatorLabel: 'Required',
  };

  const LOCALE_KO = {
    filterPlaceholder: '필터…',
    filterToPlaceholder: '끝값…',
    filterApply: '적용',
    filterClear: '지우기',
    filterAll: '(전체)',
    blanks: '(빈 값)',
    opContains: '포함',
    opNotContains: '포함하지 않음',
    opEquals: '같음',
    opNotEqual: '같지 않음',
    opStartsWith: '시작 문자',
    opEndsWith: '끝 문자',
    opLessThan: '미만',
    opLessThanOrEqual: '이하',
    opGreaterThan: '초과',
    opGreaterThanOrEqual: '이상',
    opInRange: '범위',

    selectAllRows: '전체 행 선택',
    selectRow: '행 선택',
    selectSubtree: '하위 트리 선택',
    editableColumn: '편집 가능한 컬럼',
    filterMenuLabel: '{column} 필터 메뉴',
    columnFilterLabel: '{column} 필터',

    pageSizeLabel: '페이지 크기:',
    pageSummary: '{total}건 중 {from}–{to}',
    firstPage: '첫 페이지',
    previousPage: '이전 페이지',
    nextPage: '다음 페이지',
    lastPage: '마지막 페이지',

    noRowsToShow: '표시할 데이터가 없습니다',
    loading: '불러오는 중…',

    loadingMore: '더 불러오는 중…',
    rowsLoaded: '{loaded}건 불러옴',
    rowsLoadedOfTotal: '{total}건 중 {loaded}건 불러옴',
    noMoreRows: '{loaded}건 — 마지막 페이지입니다',

    groupTotal: '합계',
    rowCount: '({count}건)',

    searchPlaceholder: '검색…',
    searchMinLength: '{count}자 이상 입력하세요',
    noResults: '결과 없음',
    loadFailed: '불러오기 실패',
    removeChipLabel: '{label} 제거',

    statusColumnHeader: '상태',
    statusAdded: '신규',
    statusUpdated: '수정',
    statusDeleted: '삭제',

    popupEditTitle: '{value} 편집',
    popupSave: '저장',
    popupCancel: '취소',
    popupCloseLabel: '편집 창 닫기',
    popupReadonlySuffix: ' (읽기 전용)',

    requiredValue: '{column}은(는) 필수 항목입니다',
    requiredIndicatorLabel: '필수',
  };

  /**
   * `{name}` 토큰을 params 값으로 치환한다.
   * params에 없는 토큰은 그대로 둔다 — 커스텀 로케일의 오타를 화면에서 발견할 수 있게.
   */
  function interpolate(template, params) {
    const text = String(template === undefined || template === null ? '' : template);
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    );
  }

  /**
   * localeText 옵션을 기본(영어) 위에 병합한 완전한 문자열 맵으로 정규화한다.
   * 문자열이 아닌 값은 무시 — 실수로 넣은 객체/함수가 화면에 `[object Object]`로
   * 새는 것을 막는다. 모르는 키는 남겨둔다(소비자가 자기 UI에 재사용 가능).
   */
  function resolveLocaleText(localeText) {
    const out = Object.assign({}, LOCALE_EN);
    if (localeText && typeof localeText === 'object') {
      for (const key in localeText) {
        if (typeof localeText[key] === 'string') out[key] = localeText[key];
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------------------
   * Pure data logic (DOM-free, unit-testable in Node)
   * ------------------------------------------------------------------------- */

  function defaultComparator(a, b) {
    const aNil = a === null || a === undefined || a === '';
    const bNil = b === null || b === undefined || b === '';
    if (aNil && bNil) return 0;
    if (aNil) return 1; /* blanks last */
    if (bNil) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  /**
   * column.dataType('number'|'date'|'bool')에 맞는 정렬 비교 함수를 반환한다.
   * 'string'/미지정은 null을 반환해 defaultComparator를 쓰게 한다.
   * 모든 타입에서 빈 값(null/undefined/'')과 해석 불가 값은 뒤로 보낸다.
   */
  function typeComparator(dataType) {
    function nil(v) { return v === null || v === undefined || v === ''; }
    if (dataType === 'number') {
      return (a, b) => {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        const x = Number(a), y = Number(b);
        if (isNaN(x) && isNaN(y)) return 0;
        if (isNaN(x)) return 1;
        if (isNaN(y)) return -1;
        return x - y;
      };
    }
    if (dataType === 'date') {
      return (a, b) => {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        const x = a instanceof Date ? a.getTime() : new Date(a).getTime();
        const y = b instanceof Date ? b.getTime() : new Date(b).getTime();
        if (isNaN(x) && isNaN(y)) return 0;
        if (isNaN(x)) return 1;
        if (isNaN(y)) return -1;
        return x - y;
      };
    }
    if (dataType === 'bool') {
      return (a, b) => {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        return a === b ? 0 : a ? -1 : 1; /* true 먼저 (defaultComparator와 동일) */
      };
    }
    return null;
  }

  /**
   * 숫자 포맷: '#,##0.00' 스타일 마스크 + 리터럴 접두/접미(예: '$#,##0.00', '#,##0 원').
   * - ',' 포함 시 3자리 그룹핑
   * - 소수부: 자릿수만큼 반올림, '0'은 필수(패딩), '#'은 뒤쪽 0 제거
   * - 정수부 '0' 개수만큼 0 패딩
   * 빈 값/숫자 해석 불가면 '' / 원본 문자열을 반환한다.
   */
  function formatNumber(value, pattern) {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (isNaN(n)) return String(value);
    const m = String(pattern).match(/[#0][#0,.]*/);
    if (!m) return String(value);
    const mask = m[0].replace(/[,.]+$/, ''); /* 마스크 끝의 구분자는 리터럴 접미로 */
    const prefix = String(pattern).slice(0, m.index);
    const suffix = String(pattern).slice(m.index + mask.length);
    const dot = mask.indexOf('.');
    const intMask = dot === -1 ? mask : mask.slice(0, dot);
    const decMask = dot === -1 ? '' : mask.slice(dot + 1);
    const neg = n < 0;
    const fixed = Math.abs(n).toFixed(decMask.length);
    const parts = fixed.split('.');
    let intStr = parts[0];
    let decStr = parts[1] || '';
    const minDec = (decMask.match(/0/g) || []).length;
    while (decStr.length > minDec && decStr.charAt(decStr.length - 1) === '0') {
      decStr = decStr.slice(0, -1);
    }
    const minInt = (intMask.match(/0/g) || []).length;
    while (intStr.length < minInt) intStr = `0${intStr}`;
    if (intMask.includes(',')) {
      intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return (neg ? '-' : '') + prefix + intStr + (decStr ? `.${decStr}` : '') + suffix;
  }

  /**
   * 날짜 값 → Date. 시간대 표기가 없는 ISO 문자열('2024-03-15', '2024-03-15T14:30')은
   * 로컬 시간으로 해석한다 — new Date()는 날짜만 있는 ISO를 UTC 자정으로 읽기 때문에
   * UTC 음수 오프셋 지역에서 하루가 밀린다('2024-03-15'가 뉴욕에서 3월 14일, BUG-008).
   * Date·숫자(타임스탬프)·그 밖의 문자열(시간대가 붙은 ISO, '2024/03/15' 등)은
   * 절대 시각이 명확하므로 new Date()에 그대로 위임한다.
   */
  function parseLocalDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(value));
    if (!m) return new Date(value);
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }

  /**
   * 날짜 포맷: yyyy/yy/MM/dd/HH/mm/ss 토큰 치환. Date 인스턴스 또는
   * Date로 해석 가능한 문자열/숫자를 받는다. 해석 불가면 원본 문자열 반환.
   */
  function formatDate(value, pattern) {
    if (value === null || value === undefined || value === '') return '';
    const d = parseLocalDate(value);
    if (isNaN(d.getTime())) return String(value);
    function p2(x) { return x < 10 ? `0${x}` : String(x); }
    return String(pattern)
      .replace(/yyyy/g, String(d.getFullYear()))
      .replace(/yy/g, String(d.getFullYear()).slice(-2))
      .replace(/MM/g, p2(d.getMonth() + 1))
      .replace(/dd/g, p2(d.getDate()))
      .replace(/HH/g, p2(d.getHours()))
      .replace(/mm/g, p2(d.getMinutes()))
      .replace(/ss/g, p2(d.getSeconds()));
  }

  /**
   * date/datetime 에디터의 `<input>` 표시 값 — 'yyyy-MM-dd' | 'yyyy-MM-ddTHH:mm'.
   * 네이티브 date/datetime-local 입력이 요구하는 형식이며 로컬 시간 기준이다.
   * 빈 값이거나 날짜로 해석할 수 없으면 ''(빈 입력으로 연다).
   */
  function toDateInputValue(value, withTime) {
    if (value === null || value === undefined || value === '') return '';
    const d = parseLocalDate(value);
    if (isNaN(d.getTime())) return '';
    return formatDate(d, withTime ? 'yyyy-MM-ddTHH:mm' : 'yyyy-MM-dd');
  }

  /**
   * date/datetime 에디터의 커밋 값 — 원본 값의 타입을 보존한다
   * (select 에디터가 editorOptions의 value 타입을 보존하는 것과 같은 규약).
   *   Date 인스턴스 → Date · 숫자(타임스탬프) → 숫자 · 그 밖 → 문자열
   * 문자열일 때 opts.format이 날짜 패턴이면 그 표기로 맞춘다(원시 값과 화면 표기 일치).
   * opts.valueType으로 'date'|'timestamp'|'string' 강제 지정 가능('auto'/생략은 위 규칙).
   *
   * 빈 입력은 null(날짜 지우기). 단 원본도 빈 값이면 원본을 그대로 반환한다 —
   * 열었다 그냥 닫았을 때 '' → null 스퓨리어스 커밋이 나지 않게 하는 가드.
   */
  function parseDateInputValue(inputValue, originalValue, opts) {
    opts = opts || {};
    if (inputValue === null || inputValue === undefined || inputValue === '') {
      const nilOriginal =
        originalValue === null || originalValue === undefined || originalValue === '';
      return nilOriginal ? originalValue : null;
    }
    const d = parseLocalDate(inputValue);
    if (isNaN(d.getTime())) return originalValue; /* 해석 불가 입력은 변경 없음 */
    let type = opts.valueType;
    if (!type || type === 'auto') {
      type = originalValue instanceof Date ? 'date'
        : typeof originalValue === 'number' ? 'timestamp'
        : 'string';
    }
    if (type === 'date') return d;
    if (type === 'timestamp') return d.getTime();
    /* 숫자 마스크(#/0)는 날짜 패턴이 아니므로 입력 원문을 그대로 둔다 (formatValue와 같은 판별) */
    return opts.format && !/[#0]/.test(String(opts.format))
      ? formatDate(d, opts.format)
      : String(inputValue);
  }

  /**
   * 편집 커밋 여부 판정용 값 비교. Date는 참조가 아니라 시각으로 비교한다 —
   * 안 그러면 date 에디터를 열었다 그대로 닫을 때마다 새 Date 인스턴스가
   * 만들어져 매번 변경으로 잡힌다.
   */
  function editValueEquals(a, b) {
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    return a === b;
  }

  /** column.editor 미지정 시 dataType/filter로 정하는 기본 에디터 종류. */
  function defaultEditorType(col) {
    if (col.dataType === 'number' || col.filter === 'number') return 'number';
    if (col.dataType === 'date') return 'date';
    return 'text';
  }

  /**
   * date/datetime 에디터의 editorOptions — `{ min, max, step, valueType }`.
   * select 계열이 쓰는 배열 형식은 날짜 에디터와 무관하므로 무시한다.
   */
  function dateEditorOptions(col) {
    const o = col.editorOptions;
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  }

  /**
   * domLayout 정규화 — 'normal'(기본) | 'autoHeight' | 'fill'.
   * 모르는 값은 'normal'로 떨어뜨린다(오타가 레이아웃을 통째로 바꾸지 않게).
   */
  function resolveDomLayout(value) {
    return value === 'autoHeight' || value === 'fill' ? value : 'normal';
  }

  /**
   * 데이터 모드 정규화 — sortMode/filterMode는 명시하지 않으면 pageMode를 따른다.
   *
   * 서버 페이징이면 클라이언트가 들고 있는 _rows는 "현재 한 페이지"뿐이다.
   * 그 상태에서 클라이언트 정렬은 페이지 안에서만 정렬하면서 헤더에는 전체 정렬처럼
   * 표시되고, 클라이언트 필터는 페이지를 걸러내는데 총 건수는 서버 값(_serverTotal)이라
   * "1–20 / 10,000"이라 써놓고 7행만 나오는 식으로 어긋난다. 그래서 pageMode: 'server'는
   * 나머지 두 축을 함께 끌어올리는 것을 기본으로 한다.
   *
   * 상속은 pageMode → sort/filter 단방향뿐이다. 반대 조합(sortMode: 'server' +
   * pageMode: 'client')은 서버가 정렬된 전체를 주고 클라가 페이징하는 정상 구성이라
   * pageMode를 끌어올리면 안 된다.
   *
   * 명시적으로 어긋나게 지정한 경우(pageMode: 'server' + sortMode: 'client')는
   * "현재 페이지 안에서만 정렬"이 의도일 수 있으므로 존중하되 warnings로 알린다.
   * 순수 함수 — 경고 출력은 호출자가 한다.
   */
  function resolveDataModes(options) {
    const opts = options || {};
    const norm = value => (value === 'server' ? 'server' : 'client');
    /* 무한 스크롤은 "바닥에서 다음 페이지를 서버에 요청"이므로 서버 페이징이 전제다.
     * pageMode를 적지 않았으면 server로 올린다(그러면 sort/filter도 따라 올라간다). */
    const infinite = !!opts.infiniteScroll;
    const pageMode = infinite && (opts.pageMode === undefined || opts.pageMode === null)
      ? 'server'
      : norm(opts.pageMode);
    const warnings = [];
    const inherit = key => {
      const raw = opts[key];
      if (raw === undefined || raw === null) return pageMode;
      const mode = norm(raw);
      if (pageMode === 'server' && mode === 'client') warnings.push(key);
      return mode;
    };
    return { pageMode, sortMode: inherit('sortMode'), filterMode: inherit('filterMode'), warnings };
  }

  /**
   * reloadData(opts)가 1페이지로 되돌릴지.
   *
   * 명시적 재조회는 "조회 조건이 바뀌었으니 다시 받아라"인 경우가 대부분이라
   * 리셋이 기본이다 — 12페이지를 보던 중 조건이 좁혀져 결과가 3페이지로 줄면
   * 페이지를 유지한 채로는 빈 화면이 나온다(서버는 범위 밖 페이지에 빈 배열을 준다).
   * setDataSource()가 이미 1페이지로 되돌리는 것과도 일관된다.
   *
   * 저장 후 보던 페이지 그대로 새로고침하는 경우는 { keepPage: true }.
   * 정렬/필터/페이지 이동에 따른 내부 재조회는 각자 페이지를 관리하므로
   * 이 경로(공개 reloadData)를 타지 않고 _fetchData()를 직접 호출한다.
   */
  function shouldResetPageOnReload(opts) {
    return !(opts && opts.keepPage);
  }

  /**
   * 그리드가 dataSource를 받았을 때 **스스로** 첫 조회를 할지 (dataSource.autoLoad, 기본 true).
   *
   * false면 그리드가 먼저 서버를 부르지 않는다 — 검색 조건을 입력받은 뒤에 조회하는 화면,
   * 비싼 쿼리, 탭이 열릴 때까지 미루는 경우용. 조회는 소비자가 reloadData()로 시작한다.
   * 명시적 호출(reloadData/loadMore)은 이 옵션과 무관하게 항상 조회한다 —
   * autoLoad는 "자동"만 끄는 것이지 데이터 소스를 비활성화하는 게 아니다.
   */
  function shouldAutoLoad(dataSource) {
    return !!(dataSource && dataSource.autoLoad !== false);
  }

  const INFINITE_DEFAULT_THRESHOLD = 200;

  /**
   * infiniteScroll 옵션 정규화 — true | { threshold, pageSize }.
   *
   * 무한 스크롤은 "바닥에 닿으면 다음 페이지를 자동 조회해 누적"이므로 원격
   * dataSource가 없으면 자동 조회할 대상 자체가 없다(클라이언트는 이미 전량을
   * 들고 있다) — 조용히 무시하지 않고 warnings로 알린 뒤 비활성.
   *
   * pageMode: 'client'를 명시하면 요청에 page/pageSize가 실리지 않아 매번 같은
   * 페이지를 받아 누적하게 된다. 이 역시 warnings로 알린다(막지는 않는다 —
   * request 훅으로 직접 페이징 파라미터를 만드는 구성이 가능하므로).
   *
   * 순수 함수 — 경고 출력은 호출자가 한다.
   */
  function resolveInfiniteScroll(options) {
    const opts = options || {};
    const raw = opts.infiniteScroll;
    const warnings = [];
    if (!raw) {
      return {
        enabled: false, threshold: INFINITE_DEFAULT_THRESHOLD,
        pageSize: null, pageSizeSelector: false, warnings,
      };
    }
    const cfg = typeof raw === 'object' ? raw : {};
    let enabled = true;
    if (!opts.dataSource) { enabled = false; warnings.push('noDataSource'); }
    if (enabled && opts.pageMode === 'client') warnings.push('clientPageMode');
    /* autoHeight는 바디가 내용만큼 자라 스크롤이 생기지 않는다 = 항상 바닥이다.
     * 막지는 않되(작은 데이터셋에서는 의도일 수 있다) 끝까지 다 받는다는 걸 알린다. */
    if (enabled && opts.domLayout === 'autoHeight') warnings.push('autoHeight');
    const threshold = typeof cfg.threshold === 'number' && cfg.threshold >= 0
      ? cfg.threshold
      : INFINITE_DEFAULT_THRESHOLD;
    const pageSize = typeof cfg.pageSize === 'number' && cfg.pageSize > 0 ? Math.floor(cfg.pageSize) : null;
    /* 페이저가 없으니 크기를 바꿀 UI도 사라진다 — 상태 바가 그 자리를 대신하므로 기본 표시.
     * 서버 부하 때문에 소비자가 크기를 고정하고 싶으면 false로 끈다. */
    const pageSizeSelector = cfg.pageSizeSelector !== false;
    return { enabled, threshold, pageSize, pageSizeSelector, warnings };
  }

  /**
   * 지금 다음 페이지를 불러와야 하는가.
   *
   * scrollHeight <= clientHeight(스크롤이 아예 생기지 않은 경우)도 "바닥"으로
   * 판정된다 — 첫 페이지가 뷰포트를 못 채우면 scroll 이벤트가 영영 오지 않아
   * "더 있는데 멈춘 그리드"가 되기 때문. append 직후 이 함수를 다시 돌리면
   * 뷰포트가 찰 때까지 이어 받는다.
   */
  function shouldLoadMore(state) {
    const s = state || {};
    if (!s.enabled || !s.hasMore || s.loading) return false;
    /* 레이아웃이 아직 없거나(숨겨진 탭·display:none) 높이가 0이면 "바닥"을 판정할 수 없다.
     * 이 가드가 없으면 안 보이는 그리드가 스스로 끝까지 다 받아버린다. */
    if (!s.clientHeight) return false;
    const threshold = typeof s.threshold === 'number' ? s.threshold : INFINITE_DEFAULT_THRESHOLD;
    const remaining = (s.scrollHeight || 0) - (s.scrollTop || 0) - (s.clientHeight || 0);
    return remaining <= threshold;
  }

  /**
   * 응답에서 "마지막 페이지" 플래그를 읽는다 — true(마지막) | false(더 있음) | null(모름).
   *
   * 서버마다 이름이 갈린다: Spring Data Page는 `last`/`hasNext`, 커스텀 API는
   * `hasMore`/`lastPage`/`isLast`가 흔하다. hasMore/hasNext는 의미가 반대이므로 뒤집는다.
   * 불리언이 아닌 값은 모름으로 둔다(문자열 'false'가 true로 읽히지 않게).
   */
  function readLastPageFlag(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.last === 'boolean') return obj.last;
    if (typeof obj.lastPage === 'boolean') return obj.lastPage;
    if (typeof obj.isLast === 'boolean') return obj.isLast;
    if (typeof obj.hasMore === 'boolean') return !obj.hasMore;
    if (typeof obj.hasNext === 'boolean') return !obj.hasNext;
    return null;
  }

  /**
   * 마지막 페이지인지 확정한다. 우선순위:
   *   1. 서버 명시 플래그 — 있으면 무조건 그것(다른 신호로 덮지 않는다)
   *   2. 수신 0건 — 무한 루프 안전장치. 플래그도 total도 없는 서버에서 이게
   *      없으면 바닥에 닿을 때마다 영원히 빈 응답을 요청한다
   *   3. total을 서버가 실제로 준 경우 loaded >= total
   *   4. 받은 건수가 요청한 pageSize보다 적으면 마지막 (관례적 추론)
   * 어느 것도 성립하지 않으면 "더 있음".
   */
  function resolveLastPage(ctx) {
    const c = ctx || {};
    if (typeof c.explicit === 'boolean') return c.explicit;
    const received = c.receivedCount || 0;
    if (received === 0) return true;
    if (typeof c.total === 'number' && c.total >= 0 && (c.loaded || 0) >= c.total) return true;
    if (typeof c.pageSize === 'number' && c.pageSize > 0 && received < c.pageSize) return true;
    return false;
  }

  /**
   * 페이지 크기 선택지 목록 — 오름차순 · 중복 제거 · **현재 값 포함 보장**.
   *
   * 현재 크기가 목록에 없으면 select의 value가 어디에도 안 걸려 selectedIndex가
   * -1이 되고 빈 칸이 보인다(paginationPageSize: 25 + 기본 목록 [10,20,50,100]).
   * 페이저와 무한 스크롤 상태 바가 이 함수를 공유한다.
   */
  function pageSizeSelectOptions(list, current) {
    const out = [];
    (list || []).forEach(v => {
      const n = Number(v);
      if (!isFinite(n) || n <= 0 || out.indexOf(n) !== -1) return;
      out.push(n);
    });
    const cur = Number(current);
    if (isFinite(cur) && cur > 0 && out.indexOf(cur) === -1) out.push(cur);
    return out.sort((a, b) => a - b);
  }

  /**
   * 하단 상태 바에 무엇을 쓸지 — { kind, key, params }.
   * kind: 'loading' | 'end' | 'more'. key는 로케일 키, params는 {token} 치환값.
   * DOM 없이 결정되도록 분리(테스트 가능).
   */
  function resolveInfiniteStatus(state) {
    const s = state || {};
    const loaded = s.loaded || 0;
    const hasTotal = typeof s.total === 'number' && s.total >= 0;
    if (s.loading) return { kind: 'loading', key: 'loadingMore', params: {} };
    if (!s.hasMore) return { kind: 'end', key: 'noMoreRows', params: { loaded, total: hasTotal ? s.total : loaded } };
    if (hasTotal) return { kind: 'more', key: 'rowsLoadedOfTotal', params: { loaded, total: s.total } };
    return { kind: 'more', key: 'rowsLoaded', params: { loaded } };
  }

  /**
   * editableIndicator: 이 컬럼 헤더에 편집 아이콘을 표시할지.
   * "지금 실제로 편집할 수 있는가"를 기준으로 한다 — 그리드가 잠겨 있으면
   * (editable: false / setEditable(false)) 컬럼 설정과 무관하게 표시하지 않는다.
   * 체크박스 선택 컬럼·상태 컬럼 같은 내장 컬럼은 editable이 false라 자연히 제외된다.
   */
  function shouldShowEditableIcon(col, gridEditable, indicatorOn) {
    return !!(indicatorOn && gridEditable && col && col.editable);
  }

  /**
   * 필수값 판정의 "빈 값" 정의.
   * 0과 false는 유효한 입력이므로 빈 값이 아니다 — 숫자 0이나 체크 해제를
   * 미입력으로 오해하면 정상 값의 저장을 막아버린다.
   * 공백만 있는 문자열과 빈 배열(multiselect)은 빈 값으로 본다.
   */
  function isBlankValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  /** required 위반 여부 — 컬럼이 required가 아니면 값과 무관하게 false. */
  function isRequiredViolated(col, value) {
    return !!(col && col.required) && isBlankValue(value);
  }

  /**
   * 필수 표시를 지금 보여줄지.
   * 기준은 shouldShowEditableIcon과 동일한 "지금 실제로 편집할 수 있는가" —
   * 고칠 수 없는 자리에 "필수"라고 적어도 사용자가 할 수 있는 일이 없다.
   * 그리드를 잠그면(setEditable(false)) 표시가 사라진다.
   *
   * `editableHere`는 컬럼보다 넓은 범위의 잠금을 모두 반영한 값이다 — 헤더에서는
   * 그리드 잠금만, 셀에서는 행/셀 잠금까지 포함해서 넘긴다.
   */
  function shouldShowRequired(col, editableHere) {
    return !!(editableHere && col && col.required && col.editable);
  }

  /**
   * 셀 코너 마커를 그릴지 — "필수인데 비어 있다"일 때만.
   * required는 컬럼 전체가 같은 정적 성질이라 모든 셀에 그리면 정보량이 0이다.
   * 그래서 마커는 조치가 필요한 곳만 가리킨다(dirty 마커가 "상태"를 가리키는 것과
   * 같은 역할). 그리드 헤더에는 표식을 두지 않는다 — `*`는 팝업 폼 라벨에만.
   */
  function shouldMarkRequiredCell(col, value, editableHere) {
    return shouldShowRequired(col, editableHere) && isBlankValue(value);
  }

  /* ---- 행/셀 잠금 (setRowEnabled · setCellEnabled) ----
   *
   * 잠금 상태는 "잠긴 것만" 담는 sparse 맵이다. 기본이 활성이므로 행이 10,000개여도
   * 잠근 3개만 들고 있으면 된다.
   *   { rows: { <rowId>: true }, cells: { <rowId>: { <field>: true } } }
   *
   * 맵을 그 자리에서 고치지 않고 새 맵을 반환하는 이유는 두 가지다 — 테스트가
   * "입력 → 출력"으로 단순해지고, 잠금이 바뀌었는지를 참조 비교로 알 수 있다.
   */

  function emptyLockMap() {
    return { rows: Object.create(null), cells: Object.create(null) };
  }

  function cloneLockMap(locks) {
    const src = locks || emptyLockMap();
    const out = emptyLockMap();
    for (const id in src.rows) out.rows[id] = true;
    for (const id in src.cells) {
      const fields = Object.create(null);
      let any = false;
      for (const f in src.cells[id]) { fields[f] = true; any = true; }
      if (any) out.cells[id] = fields;
    }
    return out;
  }

  /** 행 전체가 잠겼는가. */
  function isRowLocked(locks, rowId) {
    return !!(locks && locks.rows && locks.rows[rowId]);
  }

  /**
   * 이 셀이 잠겼는가.
   * 행 잠금은 그 행의 모든 셀을 덮는다 — 더 넓은 범위가 이긴다. 그래서 행을 잠근 뒤
   * 셀 하나만 `setCellEnabled(row, field, true)`로 되살릴 수는 없다(문서에 명시).
   */
  function isCellLocked(locks, rowId, field) {
    if (isRowLocked(locks, rowId)) return true;
    const byRow = locks && locks.cells ? locks.cells[rowId] : null;
    return !!(byRow && byRow[field]);
  }

  /** 행 잠금을 일괄 설정한 새 맵. 배열을 받는 이유는 N번 복사를 피하기 위함. */
  function setRowLocks(locks, rowIds, locked) {
    const out = cloneLockMap(locks);
    (rowIds || []).forEach(id => {
      if (id === undefined || id === null) return;
      if (locked) out.rows[id] = true;
      else delete out.rows[id];
    });
    return out;
  }

  /** 셀 잠금을 일괄 설정한 새 맵. 마지막 필드를 풀면 행 항목 자체를 지운다(찌꺼기 방지). */
  function setCellLocks(locks, rowIds, fields, locked) {
    const out = cloneLockMap(locks);
    (rowIds || []).forEach(id => {
      if (id === undefined || id === null) return;
      (fields || []).forEach(field => {
        if (field === undefined || field === null) return;
        if (locked) {
          if (!out.cells[id]) out.cells[id] = Object.create(null);
          out.cells[id][field] = true;
        } else if (out.cells[id]) {
          delete out.cells[id][field];
          let any = false;
          for (const f in out.cells[id]) { any = true; break; }
          if (!any) delete out.cells[id];
        }
      });
    });
    return out;
  }

  /**
   * 이 셀을 지금 편집할 수 있는가 — **모든 편집 진입점이 공유하는 단 하나의 판정**.
   * 더블클릭·단일클릭·키보드 Enter·startEdit()·인접 셀 이동·붙여넣기·채우기·팝업 폼이
   * 전부 이 함수를 거친다. 한 곳만 막으면 나머지로 새어 나가기 때문이다.
   *
   * 넓은 범위부터: 그리드 잠금(setEditable) → 행 잠금 → 셀 잠금 → 컬럼 editable.
   */
  function isCellEditableNow(locks, rowId, col, gridEditable) {
    if (!gridEditable) return false;
    if (!col || !col.editable || col.field === undefined) return false;
    return !isCellLocked(locks, rowId, col.field);
  }

  /** column.format / DataGrid.format() 진입점 — '#'나 '0'이 있으면 숫자, 아니면 날짜 패턴. */
  function formatValue(value, pattern) {
    if (pattern === null || pattern === undefined || pattern === '') {
      return value === null || value === undefined ? '' : String(value);
    }
    return /[#0]/.test(String(pattern))
      ? formatNumber(value, pattern)
      : formatDate(value, pattern);
  }

  /**
   * sortModel: [{ field, dir: 'asc'|'desc' }]
   * comparators: { field: fn(a, b, rowA, rowB) } (optional overrides)
   * Stable sort; returns a new array.
   */
  function sortRows(rows, sortModel, comparators) {
    if (!sortModel || sortModel.length === 0) return rows.slice();
    comparators = comparators || {};
    const indexed = rows.map((row, i) => ({
      row,
      i
    }));
    indexed.sort((x, y) => {
      for (let s = 0; s < sortModel.length; s++) {
        const field = sortModel[s].field;
        const dir = sortModel[s].dir === 'desc' ? -1 : 1;
        const cmp = comparators[field] || defaultComparator;
        const r = cmp(x.row[field], y.row[field], x.row, y.row);
        if (r !== 0) return r * dir;
      }
      return x.i - y.i;
    });
    return indexed.map(e => e.row);
  }

  /**
   * Builds a predicate for one column filter model.
   * model: { type: 'text'|'number'|'set', op, value, valueTo, values }
   */
  function buildFilterPredicate(field, model) {
    if (!model) return null;
    if (model.type === 'set') {
      const allowed = {};
      (model.values || []).forEach(v => { allowed[String(v)] = true; });
      return row => allowed[String(row[field])] === true;
    }
    if (model.type === 'number') {
      const num = Number(model.value);
      const numTo = Number(model.valueTo);
      return row => {
        let v = row[field];
        if (v === null || v === undefined || v === '') return false;
        v = Number(v);
        if (isNaN(v)) return false;
        switch (model.op) {
          case 'equals': return v === num;
          case 'notEqual': return v !== num;
          case 'lessThan': return v < num;
          case 'lessThanOrEqual': return v <= num;
          case 'greaterThan': return v > num;
          case 'greaterThanOrEqual': return v >= num;
          case 'inRange': return v >= num && v <= numTo;
          default: return true;
        }
      };
    }
    /* text */
    const needle = String(model.value === undefined || model.value === null ? '' : model.value).toLowerCase();
    return row => {
      const raw = row[field];
      const hay = (raw === null || raw === undefined ? '' : String(raw)).toLowerCase();
      switch (model.op) {
        case 'equals': return hay === needle;
        case 'notEqual': return hay !== needle;
        case 'startsWith': return hay.indexOf(needle) === 0;
        case 'endsWith': return needle.length === 0 || hay.slice(-needle.length) === needle;
        case 'notContains': return !hay.includes(needle);
        case 'contains':
        default: return hay.includes(needle);
      }
    };
  }

  /** filterModel: { field: model } — AND across columns. Returns a new array. */
  function filterRows(rows, filterModel) {
    const predicates = [];
    for (const field in filterModel) {
      if (Object.prototype.hasOwnProperty.call(filterModel, field)) {
        const p = buildFilterPredicate(field, filterModel[field]);
        if (p) predicates.push(p);
      }
    }
    if (predicates.length === 0) return rows.slice();
    return rows.filter(row => {
      for (let i = 0; i < predicates.length; i++) {
        if (!predicates[i](row)) return false;
      }
      return true;
    });
  }

  /** Case-insensitive match against the given fields' values. */
  function quickFilterRows(rows, text, fields) {
    const needle = String(text || '').trim().toLowerCase();
    if (!needle) return rows.slice();
    const terms = needle.split(/\s+/);
    return rows.filter(row => {
      const hay = fields
        .map(f => {
          const v = row[f];
          return v === null || v === undefined ? '' : String(v);
        })
        .join(' ')
        .toLowerCase();
      for (let t = 0; t < terms.length; t++) {
        if (!hay.includes(terms[t])) return false;
      }
      return true;
    });
  }

  /**
   * 행 배열 → 엑셀 호환 TSV. 값은 원시 데이터를 그대로 사용한다
   * (포매터 미적용 — 붙여넣기 왕복과 스프레드시트 숫자 인식을 위해).
   * 탭·개행·따옴표가 든 값은 큰따옴표로 감싸고 내부 따옴표는 두 번 쓴다.
   */
  function buildTsv(rows, columns) {
    function esc(v) {
      const s = v === null || v === undefined ? '' : String(v);
      if (/[\t\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }
    return rows
      .map(row => columns.map(c => esc(row[c.field])).join('\t'))
      .join('\r\n');
  }

  /**
   * TSV 텍스트 → 2차원 문자열 배열. 큰따옴표 셀(내부 탭/개행/"" 이스케이프)을
   * 지원하고, 스프레드시트가 붙이는 마지막 빈 줄 하나는 무시한다.
   */
  function parseTsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    let i = 0;
    const s = String(text);
    while (i < s.length) {
      const ch = s[i];
      if (inQuotes) {
        if (ch === '"') {
          if (s[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"' && cell === '') { inQuotes = true; i++; continue; }
      if (ch === '\t') { row.push(cell); cell = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
      cell += ch; i++;
    }
    row.push(cell);
    rows.push(row);
    /* 스프레드시트 복사분은 개행으로 끝나 마지막에 빈 행이 하나 생긴다 */
    const last = rows[rows.length - 1];
    if (rows.length > 1 && last.length === 1 && last[0] === '') rows.pop();
    return rows;
  }

  /**
   * column.validator 반환값 해석: 유효하면 null, 아니면 표시할 오류 메시지.
   * true/undefined/null = 유효, 문자열 = 해당 메시지로 거부,
   * 그 외 falsy(false 등) = 기본 메시지로 거부.
   */
  function validationMessage(result) {
    if (result === true || result === undefined || result === null) return null;
    return typeof result === 'string' && result !== '' ? result : 'Invalid value';
  }

  /**
   * select 에디터의 editorOptions 정규화 → [{ label, value }].
   * - 'kr' 같은 원시값: label = value = 그 값.
   * - { label: '한국', value: 'kr' } 객체: 그대로. label이 없으면 value로 대체.
   *   value가 없으면(undefined) label을 value로 사용.
   * - null/undefined 항목은 건너뛴다. value의 원본 타입(숫자 등)은 보존한다.
   */
  function normalizeEditorOptions(options) {
    if (!Array.isArray(options)) return [];
    const out = [];
    options.forEach(opt => {
      if (opt === null || opt === undefined) return;
      if (typeof opt === 'object') {
        const value = opt.value !== undefined ? opt.value : opt.label;
        if (value === undefined) return;
        const label = opt.label !== undefined && opt.label !== null ? opt.label : value;
        out.push({ label: String(label), value });
      } else {
        out.push({ label: String(opt), value: opt });
      }
    });
    return out;
  }

  /**
   * editorOptions에서 value에 해당하는 label을 찾는다 (없으면 null).
   * 엄격 일치를 먼저 보고, select.value 경유로 문자열화된 값도 매칭한다
   * (숫자 value 등 — 단 label을 못 찾는 경우에만 완화).
   */
  function lookupOptionLabel(options, value) {
    const list = normalizeEditorOptions(options);
    let i;
    for (i = 0; i < list.length; i++) {
      if (list[i].value === value) return list[i].label;
    }
    if (value === null || value === undefined) return null;
    for (i = 0; i < list.length; i++) {
      if (String(list[i].value) === String(value)) return list[i].label;
    }
    return null;
  }

  /**
   * checkbox 에디터/렌더러의 체크 여부 판정.
   * opts = { checked, unchecked } 매핑이 있으면 checked 값과 일치 여부로 판정
   * (엄격 일치 우선, 문자열화 일치 허용 — 숫자 1과 '1' 등).
   * 매핑이 없으면 불리언 외 관용 표기를 지원한다:
   * 'y'/'yes'/'true'/'1'(대소문자 무관) → 체크, 'n'/'no'/'false'/'0'/'' → 해제,
   * 그 외에는 truthy 여부.
   */
  function isCheckedValue(value, opts) {
    if (opts && typeof opts === 'object' && !Array.isArray(opts) && 'checked' in opts) {
      return value === opts.checked ||
        (value !== null && value !== undefined && String(value) === String(opts.checked));
    }
    if (typeof value === 'string') {
      const s = value.toLowerCase();
      if (s === 'y' || s === 'yes' || s === 'true' || s === '1') return true;
      if (s === 'n' || s === 'no' || s === 'false' || s === '0' || s === '') return false;
    }
    return !!value;
  }

  /** 다중 값 저장 표현의 구분자. 옵션으로 열지 않는다 — 표현이 늘면 왕복 규칙이 흔들린다. */
  const MULTI_SEPARATOR = ',';

  /**
   * multiselect 값 정규화 → 항상 배열.
   * 배열은 그대로, 콤마 구분 문자열은 분해(항목 trim, 빈 항목 제거),
   * null/undefined/빈 문자열은 [], 그 외 단일 값은 [값].
   * 렌더러·에디터·변경감지가 전부 이 함수를 거치므로, 두 표현을 여기서 한 번만 흡수한다.
   * 한계: 옵션 값 자체에 콤마가 들어 있으면 분해된다(콤마 저장 표현의 본질적 제약).
   */
  function normalizeMultiValue(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    if (typeof value === 'string') {
      return value.split(MULTI_SEPARATOR).map(s => s.trim()).filter(s => s !== '');
    }
    return [value];
  }

  /**
   * 편집 결과(배열)를 저장 표현으로 되돌린다.
   * **원본이 쓰던 표현을 유지한다** — 배열이면 배열, 그 외(문자열·null·미정의)면
   * 콤마 문자열. 편집 한 번으로 컬럼의 값 타입이 바뀌면 서버 스키마와 어긋나므로
   * 타입 보존이 기본이고, 추론할 원본이 없을 때의 기본값이 문자열이다.
   */
  function denormalizeMultiValue(values, original) {
    const list = normalizeMultiValue(values);
    if (Array.isArray(original)) return list.slice();
    return list.join(MULTI_SEPARATOR);
  }

  /**
   * 편집 전후 값의 동등 판정. 다중 값은 **표현이 아니라 내용**으로 비교한다 —
   * `['a','b']` · `'a,b'` · `'a, b'`는 모두 같은 값이다. 표현 차이(공백·타입)만으로
   * 변경으로 잡히면 열었다 그냥 닫아도 저장이 일어난다.
   */
  function sameEditValue(newValue, oldValue, multi) {
    if (multi || Array.isArray(newValue) || Array.isArray(oldValue)) {
      return shallowArrayEquals(normalizeMultiValue(newValue), normalizeMultiValue(oldValue));
    }
    return editValueEquals(newValue, oldValue);
  }

  /** 두 배열의 얕은 동등성 (길이·순서 포함 엄격 비교). 배열이 아니면 false. */
  function shallowArrayEquals(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * 다중 값 → label 배열 (multiselect 렌더러용).
   * 목록에서 못 찾은 값은 문자열 그대로, null/undefined 항목은 건너뛴다.
   */
  function lookupOptionLabels(options, values) {
    return lookupOptionLabelsWith(options, values, null);
  }

  /**
   * `lookupOptionLabels` + value→label 캐시 폴백.
   * lazy 검색(editorSearch.fetch)으로 고른 값은 정적 editorOptions에 없으므로,
   * 고를 당시에 기억해 둔 label을 본다 (단일 값 쪽 `renderers.searchselect`와 같은 출처).
   * cache는 `{ [String(value)]: label }` 평면 맵. 캐시에도 없으면 값 그대로.
   */
  function lookupOptionLabelsWith(options, values, cache) {
    const out = [];
    normalizeMultiValue(values).forEach(v => {
      if (v === null || v === undefined) return;
      const label = lookupOptionLabel(options, v);
      if (label !== null) { out.push(label); return; }
      const cached = cachedOptionLabel(cache, v);
      out.push(cached !== null ? cached : String(v));
    });
    return out;
  }

  /**
   * value→label 캐시 조회 (없으면 null).
   * `in`이나 `!== undefined`로 보면 `'toString'`·`'constructor'` 같은 값이
   * Object.prototype의 프로퍼티에 걸려 함수가 label로 새어 나온다 — 자기 소유 키만 본다.
   */
  function cachedOptionLabel(cache, value) {
    if (!cache || value === null || value === undefined) return null;
    const key = String(value);
    return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null;
  }

  /**
   * 다중 값 목록에서 value의 위치 (없으면 -1).
   * 엄격 일치를 먼저 보고 문자열화 폴백 — 콤마 문자열에서 온 `'1'`과 옵션의 숫자 `1`은
   * 같은 항목이다 (`lookupOptionLabel`과 같은 규약).
   */
  function multiValueIndex(list, value) {
    const cur = normalizeMultiValue(list);
    let i;
    for (i = 0; i < cur.length; i++) {
      if (cur[i] === value) return i;
    }
    if (value === null || value === undefined) return -1;
    for (i = 0; i < cur.length; i++) {
      if (cur[i] !== null && cur[i] !== undefined && String(cur[i]) === String(value)) return i;
    }
    return -1;
  }

  /**
   * 다중 선택 토글 — 이미 있으면 빼고, 없으면 **맨 뒤에 붙인다**.
   * 새 배열을 반환하고 원본은 건드리지 않는다.
   * 검색형 multiselect는 이 순서(= 고른 순서, 칩이 보이는 순서)를 그대로 커밋한다.
   * lazy 검색에는 "전체 옵션 목록"이 존재하지 않아 비검색 multiselect의
   * "editorOptions 순서로 커밋" 규칙을 적용할 수 없기 때문이다.
   */
  function toggleMultiValue(list, value) {
    const cur = normalizeMultiValue(list);
    const idx = multiValueIndex(cur, value);
    if (idx === -1) return cur.concat([value]);
    const out = cur.slice();
    out.splice(idx, 1);
    return out;
  }

  /**
   * 검색형 select(editorSearch)의 정적 목록 필터.
   * label 또는 문자열화한 value에 질의가 포함되면 매치 (대소문자 무관).
   * null/빈/공백 질의는 전체를 반환한다.
   */
  function filterEditorOptions(options, query) {
    const list = normalizeEditorOptions(options);
    const q = query === null || query === undefined ? '' : String(query).trim().toLowerCase();
    if (q === '') return list;
    return list.filter(o => o.label.toLowerCase().includes(q) ||
      String(o.value).toLowerCase().includes(q));
  }

  /**
   * 검색형 에디터(editorSearch)에서 <kbd>Enter</kbd>가 무엇을 해야 하는지 결정한다.
   *
   * 활성 항목(`activeIndex`)은 **키보드 탐색 커서일 뿐**이다. 커서가 살아 있다는 것만으로
   * Enter를 토글/선택으로 해석하면 두 가지가 깨진다:
   *   ① 마우스로 옵션을 고른 직후의 Enter가 **방금 고른 항목을 도로 해제**한다
   *      (클릭은 커서를 그 항목에 남긴다).
   *   ② 목록이 접힌 폼에서 저장하려고 누른 Enter가 **보이지도 않는 항목을 토글**한다.
   * 그래서 "커서가 있는가"가 아니라 **"지금 목록이 보이고 그 커서가 유효한가"**로 가른다.
   *
   * @param {object} state `listOpen` 목록이 실제로 보이는가 · `activeIndex` 커서(-1/null이면 없음) ·
   *   `multi` 다중 선택인가 · `collapsible` 접히는 콤보박스인가(폼)
   * @returns {'toggle'|'pick'|'close'|'bubble'} `bubble`은 가로채지 않고 넘김
   *   (인라인이면 셀 커밋, 폼이면 저장) — 판단이 안 서면 항상 이쪽이 기본이다.
   */
  function resolveSearchEnterAction(state) {
    const s = state || {};
    const active = s.activeIndex === null || s.activeIndex === undefined ? -1 : s.activeIndex;
    if (s.listOpen && active >= 0) return s.multi ? 'toggle' : 'pick';
    if (s.listOpen && s.collapsible) return 'close';
    return 'bubble';
  }

  /**
   * 헤더 필터 행(floatingFilter)의 입력값 → 컬럼 필터 모델.
   * - raw가 null/undefined이거나 (set 제외) 공백뿐이면 null(필터 해제).
   * - 이미 적용된 모델의 연산자는 유지하되, 단일 입력으로 표현할 수 없는
   *   inRange는 equals로 대체한다. set은 단일 값 선택으로 동작.
   */
  function buildFloatingFilterModel(filterType, raw, currentModel) {
    if (raw === null || raw === undefined) return null;
    const value = String(raw);
    if (filterType === 'set') return { type: 'set', values: [value] };
    if (value.trim() === '') return null;
    if (filterType === 'number') {
      const op = currentModel && currentModel.type === 'number' && currentModel.op !== 'inRange'
        ? currentModel.op
        : 'equals';
      return { type: 'number', op, value };
    }
    const textOp = currentModel && currentModel.type === 'text' ? currentModel.op : 'contains';
    return { type: 'text', op: textOp, value };
  }

  /**
   * 그룹/전체 요약용 집계.
   * func: 'sum'|'avg'|'min'|'max'|'count' 또는 커스텀 함수 `(values, ctx) => any`.
   *   - values: 그 컬럼의 원본 값 배열(null/빈 값 포함 — 거르는 건 소비자 몫)
   *   - ctx: { rows, field, colDef, parent } — parent는 트리 요약에서만 부모 행,
   *     그룹/전체합계에서는 null(그 자리에 행 객체가 없다)
   *   - 반환 null/undefined = "표시하지 않음"(내장 집계의 규약과 동일)
   * count는 모든 행을 세고, 나머지 내장 집계는 숫자로 해석 가능한 값만 집계한다.
   * 집계할 숫자가 하나도 없으면 null.
   *
   * opts는 내부 전용(소비자에게 넘어가지 않는다): { colDef, parent, failures }.
   * 소비자 함수의 예외는 집계 하나를 null로 만들고 failures에 모아 호출자가 로깅한다 —
   * 순수 함수가 콘솔을 오염시키지 않게(validatePopupValues와 같은 규약).
   */
  function aggregateValues(rows, field, func, opts) {
    if (typeof func === 'function') {
      const ctx = {
        rows,
        field,
        colDef: (opts && opts.colDef) || null,
        parent: (opts && opts.parent) !== undefined ? opts.parent : null,
      };
      let out;
      try { out = func(rows.map(r => r[field]), ctx); }
      catch (e) {
        if (opts && opts.failures) opts.failures.push({ field, error: e });
        return null; /* 집계 하나가 죽어도 그리드는 계속 그린다 */
      }
      return out === undefined ? null : out;
    }
    if (func === 'count') return rows.length;
    let sum = 0, min = Infinity, max = -Infinity, n = 0;
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i][field];
      if (raw === null || raw === undefined || raw === '') continue;
      const v = Number(raw);
      if (isNaN(v)) continue;
      n++;
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (n === 0) return null;
    switch (func) {
      case 'sum': return sum;
      case 'avg': return sum / n;
      case 'min': return min;
      case 'max': return max;
      default: return null;
    }
  }

  /**
   * 필터·정렬이 끝난 행을 그룹 헤더 항목이 섞인 평면 표시 리스트로 변환한다.
   * - 그룹 순서는 데이터에서의 첫 등장 순서 (버킷 방식이라 연속 정렬 불필요)
   * - isExpanded(path)가 false인 그룹의 자식은 리스트에서 빠지지만,
   *   집계(agg)는 항상 전체 자식 기준으로 계산된다.
   * 그룹 항목: { __group, field, value, path, level, leafCount, expanded, agg }
   */
  function buildGroupView(rows, groupFields, isExpanded, aggColumns, failures) {
    if (!groupFields || groupFields.length === 0) return rows.slice();
    aggColumns = aggColumns || [];
    const items = [];
    (function walk(subset, level, parentPath) {
      const field = groupFields[level];
      const order = [];
      const buckets = Object.create(null);
      subset.forEach(row => {
        const key = String(row[field]);
        if (!buckets[key]) { buckets[key] = []; order.push(key); }
        buckets[key].push(row);
      });
      order.forEach(key => {
        const children = buckets[key];
        /* \u0001: 데이터 값에 등장할 일 없는 레벨 구분자 */
        const path = `${parentPath}\u0001${field}:${key}`;
        const expanded = !!isExpanded(path);
        const agg = {};
        aggColumns.forEach(c => {
          /* 그룹 행에는 부모 "행"이 없다 — parent는 null (합성 그룹 항목뿐) */
          agg[c.field] = aggregateValues(children, c.field, c.aggFunc,
            { colDef: c, parent: null, failures });
        });
        items.push({
          __group: true,
          field,
          value: children[0][field],
          path,
          level,
          leafCount: children.length,
          expanded,
          agg,
        });
        if (!expanded) return;
        if (level + 1 < groupFields.length) walk(children, level + 1, path);
        else children.forEach(r => { items.push(r); });
      });
    })(rows, 0, '');
    return items;
  }

  /**
   * 마스터-디테일이 섞인 표시 리스트의 세로 레이아웃.
   * __detail 항목은 detailHeight, 나머지는 rowHeight를 차지한다.
   * { tops: [항목별 top(px)], total: 전체 높이, ordinals: [디테일 제외 순번] }
   * ordinals는 행 번호·얼룩말 배경이 디테일 행을 건너뛰고 이어지게 한다.
   */
  function computeRowTops(items, rowHeight, detailHeight) {
    const tops = [];
    const ordinals = [];
    let top = 0;
    let ordinal = 0;
    for (let i = 0; i < items.length; i++) {
      tops.push(top);
      ordinals.push(ordinal);
      if (items[i] && items[i].__detail) {
        top += detailHeight;
      } else {
        top += rowHeight;
        ordinal++;
      }
    }
    return { tops, total: top, ordinals };
  }

  /**
   * autoRowHeight: 줄바꿈(wrapText) 컬럼의 텍스트 폭을 재서 행별 높이를 추정한다.
   * measure(text)는 픽셀 폭을 반환하는 주입 함수(브라우저에선 canvas measureText).
   * 명시적 개행(\n)도 줄 수에 반영하며, 결과는 baseHeight 이상이다.
   */
  function computeAutoHeights(rows, wrapCols, measure, baseHeight, lineHeight) {
    return rows.map(row => {
      if (!row || row.__group || row.__detail) return baseHeight;
      let maxLines = 1;
      for (let i = 0; i < wrapCols.length; i++) {
        const c = wrapCols[i];
        let v = row[c.field];
        if (c.valueFormatter) {
          try { v = c.valueFormatter(v, row); } catch (e) { /* 원시 값으로 폴백 */ }
        }
        if (v === null || v === undefined || v === '') continue;
        const avail = Math.max(20, c.width - 32); /* 좌우 패딩 제외 */
        let lines = 0;
        String(v).split('\n').forEach(part => {
          lines += Math.max(1, Math.ceil(measure(part) / avail));
        });
        if (lines > maxLines) maxLines = lines;
      }
      return Math.max(baseHeight, maxLines * lineHeight + 12);
    });
  }

  /** 행별 높이 배열 → { tops, total } (가변 높이 가상화용). */
  function computeTopsFromHeights(heights) {
    const tops = [];
    let top = 0;
    for (let i = 0; i < heights.length; i++) {
      tops.push(top);
      top += heights[i];
    }
    return { tops, total: top };
  }

  /** tops(오름차순)에서 y 오프셋이 속한 행 인덱스(top <= y인 마지막 인덱스). */
  function findRowAtOffset(tops, y) {
    if (tops.length === 0) return 0;
    let lo = 0;
    let hi = tops.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (tops[mid] <= y) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function paginate(totalRows, pageSize, currentPage) {
    const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
    const page = clamp(currentPage, 0, pageCount - 1);
    const start = page * pageSize;
    const end = Math.min(totalRows, start + pageSize);
    return {
      page,
      pageCount,
      start,
      end,
      /* 1-based labels for the "X to Y of Z" summary */
      firstRow: totalRows === 0 ? 0 : start + 1,
      lastRow: end,
      total: totalRows,
    };
  }

  /** Which page buttons to show: numbers and '…' gaps, always first/last. */
  function pageButtonModel(pageCount, current, maxButtons) {
    maxButtons = maxButtons || 7;
    if (pageCount <= maxButtons) {
      const all = [];
      for (let i = 0; i < pageCount; i++) all.push(i);
      return all;
    }
    const half = Math.floor((maxButtons - 2) / 2);
    const start = clamp(current - half, 1, pageCount - maxButtons + 1);
    const out = [0];
    if (start > 1) out.push('…');
    for (let p = start; p < start + maxButtons - 2 && p < pageCount - 1; p++) out.push(p);
    if (out[out.length - 1] !== '…' && out[out.length - 1] < pageCount - 2) out.push('…');
    out.push(pageCount - 1);
    return out;
  }

  /**
   * valueGetter가 있는 컬럼의 파생 값을 행 객체의 field에 기록한다(ParamQuery
   * formula 방식). 뷰 재계산 시마다 호출되어 정렬·필터·내보내기 모두가
   * 같은 파생 값을 보게 된다. getter 예외는 기록하고 해당 셀만 건너뛴다.
   */
  function applyValueGetters(rows, columns) {
    const getters = columns.filter(c => c.valueGetter && c.field);
    if (getters.length === 0) return rows;
    rows.forEach(row => {
      getters.forEach(c => {
        try { row[c.field] = c.valueGetter(row); }
        catch (e) { console.error(`[DataGrid] valueGetter failed for "${c.field}":`, e); }
      });
    });
    return rows;
  }

  /**
   * 파라미터 객체 → 쿼리스트링. 중첩 객체·배열을 어떤 표기로 펼지는 format이 정한다.
   * 쿼리스트링의 중첩 표기는 RFC에 정의된 표준이 없고 서버 프레임워크마다 관례가
   * 다르므로, 어느 쪽이 "옳다"가 아니라 서버에 맞추는 문제다.
   *
   *   format: 'dot' (기본) — Spring MVC/Boot·ASP.NET Core의 데이터 바인딩 표기.
   *     객체 속성은 점으로, 배열 인덱스는 대괄호로 (Spring의 List 바인딩 규약).
   *     { page: { selectPage: 1 } }   → page.selectPage=1
   *     { sorts: [{ field: 'a' }] }   → sorts[0].field=a
   *     { tags: ['x', 'y'] }          → tags[0]=x&tags[1]=y
   *
   *   format: 'bracket' — qs(Express)·PHP·Rails·Laravel·jQuery $.param()
   *     { page: { selectPage: 1 } }   → page[selectPage]=1
   *     { sorts: [{ field: 'a' }] }   → sorts[0][field]=a
   *     { tags: ['x', 'y'] }          → tags[0]=x&tags[1]=y
   *
   * 둘 다 아닌 서버는 dataSource.paramsSerializer로 통째로 대체한다.
   *
   * - undefined 값은 생략(조건부 파라미터), null은 빈 값(`key=`)
   * - Date는 ISO 문자열 (String(date)의 장황한 표기 대신)
   * - 순환 참조는 건너뛴다 — 소비자가 준 객체 때문에 그리드가 스택 오버플로로
   *   죽지 않게. 형제로 같은 객체가 두 번 나오는 것은 정상이므로 경로 기준으로 본다.
   */
  function buildQueryString(params, format) {
    const dot = format !== 'bracket'; /* 기본 'dot' — 'bracket'만 명시적으로 옵트인 */
    const parts = [];
    const path = new WeakSet();
    const walk = (key, value) => {
      if (value === undefined) return;
      if (value === null) { parts.push(`${encodeURIComponent(key)}=`); return; }
      if (value instanceof Date) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toISOString())}`);
        return;
      }
      if (typeof value === 'object') {
        if (path.has(value)) return; /* 순환 참조 */
        path.add(value);
        /* 배열 인덱스는 두 표기 모두 대괄호 — Spring도 List는 sorts[0].field로 받는다 */
        if (Array.isArray(value)) value.forEach((v, i) => walk(`${key}[${i}]`, v));
        else Object.keys(value).forEach(k => walk(dot ? `${key}.${k}` : `${key}[${k}]`, value[k]));
        path.delete(value);
        return;
      }
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    };
    Object.keys(params || {}).forEach(k => walk(k, params[k]));
    return parts.join('&');
  }

  /**
   * dataSource + 현재 그리드 상태 → fetch 요청 스펙 { url, method, body }.
   * GET이면 파라미터를 쿼리스트링으로, 그 외에는 JSON body로 보낸다.
   * server 모드인 축의 상태만 파라미터에 포함된다:
   *   page/pageSize(pageMode) · sort(sortModel JSON, sortMode) ·
   *   filter(filterModel JSON)/quickFilter(filterMode)
   */
  function buildDataSourceRequest(dataSource, state) {
    const params = {};
    let k;
    let base = null;
    try {
      base = typeof dataSource.params === 'function' ? dataSource.params() : dataSource.params;
    } catch (e) {
      console.error('[DataGrid] dataSource.params failed:', e);
    }
    for (k in base || {}) params[k] = base[k];

    /* request 훅이 있으면 기본 파라미터 매핑을 대체한다 — 서버 스펙(offset/limit,
     * orderBy=field:dir 등)에 맞춘 커스텀 빌더. undefined 값 키는 생략(조건부 파라미터). */
    let custom = null;
    if (typeof dataSource.request === 'function') {
      try {
        custom = dataSource.request({
          page: state.page,
          pageSize: state.pageSize,
          sortModel: (state.sortModel || []).slice(),
          filterModel: state.filterModel || {},
          quickFilter: state.quickFilter || '',
          sortMode: state.sortMode,
          filterMode: state.filterMode,
          pageMode: state.pageMode,
        });
      } catch (e) {
        console.error('[DataGrid] dataSource.request failed:', e);
        custom = null;
      }
    }
    if (custom) {
      for (k in custom) {
        if (custom[k] !== undefined) params[k] = custom[k];
      }
    } else {
      if (state.pageMode === 'server' && state.pagination) {
        params.page = state.page;
        params.pageSize = state.pageSize;
      }
      if (state.sortMode === 'server' && state.sortModel && state.sortModel.length > 0) {
        params.sort = JSON.stringify(state.sortModel);
      }
      if (state.filterMode === 'server') {
        let hasFilter = false;
        for (const f in state.filterModel || {}) { hasFilter = true; break; }
        if (hasFilter) params.filter = JSON.stringify(state.filterModel);
        if (state.quickFilter) params.quickFilter = state.quickFilter;
      }
    }

    /* headers — 인증 토큰 등. 함수는 요청마다 평가(토큰 갱신 대응), 예외 시 헤더 없이 진행 */
    let headers = null;
    let h = null;
    try {
      h = typeof dataSource.headers === 'function' ? dataSource.headers() : dataSource.headers;
    } catch (e) {
      console.error('[DataGrid] dataSource.headers failed:', e);
    }
    if (h) {
      headers = {};
      for (k in h) headers[k] = h[k];
    }

    const method = (dataSource.method || 'GET').toUpperCase();
    let url = dataSource.url;
    let body = null;
    if (method === 'GET') {
      /* paramsSerializer가 있으면 직렬화를 통째로 위임한다 (repeat key·JSON 등
       * 브래킷 표기로 표현 못 하는 서버 스펙용). 예외 시 기본 직렬화로 폴백. */
      let qs;
      if (typeof dataSource.paramsSerializer === 'function') {
        try {
          qs = String(dataSource.paramsSerializer(params) || '');
        } catch (e) {
          console.error('[DataGrid] dataSource.paramsSerializer failed:', e);
          qs = buildQueryString(params, dataSource.paramsFormat);
        }
      } else {
        qs = buildQueryString(params, dataSource.paramsFormat);
      }
      qs = qs.replace(/^[?&]+/, ''); /* '?a=1'처럼 반환해도 안전하게 */
      if (qs) url += (!url.includes('?') ? '?' : '&') + qs;
    } else {
      body = JSON.stringify(params);
    }
    return { url, method, body, headers };
  }

  /**
   * 원격 응답 해석 기본값: 배열이면 그대로, 아니면 { rows, total }를 기대한다.
   * 항상 { rows: [], total: n } 형태로 정규화한다.
   *
   * hasTotal은 "총건수를 서버가 실제로 준 것인지"다. total이 없으면 rows.length로
   * 채우는데 그 값을 기지의 총건수로 믿으면 무한 스크롤이 첫 페이지에서 곧바로
   * loaded >= total이 되어 항상 마지막 페이지가 된다 — 채운 값과 받은 값을 구분한다.
   * last는 마지막 페이지 플래그(없으면 null).
   */
  function parseDataSourceResponse(json) {
    if (Array.isArray(json)) {
      return { rows: json, total: json.length, hasTotal: false, last: null };
    }
    const rows = json && Array.isArray(json.rows) ? json.rows : [];
    const hasTotal = !!(json && typeof json.total === 'number');
    return {
      rows,
      total: hasTotal ? json.total : rows.length,
      hasTotal,
      last: readLastPageFlag(json),
    };
  }

  /**
   * 그룹 헤더 줄 수 상한. 컬럼 헤더 한 줄까지 합쳐 최대 3단이 된다.
   * 4단부터는 한 칸이 너무 얕아져 라벨을 못 읽으므로 열어두지 않는다.
   */
  const MAX_GROUP_HEADER_DEPTH = 2;

  /**
   * columnGroups 옵션을 정규화해 "컬럼 → 조상 그룹 경로"를 만든다.
   * children에는 문자열(colId·field)과 중첩 그룹 객체를 섞어 쓸 수 있다.
   *
   * 경로가 maxDepth보다 깊어지면 더 깊은 그룹은 상위 그룹으로 접는다(막지 않고 경고).
   * 경고는 console에 직접 찍지 않고 배열로 돌려준다 — 그래야 단위 테스트에서
   * 콘솔이 오염되지 않는다.
   *
   * 반환: { pathOf: { colKey: [{ key, headerName }] }, depth, warnings }
   *   depth는 실제로 필요한 그룹 줄 수(리프가 하나도 안 걸리면 0).
   */
  function normalizeColumnGroups(groups, maxDepth) {
    const limit = maxDepth > 0 ? maxDepth : MAX_GROUP_HEADER_DEPTH;
    const pathOf = Object.create(null);
    const warnings = [];
    let depth = 0;
    let tooDeep = false;

    function walk(list, ancestors, prefix) {
      (list || []).forEach((child, i) => {
        const path = prefix ? prefix + '.' + i : String(i);
        if (typeof child === 'string') {
          /* 리프 — 조상이 있어야 그릴 그룹이 있다 */
          if (child && ancestors.length) {
            pathOf[child] = ancestors;
            if (ancestors.length > depth) depth = ancestors.length;
          }
          return;
        }
        if (!child || typeof child !== 'object' || !Array.isArray(child.children)) {
          warnings.push(
            'columnGroups: children 항목은 문자열(colId·field) 또는 ' +
            '{ headerName, children } 객체여야 합니다.'
          );
          return;
        }
        let next = ancestors;
        if (ancestors.length < limit) {
          next = ancestors.concat([{ key: path, headerName: child.headerName || '' }]);
        } else if (!tooDeep) {
          tooDeep = true;
          warnings.push(
            'columnGroups: 그룹 헤더는 ' + limit + '단까지만 표시됩니다 — ' +
            '더 깊은 그룹은 바로 위 그룹으로 접힙니다.'
          );
        }
        walk(child.children, next, path);
      });
    }
    walk(groups, [], '');
    return { pathOf, depth, warnings };
  }

  /**
   * columnGroups 옵션 → 레벨별 그룹 헤더 스팬 목록.
   * 표시 컬럼 순서를 따라가며 "그 레벨까지의 조상 경로가 같은" 연속 컬럼을 하나의
   * 스팬으로 묶는다. 그룹이 없는 연속 컬럼도 빈 스팬 하나로 합친다. 고정(pinned)
   * 상태가 다르면 스팬을 끊어 고정 컬럼 스티키 배치와 어긋나지 않게 한다.
   *
   * 각 run의 kind:
   *   'group' 라벨이 있는 그룹 칸
   *   'cont'  상위 그룹이 이 레벨까지 내려온 칸 (자식 그룹이 없는 구간)
   *   'empty' 어떤 그룹에도 안 속한 구간
   * run.span이 true면 "아래 줄로 이어지는 칸"이라 아래 경계선을 그리지 않고,
   * 라벨은 두 줄 블록의 가운데로 내린다.
   *
   * 반환: { rows: run[][], depth, warnings }
   */
  function buildGroupHeaderRows(visibleCols, groups, maxDepth) {
    const norm = normalizeColumnGroups(groups, maxDepth);
    /* 줄 수는 설정이 아니라 "지금 보이는 컬럼에 실제로 걸린 깊이"로 정한다.
       그래야 그룹의 컬럼을 전부 숨기거나 어느 컬럼에도 안 걸리는 그룹을 줘도
       빈 그룹 줄이 자리만 차지하지 않는다. */
    const paths = visibleCols.map(c => norm.pathOf[c.colId] || norm.pathOf[c.field] || []);
    let depth = 0;
    paths.forEach(p => { if (p.length > depth) depth = p.length; });

    const pathLen = Object.create(null);
    visibleCols.forEach((c, ci) => { pathLen[c.colId] = paths[ci].length; });

    const rows = [];
    /* 위 줄의 런이 아래로 이어졌는지 — 이어진 칸 아래만 "몸통"으로 그린다 */
    let parentSpan = Object.create(null);
    for (let lv = 0; lv < depth; lv++) {
      const runs = [];
      visibleCols.forEach((c, ci) => {
        const path = paths[ci];
        const node = path[lv] || null;
        /* 같은 런이려면 이 레벨까지의 조상이 전부 같아야 한다 */
        const key = path.slice(0, lv + 1).map(n => n.key).join('|');
        const pinned = c.pinned === 'left' || c.pinned === 'right' ? c.pinned : null;
        const last = runs[runs.length - 1];
        if (last && last.key === key && last.pinned === pinned) {
          last.colIds.push(c.colId);
          return;
        }
        runs.push({
          key,
          kind: node ? 'group' : (path.length && parentSpan[c.colId] ? 'cont' : 'empty'),
          headerName: node ? node.headerName : '',
          span: false,
          colIds: [c.colId],
          pinned,
        });
      });
      /* span은 런이 완성된 뒤에 정한다 — 한 런에 깊이가 다른 컬럼이 섞일 수 있고
         (자식 그룹이 있는 컬럼 + 없는 컬럼이 나란히), 칸 하나는 아래 경계선을
         일부 구간에만 그릴 수 없다. 런 전체가 여기서 끝날 때만 이어 붙인다. */
      const nextSpan = Object.create(null);
      runs.forEach(run => {
        run.span = lv < depth - 1 && run.colIds.every(id => pathLen[id] <= lv + 1);
        run.colIds.forEach(id => { nextSpan[id] = run.span; });
      });
      parentSpan = nextSpan;
      rows.push(runs);
    }
    return { rows, depth, warnings: norm.warnings };
  }

  /**
   * mergeCells: 표시 리스트에서 "이전 리프 행과 같은 값이라 병합되는" 위치 계산.
   * result[i] = true면 i번째 항목의 해당 컬럼 셀은 이어짐(값 숨김 + 경계선 제거).
   * 그룹 헤더/디테일 행에서 병합 run이 끊긴다.
   */
  function computeMergeContinuation(items, field) {
    const out = new Array(items.length);
    let prev;
    let hasPrev = false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || it.__group || it.__detail) {
        out[i] = false;
        hasPrev = false;
        continue;
      }
      const v = it[field];
      out[i] = hasPrev && v === prev;
      prev = v;
      hasPrev = true;
    }
    return out;
  }

  /**
   * mergeCells: 병합 run 시작 위치의 span(묶이는 행 수) 계산.
   * computeMergeContinuation 결과로부터 유도한다 —
   * spans[i] = run 시작이면 run 길이(>= 1), 이어지는 셀이면 0.
   * 시작 셀을 run 전체 높이로 늘려 하나의 병합 셀처럼 그리는 데 쓴다.
   */
  function computeMergeSpans(cont) {
    const spans = new Array(cont.length);
    let run = 0;
    for (let i = cont.length - 1; i >= 0; i--) {
      if (cont[i]) { spans[i] = 0; run++; }
      else { spans[i] = run + 1; run = 0; }
    }
    return spans;
  }

  /* ======================== 트리 데이터 (treeData) ======================== */

  /**
   * treeData: 행 배열을 트리 노드로 정규화. 노드: { row, level, children: [노드] }
   * - nested(기본): 각 행의 childrenField 배열이 자식
   * - flat: parentIdField 지정 시 idField/parentIdField로 계층 구성.
   *   부모 id가 없거나(=루트) 자기 자신을 가리키면 루트. 순환 참조로 어떤 루트에서도
   *   도달할 수 없는 행은 순환을 끊고 루트로 승격한다 (행 유실 방지).
   */
  function buildTreeNodes(rows, opts) {
    opts = opts || {};
    if (!rows || rows.length === 0) return [];
    if (opts.parentIdField) {
      const idField = opts.idField || 'id';
      const parentIdField = opts.parentIdField;
      const byId = {};
      rows.forEach(r => { byId[r[idField]] = true; });
      const byParent = {};
      const roots = [];
      rows.forEach(r => {
        const p = r[parentIdField];
        if (p === null || p === undefined || !byId[p] || p === r[idField]) roots.push(r);
        else (byParent[p] = byParent[p] || []).push(r);
      });
      const visited = {};
      const buildFlat = (row, level) => {
        visited[row[idField]] = true;
        const kids = byParent[row[idField]] || [];
        return {
          row,
          level,
          children: kids
            .filter(c => !visited[c[idField]])
            .map(c => buildFlat(c, level + 1)),
        };
      };
      const out = roots.map(r => buildFlat(r, 0));
      rows.forEach(r => {
        if (!visited[r[idField]]) out.push(buildFlat(r, 0));
      });
      return out;
    }
    const childrenField = opts.childrenField || 'children';
    const buildNested = (row, level) => {
      const kids = Array.isArray(row[childrenField]) ? row[childrenField] : [];
      return {
        row,
        level,
        children: kids.map(c => buildNested(c, level + 1)),
      };
    };
    return rows.map(r => buildNested(r, 0));
  }

  /** 트리 전체 노드를 표시 순서(DFS)로 평탄화 — 펼침 상태와 무관. */
  function collectTreeNodes(nodes) {
    const out = [];
    (function walk(list) {
      list.forEach(n => {
        out.push(n);
        walk(n.children);
      });
    })(nodes);
    return out;
  }

  /**
   * 계층 필터: predicate 매치 노드와 그 조상을 유지한다.
   * keepChildren이면 매치된 노드의 자손도 통째로 유지 (ParamQuery filterShowChildren).
   * 매치되지 않은 노드는 유지되는 자손이 있을 때만 남는다.
   */
  function filterTreeNodes(nodes, predicate, keepChildren) {
    const out = [];
    nodes.forEach(n => {
      let matched = false;
      try {
        matched = !!predicate(n.row);
      } catch (e) {
        console.error('[DataGrid] tree filter predicate failed:', e);
      }
      if (matched && keepChildren) {
        out.push(n);
        return;
      }
      const kids = filterTreeNodes(n.children, predicate, keepChildren);
      if (matched || kids.length > 0) {
        out.push({ row: n.row, level: n.level, children: kids });
      }
    });
    return out;
  }

  /**
   * 계층 정렬: 형제끼리 재귀 정렬. rowSorter는 행 배열을 받아 정렬된 새 배열을
   * 반환하는 함수 (sortRows를 그대로 재사용하기 위한 시그니처).
   */
  function sortTreeNodes(nodes, rowSorter) {
    if (nodes.length === 0) return nodes;
    const byRow = new Map();
    nodes.forEach(n => { byRow.set(n.row, n); });
    return rowSorter(nodes.map(n => n.row)).map(r => {
      const n = byRow.get(r);
      return { row: n.row, level: n.level, children: sortTreeNodes(n.children, rowSorter) };
    });
  }

  /**
   * 트리 체크박스 상태 계산 (원본 states 불변, 새 맵 반환).
   * states: getId(row) → true | false | 'indeterminate'
   * - targetRow를 checked로 설정. isDisabled(targetRow)면 아무것도 바꾸지 않는다.
   * - cascade면 대상의 자손 전체를 함께 설정(disabled 행 제외)한 뒤,
   *   모든 부모를 자식 상태 기반으로 재계산한다
   *   (자식 전부 true → true, 전부 false → false, 혼합 → 'indeterminate').
   */
  function applyTreeCheck(roots, getId, states, targetRow, checked, opts) {
    opts = opts || {};
    const isDisabled = opts.isDisabled || (() => false);
    const next = {};
    for (const k in states) next[k] = states[k];
    if (isDisabled(targetRow)) return next;
    if (!opts.cascade) {
      next[getId(targetRow)] = checked;
      return next;
    }

    const setSubtree = node => {
      if (!isDisabled(node.row)) next[getId(node.row)] = checked;
      node.children.forEach(setSubtree);
    };
    (function findAndSet(list) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].row === targetRow) { setSubtree(list[i]); return true; }
        if (findAndSet(list[i].children)) return true;
      }
      return false;
    })(roots);

    /* 부모 상태 재계산 (post-order) */
    const recompute = node => {
      if (node.children.length === 0) {
        return next[getId(node.row)] === true;
      }
      let allTrue = true;
      let allFalse = true;
      node.children.forEach(c => {
        const st = recompute(c);
        if (st !== true) allTrue = false;
        if (st !== false) allFalse = false;
      });
      const st2 = allTrue ? true : allFalse ? false : 'indeterminate';
      next[getId(node.row)] = st2;
      return st2;
    };
    roots.forEach(recompute);
    return next;
  }

  /**
   * 대상 노드의 서브트리에서 "체크 가능한 리프"(비활성 아닌 리프)가 모두
   * 선택돼 있는지. indeterminate 부모 클릭의 의도 판정에 쓴다 — 브라우저는
   * indeterminate 체크박스 클릭에 항상 checked=true를 주므로, 더 체크할
   * 리프가 없다면(비활성 리프 때문에 완전 체크가 불가능한 상태) 사용자의
   * 의도를 "해제"로 해석해야 체크박스가 indeterminate에 갇히지 않는다 (BUG-004).
   */
  function subtreeFullyChecked(roots, targetRow, isSelected, isDisabled) {
    let node = null;
    (function find(list) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].row === targetRow) { node = list[i]; return true; }
        if (find(list[i].children)) return true;
      }
      return false;
    })(roots);
    if (!node) return false;
    let all = true;
    (function walk(n) {
      if (n.children.length === 0) {
        if (!isDisabled(n.row) && !isSelected(n.row)) all = false;
        return;
      }
      n.children.forEach(walk);
    })(node);
    return all;
  }

  /**
   * 행 선택 상태로부터 트리 체크박스 표시 상태를 유도한다 (checkboxSelection 연동).
   * 리프 = isSelected(row), 부모 = 자식 전부 true → true / 전부 false → false /
   * 혼합 → 'indeterminate'. 선택이 어떤 경로(체크박스·행 클릭·API)로 바뀌어도
   * 이 유도를 다시 돌리면 표시가 항상 일관된다.
   */
  function deriveTreeCheckStates(roots, getId, isSelected) {
    const out = {};
    const walk = node => {
      if (node.children.length === 0) {
        const st = !!isSelected(node.row);
        out[getId(node.row)] = st;
        return st;
      }
      let allTrue = true;
      let allFalse = true;
      node.children.forEach(c => {
        const cst = walk(c);
        if (cst !== true) allTrue = false;
        if (cst !== false) allFalse = false;
      });
      const st2 = allTrue ? true : allFalse ? false : 'indeterminate';
      out[getId(node.row)] = st2;
      return st2;
    };
    roots.forEach(walk);
    return out;
  }

  /**
   * 트리 부모 요약(treeData.summary): 부모 노드마다 자손 "리프"들의 집계를 계산.
   * aggColumns: [{ field, aggFunc }]. 반환: getId(부모 행) → { field: 집계값 }.
   * 한 번의 post-order 순회로 리프 목록을 전파한다.
   */
  function computeTreeSummary(roots, getId, aggColumns, failures) {
    const out = {};
    const walk = node => {
      if (node.children.length === 0) return [node.row];
      const leaves = [];
      node.children.forEach(c => {
        leaves.push(...walk(c));
      });
      const agg = {};
      aggColumns.forEach(c => {
        /* 트리에서만 parent가 채워진다 — 커스텀 aggFunc가 "이름 (자식 수)" 같은
         * 부모 기준 표시를 만들 수 있어야 하기 때문 */
        agg[c.field] = aggregateValues(leaves, c.field, c.aggFunc,
          { colDef: c, parent: node.row, failures });
      });
      out[getId(node.row)] = agg;
      return leaves;
    };
    roots.forEach(walk);
    return out;
  }

  /**
   * 펼침 평탄화: 조상이 모두 펼쳐진 노드만 표시 순서로 반환.
   * 항목: { row, level, hasChildren, expanded }
   */
  function flattenTreeNodes(nodes, isExpanded) {
    const out = [];
    (function walk(list) {
      list.forEach(n => {
        const has = n.children.length > 0;
        const exp = has && !!isExpanded(n.row);
        out.push({ row: n.row, level: n.level, hasChildren: has, expanded: exp });
        if (exp) walk(n.children);
      });
    })(nodes);
    return out;
  }

  /**
   * 채우기 핸들의 연속 값 생성 (엑셀 방식).
   * - 원본이 모두 숫자이고 2개 이상이면 등차 수열로 외삽
   *   ([1, 3] → 5, 7, 9 …, 부동소수 오차는 10자리에서 반올림)
   * - 그 외에는 원본 패턴을 순환 반복
   */
  function fillSeries(source, count) {
    const out = [];
    if (!source || source.length === 0 || count <= 0) return out;
    const allNumbers = source.every(v => typeof v === 'number' && isFinite(v));
    if (allNumbers && source.length >= 2) {
      const step = (source[source.length - 1] - source[0]) / (source.length - 1);
      const last = source[source.length - 1];
      for (let i = 1; i <= count; i++) {
        out.push(Math.round((last + step * i) * 1e10) / 1e10);
      }
    } else {
      for (let j = 0; j < count; j++) out.push(source[j % source.length]);
    }
    return out;
  }

  /**
   * findNext()의 다음 매치 탐색. rows에는 그룹 헤더 항목이 섞여 있을 수 있다
   * (건너뜀). cursor: { index, col } 직전 매치 위치 또는 null(처음부터).
   * 끝에 닿으면 처음으로 감싸서 계속 찾고, 없으면 null.
   */
  function findNextMatch(rows, fields, text, cursor) {
    const needle = String(text || '').toLowerCase();
    if (!needle || rows.length === 0 || fields.length === 0) return null;
    const startIndex = cursor ? cursor.index : 0;
    const startCol = cursor ? cursor.col + 1 : 0;
    for (let step = 0; step <= rows.length; step++) {
      const i = (startIndex + step) % rows.length;
      const row = rows[i];
      const cFrom = step === 0 ? startCol : 0;
      if (!row || row.__group) continue;
      for (let c = cFrom; c < fields.length; c++) {
        const v = row[fields[c]];
        if (v === null || v === undefined) continue;
        if (String(v).toLowerCase().includes(needle)) return { index: i, col: c };
      }
    }
    return null;
  }

  /**
   * rollbackChanges()의 행 목록 계산: 추가된 행을 제거하고, 삭제된 행을
   * 기록된 인덱스에 다시 끼워 넣는다. 새 배열을 반환한다.
   * deleted: [{ row, index }] — index는 삭제 당시 전체 행 기준 위치.
   */
  function rollbackRows(rows, added, deleted) {
    const out = rows.filter(r => !added.includes(r));
    deleted
      .slice()
      .sort((a, b) => a.index - b.index)
      .forEach(d => {
        out.splice(Math.min(d.index, out.length), 0, d.row);
      });
    return out;
  }

  /**
   * 행 배열의 index 위치에 새 행들을 삽입한 새 배열을 반환한다.
   * index 생략(undefined/null) = 맨 뒤, [0, 행 수]로 클램프, 소수는 내림.
   */
  function insertRowsAt(rows, newRows, index) {
    if (index === undefined || index === null) return rows.concat(newRows);
    const at = Math.max(0, Math.min(Math.floor(index), rows.length));
    const out = rows.slice();
    out.splice(...[at, 0].concat(newRows));
    return out;
  }

  /** 뷰 행 배열 → field가 있는 컬럼만 담은 평범한 객체 배열 (getJson()용). */
  function buildJsonRows(rows, columns) {
    return rows.map(row => {
      const out = {};
      columns.forEach(c => {
        if (c.field !== undefined) out[c.field] = row[c.field];
      });
      return out;
    });
  }

  function csvEscape(value) {
    let s = value === null || value === undefined ? '' : String(value);
    if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function buildCsv(rows, columns) {
    const lines = [columns.map(c => csvEscape(c.headerName)).join(',')];
    rows.forEach(row => {
      lines.push(
        columns
          .map(c => {
            let v = row[c.field];
            if (c.valueFormatter) v = c.valueFormatter(v, row);
            return csvEscape(v);
          })
          .join(',')
      );
    });
    return lines.join('\r\n');
  }

  /* ---------------------------------------------------------------------------
   * XLSX export (dependency-free: 무압축 ZIP + SpreadsheetML)
   * ------------------------------------------------------------------------- */

  const CRC_TABLE = (() => {
    const table = new Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * 파일 목록 → ZIP 바이트(Uint8Array). 압축 없이 STORE 방식으로 담는다
   * (xlsx는 컨테이너만 ZIP이면 되므로 의존성 없이 충분).
   * files: [{ name: 'xl/workbook.xml', data: string }]
   */
  function makeZip(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    let totalSize = 0;

    function u16(v) { return [v & 0xff, (v >> 8) & 0xff]; }
    function u32(v) { return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]; }
    function push(arr) {
      const u8 = arr instanceof Uint8Array ? arr : Uint8Array.from(arr);
      chunks.push(u8);
      totalSize += u8.length;
    }

    files.forEach(f => {
      const nameBytes = encoder.encode(f.name);
      const dataBytes = typeof f.data === 'string' ? encoder.encode(f.data) : f.data;
      const crc = crc32(dataBytes);
      const headerStart = totalSize;
      push(u32(0x04034b50));            /* local file header signature */
      push(u16(20)); push(u16(0));      /* version, flags */
      push(u16(0));                     /* method: STORE */
      push(u16(0)); push(u16(0));       /* time, date */
      push(u32(crc));
      push(u32(dataBytes.length));      /* compressed size */
      push(u32(dataBytes.length));      /* uncompressed size */
      push(u16(nameBytes.length)); push(u16(0));
      push(nameBytes);
      push(dataBytes);
      central.push({ name: nameBytes, crc, size: dataBytes.length, offset: headerStart });
    });

    const cdStart = totalSize;
    central.forEach(e => {
      push(u32(0x02014b50));            /* central directory signature */
      push(u16(20)); push(u16(20));     /* version made / needed */
      push(u16(0)); push(u16(0));       /* flags, method */
      push(u16(0)); push(u16(0));       /* time, date */
      push(u32(e.crc));
      push(u32(e.size)); push(u32(e.size));
      push(u16(e.name.length)); push(u16(0)); push(u16(0));
      push(u16(0)); push(u16(0));       /* disk, internal attrs */
      push(u32(0));                     /* external attrs */
      push(u32(e.offset));
      push(e.name);
    });
    const cdSize = totalSize - cdStart;
    push(u32(0x06054b50));              /* end of central directory */
    push(u16(0)); push(u16(0));
    push(u16(central.length)); push(u16(central.length));
    push(u32(cdSize)); push(u32(cdStart));
    push(u16(0));

    const out = new Uint8Array(totalSize);
    offset = 0;
    chunks.forEach(c => { out.set(c, offset); offset += c.length; });
    return out;
  }

  function xmlEscape(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * 시트 XML: 1행은 headerName, 이후 데이터 행. 포매터가 없으면 숫자는
   * 숫자 셀(t="n")로 내보내 엑셀에서 바로 계산 가능하게 한다.
   */
  function buildWorksheetXml(rows, columns) {
    const out = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>',
    ];
    function strCell(v) {
      return `<c t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;
    }
    out.push(`<row>${columns.map(c => strCell(c.headerName)).join('')}</row>`);
    rows.forEach(row => {
      const cells = columns.map(c => {
        let v = row[c.field];
        if (c.valueFormatter) {
          try { v = c.valueFormatter(v, row); }
          catch (e) { /* 포매터 실패 시 원시 값 */ }
        }
        if (v === null || v === undefined) return '<c/>';
        if (typeof v === 'number' && isFinite(v)) return `<c t="n"><v>${v}</v></c>`;
        if (typeof v === 'boolean') return `<c t="b"><v>${v ? 1 : 0}</v></c>`;
        return strCell(v);
      });
      out.push(`<row>${cells.join('')}</row>`);
    });
    out.push('</sheetData></worksheet>');
    return out.join('');
  }

  /** xlsx 컨테이너를 구성하는 최소 파트 목록. */
  function buildXlsxParts(rows, columns, sheetName) {
    const name = xmlEscape(sheetName || 'Data');
    return [
      {
        name: '[Content_Types].xml',
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '</Types>',
      },
      {
        name: '_rels/.rels',
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      },
      {
        name: 'xl/workbook.xml',
        data:
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '</Relationships>',
      },
      { name: 'xl/worksheets/sheet1.xml', data: buildWorksheetXml(rows, columns) },
    ];
  }

  /* ---------------------------------------------------------------------------
   * Column normalization
   * ------------------------------------------------------------------------- */

  const DEFAULT_COL = {
    width: 160,
    minWidth: 60,
    sortable: true,
    resizable: true,
    editable: false,
    filter: false,
    hide: false,
    pinned: null,
    align: 'left',
    required: false,
  };

  function normalizeColumns(columnDefs, defaultColDef) {
    return (columnDefs || []).map((def, i) => {
      const col = {};
      let k;
      for (k in DEFAULT_COL) col[k] = DEFAULT_COL[k];
      if (defaultColDef) for (k in defaultColDef) col[k] = defaultColDef[k];
      for (k in def) col[k] = def[k];
      col.colId = col.colId || col.field || `col-${i}`;
      col.headerName = col.headerName !== undefined ? col.headerName : col.field || '';
      /* dataType이 filter:true의 필터 종류와 기본 align을 결정한다 */
      if (col.filter === true) {
        col.filter = col.dataType === 'number' ? 'number'
          : col.dataType === 'bool' ? 'set'
          : 'text';
      }
      const alignExplicit = ('align' in def) || (defaultColDef && 'align' in defaultColDef);
      if (col.dataType === 'number' && !alignExplicit) col.align = 'right';
      /* editor나 required를 선언했다는 것 자체가 편집 의도 — editable 생략 시 true로.
       * required는 편집 경로에서만 의미가 있어서, 여기서 올려주지 않으면
       * `required: true`만 쓴 컬럼이 조용히 아무 일도 하지 않는다.
       * 명시적 editable(false 포함)은 그대로 존중한다. */
      const editableExplicit = ('editable' in def) || (defaultColDef && 'editable' in defaultColDef);
      if (!editableExplicit && (col.editor || col.required)) col.editable = true;
      /* 선언적 format — valueFormatter가 없을 때만 합성 (CSV·집계·자동 폭에도 일괄 적용) */
      if (col.format && !col.valueFormatter) {
        col.valueFormatter = (pattern => v => formatValue(v, pattern))(col.format);
      }
      return col;
    });
  }

  /**
   * statusColumn 옵션(true 또는 부분 설정 객체)을 완전한 설정으로 정규화한다.
   * labels/colors는 키 단위로 병합 — { labels: { deleted: '삭제' } }처럼 일부만 바꿀 수 있다.
   * 기본 헤더명·라벨은 localeText에서 온다 (명시한 설정이 로케일보다 우선).
   */
  function resolveStatusColumnConfig(option, localeText) {
    const t = localeText || LOCALE_EN;
    const cfg = {
      headerName: t.statusColumnHeader,
      width: 90,
      labels: { added: t.statusAdded, updated: t.statusUpdated, deleted: t.statusDeleted },
      colors: { added: 'green', updated: 'yellow', deleted: 'red' },
    };
    if (option && typeof option === 'object') {
      if (option.headerName !== undefined) cfg.headerName = option.headerName;
      if (typeof option.width === 'number') cfg.width = option.width;
      let k;
      if (option.labels) for (k in cfg.labels) {
        if (option.labels[k] !== undefined) cfg.labels[k] = option.labels[k];
      }
      if (option.colors) for (k in cfg.colors) {
        if (option.colors[k] !== undefined) cfg.colors[k] = option.colors[k];
      }
    }
    return cfg;
  }

  /* ---- popupEditor (행 단위 폼 편집) ---- */

  /** `column.popupEditor`가 팝업 안에서만 덮어쓸 수 있는 컬럼 속성. */
  const POPUP_COLUMN_OVERRIDES = ['editor', 'editorOptions', 'editorSearch', 'validator', 'required'];

  /**
   * popupEditor 옵션(true 또는 부분 설정 객체)을 완전한 설정으로 정규화한다.
   * 끈 상태(falsy)면 null. 모르는 position은 'center'로 떨어뜨린다 —
   * 오타가 레이아웃을 통째로 바꾸지 않게 (resolveDomLayout과 같은 방침).
   */
  function resolvePopupEditorConfig(option) {
    if (!option) return null;
    const o = option === true || typeof option !== 'object' ? {} : option;
    return {
      position: o.position === 'left' || o.position === 'right' ? o.position : 'center',
      width: typeof o.width === 'number' && o.width > 0 ? o.width : 420,
      columns: o.columns === 2 ? 2 : 1,
      title: typeof o.title === 'string' || typeof o.title === 'function' ? o.title : null,
      trigger: o.trigger === 'none' ? 'none' : 'dblclick',
      fields: Array.isArray(o.fields) ? o.fields.slice() : null,
      instantUpdate: !!o.instantUpdate,
      closeOnBackdrop: o.closeOnBackdrop !== false,
      buttons: resolvePopupButtons(o.buttons),
    };
  }

  /**
   * 버튼 목록을 정규화한다. 문자열 'save'/'cancel'/'close'는 내장 버튼,
   * 객체는 커스텀 버튼. 배열 순서가 곧 배치 순서다.
   * 생략(undefined)하면 기본 ['save', 'cancel'], 빈 배열은 "버튼 없음"으로
   * 존중한다 (헤더 닫기 버튼과 Esc는 항상 남으므로 갇히지 않는다).
   */
  function resolvePopupButtons(buttons) {
    const list = Array.isArray(buttons) ? buttons : ['save', 'cancel'];
    const out = [];
    list.forEach(b => {
      if (b === 'save' || b === 'cancel' || b === 'close') {
        out.push({ key: b, builtin: b, variant: b === 'save' ? 'primary' : 'default' });
        return;
      }
      if (!b || typeof b !== 'object' || typeof b.text !== 'string') return; /* 잘못된 항목은 건너뜀 */
      out.push({
        key: typeof b.key === 'string' ? b.key : b.text,
        builtin: null,
        text: b.text,
        variant: b.variant === 'primary' || b.variant === 'danger' ? b.variant : 'default',
        title: typeof b.title === 'string' ? b.title : null,
        disabled: b.disabled,
        onClick: typeof b.onClick === 'function' ? b.onClick : null,
        onLoad: typeof b.onLoad === 'function' ? b.onLoad : null,
      });
    });
    return out;
  }

  /**
   * 팝업 폼에 그릴 필드 목록을 만든다. 컬럼 정의를 그대로 재사용하고,
   * `column.popupEditor`가 있으면 팝업 안에서만 그 위에 덮어쓴다.
   *
   * 순서 규칙: 기본은 컬럼 순서(`config.fields`를 주면 그 순서), 그 위에
   * `popupEditor.order`를 지정한 필드만 그 값으로 끌어올린다(안정 정렬).
   */
  function buildPopupFields(columns, config, gridEditable, lockedFields) {
    const explicit = config && config.fields;
    const locked = Object.create(null);
    (lockedFields || []).forEach(f => { locked[f] = true; });
    const out = [];
    (columns || []).forEach(col => {
      if (!col || col.field === undefined || col.field === null) return;
      if (col.__rowNumber || col.__rowStatus || col.__detailToggle) return;
      if (col.checkboxSelection) return;
      if (col.popupEditor === false) return;
      const cfg = col.popupEditor && typeof col.popupEditor === 'object' ? col.popupEditor : {};
      /* 기본은 그리드의 hide를 따르되 명시 지정이 이긴다 (readonly와 같은 층위) —
       * `hide: false`로 "그리드에선 숨기고 폼에서만 편집"이 가능해야 한다. */
      if (cfg.hide !== undefined ? cfg.hide : col.hide) return;
      if (explicit && explicit.indexOf(col.field) === -1) return;

      /* 팝업 전용 컬럼 오버라이드 — 셀은 좁아 select, 폼은 넓어 searchselect 같은 교체 */
      let editCol = col;
      const over = {};
      let hasOver = false;
      POPUP_COLUMN_OVERRIDES.forEach(k => {
        if (cfg[k] !== undefined) { over[k] = cfg[k]; hasOver = true; }
      });
      if (hasOver) editCol = Object.assign({}, col, over);

      /* 그리드 잠금(setEditable(false))과 셀 잠금(setCellEnabled(row, field, false))은
       * 절대적 — popupEditor.readonly: false로도 못 푼다. 컬럼보다 넓은 범위이기 때문. */
      let readonly;
      if (!gridEditable || locked[col.field]) readonly = true;
      else if (cfg.readonly !== undefined) readonly = !!cfg.readonly;
      else readonly = !col.editable;

      out.push({
        field: col.field,
        col,
        editCol,
        cfg,
        label: typeof cfg.label === 'string' ? cfg.label : (col.headerName || col.field),
        hint: typeof cfg.hint === 'string' ? cfg.hint : null,
        span: cfg.span === 2 ? 2 : 1,
        readonly,
        order: typeof cfg.order === 'number' ? cfg.order : null,
      });
    });

    if (explicit) out.sort((a, b) => explicit.indexOf(a.field) - explicit.indexOf(b.field));
    /* 미지정 필드는 자기 위치를 정렬 키로 삼아 제자리에 남고, order를 준 필드만
     * 그 값으로 움직인다. 값이 같으면 **명시한 쪽이 이긴다** — 안 그러면
     * `order: 0`이 맨 앞 필드의 자연 인덱스 0과 동점이 돼 아무 일도 일어나지 않는다. */
    out.forEach((f, i) => {
      f._sort = f.order === null ? i : f.order;
      f._explicit = f.order === null ? 1 : 0;
    });
    out.sort((a, b) => a._sort - b._sort || a._explicit - b._explicit); /* Array#sort는 안정 정렬 */
    out.forEach(f => { delete f._sort; delete f._explicit; });
    return out;
  }

  /**
   * 폼 값과 원본 행을 비교해 바뀐 필드만 `{ field: { oldValue, newValue } }`로 뽑는다.
   * 배열 값(multiselect)은 참조가 아니라 내용으로 비교한다.
   */
  function diffPopupValues(original, values, fields) {
    const changes = {};
    (fields || []).forEach(f => {
      if (f.readonly) return;
      const oldValue = original ? original[f.field] : undefined;
      const newValue = values ? values[f.field] : undefined;
      const multi = (f.editCol || f.col || {}).editor === 'multiselect';
      if (!sameEditValue(newValue, oldValue, multi)) changes[f.field] = { oldValue, newValue };
    });
    return changes;
  }

  /**
   * 모든 필드의 required + validator를 돌려 `{ errors, failures }`를 반환한다.
   * required가 먼저다 — "값이 있어야 한다"는 validator보다 앞선 기본 규칙이고,
   * 빈 값을 validator에 넘기면 소비자마다 빈 값 처리를 중복 작성해야 한다.
   * validator 자체가 던진 예외는 편집을 막지 않고(인라인과 동일 규약) `failures`로
   * 올려보내 호출자가 로깅한다 — 순수 함수가 콘솔을 오염시키지 않게.
   * readonly 필드는 건너뛴다 — 고칠 수 없는 값으로 저장을 막으면 갇힌다.
   */
  function validatePopupValues(fields, values, row, localeText) {
    const t = localeText || LOCALE_EN;
    const errors = {};
    const failures = [];
    (fields || []).forEach(f => {
      if (f.readonly) return;
      const col = f.editCol || f.col || {};
      const value = values ? values[f.field] : undefined;
      if (isRequiredViolated(col, value)) {
        errors[f.field] = interpolate(t.requiredValue, { column: f.label || col.headerName || f.field });
        return; /* 빈 값을 validator에 다시 넘기지 않는다 */
      }
      if (typeof col.validator !== 'function') return;
      let result;
      try { result = col.validator(value, row); }
      catch (e) { failures.push({ field: f.field, error: e }); return; }
      const message = validationMessage(result);
      if (message) errors[f.field] = message;
    });
    return { errors, failures };
  }

  /**
   * softDelete용 삭제 분류: 추가(신규) 행은 hard(로우 자체 제거),
   * 기준선 행은 soft(삭제 표시). 그리드에 없는 행과 이미 삭제 표시된 행은 무시.
   * 엔트리 형태는 _recordRemove가 쓰는 { row, index, wasAdded, soft? }.
   */
  function partitionStagedRemoval(rows, allRows, addedRows, alreadyDeleted) {
    const hard = [];
    const soft = [];
    (rows || []).forEach(r => {
      const idx = allRows.indexOf(r);
      if (idx === -1) return;
      if (addedRows.includes(r)) {
        hard.push({ row: r, index: idx, wasAdded: true });
      } else if (!alreadyDeleted.includes(r)) {
        soft.push({ row: r, index: idx, wasAdded: false, soft: true });
      }
    });
    return { hard, soft };
  }

  /**
   * column.headerClass('foo bar' 문자열 또는 (colDef) => string 함수)를
   * 클래스명 배열로 변환한다. 콜백 예외는 잡아서 빈 배열 폴백 (그리드가 죽으면 안 된다).
   */
  function resolveHeaderClass(headerClass, col) {
    let cls = headerClass;
    if (typeof cls === 'function') {
      try { cls = cls(col); }
      catch (e) {
        console.error(`[DataGrid] headerClass failed for "${col && col.colId}":`, e);
        return [];
      }
    }
    if (cls === null || cls === undefined || cls === '') return [];
    return String(cls).trim().split(/\s+/).filter(s => s !== '');
  }

  /**
   * 컬럼 폭 계산: 사용자 리사이즈(overrides) > flex(남은 공간 비율) > width.
   * 모든 결과는 minWidth 이상, maxWidth(있으면) 이하로 클램프된다.
   */
  function computeColumnWidths(cols, overrides, available) {
    overrides = overrides || {};
    let fixedTotal = 0;
    let flexTotal = 0;
    cols.forEach(c => {
      const w = overrides[c.colId];
      if (w === undefined && c.flex) { flexTotal += c.flex; return; }
      fixedTotal += w !== undefined ? w : c.width;
    });
    const widths = {};
    const flexSpace = Math.max(0, available - fixedTotal);
    cols.forEach(c => {
      let w = overrides[c.colId];
      if (w === undefined && c.flex) {
        w = Math.floor((flexSpace * c.flex) / (flexTotal || 1));
      } else if (w === undefined) {
        w = c.width;
      }
      w = Math.max(c.minWidth, w);
      if (typeof c.maxWidth === 'number') w = Math.min(c.maxWidth, w);
      widths[c.colId] = w;
    });
    return widths;
  }

  /**
   * 컬럼 가상화(virtualX)의 렌더 윈도우 계산.
   * colSpecs: [{ width, pinned }] — 표시 순서(좌고정 → 일반 → 우고정).
   * 고정 컬럼은 항상 렌더링되므로, 일반 컬럼 중 가로 뷰포트
   * [scrollLeft + 좌고정 폭, scrollLeft + viewportWidth - 우고정 폭]과
   * 겹치는 범위에 buffer(기본 2)를 더한 인덱스 창을 반환한다.
   */
  function computeColumnWindow(colSpecs, scrollLeft, viewportWidth, buffer) {
    let pinnedLeftW = 0;
    let pinnedRightW = 0;
    colSpecs.forEach(s => {
      if (s.pinned === 'left') pinnedLeftW += s.width;
      else if (s.pinned === 'right') pinnedRightW += s.width;
    });
    const viewL = scrollLeft + pinnedLeftW;
    const viewR = scrollLeft + viewportWidth - pinnedRightW;
    let x = 0;
    let c1 = -1;
    let c2 = -1;
    for (let i = 0; i < colSpecs.length; i++) {
      const w = colSpecs[i].width;
      if (!colSpecs[i].pinned && x + w > viewL && x < viewR) {
        if (c1 === -1) c1 = i;
        c2 = i;
      }
      x += w;
    }
    if (c1 === -1) return { c1: 0, c2: colSpecs.length - 1 }; /* 일반 컬럼 없음 → 전부 */
    const b = buffer === undefined ? 2 : buffer;
    return { c1: Math.max(0, c1 - b), c2: Math.min(colSpecs.length - 1, c2 + b) };
  }

  /**
   * getState()의 컬럼 상태를 현재 컬럼 목록에 적용한 결과를 계산한다.
   * - stateColumns 순서대로 재배열, 목록에 없는 colId는 무시
   * - state에 빠진 컬럼은 원래 상대 순서를 유지한 채 뒤에 붙인다
   * 입력을 변형하지 않고 { columns, widths, hidden }을 반환한다.
   */
  function applyColumnState(columns, stateColumns) {
    const result = { columns: columns.slice(), widths: {}, hidden: {} };
    if (!stateColumns || stateColumns.length === 0) return result;
    const byId = {};
    columns.forEach(c => { byId[c.colId] = c; });
    const ordered = [];
    const seen = {};
    stateColumns.forEach(sc => {
      if (!sc || sc.colId === undefined) return;
      const col = byId[sc.colId];
      if (!col || seen[sc.colId]) return;
      seen[sc.colId] = true;
      ordered.push(col);
      if (typeof sc.width === 'number' && sc.width > 0) result.widths[sc.colId] = sc.width;
      if (sc.hide !== undefined) result.hidden[sc.colId] = !!sc.hide;
    });
    columns.forEach(c => {
      if (!seen[c.colId]) ordered.push(c);
    });
    result.columns = ordered;
    return result;
  }

  /* ---------------------------------------------------------------------------
   * Event emitter
   * ------------------------------------------------------------------------- */

  class Emitter {
    constructor() {
      this._handlers = {};
    }

    on(name, fn) {
      (this._handlers[name] = this._handlers[name] || []).push(fn);
      return this;
    }

    off(name, fn) {
      const list = this._handlers[name];
      if (list) {
        const i = list.indexOf(fn);
        if (i !== -1) list.splice(i, 1);
      }
      return this;
    }

    emit(name, payload) {
      const list = this._handlers[name];
      if (list) {
        list.slice().forEach(fn => {
          try { fn(payload); } catch (e) { console.error(`[DataGrid] "${name}" handler failed:`, e); }
        });
      }
    }
  }

  /* ---------------------------------------------------------------------------
   * DataGrid
   * ------------------------------------------------------------------------- */

  const ROW_BUFFER = 6;

  /* DataGrid 내부에서 쓰는 UI 상수/시퀀스 */
  /* 커스텀 헤더(headerRenderer) 안의 인터랙티브 요소 — 클릭/드래그가
   * 정렬 토글·headerClicked·컬럼 리오더를 발동하지 않고 본연의 동작만 수행한다. */
  const HEADER_INTERACTIVE_SELECTOR = 'button, input, select, textarea, a, label';

  /* set 필터 select에서 빈 문자열 값을 '(All)'(value="")과 구분하기 위한 센티널 */
  const FLOATING_BLANK = '__blank__';

  /* radio 에디터의 name 그룹 유일성 보장용 시퀀스 */
  let editorSeq = 0;

  class DataGrid {
    constructor(container, options) {
      if (typeof container === 'string') container = document.querySelector(container);
      if (!container || !container.appendChild) {
        throw new Error('DataGrid: first argument must be a DOM element or selector of one.');
      }
      options = options || {};

      this.options = options;
      this._emitter = new Emitter();
      this._container = container;
      this._destroyed = false;

      /* i18n — _buildColumns가 statusColumn 라벨을 여기서 읽으므로 컬럼보다 먼저 */
      this._localeText = resolveLocaleText(options.localeText);

      /* column state */
      this._columns = this._buildColumns();
      this._colWidths = {};
      this._editable = options.editable !== false;
      /* 행/셀 잠금 — 생성자 옵션이 아니라 setRowEnabled/setCellEnabled로만 바뀐다.
       * 잠금은 보통 서버 권한이나 워크플로 상태에서 오므로 데이터가 바뀌면
       * 기준이 사라진다 — setRowData가 _selection과 같은 줄에서 비운다. */
      this._locks = emptyLockMap();

      /* data state */
      this._rows = [];
      this._idCounter = 0;
      this._rowIds = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
      this._viewRows = [];
      this._pageRows = [];

      /* grouping */
      this._groupBy = (options.groupBy || []).slice();
      this._groupDefaultExpanded = options.groupDefaultExpanded !== false;
      this._groupToggled = {}; /* path -> expanded override */

      this._pinnedTopRows = (options.pinnedTopRows || []).slice();

      /* interaction state */
      this._sortModel = options.sortModel ? options.sortModel.slice() : [];
      this._filterModel = {};
      this._quickFilter = '';
      this._selection = {}; /* id -> row */
      this._lastClickedViewIndex = -1;
      this._focusedCell = null; /* { r, c } page-view coordinates */
      this._editing = null;
      this._popupConfig = resolvePopupEditorConfig(options.popupEditor);
      this._popup = null; /* 열려 있는 팝업 폼 상태 */
      this._cellSelection = !!options.cellSelection;
      this._cellRange = null; /* { anchor: {r,c}, focus: {r,c} } page-view coordinates */
      this._rangeDragging = false;
      this._findCursor = null;

      /* master-detail rows */
      this._detailExpanded = {}; /* rowId -> true */
      this._rowTops = null; /* rowDetail 사용 시 항목별 top 오프셋 */
      this._pageOrdinals = null;

      /* pagination */
      this._pagination = !!options.pagination;
      this._pageSize = options.paginationPageSize || 20;
      this._pageSizeOptions = options.paginationPageSizeOptions || [10, 20, 50, 100];
      this._currentPage = 0;

      /* 무한 스크롤 — 페이저 UI와 배타지만 요청 조립에는 페이징이 필요하다 */
      const infinite = resolveInfiniteScroll(options);
      infinite.warnings.forEach(key => {
        if (key === 'noDataSource') {
          console.warn(
            '[DataGrid] infiniteScroll은 dataSource가 필요합니다 — 자동 조회할 대상이 없어 무시합니다.'
          );
        } else if (key === 'clientPageMode') {
          console.warn(
            "[DataGrid] infiniteScroll인데 pageMode: 'client'입니다 — 요청에 page/pageSize가 실리지 않아 " +
              '같은 페이지를 반복해 누적할 수 있습니다. dataSource.request로 직접 페이징 파라미터를 만드는 경우가 아니라면 pageMode를 생략하세요.'
          );
        } else if (key === 'autoHeight') {
          console.warn(
            "[DataGrid] infiniteScroll인데 domLayout: 'autoHeight'입니다 — 바디가 내용만큼 자라 스크롤이 " +
              '생기지 않으므로 마지막 페이지까지 연달아 불러옵니다.'
          );
        }
      });
      this._infinite = infinite.enabled;
      this._infiniteThreshold = infinite.threshold;
      this._infinitePageSizeSelector = infinite.enabled && infinite.pageSizeSelector;
      this._infiniteTextEl = null;
      this._infiniteSizeSelEl = null;
      this._infiniteSizeLabelEl = null;
      if (this._infinite) {
        if (infinite.pageSize) this._pageSize = infinite.pageSize;
        this._pagination = true; /* 요청에 page/pageSize를 싣기 위함 — 페이저 UI는 그리지 않는다 */
      }
      this._hasMore = true; /* 아직 더 받을 게 있는가 */
      this._loadingMore = false; /* 추가 로드 진행 중 (전면 오버레이 없이) */
      this._loadedOnce = false; /* 이 소스에서 0페이지를 한 번이라도 받았는가 (이어받기의 전제) */
      this._infiniteStatusEl = null;

      /* tree data — pagination/groupBy와 배타 (ParamQuery도 페이징 비호환 명시) */
      this._treeData = options.treeData || null;
      this._treeExpanded = {}; /* rowId -> bool */
      /* checkboxSelection 컬럼 연동 트리 체크박스 */
      this._treeCheckboxMode = false; /* treeData + checkboxSelection 컬럼 — 뷰 계산 시 갱신 */
      this._treeChecked = null; /* rowId -> true|false|'indeterminate' — cascade일 때만 유도 */
      this._treeRoots = null; /* 필터 전 전체 트리 (체크 캐스케이드용) — 뷰 계산 시 갱신 */
      this._treeInfo = null; /* rowId -> { level, hasChildren, expanded } — 뷰 계산 시 갱신 */
      this._treeColId = null; /* 트리 UI(들여쓰기+토글)를 그릴 컬럼 */
      this._treeSummary = null; /* rowId -> { field: 집계값 } (treeData.summary) */
      this._treeLoading = {}; /* rowId -> true (fetchChildren 진행 중) */
      this._treeLoaded = {}; /* rowId -> true (fetchChildren 완료 — 리프 확정 포함) */
      if (this._treeData) {
        if (this._infinite) {
          console.error('[DataGrid] treeData는 infiniteScroll과 함께 쓸 수 없습니다 — infiniteScroll을 끕니다.');
          this._infinite = false;
        }
        if (this._pagination) {
          console.error('[DataGrid] treeData는 pagination과 함께 쓸 수 없습니다 — pagination을 끕니다.');
          this._pagination = false;
        }
        if (this._groupBy.length > 0) {
          console.error('[DataGrid] treeData는 groupBy와 함께 쓸 수 없습니다 — groupBy를 무시합니다.');
          this._groupBy = [];
        }
        if (this._treeData.fetchChildren && this._treeData.parentIdField) {
          console.error(
            '[DataGrid] treeData.fetchChildren은 nested(children) 형식 전용입니다 — fetchChildren을 무시합니다.'
          );
          this._treeData = Object.assign({}, this._treeData, { fetchChildren: null });
        }
      }

      this._rowHeight = options.rowHeight || 42;
      this._headerHeight = options.headerHeight || 48;
      this._domLayout = resolveDomLayout(options.domLayout);
      this._containerPositionSet = false; /* fill 모드에서 컨테이너 position을 우리가 바꿨는지 */

      /* change tracking + undo/redo — softDelete/statusColumn은 추적 상태가 필요하므로 자동 활성화 */
      this._trackChanges = !!(options.trackChanges || options.softDelete || options.statusColumn);
      this._softDelete = !!options.softDelete;
      this._undoRedo = !!options.undoRedo;
      this._resetTracking();
      this._undoStack = [];
      this._redoStack = [];
      this._historyMuted = false;

      /* remote data source */
      const dataModes = resolveDataModes(options);
      this._sortMode = dataModes.sortMode;
      this._filterMode = dataModes.filterMode;
      this._pageMode = dataModes.pageMode;
      dataModes.warnings.forEach(key => {
        console.warn(
          `[DataGrid] pageMode: 'server'인데 ${key}: 'client'입니다 — 클라이언트는 현재 페이지만 ` +
            `들고 있어 그 페이지 안에서만 처리됩니다. 의도한 것이 아니면 ${key}를 생략하거나(=pageMode를 따름) 'server'로 지정하세요.`
        );
      });
      this._serverTotal = 0;
      this._serverTotalKnown = false; /* 총건수를 서버가 실제로 준 것인지 (무한 스크롤 종료 판정용) */
      this._loadSeq = 0;

      this._pasteCount = 0; /* paste 이벤트/클립보드 API 폴백의 이중 실행 방지용 */
      this._docListeners = [];
      this._buildDom();
      this._bindEvents();

      this.setRowData(options.rowData || []);
      /* autoLoad: false면 그리드가 먼저 서버를 부르지 않는다 (rowData를 줬으면 그게 그대로 보인다) */
      if (shouldAutoLoad(options.dataSource)) this.reloadData();

      /* gridReady: 생성자 반환 후 핸들러가 등록될 시간을 주기 위해 비동기로 1회 발생 */
      setTimeout(() => {
        if (!this._destroyed) this._emitter.emit('gridReady', { rowCount: this._rows.length });
      }, 0);
    }

    /* ---- columns (normalize + built-in row number column) ---- */

    _buildColumns() {
      const cols = normalizeColumns(this.options.columnDefs, this.options.defaultColDef);
      if (this.options.rowDetail) {
        cols.unshift({
          colId: '__detailToggle', headerName: '', width: 44, minWidth: 36, maxWidth: 60,
          sortable: false, resizable: false, editable: false, filter: false,
          hide: false, pinned: 'left', align: 'center', __detailToggle: true,
        });
      }
      if (this.options.statusColumn) {
        const sc = resolveStatusColumnConfig(this.options.statusColumn, this._localeText);
        this._statusColConfig = sc;
        cols.unshift({
          colId: '__rowStatus', headerName: sc.headerName, width: sc.width, minWidth: 60,
          sortable: false, resizable: true, editable: false, filter: false,
          hide: false, pinned: 'left', align: 'center', __rowStatus: true, suppressMove: true,
        });
      } else {
        this._statusColConfig = null;
      }
      if (this.options.rowNumbers) {
        cols.unshift({
          colId: '__rowNum', headerName: '', width: 52, minWidth: 40, maxWidth: 90,
          sortable: false, resizable: true, editable: false, filter: false,
          hide: false, pinned: 'left', align: 'right', __rowNumber: true,
        });
      }
      return cols;
    }

    /* ---- i18n ---- */

    /**
     * 로케일 문자열을 읽는다. 모르는 키는 키 자체를 돌려줘 화면에서 티가 나게 한다.
     * @param {string} key LOCALE_EN의 키
     * @param {object} [params] `{name}` 토큰 치환 값
     */
    _t(key, params) {
      const text = this._localeText[key];
      return interpolate(text === undefined ? key : text, params);
    }

    /* ---- events ---- */
    on(name, fn) { this._emitter.on(name, fn); return this; }

    off(name, fn) { this._emitter.off(name, fn); return this; }

    /** 한 번만 실행되는 핸들러. 반환된 wrapper로 off(name, wrapper) 가능. */
    once(name, fn) {
      const wrapper = payload => {
        this._emitter.off(name, wrapper);
        fn(payload);
      };
      this._emitter.on(name, wrapper);
      return wrapper;
    }

    /* ---- DOM scaffolding ---- */

    _buildDom() {
      const root = el('div', 'dg-root');
      root.setAttribute('tabindex', '0');
      root.setAttribute('role', 'grid');
      if (this.options.theme === 'dark') root.classList.add('dg-theme-dark');
      if (this.options.zebra) root.classList.add('dg-zebra');
      if (this._domLayout === 'autoHeight') root.classList.add('dg-auto-height');
      if (this.options.showHeader === false) root.classList.add('dg-no-header');
      /* 단일 클릭 편집일 때만 편집 가능 셀에 I빔 커서를 준다 (BUG-012) */
      if (this.options.editOnSingleClick) root.classList.add('dg-edit-single-click');
      root.style.setProperty('--dg-row-height', `${this._rowHeight}px`);
      root.style.setProperty('--dg-header-height', `${this._headerHeight}px`);

      if (this.options.title) {
        this._titleEl = el('div', 'dg-title-bar', root);
        this._titleEl.textContent = this.options.title;
      }
      if (this.options.toolbar) {
        this._toolbarEl = el('div', 'dg-toolbar', root);
        this._mountToolbar(this.options.toolbar);
      }

      this._headerEl = el('div', 'dg-header', root);
      this._headerRowEl = el('div', 'dg-header-row', this._headerEl);

      this._pinnedTopEl = el('div', 'dg-pinned-top', root);
      this._pinnedTopEl.hidden = true;

      this._bodyEl = el('div', 'dg-body', root);
      this._canvasEl = el('div', 'dg-canvas', this._bodyEl);

      this._footerEl = el('div', 'dg-footer', root);
      this._footerRowEl = el('div', 'dg-footer-row', this._footerEl);
      this._footerEl.hidden = true;
      this._footerCells = {};

      this._overlayEl = el('div', 'dg-overlay', root);
      this._overlayEl.hidden = true;

      /* 무한 스크롤은 페이저 대신 하단 상태 바를 쓴다 (둘은 배타).
       * 안쪽 요소는 여기서 한 번만 만들고 이후에는 값만 갱신한다 — 매번 innerHTML을
       * 다시 쓰면 백그라운드 추가 로드가 끝날 때 열려 있던 크기 드롭다운이 닫힌다. */
      if (this._infinite) {
        const bar = el('div', 'dg-infinite-status', root);
        bar.setAttribute('role', 'status');
        bar.setAttribute('aria-live', 'polite');
        this._infiniteStatusEl = bar;
        if (this._infinitePageSizeSelector) {
          const wrap = el('div', 'dg-infinite-page-size', bar);
          this._infiniteSizeLabelEl = el('span', null, wrap);
          const sel = el('select', null, wrap);
          sel.addEventListener('change', () => { this.setPageSize(Number(sel.value)); });
          this._infiniteSizeSelEl = sel;
          this._infiniteSizeKey = null; /* 지금 그려둔 옵션 목록의 지문 */
        }
        this._infiniteTextEl = el('span', 'dg-infinite-text', bar);
      } else if (this._pagination) {
        this._pagingEl = el('div', 'dg-paging-panel', root);
      }

      this._container.appendChild(root);
      this._rootEl = root;
      this._renderedRows = {}; /* pageIndex -> row element */
      this._lastRange = null;
      this._applyFillLayout();
    }

    /**
     * domLayout: 'fill' — 그리드를 흐름 밖(absolute + inset:0)으로 빼 컨테이너를
     * 정확히 채운다. 흐름 밖이라 행 수가 컨테이너 높이에 전혀 영향을 주지 못하므로,
     * 데이터가 없어도 줄지 않고 많아도 늘어나지 않는다.
     *
     * height:100%로는 이게 안 된다 — flex 항목의 자동 최소 크기(min-height: auto)가
     * 내용에 밀려 커지면 100%도 같이 커지고, 높이가 불확정인 부모에서는 100% 자체가
     * 풀리지 않아 내용 높이로 떨어진다.
     *
     * inset:0의 기준이 되도록 컨테이너가 static이면 relative로 올린다(우리가 바꾼
     * 경우에만 destroy에서 되돌린다 — 소비자가 지정한 값은 건드리지 않는다).
     */
    _applyFillLayout() {
      const fill = this._domLayout === 'fill';
      this._rootEl.classList.toggle('dg-fill-height', fill);
      if (fill) {
        if (!this._containerPositionSet &&
            getComputedStyle(this._container).position === 'static') {
          this._container.style.position = 'relative';
          this._containerPositionSet = true;
        }
      } else if (this._containerPositionSet) {
        this._container.style.position = '';
        this._containerPositionSet = false;
      }
    }

    /** toolbar 옵션(Element 또는 grid를 받는 팩토리 함수)을 슬롯에 넣는다. */
    _mountToolbar(toolbar) {
      if (!this._toolbarEl) return;
      this._toolbarEl.innerHTML = '';
      const node = typeof toolbar === 'function' ? toolbar(this) : toolbar;
      if (node && node.nodeType) this._toolbarEl.appendChild(node);
    }

    _bindEvents() {

      this._bodyEl.addEventListener('scroll', () => {
        this._headerEl.scrollLeft = this._bodyEl.scrollLeft;
        this._footerEl.scrollLeft = this._bodyEl.scrollLeft;
        this._pinnedTopEl.scrollLeft = this._bodyEl.scrollLeft;
        if (this.options.virtualX && this._updateColWindow()) {
          this._renderBody(); /* 컬럼 창이 바뀌면 행 셀을 새 창으로 재구성 */
        } else {
          this._renderVisibleRows();
        }
        this._maybeLoadMore(); /* 바닥 근처면 다음 페이지 (infiniteScroll일 때만) */
      });

      this._canvasEl.addEventListener('click', e => { this._onCellClick(e); });
      this._canvasEl.addEventListener('dblclick', e => { this._onCellDblClick(e); });
      this._rootEl.addEventListener('keydown', e => { this._onKeyDown(e); });

      this._canvasEl.addEventListener('contextmenu', e => {
        const hit = this._cellFromEvent(e);
        if (!hit || !hit.row || hit.row.__group) return;
        this._emitter.emit('cellContextMenu', {
          data: hit.row,
          colDef: hit.col,
          value: hit.col && hit.col.field !== undefined ? hit.row[hit.col.field] : undefined,
          rowIndex: hit.r,
          originalEvent: e, /* 컨텍스트 메뉴를 띄우려면 e.preventDefault() 후 직접 구현 */
        });
      });

      /* 셀/블록 선택: mousedown으로 앵커, 드래그로 범위 확장 */
      if (this._cellSelection) {
        this._canvasEl.addEventListener('mousedown', e => {
          if (e.button !== 0 || this._editing) return;
          if (e.target.closest('.dg-checkbox')) return;
          const hit = this._cellFromEvent(e);
          if (!hit || !hit.row || hit.row.__group) return;
          if (e.shiftKey && this._cellRange) {
            this._setCellRange(this._cellRange.anchor, { r: hit.r, c: hit.c });
          } else {
            this._setCellRange({ r: hit.r, c: hit.c }, { r: hit.r, c: hit.c });
          }
          this._rangeDragging = true;
          e.preventDefault(); /* 텍스트 선택 방지 */
        });
        this._canvasEl.addEventListener('mouseover', e => {
          const hit = this._cellFromEvent(e);
          if (!hit || !hit.row || hit.row.__group) return;
          if (this._fillDrag) { this._previewFill(hit.r); return; }
          if (!this._rangeDragging || !this._cellRange) return;
          this._setCellRange(this._cellRange.anchor, { r: hit.r, c: hit.c });
        });
        const endDrag = () => {
          this._rangeDragging = false;
          if (this._fillDrag) {
            this._applyFillDrag();
            this._fillDrag = null;
          }
        };
        document.addEventListener('mouseup', endDrag);
        this._docListeners.push(['mouseup', endDrag]);
      }

      /* Ctrl+V 1차 경로 — 브라우저가 클립보드 내용을 이벤트로 직접 전달 */
      this._rootEl.addEventListener('paste', e => {
        if (this._editing || !this._focusedCell) return;
        const text = e.clipboardData && e.clipboardData.getData('text/plain');
        if (!text) return;
        this._pasteCount++;
        e.preventDefault();
        this.pasteTsv(text);
      });

      const closeMenus = e => {
        if (!this._menuEl || this._menuEl.contains(e.target)) return;
        /* 메뉴를 연 컬럼의 메뉴 버튼 위 mousedown은 여기서 닫지 않는다 —
         * 닫아버리면 이어지는 click에서 다시 열려 토글이 불가능해진다. */
        const btn = e.target.closest ? e.target.closest('.dg-header-menu-btn') : null;
        if (btn && this._menuHeaderCell && this._menuHeaderCell.contains(btn)) return;
        this._closeMenu();
      };
      document.addEventListener('mousedown', closeMenus);
      this._docListeners.push(['mousedown', closeMenus]);

      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() => {
          this._layoutColumns();
          if (this.options.virtualX && this._updateColWindow()) this._renderBody();
        });
        this._resizeObserver.observe(this._rootEl);
      }
    }

    /* ---- row identity ---- */

    _rowId(row) {
      if (this.options.getRowId) return this.options.getRowId(row);
      if (this._rowIds) {
        let id = this._rowIds.get(row);
        if (id === undefined) {
          id = `dg-${this._idCounter++}`;
          this._rowIds.set(row, id);
        }
        return id;
      }
      return this._rows.indexOf(row);
    }

    /* ---- 행/셀 잠금 판정 (내부) ---- */

    /** 이 행이 setRowEnabled(row, false)로 잠겼는가. */
    _isRowLocked(row) {
      return !!row && isRowLocked(this._locks, this._rowId(row));
    }

    /**
     * 이 셀을 지금 편집할 수 있는가. 편집으로 값이 바뀌는 모든 경로가 이걸 부른다 —
     * 인라인 진입 4곳(더블클릭·단일클릭·Enter·startEdit) + 인접 셀 이동 + 붙여넣기 +
     * 채우기. 팝업 폼은 행 단위로 openEditPopup이, 필드 단위로 buildPopupFields가 본다.
     */
    _canEditCell(row, col) {
      if (!row || row.__group || row.__detail) return false;
      if (this._isRowDeleted(row)) return false; /* softDelete 삭제 표시 행 */
      return isCellEditableNow(this._locks, this._rowId(row), col, this._editable);
    }

    /** 이 행에서 셀 단위로 잠긴 필드 목록 (팝업 폼의 readonly 판정용). */
    _lockedFieldsOf(row) {
      const byRow = row ? this._locks.cells[this._rowId(row)] : null;
      if (!byRow) return [];
      const out = [];
      for (const f in byRow) out.push(f);
      return out;
    }

    /* ---- view pipeline ---- */

    _visibleColumns() {
      const cols = this._columns.filter(c => !c.hide);
      const left = cols.filter(c => c.pinned === 'left');
      const right = cols.filter(c => c.pinned === 'right');
      const middle = cols.filter(c => c.pinned !== 'left' && c.pinned !== 'right');
      return left.concat(middle, right);
    }

    _recomputeView() {
      const comparators = {};
      this._columns.forEach(c => {
        const cmp = c.comparator || (c.dataType ? typeComparator(c.dataType) : null);
        if (cmp) comparators[c.field] = cmp;
      });
      const fields = this._visibleColumns()
        .map(c => c.field)
        .filter(Boolean);

      if (this._treeData) {
        /* 트리 파이프라인이 _viewRows/_displayRows/_pageRows를 모두 채운다 */
        this._recomputeTreeView(comparators, fields);
        this._afterViewComputed();
        return;
      }

      applyValueGetters(this._rows, this._columns);
      /* server 모드인 축은 서버가 이미 처리했으므로 클라이언트 단계를 건너뛴다 */
      let rows = this._rows.slice();
      if (this._filterMode !== 'server') {
        rows = filterRows(rows, this._filterModel);
        rows = quickFilterRows(rows, this._quickFilter, fields);
      }
      if (this._sortMode !== 'server') {
        rows = sortRows(rows, this._sortModel, comparators);
      }
      this._viewRows = rows;

      /* 그룹핑: 리프 행(_viewRows)과 그룹 헤더가 섞인 표시 리스트(_displayRows)를 분리.
       * 선택·CSV 등 데이터 API는 리프만, 렌더링·페이징은 표시 리스트를 쓴다. */
      this._aggColumns = this._columns.filter(c => c.aggFunc && c.field);
      let display = rows;
      if (this._groupBy.length > 0) {
        const toggled = this._groupToggled;
        const defaultExpanded = this._groupDefaultExpanded;
        const aggFailures = [];
        display = buildGroupView(rows, this._groupBy, path => toggled[path] !== undefined ? toggled[path] : defaultExpanded, this._aggColumns, aggFailures);
        this._logAggFailures(aggFailures);
      }
      this._displayRows = display;

      /* 무한 스크롤은 페이지 개념을 화면에서 지운다 — 쌓인 전체가 곧 한 화면이다.
       * _pagination은 요청 조립용으로만 켜져 있으므로 여기서는 페이징하지 않는다. */
      if (this._pagination && !this._infinite) {
        if (this._pageMode === 'server') {
          /* 서버 페이징: 현재 rows가 곧 한 페이지. 총계는 서버 응답 기준 */
          const total = this._serverTotal;
          const pageCount = Math.max(1, Math.ceil(total / this._pageSize));
          const page = clamp(this._currentPage, 0, pageCount - 1);
          this._currentPage = page;
          const start = page * this._pageSize;
          this._pageInfo = {
            page,
            pageCount,
            start,
            end: start + display.length,
            firstRow: total === 0 ? 0 : start + 1,
            lastRow: start + display.length,
            total,
          };
          this._pageRows = display;
        } else {
          const info = paginate(display.length, this._pageSize, this._currentPage);
          this._currentPage = info.page;
          this._pageInfo = info;
          this._pageRows = display.slice(info.start, info.end);
        }
      } else {
        this._pageInfo = null;
        this._pageRows = display;
      }

      this._afterViewComputed();
    }

    /* 뷰 파이프라인 공통 꼬리: 가변 세로 레이아웃(마스터-디테일 삽입 +
     * autoRowHeight 행별 높이 추정) + 병합 맵. 일반/트리 파이프라인이 공유한다. */
    _afterViewComputed() {
      this._rowTops = null;
      this._pageOrdinals = null;
      this._rowHeights = null;
      if (this.options.rowDetail) {
        const withDetails = [];
        this._pageRows.forEach(row => {
          withDetails.push(row);
          if (!row.__group && this._detailExpanded[this._rowId(row)]) {
            withDetails.push({ __detail: true, row });
          }
        });
        this._pageRows = withDetails;
      }
      const wrapCols = [];
      if (this.options.autoRowHeight) {
        this._visibleColumns().forEach(c => {
          if (c.wrapText && c.field !== undefined) {
            wrapCols.push({
              field: c.field,
              valueFormatter: c.valueFormatter,
              width: (this._computedWidths && this._computedWidths[c.colId]) || c.width,
            });
          }
        });
      }
      if (this.options.rowDetail || wrapCols.length > 0) {
        const detailH = this._detailHeight();
        let heights;
        if (wrapCols.length > 0) {
          heights = computeAutoHeights(
            this._pageRows, wrapCols, this._textMeasurer(), this._rowHeight, this._lineHeight()
          );
          for (let hi = 0; hi < heights.length; hi++) {
            if (this._pageRows[hi] && this._pageRows[hi].__detail) heights[hi] = detailH;
          }
        } else {
          heights = this._pageRows.map(it => it && it.__detail ? detailH : this._rowHeight);
        }
        this._rowHeights = heights;
        const layout = computeTopsFromHeights(heights);
        this._rowTops = layout.tops;
        this._totalRowsHeight = layout.total;
        let ordinal = 0;
        this._pageOrdinals = this._pageRows.map(it => {
          const o = ordinal;
          if (!it || !it.__detail) ordinal++;
          return o;
        });
      }

      this._computeMergeMap();
    }

    /* 트리 뷰 파이프라인: 노드 구축 → 계층 필터(매치+조상 유지) → 계층 정렬(형제끼리)
     * → 펼침 평탄화. 페이징/그룹핑은 트리와 배타 (생성자에서 차단). */
    _recomputeTreeView(comparators, fields) {
      const td = this._treeData;
      let roots = buildTreeNodes(this._rows, td);
      this._treeRoots = roots; /* 필터 전 전체 트리 — 체크 캐스케이드가 사용 */
      applyValueGetters(
        collectTreeNodes(roots).map(n => n.row),
        this._columns
      );

      const hasFilter =
        this._filterMode !== 'server' &&
        (Object.keys(this._filterModel).length > 0 || this._quickFilter);
      if (hasFilter) {
        const model = this._filterModel;
        const quick = this._quickFilter;
        const pred = row => filterRows([row], model).length > 0 &&
        quickFilterRows([row], quick, fields).length > 0;
        roots = filterTreeNodes(roots, pred, td.filterKeepChildren !== false);
      }

      if (this._sortModel.length > 0 && this._sortMode !== 'server') {
        const sortModel = this._sortModel;
        roots = sortTreeNodes(roots, rows => sortRows(rows, sortModel, comparators));
      }

      /* 펼침 상태: 처음 보는 노드는 defaultExpandLevel로 초기화 (-1 = 전부 펼침) */
      const defLevel = td.defaultExpandLevel === undefined ? 0 : td.defaultExpandLevel;
      const nodes = collectTreeNodes(roots);
      const info = {};
      /* fetchChildren(지연 로딩): 아직 로드 전인 노드도 hasChildren(row)가 true면 토글 표시 */
      const lazyHas = td.fetchChildren && td.hasChildren
        ? row => {
            try {
              return !!td.hasChildren(row);
            } catch (err) {
              console.error('[DataGrid] treeData.hasChildren failed:', err);
              return false;
            }
          }
        : null;
      nodes.forEach(n => {
        const id = this._rowId(n.row);
        const has =
          n.children.length > 0 ||
          !!(lazyHas && !this._treeLoaded[id] && lazyHas(n.row));
        if (has && this._treeExpanded[id] === undefined) {
          /* 지연 노드는 로드 전이므로 defaultExpandLevel과 무관하게 접힘으로 시작 */
          this._treeExpanded[id] =
            n.children.length > 0 && (defLevel === -1 || n.level < defLevel);
        }
        info[id] = { level: n.level, hasChildren: has, expanded: false };
      });
      const flat = flattenTreeNodes(roots, row => !!this._treeExpanded[this._rowId(row)]);
      flat.forEach(it => {
        info[this._rowId(it.row)].expanded = it.expanded;
      });
      this._treeInfo = info;

      /* 트리 UI를 그릴 컬럼: treeField 지정 컬럼 우선, 없으면 첫 데이터 컬럼 */
      let firstDataCol = null;
      let treeFieldCol = null;
      this._visibleColumns().forEach(c => {
        if (c.field === undefined || c.__rowNumber || c.__detailToggle) return;
        if (firstDataCol === null) firstDataCol = c.colId;
        if (td.treeField && c.field === td.treeField && treeFieldCol === null) {
          treeFieldCol = c.colId;
        }
      });
      this._treeColId = treeFieldCol !== null ? treeFieldCol : firstDataCol;

      this._aggColumns = this._columns.filter(c => c.aggFunc && c.field);

      /* checkboxSelection 컬럼이 있으면 트리 체크박스 모드.
       * 3상태 유도 표시는 cascade일 때만 — 비캐스케이드에서 부모 표시를 자식에서
       * 유도하면 부모 자신의 선택과 어긋나 토글이 갇힌다 (BUG-004) */
      this._treeChecked = null;
      this._treeCheckboxMode = this._hasTreeCheckbox();
      if (this._treeCheckboxMode && this._treeCheckOpts().cascade) {
        this._treeChecked = deriveTreeCheckStates(
          this._treeRoots,
          r => this._rowId(r),
          r => !!this._selection[this._rowId(r)]
        );
      }

      /* treeData.summary: 부모 행에 자손 리프 집계 표시 (필터 반영된 트리 기준) */
      this._treeSummary = null;
      if (td.summary && this._aggColumns.length > 0) {
        const treeAggFailures = [];
        this._treeSummary = computeTreeSummary(
          roots,
          r => this._rowId(r),
          this._aggColumns,
          treeAggFailures
        );
        this._logAggFailures(treeAggFailures);
      }

      this._viewRows = nodes.map(n => n.row);
      this._displayRows = flat.map(it => it.row);
      this._pageInfo = null;
      this._pageRows = this._displayRows;
    }

    /** 루트 폰트 기준 텍스트 폭 측정 함수 (autoRowHeight용). */
    _textMeasurer() {
      const canvas = this._measureCanvas || (this._measureCanvas = document.createElement('canvas'));
      const ctx = canvas.getContext('2d');
      const style = getComputedStyle(this._rootEl);
      ctx.font = `${style.fontSize} ${style.fontFamily}`;
      return text => ctx.measureText(text).width;
    }

    _lineHeight() {
      return Math.round((parseFloat(getComputedStyle(this._rootEl).fontSize) || 14) * 1.45);
    }

    _computeMergeMap() {
      this._mergeMap = null;
      const fields = this.options.mergeCells;
      if (!fields || fields.length === 0) return;
      this._mergeMap = {};
      /* _mergeMap[field] = { cont: 이어짐 여부 배열, span: run 시작 셀의 병합 행 수 } */
      for (let i = 0; i < fields.length; i++) {
        const cont = computeMergeContinuation(this._pageRows, fields[i]);
        this._mergeMap[fields[i]] = { cont, span: computeMergeSpans(cont) };
      }
    }

    _detailHeight() {
      return (this.options.rowDetail && this.options.rowDetail.height) || 200;
    }

    /** 페이지 인덱스의 top 오프셋(px). 디테일 행이 없으면 등간격. */
    _rowTop(pageIndex) {
      return this._rowTops ? this._rowTops[pageIndex] : pageIndex * this._rowHeight;
    }

    /* ---- full refresh ---- */

    refresh() {
      if (this._destroyed) return;
      this._cancelEdit();
      /* 팝업은 행 참조를 붙들고 있으므로 refresh를 견딘다(본문 DOM과 형제).
       * 단 그 행이 데이터에서 사라졌다면 더 저장할 곳이 없으니 닫는다. */
      if (this._popup && this._rows.indexOf(this._popup.row) === -1) this._popupTeardown(false);
      this._recomputeView();
      this._renderHeader();
      this._layoutColumns();
      this._renderBody();
      this._renderPinnedTop();
      this._renderGrandTotal();
      this._renderPaging();
      this._renderInfiniteStatus();
      this._updateOverlay();
      this._emitter.emit('viewRendered', {
        displayedRowCount: this._viewRows.length,
        page: this._pageInfo ? this._pageInfo.page : 0,
      });
    }

    _emitDataChanged() {
      this._emitter.emit('dataChanged', { rowCount: this._rows.length });
    }

    /* ---- partial refresh (전체 재계산 없이 렌더된 DOM만 갱신) ---- */

    _renderedRowEntry(row) {
      const id = String(this._rowId(row));
      for (const idx in this._renderedRows) {
        if (this._renderedRows[idx].dataset.rowId === id) {
          return { el: this._renderedRows[idx], index: Number(idx) };
        }
      }
      return null;
    }

    /** 렌더된 셀 하나를 제자리에서 다시 그린다. 화면 밖이면 false. */
    refreshCell(row, field) {
      const hit = this._renderedRowEntry(row);
      if (!hit) return false;
      const col = this._visibleColumns().find(c => c.field === field);
      if (!col) return false;
      const cellEl = hit.el.querySelector(`[data-col-id="${col.colId}"]`);
      if (!cellEl) return false;
      cellEl.innerHTML = '';
      this._renderCellValue(cellEl, col, row);
      return true;
    }

    /** 렌더된 행 하나를 새로 만들어 교체한다. 화면 밖이면 false. */
    refreshRow(row) {
      const hit = this._renderedRowEntry(row);
      if (!hit) return false;
      /* 이벤트 핸들러 재진입 등으로 추적 중인 행이 이미 캔버스에서 떨어져
       * 있으면 교체를 시도하지 않는다 (BUG-007 방어선). */
      if (hit.el.parentNode !== this._canvasEl) return false;
      const fresh = this._buildRowEl(hit.index);
      this._canvasEl.replaceChild(fresh, hit.el);
      this._renderedRows[hit.index] = fresh;
      return true;
    }

    /** 렌더된 행의 내장 상태 컬럼(statusColumn) 셀만 제자리에서 다시 그린다. */
    _refreshStatusCell(row) {
      if (!this._statusColConfig) return;
      const hit = this._renderedRowEntry(row);
      if (!hit) return;
      const cell = hit.el.querySelector('.dg-cell[data-col-id="__rowStatus"]');
      if (!cell) return;
      cell.innerHTML = '';
      const rowStatus = this.getRowStatus(row);
      if (rowStatus) {
        const tag = el('span', `dg-tag dg-tag-${this._statusColConfig.colors[rowStatus]}`, cell);
        tag.textContent = this._statusColConfig.labels[rowStatus];
      }
    }

    /** 렌더된 모든 행에서 한 컬럼의 셀을 다시 그린다. 컬럼이 없으면 false. */
    refreshColumn(colId) {
      const col = this._columns.find(c => c.colId === colId || c.field === colId);
      if (!col) return false;
      for (const idx in this._renderedRows) {
        const rowEl = this._renderedRows[idx];
        const row = this._pageRows[Number(idx)];
        if (!row || row.__group || row.__detail) continue;
        const cellEl = rowEl.querySelector(`[data-col-id="${col.colId}"]`);
        if (cellEl) {
          cellEl.innerHTML = '';
          this._renderCellValue(cellEl, col, row);
        }
      }
      return true;
    }

    /* ---- runtime option changes (setOptions) ---- */

    /**
     * 재생성 없이 옵션을 갱신한다. 지원: title, toolbar, theme, zebra, localeText, popupEditor,
     * rowHeight, headerHeight, editable, sortModel, groupBy, quickFilter 계열,
     * columnDefs/defaultColDef/rowNumbers/rowDetail(컬럼 재구성),
     * pagination/paginationPageSize, floatingFilter, columnGroups,
     * getRowClass, grandTotal 등 렌더 파이프라인이 읽는 값 전반.
     * 반영 후 refresh() 1회.
     */
    setOptions(patch) {
      if (!patch) return;
      for (const k in patch) this.options[k] = patch[k];

      /* 로케일은 statusColumn 헤더/라벨의 기본값이므로 컬럼 재구성보다 먼저 반영한다. */
      if ('localeText' in patch) this._localeText = resolveLocaleText(patch.localeText);

      if ('columnDefs' in patch || 'defaultColDef' in patch || 'localeText' in patch ||
          'rowNumbers' in patch || 'rowDetail' in patch || 'statusColumn' in patch) {
        this._columns = this._buildColumns();
        this._colWidths = {};
        /* statusColumn을 켜면 추적도 필요하다 (생성자와 동일 규칙) */
        if (this.options.statusColumn) this._trackChanges = true;
      }
      if ('rowHeight' in patch) {
        this._rowHeight = patch.rowHeight || 42;
        this._rootEl.style.setProperty('--dg-row-height', `${this._rowHeight}px`);
      }
      if ('domLayout' in patch) {
        this._domLayout = resolveDomLayout(patch.domLayout);
        this._rootEl.classList.toggle('dg-auto-height', this._domLayout === 'autoHeight');
        this._applyFillLayout();
      }
      if ('headerHeight' in patch) {
        this._headerHeight = patch.headerHeight || 48;
        this._rootEl.style.setProperty('--dg-header-height', `${this._headerHeight}px`);
      }
      if ('popupEditor' in patch) {
        this.closeEditPopup(false); /* 설정이 바뀌면 열려 있던 폼은 폐기 */
        this._popupConfig = resolvePopupEditorConfig(patch.popupEditor);
      }
      if ('zebra' in patch) this._rootEl.classList.toggle('dg-zebra', !!patch.zebra);
      /* 커서가 편집 진입 방식을 그대로 반영하도록 런타임 토글도 따라간다 (BUG-012) */
      if ('editOnSingleClick' in patch) {
        this._rootEl.classList.toggle('dg-edit-single-click', !!patch.editOnSingleClick);
      }
      if ('theme' in patch) this.setTheme(patch.theme);
      if ('editable' in patch) this._editable = patch.editable !== false;
      if ('sortModel' in patch) this._sortModel = (patch.sortModel || []).slice();
      if ('groupBy' in patch) {
        this._groupBy = (patch.groupBy || []).slice();
        this._groupToggled = {};
      }
      if ('paginationPageSize' in patch) this._pageSize = patch.paginationPageSize || 20;
      if ('pagination' in patch) {
        this._pagination = !!patch.pagination;
        if (this._pagination && !this._pagingEl) {
          this._pagingEl = el('div', 'dg-paging-panel', this._rootEl);
        } else if (!this._pagination && this._pagingEl) {
          this._pagingEl.parentNode.removeChild(this._pagingEl);
          this._pagingEl = null;
          this._currentPage = 0;
        }
      }
      if ('title' in patch) {
        if (patch.title && !this._titleEl) {
          this._titleEl = document.createElement('div');
          this._titleEl.className = 'dg-title-bar';
          this._rootEl.insertBefore(this._titleEl, this._rootEl.firstChild);
        }
        if (this._titleEl) {
          this._titleEl.textContent = patch.title || '';
          this._titleEl.hidden = !patch.title;
        }
      }
      if ('toolbar' in patch) {
        if (patch.toolbar && !this._toolbarEl) {
          this._toolbarEl = document.createElement('div');
          this._toolbarEl.className = 'dg-toolbar';
          this._rootEl.insertBefore(this._toolbarEl, this._headerEl);
        }
        if (this._toolbarEl) {
          if (patch.toolbar) { this._toolbarEl.hidden = false; this._mountToolbar(patch.toolbar); }
          else this._toolbarEl.hidden = true;
        }
      }

      this.refresh();
    }

    /* ---- header ---- */

    _renderHeader() {
      this._renderGroupHeader();
      this._headerRowEl.innerHTML = '';
      this._headerCells = {};

      this._visibleColumns().forEach(col => {
        const cell = el('div', 'dg-header-cell', this._headerRowEl);
        cell.setAttribute('role', 'columnheader');
        cell.dataset.colId = col.colId;
        const headerAlign = col.headerAlign || col.align;
        if (headerAlign === 'right') cell.classList.add('dg-align-right');
        if (headerAlign === 'center') cell.classList.add('dg-align-center');
        if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
        if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
        const headerCls = resolveHeaderClass(col.headerClass, col);
        if (headerCls.length) cell.classList.add(...headerCls);
        if (col.headerTooltip) cell.title = col.headerTooltip;

        if (col.headerCheckboxSelection && this.options.rowSelection === 'multiple') {
          cell.classList.add('dg-checkbox-header');
          const cb = el('input', 'dg-checkbox', cell);
          cb.type = 'checkbox';
          cb.setAttribute('aria-label', this._t('selectAllRows'));
          cb.addEventListener('click', e => { e.stopPropagation(); });
          cb.addEventListener('change', () => {
            if (this._hasTreeCheckbox()) {
              /* 트리 모드: 캐스케이드와 동일 규칙 — checkboxDisabled 행은 건드리지 않는다 */
              this._treeCheckAll(cb.checked);
            } else if (cb.checked) {
              this.selectAll();
            } else {
              this.deselectAll();
            }
          });
          this._headerSelectAllEl = cb;
        }

        const label = el('span', 'dg-header-cell-label', cell);
        this._renderHeaderLabel(label, col);

        if (shouldShowEditableIcon(col, this._editable, this.options.editableIndicator)) {
          cell.classList.add('dg-editable-col');
          cell.insertAdjacentHTML('beforeend', EDIT_ICON_SVG);
          cell.lastChild.setAttribute('title', this._t('editableColumn'));
        }

        cell.addEventListener('click', e => {
          if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn') || e.target.closest(HEADER_INTERACTIVE_SELECTOR)) return;
          this._emitter.emit('headerClicked', { colDef: col });
        });

        if (col.sortable) {
          cell.classList.add('dg-sortable');
          cell.insertAdjacentHTML('beforeend', SORT_ICON_SVG);
          const orderEl = el('span', 'dg-sort-order', cell);
          const sortIdx = this._sortModel.findIndex(s => s.field === col.field);
          if (sortIdx !== -1) {
            cell.classList.add(this._sortModel[sortIdx].dir === 'asc' ? 'dg-sort-asc' : 'dg-sort-desc');
            cell.setAttribute('aria-sort', this._sortModel[sortIdx].dir === 'asc' ? 'ascending' : 'descending');
            if (this._sortModel.length > 1) orderEl.textContent = String(sortIdx + 1);
          }
          cell.addEventListener('click', e => {
            if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn') || e.target.closest(HEADER_INTERACTIVE_SELECTOR)) return;
            this._toggleSort(col, e.shiftKey);
          });
        }

        if (col.filter) {
          cell.insertAdjacentHTML('beforeend', FILTER_ICON_SVG);
          if (this._filterModel[col.field]) cell.classList.add('dg-filter-active');
          const menuBtn = el('button', 'dg-header-menu-btn', cell);
          menuBtn.type = 'button';
          menuBtn.innerHTML = MENU_ICON_SVG;
          menuBtn.setAttribute('aria-label', this._t('filterMenuLabel', { column: col.headerName }));
          menuBtn.addEventListener('click', e => {
            e.stopPropagation();
            /* 같은 컬럼 메뉴가 이미 열려 있으면 토글로 닫는다 */
            if (this._menuHeaderCell === cell) {
              this._closeMenu();
              return;
            }
            this._openFilterMenu(col, cell);
          });
        }

        if (col.resizable) {
          const resizer = el('div', 'dg-header-resizer', cell);
          this._bindResizer(resizer, col);
        }

        if (this.options.columnReorder !== false && !col.pinned && !col.checkboxSelection && !col.suppressMove) {
          this._bindReorder(cell, col);
        }

        this._headerCells[col.colId] = cell;
      });

      this._renderFloatingFilters();
    }

    /**
     * 헤더 라벨 콘텐츠 — headerRenderer가 있으면 커스텀 콘텐츠(HTML 문자열 또는 Element),
     * 없거나 실패하면 headerName 텍스트. cellRenderer와 동일하게 문자열은 이스케이프하지 않는다.
     */
    _renderHeaderLabel(label, col) {
      if (col.headerRenderer) {
        try {
          const out = col.headerRenderer({ colDef: col, headerName: col.headerName });
          if (out instanceof (global.Node || Object)) { label.appendChild(out); return; }
          if (out !== undefined && out !== null) { label.innerHTML = out; return; }
        } catch (e) {
          console.error(`[DataGrid] headerRenderer failed for "${col.colId}":`, e);
        }
      }
      label.textContent = col.headerName;
    }

    /* ---- column group header (columnGroups — 그룹 줄 1~2개, 즉 2~3단 헤더) ---- */

    _renderGroupHeader() {
      (this._groupHeaderRowEls || []).forEach(row => {
        if (row.parentNode) row.parentNode.removeChild(row);
      });
      this._groupHeaderRowEls = [];
      this._groupHeaderCells = [];
      const groups = this.options.columnGroups;
      if (!groups || groups.length === 0) return;

      const built = buildGroupHeaderRows(
        this._visibleColumns(), groups, MAX_GROUP_HEADER_DEPTH
      );
      /* 같은 경고를 refresh마다 다시 찍지 않는다 */
      built.warnings.forEach(w => {
        if (!this._groupHeaderWarned) this._groupHeaderWarned = {};
        if (this._groupHeaderWarned[w]) return;
        this._groupHeaderWarned[w] = true;
        console.warn('[DataGrid] ' + w);
      });
      if (!built.depth) return;

      /* 위 레벨이 먼저 와야 하므로 뒤에서부터 헤더 맨 앞에 끼운다 */
      for (let lv = built.depth - 1; lv >= 0; lv--) {
        const row = el('div', 'dg-header-group-row');
        row.setAttribute('role', 'row');
        this._headerEl.insertBefore(row, this._headerEl.firstChild);
        this._groupHeaderRowEls.unshift(row);

        built.rows[lv].forEach(run => {
          const cell = el('div', 'dg-header-group-cell', row);
          if (run.kind === 'empty') cell.classList.add('dg-header-group-empty');
          if (run.kind === 'cont') cell.classList.add('dg-header-group-cont');
          if (run.span) cell.classList.add('dg-header-group-span');
          if (run.kind === 'group') {
            const label = el('span', 'dg-header-group-label', cell);
            label.textContent = run.headerName;
          }
          if (run.pinned === 'left') cell.classList.add('dg-pinned-left');
          if (run.pinned === 'right') cell.classList.add('dg-pinned-right');
          this._groupHeaderCells.push({ el: cell, colIds: run.colIds, pinned: run.pinned });
        });
      }
    }

    /* ---- floating filter row (헤더 아래 인라인 필터) ---- */

    _renderFloatingFilters() {
      if (this._floatingRowEl && this._floatingRowEl.parentNode) {
        this._floatingRowEl.parentNode.removeChild(this._floatingRowEl);
      }
      this._floatingRowEl = null;
      this._floatingCells = {};

      const cols = this._visibleColumns();
      const hasFilter = cols.some(c => c.filter && c.field);
      if (!this.options.floatingFilter || !hasFilter) return;

      const row = el('div', 'dg-floating-row', this._headerEl);
      row.setAttribute('role', 'row');
      this._floatingRowEl = row;

      cols.forEach(col => {
        const cell = el('div', 'dg-floating-cell', row);
        cell.dataset.colId = col.colId;
        if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
        if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
        this._applyCellLayout(cell, col.colId);
        this._floatingCells[col.colId] = cell;
        if (!col.filter || !col.field) return;

        const current = this._filterModel[col.field];

        if (col.filter === 'set') {
          const select = el('select', 'dg-floating-input', cell);
          select.setAttribute('aria-label', this._t('columnFilterLabel', { column: col.headerName }));
          const optAll = el('option', null, select);
          optAll.value = '';
          optAll.textContent = this._t('filterAll');
          this._uniqueFieldValues(col.field).forEach(v => {
            const opt = el('option', null, select);
            opt.value = v === '' ? FLOATING_BLANK : v;
            opt.textContent = v === '' ? this._t('blanks') : v;
          });
          if (current && current.type === 'set' && current.values && current.values.length === 1) {
            const cv = String(current.values[0]);
            select.value = cv === '' ? FLOATING_BLANK : cv;
          }
          select.addEventListener('change', () => {
            const raw = select.value === '' ? null
              : select.value === FLOATING_BLANK ? '' : select.value;
            this._applyFloatingFilter(col, buildFloatingFilterModel('set', raw, null));
          });
          return;
        }

        const input = el('input', 'dg-floating-input', cell);
        input.type = col.filter === 'number' ? 'number' : 'text';
        input.placeholder = this._t('filterPlaceholder');
        input.setAttribute('aria-label', this._t('columnFilterLabel', { column: col.headerName }));
        if (current && current.value !== undefined) input.value = current.value;
        let timer = null;
        const apply = () => {
          this._applyFloatingFilter(
            col,
            buildFloatingFilterModel(col.filter, input.value, this._filterModel[col.field])
          );
        };
        input.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(apply, 250);
        });
        input.addEventListener('keydown', e => {
          e.stopPropagation(); /* 그리드 키보드 내비게이션과 분리 */
          if (e.key === 'Enter') { clearTimeout(timer); apply(); }
          else if (e.key === 'Escape') {
            clearTimeout(timer);
            input.value = '';
            this._applyFloatingFilter(col, null);
          }
        });
      });
    }

    /* refresh()가 헤더 DOM을 재생성하므로, 필터 적용 후 입력 포커스·캐럿을 복원한다. */
    _applyFloatingFilter(col, model) {
      const hadFocus = this._floatingCells[col.colId] &&
        this._floatingCells[col.colId].contains(document.activeElement);
      this.applyColumnFilter(col.field, model);
      if (!hadFocus) return;
      const cell = this._floatingCells[col.colId];
      const input = cell && cell.querySelector('.dg-floating-input');
      if (input) {
        input.focus();
        if (input.setSelectionRange && input.type === 'text') {
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    }

    _uniqueFieldValues(field) {
      const values = [];
      const seen = Object.create(null);
      this._rows.forEach(r => {
        const v = String(r[field]);
        if (!seen[v]) { seen[v] = true; values.push(v); }
      });
      values.sort();
      return values;
    }

    /* ---- column layout (widths + pinned offsets) ---- */

    _layoutColumns() {
      if (this._destroyed) return;
      const cols = this._visibleColumns();
      const available = this._bodyEl.clientWidth || this._rootEl.clientWidth;

      const widths = computeColumnWidths(cols, this._colWidths, available);
      this._computedWidths = widths;

      /* 캔버스에 전체 컬럼 폭을 직접 고정한다 (BUG-003).
       * 행은 전부 absolute 배치라 캔버스 자체 폭에 기여하지 못하므로, 행 DOM을
       * 비웠다 다시 만드는 사이 강제 레이아웃이 끼면 scrollWidth가 뷰포트 폭으로
       * 붕괴해 브라우저가 scrollLeft를 0으로 클램프한다 (virtualX 가로 스크롤바
       * 드래그가 제자리로 튕기는 증상). 캔버스 min-width를 고정하면 행 유무와
       * 무관하게 가로 스크롤 폭이 안정된다. */
      let totalW = 0;
      cols.forEach(c => { totalW += widths[c.colId] || 0; });
      this._canvasEl.style.minWidth = `max(100%, ${totalW}px)`;

      if (this.options.virtualX) this._updateColWindow();

      /* pinned offsets */
      let leftOffset = 0;
      const offsets = {};
      cols.forEach(c => {
        if (c.pinned === 'left') { offsets[c.colId] = { left: leftOffset }; leftOffset += widths[c.colId]; }
      });
      let rightOffset = 0;
      for (let i = cols.length - 1; i >= 0; i--) {
        const c = cols[i];
        if (c.pinned === 'right') { offsets[c.colId] = { right: rightOffset }; rightOffset += widths[c.colId]; }
      }
      this._pinnedOffsets = offsets;

      let lastLeft = null, firstRight = null;
      cols.forEach(c => {
        if (c.pinned === 'left') lastLeft = c.colId;
        if (c.pinned === 'right' && firstRight === null) firstRight = c.colId;
      });
      this._pinnedEdges = { left: lastLeft, right: firstRight };

      /* apply to header */
      for (const colId in this._headerCells) {
        this._applyCellLayout(this._headerCells[colId], colId);
      }
      /* apply to floating filter row */
      for (const flColId in this._floatingCells) {
        this._applyCellLayout(this._floatingCells[flColId], flColId);
      }
      /* apply to column group header (스팬 폭 = 멤버 폭 합) */
      if (this._groupHeaderCells) {
        const ghOffsets = offsets;
        this._groupHeaderCells.forEach(gh => {
          let w = 0;
          gh.colIds.forEach(id => { w += widths[id] || 0; });
          gh.el.style.width = `${w}px`;
          if (gh.pinned === 'left' && ghOffsets[gh.colIds[0]]) {
            gh.el.style.left = `${ghOffsets[gh.colIds[0]].left}px`;
          }
          if (gh.pinned === 'right' && ghOffsets[gh.colIds[gh.colIds.length - 1]]) {
            gh.el.style.right = `${ghOffsets[gh.colIds[gh.colIds.length - 1]].right}px`;
          }
        });
      }
      /* apply to grand total footer */
      for (const fColId in this._footerCells) {
        this._applyCellLayout(this._footerCells[fColId], fColId);
      }
      /* apply to pinned top rows */
      if (this._pinnedTopEl && !this._pinnedTopEl.hidden) {
        for (let pt = 0; pt < this._pinnedTopEl.children.length; pt++) {
          const ptRow = this._pinnedTopEl.children[pt];
          for (let pc = 0; pc < ptRow.children.length; pc++) {
            this._applyCellLayout(ptRow.children[pc], ptRow.children[pc].dataset.colId);
          }
        }
      }
      /* apply to rendered rows */
      for (const idx in this._renderedRows) {
        const rowEl = this._renderedRows[idx];
        if (rowEl.classList.contains('dg-detail-row')) {
          const detailBody = rowEl.firstChild;
          if (detailBody) detailBody.style.width = `${this._bodyEl.clientWidth || 400}px`;
          continue;
        }
        for (let j = 0; j < rowEl.children.length; j++) {
          this._applyCellLayout(rowEl.children[j], rowEl.children[j].dataset.colId);
        }
      }
    }

    /** 현재 스크롤 기준 컬럼 렌더 창을 갱신한다. 창이 바뀌었으면 true. */
    _updateColWindow() {
      if (!this.options.virtualX) { this._colWindow = null; return false; }
      const specs = this._visibleColumns().map(c => ({
        width: (this._computedWidths && this._computedWidths[c.colId]) || c.width,
        pinned: c.pinned
      }));
      const next = computeColumnWindow(
        specs,
        this._bodyEl.scrollLeft,
        this._bodyEl.clientWidth || 800
      );
      if (this._colWindow && this._colWindow.c1 === next.c1 && this._colWindow.c2 === next.c2) {
        return false;
      }
      this._colWindow = next;
      return true;
    }

    _applyCellLayout(cellEl, colId) {
      if (!cellEl || !colId || !this._computedWidths) return;
      cellEl.style.width = `${this._computedWidths[colId]}px`;
      const off = this._pinnedOffsets[colId];
      if (off) {
        if (off.left !== undefined) cellEl.style.left = `${off.left}px`;
        if (off.right !== undefined) cellEl.style.right = `${off.right}px`;
      }
      cellEl.classList.toggle(
        'dg-pinned-edge',
        colId === this._pinnedEdges.left || colId === this._pinnedEdges.right
      );
    }

    /* ---- body rendering (virtualized) ---- */

    _renderBody() {
      this._canvasEl.innerHTML = '';
      this._renderedRows = {};
      this._lastRange = null;
      this._canvasEl.style.height =
        `${this._rowTops ? this._totalRowsHeight : this._pageRows.length * this._rowHeight}px`;
      this._renderVisibleRows(true);
    }

    _renderVisibleRows(force) {
      const total = this._pageRows.length;
      const viewportH = this._bodyEl.clientHeight || 400;
      let first, last;
      if (this._rowTops) {
        first = findRowAtOffset(this._rowTops, this._bodyEl.scrollTop) - ROW_BUFFER;
        last = findRowAtOffset(this._rowTops, this._bodyEl.scrollTop + viewportH) + 1 + ROW_BUFFER;
      } else {
        first = Math.floor(this._bodyEl.scrollTop / this._rowHeight) - ROW_BUFFER;
        last = Math.ceil((this._bodyEl.scrollTop + viewportH) / this._rowHeight) + ROW_BUFFER;
      }
      first = clamp(first, 0, Math.max(0, total - 1));
      last = clamp(last, 0, total);

      if (!force && this._lastRange && this._lastRange[0] === first && this._lastRange[1] === last) return;
      this._lastRange = [first, last];

      /* drop rows that left the window */
      for (const idx in this._renderedRows) {
        if (idx < first || idx >= last) {
          this._canvasEl.removeChild(this._renderedRows[idx]);
          delete this._renderedRows[idx];
        }
      }
      /* add missing rows */
      for (let i = first; i < last; i++) {
        if (!this._renderedRows[i]) {
          this._renderedRows[i] = this._buildRowEl(i);
          this._canvasEl.appendChild(this._renderedRows[i]);
        }
      }
    }

    _buildRowEl(pageIndex) {
      const row = this._pageRows[pageIndex];
      if (row && row.__detail) return this._buildDetailRowEl(pageIndex, row);
      if (row && row.__group) return this._buildGroupRowEl(pageIndex, row);
      const id = this._rowId(row);
      const rowEl = el('div', 'dg-row');
      rowEl.setAttribute('role', 'row');
      rowEl.style.top = `${this._rowTop(pageIndex)}px`;
      if (this._rowHeights) rowEl.style.height = `${this._rowHeights[pageIndex]}px`;
      rowEl.dataset.rowIndex = pageIndex;
      rowEl.dataset.rowId = id;
      const ordinal = this._pageOrdinals ? this._pageOrdinals[pageIndex] : pageIndex;
      const globalIndex = (this._pageInfo ? this._pageInfo.start : 0) + ordinal;
      if (globalIndex % 2 === 1) rowEl.classList.add('dg-row-odd');
      if (this._selection[id]) rowEl.classList.add('dg-row-selected');
      /* 행/셀 잠금 — id로 한 번만 읽어 셀 루프에서 재사용한다 */
      const rowLocked = isRowLocked(this._locks, id);
      const lockedCells = this._locks.cells[id] || null;
      if (rowLocked) rowEl.classList.add('dg-row-disabled');
      if (this.options.getRowClass) {
        try {
          const rowCls = this.options.getRowClass(row, globalIndex);
          if (rowCls) rowEl.classList.add(...String(rowCls).split(/\s+/));
        } catch (e) {
          console.error('[DataGrid] getRowClass failed:', e);
        }
      }
      let dirtyFields = null;
      if (this._trackChanges) {
        if (this._addedRows.includes(row)) rowEl.classList.add('dg-row-added');
        if (this._isRowDeleted(row)) rowEl.classList.add('dg-row-deleted');
        else if (this._originals) dirtyFields = this._originals.get(row) || null;
      }
      /* 스크롤로 새로 생성되는 행에도 셀 범위 표시를 적용 */
      let rangeRect = this._cellSelection ? this._normalizedRange() : null;
      if (rangeRect && (pageIndex < rangeRect.r1 || pageIndex > rangeRect.r2)) rangeRect = null;

      /* virtualX: 창 밖 일반 컬럼은 셀 대신 폭 스페이서로 대체 */
      const colWindow = this.options.virtualX ? this._colWindow : null;
      let leftSpacer = null;
      let rightSpacer = null;
      let skippedBefore = 0;
      let skippedAfter = 0;

      this._visibleColumns().forEach((col, cIdx) => {
        if (colWindow && !col.pinned && (cIdx < colWindow.c1 || cIdx > colWindow.c2)) {
          const w = (this._computedWidths && this._computedWidths[col.colId]) || col.width;
          if (cIdx < colWindow.c1) {
            if (!leftSpacer) leftSpacer = el('div', 'dg-cell dg-colspacer', rowEl);
            skippedBefore += w;
          } else {
            if (!rightSpacer) rightSpacer = el('div', 'dg-cell dg-colspacer', rowEl);
            skippedAfter += w;
          }
          return;
        }
        const cell = el('div', 'dg-cell', rowEl);
        cell.setAttribute('role', 'gridcell');
        cell.dataset.colId = col.colId;
        cell.dataset.colIndex = cIdx;
        if (col.align === 'right') cell.classList.add('dg-align-right');
        if (col.align === 'center') cell.classList.add('dg-align-center');
        if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
        if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
        if (col.wrapText) cell.classList.add('dg-cell-wrap');
        const cellEditable = this._canEditCell(row, col);
        if (cellEditable) cell.classList.add('dg-cell-editable');
        /* 컬럼은 편집 가능한데 이 셀만 잠긴 경우에만 표식을 단다.
         * 행 잠금은 행 표시가 이미 알려주므로 셀마다 겹쳐 그리면 정보량이 0이다. */
        else if (col.editable && this._editable && !rowLocked &&
                 lockedCells && lockedCells[col.field]) {
          cell.classList.add('dg-cell-disabled');
          cell.setAttribute('aria-readonly', 'true');
        }
        if (dirtyFields && col.field !== undefined && (col.field in dirtyFields)) {
          cell.classList.add('dg-cell-dirty');
          cell.title = `Original: ${dirtyFields[col.field]}`;
        }
        /* 필수인데 비어 있는 셀 — dirty와 동시에 뜰 수 있어서 CSS에서 반대쪽
         * 모서리를 쓴다(왼쪽 위 = 수정됨 / 오른쪽 위 = 필수 미입력). */
        if (shouldShowRequired(col, cellEditable)) {
          cell.setAttribute('aria-required', 'true');
          if (isBlankValue(row[col.field])) {
            cell.classList.add('dg-cell-required');
            cell.setAttribute('aria-invalid', 'true');
            if (!cell.title) {
              cell.title = this._t('requiredValue', { column: col.headerName || col.field || '' });
            }
          }
        }
        if (rangeRect && cIdx >= rangeRect.c1 && cIdx <= rangeRect.c2) {
          cell.classList.add('dg-cell-range');
        }
        if (col.cellClass) {
          const cls = typeof col.cellClass === 'function' ? col.cellClass(row[col.field], row) : col.cellClass;
          if (cls) cell.classList.add(...String(cls).split(/\s+/));
        }
        if (
          this._focusedCell &&
          this._focusedCell.r === pageIndex &&
          this._focusedCell.c === cIdx
        ) {
          cell.classList.add('dg-cell-focused');
        }
        this._applyCellLayout(cell, col.colId);

        /* mergeCells: run 시작 셀을 run 전체 높이로 늘려 하나의 병합 셀처럼 그리고
         * (값 세로 중앙, 불투명 배경이 아래 행들을 덮음), 이어지는 셀은 값 없이
         * 시작 셀 아래에 숨긴다. 시작 행이 렌더 창(버퍼) 밖으로 나가면 이어지는
         * 셀만 남는데, 그때는 기존처럼 경계선만 지운 빈 셀로 폴백된다. */
        const mergeInfo =
          this._mergeMap && col.field !== undefined ? this._mergeMap[col.field] : null;
        if (mergeInfo && mergeInfo.cont[pageIndex]) {
          cell.classList.add('dg-cell-merged');
          return;
        }
        if (mergeInfo && mergeInfo.span[pageIndex] > 1) {
          cell.classList.add('dg-cell-merge-start');
          const mergeEnd = pageIndex + mergeInfo.span[pageIndex];
          const mergeBottom = mergeEnd < this._pageRows.length
            ? this._rowTop(mergeEnd)
            : (this._rowTops ? this._totalRowsHeight : mergeEnd * this._rowHeight);
          /* -1px: run 마지막 행의 아래 경계선은 남긴다 */
          cell.style.height = `${mergeBottom - this._rowTop(pageIndex) - 1}px`;
        }

        if (col.__rowNumber) {
          cell.classList.add('dg-rownum-cell');
          const num = el('span', 'dg-cell-value', cell);
          num.textContent = (globalIndex + 1).toLocaleString();
          return;
        }

        /* 내장 상태 컬럼 (statusColumn) — 추적 상태를 dg-tag로 표시 */
        if (col.__rowStatus) {
          const rowStatus = this.getRowStatus(row);
          if (rowStatus && this._statusColConfig) {
            const tag = el('span', `dg-tag dg-tag-${this._statusColConfig.colors[rowStatus]}`, cell);
            tag.textContent = this._statusColConfig.labels[rowStatus];
          }
          return;
        }

        if (col.__detailToggle) {
          cell.classList.add('dg-detail-toggle-cell');
          const expanded = !!this._detailExpanded[id];
          const chev = el('span', `dg-group-chevron${expanded ? ' dg-expanded' : ''}`, cell);
          chev.innerHTML = CHEVRON_SVG;
          cell.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          return;
        }

        if (col.checkboxSelection) {
          cell.classList.add('dg-checkbox-cell');
          const cb = el('input', 'dg-checkbox', cell);
          cb.type = 'checkbox';
          if (this._treeCheckboxMode) {
            /* 트리 모드: 선택 연동 체크박스 — cascade면 3상태(유도), 아니면 자기 선택 */
            const tState = this._treeChecked ? this._treeChecked[id] : !!this._selection[id];
            cb.checked = tState === true;
            cb.indeterminate = tState === 'indeterminate';
            cb.disabled = this._treeCheckOpts().isDisabled(row);
            cb.setAttribute('aria-label', this._t('selectSubtree'));
            if (rowLocked) cb.setAttribute('aria-disabled', 'true');
            cb.addEventListener('click', e => { e.stopPropagation(); });
            cb.addEventListener('change', () => {
              this._treeCheckToggle(row, cb.checked);
            });
          } else {
            cb.checked = !!this._selection[id];
            /* 잠긴 행은 체크박스도 비활성 — 여백 클릭 폴백도 함께 죽는다(5247 주석 참조) */
            cb.disabled = rowLocked;
            cb.setAttribute('aria-label', this._t('selectRow'));
            cb.addEventListener('click', e => { e.stopPropagation(); });
            cb.addEventListener('change', () => {
              this._setRowSelected(row, cb.checked, true);
            });
          }
          if (col.field === undefined) return; /* checkbox-only column */
        }

        /* treeData: 트리 컬럼에 들여쓰기 + 펼침 토글(자식 있을 때) */
        if (this._treeData && col.colId === this._treeColId && this._treeInfo) {
          const tInfo = this._treeInfo[id];
          if (tInfo) {
            cell.classList.add('dg-tree-cell');
            if (tInfo.level > 0) {
              const tIndent = el('span', 'dg-tree-indent', cell);
              tIndent.style.width = `${tInfo.level * (this._treeData.indent || 20)}px`;
            }
            if (tInfo.hasChildren) {
              const tChev = el(
                'span',
                `dg-group-chevron dg-tree-toggle${tInfo.expanded ? ' dg-expanded' : ''}${this._treeLoading[id] ? ' dg-tree-loading' : ''}`,
                cell
              );
              tChev.innerHTML = CHEVRON_SVG;
              cell.setAttribute('aria-expanded', tInfo.expanded ? 'true' : 'false');
            } else {
              el('span', 'dg-tree-toggle-spacer', cell);
            }
          }
        }

        /* treeData.summary: 부모 행의 aggFunc 컬럼에 자손 리프 집계 (표시 전용) */
        if (this._treeSummary && col.aggFunc && col.field) {
          const tNode = this._treeInfo && this._treeInfo[id];
          const tAgg = this._treeSummary[id];
          if (tNode && tNode.hasChildren && tAgg &&
              tAgg[col.field] !== null && tAgg[col.field] !== undefined) {
            cell.classList.add('dg-cell-agg');
            const tHolder = el('span', 'dg-cell-value', cell);
            tHolder.textContent = this._formatAggValue(col, tAgg[col.field]);
            return;
          }
        }

        this._renderCellValue(cell, col, row);
      });

      if (leftSpacer) leftSpacer.style.width = `${skippedBefore}px`;
      if (rightSpacer) rightSpacer.style.width = `${skippedAfter}px`;

      return rowEl;
    }

    /* 그룹 헤더 행: 일반 행과 같은 셀 레이아웃을 유지해 컬럼 폭·고정 컬럼과 정렬을 맞추고,
     * 첫 콘텐츠 컬럼에 셰브론+라벨+건수, aggFunc 컬럼에 집계값을 표시한다. */
    _buildGroupRowEl(pageIndex, item) {
      const rowEl = el('div', 'dg-row dg-group-row');
      rowEl.setAttribute('role', 'row');
      rowEl.setAttribute('aria-expanded', item.expanded ? 'true' : 'false');
      rowEl.style.top = `${this._rowTop(pageIndex)}px`;
      rowEl.dataset.rowIndex = pageIndex;

      const cols = this._visibleColumns();
      let labelColId = null;
      for (let i = 0; i < cols.length; i++) {
        if (!cols[i].checkboxSelection && !cols[i].__rowNumber) { labelColId = cols[i].colId; break; }
      }

      cols.forEach((col, cIdx) => {
        const cell = el('div', 'dg-cell', rowEl);
        cell.setAttribute('role', 'gridcell');
        cell.dataset.colId = col.colId;
        cell.dataset.colIndex = cIdx;
        if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
        if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
        this._applyCellLayout(cell, col.colId);

        if (col.colId === labelColId) {
          cell.classList.add('dg-group-cell');
          if (item.level > 0) {
            const indent = el('span', 'dg-group-indent', cell);
            indent.style.width = `calc(var(--dg-group-indent) * ${item.level})`;
          }
          const chevron = el('span', `dg-group-chevron${item.expanded ? ' dg-expanded' : ''}`, cell);
          chevron.innerHTML = CHEVRON_SVG;
          const label = el('span', 'dg-group-label', cell);
          label.textContent =
            item.value === null || item.value === undefined || item.value === ''
              ? this._t('blanks')
              : String(item.value);
          const count = el('span', 'dg-group-count', cell);
          count.textContent = this._t('rowCount', { count: item.leafCount.toLocaleString() });
          return;
        }

        if (col.aggFunc && col.field && item.agg[col.field] !== null && item.agg[col.field] !== undefined) {
          if (col.align === 'right') cell.classList.add('dg-align-right');
          if (col.align === 'center') cell.classList.add('dg-align-center');
          cell.classList.add('dg-cell-agg');
          const holder = el('span', 'dg-cell-value', cell);
          holder.textContent = this._formatAggValue(col, item.agg[col.field]);
        }
      });

      return rowEl;
    }

    /* 디테일 행: 전체 폭을 차지하는 컨테이너 하나. 내용은 rowDetail.renderer가 채운다. */
    _buildDetailRowEl(pageIndex, item) {
      const rowEl = el('div', 'dg-row dg-detail-row');
      rowEl.setAttribute('role', 'row');
      rowEl.style.top = `${this._rowTop(pageIndex)}px`;
      rowEl.style.height = `${this._detailHeight()}px`;
      rowEl.dataset.rowIndex = pageIndex;
      const body = el('div', 'dg-detail-body', rowEl);
      body.style.width = `${this._bodyEl.clientWidth || 400}px`;
      const renderer = this.options.rowDetail && this.options.rowDetail.renderer;
      if (renderer) {
        try {
          const out = renderer(item.row);
          if (out instanceof (global.Node || Object)) body.appendChild(out);
          else if (out !== undefined && out !== null) body.innerHTML = out;
        } catch (e) {
          console.error('[DataGrid] rowDetail.renderer failed:', e);
        }
      }
      return rowEl;
    }

    /**
     * 커스텀 aggFunc의 예외를 컬럼당 한 번만 로깅한다 — 부모 노드가 100개면
     * 같은 오류가 100번 찍혀 콘솔이 쓸모없어진다.
     */
    _logAggFailures(failures) {
      if (!failures || !failures.length) return;
      const seen = {};
      failures.forEach(f => {
        if (seen[f.field]) return;
        seen[f.field] = 1;
        console.error(`[DataGrid] aggFunc failed for "${f.field}":`, f.error);
      });
    }

    _formatAggValue(col, value) {
      if (value === null || value === undefined) return '';
      /* 커스텀 aggFunc의 결과에는 valueFormatter를 걸지 않는다 — 함수가 이미 출력을
       * 결정했는데 숫자 포매터가 다시 씹으면 "project (5)" 같은 반환이 망가진다.
       * 내장 집계(문자열)에만 적용하고, count는 종전대로 제외. */
      if (col.valueFormatter && typeof col.aggFunc === 'string' && col.aggFunc !== 'count') {
        try { return String(col.valueFormatter(value, null)); }
        catch (e) { /* 집계 행에는 row가 없으므로 실패 시 원시 값으로 폴백 */ }
      }
      if (typeof value === 'number' && !Number.isInteger(value)) {
        value = Math.round(value * 100) / 100;
      }
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    }

    _renderCellValue(cell, col, row) {
      const value = col.field !== undefined ? row[col.field] : undefined;
      let formatted = value;
      if (col.valueFormatter) {
        try { formatted = col.valueFormatter(value, row); }
        catch (e) { console.error(`[DataGrid] valueFormatter failed for "${col.field}":`, e); }
      }
      const holder = el('span', 'dg-cell-value', cell);

      if (col.cellRenderer) {
        try {
          const out = col.cellRenderer({
            value, formatted, data: row, colDef: col,
            /* lazy 검색(editorSearch.fetch)에서 고른 value→label 캐시 (없으면 null) */
            optionLabels: (this._searchSelectLabels && this._searchSelectLabels[col.colId]) || null,
          });
          if (out instanceof (global.Node || Object)) holder.appendChild(out);
          else if (out !== undefined && out !== null) holder.innerHTML = out;
          return;
        } catch (e) {
          console.error(`[DataGrid] cellRenderer failed for "${col.field}":`, e);
        }
      }
      holder.textContent = formatted === null || formatted === undefined ? '' : String(formatted);
    }

    /* ---- sorting ---- */

    /** 제안된 정렬 모델로 beforeSort(취소 가능)를 거쳐 적용한다. */
    _applySortModel(proposed) {
      const evt = { sortModel: proposed.slice(), cancel: false };
      this._emitter.emit('beforeSort', evt);
      if (evt.cancel) return;
      this._sortModel = evt.sortModel.slice();
      this.refresh();
      this._emitter.emit('sortChanged', { sortModel: this._sortModel.slice() });
      if (this._sortMode === 'server') this._fetchData(); /* 정렬은 페이지를 유지 */
    }

    _toggleSort(col, additive) {
      if (!col.field) return;
      const existing = this._sortModel.find(s => s.field === col.field);
      let next;
      if (!existing) next = 'asc';
      else if (existing.dir === 'asc') next = 'desc';
      else next = null;

      const proposed = additive
        ? this._sortModel.filter(s => s.field !== col.field)
        : [];
      if (next) proposed.push({ field: col.field, dir: next });
      this._applySortModel(proposed);
    }

    setSortModel(model) {
      this._applySortModel((model || []).slice());
    }

    getSortModel() { return this._sortModel.slice(); }

    /* ---- filtering ---- */

    _openFilterMenu(col, headerCell) {
      this._closeMenu();

      const menu = el('div', 'dg-menu');
      menu.addEventListener('mousedown', e => { e.stopPropagation(); });
      const title = el('div', 'dg-menu-title', menu);
      title.textContent = col.headerName;

      const current = this._filterModel[col.field] || {};
      let getModel;

      if (col.filter === 'set') {
        const values = this._uniqueFieldValues(col.field);
        const active = {};
        (current.values || values).forEach(v => { active[v] = true; });

        const list = el('div', 'dg-menu-set-list', menu);
        const itemCbs = [];
        values.forEach(v => {
          const item = el('label', 'dg-menu-set-item', list);
          const cb = el('input', 'dg-checkbox', item);
          cb.type = 'checkbox';
          cb.checked = !!active[v];
          cb.dataset.value = v;
          itemCbs.push(cb);
          const span = el('span', null, item);
          span.textContent = v === '' ? this._t('blanks') : v;
        });
        getModel = () => {
          const checked = itemCbs.filter(cb => cb.checked)
            .map(cb => cb.dataset.value);
          if (checked.length === values.length) return null; /* all = no filter */
          return { type: 'set', values: checked };
        };
      } else if (col.filter === 'number') {
        const opSel = el('select', null, menu);
        [
          ['equals', 'opEquals'], ['notEqual', 'opNotEqual'],
          ['lessThan', 'opLessThan'], ['lessThanOrEqual', 'opLessThanOrEqual'],
          ['greaterThan', 'opGreaterThan'], ['greaterThanOrEqual', 'opGreaterThanOrEqual'],
          ['inRange', 'opInRange'],
        ].forEach(o => {
          const opt = el('option', null, opSel);
          opt.value = o[0]; opt.textContent = this._t(o[1]);
        });
        opSel.value = current.op || 'equals';
        const input = el('input', null, menu);
        input.type = 'number';
        input.placeholder = this._t('filterPlaceholder');
        input.value = current.value !== undefined ? current.value : '';
        const inputTo = el('input', null, menu);
        inputTo.type = 'number';
        inputTo.placeholder = this._t('filterToPlaceholder');
        inputTo.value = current.valueTo !== undefined ? current.valueTo : '';
        const syncRange = () => { inputTo.style.display = opSel.value === 'inRange' ? '' : 'none'; };
        opSel.addEventListener('change', syncRange);
        syncRange();
        getModel = () => {
          if (input.value === '') return null;
          return { type: 'number', op: opSel.value, value: input.value, valueTo: inputTo.value };
        };
      } else {
        const opSel2 = el('select', null, menu);
        [
          ['contains', 'opContains'], ['notContains', 'opNotContains'],
          ['equals', 'opEquals'], ['notEqual', 'opNotEqual'],
          ['startsWith', 'opStartsWith'], ['endsWith', 'opEndsWith'],
        ].forEach(o => {
          const opt = el('option', null, opSel2);
          opt.value = o[0]; opt.textContent = this._t(o[1]);
        });
        opSel2.value = current.op || 'contains';
        const input2 = el('input', null, menu);
        input2.type = 'text';
        input2.placeholder = this._t('filterPlaceholder');
        input2.value = current.value !== undefined ? current.value : '';
        getModel = () => {
          if (input2.value === '') return null;
          return { type: 'text', op: opSel2.value, value: input2.value };
        };
      }

      const actions = el('div', 'dg-menu-actions', menu);
      const clearBtn = el('button', 'dg-btn', actions);
      clearBtn.type = 'button';
      clearBtn.textContent = this._t('filterClear');
      clearBtn.addEventListener('click', () => {
        this.applyColumnFilter(col.field, null);
        this._closeMenu();
      });
      const applyBtn = el('button', 'dg-btn dg-btn-primary', actions);
      applyBtn.type = 'button';
      applyBtn.textContent = this._t('filterApply');
      applyBtn.addEventListener('click', () => {
        this.applyColumnFilter(col.field, getModel());
        this._closeMenu();
      });
      menu.addEventListener('keydown', e => {
        if (e.key === 'Enter') applyBtn.click();
        if (e.key === 'Escape') this._closeMenu();
      });

      /* 메뉴는 .dg-root 안에 두어야 --dg-* 토큰과 다크 테마를 상속받는다.
       * (position:fixed이므로 위치는 뷰포트 기준 그대로 동작) */
      this._rootEl.appendChild(menu);
      const rect = headerCell.getBoundingClientRect();
      const menuW = menu.offsetWidth;
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.left = `${clamp(rect.left, 8, window.innerWidth - menuW - 8)}px`;
      headerCell.classList.add('dg-menu-open');
      this._menuEl = menu;
      this._menuHeaderCell = headerCell;
      const focusable = menu.querySelector('input, select');
      if (focusable) focusable.focus();
    }

    _closeMenu() {
      if (this._menuEl) {
        this._menuEl.parentNode && this._menuEl.parentNode.removeChild(this._menuEl);
        this._menuEl = null;
      }
      if (this._menuHeaderCell) {
        this._menuHeaderCell.classList.remove('dg-menu-open');
        this._menuHeaderCell = null;
      }
    }

    applyColumnFilter(field, model) {
      if (model) this._filterModel[field] = model;
      else delete this._filterModel[field];
      this._currentPage = 0;
      this.refresh();
      this._emitter.emit('filterChanged', { filterModel: this.getFilterModel() });
      if (this._filterMode === 'server') this._fetchData(); /* 페이지는 위에서 이미 0 */
    }

    getFilterModel() {
      const out = {};
      for (const k in this._filterModel) out[k] = this._filterModel[k];
      return out;
    }

    clearFilters() {
      this._filterModel = {};
      this._quickFilter = '';
      this._currentPage = 0;
      this.refresh();
      this._emitter.emit('filterChanged', { filterModel: {} });
      if (this._filterMode === 'server') this._fetchData(); /* 페이지는 위에서 이미 0 */
    }

    setQuickFilter(text) {
      this._quickFilter = text || '';
      this._currentPage = 0;
      this.refresh();
      this._emitter.emit('filterChanged', { filterModel: this.getFilterModel(), quickFilter: this._quickFilter });
      if (this._filterMode === 'server') this._fetchData(); /* 페이지는 위에서 이미 0 */
    }

    /* ---- row grouping ---- */

    setGroupBy(fields) {
      this._groupBy = (fields || []).slice();
      this._groupToggled = {};
      this._groupDefaultExpanded = this.options.groupDefaultExpanded !== false;
      this._currentPage = 0;
      this._focusedCell = null;
      this.refresh();
      this._emitter.emit('groupChanged', { groupBy: this._groupBy.slice() });
    }

    getGroupBy() { return this._groupBy.slice(); }

    expandAllGroups() {
      this._groupDefaultExpanded = true;
      this._groupToggled = {};
      this.refresh();
    }

    collapseAllGroups() {
      this._groupDefaultExpanded = false;
      this._groupToggled = {};
      this._currentPage = 0;
      this.refresh();
    }

    _toggleGroup(item) {
      const expanded = !item.expanded;
      this._groupToggled[item.path] = expanded;
      this.refresh();
      this._emitter.emit('groupToggled', {
        field: item.field,
        value: item.value,
        path: item.path,
        expanded,
      });
    }

    /* ---- master-detail rows (rowDetail) ---- */

    /** 행의 디테일 패널을 펼친다. rowDetail 미설정·이미 펼침이면 false. */
    expandRow(row) {
      if (!this.options.rowDetail || !row) return false;
      const id = this._rowId(row);
      if (this._detailExpanded[id]) return false;
      this._detailExpanded[id] = true;
      this.refresh();
      this._emitter.emit('rowExpanded', { data: row });
      return true;
    }

    /** 행의 디테일 패널을 접는다. 펼쳐져 있지 않으면 false. */
    collapseRow(row) {
      if (!this.options.rowDetail || !row) return false;
      const id = this._rowId(row);
      if (!this._detailExpanded[id]) return false;
      delete this._detailExpanded[id];
      this.refresh();
      this._emitter.emit('rowCollapsed', { data: row });
      return true;
    }

    toggleRowDetail(row) {
      if (!this.expandRow(row)) this.collapseRow(row);
    }

    isRowExpanded(row) {
      return !!(row && this._detailExpanded[this._rowId(row)]);
    }

    /* ---- tree API (treeData) ---- */

    /**
     * 노드 펼침/접힘. expanded 생략 시 토글. 상태가 바뀌면 true.
     * beforeNodeToggle(취소 가능) → 갱신 → nodeExpanded/nodeCollapsed 순으로 발생.
     */
    toggleNode(row, expanded) {
      if (!this._treeData || !row || !this._treeInfo) return false;
      const td = this._treeData;
      const id = this._rowId(row);
      const info = this._treeInfo[id];
      if (!info || !info.hasChildren) return false;
      const target = expanded === undefined ? !this._treeExpanded[id] : !!expanded;
      if (target === !!this._treeExpanded[id]) return false;

      /* fetchChildren: 첫 펼침이면 자식을 비동기 로드한 뒤 펼친다 */
      const kids = row[td.childrenField || 'children'];
      if (target && td.fetchChildren && !this._treeLoaded[id] && !(Array.isArray(kids) && kids.length > 0)) {
        return this._loadChildren(row);
      }

      const ev = { data: row, expanded: target, cancel: false };
      this._emitter.emit('beforeNodeToggle', ev);
      if (ev.cancel) return false;
      this._treeExpanded[id] = target;
      this.refresh();
      this._emitter.emit(target ? 'nodeExpanded' : 'nodeCollapsed', { data: row });
      return true;
    }

    /** fetchChildren 비동기 로드: 로딩 표시 → row.children에 부착 → 펼침. 시작하면 true. */
    _loadChildren(row) {
      const td = this._treeData;
      const id = this._rowId(row);
      if (this._treeLoading[id]) return false; /* 이미 로드 중 — 중복 요청 방지 */
      const ev = { data: row, expanded: true, cancel: false };
      this._emitter.emit('beforeNodeToggle', ev);
      if (ev.cancel) return false;
      this._treeLoading[id] = true;
      this.refreshRow(row); /* 토글에 로딩 스피너 표시 */
      Promise.resolve()
        .then(() => td.fetchChildren(row))
        .then(children => {
          if (this._destroyed) return;
          delete this._treeLoading[id];
          this._treeLoaded[id] = true; /* 빈 배열이면 리프로 확정 (토글 제거) */
          row[td.childrenField || 'children'] = Array.isArray(children) ? children : [];
          this._treeExpanded[id] = true;
          this.refresh();
          this._emitter.emit('nodeExpanded', { data: row });
        })
        .catch(err => {
          if (this._destroyed) return;
          delete this._treeLoading[id];
          this.refreshRow(row); /* 스피너 제거 — 접힌 상태 유지, 재시도 가능 */
          console.error('[DataGrid] treeData.fetchChildren failed:', err);
          this._emitter.emit('dataLoadError', { error: err });
        });
      return true;
    }

    expandNode(row) { return this.toggleNode(row, true); }
    collapseNode(row) { return this.toggleNode(row, false); }

    isNodeExpanded(row) {
      return !!(row && this._treeExpanded[this._rowId(row)]);
    }

    /** level 미지정 = 전부 펼침. 지정 시 그 깊이 미만 레벨의 노드만 펼침 (예: 1 = 루트만). */
    expandAllNodes(level) {
      if (!this._treeData || !this._treeInfo) return;
      for (const id in this._treeInfo) {
        const info = this._treeInfo[id];
        if (info.hasChildren) {
          this._treeExpanded[id] = level === undefined || info.level < level;
        }
      }
      this.refresh();
    }

    collapseAllNodes() {
      if (!this._treeData || !this._treeInfo) return;
      for (const id in this._treeInfo) {
        if (this._treeInfo[id].hasChildren) this._treeExpanded[id] = false;
      }
      this.refresh();
    }

    /* ---- tree checkbox (checkboxSelection 컬럼 연동) ----
     * 별도 체크 상태를 두지 않는다: 행 선택(_selection)이 단일 진실이고,
     * 체크박스 표시는 deriveTreeCheckStates로 선택에서 유도한다.
     * 조회는 getSelectedRows(), 일괄 조작은 selectAll()/deselectAll(),
     * 이벤트는 beforeSelectionChange(취소 가능)/selectionChanged를 그대로 쓴다. */

    /** treeData + checkboxSelection 컬럼이 있으면 트리 체크박스 모드. */
    _hasTreeCheckbox() {
      if (!this._treeData) return false;
      return this._hasCheckboxColumn();
    }

    /**
     * 커밋 직전 값 검사 — required를 먼저 보고, 통과하면 column.validator.
     * 오류 메시지 또는 null(통과)을 반환한다.
     * 인라인 편집 · 채우기 드래그 · 붙여넣기/updateRows가 이 하나를 공유하므로
     * required 규칙이 어느 경로로 들어와도 같게 적용된다.
     * validator 자체 예외는 편집을 막지 않는다(기존 규약) — 소비자 코드의 버그로
     * 저장이 잠기면 더 나쁘다.
     */
    _validateCellValue(col, value, row) {
      if (isRequiredViolated(col, value)) {
        return this._t('requiredValue', { column: col.headerName || col.field || '' });
      }
      if (typeof col.validator !== 'function') return null;
      let result;
      try { result = col.validator(value, row); }
      catch (e) {
        console.error(`[DataGrid] validator failed for "${col.field}":`, e);
        return null;
      }
      return validationMessage(result);
    }

    /** checkboxSelection 컬럼이 있는가. 있으면 선택 진입점을 체크박스 셀로 한정한다. */
    _hasCheckboxColumn() {
      return this._columns.some(c => c.checkboxSelection);
    }

    _treeCheckOpts() {
      const td = this._treeData;
      return {
        cascade: td.cascade !== false, /* 기본 켜짐 */
        isDisabled: row => {
          /* 행 잠금은 트리 전용 checkboxDisabled보다 넓은 범위 — 둘 중 하나면 비활성.
           * checkboxDisabled를 흡수하지 않고 겹치는 이유는 기존 설정을 안 깨기 위함. */
          if (this._isRowLocked(row)) return true;
          if (!td.checkboxDisabled) return false;
          try {
            return !!td.checkboxDisabled(row);
          } catch (err) {
            console.error('[DataGrid] checkboxDisabled failed:', err);
            return false;
          }
        },
      };
    }

    /**
     * 트리 모드 체크박스 토글: 캐스케이드 결과를 행 선택으로 커밋한다.
     * 선택에 들어가는 행은 상태가 온전히 true인 행뿐(indeterminate 부모 제외).
     */
    _treeCheckToggle(row, checked) {
      const getId = r => this._rowId(r);
      const opts = this._treeCheckOpts();
      if (opts.isDisabled(row)) return;
      /* indeterminate에서 출발한 클릭은 브라우저가 항상 checked=true를 준다.
       * 체크 가능한 리프가 이미 전부 선택돼 있으면(비활성 리프 때문에 완전
       * 체크 불가) "체크"는 무의미하므로 해제 의도로 해석한다 (BUG-004). */
      if (checked && opts.cascade && subtreeFullyChecked(
        this._treeRoots, row,
        r => !!this._selection[this._rowId(r)],
        opts.isDisabled
      )) {
        checked = false;
      }
      const next = {};
      if (opts.cascade) {
        const states = applyTreeCheck(
          this._treeRoots, getId, this._treeChecked || {}, row, !!checked, opts
        );
        collectTreeNodes(this._treeRoots).forEach(n => {
          if (states[getId(n.row)] === true) next[getId(n.row)] = n.row;
        });
      } else {
        for (const k in this._selection) next[k] = this._selection[k];
        if (checked) next[getId(row)] = row;
        else delete next[getId(row)];
      }
      if (!this._commitSelection(next)) {
        this.refreshRow(row); /* beforeSelectionChange 취소 → 체크박스 원복 */
      }
    }

    /**
     * 헤더 체크박스의 트리 모드 전체 체크/해제: 모든 루트에 캐스케이드를 적용한다.
     * checkboxDisabled 행은 건드리지 않으므로(캐스케이드와 동일 규칙),
     * 해제 시에도 비활성 행의 기존 선택은 유지된다.
     */
    _treeCheckAll(checked) {
      const getId = r => this._rowId(r);
      const opts = this._treeCheckOpts();
      const next = {};
      if (opts.cascade) {
        let states = this._treeChecked || {};
        this._treeRoots.forEach(n => {
          states = applyTreeCheck(this._treeRoots, getId, states, n.row, !!checked, opts);
        });
        collectTreeNodes(this._treeRoots).forEach(n => {
          if (states[getId(n.row)] === true) next[getId(n.row)] = n.row;
        });
      } else {
        /* 비캐스케이드: 노드를 개별 설정 (disabled 행은 기존 선택 유지) */
        collectTreeNodes(this._treeRoots).forEach(n => {
          const id = getId(n.row);
          const selected = opts.isDisabled(n.row) ? !!this._selection[id] : !!checked;
          if (selected) next[id] = n.row;
        });
      }
      if (!this._commitSelection(next)) {
        this._syncSelectionDom(); /* 취소 → 헤더 체크박스 원복 */
      }
    }

    /* ---- pinned top rows ---- */

    /** 헤더 아래 고정 행(표시 전용 — 정렬·필터·선택·편집 대상 아님)을 렌더링한다. */
    _renderPinnedTop() {
      const container = this._pinnedTopEl;
      if (!container) return;
      container.innerHTML = '';
      const rows = this._pinnedTopRows;
      container.hidden = !rows || rows.length === 0;
      if (container.hidden) return;
      rows.forEach(row => {
        const rowEl = el('div', 'dg-row dg-pinned-top-row', container);
        rowEl.setAttribute('role', 'row');
        this._visibleColumns().forEach(col => {
          const cell = el('div', 'dg-cell', rowEl);
          cell.setAttribute('role', 'gridcell');
          cell.dataset.colId = col.colId;
          if (col.align === 'right') cell.classList.add('dg-align-right');
          if (col.align === 'center') cell.classList.add('dg-align-center');
          if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
          if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
          this._applyCellLayout(cell, col.colId);
          if (col.field !== undefined && !col.__rowNumber && !col.__detailToggle && !col.checkboxSelection) {
            this._renderCellValue(cell, col, row);
          }
        });
      });
      container.scrollLeft = this._bodyEl.scrollLeft;
    }

    /** 상단 고정 행을 교체한다 (빈 배열이면 숨김). */
    setPinnedTopRows(rows) {
      this._pinnedTopRows = (rows || []).slice();
      this._renderPinnedTop();
    }

    getPinnedTopRows() { return this._pinnedTopRows.slice(); }

    /* ---- grand total footer ---- */

    _renderGrandTotal() {
      this._footerRowEl.innerHTML = '';
      this._footerCells = {};
      const show = !!this.options.grandTotal && this._aggColumns.length > 0;
      this._footerEl.hidden = !show;
      if (!show) return;

      const rows = this._viewRows;
      const cols = this._visibleColumns();
      let labelColId = null;
      for (let i = 0; i < cols.length; i++) {
        if (!cols[i].checkboxSelection && !cols[i].aggFunc && !cols[i].__rowNumber) { labelColId = cols[i].colId; break; }
      }

      cols.forEach(col => {
        const cell = el('div', 'dg-cell', this._footerRowEl);
        cell.dataset.colId = col.colId;
        if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
        if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
        this._applyCellLayout(cell, col.colId);
        this._footerCells[col.colId] = cell;

        if (col.colId === labelColId) {
          const label = el('span', 'dg-footer-label', cell);
          label.textContent = this._t('groupTotal');
          const count = el('span', 'dg-group-count', cell);
          count.textContent = this._t('rowCount', { count: rows.length.toLocaleString() });
          return;
        }
        if (col.aggFunc && col.field) {
          if (col.align === 'right') cell.classList.add('dg-align-right');
          if (col.align === 'center') cell.classList.add('dg-align-center');
          cell.classList.add('dg-cell-agg');
          const holder = el('span', 'dg-cell-value', cell);
          /* 전체 합계 행도 부모 "행"이 없다 — parent는 null */
          const gtFailures = [];
          const gtValue = aggregateValues(rows, col.field, col.aggFunc,
            { colDef: col, parent: null, failures: gtFailures });
          this._logAggFailures(gtFailures);
          holder.textContent = this._formatAggValue(col, gtValue);
        }
      });
      this._footerEl.scrollLeft = this._bodyEl.scrollLeft;
    }

    /* ---- selection ---- */

    /**
     * 제안된 선택 상태(next: id → row)를 beforeSelectionChange(취소 가능)를
     * 거쳐 적용한다. 취소되면 false를 반환하고 아무것도 바꾸지 않는다.
     */
    _commitSelection(next) {
      const proposed = [];
      for (const id in next) proposed.push(next[id]);
      const evt = { selectedRows: proposed, cancel: false };
      this._emitter.emit('beforeSelectionChange', evt);
      if (evt.cancel) return false;
      this._selection = next;
      this._syncSelectionDom();
      this._emitSelection();
      return true;
    }

    _setRowSelected(row, selected, emit) {
      const mode = this.options.rowSelection;
      if (!mode) return;
      if (this._isRowLocked(row)) return; /* 잠긴 행은 선택 대상이 아니다 */
      const id = this._rowId(row);
      const next = {};
      if (mode !== 'single') {
        for (const k in this._selection) next[k] = this._selection[k];
      }
      if (selected) next[id] = row;
      else delete next[id];
      if (emit) {
        this._commitSelection(next);
      } else {
        this._selection = next;
        this._syncSelectionDom();
      }
    }

    _syncSelectionDom() {
      /* 트리 체크박스 모드: 선택이 어떤 경로로 바뀌었든 3상태를 다시 유도 */
      if (this._treeChecked && this._treeRoots) {
        this._treeChecked = deriveTreeCheckStates(
          this._treeRoots,
          r => this._rowId(r),
          r => !!this._selection[this._rowId(r)]
        );
      }
      for (const idx in this._renderedRows) {
        const rowEl = this._renderedRows[idx];
        const selected = !!this._selection[rowEl.dataset.rowId];
        rowEl.classList.toggle('dg-row-selected', selected);
        const cb = rowEl.querySelector('.dg-checkbox-cell .dg-checkbox');
        if (cb) {
          if (this._treeChecked) {
            const tState = this._treeChecked[rowEl.dataset.rowId];
            cb.checked = tState === true;
            cb.indeterminate = tState === 'indeterminate';
          } else {
            cb.checked = selected;
          }
        }
      }
      if (this._headerSelectAllEl) {
        let count;
        let total;
        if (this._treeCheckboxMode && this._treeRoots) {
          /* 트리 모드: 체크 가능한(비활성 아닌) 행만 기준으로 전체/일부 판단.
           * 캐스케이드에서는 부모 선택이 자식에서 유도되고, 비활성 자손을 가진
           * 부모는 결코 true가 될 수 없으므로 리프만 센다 — 아니면 헤더가
           * indeterminate에 갇혀 전체 해제가 불가능해진다. */
          const opts = this._treeCheckOpts();
          count = 0;
          total = 0;
          const sel = this._selection;
          collectTreeNodes(this._treeRoots).forEach(n => {
            if (opts.isDisabled(n.row)) return;
            if (opts.cascade && n.children.length > 0) return;
            total++;
            if (sel[this._rowId(n.row)]) count++;
          });
        } else {
          count = this.getSelectedRows().length;
          /* 잠긴 행은 selectAll의 대상이 아니므로 분모에서도 뺀다 — 안 빼면
           * 전부 선택해도 count < total이라 헤더가 indeterminate에 갇힌다. */
          total = this._viewRows.filter(r => !this._isRowLocked(r)).length;
        }
        this._headerSelectAllEl.checked = count > 0 && count >= total && total > 0;
        this._headerSelectAllEl.indeterminate = count > 0 && count < total;
      }
    }

    _emitSelection() {
      this._emitter.emit('selectionChanged', { selectedRows: this.getSelectedRows() });
    }

    getSelectedRows() {
      const out = [];
      for (const id in this._selection) out.push(this._selection[id]);
      return out;
    }

    /**
     * 표시 중인 행을 모두 선택한다. **잠긴 행은 제외** — "선택 가능한 것 전부"라는
     * 뜻이기 때문. 반대로 deselectAll()은 잠긴 행도 함께 푼다(해제 경로가 막히면
     * 사용자가 그 상태에 갇힌다 — 트리 3상태 헤더와 같은 규칙).
     */
    selectAll() {
      if (this.options.rowSelection !== 'multiple') return;
      const next = {};
      for (const k in this._selection) next[k] = this._selection[k];
      this._viewRows.forEach(row => {
        if (this._isRowLocked(row)) return;
        next[this._rowId(row)] = row;
      });
      this._commitSelection(next);
    }

    deselectAll() {
      this._commitSelection({});
    }

    /* ---- cell / block selection (cellSelection) ---- */

    _setCellRange(anchor, focus) {
      const prev = this._cellRange;
      this._cellRange = { anchor, focus };
      if (!prev || prev.anchor.r !== anchor.r || prev.anchor.c !== anchor.c) {
        this._setFocusedCell(anchor.r, anchor.c);
      }
      this._syncRangeDom();
      this._emitter.emit('cellRangeChanged', { range: this.getCellRange() });
    }

    _normalizedRange() {
      if (!this._cellRange) return null;
      const a = this._cellRange.anchor;
      const f = this._cellRange.focus;
      return {
        r1: Math.min(a.r, f.r), r2: Math.max(a.r, f.r),
        c1: Math.min(a.c, f.c), c2: Math.max(a.c, f.c),
      };
    }

    _syncRangeDom() {
      const range = this._normalizedRange();
      for (const idx in this._renderedRows) {
        const rowEl = this._renderedRows[idx];
        const r = Number(idx);
        const isGroup = rowEl.classList.contains('dg-group-row');
        for (let j = 0; j < rowEl.children.length; j++) {
          const cell = rowEl.children[j];
          const c = Number(cell.dataset.colIndex);
          const inRange = !!range && !isGroup &&
            r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
          cell.classList.toggle('dg-cell-range', inRange);
        }
      }
      if (this.options.fillHandle) this._positionFillHandle(range);
    }

    /* ---- fill handle (fillHandle — 엑셀식 채우기) ---- */

    /** 범위 우하단 셀에 채우기 핸들을 붙인다. 화면 밖이면 숨긴다. */
    _positionFillHandle(range) {
      if (this._fillHandleEl && this._fillHandleEl.parentNode) {
        this._fillHandleEl.parentNode.removeChild(this._fillHandleEl);
      }
      if (!range) return;
      const rowEl = this._renderedRows[range.r2];
      if (!rowEl || rowEl.classList.contains('dg-group-row') || rowEl.classList.contains('dg-detail-row')) return;
      const cell = rowEl.querySelector(`[data-col-index="${range.c2}"]`);
      if (!cell) return;
      if (!this._fillHandleEl) {
        this._fillHandleEl = document.createElement('div');
        this._fillHandleEl.className = 'dg-fill-handle';
        this._fillHandleEl.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          this._fillDrag = { range: this._normalizedRange(), target: null };
        });
      }
      /* 핸들의 absolute 기준점 — 고정(sticky) 셀은 이미 positioned */
      if (!cell.classList.contains('dg-pinned-left') && !cell.classList.contains('dg-pinned-right')) {
        cell.classList.add('dg-cell-fill-anchor');
      }
      cell.appendChild(this._fillHandleEl);
    }

    /** 드래그 중 채우기 대상 미리보기(세로 확장만 지원). */
    _previewFill(hitR) {
      const d = this._fillDrag;
      if (!d) return;
      const range = d.range;
      d.target = hitR > range.r2 ? { from: range.r2 + 1, to: hitR, dir: 1 }
        : hitR < range.r1 ? { from: hitR, to: range.r1 - 1, dir: -1 }
        : null;
      for (const idx in this._renderedRows) {
        const rowEl = this._renderedRows[idx];
        const r = Number(idx);
        const inRows = !!d.target && r >= d.target.from && r <= d.target.to;
        for (let j = 0; j < rowEl.children.length; j++) {
          const cell = rowEl.children[j];
          const c = Number(cell.dataset.colIndex);
          cell.classList.toggle('dg-cell-fill-preview', inRows && c >= range.c1 && c <= range.c2);
        }
      }
    }

    /** 드래그 종료: 원본 범위의 컬럼별 값으로 대상 행을 채운다 (숫자 등차 외삽/패턴 반복). */
    _applyFillDrag() {
      const d = this._fillDrag;
      if (!d || !d.target) { this._previewFill(-1); return; }
      const range = d.range;
      const target = d.target;
      const cols = this._visibleColumns();
      let updated = 0;
      const rowChangesMap = []; /* [{row, changes}] — 행 단위 rowValueChanged 묶음 */

      for (let c = range.c1; c <= range.c2; c++) {
        const col = cols[c];
        if (!col || !col.editable || !this._editable || col.field === undefined) continue;
        const source = [];
        for (let r = range.r1; r <= range.r2; r++) {
          const srow = this._pageRows[r];
          if (srow && !srow.__group && !srow.__detail) source.push(srow[col.field]);
        }
        if (source.length === 0) continue;
        const count = target.to - target.from + 1;
        const seq = target.dir === 1 ? fillSeries(source, count) : fillSeries(source.slice().reverse(), count);
        for (let i = 0; i < count; i++) {
          const tr = target.dir === 1 ? target.from + i : target.to - i;
          const trow = this._pageRows[tr];
          if (!trow || trow.__group || trow.__detail) continue;
          /* 잠금은 행/셀 단위라 컬럼 루프 밖에서 한 번 볼 수 없다 — 대상 행마다 판정.
           * softDelete 삭제 표시 행 제외도 여기에 함께 들어 있다. */
          if (!this._canEditCell(trow, col)) continue;
          const value = seq[i];
          const oldValue = trow[col.field];
          if (value === oldValue) continue;
          if (this._validateCellValue(col, value, trow)) continue;
          const evt = { data: trow, colDef: col, oldValue, newValue: value, cancel: false };
          this._emitter.emit('beforeCellSave', evt);
          if (evt.cancel) continue;
          trow[col.field] = evt.newValue;
          this._recordUpdate(trow, col.field, oldValue, evt.newValue);
          updated++;
          this._emitter.emit('cellValueChanged', {
            data: trow, colDef: col, oldValue, newValue: evt.newValue,
          });
          let entry = null;
          for (let m = 0; m < rowChangesMap.length; m++) {
            if (rowChangesMap[m].row === trow) { entry = rowChangesMap[m]; break; }
          }
          if (!entry) { entry = { row: trow, changes: {} }; rowChangesMap.push(entry); }
          entry.changes[col.field] = { oldValue, newValue: evt.newValue };
        }
      }
      rowChangesMap.forEach(en => {
        this._emitter.emit('rowValueChanged', { data: en.row, changes: en.changes });
      });

      /* 범위를 채운 영역까지 확장하고 다시 그린다 */
      this._cellRange = {
        anchor: { r: Math.min(range.r1, target.from), c: range.c1 },
        focus: { r: Math.max(range.r2, target.to), c: range.c2 },
      };
      this.refresh();
      this._syncRangeDom();
      if (updated > 0) this._emitter.emit('fillApplied', { updatedCells: updated });
    }

    /** 현재 셀 범위(페이지 좌표 정규화 + 대상 컬럼/리프 행)를 반환. 없으면 null. */
    getCellRange() {
      const range = this._normalizedRange();
      if (!range) return null;
      const cols = this._visibleColumns().slice(range.c1, range.c2 + 1);
      const rows = [];
      for (let r = range.r1; r <= range.r2; r++) {
        const row = this._pageRows[r];
        if (row && !row.__group && !row.__detail) rows.push(row);
      }
      return {
        startRow: range.r1, endRow: range.r2,
        startCol: range.c1, endCol: range.c2,
        columns: cols,
        fields: cols.map(c => c.field).filter(f => f !== undefined),
        rows,
      };
    }

    clearCellRange() {
      this._cellRange = null;
      this._syncRangeDom();
    }

    /* ---- text search (findNext) ---- */

    /**
     * 현재 뷰(표시 순서)에서 text를 포함하는 다음 셀을 찾아 포커스·스크롤한다.
     * 같은 텍스트로 다시 호출하면 다음 매치로 이동하고 끝에서 처음으로 감싼다.
     * 매치가 없으면 null.
     */
    findNext(text) {
      const needle = String(text || '');
      if (!needle) { this._findCursor = null; return null; }
      const fields = this._visibleColumns()
        .map(c => c.field)
        .filter(f => f !== undefined);
      const cursor = this._findCursor && this._findCursor.text === needle.toLowerCase()
        ? this._findCursor
        : null;
      const m = findNextMatch(this._displayRows, fields, needle, cursor);
      if (!m) { this._findCursor = null; return null; }
      this._findCursor = { text: needle.toLowerCase(), index: m.index, col: m.col };
      this.focusCell(m.index, fields[m.col]);
      return { data: this._displayRows[m.index], field: fields[m.col], rowIndex: m.index };
    }

    /* ---- cell / row interaction ---- */

    _cellFromEvent(e) {
      const cellEl = e.target.closest('.dg-cell');
      if (!cellEl || !this._canvasEl.contains(cellEl)) return null;
      const rowEl = cellEl.parentNode;
      const r = Number(rowEl.dataset.rowIndex);
      return {
        cellEl,
        rowEl,
        r,
        c: Number(cellEl.dataset.colIndex),
        row: this._pageRows[r],
        col: this._visibleColumns()[Number(cellEl.dataset.colIndex)],
      };
    }

    _onCellClick(e) {
      const hit = this._cellFromEvent(e);
      if (!hit || !hit.row || hit.row.__detail) return;

      /* 편집 중인 셀 내부 클릭(에디터 상호작용)은 그대로 둔다 — 편집을
       * 재시작하면 에디터 DOM이 교체되어 select 드롭다운 같은 네이티브
       * UI가 열리자마자 닫힌다 (BUG-005) */
      if (this._editing && this._editing.row === hit.row && this._editing.col === hit.col) return;

      if (hit.row.__group) {
        this._toggleGroup(hit.row);
        return;
      }

      if (hit.col && hit.col.__detailToggle) {
        this.toggleRowDetail(hit.row);
        return;
      }

      if (this._treeData && e.target.closest && e.target.closest('.dg-tree-toggle')) {
        this.toggleNode(hit.row);
        return;
      }

      this._setFocusedCell(hit.r, hit.c);

      /* 선택 진입점 —
       * ① 체크박스 셀은 여백을 클릭해도 체크박스를 누른 것으로 친다. 실제 토글은
       *    체크박스의 change 핸들러에 위임한다(트리 3상태 처리를 한 곳에 둔다 — BUG-004).
       * ② checkboxSelection 컬럼이 있으면 다른 셀 클릭은 선택을 바꾸지 않는다.
       *    체크박스가 없는 그리드에서만 행 클릭 선택이 남는다 — 아니면 선택 수단이 사라진다.
       * ③ cellSelection에서도 행 클릭 선택을 끈다. */
      const onCheckbox = !!(e.target.closest && e.target.closest('.dg-checkbox'));
      const cbCell = e.target.closest ? e.target.closest('.dg-checkbox-cell') : null;
      if (cbCell && !onCheckbox) {
        const cb = cbCell.querySelector('.dg-checkbox');
        /* disabled 체크박스는 click()이 활성화 동작을 실행하지 않는다 — 여백도 같이 무시 */
        if (cb) cb.click();
      }

      const mode = this.options.rowSelection;
      if (mode && !this._cellSelection && !onCheckbox && !cbCell && !this._hasCheckboxColumn() &&
          !this._isRowLocked(hit.row)) {
        const id = this._rowId(hit.row);
        if (mode === 'multiple' && e.shiftKey && this._lastClickedViewIndex !== -1) {
          const from = Math.min(this._lastClickedViewIndex, hit.r);
          const to = Math.max(this._lastClickedViewIndex, hit.r);
          const next = {};
          if (e.ctrlKey || e.metaKey) {
            for (const k in this._selection) next[k] = this._selection[k];
          }
          for (let i = from; i <= to; i++) {
            const row = this._pageRows[i];
            if (row && !row.__group && !this._isRowLocked(row)) next[this._rowId(row)] = row;
          }
          this._commitSelection(next);
        } else if (mode === 'multiple' && (e.ctrlKey || e.metaKey)) {
          this._setRowSelected(hit.row, !this._selection[id], true);
          this._lastClickedViewIndex = hit.r;
        } else {
          const wasOnlySelected = this._selection[id] && this.getSelectedRows().length === 1;
          const single = {};
          if (!wasOnlySelected) single[id] = hit.row;
          this._commitSelection(single);
          this._lastClickedViewIndex = hit.r;
        }
      }

      this._emitter.emit('cellClicked', { data: hit.row, colDef: hit.col, value: hit.col && hit.col.field !== undefined ? hit.row[hit.col.field] : undefined });
      this._emitter.emit('rowClicked', { data: hit.row, rowIndex: hit.r });

      /* editOnSingleClick: 클릭 한 번으로 편집 시작 (체크박스 클릭 제외) */
      if (this.options.editOnSingleClick && !e.target.closest('.dg-checkbox')) {
        if (this._popupTriggerActive()) this._openPopupFromCell(hit);
        else if (this._canEditCell(hit.row, hit.col)) this._startEdit(hit);
      }
    }

    /** 더블클릭/Enter/단일클릭이 인라인 대신 팝업을 열어야 하는가. */
    _popupTriggerActive() {
      return !!(this._popupConfig && this._popupConfig.trigger === 'dblclick');
    }

    /**
     * 셀 히트로 팝업을 연다. 그 컬럼이 편집 불가여도 폼에는 다른 편집 가능 필드가
     * 있으므로 컬럼 단위 editable로 막지 않는다 (그리드 잠금은 openEditPopup이 본다).
     */
    _openPopupFromCell(hit) {
      if (!hit || !hit.row || hit.row.__group || hit.row.__detail) return false;
      const field = hit.col && hit.col.field !== undefined ? hit.col.field : null;
      return this.openEditPopup(hit.row, field);
    }

    _onCellDblClick(e) {
      const hit = this._cellFromEvent(e);
      if (!hit || !hit.row || hit.row.__group) return;
      /* 편집 중인 셀 내부 더블클릭도 재시작 금지 (BUG-005 — _onCellClick과 동일) */
      if (this._editing && this._editing.row === hit.row && this._editing.col === hit.col) return;
      this._emitter.emit('cellDoubleClicked', {
        data: hit.row,
        colDef: hit.col,
        value: hit.col && hit.col.field !== undefined ? hit.row[hit.col.field] : undefined,
        rowIndex: hit.r,
      });
      this._emitter.emit('rowDoubleClicked', { data: hit.row, rowIndex: hit.r });
      if (this._popupTriggerActive()) { this._openPopupFromCell(hit); return; }
      if (this._canEditCell(hit.row, hit.col)) this._startEdit(hit);
    }

    _setFocusedCell(r, c) {
      const prev = this._rootEl.querySelector('.dg-cell-focused');
      if (prev) prev.classList.remove('dg-cell-focused');
      this._focusedCell = { r, c };
      const rowEl = this._renderedRows[r];
      if (rowEl) {
        const cell = rowEl.querySelector(`[data-col-index="${c}"]`);
        if (cell) cell.classList.add('dg-cell-focused');
      }
    }

    _onKeyDown(e) {
      if (this._enabled === false) return; /* setEnabled(false) — 입력 잠금 */
      if (this._editing) return; /* editor handles its own keys */

      if (this._focusedCell) {
        const fRow = this._pageRows[this._focusedCell.r];
        const fCol = this._visibleColumns()[this._focusedCell.c];
        if (fRow && !fRow.__group) {
          this._emitter.emit('cellKeyDown', {
            data: fRow, colDef: fCol, rowIndex: this._focusedCell.r, originalEvent: e,
          });
        }
      }

      /* 셀 선택: Shift+화살표로 범위 확장 */
      if (
        this._cellSelection && this._cellRange && e.shiftKey &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        const focus = this._cellRange.focus;
        let nr2 = focus.r + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0);
        let nc2 = focus.c + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0);
        nr2 = clamp(nr2, 0, this._pageRows.length - 1);
        nc2 = clamp(nc2, 0, this._visibleColumns().length - 1);
        this._setCellRange(this._cellRange.anchor, { r: nr2, c: nc2 });
        this._scrollRowIntoView(nr2);
        e.preventDefault();
        return;
      }

      /* undo/redo: Ctrl/⌘+Z, Ctrl/⌘+Shift+Z 또는 Ctrl/⌘+Y */
      if (this._undoRedo && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) this.redo(); else this.undo();
          e.preventDefault();
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          this.redo();
          e.preventDefault();
          return;
        }
      }

      /* 클립보드: Ctrl/⌘+C 복사(선택 행 또는 포커스 셀), Ctrl/⌘+V 붙여넣기 */
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const tsv = this._selectionTsv();
        if (tsv !== null) {
          this._writeClipboard(tsv);
          e.preventDefault();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        /* 1차 경로는 root의 paste 이벤트(_bindEvents). 브라우저가 비편집 요소에
         * paste를 발화하지 않는 경우를 위해 잠시 뒤 clipboard API로 폴백한다.
         * (_pasteCount 비교로 이중 붙여넣기를 방지) */
        const seqBefore = this._pasteCount;
        if (this._focusedCell && navigator.clipboard && navigator.clipboard.readText) {
          setTimeout(() => {
            if (this._pasteCount !== seqBefore || this._destroyed) return;
            navigator.clipboard.readText()
              .then(text => { if (text) this.pasteTsv(text); })
              .catch(() => { /* 권한 거부 — 붙여넣기 불가 환경 */ });
          }, 80);
        }
        return;
      }

      if (!this._focusedCell) return;
      let r = this._focusedCell.r;
      let c = this._focusedCell.c;
      const maxR = this._pageRows.length - 1;
      const maxC = this._visibleColumns().length - 1;
      let handled = true;

      switch (e.key) {
        case 'ArrowUp':
          r = Math.max(0, r - 1);
          while (r > 0 && this._pageRows[r] && this._pageRows[r].__detail) r--;
          break;
        case 'ArrowDown':
          r = Math.min(maxR, r + 1);
          while (r < maxR && this._pageRows[r] && this._pageRows[r].__detail) r++;
          break;
        case 'ArrowLeft': c = Math.max(0, c - 1); break;
        case 'ArrowRight': c = Math.min(maxC, c + 1); break;
        case 'Enter': {
          const row = this._pageRows[r];
          if (row && row.__group) { this._toggleGroup(row); break; }
          const col = this._visibleColumns()[c];
          if (this._popupTriggerActive()) {
            this._openPopupFromCell({ row, col, r, c });
          } else if (this._canEditCell(row, col)) {
            const rowEl = this._renderedRows[r];
            const cellEl = rowEl && rowEl.querySelector(`[data-col-index="${c}"]`);
            if (cellEl) this._startEdit({ cellEl, r, c, row, col });
          }
          break;
        }
        case ' ': {
          const srow = this._pageRows[r];
          if (srow && !srow.__group && this.options.rowSelection) {
            this._setRowSelected(srow, !this._selection[this._rowId(srow)], true);
          }
          break;
        }
        default: handled = false;
      }

      if (handled) {
        e.preventDefault();
        if (r !== this._focusedCell.r || c !== this._focusedCell.c) {
          this._setFocusedCell(r, c);
          this._scrollRowIntoView(r);
          /* 셀 선택 모드에서 포커스 이동은 범위를 단일 셀로 리셋 */
          if (this._cellSelection) this._setCellRange({ r, c }, { r, c });
        }
      }
    }

    _scrollRowIntoView(r) {
      const top = this._rowTop(r);
      const item = this._pageRows[r];
      const h = this._rowHeights
        ? this._rowHeights[r]
        : item && item.__detail ? this._detailHeight() : this._rowHeight;
      const bottom = top + h;
      if (top < this._bodyEl.scrollTop) this._bodyEl.scrollTop = top;
      else if (bottom > this._bodyEl.scrollTop + this._bodyEl.clientHeight) {
        this._bodyEl.scrollTop = bottom - this._bodyEl.clientHeight;
      }
    }

    /* ---- programmatic navigation ---- */

    /** 표시 리스트 인덱스의 행이 다른 페이지면 이동하고, 페이지 내 인덱스를 반환. 범위 밖이면 -1. */
    _goToDisplayIndex(displayIndex) {
      if (displayIndex < 0 || displayIndex >= this._displayRows.length) return -1;
      if (this._pagination) {
        const page = Math.floor(displayIndex / this._pageSize);
        if (page !== this._currentPage) this.setPage(page);
        return displayIndex - this._currentPage * this._pageSize;
      }
      return displayIndex;
    }

    /**
     * 표시 리스트(그룹 헤더 포함) 기준 rowIndex의 셀에 포커스를 준다.
     * field 생략 시 첫 번째 콘텐츠 컬럼. 페이지 이동·스크롤을 포함하며 성공 여부를 반환.
     */
    focusCell(rowIndex, field) {
      const cols = this._visibleColumns();
      let cIdx = -1;
      if (field === undefined) {
        cIdx = cols.findIndex(c => c.field !== undefined);
      } else {
        cIdx = cols.findIndex(c => c.field === field);
      }
      if (cIdx === -1) return false;
      const pageIndex = this._goToDisplayIndex(rowIndex);
      if (pageIndex === -1) return false;
      this._scrollRowIntoView(pageIndex);
      this._renderVisibleRows();
      this._setFocusedCell(pageIndex, cIdx);
      this.ensureColumnVisible(cols[cIdx].colId);
      return true;
    }

    /** 행 객체가 현재 뷰에 보이도록 페이지 이동 + 세로 스크롤. 뷰에 없으면 false. */
    ensureRowVisible(row) {
      const displayIndex = this._displayRows.indexOf(row);
      const pageIndex = this._goToDisplayIndex(displayIndex);
      if (pageIndex === -1) return false;
      this._scrollRowIntoView(pageIndex);
      this._renderVisibleRows();
      return true;
    }

    /** 컬럼이 고정 컬럼에 가리지 않고 보이도록 가로 스크롤. 없거나 숨김이면 false. */
    ensureColumnVisible(colId) {
      const cols = this._visibleColumns();
      let target = null;
      let x = 0;
      for (let i = 0; i < cols.length; i++) {
        if (cols[i].colId === colId || cols[i].field === colId) { target = cols[i]; break; }
        x += this._computedWidths[cols[i].colId] || 0;
      }
      if (!target) return false;
      if (target.pinned) return true; /* 고정 컬럼은 항상 보인다 */
      const w = this._computedWidths[target.colId] || 0;
      let pinnedLeft = 0;
      let pinnedRight = 0;
      cols.forEach(c => {
        if (c.pinned === 'left') pinnedLeft += this._computedWidths[c.colId] || 0;
        if (c.pinned === 'right') pinnedRight += this._computedWidths[c.colId] || 0;
      });
      const viewLeft = this._bodyEl.scrollLeft + pinnedLeft;
      const viewRight = this._bodyEl.scrollLeft + this._bodyEl.clientWidth - pinnedRight;
      if (x < viewLeft) this._bodyEl.scrollLeft = x - pinnedLeft;
      else if (x + w > viewRight) this._bodyEl.scrollLeft = x + w - this._bodyEl.clientWidth + pinnedRight;
      return true;
    }

    /* ---- editing ---- */

    /**
     * 에디터 위젯을 container 안에 만든다. **인라인 셀 편집과 팝업 폼이 공유하는
     * 유일한 위젯 생성 경로** — 새 에디터 종류는 여기에만 추가한다.
     *
     * 라이프사이클(언제 커밋할지, blur를 어떻게 볼지)은 호출자 몫이다. 인라인은
     * blur=커밋 + Enter/Tab 인접 셀 이동인 반면, 팝업 폼은 필드가 동시에 여러 개
     * 살아 있고 Save에서 일괄 커밋하므로 규칙이 다르다.
     *
     * @param {HTMLElement} container 위젯을 담을 요소 (내용은 호출자가 비워둔다)
     * @param {object} col 정규화된 컬럼 정의 (editor/editorOptions/editorSearch를 읽는다)
     * @param {*} value 현재 값
     * @param {object} row 행 객체 (커스텀 에디터·editorSearch.fetch에 전달)
     * @param {object} [hooks]
     *   `editingClass` container에 붙일 편집 상태 클래스 ·
     *   `flipPanel(panel)` 셀 앵커 패널 위치 결정(팝업은 no-op) ·
     *   `onInput()` 사용자 입력 발생 · `onPick()` 옵션 확정 선택 ·
     *   `onChange()` 값이 바뀌었지만 **아직 확정은 아님** (검색형 multiselect의 항목
     *   토글 — onPick으로 통지하면 인라인이 첫 선택에서 커밋하고 닫힌다) ·
     *   `isClosed()` 늦게 도착한 비동기 콜백 판별 · `autoFocus` (기본 true)
     * @returns {object|null} `{ editorType, input, getValue, invalidEl, destroy }`.
     *   커스텀 에디터 init이 실패하면 null (호출자가 폴백을 결정).
     */
    _createEditorWidget(container, col, value, row, hooks) {
      const h = hooks || {};
      const flipPanelUp = h.flipPanel || (() => {});
      const onInput = h.onInput || (() => {});
      const onPick = h.onPick || (() => {});
      const onChange = h.onChange || (() => {});
      const isClosed = h.isClosed || (() => false);
      const autoFocus = h.autoFocus !== false;
      /* 셀 앵커 패널을 "항상 펼친 패널"이 아니라 "접혔다 펴지는 콤보박스"로 만든다.
       * 셀에서는 패널 자체가 에디터고 고르면 커밋+닫힘이라 접을 필요가 없지만,
       * 폼에서는 위젯이 계속 살아 있어서 접히지 않으면 ① 목록이 늘 펼쳐져 다른
       * 필드를 밀어내고 ② 고른 값을 보여줄 자리가 없다. */
      const collapsible = !!h.collapsible;
      const editingClass = h.editingClass;
      const markEditing = () => { if (editingClass) container.classList.add(editingClass); };
      const unmarkEditing = () => { if (editingClass) container.classList.remove(editingClass); };
      const cellEl = container; /* 아래 위젯 코드가 쓰는 이름 (인라인 시절 그대로) */

      const isCustom = col.editor && typeof col.editor === 'object';
      const editorType = isCustom ? 'custom' : col.editor || defaultEditorType(col);
      let input = null;
      let invalidEl; /* dg-invalid 표시 대상 */
      let getValue;
      let cleanup = null;

      if (isCustom) {
        try {
          col.editor.init(cellEl, value, row, col);
        } catch (e) {
          console.error(`[DataGrid] custom editor init failed for "${col.field}":`, e);
          return null;
        }
        markEditing();
        getValue = () => {
          try { return col.editor.getValue(); }
          catch (e) {
            console.error(`[DataGrid] custom editor getValue failed for "${col.field}":`, e);
            return value;
          }
        };
        cleanup = () => {
          unmarkEditing();
          if (col.editor.destroy) {
            try { col.editor.destroy(); }
            catch (e) { console.error('[DataGrid] custom editor destroy failed:', e); }
          }
        };
        invalidEl = cellEl;
        const focusable = cellEl.querySelector('input, select, textarea, [tabindex]');
        if (focusable && autoFocus) focusable.focus();
      } else if (editorType === 'checkbox') {
        /* 인라인 체크박스 — 셀 자체가 편집 프레임(dg-cell-editing).
         * editorOptions: { checked, unchecked }로 'Y'/'N', 0/1 같은 표기 매핑 지원. */
        const cbOpts = col.editorOptions && typeof col.editorOptions === 'object' &&
          !Array.isArray(col.editorOptions) ? col.editorOptions : null;
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'dg-checkbox';
        input.checked = isCheckedValue(value, cbOpts);
        markEditing();
        cleanup = unmarkEditing;
        cellEl.appendChild(input);
        if (autoFocus) input.focus();
        getValue = () => {
          if (cbOpts && 'checked' in cbOpts) {
            return input.checked ? cbOpts.checked : cbOpts.unchecked;
          }
          return input.checked;
        };
        invalidEl = cellEl;
      } else if (editorType === 'radio') {
        /* 라디오 패널 — multiselect와 같은 셀 앵커 패널에서 단일 선택 */
        const radioOptions = normalizeEditorOptions(col.editorOptions);
        const radioWrap = el('div', 'dg-editor-radio', cellEl);
        radioWrap.tabIndex = -1; /* 패널 배경 클릭 시에도 포커스가 셀 안에 머물게 */
        const radioName = `dg-radio-${editorSeq++}`;
        radioOptions.forEach(o => {
          const lab = el('label', '', radioWrap);
          const rb = document.createElement('input');
          rb.type = 'radio';
          rb.name = radioName;
          rb.className = 'dg-radio';
          rb.__dgValue = o.value;
          rb.checked = o.value === value ||
            (value !== null && value !== undefined && String(o.value) === String(value));
          lab.appendChild(rb);
          lab.appendChild(document.createTextNode(o.label));
        });
        markEditing();
        flipPanelUp(radioWrap);
        cleanup = unmarkEditing;
        const checkedRadio = radioWrap.querySelector('input:checked') || radioWrap.querySelector('input');
        if (checkedRadio && autoFocus) checkedRadio.focus();
        getValue = () => {
          const picked = radioWrap.querySelector('input:checked');
          return picked ? picked.__dgValue : value; /* 아무것도 안 고르면 이전 값 유지 */
        };
        invalidEl = cellEl;
      } else if (editorType === 'multiselect' && !col.editorSearch) {
        /* 체크리스트 패널 — 값은 배열, editorOptions 순서로 커밋.
         * editorSearch가 있으면 아래 검색형 분기가 맡는다 — 이 분기가 위에 있으므로
         * 여기서 걸러내지 않으면 옵션이 조용히 무시된다(v2.25 이전의 동작). */
        const msOptions = normalizeEditorOptions(col.editorOptions);
        const msCurrent = normalizeMultiValue(value);
        const panel = el('div', 'dg-editor-multiselect', cellEl);
        panel.tabIndex = -1; /* 패널 배경 클릭 시에도 포커스가 셀 안에 머물게 */
        msOptions.forEach(o => {
          const lab = el('label', '', panel);
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'dg-checkbox';
          cb.__dgValue = o.value;
          cb.checked = msCurrent.includes(o.value) ||
            msCurrent.some(v => v !== null && v !== undefined && String(v) === String(o.value));
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(o.label));
        });
        markEditing();
        flipPanelUp(panel);
        cleanup = unmarkEditing;
        const firstCb = panel.querySelector('input');
        if (autoFocus) (firstCb || panel).focus();
        getValue = () => {
          const out = [];
          panel.querySelectorAll('input').forEach(cb => {
            if (cb.checked) out.push(cb.__dgValue);
          });
          /* 원본이 콤마 문자열이면 문자열로 되돌려 커밋한다 — 편집 한 번에
           * 컬럼의 값 타입이 바뀌지 않게 (value는 편집 진입 시의 원본) */
          return denormalizeMultiValue(out, value);
        };
        invalidEl = cellEl;
      } else if ((editorType === 'select' || editorType === 'multiselect') && col.editorSearch) {
        /* 검색형 select / multiselect — 검색 입력 + 옵션 목록 패널.
         * editorSearch: true      → 정적 editorOptions를 로컬 필터
         * editorSearch: { fetch } → 질의마다 비동기 로드 (lazy 검색)
         *
         * 두 위젯은 질의 실행·디바운스·최신 질의 판별·label 캐시·위치 결정·폼 접힘을
         * 전부 공유하고, 갈리는 곳(선택 상태·클릭 동작·칩 줄·Enter)만 multi로 나눈다. */
        const multi = editorType === 'multiselect';
        const ssCfg = col.editorSearch === true ? {} : col.editorSearch;
        const ssFetch = typeof ssCfg.fetch === 'function' ? ssCfg.fetch : null;
        const ssDebounce = ssCfg.debounce !== undefined ? ssCfg.debounce : 250;
        const ssMinLength = ssCfg.minLength || 0;
        let ssPicked = value; /* 옵션을 고르기 전에는 원래 값 유지 → 무변경이면 미커밋 */
        /* 다중 선택의 진실은 DOM이 아니라 이 배열이다 — 검색형은 필터로 가려진 항목이
         * 목록에서 사라지고(lazy면 질의마다 통째로 갈린다), 체크박스를 순회해 값을
         * 모으는 비검색 multiselect 방식을 쓰면 안 보이는 선택이 조용히 유실된다. */
        let msPicked = multi ? normalizeMultiValue(value).slice() : [];
        let ssShown = [];
        let ssActive = -1;
        let ssSeq = 0;
        let ssTimer = null;
        const ssPanel = el('div', `dg-editor-searchselect${multi ? ' dg-searchselect-multi' : ''}`, cellEl);
        ssPanel.tabIndex = -1;
        /* 칩 줄 — 고른 값을 상시 보여준다. 목록보다 위에 두어 필터·질의로 목록이
         * 바뀌어도 "지금 무엇이 골라져 있는지"가 항상 같은 자리에 남는다. */
        const msChips = multi ? el('div', 'dg-searchselect-chips', ssPanel) : null;
        const ssInput = document.createElement('input');
        ssInput.type = 'text';
        ssInput.className = 'dg-searchselect-input';
        ssInput.placeholder = ssCfg.placeholder !== undefined
          ? ssCfg.placeholder : this._t('searchPlaceholder');
        ssPanel.appendChild(ssInput);
        const ssList = el('div', 'dg-searchselect-list', ssPanel);

        /* 값 → 표시 라벨. 정적 옵션에 없으면 lazy 검색으로 알게 된 캐시를 본다
         * (짝꿍 렌더러 renderers.searchselect와 같은 출처). */
        const ssLabelOf = v => {
          if (v === null || v === undefined || v === '') return '';
          const fromOptions = lookupOptionLabel(col.editorOptions, v);
          if (fromOptions !== null) return fromOptions;
          const cached = this._searchSelectLabels && this._searchSelectLabels[col.colId];
          const hit = cachedOptionLabel(cached, v);
          return hit !== null ? hit : String(v);
        };
        /* 콤보박스 모드: 접힘이 기본이고 입력창은 "검색어"가 아니라 "현재 값"을 보여준다 */
        const ssOpen = () => {
          if (!collapsible) return;
          ssPanel.classList.add('dg-searchselect-open');
          ssFlipList();
        };
        /* 폼 안의 목록은 스크롤 컨테이너(.dg-popup-body)에 잘린다 — 아래 공간이
         * 모자라고 위가 더 넉넉하면 위로 편다 (셀 앵커 패널의 flipPanel과 같은 방침).
         * 칩 줄이 있는 multiselect는 컨트롤이 더 높아 목록이 아래로 밀리기 쉽다. */
        const ssFlipList = () => {
          if (!collapsible) return;
          /* 자연 높이로 되돌려 놓고 재야 이전 측정에 갇히지 않는다 */
          ssPanel.classList.remove('dg-searchselect-up');
          ssList.style.maxHeight = '';
          const listH = ssList.offsetHeight || 0;
          if (!listH) return; /* 접혀 있으면 잴 것이 없다 (열 때 다시 부른다) */
          const bounds = clippingRect(ssPanel);
          const pr = ssPanel.getBoundingClientRect();
          const below = bounds.bottom - pr.bottom - 4;
          const above = pr.top - bounds.top - 4;
          const up = below < listH && above > below;
          if (up) ssPanel.classList.add('dg-searchselect-up');
          /* 어느 쪽으로도 다 못 담으면 남은 공간에 맞춰 줄이고 목록 안에서 스크롤한다 —
           * 잘려서 아예 안 보이는 것보다 짧아도 보이는 편이 낫다. */
          const room = up ? above : below;
          if (room < listH) ssList.style.maxHeight = `${Math.max(room, 72)}px`;
        };
        const ssCollapse = () => {
          if (!collapsible) return;
          ssPanel.classList.remove('dg-searchselect-open');
          /* 고르지 않고 친 검색어는 되돌린다. 단일 값은 입력창이 곧 값 표시이지만,
           * 다중 값은 칩 줄이 그 역할을 하므로 입력창에 남길 것이 없다 → 비운다. */
          ssInput.value = multi ? '' : ssLabelOf(ssPicked);
        };
        if (collapsible) {
          ssPanel.classList.add('dg-searchselect-collapsible');
          ssInput.value = multi ? '' : ssLabelOf(value);
          /* 목록은 **사용자가 조작할 때만** 편다. focus에 걸면 팝업이 열리면서
           * 주는 프로그래매틱 포커스만으로 드롭다운이 펼쳐진다. */
          ssInput.addEventListener('focus', () => { ssInput.select(); });
          ssInput.addEventListener('click', () => {
            /* 열 때는 전체 목록을 보여준다 (입력창의 라벨이 검색어로 재해석되지 않게) */
            if (!ssPanel.classList.contains('dg-searchselect-open')) ssRunQuery('');
            ssOpen();
          });
          /* 패널 밖으로 포커스가 나가면 접는다 (패널 안 이동은 유지) */
          ssPanel.addEventListener('focusout', e => {
            if (e.relatedTarget && ssPanel.contains(e.relatedTarget)) return;
            ssCollapse();
          });
          /* 목록이 열려 있을 때의 Esc는 목록만 닫는다 — 폼까지 닫히면 안 된다 */
          ssPanel.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (!ssPanel.classList.contains('dg-searchselect-open')) return;
            e.stopPropagation();
            ssCollapse();
          });
        }
        /* 옵션 mousedown이 검색 입력의 포커스를 빼앗으면 focusout 커밋이
         * 클릭보다 먼저 달린다 — 포커스 이동 자체를 막는다 */
        ssList.addEventListener('mousedown', e => { e.preventDefault(); });
        if (multi) {
          /* 칩 × 도 같은 이유로 포커스를 뺏으면 안 된다 (인라인은 focusout = 커밋) */
          msChips.addEventListener('mousedown', e => { e.preventDefault(); });
          msChips.addEventListener('click', e => {
            /* 커밋 후 캔버스로 버블돼 editOnSingleClick이 편집을 재시작하는 경로 차단
             * (BUG-005 계열 — 목록 클릭과 같은 이유) */
            e.stopPropagation();
            const rm = e.target.closest('.dg-searchselect-chip-remove');
            if (!rm) return;
            msToggle({ value: rm.__dgValue });
          });
        }
        /* lazy로 알게 된 value→label을 컬럼별로 기억 — 짝꿍 렌더러가
         * 정적 editorOptions에 없는 값도 label로 표시할 수 있게 */
        const ssCacheLabel = o => {
          if (!ssFetch) return;
          const all = this._searchSelectLabels || (this._searchSelectLabels = {});
          const bucket = all[col.colId] || (all[col.colId] = {});
          bucket[String(o.value)] = o.label;
        };
        /* 칩 줄 다시 그리기. 선택이 없으면 줄 자체를 감춘다(빈 여백이 남지 않게). */
        const msRenderChips = () => {
          if (!multi) return;
          msChips.innerHTML = '';
          msChips.hidden = msPicked.length === 0;
          msPicked.forEach(v => {
            const label = ssLabelOf(v);
            const chip = el('span', 'dg-tag dg-tag-plain dg-searchselect-chip', msChips);
            chip.appendChild(document.createTextNode(label));
            const rm = el('button', 'dg-searchselect-chip-remove', chip);
            rm.type = 'button';
            rm.tabIndex = -1;
            rm.__dgValue = v;
            rm.textContent = '×';
            rm.setAttribute('aria-label', this._t('removeChipLabel', { label }));
          });
        };
        /* 목록을 다시 그리지 않고 체크 표시만 맞춘다 (질의 결과는 그대로 두고 토글) */
        const msSyncChecks = () => {
          if (!multi) return;
          ssList.querySelectorAll('.dg-searchselect-option').forEach((optEl, i) => {
            const cb = optEl.querySelector('input');
            if (cb && ssShown[i]) cb.checked = multiValueIndex(msPicked, ssShown[i].value) !== -1;
          });
        };
        /* 선택 토글 — 상태 갱신 → 칩/체크 표시 → 소비자 통지.
         * **인라인의 onPick(= 즉시 커밋 + 닫기)은 부르지 않는다.** 여러 개를 골라야
         * 하는 위젯이라 첫 선택에서 편집이 끝나 버린다 (커밋은 blur/Enter/Tab 담당). */
        const msToggle = o => {
          const next = toggleMultiValue(msPicked, o.value);
          /* label 캐시는 **추가할 때만** 갱신한다 — 해제 경로의 o에는 목록에서 온
           * 진짜 label이 없다(칩 × 버튼이 출처). 그대로 캐시에 쓰면 오염된다. */
          if (next.length > msPicked.length) ssCacheLabel(o);
          msPicked = next;
          msRenderChips();
          msSyncChecks();
          flipPanelUp(ssPanel);
          ssFlipList();
          onChange();
        };
        /** 키보드 탐색 커서를 없앤다 (마우스로 고른 뒤 — 위 click 핸들러의 주석 참조) */
        const ssClearActive = () => {
          ssActive = -1;
          ssList.querySelectorAll('.dg-searchselect-option.dg-active')
            .forEach(optEl => optEl.classList.remove('dg-active'));
        };
        const ssSetActive = i => {
          if (!ssShown.length) return;
          ssActive = clamp(i, 0, ssShown.length - 1);
          const els = ssList.querySelectorAll('.dg-searchselect-option');
          els.forEach((optEl, j) => {
            optEl.classList.toggle('dg-active', j === ssActive);
          });
          if (els[ssActive] && els[ssActive].scrollIntoView) {
            els[ssActive].scrollIntoView({ block: 'nearest' });
          }
        };
        const ssRenderMsg = (text, cls) => {
          ssShown = [];
          ssActive = -1;
          ssList.innerHTML = '';
          el('div', `dg-searchselect-msg${cls ? ` ${cls}` : ''}`, ssList).textContent = text;
          flipPanelUp(ssPanel);
          ssFlipList();
        };
        /* autoFirst: 검색 결과면 첫 항목을 활성으로 (빈 질의의 초기 목록은
         * 현재 값 항목만 활성 — Enter가 엉뚱한 첫 옵션을 고르지 않게) */
        const ssRenderList = (opts, autoFirst) => {
          ssShown = opts;
          ssActive = -1;
          ssList.innerHTML = '';
          if (!opts.length) { ssRenderMsg(this._t('noResults')); return; }
          opts.forEach((o, i) => {
            const optEl = el('div', 'dg-searchselect-option', ssList);
            optEl.dataset.idx = i;
            if (multi) {
              optEl.classList.add('dg-searchselect-multi-option');
              const cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.className = 'dg-checkbox';
              /* 표시 전용 — disabled를 쓰면 그 자리가 클릭 사각지대가 된다(BUG-006).
               * pointer-events 차단으로 클릭은 항상 옵션 div가 받는다 → 네이티브
               * change와 우리 click 핸들러가 겹쳐 이중 토글되는 경로도 사라진다. */
              cb.tabIndex = -1;
              cb.checked = multiValueIndex(msPicked, o.value) !== -1;
              optEl.appendChild(cb);
              optEl.appendChild(document.createTextNode(o.label));
              return; /* 다중 선택에는 "현재 값" 하나가 없다 → autoFirst만 적용 */
            }
            optEl.textContent = o.label;
            const isCurrent = o.value === ssPicked ||
              (ssPicked !== null && ssPicked !== undefined && String(o.value) === String(ssPicked));
            if (isCurrent) ssActive = i;
          });
          if (ssActive === -1 && autoFirst) ssActive = 0;
          if (ssActive !== -1) ssSetActive(ssActive);
          /* lazy 검색에서 **이미 고른 값의 label을 뒤늦게 알게 되는** 경우 —
           * 편집 진입 시점엔 정적 목록도 캐시도 없어 칩이 코드로 뜨지만, 첫 질의
           * 결과에 그 값이 들어 있으면 이름을 알 수 있다. 캐시에 넣고 칩을 다시 그린다
           * (셀 표시도 같은 캐시를 보므로 커밋 후 셀까지 이름으로 바뀐다). */
          if (multi && ssFetch) {
            let learned = false;
            opts.forEach(o => {
              if (multiValueIndex(msPicked, o.value) === -1) return;
              ssCacheLabel(o);
              learned = true;
            });
            if (learned) msRenderChips();
          }
          flipPanelUp(ssPanel);
          ssFlipList();
        };
        const ssRunQuery = q => {
          if (!ssFetch) {
            ssRenderList(filterEditorOptions(col.editorOptions, q), q.trim() !== '');
            return;
          }
          if (q.length < ssMinLength) {
            ssRenderMsg(this._t('searchMinLength', { count: ssMinLength }));
            return;
          }
          const seq = ++ssSeq;
          ssRenderMsg(this._t('loading'), 'dg-loading');
          let promised;
          try { promised = ssFetch(q, row, col); }
          catch (e) { promised = Promise.reject(e); }
          Promise.resolve(promised).then(opts => {
            if (isClosed() || seq !== ssSeq) return; /* 닫혔거나 더 새 질의가 있음 */
            ssRenderList(normalizeEditorOptions(opts), q.trim() !== '');
          }).catch(err => {
            if (isClosed() || seq !== ssSeq) return;
            console.error(`[DataGrid] editorSearch.fetch failed for "${col.field}":`, err);
            ssRenderMsg(this._t('loadFailed'), 'dg-error');
          });
        };
        ssList.addEventListener('click', e => {
          /* 커밋으로 에디터가 닫힌 뒤 캔버스로 버블되면 editOnSingleClick이
           * 편집을 재시작한다 (BUG-005 계열) — 여기서 전파를 끊는다 */
          e.stopPropagation();
          const optEl = e.target.closest('.dg-searchselect-option');
          if (!optEl) return;
          const o = ssShown[Number(optEl.dataset.idx)];
          if (!o) return;
          if (multi) {
            /* 목록은 열어 둔다 — 연달아 더 고를 수 있어야 한다.
             * 단 **키보드 커서는 지운다**: 마우스로 고르는 것은 끝난 동작이라,
             * 커서를 그 항목에 남겨 두면 바로 뒤의 Enter가 방금 고른 것을 도로 해제한다. */
            msToggle(o);
            ssClearActive();
            return;
          }
          ssPicked = o.value;
          ssCacheLabel(o);
          /* 콤보박스 모드에서는 고른 값을 입력창에 남기고 목록을 접는다.
           * (인라인은 onPick이 즉시 커밋하며 에디터째 사라지므로 표시가 불필요) */
          if (collapsible) { ssInput.value = o.label; ssCollapse(); }
          onPick();
        });
        ssInput.addEventListener('input', () => {
          onInput();
          ssOpen(); /* 타이핑하면 목록을 편다 */
          const q = ssInput.value;
          if (ssTimer) clearTimeout(ssTimer);
          if (!ssFetch) { ssRunQuery(q); return; }
          ssTimer = setTimeout(() => { ssRunQuery(q); }, ssDebounce);
        });
        ssInput.addEventListener('keydown', e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); ssOpen(); ssSetActive(ssActive + 1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); ssSetActive(ssActive - 1); }
          else if (e.key === 'Enter') {
            /* Enter의 의미는 **지금 목록이 보이는가**로 갈린다 — 커서(ssActive)가
             * 살아 있는지만 보면, 마우스로 고른 직후나 목록이 접힌 폼에서 안 보이는
             * 항목을 토글해 버린다. 판정은 순수 함수에 몰아 두고 테스트한다. */
            const action = resolveSearchEnterAction({
              listOpen: !collapsible || ssPanel.classList.contains('dg-searchselect-open'),
              activeIndex: ssShown[ssActive] ? ssActive : -1,
              multi,
              collapsible,
            });
            if (action === 'bubble') return; /* 인라인이면 셀 커밋, 폼이면 저장 */
            if (action === 'close') {
              e.stopPropagation(); e.preventDefault();
              ssCollapse();
              return;
            }
            if (action === 'toggle') {
              e.stopPropagation(); e.preventDefault();
              msToggle(ssShown[ssActive]);
              return;
            }
            /* pick — 선택만 반영 */
            ssPicked = ssShown[ssActive].value;
            ssCacheLabel(ssShown[ssActive]);
            if (collapsible) {
              /* 폼에서는 Enter가 저장까지 가면 안 된다 — 목록을 접는 데서 멈춘다 */
              e.stopPropagation();
              e.preventDefault();
              ssInput.value = ssShown[ssActive].label;
              ssCollapse();
              onPick();
            }
            /* 인라인은 가로채지 않는다 — 셀의 공용 Enter 핸들러가 커밋과
             * enterMovesDown(다음 행으로 이동)까지 처리해야 한다 */
          }
        });
        markEditing();
        msRenderChips();
        ssRunQuery('');
        flipPanelUp(ssPanel);
        cleanup = () => {
          if (ssTimer) clearTimeout(ssTimer);
          unmarkEditing();
        };
        if (autoFocus) ssInput.focus();
        /* 다중 값은 원본이 쓰던 표현(배열/콤마 문자열)으로 되돌려 커밋한다 —
         * 편집 한 번으로 컬럼의 값 타입이 바뀌지 않게 (비검색 multiselect와 동일 규약) */
        getValue = multi ? () => denormalizeMultiValue(msPicked, value) : () => ssPicked;
        invalidEl = cellEl;
      } else {
        if (editorType === 'select') {
          input = document.createElement('select');
          const selectOptions = normalizeEditorOptions(col.editorOptions);
          selectOptions.forEach(o => {
            const opt = document.createElement('option');
            opt.value = String(o.value);
            opt.textContent = o.label;
            input.appendChild(opt);
          });
          input.value = value === null || value === undefined ? '' : String(value);
          /* select.value는 항상 문자열 — 원본 옵션에서 찾아 value의 타입을 보존한다 */
          getValue = () => {
            const picked = input.value;
            for (let i = 0; i < selectOptions.length; i++) {
              if (String(selectOptions[i].value) === picked) return selectOptions[i].value;
            }
            return picked;
          };
        } else if (editorType === 'date' || editorType === 'datetime') {
          /* 네이티브 date/datetime-local 입력 — 브라우저 기본 날짜 피커를 그대로 쓴다.
           * 값은 로컬 시각 기준 'yyyy-MM-dd(THH:mm)' 문자열이고, 커밋할 때
           * 원본 값의 타입(Date/타임스탬프/문자열)으로 되돌린다. */
          const withTime = editorType === 'datetime';
          const dateOpts = dateEditorOptions(col);
          input = document.createElement('input');
          input.type = withTime ? 'datetime-local' : 'date';
          input.value = toDateInputValue(value, withTime);
          if (dateOpts) {
            if (dateOpts.min !== undefined) input.min = toDateInputValue(dateOpts.min, withTime);
            if (dateOpts.max !== undefined) input.max = toDateInputValue(dateOpts.max, withTime);
            if (dateOpts.step !== undefined) input.step = String(dateOpts.step);
          }
          getValue = () => parseDateInputValue(input.value, value, {
            valueType: dateOpts && dateOpts.valueType,
            format: col.format,
          });
        } else {
          input = document.createElement('input');
          input.type = editorType === 'number' ? 'number' : 'text';
          input.value = value === null || value === undefined ? '' : String(value);
          getValue = () => input.value;
        }
        input.className = 'dg-cell-editor';
        cellEl.appendChild(input);
        if (autoFocus) {
          input.focus();
          /* 전체 선택은 텍스트 계열에만 — date/datetime-local 등은 선택 API를
           * 지원하지 않아 select()가 InvalidStateError를 던진다 */
          if (input.select && (input.type === 'text' || input.type === 'number')) input.select();
        }
        invalidEl = input;
      }

      return {
        editorType,
        input,
        getValue,
        invalidEl,
        focus: () => {
          const target = input || cellEl.querySelector('input, select, textarea, [tabindex]');
          if (target && target.focus) target.focus();
        },
        destroy: () => { if (cleanup) cleanup(); },
      };
    }

    _startEdit(hit) {
      if (this._isRowDeleted(hit.row)) return; /* softDelete 삭제 표시 행은 편집 불가 */
      this._cancelEdit();
      const col = hit.col;
      const row = hit.row;
      const value = row[col.field];
      const cellEl = hit.cellEl;
      cellEl.innerHTML = '';

      let finished = false;

      const widget = this._createEditorWidget(cellEl, col, value, row, {
        editingClass: 'dg-cell-editing',
        /* 셀 앵커 패널 — 아래 공간이 부족하고 위가 더 넉넉하면 위로 펼침 */
        flipPanel: panel => {
          const bodyRect = this._bodyEl.getBoundingClientRect();
          const cellRect = cellEl.getBoundingClientRect();
          if (cellRect.bottom + panel.offsetHeight + 4 > bodyRect.bottom &&
              cellRect.top - panel.offsetHeight - 4 > bodyRect.top) {
            panel.style.top = 'auto';
            panel.style.bottom = 'calc(100% + 2px)';
          } else {
            panel.style.top = 'calc(100% + 2px)';
            panel.style.bottom = 'auto';
          }
        },
        onInput: () => { clearInvalid(); },
        onPick: () => { finish(true); },   /* 인라인: 옵션 선택 = 즉시 커밋 */
        isClosed: () => finished,
      });
      if (!widget) { this._renderCellValue(cellEl, col, row); return; }
      const { editorType, input, getValue, invalidEl } = widget;
      const cleanup = widget.destroy;
      const markInvalid = message => {
        invalidEl.classList.add('dg-invalid');
        invalidEl.setAttribute('aria-invalid', 'true');
        if (message) invalidEl.title = message;
        if (input) input.focus();
      };
      const clearInvalid = () => {
        invalidEl.classList.remove('dg-invalid');
        invalidEl.removeAttribute('aria-invalid');
        invalidEl.removeAttribute('title');
      };
      /* commit=true 커밋 시도: validator 실패 또는 beforeCellSave 취소면
       * 편집기를 닫지 않고 유지한다. 닫혔으면 true를 반환한다(연속 편집용). */
      const finish = commit => {
        if (finished) return true;
        let newValue = getValue();
        let committed = false;
        if (commit) {
          if (editorType === 'number') {
            const n = Number(newValue);
            newValue = newValue === '' || isNaN(n) ? value : n;
          }
          /* 다중 값은 참조나 표현이 아니라 **내용**으로 변경 여부를 판정한다.
           * 양쪽을 배열로 정규화하므로 배열/콤마 문자열 어느 표현이어도,
           * 원본이 null/단일 값이어도 같게 비교된다 (열었다 그냥 닫았을 때의
           * null → '' 스퓨리어스 커밋 방지). */
          const changed = editorType === 'multiselect'
            ? !shallowArrayEquals(normalizeMultiValue(newValue), normalizeMultiValue(value))
            : !editValueEquals(newValue, value);
          if (changed) {
            const message = this._validateCellValue(col, newValue, row);
            if (message) { markInvalid(message); return false; }
            const evt = { data: row, colDef: col, oldValue: value, newValue, cancel: false };
            this._emitter.emit('beforeCellSave', evt);
            if (evt.cancel) { markInvalid(); return false; }
            clearInvalid();
            row[col.field] = evt.newValue;
            this._recordUpdate(row, col.field, value, evt.newValue);
            newValue = evt.newValue;
            committed = true;
          }
        }
        /* 커밋/취소가 확정된 뒤에는 이벤트 발사 전에 에디터를 먼저 완전히 닫는다.
         * 이벤트를 열린 상태에서 발사하면, 핸들러가 refreshRow 등으로 포커스된
         * 에디터를 DOM에서 제거할 때 blur가 동기 발화해 finish가 재진입한다
         * (BUG-007 — 이중 커밋 + 떼어진 행에 replaceChild → NotFoundError). */
        finished = true;
        this._editing = null;
        if (cleanup) cleanup();
        /* re-render the cell in place */
        cellEl.innerHTML = '';
        this._renderCellValue(cellEl, col, row);
        /* 제자리 재렌더링이라 dirty 표시도 여기서 갱신해야 한다 (refresh 없이) */
        if (this._trackChanges && this._originals && col.field !== undefined) {
          const orig = this._originals.get(row);
          const dirtyNow = !!(orig && (col.field in orig));
          cellEl.classList.toggle('dg-cell-dirty', dirtyNow);
          if (dirtyNow) cellEl.title = `Original: ${orig[col.field]}`;
          else cellEl.removeAttribute('title');
        }
        /* 필수 마커도 같은 이유로 제자리 갱신 — 값을 채우면 사라지고 지우면 나타난다.
         * (required는 빈 값 커밋을 막지만, 원래 비어 있던 셀은 그대로 남는다) */
        if (col.required) {
          const mark = shouldMarkRequiredCell(col, row[col.field], this._canEditCell(row, col));
          cellEl.classList.toggle('dg-cell-required', mark);
          if (mark) cellEl.setAttribute('aria-invalid', 'true');
          else cellEl.removeAttribute('aria-invalid');
        }
        /* 같은 이유로 내장 상태 컬럼(statusColumn) 셀도 제자리 갱신 —
         * 편집으로 updated 상태가 생기거나(원복 시) 사라질 수 있다 */
        this._refreshStatusCell(row);
        if (committed) {
          this._emitter.emit('cellValueChanged', {
            data: row, colDef: col, oldValue: value, newValue,
          });
          const rowChanges = {};
          rowChanges[col.field] = { oldValue: value, newValue };
          this._emitter.emit('rowValueChanged', { data: row, changes: rowChanges });
        }
        this._emitter.emit('editingStopped', {
          data: row,
          colDef: col,
          oldValue: value,
          newValue: committed ? newValue : value,
          committed,
        });
        return true;
      };

      /* 연속 편집: 커밋에 성공해 닫힌 경우에만 인접 셀로 이동 */
      const onKeyDown = e => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          if (finish(true) && this.options.enterMovesDown) this._editNext(hit.r, hit.c, 1, 0);
        } else if (e.key === 'Tab' && this.options.tabMovesRight) {
          e.preventDefault();
          if (finish(true)) this._editNext(hit.r, hit.c, 0, e.shiftKey ? -1 : 1);
        } else if (e.key === 'Escape') {
          finish(false);
        }
      };

      if (input) {
        input.addEventListener('input', clearInvalid);
        input.addEventListener('keydown', onKeyDown);
        input.addEventListener('blur', () => { finish(true); });
      } else {
        cellEl.addEventListener('keydown', onKeyDown);
        cellEl.addEventListener('focusout', e => {
          if (finished) return;
          if (e.relatedTarget && cellEl.contains(e.relatedTarget)) return;
          finish(true);
        });
      }

      this._editing = { finish, row, col };
      this._emitter.emit('editingStarted', { data: row, colDef: col, value });
    }

    /**
     * (r, c)에서 dr/dc 방향으로 다음 편집 가능 셀을 찾아 편집을 시작한다
     * (연속 편집 — enterMovesDown / tabMovesRight). 가로 이동은 행 끝에서
     * 다음/이전 행으로 감싼다. 그룹 헤더 행은 건너뛴다.
     */
    _editNext(r, c, dr, dc) {
      const cols = this._visibleColumns();
      let nr = r;
      let nc = c;
      let guard = this._pageRows.length * cols.length + 2;
      while (guard-- > 0) {
        if (dc !== 0) {
          nc += dc;
          if (nc >= cols.length) { nc = 0; nr++; }
          else if (nc < 0) { nc = cols.length - 1; nr--; }
        } else {
          nr += dr;
        }
        if (nr < 0 || nr >= this._pageRows.length) return false;
        const row = this._pageRows[nr];
        if (!row || row.__group || row.__detail) continue;
        const col = cols[nc];
        if (!this._canEditCell(row, col)) {
          if (dc !== 0) continue;
          continue; /* 세로 이동: 같은 컬럼이 계속 편집 불가면 다음 행에서 재시도 */
        }
        this._scrollRowIntoView(nr);
        this._renderVisibleRows();
        const rowEl = this._renderedRows[nr];
        const cellEl = rowEl && rowEl.querySelector(`[data-col-index="${nc}"]`);
        if (!cellEl) return false;
        this._setFocusedCell(nr, nc);
        this._startEdit({ cellEl, r: nr, c: nc, row, col });
        return true;
      }
      return false;
    }

    _cancelEdit() {
      if (this._editing) this._editing.finish(false);
    }

    /* ---- programmatic edit control ---- */

    /** 지정한 행/필드의 편집을 시작한다. 페이지 밖이면 해당 페이지로 이동 후 시작.
     *  편집 불가 컬럼·미표시 행이면 false를 반환한다. */
    startEdit(row, field) {
      const col = this._visibleColumns().find(c => c.field === field);
      if (!this._canEditCell(row, col)) return false; /* 그리드·행·셀 잠금 + softDelete */

      const displayIndex = this._displayRows.indexOf(row);
      if (displayIndex === -1) return false;

      if (this._pagination) {
        const page = Math.floor(displayIndex / this._pageSize);
        if (page !== this._currentPage) this.setPage(page);
      }
      const pageIndex = this._pageRows.indexOf(row);
      if (pageIndex === -1) return false;

      this._scrollRowIntoView(pageIndex);
      this._renderVisibleRows();
      const rowEl = this._renderedRows[pageIndex];
      const cellEl = rowEl && rowEl.querySelector(`[data-col-id="${col.colId}"]`);
      if (!cellEl) return false;

      const cIdx = Number(cellEl.dataset.colIndex);
      this._setFocusedCell(pageIndex, cIdx);
      this._startEdit({ cellEl, r: pageIndex, c: cIdx, row, col });
      return true;
    }

    /** 진행 중인 편집을 종료한다. commit=false면 취소(기본 커밋). */
    stopEdit(commit) {
      if (this._editing) this._editing.finish(commit !== false);
    }

    isEditing() { return !!this._editing; }

    /** 그리드 전체 편집 잠금/해제. false면 컬럼 editable 설정을 무시하고 잠근다. */
    setEditable(enabled) {
      this._editable = enabled !== false;
      this.refresh(); /* refresh가 진행 중 편집도 정리한다 */
    }

    isEditable() { return this._editable; }

    /* ---- 행/셀 잠금 (setRowEnabled · setCellEnabled) ----
     *
     * 그리드 전체 잠금(setEditable/setEnabled)의 좁은 범위 판. 상태는 그리드가 들고
     * 있고 소비자는 "무엇을 잠글지"만 말한다 — 잠금 집합을 바깥에서 관리하면
     * setRowData로 데이터를 갈아끼울 때 조용히 stale해지기 때문이다.
     * 잠금은 getState()에 들어가지 않는다(권한·워크플로에서 오는 값이라 복원 대상이 아님).
     */

    /** 행 하나 / 행 배열을 모두 받기 위한 정규화. */
    _asArray(v) {
      if (v === undefined || v === null) return [];
      return Array.isArray(v) ? v : [v];
    }

    /**
     * 행을 잠근다/푼다. 잠긴 행은 편집(인라인·붙여넣기·채우기·팝업 폼)과 선택이
     * 모두 막히고 흐리게 표시된다. 행 하나 또는 행 배열을 받으며, 배열이면
     * 다시 그리기는 마지막에 한 번만 일어난다.
     *
     * 잠글 때 그 행의 선택은 해제된다 — 잠긴 행은 UI로 해제할 수단이 없으므로
     * 남겨두면 사용자가 뺄 수 없는 선택이 된다(setEnabled(false)가 진행 중인 편집을
     * 정리하는 것과 같은 이유).
     */
    setRowEnabled(rows, enabled) {
      const list = this._asArray(rows).filter(Boolean);
      if (!list.length) return;
      const locking = enabled === false;
      this._locks = setRowLocks(this._locks, list.map(r => this._rowId(r)), locking);
      if (locking) this._releaseLockedRows(list);
      this._afterLockChange(list, locking);
    }

    /**
     * 셀을 잠근다/푼다. 행/필드 모두 배열을 받으므로 여러 행 × 여러 필드를 한 번에
     * 처리할 수 있다. 막는 것은 편집 계열(인라인·붙여넣기·채우기·폼 필드)뿐이고
     * 선택·포커스는 그대로다 — 셀 범위 선택은 사각형이라 가운데를 뺄 수 없다.
     */
    setCellEnabled(rows, fields, enabled) {
      const list = this._asArray(rows).filter(Boolean);
      const fieldList = this._asArray(fields);
      if (!list.length || !fieldList.length) return;
      const locking = enabled === false;
      this._locks = setCellLocks(this._locks, list.map(r => this._rowId(r)), fieldList, locking);
      this._afterLockChange(list, locking);
    }

    isRowEnabled(row) { return !this._isRowLocked(row); }

    /** 행 잠금은 그 행의 모든 셀을 덮으므로, 행이 잠겼으면 셀도 잠긴 것으로 답한다. */
    isCellEnabled(row, field) {
      if (!row) return false;
      return !isCellLocked(this._locks, this._rowId(row), field);
    }

    /** 모든 행/셀 잠금을 푼다 (resetState 계열과 같은 성격). */
    resetEnabled() {
      this._locks = emptyLockMap();
      this._afterLockChange(null, false);
    }

    /** 잠긴 행을 선택에서 걷어낸다. 바뀐 게 없으면 이벤트도 내지 않는다. */
    _releaseLockedRows(rows) {
      const next = {};
      for (const k in this._selection) next[k] = this._selection[k];
      let changed = false;
      rows.forEach(r => {
        const id = this._rowId(r);
        if (next[id] !== undefined) { delete next[id]; changed = true; }
      });
      if (!changed) return;
      this._selection = next;
      this._emitSelection(); /* DOM은 뒤따르는 refresh()가 다시 그린다 */
    }

    /**
     * 잠금이 바뀐 뒤 정리. refresh()가 인라인 편집은 취소하지만 팝업 폼은
     * "행이 데이터에서 사라졌을 때"만 닫으므로, 잠근 행의 폼은 여기서 직접 닫는다 —
     * 안 닫으면 잠근 뒤에도 Save가 값을 써버린다.
     */
    _afterLockChange(rows, locking) {
      const p = this._popup;
      if (locking && p && p.row && rows && rows.indexOf(p.row) !== -1) {
        this.closeEditPopup(false);
      }
      this.refresh();
    }

    /* ---- popup editor (행 단위 폼 편집) ----
     *
     * 인라인 셀 편집과 위젯 생성(_createEditorWidget)은 공유하지만 라이프사이클은
     * 완전히 다르다: 필드가 동시에 여러 개 살아 있고, blur는 커밋이 아니며,
     * 커밋은 Save에서 일괄로 일어난다(instantUpdate면 필드 확정 시점).
     */

    /** 팝업 폼을 연다. field를 주면 그 필드에 포커스. 열지 못하면 false. */
    openEditPopup(row, field) {
      if (!this._popupConfig || !row || this._destroyed) return false;
      if (!this._editable) return false;
      if (this._isRowLocked(row)) return false; /* 행 잠금 — 폼 전체가 잠기므로 열지 않는다 */
      if (this._isRowDeleted(row)) return false; /* softDelete 삭제 표시 행 (인라인과 동일) */
      if (this._rows.indexOf(row) === -1) return false;

      const evt = { data: row, field: field || null, cancel: false };
      this._emitter.emit('beforePopupEdit', evt);
      if (evt.cancel) return false;

      this._cancelEdit();     /* 인라인 편집이 열려 있으면 정리 */
      this.closeEditPopup(false);

      const cfg = this._popupConfig;
      const fields = buildPopupFields(this._columns, cfg, this._editable, this._lockedFieldsOf(row));
      if (!fields.length) return false;

      /* 원본 스냅샷 — Cancel 롤백(instantUpdate)과 변경 감지의 기준선.
       * 배열 값은 얕게 복사해야 위젯이 같은 배열을 만져도 기준선이 안 흔들린다. */
      const original = {};
      fields.forEach(f => {
        const v = row[f.field];
        original[f.field] = Array.isArray(v) ? v.slice() : v;
      });

      this._popup = {
        row, cfg, fields, original,
        values: Object.assign({}, original),
        widgets: {},   /* field -> widget */
        fieldEls: {},  /* field -> { fieldEl, controlEl, errorEl, labelEl } */
        errors: {},
        closed: false,
      };

      this._buildPopupDom();
      /* 폼이 다 만들어진 뒤, 포커스와 이벤트보다 먼저 — onLoad가 필드를 숨기거나
       * 값을 바꿀 수 있으니 초기 포커스는 그 결과를 보고 정해야 하고,
       * popupEditStarted 리스너도 초기화가 끝난 상태를 봐야 한다. */
      this._popupFireButtonLoad();
      if (!this._popup) return false; /* onLoad가 닫았으면 열린 적 없는 것으로 본다 */
      this._popupFocus(field);
      this._emitter.emit('popupEditStarted', { data: row, field: field || null });
      return true;
    }

    /** 열려 있는 팝업을 닫는다. commit=true면 Save와 같은 경로. */
    closeEditPopup(commit) {
      if (!this._popup) return;
      if (commit === true) { this._popupSave(); return; }
      this._popupTeardown(false);
    }

    isPopupEditing() { return !!this._popup; }

    /** 팝업 폼의 현재 값 스냅샷 (열려 있지 않으면 null). */
    getPopupValues() {
      if (!this._popup) return null;
      this._popupReadValues();
      return Object.assign({}, this._popup.values);
    }

    /* --- DOM --- */

    _buildPopupDom() {
      const p = this._popup;
      const cfg = p.cfg;

      /* BUG-001: 팝업은 .dg-root 안에 넣어야 --dg-* 토큰과 다크 테마를 상속받는다 */
      const backdrop = el('div', `dg-popup-backdrop dg-popup-${cfg.position}`, this._rootEl);
      const panel = el('div', 'dg-popup', backdrop);
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      if (cfg.position === 'center') panel.style.width = `${cfg.width}px`;
      else panel.style.width = `${cfg.width}px`;
      p.backdropEl = backdrop;
      p.panelEl = panel;

      /* 헤더 */
      const header = el('div', 'dg-popup-header', panel);
      const titleEl = el('div', 'dg-popup-title', header);
      titleEl.textContent = this._popupTitle();
      panel.setAttribute('aria-label', titleEl.textContent);
      const closeBtn = el('button', 'dg-popup-close', header);
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', this._t('popupCloseLabel'));
      /* 슬라이드 패널은 "접기"라 방향 화살표, 중앙 모달은 관례대로 X */
      closeBtn.innerHTML = cfg.position === 'center' ? CLOSE_SVG : CHEVRON_SVG;
      closeBtn.addEventListener('click', () => { this._popupCancel(); });

      /* 본문 */
      const body = el('div', `dg-popup-body${cfg.columns === 2 ? ' dg-popup-cols-2' : ''}`, panel);
      p.bodyEl = body;
      p.fields.forEach(f => { this._buildPopupField(f, body); });

      /* 푸터 */
      if (cfg.buttons.length) {
        const footer = el('div', 'dg-popup-footer', panel);
        p.footerEl = footer;
        cfg.buttons.forEach(b => { this._buildPopupButton(b, footer, null); });
      }

      /* 바깥 클릭 — mousedown 기준(BUG-002 계열: click은 내부에서 올라온 것과 섞인다) */
      if (cfg.closeOnBackdrop) {
        backdrop.addEventListener('mousedown', e => {
          if (e.target === backdrop) this._popupCancel();
        });
      }
      /* Esc는 취소, Enter는 단순 입력에서만 저장 (패널형 에디터는 자기 키를 쓴다),
       * Tab은 폼 안에서 순환한다 */
      panel.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.stopPropagation(); this._popupCancel(); return; }
        if (e.key === 'Tab') { this._popupTrapFocus(e, panel); return; }
        if (e.key !== 'Enter') return;
        const t = e.target;
        if (!t || t.tagName !== 'INPUT') return;
        /* 늘 펼쳐져 있는 패널형(multiselect/radio)은 Enter를 자기 키로 쓴다 */
        if (t.closest('.dg-editor-multiselect, .dg-editor-radio')) return;
        /* 검색형은 **목록이 열려 있을 때만** Enter를 가져간다(선택/토글).
         * 닫혀 있을 때까지 넘겨주면 "다 골랐으니 Enter로 저장"이 침묵한다 —
         * 위젯이 이미 return한 뒤라 여기서 막으면 아무도 처리하지 않는다. */
        const ss = t.closest('.dg-editor-searchselect');
        if (ss && ss.classList.contains('dg-searchselect-open')) return;
        e.preventDefault();
        this._popupSave();
      });

      /* 진입 효과는 CSS @keyframes가 전담한다 — JS가 클래스를 나중에 붙이거나
       * 트랜지션으로 처리하면 가시성이 프레임 생성에 묶여, 프레임이 안 나오는
       * 상황에서 패널이 화면 밖에 영구히 남는다. */
      this._popupSyncButtons();
    }

    /**
     * Tab을 폼 안에서 순환시킨다. `aria-modal="true"`를 선언한 이상 키보드도
     * 실제로 갇혀 있어야 한다 — 안 그러면 Tab으로 뒤 페이지까지 빠져나가면서
     * 보조기술에는 "뒤는 비활성"이라고 말하는 셈이 된다.
     */
    _popupTrapFocus(e, panel) {
      const focusables = Array.prototype.filter.call(
        panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
          'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
        el => el.tabIndex !== -1 && (el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement)
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    }

    _buildPopupField(f, body) {
      const p = this._popup;
      const fieldEl = el('div', 'dg-popup-field', body);
      fieldEl.dataset.field = f.field;
      if (f.span === 2) fieldEl.dataset.span = '2';

      /* before(ctx) — 값이 없는 표시 전용 HTML */
      this._popupMountSlot(f, f.cfg.before, fieldEl, 'dg-popup-before');

      const labelEl = el('label', 'dg-popup-label', fieldEl);
      labelEl.textContent = f.label + (f.readonly ? this._t('popupReadonlySuffix') : '');
      /* 폼에서도 필수는 라벨에 표시한다 — 그리드 헤더와 같은 규약.
       * readonly 필드는 검증에서도 건너뛰므로 표식을 달지 않는다. */
      if (!f.readonly && (f.editCol || f.col || {}).required) {
        fieldEl.classList.add('dg-popup-required');
        const star = el('span', 'dg-required-star', labelEl);
        star.textContent = '*';
        star.setAttribute('title', this._t('requiredIndicatorLabel'));
        star.setAttribute('aria-hidden', 'true');
      }

      const controlEl = el('div', 'dg-popup-control', fieldEl);
      const inputWrap = el('div', 'dg-popup-input', controlEl);

      if (f.readonly) {
        this._buildPopupReadonly(f, inputWrap);
      } else {
        const widget = this._createEditorWidget(inputWrap, f.editCol, p.values[f.field], p.row, {
          flipPanel: () => {},          /* 폼 안에서는 패널이 흐름대로 펼쳐진다 (CSS) */
          collapsible: true,            /* 검색형 select/multiselect는 접히는 콤보박스로 */
          autoFocus: false,             /* 포커스는 _popupFocus가 한 곳에만 준다 */
          onInput: () => { this._popupClearError(f.field); },
          onPick: () => { this._popupFieldChanged(f); },
          /* 검색형 multiselect의 항목 토글 — 표시 전용 체크박스라 네이티브 change가
           * 안 오고, 칩 × 제거는 애초에 폼 이벤트를 발화하지 않는다 */
          onChange: () => { this._popupFieldChanged(f); },
          isClosed: () => !this._popup || this._popup.closed,
        });
        if (widget) {
          p.widgets[f.field] = widget;
          if ((f.editCol || f.col || {}).required && widget.input) {
            widget.input.setAttribute('aria-required', 'true');
          }
          /* 세로로 긴 목록형 위젯은 라벨을 가운데 정렬하면 목록 한가운데에 뜬다 */
          if (widget.editorType === 'multiselect' || widget.editorType === 'radio') {
            fieldEl.classList.add('dg-popup-field-tall');
          }
          /* 위젯 종류마다 발화 이벤트가 달라 둘 다 잡는다 (버블 기준) */
          fieldEl.addEventListener('change', () => { this._popupFieldChanged(f); });
          fieldEl.addEventListener('input', () => { this._popupFieldChanged(f); });
        } else {
          /* 커스텀 에디터 init 실패 — 읽기 전용으로 폴백 (폼이 통째로 죽지 않게) */
          this._buildPopupReadonly(f, inputWrap);
        }
      }

      /* 컬럼 단위 버튼 — 입력 오른쪽 */
      (Array.isArray(f.cfg.buttons) ? resolvePopupButtons(f.cfg.buttons) : []).forEach(b => {
        if (b.builtin) return; /* 필드 옆에는 내장 Save/Cancel을 두지 않는다 */
        this._buildPopupButton(b, controlEl, f);
      });

      if (f.hint) el('div', 'dg-popup-hint', fieldEl).textContent = f.hint;
      const errorEl = el('div', 'dg-popup-error', fieldEl);
      errorEl.hidden = true;

      /* after(ctx) */
      this._popupMountSlot(f, f.cfg.after, fieldEl, 'dg-popup-after');

      p.fieldEls[f.field] = { fieldEl, controlEl, labelEl, errorEl };
    }

    /** 표시 전용 입력. BUG-006에 따라 disabled 대신 readOnly + pointer-events 차단. */
    _buildPopupReadonly(f, wrap) {
      const input = el('input', 'dg-cell-editor dg-popup-readonly', wrap);
      input.type = 'text';
      input.readOnly = true;
      input.tabIndex = -1;
      const v = this._popup.values[f.field];
      input.value = this._displayText(f.col, v, this._popup.row);
    }

    /** cellRenderer 없이 값의 표시 문자열만 뽑는다 (readonly 필드·타이틀용). */
    _displayText(col, value, row) {
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value.join(', ');
      if (col && typeof col.valueFormatter === 'function') {
        try { return String(col.valueFormatter(value, row)); }
        catch (e) { console.error(`[DataGrid] valueFormatter failed for "${col.field}":`, e); }
      }
      return String(value);
    }

    /** before/after 슬롯 — 문자열은 HTML로, Element는 그대로 붙인다. */
    _popupMountSlot(f, slot, parent, cls) {
      if (typeof slot !== 'function') return;
      let content;
      try { content = slot(this._popupContext(f)); }
      catch (e) {
        console.error(`[DataGrid] popupEditor.${cls.includes('before') ? 'before' : 'after'} failed for "${f.field}":`, e);
        return;
      }
      if (content === null || content === undefined || content === '') return;
      const holder = el('div', cls, parent);
      if (content instanceof HTMLElement) holder.appendChild(content);
      else holder.innerHTML = String(content); /* cellRenderer와 동일 — 이스케이프하지 않음 */
    }

    _buildPopupButton(b, parent, f) {
      const variantCls = b.variant === 'primary' ? ' dg-btn-primary'
        : b.variant === 'danger' ? ' dg-btn-danger' : '';
      const btn = el('button', `dg-btn${variantCls}`, parent);
      btn.type = 'button';
      btn.dataset.popupBtn = b.key;
      btn.textContent = b.builtin === 'save' ? this._t('popupSave')
        : b.builtin === 'cancel' ? this._t('popupCancel')
        : b.builtin === 'close' ? this._t('popupCancel')
        : b.text;
      if (b.title) btn.title = b.title;
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (b.builtin === 'save') { this._popupSave(); return; }
        if (b.builtin === 'cancel') { this._popupCancel(); return; }
        if (b.builtin === 'close') { this._popupTeardown(false); return; }
        if (!b.onClick) return;
        try { b.onClick(this._popupContext(f, btn)); }
        catch (e) { console.error(`[DataGrid] popup button "${b.key}" onClick failed:`, e); }
        if (this._popup) this._popupSyncButtons();
      });
      const p = this._popup;
      (p._buttons || (p._buttons = [])).push({ def: b, el: btn, field: f });
    }

    /**
     * 버튼들의 onLoad를 한 번 호출한다 — 폼이 완전히 만들어진 뒤 DOM 순서대로.
     * 빌드 도중에 부르면 뒤 필드가 아직 없어서 "다른 필드를 만지는" 초기화가
     * 조용히 실패한다. onLoad 안에서 close/cancel/save로 팝업이 사라질 수 있으므로
     * 목록을 미리 복사하고 매 반복마다 생존을 확인한다.
     */
    _popupFireButtonLoad() {
      const p = this._popup;
      if (!p || !p._buttons) return;
      const list = p._buttons.slice();
      for (const { def, el: btn, field } of list) {
        if (!def.onLoad) continue;
        if (this._popup !== p || p.closed) return; /* onLoad가 팝업을 닫았다 */
        try { def.onLoad(this._popupContext(field, btn)); }
        catch (e) { console.error(`[DataGrid] popup button "${def.key}" onLoad failed:`, e); }
      }
      /* onLoad가 값을 바꿨을 수 있으니 disabled를 다시 평가한다.
       * disabled 옵션이 있는 버튼은 그 결과가 onLoad의 수동 지정을 덮는다. */
      if (this._popup === p && !p.closed) this._popupSyncButtons();
    }

    /** disabled가 함수인 버튼들을 현재 상태로 다시 평가한다. */
    _popupSyncButtons() {
      const p = this._popup;
      if (!p || !p._buttons) return;
      p._buttons.forEach(({ def, el: btn, field }) => {
        if (def.disabled === undefined) return;
        let off = def.disabled;
        if (typeof def.disabled === 'function') {
          try { off = def.disabled(this._popupContext(field, btn)); }
          catch (e) {
            console.error(`[DataGrid] popup button "${def.key}" disabled failed:`, e);
            off = false;
          }
        }
        btn.disabled = !!off;
      });
    }

    /* --- 값 --- */

    /** 살아 있는 위젯들의 값을 읽어 values에 반영한다. */
    _popupReadValues() {
      const p = this._popup;
      if (!p) return;
      p.fields.forEach(f => {
        const w = p.widgets[f.field];
        if (!w) return;
        let v = w.getValue();
        if (w.editorType === 'number') {
          const n = Number(v);
          v = v === '' || isNaN(n) ? p.original[f.field] : n;
        }
        p.values[f.field] = v;
      });
    }

    /** 한 필드의 값이 바뀌었는지 확인하고 검증·이벤트·instantUpdate를 처리한다. */
    _popupFieldChanged(f) {
      const p = this._popup;
      if (!p || p.closed) return;
      const w = p.widgets[f.field];
      if (!w) return;
      let newValue = w.getValue();
      if (w.editorType === 'number') {
        const n = Number(newValue);
        newValue = newValue === '' || isNaN(n) ? p.original[f.field] : n;
      }
      const oldValue = p.values[f.field];
      if (sameEditValue(newValue, oldValue, w.editorType === 'multiselect')) return;

      p.values[f.field] = newValue;
      this._popupValidateField(f);
      this._emitter.emit('popupFieldChanged', {
        data: p.row, colDef: f.col, oldValue, newValue,
      });
      if (p.cfg.instantUpdate) this._popupCommitField(f, oldValue, newValue);
      this._popupSyncButtons();
    }

    /** 폼에서 값을 프로그래매틱하게 바꾼다 (ctx.setValue). 위젯을 재생성해 UI를 맞춘다. */
    _popupSetValue(field, value) {
      const p = this._popup;
      if (!p || p.closed) return false;
      const f = p.fields.find(x => x.field === field);
      if (!f || f.readonly) return false;
      const oldValue = p.values[field];
      p.values[field] = value;

      const holder = p.fieldEls[field];
      const w = p.widgets[field];
      if (holder && w) {
        /* 위젯 종류마다 값 주입 방식이 달라, 새 값으로 다시 만드는 쪽이 안전하다 */
        w.destroy();
        const wrap = holder.controlEl.querySelector('.dg-popup-input');
        wrap.innerHTML = '';
        const next = this._createEditorWidget(wrap, f.editCol, value, p.row, {
          flipPanel: () => {},
          collapsible: true,
          autoFocus: false,
          onInput: () => { this._popupClearError(field); },
          onPick: () => { this._popupFieldChanged(f); },
          onChange: () => { this._popupFieldChanged(f); },
          isClosed: () => !this._popup || this._popup.closed,
        });
        if (next) p.widgets[field] = next;
        else delete p.widgets[field];
      }
      this._popupValidateField(f);
      this._emitter.emit('popupFieldChanged', {
        data: p.row, colDef: f.col, oldValue, newValue: value,
      });
      if (p.cfg.instantUpdate) this._popupCommitField(f, oldValue, value);
      this._popupSyncButtons();
      return true;
    }

    /* --- 검증 --- */

    _popupValidateField(f) {
      const p = this._popup;
      if (!p) return true;
      const { errors, failures } = validatePopupValues([f], p.values, p.row, this._localeText);
      failures.forEach(({ field, error }) => {
        console.error(`[DataGrid] validator failed for "${field}":`, error);
      });
      if (errors[f.field]) this._popupShowError(f.field, errors[f.field]);
      else this._popupClearError(f.field);
      return !errors[f.field];
    }

    _popupValidateAll() {
      const p = this._popup;
      const { errors, failures } = validatePopupValues(p.fields, p.values, p.row, this._localeText);
      failures.forEach(({ field, error }) => {
        console.error(`[DataGrid] validator failed for "${field}":`, error);
      });
      p.fields.forEach(f => {
        if (errors[f.field]) this._popupShowError(f.field, errors[f.field]);
        else this._popupClearError(f.field);
      });
      return errors;
    }

    _popupShowError(field, message) {
      const p = this._popup;
      const holder = p && p.fieldEls[field];
      if (!holder) return;
      p.errors[field] = message;
      holder.fieldEl.classList.add('dg-popup-invalid');
      holder.errorEl.textContent = message;
      holder.errorEl.hidden = false;
      const w = p.widgets[field];
      if (w && w.invalidEl) w.invalidEl.setAttribute('aria-invalid', 'true');
    }

    _popupClearError(field) {
      const p = this._popup;
      const holder = p && p.fieldEls[field];
      if (!holder) return;
      delete p.errors[field];
      holder.fieldEl.classList.remove('dg-popup-invalid');
      holder.errorEl.textContent = '';
      holder.errorEl.hidden = true;
      const w = p.widgets[field];
      if (w && w.invalidEl) w.invalidEl.removeAttribute('aria-invalid');
    }

    /* --- 커밋 --- */

    /** instantUpdate 경로: 한 필드를 즉시 행에 반영한다 (인라인 커밋과 같은 규약). */
    _popupCommitField(f, oldValue, newValue) {
      const p = this._popup;
      if (this._popup && this._popup.errors[f.field]) return false;
      const evt = { data: p.row, colDef: f.col, oldValue, newValue, cancel: false };
      this._emitter.emit('beforeCellSave', evt);
      if (evt.cancel) { this._popupShowError(f.field, this._popup.errors[f.field] || ' '); return false; }
      p.row[f.field] = evt.newValue;
      p.values[f.field] = evt.newValue;
      this._recordUpdate(p.row, f.field, oldValue, evt.newValue);
      this._emitter.emit('cellValueChanged', {
        data: p.row, colDef: f.col, oldValue, newValue: evt.newValue,
      });
      const changes = {};
      changes[f.field] = { oldValue, newValue: evt.newValue };
      this._emitter.emit('rowValueChanged', { data: p.row, changes });
      this.refreshRow(p.row);
      return true;
    }

    _popupSave() {
      const p = this._popup;
      if (!p || p.closed) return false;
      this._popupReadValues();

      const errors = this._popupValidateAll();
      if (Object.keys(errors).length) {
        const first = p.fields.find(f => errors[f.field]);
        if (first && p.widgets[first.field]) p.widgets[first.field].focus();
        return false;
      }

      /* instantUpdate면 이미 행에 반영돼 있다 — 남은 건 닫기뿐 */
      if (p.cfg.instantUpdate) {
        const changes = diffPopupValues(p.original, p.values, p.fields);
        this._popupTeardown(true, changes);
        return true;
      }

      const changes = diffPopupValues(p.original, p.values, p.fields);
      const saveEvt = { data: p.row, values: Object.assign({}, p.values), cancel: false };
      this._emitter.emit('beforePopupSave', saveEvt);
      if (saveEvt.cancel) return false;

      /* beforePopupSave에서 values를 가공했을 수 있다 — 다시 diff */
      const finalValues = saveEvt.values || p.values;
      const finalChanges = diffPopupValues(p.original, finalValues, p.fields);

      /* 필드별 beforeCellSave — 하나라도 거부하면 Save 전체를 멈춘다 */
      const accepted = {};
      const fieldsByName = {};
      p.fields.forEach(f => { fieldsByName[f.field] = f; });
      for (const field in finalChanges) {
        const f = fieldsByName[field];
        const { oldValue, newValue } = finalChanges[field];
        const evt = { data: p.row, colDef: f.col, oldValue, newValue, cancel: false };
        this._emitter.emit('beforeCellSave', evt);
        if (evt.cancel) {
          this._popupShowError(field, this._popup.errors[field] || ' ');
          return false;
        }
        accepted[field] = { oldValue, newValue: evt.newValue };
      }

      /* 전부 통과한 뒤에야 행에 쓴다 — 중간 거부로 반쯤 저장되는 일이 없게 */
      const changedFields = Object.keys(accepted);
      changedFields.forEach(field => {
        p.row[field] = accepted[field].newValue;
        this._recordUpdate(p.row, field, accepted[field].oldValue, accepted[field].newValue);
      });

      /* 전이(닫기)를 먼저 끝내고 이벤트를 발사한다 (BUG-007과 같은 이유 —
       * 핸들러의 refreshRow가 폼 DOM을 건드려도 재진입할 상태가 남지 않게) */
      this._popupTeardown(true, accepted, () => {
        changedFields.forEach(field => {
          this._emitter.emit('cellValueChanged', {
            data: p.row,
            colDef: fieldsByName[field].col,
            oldValue: accepted[field].oldValue,
            newValue: accepted[field].newValue,
          });
        });
        if (changedFields.length) {
          this._emitter.emit('rowValueChanged', { data: p.row, changes: accepted });
        }
      });
      return true;
    }

    _popupCancel() {
      const p = this._popup;
      if (!p || p.closed) return;
      /* instantUpdate는 이미 행에 썼으므로 연 시점 스냅샷으로 되돌린다.
       * 되돌림도 정식 커밋 경로를 타서 변경 추적·이벤트가 정합을 유지한다. */
      if (p.cfg.instantUpdate) {
        const drift = diffPopupValues(p.original, p.row, p.fields);
        const rolled = {};
        Object.keys(drift).forEach(field => {
          const current = p.row[field];
          const restored = p.original[field];
          p.row[field] = restored;
          this._recordUpdate(p.row, field, current, restored);
          rolled[field] = { oldValue: current, newValue: restored };
        });
        if (Object.keys(rolled).length) {
          this._popupTeardown(false, null, () => {
            Object.keys(rolled).forEach(field => {
              const f = p.fields.find(x => x.field === field);
              this._emitter.emit('cellValueChanged', {
                data: p.row, colDef: f.col,
                oldValue: rolled[field].oldValue, newValue: rolled[field].newValue,
              });
            });
            this._emitter.emit('rowValueChanged', { data: p.row, changes: rolled });
            this.refreshRow(p.row);
          });
          return;
        }
      }
      this._popupTeardown(false);
    }

    /**
     * 팝업을 완전히 닫고 정리한다. after는 상태가 전부 정리된 뒤 실행되므로
     * 리스너가 무엇을 하든 팝업 코드로 재진입하지 않는다 (BUG-007 교훈).
     */
    _popupTeardown(committed, changes, after) {
      const p = this._popup;
      if (!p || p.closed) return;
      p.closed = true;
      Object.keys(p.widgets).forEach(field => {
        try { p.widgets[field].destroy(); }
        catch (e) { console.error(`[DataGrid] popup widget destroy failed for "${field}":`, e); }
      });
      if (p.backdropEl && p.backdropEl.parentNode) {
        p.backdropEl.parentNode.removeChild(p.backdropEl);
      }
      this._popup = null;
      if (committed) this.refreshRow(p.row);
      if (after) after();
      this._emitter.emit('popupEditStopped', {
        data: p.row,
        committed: !!committed,
        changes: changes || {},
      });
      if (this._rootEl) this._rootEl.focus();
    }

    /* --- 부수 --- */

    _popupTitle() {
      const p = this._popup;
      const custom = p.cfg.title;
      if (typeof custom === 'function') {
        try { return String(custom(p.row)); }
        catch (e) { console.error('[DataGrid] popupEditor.title failed:', e); }
      } else if (typeof custom === 'string') {
        return custom;
      }
      /* 기본: 첫 필드 값으로 행을 식별 (스샷의 "Editing James D Davis") */
      const first = p.fields[0];
      const value = first ? this._displayText(first.col, p.row[first.field], p.row) : '';
      return this._t('popupEditTitle', { value });
    }

    _popupFocus(field) {
      const p = this._popup;
      if (!p) return;
      const target = (field && p.widgets[field]) ? p.widgets[field]
        : p.widgets[(p.fields.find(f => !f.readonly) || {}).field];
      if (target) target.focus();
      else if (p.panelEl) p.panelEl.focus();
    }

    /** 버튼·before/after 콜백에 넘기는 컨텍스트. */
    _popupContext(f, btnEl) {
      const p = this._popup;
      if (!p) return null;
      return {
        grid: this,
        data: p.row,
        colDef: f ? f.col : null,
        field: f ? f.field : null,
        fieldEl: f && p.fieldEls[f.field] ? p.fieldEls[f.field].fieldEl : null,
        buttonEl: btnEl || null, /* 버튼 콜백에서만 채워진다 (onLoad/onClick/disabled) */
        get value() { return p.values[f ? f.field : null]; },
        get values() { return Object.assign({}, p.values); },
        getValue: name => p.values[name],
        setValue: (name, v) => this._popupSetValue(name, v),
        isValid: () => Object.keys(this._popupValidateAll()).length === 0,
        reset: () => {
          p.fields.forEach(x => {
            if (!x.readonly) this._popupSetValue(x.field, p.original[x.field]);
          });
        },
        save: () => this._popupSave(),
        cancel: () => { this._popupCancel(); },
        close: () => { this._popupTeardown(false); },
      };
    }

    /* ---- clipboard (엑셀 호환 TSV) ---- */

    /** 셀 범위 > 선택 행(뷰 순서) > 포커스 셀 순으로 TSV를 만든다. 대상이 없으면 null. */
    _selectionTsv() {

      /* 셀/블록 범위가 있으면 범위를 그대로 복사 (블록 모양 유지를 위해 suppressCopy 무시) */
      const range = this._cellRange ? this.getCellRange() : null;
      if (range && range.rows.length > 0) {
        const rangeCols = range.columns.filter(c => c.field !== undefined);
        if (rangeCols.length > 0) return buildTsv(range.rows, rangeCols);
      }

      const cols = this._visibleColumns().filter(c => c.field !== undefined && !c.suppressCopy);
      if (cols.length === 0) return null;

      const rows = this._viewRows.filter(r => this._selection[this._rowId(r)]);
      if (rows.length > 0) return buildTsv(rows, cols);

      if (this._focusedCell) {
        const row = this._pageRows[this._focusedCell.r];
        const col = this._visibleColumns()[this._focusedCell.c];
        if (row && !row.__group && col && col.field !== undefined && !col.suppressCopy) {
          return buildTsv([row], [col]);
        }
      }
      return null;
    }

    _writeClipboard(text) {
      const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* 클립보드 접근 불가 환경 */ }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(fallback);
      } else {
        fallback();
      }
    }

    /** 선택 행(없으면 포커스 셀)을 TSV로 클립보드에 복사하고 그 문자열을 반환한다. */
    copy() {
      const tsv = this._selectionTsv();
      if (tsv !== null) this._writeClipboard(tsv);
      return tsv;
    }

    /**
     * 포커스 셀을 시작점으로 TSV 텍스트를 붙여넣는다. 편집 가능한 셀에만 쓰며
     * validator·beforeCellSave를 통과한 값만 반영한다. 갱신된 셀 수를 반환.
     */
    pasteTsv(text) {
      if (!text || !this._focusedCell || !this._editable) return 0;
      const matrix = parseTsv(String(text));
      const cols = this._visibleColumns();
      const startR = this._focusedCell.r;
      const startC = this._focusedCell.c;
      let updated = 0;

      matrix.forEach((cells, i) => {
        const row = this._pageRows[startR + i];
        if (!row || row.__group || row.__detail) return;
        if (this._isRowDeleted(row)) return; /* softDelete 삭제 표시 행은 붙여넣기 제외 */
        let rowChanges = null;
        cells.forEach((raw, j) => {
          const col = cols[startC + j];
          if (!this._canEditCell(row, col)) return; /* 행/셀 잠금은 붙여넣기도 막는다 */
          let value = raw;
          const editorType = col.editor || defaultEditorType(col);
          if (editorType === 'number') {
            const n = Number(value);
            if (value === '' || isNaN(n)) return;
            value = n;
          } else if (editorType === 'date' || editorType === 'datetime') {
            /* 붙여넣기도 에디터와 같은 타입 규약을 따라야 한 컬럼에 Date와 문자열이
             * 섞이지 않는다(섞이면 정렬·비교가 깨진다). 날짜로 못 읽으면 그 셀은 건너뛴다.
             * 분 단위까지만 반영 — 에디터 기본 정밀도와 동일. */
            const withTime = editorType === 'datetime';
            const parsed = parseLocalDate(value);
            if (value === '' || isNaN(parsed.getTime())) return;
            const dateOpts = dateEditorOptions(col);
            value = parseDateInputValue(toDateInputValue(parsed, withTime), row[col.field], {
              valueType: dateOpts && dateOpts.valueType,
              format: col.format,
            });
          }
          const oldValue = row[col.field];
          if (editValueEquals(value, oldValue)) return;
          if (this._validateCellValue(col, value, row)) return;
          const evt = { data: row, colDef: col, oldValue, newValue: value, cancel: false };
          this._emitter.emit('beforeCellSave', evt);
          if (evt.cancel) return;
          row[col.field] = evt.newValue;
          this._recordUpdate(row, col.field, oldValue, evt.newValue);
          updated++;
          this._emitter.emit('cellValueChanged', {
            data: row, colDef: col, oldValue, newValue: evt.newValue,
          });
          if (!rowChanges) rowChanges = {};
          rowChanges[col.field] = { oldValue, newValue: evt.newValue };
        });
        if (rowChanges) this._emitter.emit('rowValueChanged', { data: row, changes: rowChanges });
      });

      if (updated > 0) this.refresh();
      return updated;
    }

    /* ---- column resize ---- */

    _bindResizer(resizer, col) {
      resizer.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        resizer.classList.add('dg-resizing');
        const startX = e.clientX;
        const startW = this._computedWidths[col.colId] || col.width;
        const onMove = me => {
          let w = Math.max(col.minWidth, startW + (me.clientX - startX));
          if (typeof col.maxWidth === 'number') w = Math.min(col.maxWidth, w);
          this._colWidths[col.colId] = w;
          this._layoutColumns();
        };
        const onUp = () => {
          resizer.classList.remove('dg-resizing');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          this._emitter.emit('columnResized', { colId: col.colId, width: this._colWidths[col.colId] });
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      resizer.addEventListener('dblclick', e => {
        e.stopPropagation();
        this.autoSizeColumn(col.colId);
      });
    }

    autoSizeColumn(colId) {
      const col = this._columns.find(c => c.colId === colId);
      if (!col || !col.field) return;
      const canvas = this._measureCanvas || (this._measureCanvas = document.createElement('canvas'));
      const ctx = canvas.getContext('2d');
      const style = getComputedStyle(this._rootEl);
      ctx.font = `600 ${style.fontSize} ${style.fontFamily}`;
      let max = ctx.measureText(col.headerName).width + 60;
      ctx.font = `${style.fontSize} ${style.fontFamily}`;
      const sample = this._viewRows.slice(0, 200);
      for (let i = 0; i < sample.length; i++) {
        let v = sample[i][col.field];
        if (col.valueFormatter) v = col.valueFormatter(v, sample[i]);
        if (v === null || v === undefined) continue;
        max = Math.max(max, ctx.measureText(String(v)).width + 34);
      }
      let w = Math.ceil(Math.max(col.minWidth, Math.min(max, 500)));
      if (typeof col.maxWidth === 'number') w = Math.min(col.maxWidth, w);
      this._colWidths[colId] = w;
      this._layoutColumns();
    }

    /* ---- column reorder (drag header) ---- */

    _bindReorder(cell, col) {
      cell.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn') || e.target.closest(HEADER_INTERACTIVE_SELECTOR)) return;

        const startX = e.clientX;
        let dragging = false;
        let indicator = null;
        let targetIndex = -1;

        const headerCells = () => Array.from(this._headerRowEl.children)
          .filter(c => !c.classList.contains('dg-pinned-left') && !c.classList.contains('dg-pinned-right'));

        const onMove = me => {
          if (!dragging) {
            if (Math.abs(me.clientX - startX) < 6) return;
            dragging = true;
            cell.classList.add('dg-dragging');
            indicator = el('div', 'dg-drop-indicator', this._rootEl);
          }
          const cells = headerCells();
          targetIndex = -1;
          const rootRect = this._rootEl.getBoundingClientRect();
          for (let i = 0; i < cells.length; i++) {
            const r = cells[i].getBoundingClientRect();
            if (me.clientX < r.left + r.width / 2) {
              targetIndex = i;
              indicator.style.left = `${r.left - rootRect.left}px`;
              break;
            }
          }
          if (targetIndex === -1) {
            targetIndex = cells.length;
            const lastR = cells[cells.length - 1].getBoundingClientRect();
            indicator.style.left = `${lastR.right - rootRect.left - 2}px`;
          }
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (!dragging) return;
          cell.classList.remove('dg-dragging');
          if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);

          const unpinned = this._columns.filter(c => !c.hide && c.pinned !== 'left' && c.pinned !== 'right');
          const fromIdx = unpinned.indexOf(col);
          if (fromIdx === -1 || targetIndex === -1) return;
          const toIdx = targetIndex > fromIdx ? targetIndex - 1 : targetIndex;
          if (toIdx === fromIdx) return;

          /* reorder within the master column list */
          const master = this._columns;
          master.splice(master.indexOf(col), 1);
          const anchor = unpinned.filter(c => c !== col)[toIdx];
          if (anchor) master.splice(master.indexOf(anchor), 0, col);
          else master.push(col);
          this.refresh();
          this._emitter.emit('columnMoved', { colId: col.colId, toIndex: toIdx });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    /* ---- pagination ---- */

    _renderPaging() {
      if (!this._pagingEl) return;
      const info = this._pageInfo;
      this._pagingEl.innerHTML = '';

      const sizeWrap = el('div', 'dg-paging-page-size', this._pagingEl);
      const sizeLabel = el('span', null, sizeWrap);
      sizeLabel.textContent = this._t('pageSizeLabel');
      const sizeSel = el('select', null, sizeWrap);
      /* 현재 크기가 목록에 없으면 select가 빈 칸이 되므로 끼워 넣는다 */
      pageSizeSelectOptions(this._pageSizeOptions, this._pageSize).forEach(s => {
        const opt = el('option', null, sizeSel);
        opt.value = s;
        opt.textContent = s;
      });
      sizeSel.value = this._pageSize;
      sizeSel.addEventListener('change', () => { this.setPageSize(Number(sizeSel.value)); });

      const summary = el('span', 'dg-paging-row-summary', this._pagingEl);
      /* 로케일 문자열은 소비자가 준 값이므로 먼저 이스케이프하고, 그다음 토큰만
       * <strong>으로 감싼 숫자로 치환한다 (토큰 표기 `{from}`은 이스케이프에 걸리지 않음). */
      const summaryNums = {
        from: info.firstRow.toLocaleString(),
        to: info.lastRow.toLocaleString(),
        total: info.total.toLocaleString(),
      };
      summary.innerHTML = escapeHtml(this._t('pageSummary')).replace(
        /\{(from|to|total)\}/g,
        (match, key) => `<strong>${escapeHtml(summaryNums[key])}</strong>`
      );

      const btns = el('div', 'dg-paging-buttons', this._pagingEl);
      const mkBtn = (label, page, disabled, current, aria) => {
        const b = el('button', `dg-paging-btn${current ? ' dg-paging-current' : ''}`, btns);
        b.type = 'button';
        b.textContent = label;
        b.disabled = !!disabled;
        if (aria) b.setAttribute('aria-label', aria);
        if (!disabled && page !== null) b.addEventListener('click', () => { this.setPage(page); });
        return b;
      };

      mkBtn('«', 0, info.page === 0, false, this._t('firstPage'));
      mkBtn('‹', info.page - 1, info.page === 0, false, this._t('previousPage'));
      pageButtonModel(info.pageCount, info.page).forEach(p => {
        if (p === '…') mkBtn('…', null, true);
        else mkBtn(String(p + 1), p, false, p === info.page);
      });
      mkBtn('›', info.page + 1, info.page >= info.pageCount - 1, false, this._t('nextPage'));
      mkBtn('»', info.pageCount - 1, info.page >= info.pageCount - 1, false, this._t('lastPage'));
    }

    setPage(page) {
      if (!this._pagination) return;
      if (this._infinite) {
        /* 무한 스크롤에는 "지금 몇 페이지"가 없다 — 쌓인 전체가 한 화면이다.
         * 임의 페이지로 뛰면 누적이 통째로 버려지므로 조용히 하지 않고 알린다. */
        console.warn('[DataGrid] infiniteScroll에서는 setPage()를 쓸 수 없습니다 — 처음부터 다시 받으려면 reloadData()를 쓰세요.');
        return;
      }
      this._currentPage = page;
      this._focusedCell = null;
      this.refresh();
      this._bodyEl.scrollTop = 0;
      this._emitter.emit('paginationChanged', { page: this._currentPage, pageSize: this._pageSize });
      if (this._pageMode === 'server') this._fetchData(); /* 방금 이동한 페이지를 요청해야 한다 */
    }

    /**
     * 페이지 크기 변경. 무한 스크롤에서는 "한 번에 받을 행 수"가 되며,
     * 쌓인 것을 버리고 새 크기로 0페이지부터 다시 받는다(_fetchData가 리셋).
     */
    setPageSize(size) {
      if (!this._pagination) return;
      const firstVisible = this._pageInfo ? this._pageInfo.start : 0;
      this._pageSize = size;
      this._currentPage = Math.floor(firstVisible / size);
      this.refresh();
      this._emitter.emit('paginationChanged', { page: this._currentPage, pageSize: this._pageSize });
      if (this._pageMode === 'server') this._fetchData(); /* 위에서 계산한 페이지를 유지 */
    }

    /* ---- infinite scroll ---- */

    /**
     * 하단 상태 바 갱신 — "불러오는 중 / N건 불러옴 / 마지막 페이지" + 페이지 크기 선택.
     * 높이는 상태와 무관하게 고정이라 로드가 끝나도 그리드가 흔들리지 않는다.
     *
     * 요소를 새로 만들지 않고 값만 바꾼다 — 추가 로드가 끝날 때마다 DOM을 갈아끼우면
     * 열어둔 크기 드롭다운이 그 자리에서 닫힌다 (함정 8).
     */
    _renderInfiniteStatus() {
      const box = this._infiniteStatusEl;
      if (!box) return;
      const status = resolveInfiniteStatus({
        loading: this._loading || this._loadingMore,
        hasMore: this._hasMore,
        loaded: this._rows.length,
        total: this._serverTotalKnown ? this._serverTotal : null,
      });
      box.className = `dg-infinite-status dg-infinite-${status.kind}`;
      if (this._infiniteTextEl) {
        this._infiniteTextEl.innerHTML =
          (status.kind === 'loading' ? '<span class="dg-spinner"></span>' : '') +
          `<span>${escapeHtml(this._t(status.key, status.params))}</span>`;
      }
      this._syncInfiniteSizeSelect();
    }

    /** 크기 선택 select의 라벨·옵션·현재 값을 맞춘다 (목록이 그대로면 옵션은 건드리지 않음). */
    _syncInfiniteSizeSelect() {
      const sel = this._infiniteSizeSelEl;
      if (!sel) return;
      const label = this._t('pageSizeLabel');
      if (this._infiniteSizeLabelEl.textContent !== label) {
        this._infiniteSizeLabelEl.textContent = label;
        sel.setAttribute('aria-label', label);
      }
      const sizes = pageSizeSelectOptions(this._pageSizeOptions, this._pageSize);
      const key = sizes.join(',');
      if (this._infiniteSizeKey !== key) {
        this._infiniteSizeKey = key;
        sel.innerHTML = '';
        sizes.forEach(s => {
          const opt = el('option', null, sel);
          opt.value = s;
          opt.textContent = s;
        });
      }
      if (Number(sel.value) !== this._pageSize) sel.value = this._pageSize;
      /* 로드 중 크기를 바꾸면 방금 시작한 요청과 새 크기가 엇갈린다 */
      sel.disabled = !!(this._loading || this._loadingMore);
    }

    /**
     * 바닥 근처면 다음 페이지를 자동 조회한다. 호출자는 스크롤 핸들러와
     * 응답 처리 끝(첫 페이지가 뷰포트를 못 채운 경우 이어 받기).
     * 요청을 시작했으면 true.
     */
    _maybeLoadMore() {
      if (!this._infinite || this._destroyed) return false;
      /* 이어받기는 "0페이지가 이미 있다"를 전제로 다음 페이지를 요청한다. 첫 조회가
       * 아직 없으면(autoLoad: false, 또는 첫 조회 실패) 그 전제가 깨져서 page 1부터
       * 받아 0페이지가 통째로 비는 구멍이 생긴다 (BUG-013). */
      if (!this._loadedOnce) return false;
      const body = this._bodyEl;
      const go = shouldLoadMore({
        enabled: true,
        hasMore: this._hasMore,
        loading: this._loading || this._loadingMore,
        threshold: this._infiniteThreshold,
        scrollTop: body.scrollTop,
        clientHeight: body.clientHeight,
        scrollHeight: body.scrollHeight,
      });
      if (!go) return false;
      this._fetchData({ append: true });
      return true;
    }

    /**
     * 다음 페이지를 수동으로 불러온다 (스크롤 없이 "더 보기" 버튼 등).
     * 요청을 시작했으면 true — 이미 마지막이거나 로드 중이면 false.
     */
    loadMore() {
      if (!this._infinite || !this._hasMore || this._loading || this._loadingMore) return false;
      /* 아직 아무것도 안 받았으면(autoLoad: false) "다음 페이지"는 0페이지다 —
       * append로 보내면 0페이지를 건너뛴다 (BUG-013) */
      this._fetchData(this._loadedOnce ? { append: true } : undefined);
      return true;
    }

    /** 아직 더 받을 페이지가 있는가 (무한 스크롤이 아니면 항상 false). */
    hasMoreRows() {
      return !!(this._infinite && this._hasMore);
    }

    /* ---- overlays ---- */

    /**
     * 오버레이를 **본문 영역에만** 올린다 (BUG-015).
     * 루트 전체를 덮으면 타이틀·툴바·헤더가 반투명 막 아래로 들어가, 결과가 0건일 때
     * 컬럼 이름도 안 보이고 그리드가 통째로 비활성처럼 읽힌다. 정작 필터를 되돌릴
     * 수단(헤더 필터 메뉴·툴바 버튼)이 전부 그 막 아래다.
     * 높이는 CSS의 inset: 0이 준 bottom: 0을 그대로 쓴다 — top만 내리면 되고,
     * autoHeight처럼 본문이 짧은 레이아웃에서도 문구가 들어갈 자리가 남는다.
     */
    _positionOverlay() {
      if (!this._overlayEl || !this._bodyEl) return;
      this._overlayEl.style.top = `${this._bodyEl.offsetTop}px`;
    }

    _updateOverlay() {
      if (this._loading) return; /* keep loading overlay */
      if (this._viewRows.length === 0) {
        this._overlayEl.innerHTML =
          `<div class="dg-overlay-panel">${escapeHtml(this._t('noRowsToShow'))}</div>`;
        this._positionOverlay();
        this._overlayEl.hidden = false;
      } else {
        this._overlayEl.hidden = true;
      }
    }

    showLoadingOverlay() {
      this._loading = true;
      this._overlayEl.innerHTML =
        '<div class="dg-overlay-panel"><span class="dg-spinner"></span>' +
        `${escapeHtml(this._t('loading'))}</div>`;
      this._positionOverlay();
      this._overlayEl.hidden = false;
      this._renderInfiniteStatus(); /* 상태 바도 로딩 상태를 따라간다 */
    }

    hideLoadingOverlay() {
      this._loading = false;
      this._updateOverlay();
      this._renderInfiniteStatus();
    }

    /* ---- remote data source ---- */

    /**
     * dataSource에서 데이터를 다시 불러온다. **1페이지로 되돌린 뒤** 요청한다 —
     * 조회 조건이 바뀌어 호출하는 경우가 대부분이라, 페이지를 유지하면 결과가
     * 줄었을 때 범위 밖 페이지(빈 화면)에 머문다. 보던 페이지를 지켜야 하면
     * reloadData({ keepPage: true }).
     *
     * 정렬/필터/페이지 이동에 따른 내부 재조회는 각자 페이지를 관리하므로
     * 이 메서드가 아니라 _fetchData()를 직접 호출한다.
     */
    reloadData(opts) {
      const ds = this.options.dataSource;
      if (!ds || !ds.url || typeof fetch === 'undefined') return;
      /* 리셋은 요청 조립(_fetchData) 전에 — 그래야 page 파라미터도 0으로 나간다 */
      if (shouldResetPageOnReload(opts)) this._currentPage = 0;
      this._fetchData();
    }

    /**
     * 현재 상태 그대로 dataSource를 호출한다(페이지 리셋 없음). server 모드인 축의
     * 현재 상태(페이지·정렬·필터)가 요청 파라미터로 전달되고, 응답이 도착하면
     * 행을 교체하고 refresh한다. 경합은 마지막 요청만 반영한다.
     */
    _fetchData(fetchOpts) {
      const ds = this.options.dataSource;
      if (!ds || !ds.url || typeof fetch === 'undefined') return;
      /* append = 무한 스크롤의 다음 페이지 이어받기. append가 아니면 "처음부터 다시"이므로
       * 무한 스크롤 상태(페이지·더 있음)를 요청 조립 전에 되돌린다 — 정렬/필터가 바뀌면
       * 서버가 전체를 다시 정렬/필터하므로 쌓아둔 것을 들고 있을 수 없다. */
      const append = !!(fetchOpts && fetchOpts.append) && this._infinite;
      const prevPage = this._currentPage;
      if (this._infinite) {
        if (append) this._currentPage += 1;
        else { this._currentPage = 0; this._hasMore = true; }
      }
      const req = buildDataSourceRequest(ds, {
        pagination: this._pagination,
        page: this._currentPage,
        pageSize: this._pageSize,
        sortModel: this._sortModel,
        filterModel: this.getFilterModel(),
        quickFilter: this._quickFilter,
        sortMode: this._sortMode,
        filterMode: this._filterMode,
        pageMode: this._pageMode,
      });
      const opts = { method: req.method };
      const headers = {};
      let hasHeaders = false;
      if (req.body !== null) {
        headers['Content-Type'] = 'application/json'; /* 기본값 — dataSource.headers가 같은 키를 주면 덮어씀 */
        hasHeaders = true;
        opts.body = req.body;
      }
      if (req.headers) {
        for (const hk in req.headers) { headers[hk] = req.headers[hk]; hasHeaders = true; }
      }
      if (hasHeaders) opts.headers = headers;
      /* 추가 로드는 전면 오버레이를 띄우지 않는다 — 보고 있던 행이 매번 가려지면
       * 무한 스크롤이 아니라 페이지 이동처럼 느껴진다. 하단 상태 바가 대신 알린다. */
      if (append) { this._loadingMore = true; this._renderInfiniteStatus(); }
      else this.showLoadingOverlay();
      const seq = ++this._loadSeq;
      fetch(req.url, opts)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
          return r.json();
        })
        .then(json => {
          if (this._destroyed || seq !== this._loadSeq) return;
          let parsed;
          if (ds.parse) {
            try { parsed = ds.parse(json); }
            catch (e) {
              console.error('[DataGrid] dataSource.parse failed:', e);
              parsed = parseDataSourceResponse(json);
            }
          } else {
            parsed = parseDataSourceResponse(json);
          }
          const newRows = (parsed.rows || []).slice();
          this._serverTotal = parsed.total;
          /* "서버가 준 총건수"와 "없어서 rows.length로 채운 값"을 구분한다 —
           * 후자를 기지의 총계로 믿으면 무한 스크롤이 첫 페이지에서 끝나버린다.
           * 소비자 parse는 hasTotal을 모르므로 total이 숫자인지로 판단한다. */
          this._serverTotalKnown = parsed.hasTotal !== undefined
            ? !!parsed.hasTotal
            : typeof parsed.total === 'number';
          if (append) {
            this._rows = this._rows.concat(newRows); /* 누적 — 선택·추적·히스토리는 유지 */
          } else {
            this._loadedOnce = true; /* 이제 0페이지가 있다 — 이어받기의 전제가 성립 */
            this._rows = newRows;
            this._selection = {};
            this._focusedCell = null;
            this._lastClickedViewIndex = -1;
            this._resetTracking();
            this._undoStack = [];
            this._redoStack = [];
          }

          let reachedLast = false;
          if (this._infinite) {
            /* 플래그는 parse 반환값 → 원본 응답 순으로 찾는다. parse가 { rows, total }만
             * 만들어도 원본 json의 last/hasMore를 살릴 수 있게. */
            let explicit = readLastPageFlag(parsed);
            if (explicit === null) explicit = readLastPageFlag(json);
            const last = resolveLastPage({
              explicit,
              receivedCount: newRows.length,
              pageSize: this._pageSize,
              loaded: this._rows.length,
              total: this._serverTotalKnown ? this._serverTotal : null,
            });
            reachedLast = this._hasMore && last;
            this._hasMore = !last;
          }

          if (append) {
            this._loadingMore = false;
          } else {
            this.hideLoadingOverlay();
            /* 무한 스크롤의 비-append 조회는 "처음부터 다시"다 — 쌓인 걸 버렸는데
             * 스크롤 위치만 남으면 새 목록의 한복판에서 시작하게 된다.
             * (refresh 전에 옮겨야 렌더 창이 새 위치로 계산된다) */
            if (this._infinite) this._bodyEl.scrollTop = 0;
          }
          this.refresh(); /* 페이지는 유지 — 서버 페이징 이동 후 리셋되면 안 된다 */
          this._emitDataChanged();
          if (this._infinite) {
            if (append) {
              this._emitter.emit('rowsAppended', {
                rows: newRows,
                page: this._currentPage,
                loaded: this._rows.length,
                hasMore: this._hasMore,
              });
            }
            /* 마지막 도달은 전이에서 한 번만 */
            if (reachedLast) {
              this._emitter.emit('lastPageReached', {
                loaded: this._rows.length,
                total: this._serverTotalKnown ? this._serverTotal : null,
              });
            }
            /* 첫 페이지가 뷰포트를 못 채웠으면 이어 받는다 (스크롤이 안 생겨
             * scroll 이벤트가 영영 오지 않는 경우) */
            this._maybeLoadMore();
          }
        })
        .catch(err => {
          if (this._destroyed || seq !== this._loadSeq) return;
          console.error('[DataGrid] dataSource load failed:', err);
          /* 실패한 페이지는 되돌린다 — 그대로 두면 다음 시도가 그 페이지를 건너뛴다 */
          if (append) { this._currentPage = prevPage; this._loadingMore = false; this._renderInfiniteStatus(); }
          else this.hideLoadingOverlay();
          this._emitter.emit('dataLoadError', { error: err });
        });
    }

    /**
     * 원격 데이터 소스를 런타임에 교체하고 1페이지부터 다시 불러온다.
     * 조회 조건(파라미터)만 바뀌는 경우라면 dataSource.params를 함수로 두고
     * reloadData()를 호출하는 쪽이 가볍다.
     *
     * 새 소스가 autoLoad: false면 교체만 하고 조회하지 않는다 — "이 소스는 그리드가
     * 스스로 부르지 않는다"는 규칙이 생성 시점에만 적용되면 반쪽짜리가 된다.
     */
    setDataSource(dataSource) {
      this.options.dataSource = dataSource;
      this._loadedOnce = false; /* 새 소스 — 지금 들고 있는 행은 이 소스의 0페이지가 아니다 */
      if (shouldAutoLoad(dataSource)) this.reloadData(); /* reloadData가 1페이지로 되돌린다 */
    }

    /* ---- data API ---- */

    setRowData(rows) {
      this._rows = (rows || []).slice();
      this._selection = {};
      this._locks = emptyLockMap(); /* 잠금은 옛 행을 가리키던 값 — 새 데이터엔 기준이 없다 */
      this._currentPage = 0;
      this._lastClickedViewIndex = -1;
      this._focusedCell = null;
      this._treeExpanded = {}; /* 새 데이터 = 펼침 상태 초기화 (defaultExpandLevel 재적용) */
      this._treeLoading = {};
      this._treeLoaded = {};
      this._resetTracking(); /* 새 데이터 = 새 기준선 */
      this._undoStack = [];
      this._redoStack = [];
      this.refresh();
      this._emitDataChanged();
    }

    getRowData() { return this._rows.slice(); }
    getDisplayedRows() { return this._viewRows.slice(); }
    getDisplayedRowCount() { return this._viewRows.length; }

    /**
     * 행들을 추가한다. index를 주면 그 위치에 삽입(0 = 맨 앞), 생략하면 맨 뒤.
     * index는 원본 배열 기준 — 정렬/그룹핑이 켜져 있으면 표시 순서는 뷰 파이프라인이 결정한다.
     */
    addRows(rows, index) {
      this._rows = insertRowsAt(this._rows, rows, index);
      this._recordAdd(rows, index);
      this.refresh();
      this._emitDataChanged();
    }

    addRow(row, index) { this.addRows([row], index); }

    removeRows(rows) {
      const ids = {};

      /* softDelete: 기준선 행은 삭제 표시만(행 유지), 추가(신규) 행은 로우 자체 제거 */
      if (this._softDelete) {
        const parts = partitionStagedRemoval(rows, this._rows, this._addedRows, this._softDeletedRows);
        if (parts.hard.length > 0) {
          parts.hard.forEach(en => { ids[this._rowId(en.row)] = true; });
          this._rows = this._rows.filter(r => !ids[this._rowId(r)]);
          parts.hard.forEach(en => { delete this._selection[this._rowId(en.row)]; });
        }
        const staged = parts.hard.concat(parts.soft);
        if (staged.length > 0) this._recordRemove(staged);
        this.refresh();
        this._emitDataChanged();
        return;
      }

      const entries = [];
      rows.forEach(r => {
        const idx = this._rows.indexOf(r);
        if (idx !== -1) {
          entries.push({ row: r, index: idx, wasAdded: this._addedRows.includes(r) });
        }
        ids[this._rowId(r)] = true;
      });
      this._rows = this._rows.filter(r => !ids[this._rowId(r)]);
      rows.forEach(r => { delete this._selection[this._rowId(r)]; });
      if (entries.length > 0) this._recordRemove(entries);
      this.refresh();
      this._emitDataChanged();
    }

    /** softDelete로 삭제 표시된 행을 복원한다. 복원된 행 수를 반환. */
    restoreRows(rows) {
      if (!this._softDelete) return 0;
      const entries = [];
      (rows || []).forEach(r => {
        if (!this._isRowDeleted(r)) return;
        for (let i = 0; i < this._deletedRows.length; i++) {
          if (this._deletedRows[i].row === r) { entries.push(this._deletedRows[i]); return; }
        }
      });
      if (entries.length === 0) return 0;
      this._untrackRemove(entries);
      this._pushHistory({ type: 'restore', entries: entries.slice() });
      this.refresh();
      this._emitDataChanged();
      return entries.length;
    }

    /** 추적 상태 기준 행 상태: 'added' | 'updated' | 'deleted' | null. */
    getRowStatus(row) {
      if (this._isRowDeleted(row)) return 'deleted';
      if (this._addedRows.includes(row)) return 'added';
      if (this._updatedRows.includes(row)) return 'updated';
      return null;
    }

    removeSelectedRows() {
      this.removeRows(this.getSelectedRows());
      this._emitSelection();
    }

    updateRow(row, changes) {
      for (const k in changes) {
        if (row[k] !== changes[k]) this._recordUpdate(row, k, row[k], changes[k]);
        row[k] = changes[k];
      }
      this.refresh();
      this._emitDataChanged();
    }

    setColumnVisible(colId, visible) {
      const col = this._columns.find(c => c.colId === colId || c.field === colId);
      if (col) {
        col.hide = !visible;
        this.refresh();
      }
    }

    getColumns() { return this._columns.slice(); }

    setTheme(theme) {
      this._rootEl.classList.toggle('dg-theme-dark', theme === 'dark');
    }

    /**
     * 그리드 전체 인터랙션을 잠근다/푼다. 잠그면 반투명 오버레이가 마우스를
     * 가로막고 키보드 입력도 무시된다 (저장 중 등 일시적 비활성용).
     */
    setEnabled(enabled) {
      this._enabled = enabled !== false;
      if (!this._enabled) this._cancelEdit();
      this._rootEl.classList.toggle('dg-disabled', !this._enabled);
    }

    isEnabled() { return this._enabled !== false; }

    /* ---- change tracking (trackChanges) + undo/redo ---- */

    _resetTracking() {
      this._originals = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
      this._updatedRows = [];
      this._addedRows = [];
      this._deletedRows = []; /* { row, index, wasAdded, soft? } */
      this._softDeletedRows = []; /* soft 엔트리의 행 (렌더/차단용 빠른 조회) */
    }

    /** softDelete로 삭제 표시된(그리드에 남아 있는) 행인가. */
    _isRowDeleted(row) {
      return this._softDeletedRows.includes(row);
    }

    /* -- 추적 상태만 갱신 (히스토리와 분리 — undo/redo도 재사용) -- */

    _trackUpdate(row, field, oldValue, newValue) {
      if (!this._trackChanges || !this._originals) return;
      if (this._addedRows.includes(row)) return; /* 새 행의 수정은 added로 충분 */
      let orig = this._originals.get(row);
      if (!orig) { orig = {}; this._originals.set(row, orig); }
      if (!(field in orig)) orig[field] = oldValue;
      else if (orig[field] === newValue) delete orig[field]; /* 원래 값 복귀 → dirty 해제 */
      let hasDirty = false;
      for (const k in orig) { hasDirty = true; break; }
      const idx = this._updatedRows.indexOf(row);
      if (hasDirty && idx === -1) this._updatedRows.push(row);
      else if (!hasDirty && idx !== -1) this._updatedRows.splice(idx, 1);
    }

    _trackAdd(rows) {
      if (!this._trackChanges) return;
      rows.forEach(r => {
        if (!this._addedRows.includes(r)) this._addedRows.push(r);
      });
    }

    _trackRemove(entries) {
      if (!this._trackChanges) return;
      entries.forEach(en => {
        const ai = this._addedRows.indexOf(en.row);
        if (ai !== -1) this._addedRows.splice(ai, 1); /* 추가 후 삭제 = 흔적 없음 */
        else {
          this._deletedRows.push(en);
          if (en.soft && !this._softDeletedRows.includes(en.row)) {
            this._softDeletedRows.push(en.row);
          }
        }
        const ui = this._updatedRows.indexOf(en.row);
        if (ui !== -1) this._updatedRows.splice(ui, 1); /* 수정 이력은 삭제에 흡수 */
      });
    }

    _untrackAdd(rows) {
      if (!this._trackChanges) return;
      rows.forEach(r => {
        const i = this._addedRows.indexOf(r);
        if (i !== -1) this._addedRows.splice(i, 1);
      });
    }

    _untrackRemove(entries) {
      if (!this._trackChanges) return;
      entries.forEach(en => {
        if (en.wasAdded) {
          if (!this._addedRows.includes(en.row)) this._addedRows.push(en.row);
          return;
        }
        const si = this._softDeletedRows.indexOf(en.row);
        if (si !== -1) this._softDeletedRows.splice(si, 1);
        for (let i = 0; i < this._deletedRows.length; i++) {
          if (this._deletedRows[i].row === en.row) { this._deletedRows.splice(i, 1); return; }
        }
      });
    }

    /* -- 기록 = 추적 + 히스토리 푸시 -- */

    _pushHistory(action) {
      if (!this._undoRedo || this._historyMuted) return;
      this._undoStack.push(action);
      this._redoStack = [];
    }

    _recordUpdate(row, field, oldValue, newValue) {
      this._trackUpdate(row, field, oldValue, newValue);
      this._pushHistory({ type: 'update', row, field, oldValue, newValue });
    }

    _recordAdd(rows, index) {
      this._trackAdd(rows);
      this._pushHistory({ type: 'add', rows: rows.slice(), index });
    }

    _recordRemove(entries) {
      this._pushHistory({ type: 'remove', entries: entries.slice() }); /* wasAdded는 추적 갱신 전에 캡처됨 */
      this._trackRemove(entries);
    }

    /* -- 공개 API -- */

    /** 마지막 commit/setRowData 이후의 변경 묶음. */
    getChanges() {
      return {
        added: this._addedRows.slice(),
        updated: this._updatedRows.slice(),
        deleted: this._deletedRows.map(d => d.row),
      };
    }

    isDirty() {
      return this._addedRows.length > 0 || this._updatedRows.length > 0 || this._deletedRows.length > 0;
    }

    /**
     * 현재 상태를 새 기준선으로 확정한다 (dirty 표시·변경 목록 초기화).
     * softDelete로 삭제 표시된 행은 이 시점에 물리 제거된다
     * (물리 제거를 가로지르는 undo는 지원하지 않으므로 히스토리도 비운다).
     */
    commitChanges() {
      const softRows = this._softDeletedRows.slice();
      if (softRows.length > 0) {
        const ids = {};
        softRows.forEach(r => { ids[this._rowId(r)] = true; });
        this._rows = this._rows.filter(r => !ids[this._rowId(r)]);
        softRows.forEach(r => { delete this._selection[this._rowId(r)]; });
        this._undoStack = [];
        this._redoStack = [];
      }
      this._resetTracking();
      this.refresh();
      if (softRows.length > 0) this._emitDataChanged();
    }

    /** 모든 변경을 기준선으로 되돌린다: 수정 값 원복, 추가 행 제거, 삭제 행 복원. */
    rollbackChanges() {
      if (this._originals) {
        this._updatedRows.forEach(row => {
          const orig = this._originals.get(row);
          for (const f in orig) row[f] = orig[f];
        });
      }
      this._addedRows.forEach(r => { delete this._selection[this._rowId(r)]; });
      /* soft 삭제 행은 이미 제자리에 있으므로 hard 엔트리만 재삽입한다 */
      this._rows = rollbackRows(
        this._rows,
        this._addedRows,
        this._deletedRows.filter(en => !en.soft)
      );
      this._resetTracking();
      this._undoStack = []; /* 롤백을 가로지르는 undo는 지원하지 않는다 */
      this._redoStack = [];
      this.refresh();
      this._emitDataChanged();
    }

    canUndo() { return this._undoStack.length > 0; }
    canRedo() { return this._redoStack.length > 0; }

    /** 마지막 변경(셀 수정·행 추가·행 삭제)을 되돌린다. 되돌렸으면 true. */
    undo() {
      if (!this._undoRedo || this._undoStack.length === 0) return false;
      const a = this._undoStack.pop();
      if (a.type === 'update') {
        a.row[a.field] = a.oldValue;
        this._trackUpdate(a.row, a.field, a.newValue, a.oldValue);
      } else if (a.type === 'add') {
        this._rows = this._rows.filter(r => !a.rows.includes(r));
        a.rows.forEach(r => { delete this._selection[this._rowId(r)]; });
        this._untrackAdd(a.rows);
      } else if (a.type === 'remove') {
        /* soft 엔트리는 표시만 해제(행은 이미 제자리), hard 엔트리만 재삽입 */
        const hardEntries = a.entries.filter(en => !en.soft);
        if (hardEntries.length > 0) this._rows = rollbackRows(this._rows, [], hardEntries);
        this._untrackRemove(a.entries);
      } else if (a.type === 'restore') {
        this._trackRemove(a.entries); /* 복원 취소 = 다시 삭제 표시 */
      }
      this._redoStack.push(a);
      this.refresh();
      this._emitDataChanged();
      return true;
    }

    /** undo로 되돌린 변경을 다시 적용한다. 적용했으면 true. */
    redo() {
      if (!this._undoRedo || this._redoStack.length === 0) return false;
      const a = this._redoStack.pop();
      if (a.type === 'update') {
        a.row[a.field] = a.newValue;
        this._trackUpdate(a.row, a.field, a.oldValue, a.newValue);
      } else if (a.type === 'add') {
        this._rows = insertRowsAt(this._rows, a.rows, a.index); /* 원래 삽입 위치 유지 */
        this._trackAdd(a.rows);
      } else if (a.type === 'remove') {
        /* hard 엔트리만 물리 제거, soft 엔트리는 다시 삭제 표시 */
        const hardEntries = a.entries.filter(en => !en.soft);
        if (hardEntries.length > 0) {
          const ids = {};
          hardEntries.forEach(en => { ids[this._rowId(en.row)] = true; });
          this._rows = this._rows.filter(r => !ids[this._rowId(r)]);
          hardEntries.forEach(en => { delete this._selection[this._rowId(en.row)]; });
        }
        this._trackRemove(a.entries);
      } else if (a.type === 'restore') {
        this._untrackRemove(a.entries); /* 복원 재적용 = 삭제 표시 해제 */
      }
      this._undoStack.push(a);
      this.refresh();
      this._emitDataChanged();
      return true;
    }

    /* ---- grid state save / restore ---- */

    /**
     * 현재 그리드 상태(컬럼 순서·숨김·사용자 지정 폭, 정렬, 필터, 퀵 필터,
     * 그룹핑, 페이지)를 JSON 직렬화 가능한 객체로 반환한다.
     * localStorage 등에 저장했다가 setState()로 복원한다.
     */
    getState() {
      const state = {
        columns: this._columns.map(c => {
          const entry = { colId: c.colId, hide: !!c.hide };
          if (this._colWidths[c.colId] !== undefined) entry.width = this._colWidths[c.colId];
          return entry;
        }),
        sortModel: this._sortModel.slice(),
        filterModel: this.getFilterModel(),
        quickFilter: this._quickFilter,
        groupBy: this._groupBy.slice(),
      };
      if (this._pagination) {
        state.pagination = { page: this._currentPage, pageSize: this._pageSize };
      }
      return state;
    }

    /**
     * getState()가 반환한 상태를 복원한다. 상태에 포함된 부분만 적용하며
     * (부분 상태 허용), 알 수 없는 colId는 무시한다. 마지막에 refresh() 1회.
     */
    setState(state) {
      if (!state) return;
      if (state.columns) {
        const applied = applyColumnState(this._columns, state.columns);
        this._columns = applied.columns;
        this._columns.forEach(c => {
          if (applied.hidden[c.colId] !== undefined) c.hide = applied.hidden[c.colId];
        });
        for (const colId in applied.widths) this._colWidths[colId] = applied.widths[colId];
      }
      if (state.sortModel) this._sortModel = state.sortModel.slice();
      if (state.filterModel) {
        this._filterModel = {};
        for (const f in state.filterModel) this._filterModel[f] = state.filterModel[f];
      }
      if (state.quickFilter !== undefined) this._quickFilter = state.quickFilter || '';
      if (state.groupBy) {
        this._groupBy = state.groupBy.slice();
        this._groupToggled = {};
      }
      if (state.pagination && this._pagination) {
        if (state.pagination.pageSize) this._pageSize = state.pagination.pageSize;
        if (state.pagination.page !== undefined) this._currentPage = state.pagination.page;
      }
      this._focusedCell = null;
      this.refresh();
      this._emitter.emit('stateChanged', { state: this.getState() });
    }

    /**
     * 상태를 생성 시점 옵션 기준으로 되돌린다. 인자가 없으면 전체 리셋,
     * { filter, sort, group, columns, page } 중 true인 부분만 선택 리셋.
     */
    resetState(parts) {
      const all = !parts;
      parts = parts || {};
      if (all || parts.sort) {
        this._sortModel = this.options.sortModel ? this.options.sortModel.slice() : [];
      }
      if (all || parts.filter) {
        this._filterModel = {};
        this._quickFilter = '';
        this._currentPage = 0;
      }
      if (all || parts.group) {
        this._groupBy = (this.options.groupBy || []).slice();
        this._groupToggled = {};
        this._groupDefaultExpanded = this.options.groupDefaultExpanded !== false;
      }
      if (all || parts.columns) {
        this._columns = this._buildColumns();
        this._colWidths = {};
      }
      if (all || parts.page) {
        this._currentPage = 0;
        this._pageSize = this.options.paginationPageSize || 20;
      }
      this._focusedCell = null;
      this.refresh();
      this._emitter.emit('stateChanged', { state: this.getState() });
    }

    /* ---- CSV / Excel export ---- */

    /** 내보내기 대상 컬럼: exportFormatter가 있으면 valueFormatter를 대체한 사본. */
    _exportColumns() {
      return this._visibleColumns()
        .filter(c => c.field !== undefined)
        .map(c => {
          if (!c.exportFormatter) return c;
          const copy = {};
          for (const k in c) copy[k] = c[k];
          copy.valueFormatter = c.exportFormatter;
          return copy;
        });
    }

    /** beforeExport(취소 가능·rows/columns/filename 가공 가능)를 거친 내보내기 준비. */
    _prepareExport(format, filename) {
      const evt = {
        format,
        filename,
        rows: this._viewRows.slice(),
        columns: this._exportColumns(),
        cancel: false,
      };
      this._emitter.emit('beforeExport', evt);
      return evt.cancel ? null : evt;
    }

    _downloadBlob(blob, filename) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }

    getCsv() {
      return buildCsv(this._viewRows, this._exportColumns());
    }

    /**
     * 필터·정렬이 적용된 현재 뷰를 JSON 문자열로 반환한다.
     * 표시 중인 컬럼의 field만 포함하며 값은 원시 데이터(포매터 미적용).
     */
    getJson() {
      const cols = this._visibleColumns().filter(c => c.field !== undefined);
      return JSON.stringify(buildJsonRows(this._viewRows, cols));
    }

    exportCsv(filename) {
      const prep = this._prepareExport('csv', filename || 'export.csv');
      if (!prep) return;
      const csv = buildCsv(prep.rows, prep.columns);
      this._downloadBlob(
        new Blob([`${csv}`], { type: 'text/csv;charset=utf-8;' }),
        prep.filename
      );
    }

    /**
     * 현재 뷰를 .xlsx 파일로 다운로드한다 (의존성 없는 무압축 ZIP +
     * SpreadsheetML — 포매터가 없는 숫자는 숫자 셀로 나가 엑셀에서 바로 계산 가능).
     */
    exportExcel(filename, sheetName) {
      const prep = this._prepareExport('xlsx', filename || 'export.xlsx');
      if (!prep) return;
      const zip = makeZip(buildXlsxParts(prep.rows, prep.columns, sheetName));
      this._downloadBlob(
        new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        prep.filename
      );
    }

    /* ---- teardown ---- */

    destroy() {
      if (this._destroyed) return;
      this._popupTeardown(false);
      this._destroyed = true;
      this._closeMenu();
      if (this._resizeObserver) this._resizeObserver.disconnect();
      this._docListeners.forEach(l => { document.removeEventListener(l[0], l[1]); });
      /* fill 모드에서 우리가 올린 컨테이너 position은 되돌린다 */
      if (this._containerPositionSet) {
        this._container.style.position = '';
        this._containerPositionSet = false;
      }
      if (this._rootEl.parentNode) this._rootEl.parentNode.removeChild(this._rootEl);
    }
  }

  /* ---------------------------------------------------------------------------
   * Built-in cell renderers
   * ------------------------------------------------------------------------- */

  /* select/radio/searchselect 렌더러 공용 팩토리 — 저장된 value를 editorOptions의
   * label로. 정적 목록에 없으면 lazy 검색(editorSearch.fetch)에서 골랐던 label
   * 캐시(params.optionLabels)를 본다. */
  function optionLabelRenderer(options) {
    return params => {
      let label = lookupOptionLabel(
        options || (params.colDef && params.colDef.editorOptions), params.value);
      if (label === null) label = cachedOptionLabel(params.optionLabels, params.value);
      if (label !== null) return escapeHtml(label);
      const v = params.formatted;
      return v === null || v === undefined ? '' : escapeHtml(String(v));
    };
  }

  DataGrid.renderers = {
    /**
     * Colored status tag/badge. colorMap: { 'Paid': 'green', 'Overdue': 'red' }
     * Usage: cellRenderer: DataGrid.renderers.tag({ Paid: 'green' })
     */
    tag(colorMap) {
      return params => {
        const v = params.formatted === null || params.formatted === undefined ? '' : String(params.formatted);
        if (v === '') return '';
        const color = (colorMap && colorMap[String(params.value)]) || 'gray';
        return `<span class="dg-tag dg-tag-${escapeHtml(color)}">${escapeHtml(v)}</span>`;
      };
    },
    /** ✓ / – for booleans */
    check() {
      return params => params.value
        ? '<span style="color:#0d8a44;font-weight:700">✓</span>'
        : '<span style="opacity:.35">–</span>';
    },
    /** Simple progress bar for 0–100 values */
    progress() {
      return params => {
        const v = clamp(Number(params.value) || 0, 0, 100);
        return `<div style="display:flex;align-items:center;gap:8px;width:100%"><div style="flex:1;height:6px;border-radius:3px;background:var(--dg-chip-background-color);overflow:hidden"><div style="width:${v}%;height:100%;border-radius:3px;background:var(--dg-accent-color)"></div></div><span style="font-size:12px;color:var(--dg-secondary-foreground-color)">${v}%</span></div>`;
      };
    },
    /**
     * select 에디터 짝꿍 — 셀에 저장된 value를 editorOptions의 label로 표시.
     * options를 생략하면 그 컬럼의 editorOptions를 그대로 사용한다.
     * 목록에 없는 값은 기존 표시(formatted)로 폴백.
     * Usage: { editor: 'select', editorOptions: [{ label: '한국', value: 'kr' }],
     *          cellRenderer: DataGrid.renderers.select() }
     */
    select: optionLabelRenderer,
    /** radio 에디터 짝꿍 — select와 동일하게 value → label. */
    radio: optionLabelRenderer,
    /**
     * 검색형 select(editorSearch) 짝꿍 — select와 동일하게 value → label을
     * 표시하되, lazy 검색으로 고른(정적 editorOptions에 없는) 값도 선택 당시의
     * label로 표시한다. 컬럼 재구성(setColumns 등) 후에는 캐시가 비므로
     * 그런 값은 원시 값으로 폴백된다.
     */
    searchselect: optionLabelRenderer,
    /**
     * multiselect 에디터 짝꿍 — 값 배열을 label 칩 목록으로 표시.
     * 배열과 콤마 구분 문자열을 모두 받는다(v2.21).
     * 정적 editorOptions에 없는 값은 lazy 검색(editorSearch.fetch)으로 고를 당시의
     * label 캐시를 보고(v2.25 — 단일 값 쪽 `searchselect`와 같은 출처),
     * 캐시에도 없으면 값 그대로 칩이 된다. 빈 배열/null은 빈 셀.
     */
    multiselect(options) {
      return params => {
        const labels = lookupOptionLabelsWith(
          options || (params.colDef && params.colDef.editorOptions),
          params.value, params.optionLabels);
        return labels.map(l => `<span class="dg-tag dg-tag-plain">${escapeHtml(l)}</span>`).join(' ');
      };
    },
    /**
     * checkbox 에디터 짝꿍 — 값을 실제 체크박스 모양으로 표시 (표시 전용).
     * options = { checked, unchecked } 매핑 (생략 시 컬럼 editorOptions →
     * 그것도 없으면 불리언/Y·N/0·1 관용 판정).
     * disabled가 아니라 pointer-events: none — disabled 폼 요소는 마우스
     * 이벤트를 삼켜서 셀 더블클릭 편집이 막힌다 (BUG-006).
     */
    checkbox(options) {
      return params => {
        const opts = options ||
          (params.colDef && params.colDef.editorOptions &&
            typeof params.colDef.editorOptions === 'object' &&
            !Array.isArray(params.colDef.editorOptions)
            ? params.colDef.editorOptions : null);
        return `<input type="checkbox" class="dg-checkbox dg-checkbox-display" tabindex="-1"${isCheckedValue(params.value, opts) ? ' checked' : ''}>`;
      };
    },
  };

  /** 선언적 포맷 유틸 — column.format과 같은 패턴을 어디서나 사용. */
  DataGrid.format = formatValue;

  DataGrid.version = '2.27.1';

  /**
   * 내장 로케일. `localeText: DataGrid.locales.ko`처럼 통째로 쓰거나,
   * `{ ...DataGrid.locales.ko, noRowsToShow: '직원이 없습니다' }`로 일부만 덮어쓴다.
   * 사본을 넘기므로 소비자가 수정해도 원본은 안전하다.
   */
  DataGrid.locales = {
    get en() { return Object.assign({}, LOCALE_EN); },
    get ko() { return Object.assign({}, LOCALE_KO); },
  };

  /* Internals exposed for headless unit tests (not part of the public API). */
  DataGrid._test = {
    LOCALE_EN,
    LOCALE_KO,
    interpolate,
    resolveLocaleText,
    defaultComparator,
    typeComparator,
    parseLocalDate,
    toDateInputValue,
    parseDateInputValue,
    editValueEquals,
    defaultEditorType,
    shouldShowEditableIcon,
    isBlankValue,
    isRequiredViolated,
    shouldShowRequired,
    shouldMarkRequiredCell,
    emptyLockMap,
    isRowLocked,
    isCellLocked,
    setRowLocks,
    setCellLocks,
    isCellEditableNow,
    resolveDomLayout,
    resolveDataModes,
    shouldResetPageOnReload,
    shouldAutoLoad,
    resolveInfiniteScroll,
    pageSizeSelectOptions,
    shouldLoadMore,
    readLastPageFlag,
    resolveLastPage,
    resolveInfiniteStatus,
    formatNumber,
    formatDate,
    formatValue,
    sortRows,
    buildFilterPredicate,
    filterRows,
    quickFilterRows,
    buildFloatingFilterModel,
    validationMessage,
    normalizeEditorOptions,
    filterEditorOptions,
    resolveSearchEnterAction,
    lookupOptionLabel,
    lookupOptionLabels,
    lookupOptionLabelsWith,
    multiValueIndex,
    toggleMultiValue,
    isCheckedValue,
    normalizeMultiValue,
    denormalizeMultiValue,
    sameEditValue,
    shallowArrayEquals,
    buildTsv,
    parseTsv,
    aggregateValues,
    buildGroupView,
    paginate,
    pageButtonModel,
    csvEscape,
    buildCsv,
    buildJsonRows,
    insertRowsAt,
    applyValueGetters,
    rollbackRows,
    findNextMatch,
    fillSeries,
    computeMergeContinuation,
    computeMergeSpans,
    buildTreeNodes,
    collectTreeNodes,
    filterTreeNodes,
    sortTreeNodes,
    flattenTreeNodes,
    applyTreeCheck,
    deriveTreeCheckStates,
    subtreeFullyChecked,
    computeTreeSummary,
    normalizeColumnGroups,
    buildGroupHeaderRows,
    buildQueryString,
    buildDataSourceRequest,
    parseDataSourceResponse,
    computeRowTops,
    computeAutoHeights,
    computeTopsFromHeights,
    findRowAtOffset,
    crc32,
    makeZip,
    buildWorksheetXml,
    buildXlsxParts,
    normalizeColumns,
    resolveHeaderClass,
    resolveStatusColumnConfig,
    resolvePopupEditorConfig,
    resolvePopupButtons,
    buildPopupFields,
    diffPopupValues,
    validatePopupValues,
    partitionStagedRemoval,
    applyColumnState,
    computeColumnWidths,
    computeColumnWindow,
    escapeHtml,
  };

  global.DataGrid = DataGrid;
})(typeof window !== 'undefined' ? window : globalThis);
