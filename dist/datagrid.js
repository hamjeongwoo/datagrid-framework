/* =============================================================================
 * DataGrid — a dependency-free datagrid framework in pure JavaScript.
 *
 * No module system: load with a plain <script> tag; the constructor is
 * exposed as `DataGrid` on window (or globalThis in Node, for testing).
 *
 *   var grid = new DataGrid(containerEl, {
 *     columnDefs: [{ field: 'name', headerName: 'Name', sortable: true }],
 *     rowData: [{ name: 'Alice' }],
 *   });
 * ============================================================================= */
(function (global) {
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

  function el(tag, className, parent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  var SORT_ICON_SVG =
    '<svg class="dg-sort-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M8 3v10M8 3L4 7M8 3l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var FILTER_ICON_SVG =
    '<svg class="dg-filter-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M1.5 2.5h13l-5 6v4.2l-3 1.3V8.5l-5-6z"/></svg>';
  var MENU_ICON_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<path d="M2 4.5h12v1.4H2zM2 7.3h12v1.4H2zM2 10.1h12v1.4H2z"/></svg>';
  var CHEVRON_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">' +
    '<path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------------------------------------------------------------------
   * Pure data logic (DOM-free, unit-testable in Node)
   * ------------------------------------------------------------------------- */

  function defaultComparator(a, b) {
    var aNil = a === null || a === undefined || a === '';
    var bNil = b === null || b === undefined || b === '';
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
      return function (a, b) {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        var x = Number(a), y = Number(b);
        if (isNaN(x) && isNaN(y)) return 0;
        if (isNaN(x)) return 1;
        if (isNaN(y)) return -1;
        return x - y;
      };
    }
    if (dataType === 'date') {
      return function (a, b) {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        var x = a instanceof Date ? a.getTime() : new Date(a).getTime();
        var y = b instanceof Date ? b.getTime() : new Date(b).getTime();
        if (isNaN(x) && isNaN(y)) return 0;
        if (isNaN(x)) return 1;
        if (isNaN(y)) return -1;
        return x - y;
      };
    }
    if (dataType === 'bool') {
      return function (a, b) {
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
    var n = Number(value);
    if (isNaN(n)) return String(value);
    var m = String(pattern).match(/[#0][#0,.]*/);
    if (!m) return String(value);
    var mask = m[0].replace(/[,.]+$/, ''); /* 마스크 끝의 구분자는 리터럴 접미로 */
    var prefix = String(pattern).slice(0, m.index);
    var suffix = String(pattern).slice(m.index + mask.length);
    var dot = mask.indexOf('.');
    var intMask = dot === -1 ? mask : mask.slice(0, dot);
    var decMask = dot === -1 ? '' : mask.slice(dot + 1);
    var neg = n < 0;
    var fixed = Math.abs(n).toFixed(decMask.length);
    var parts = fixed.split('.');
    var intStr = parts[0];
    var decStr = parts[1] || '';
    var minDec = (decMask.match(/0/g) || []).length;
    while (decStr.length > minDec && decStr.charAt(decStr.length - 1) === '0') {
      decStr = decStr.slice(0, -1);
    }
    var minInt = (intMask.match(/0/g) || []).length;
    while (intStr.length < minInt) intStr = '0' + intStr;
    if (intMask.indexOf(',') !== -1) {
      intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return (neg ? '-' : '') + prefix + intStr + (decStr ? '.' + decStr : '') + suffix;
  }

  /**
   * 날짜 포맷: yyyy/yy/MM/dd/HH/mm/ss 토큰 치환. Date 인스턴스 또는
   * Date로 해석 가능한 문자열/숫자를 받는다. 해석 불가면 원본 문자열 반환.
   */
  function formatDate(value, pattern) {
    if (value === null || value === undefined || value === '') return '';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    function p2(x) { return x < 10 ? '0' + x : String(x); }
    return String(pattern)
      .replace(/yyyy/g, String(d.getFullYear()))
      .replace(/yy/g, String(d.getFullYear()).slice(-2))
      .replace(/MM/g, p2(d.getMonth() + 1))
      .replace(/dd/g, p2(d.getDate()))
      .replace(/HH/g, p2(d.getHours()))
      .replace(/mm/g, p2(d.getMinutes()))
      .replace(/ss/g, p2(d.getSeconds()));
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
    var indexed = rows.map(function (row, i) { return { row: row, i: i }; });
    indexed.sort(function (x, y) {
      for (var s = 0; s < sortModel.length; s++) {
        var field = sortModel[s].field;
        var dir = sortModel[s].dir === 'desc' ? -1 : 1;
        var cmp = comparators[field] || defaultComparator;
        var r = cmp(x.row[field], y.row[field], x.row, y.row);
        if (r !== 0) return r * dir;
      }
      return x.i - y.i;
    });
    return indexed.map(function (e) { return e.row; });
  }

  /**
   * Builds a predicate for one column filter model.
   * model: { type: 'text'|'number'|'set', op, value, valueTo, values }
   */
  function buildFilterPredicate(field, model) {
    if (!model) return null;
    if (model.type === 'set') {
      var allowed = {};
      (model.values || []).forEach(function (v) { allowed[String(v)] = true; });
      return function (row) { return allowed[String(row[field])] === true; };
    }
    if (model.type === 'number') {
      var num = Number(model.value);
      var numTo = Number(model.valueTo);
      return function (row) {
        var v = row[field];
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
    var needle = String(model.value === undefined || model.value === null ? '' : model.value).toLowerCase();
    return function (row) {
      var raw = row[field];
      var hay = (raw === null || raw === undefined ? '' : String(raw)).toLowerCase();
      switch (model.op) {
        case 'equals': return hay === needle;
        case 'notEqual': return hay !== needle;
        case 'startsWith': return hay.indexOf(needle) === 0;
        case 'endsWith': return needle.length === 0 || hay.slice(-needle.length) === needle;
        case 'notContains': return hay.indexOf(needle) === -1;
        case 'contains':
        default: return hay.indexOf(needle) !== -1;
      }
    };
  }

  /** filterModel: { field: model } — AND across columns. Returns a new array. */
  function filterRows(rows, filterModel) {
    var predicates = [];
    for (var field in filterModel) {
      if (Object.prototype.hasOwnProperty.call(filterModel, field)) {
        var p = buildFilterPredicate(field, filterModel[field]);
        if (p) predicates.push(p);
      }
    }
    if (predicates.length === 0) return rows.slice();
    return rows.filter(function (row) {
      for (var i = 0; i < predicates.length; i++) {
        if (!predicates[i](row)) return false;
      }
      return true;
    });
  }

  /** Case-insensitive match against the given fields' values. */
  function quickFilterRows(rows, text, fields) {
    var needle = String(text || '').trim().toLowerCase();
    if (!needle) return rows.slice();
    var terms = needle.split(/\s+/);
    return rows.filter(function (row) {
      var hay = fields
        .map(function (f) {
          var v = row[f];
          return v === null || v === undefined ? '' : String(v);
        })
        .join(' ')
        .toLowerCase();
      for (var t = 0; t < terms.length; t++) {
        if (hay.indexOf(terms[t]) === -1) return false;
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
      var s = v === null || v === undefined ? '' : String(v);
      if (/[\t\r\n"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    return rows
      .map(function (row) {
        return columns.map(function (c) { return esc(row[c.field]); }).join('\t');
      })
      .join('\r\n');
  }

  /**
   * TSV 텍스트 → 2차원 문자열 배열. 큰따옴표 셀(내부 탭/개행/"" 이스케이프)을
   * 지원하고, 스프레드시트가 붙이는 마지막 빈 줄 하나는 무시한다.
   */
  function parseTsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    var i = 0;
    var s = String(text);
    while (i < s.length) {
      var ch = s[i];
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
    var last = rows[rows.length - 1];
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
    var out = [];
    options.forEach(function (opt) {
      if (opt === null || opt === undefined) return;
      if (typeof opt === 'object') {
        var value = opt.value !== undefined ? opt.value : opt.label;
        if (value === undefined) return;
        var label = opt.label !== undefined && opt.label !== null ? opt.label : value;
        out.push({ label: String(label), value: value });
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
    var list = normalizeEditorOptions(options);
    var i;
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
      var s = value.toLowerCase();
      if (s === 'y' || s === 'yes' || s === 'true' || s === '1') return true;
      if (s === 'n' || s === 'no' || s === 'false' || s === '0' || s === '') return false;
    }
    return !!value;
  }

  /** multiselect 값 정규화: 배열 그대로, null/undefined → [], 단일 값 → [값]. */
  function normalizeMultiValue(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  /** 두 배열의 얕은 동등성 (길이·순서 포함 엄격 비교). 배열이 아니면 false. */
  function shallowArrayEquals(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * 다중 값 → label 배열 (multiselect 렌더러용).
   * 목록에서 못 찾은 값은 문자열 그대로, null/undefined 항목은 건너뛴다.
   */
  function lookupOptionLabels(options, values) {
    var out = [];
    normalizeMultiValue(values).forEach(function (v) {
      if (v === null || v === undefined) return;
      var label = lookupOptionLabel(options, v);
      out.push(label !== null ? label : String(v));
    });
    return out;
  }

  /**
   * 검색형 select(editorSearch)의 정적 목록 필터.
   * label 또는 문자열화한 value에 질의가 포함되면 매치 (대소문자 무관).
   * null/빈/공백 질의는 전체를 반환한다.
   */
  function filterEditorOptions(options, query) {
    var list = normalizeEditorOptions(options);
    var q = query === null || query === undefined ? '' : String(query).trim().toLowerCase();
    if (q === '') return list;
    return list.filter(function (o) {
      return o.label.toLowerCase().indexOf(q) !== -1 ||
        String(o.value).toLowerCase().indexOf(q) !== -1;
    });
  }

  /**
   * 헤더 필터 행(floatingFilter)의 입력값 → 컬럼 필터 모델.
   * - raw가 null/undefined이거나 (set 제외) 공백뿐이면 null(필터 해제).
   * - 이미 적용된 모델의 연산자는 유지하되, 단일 입력으로 표현할 수 없는
   *   inRange는 equals로 대체한다. set은 단일 값 선택으로 동작.
   */
  function buildFloatingFilterModel(filterType, raw, currentModel) {
    if (raw === null || raw === undefined) return null;
    var value = String(raw);
    if (filterType === 'set') return { type: 'set', values: [value] };
    if (value.trim() === '') return null;
    if (filterType === 'number') {
      var op = currentModel && currentModel.type === 'number' && currentModel.op !== 'inRange'
        ? currentModel.op
        : 'equals';
      return { type: 'number', op: op, value: value };
    }
    var textOp = currentModel && currentModel.type === 'text' ? currentModel.op : 'contains';
    return { type: 'text', op: textOp, value: value };
  }

  /**
   * 그룹/전체 요약용 집계. func: 'sum'|'avg'|'min'|'max'|'count'
   * count는 모든 행을 세고, 나머지는 숫자로 해석 가능한 값만 집계한다.
   * 집계할 숫자가 하나도 없으면 null.
   */
  function aggregateValues(rows, field, func) {
    if (func === 'count') return rows.length;
    var sum = 0, min = Infinity, max = -Infinity, n = 0;
    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i][field];
      if (raw === null || raw === undefined || raw === '') continue;
      var v = Number(raw);
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
  function buildGroupView(rows, groupFields, isExpanded, aggColumns) {
    if (!groupFields || groupFields.length === 0) return rows.slice();
    aggColumns = aggColumns || [];
    var items = [];
    (function walk(subset, level, parentPath) {
      var field = groupFields[level];
      var order = [];
      var buckets = Object.create(null);
      subset.forEach(function (row) {
        var key = String(row[field]);
        if (!buckets[key]) { buckets[key] = []; order.push(key); }
        buckets[key].push(row);
      });
      order.forEach(function (key) {
        var children = buckets[key];
        /* \u0001: 데이터 값에 등장할 일 없는 레벨 구분자 */
        var path = parentPath + '\u0001' + field + ':' + key;
        var expanded = !!isExpanded(path);
        var agg = {};
        aggColumns.forEach(function (c) {
          agg[c.field] = aggregateValues(children, c.field, c.aggFunc);
        });
        items.push({
          __group: true,
          field: field,
          value: children[0][field],
          path: path,
          level: level,
          leafCount: children.length,
          expanded: expanded,
          agg: agg,
        });
        if (!expanded) return;
        if (level + 1 < groupFields.length) walk(children, level + 1, path);
        else children.forEach(function (r) { items.push(r); });
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
    var tops = [];
    var ordinals = [];
    var top = 0;
    var ordinal = 0;
    for (var i = 0; i < items.length; i++) {
      tops.push(top);
      ordinals.push(ordinal);
      if (items[i] && items[i].__detail) {
        top += detailHeight;
      } else {
        top += rowHeight;
        ordinal++;
      }
    }
    return { tops: tops, total: top, ordinals: ordinals };
  }

  /**
   * autoRowHeight: 줄바꿈(wrapText) 컬럼의 텍스트 폭을 재서 행별 높이를 추정한다.
   * measure(text)는 픽셀 폭을 반환하는 주입 함수(브라우저에선 canvas measureText).
   * 명시적 개행(\n)도 줄 수에 반영하며, 결과는 baseHeight 이상이다.
   */
  function computeAutoHeights(rows, wrapCols, measure, baseHeight, lineHeight) {
    return rows.map(function (row) {
      if (!row || row.__group || row.__detail) return baseHeight;
      var maxLines = 1;
      for (var i = 0; i < wrapCols.length; i++) {
        var c = wrapCols[i];
        var v = row[c.field];
        if (c.valueFormatter) {
          try { v = c.valueFormatter(v, row); } catch (e) { /* 원시 값으로 폴백 */ }
        }
        if (v === null || v === undefined || v === '') continue;
        var avail = Math.max(20, c.width - 32); /* 좌우 패딩 제외 */
        var lines = 0;
        String(v).split('\n').forEach(function (part) {
          lines += Math.max(1, Math.ceil(measure(part) / avail));
        });
        if (lines > maxLines) maxLines = lines;
      }
      return Math.max(baseHeight, maxLines * lineHeight + 12);
    });
  }

  /** 행별 높이 배열 → { tops, total } (가변 높이 가상화용). */
  function computeTopsFromHeights(heights) {
    var tops = [];
    var top = 0;
    for (var i = 0; i < heights.length; i++) {
      tops.push(top);
      top += heights[i];
    }
    return { tops: tops, total: top };
  }

  /** tops(오름차순)에서 y 오프셋이 속한 행 인덱스(top <= y인 마지막 인덱스). */
  function findRowAtOffset(tops, y) {
    if (tops.length === 0) return 0;
    var lo = 0;
    var hi = tops.length - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (tops[mid] <= y) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function paginate(totalRows, pageSize, currentPage) {
    var pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
    var page = clamp(currentPage, 0, pageCount - 1);
    var start = page * pageSize;
    var end = Math.min(totalRows, start + pageSize);
    return {
      page: page,
      pageCount: pageCount,
      start: start,
      end: end,
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
      var all = [];
      for (var i = 0; i < pageCount; i++) all.push(i);
      return all;
    }
    var half = Math.floor((maxButtons - 2) / 2);
    var start = clamp(current - half, 1, pageCount - maxButtons + 1);
    var out = [0];
    if (start > 1) out.push('…');
    for (var p = start; p < start + maxButtons - 2 && p < pageCount - 1; p++) out.push(p);
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
    var getters = columns.filter(function (c) { return c.valueGetter && c.field; });
    if (getters.length === 0) return rows;
    rows.forEach(function (row) {
      getters.forEach(function (c) {
        try { row[c.field] = c.valueGetter(row); }
        catch (e) { console.error('[DataGrid] valueGetter failed for "' + c.field + '":', e); }
      });
    });
    return rows;
  }

  /**
   * dataSource + 현재 그리드 상태 → fetch 요청 스펙 { url, method, body }.
   * GET이면 파라미터를 쿼리스트링으로, 그 외에는 JSON body로 보낸다.
   * server 모드인 축의 상태만 파라미터에 포함된다:
   *   page/pageSize(pageMode) · sort(sortModel JSON, sortMode) ·
   *   filter(filterModel JSON)/quickFilter(filterMode)
   */
  function buildDataSourceRequest(dataSource, state) {
    var params = {};
    var base = typeof dataSource.params === 'function' ? dataSource.params() : dataSource.params;
    for (var k in base || {}) params[k] = base[k];
    if (state.pageMode === 'server' && state.pagination) {
      params.page = state.page;
      params.pageSize = state.pageSize;
    }
    if (state.sortMode === 'server' && state.sortModel && state.sortModel.length > 0) {
      params.sort = JSON.stringify(state.sortModel);
    }
    if (state.filterMode === 'server') {
      var hasFilter = false;
      for (var f in state.filterModel || {}) { hasFilter = true; break; }
      if (hasFilter) params.filter = JSON.stringify(state.filterModel);
      if (state.quickFilter) params.quickFilter = state.quickFilter;
    }
    var method = (dataSource.method || 'GET').toUpperCase();
    var url = dataSource.url;
    var body = null;
    if (method === 'GET') {
      var qs = Object.keys(params)
        .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]); })
        .join('&');
      if (qs) url += (url.indexOf('?') === -1 ? '?' : '&') + qs;
    } else {
      body = JSON.stringify(params);
    }
    return { url: url, method: method, body: body };
  }

  /**
   * 원격 응답 해석 기본값: 배열이면 그대로, 아니면 { rows, total }를 기대한다.
   * 항상 { rows: [], total: n } 형태로 정규화한다.
   */
  function parseDataSourceResponse(json) {
    if (Array.isArray(json)) return { rows: json, total: json.length };
    var rows = json && Array.isArray(json.rows) ? json.rows : [];
    var total = json && typeof json.total === 'number' ? json.total : rows.length;
    return { rows: rows, total: total };
  }

  /**
   * columnGroups 옵션 → 그룹 헤더 행의 스팬 목록.
   * 표시 컬럼 순서를 따라가며 같은 그룹의 연속 컬럼을 하나의 스팬으로 묶는다.
   * 그룹이 없는 연속 컬럼도 빈 스팬 하나로 합친다. 고정(pinned) 상태가 다르면
   * 스팬을 끊어 고정 컬럼 스티키 배치와 어긋나지 않게 한다.
   * children은 colId 또는 field로 컬럼을 지칭한다.
   */
  function buildGroupHeaderRuns(visibleCols, groups) {
    var groupOf = {};
    (groups || []).forEach(function (g, gi) {
      (g.children || []).forEach(function (id) { groupOf[id] = gi; });
    });
    var runs = [];
    visibleCols.forEach(function (c) {
      var gi = groupOf[c.colId] !== undefined ? groupOf[c.colId]
        : groupOf[c.field] !== undefined ? groupOf[c.field]
        : -1;
      var pinned = c.pinned === 'left' || c.pinned === 'right' ? c.pinned : null;
      var last = runs[runs.length - 1];
      if (last && last.group === gi && last.pinned === pinned) {
        last.colIds.push(c.colId);
      } else {
        runs.push({
          group: gi,
          headerName: gi === -1 ? '' : groups[gi].headerName || '',
          colIds: [c.colId],
          pinned: pinned,
        });
      }
    });
    return runs;
  }

  /**
   * mergeCells: 표시 리스트에서 "이전 리프 행과 같은 값이라 병합되는" 위치 계산.
   * result[i] = true면 i번째 항목의 해당 컬럼 셀은 이어짐(값 숨김 + 경계선 제거).
   * 그룹 헤더/디테일 행에서 병합 run이 끊긴다.
   */
  function computeMergeContinuation(items, field) {
    var out = new Array(items.length);
    var prev;
    var hasPrev = false;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || it.__group || it.__detail) {
        out[i] = false;
        hasPrev = false;
        continue;
      }
      var v = it[field];
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
    var spans = new Array(cont.length);
    var run = 0;
    for (var i = cont.length - 1; i >= 0; i--) {
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
      var idField = opts.idField || 'id';
      var parentIdField = opts.parentIdField;
      var byId = {};
      rows.forEach(function (r) { byId[r[idField]] = true; });
      var byParent = {};
      var roots = [];
      rows.forEach(function (r) {
        var p = r[parentIdField];
        if (p === null || p === undefined || !byId[p] || p === r[idField]) roots.push(r);
        else (byParent[p] = byParent[p] || []).push(r);
      });
      var visited = {};
      var buildFlat = function (row, level) {
        visited[row[idField]] = true;
        var kids = byParent[row[idField]] || [];
        return {
          row: row,
          level: level,
          children: kids
            .filter(function (c) { return !visited[c[idField]]; })
            .map(function (c) { return buildFlat(c, level + 1); }),
        };
      };
      var out = roots.map(function (r) { return buildFlat(r, 0); });
      rows.forEach(function (r) {
        if (!visited[r[idField]]) out.push(buildFlat(r, 0));
      });
      return out;
    }
    var childrenField = opts.childrenField || 'children';
    var buildNested = function (row, level) {
      var kids = Array.isArray(row[childrenField]) ? row[childrenField] : [];
      return {
        row: row,
        level: level,
        children: kids.map(function (c) { return buildNested(c, level + 1); }),
      };
    };
    return rows.map(function (r) { return buildNested(r, 0); });
  }

  /** 트리 전체 노드를 표시 순서(DFS)로 평탄화 — 펼침 상태와 무관. */
  function collectTreeNodes(nodes) {
    var out = [];
    (function walk(list) {
      list.forEach(function (n) {
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
    var out = [];
    nodes.forEach(function (n) {
      var matched = false;
      try {
        matched = !!predicate(n.row);
      } catch (e) {
        console.error('[DataGrid] tree filter predicate failed:', e);
      }
      if (matched && keepChildren) {
        out.push(n);
        return;
      }
      var kids = filterTreeNodes(n.children, predicate, keepChildren);
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
    var byRow = new Map();
    nodes.forEach(function (n) { byRow.set(n.row, n); });
    return rowSorter(nodes.map(function (n) { return n.row; })).map(function (r) {
      var n = byRow.get(r);
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
    var isDisabled = opts.isDisabled || function () { return false; };
    var next = {};
    for (var k in states) next[k] = states[k];
    if (isDisabled(targetRow)) return next;
    if (!opts.cascade) {
      next[getId(targetRow)] = checked;
      return next;
    }

    var setSubtree = function (node) {
      if (!isDisabled(node.row)) next[getId(node.row)] = checked;
      node.children.forEach(setSubtree);
    };
    (function findAndSet(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].row === targetRow) { setSubtree(list[i]); return true; }
        if (findAndSet(list[i].children)) return true;
      }
      return false;
    })(roots);

    /* 부모 상태 재계산 (post-order) */
    var recompute = function (node) {
      if (node.children.length === 0) {
        return next[getId(node.row)] === true;
      }
      var allTrue = true;
      var allFalse = true;
      node.children.forEach(function (c) {
        var st = recompute(c);
        if (st !== true) allTrue = false;
        if (st !== false) allFalse = false;
      });
      var st2 = allTrue ? true : allFalse ? false : 'indeterminate';
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
    var node = null;
    (function find(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].row === targetRow) { node = list[i]; return true; }
        if (find(list[i].children)) return true;
      }
      return false;
    })(roots);
    if (!node) return false;
    var all = true;
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
    var out = {};
    var walk = function (node) {
      if (node.children.length === 0) {
        var st = !!isSelected(node.row);
        out[getId(node.row)] = st;
        return st;
      }
      var allTrue = true;
      var allFalse = true;
      node.children.forEach(function (c) {
        var cst = walk(c);
        if (cst !== true) allTrue = false;
        if (cst !== false) allFalse = false;
      });
      var st2 = allTrue ? true : allFalse ? false : 'indeterminate';
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
  function computeTreeSummary(roots, getId, aggColumns) {
    var out = {};
    var walk = function (node) {
      if (node.children.length === 0) return [node.row];
      var leaves = [];
      node.children.forEach(function (c) {
        leaves.push.apply(leaves, walk(c));
      });
      var agg = {};
      aggColumns.forEach(function (c) {
        agg[c.field] = aggregateValues(leaves, c.field, c.aggFunc);
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
    var out = [];
    (function walk(list) {
      list.forEach(function (n) {
        var has = n.children.length > 0;
        var exp = has && !!isExpanded(n.row);
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
    var out = [];
    if (!source || source.length === 0 || count <= 0) return out;
    var allNumbers = source.every(function (v) { return typeof v === 'number' && isFinite(v); });
    if (allNumbers && source.length >= 2) {
      var step = (source[source.length - 1] - source[0]) / (source.length - 1);
      var last = source[source.length - 1];
      for (var i = 1; i <= count; i++) {
        out.push(Math.round((last + step * i) * 1e10) / 1e10);
      }
    } else {
      for (var j = 0; j < count; j++) out.push(source[j % source.length]);
    }
    return out;
  }

  /**
   * findNext()의 다음 매치 탐색. rows에는 그룹 헤더 항목이 섞여 있을 수 있다
   * (건너뜀). cursor: { index, col } 직전 매치 위치 또는 null(처음부터).
   * 끝에 닿으면 처음으로 감싸서 계속 찾고, 없으면 null.
   */
  function findNextMatch(rows, fields, text, cursor) {
    var needle = String(text || '').toLowerCase();
    if (!needle || rows.length === 0 || fields.length === 0) return null;
    var startIndex = cursor ? cursor.index : 0;
    var startCol = cursor ? cursor.col + 1 : 0;
    for (var step = 0; step <= rows.length; step++) {
      var i = (startIndex + step) % rows.length;
      var row = rows[i];
      var cFrom = step === 0 ? startCol : 0;
      if (!row || row.__group) continue;
      for (var c = cFrom; c < fields.length; c++) {
        var v = row[fields[c]];
        if (v === null || v === undefined) continue;
        if (String(v).toLowerCase().indexOf(needle) !== -1) return { index: i, col: c };
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
    var out = rows.filter(function (r) { return added.indexOf(r) === -1; });
    deleted
      .slice()
      .sort(function (a, b) { return a.index - b.index; })
      .forEach(function (d) {
        out.splice(Math.min(d.index, out.length), 0, d.row);
      });
    return out;
  }

  /** 뷰 행 배열 → field가 있는 컬럼만 담은 평범한 객체 배열 (getJson()용). */
  function buildJsonRows(rows, columns) {
    return rows.map(function (row) {
      var out = {};
      columns.forEach(function (c) {
        if (c.field !== undefined) out[c.field] = row[c.field];
      });
      return out;
    });
  }

  function csvEscape(value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildCsv(rows, columns) {
    var lines = [columns.map(function (c) { return csvEscape(c.headerName); }).join(',')];
    rows.forEach(function (row) {
      lines.push(
        columns
          .map(function (c) {
            var v = row[c.field];
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

  var CRC_TABLE = (function () {
    var table = new Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
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
    var encoder = new TextEncoder();
    var chunks = [];
    var central = [];
    var offset = 0;
    var totalSize = 0;

    function u16(v) { return [v & 0xff, (v >> 8) & 0xff]; }
    function u32(v) { return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]; }
    function push(arr) {
      var u8 = arr instanceof Uint8Array ? arr : Uint8Array.from(arr);
      chunks.push(u8);
      totalSize += u8.length;
    }

    files.forEach(function (f) {
      var nameBytes = encoder.encode(f.name);
      var dataBytes = typeof f.data === 'string' ? encoder.encode(f.data) : f.data;
      var crc = crc32(dataBytes);
      var headerStart = totalSize;
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
      central.push({ name: nameBytes, crc: crc, size: dataBytes.length, offset: headerStart });
    });

    var cdStart = totalSize;
    central.forEach(function (e) {
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
    var cdSize = totalSize - cdStart;
    push(u32(0x06054b50));              /* end of central directory */
    push(u16(0)); push(u16(0));
    push(u16(central.length)); push(u16(central.length));
    push(u32(cdSize)); push(u32(cdStart));
    push(u16(0));

    var out = new Uint8Array(totalSize);
    offset = 0;
    chunks.forEach(function (c) { out.set(c, offset); offset += c.length; });
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
    var out = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>',
    ];
    function strCell(v) {
      return '<c t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(v) + '</t></is></c>';
    }
    out.push('<row>' + columns.map(function (c) { return strCell(c.headerName); }).join('') + '</row>');
    rows.forEach(function (row) {
      var cells = columns.map(function (c) {
        var v = row[c.field];
        if (c.valueFormatter) {
          try { v = c.valueFormatter(v, row); }
          catch (e) { /* 포매터 실패 시 원시 값 */ }
        }
        if (v === null || v === undefined) return '<c/>';
        if (typeof v === 'number' && isFinite(v)) return '<c t="n"><v>' + v + '</v></c>';
        if (typeof v === 'boolean') return '<c t="b"><v>' + (v ? 1 : 0) + '</v></c>';
        return strCell(v);
      });
      out.push('<row>' + cells.join('') + '</row>');
    });
    out.push('</sheetData></worksheet>');
    return out.join('');
  }

  /** xlsx 컨테이너를 구성하는 최소 파트 목록. */
  function buildXlsxParts(rows, columns, sheetName) {
    var name = xmlEscape(sheetName || 'Data');
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
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets><sheet name="' + name + '" sheetId="1" r:id="rId1"/></sheets></workbook>',
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

  var DEFAULT_COL = {
    width: 160,
    minWidth: 60,
    sortable: true,
    resizable: true,
    editable: false,
    filter: false,
    hide: false,
    pinned: null,
    align: 'left',
  };

  function normalizeColumns(columnDefs, defaultColDef) {
    return (columnDefs || []).map(function (def, i) {
      var col = {};
      var k;
      for (k in DEFAULT_COL) col[k] = DEFAULT_COL[k];
      if (defaultColDef) for (k in defaultColDef) col[k] = defaultColDef[k];
      for (k in def) col[k] = def[k];
      col.colId = col.colId || col.field || 'col-' + i;
      col.headerName = col.headerName !== undefined ? col.headerName : col.field || '';
      /* dataType이 filter:true의 필터 종류와 기본 align을 결정한다 */
      if (col.filter === true) {
        col.filter = col.dataType === 'number' ? 'number'
          : col.dataType === 'bool' ? 'set'
          : 'text';
      }
      var alignExplicit = ('align' in def) || (defaultColDef && 'align' in defaultColDef);
      if (col.dataType === 'number' && !alignExplicit) col.align = 'right';
      /* editor를 선언했다는 것 자체가 편집 의도 — editable 생략 시 true로.
       * 명시적 editable(false 포함)은 그대로 존중한다. */
      var editableExplicit = ('editable' in def) || (defaultColDef && 'editable' in defaultColDef);
      if (!editableExplicit && col.editor) col.editable = true;
      /* 선언적 format — valueFormatter가 없을 때만 합성 (CSV·집계·자동 폭에도 일괄 적용) */
      if (col.format && !col.valueFormatter) {
        col.valueFormatter = (function (pattern) {
          return function (v) { return formatValue(v, pattern); };
        })(col.format);
      }
      return col;
    });
  }

  /**
   * 컬럼 폭 계산: 사용자 리사이즈(overrides) > flex(남은 공간 비율) > width.
   * 모든 결과는 minWidth 이상, maxWidth(있으면) 이하로 클램프된다.
   */
  function computeColumnWidths(cols, overrides, available) {
    overrides = overrides || {};
    var fixedTotal = 0;
    var flexTotal = 0;
    cols.forEach(function (c) {
      var w = overrides[c.colId];
      if (w === undefined && c.flex) { flexTotal += c.flex; return; }
      fixedTotal += w !== undefined ? w : c.width;
    });
    var widths = {};
    var flexSpace = Math.max(0, available - fixedTotal);
    cols.forEach(function (c) {
      var w = overrides[c.colId];
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
    var pinnedLeftW = 0;
    var pinnedRightW = 0;
    colSpecs.forEach(function (s) {
      if (s.pinned === 'left') pinnedLeftW += s.width;
      else if (s.pinned === 'right') pinnedRightW += s.width;
    });
    var viewL = scrollLeft + pinnedLeftW;
    var viewR = scrollLeft + viewportWidth - pinnedRightW;
    var x = 0;
    var c1 = -1;
    var c2 = -1;
    for (var i = 0; i < colSpecs.length; i++) {
      var w = colSpecs[i].width;
      if (!colSpecs[i].pinned && x + w > viewL && x < viewR) {
        if (c1 === -1) c1 = i;
        c2 = i;
      }
      x += w;
    }
    if (c1 === -1) return { c1: 0, c2: colSpecs.length - 1 }; /* 일반 컬럼 없음 → 전부 */
    var b = buffer === undefined ? 2 : buffer;
    return { c1: Math.max(0, c1 - b), c2: Math.min(colSpecs.length - 1, c2 + b) };
  }

  /**
   * getState()의 컬럼 상태를 현재 컬럼 목록에 적용한 결과를 계산한다.
   * - stateColumns 순서대로 재배열, 목록에 없는 colId는 무시
   * - state에 빠진 컬럼은 원래 상대 순서를 유지한 채 뒤에 붙인다
   * 입력을 변형하지 않고 { columns, widths, hidden }을 반환한다.
   */
  function applyColumnState(columns, stateColumns) {
    var result = { columns: columns.slice(), widths: {}, hidden: {} };
    if (!stateColumns || stateColumns.length === 0) return result;
    var byId = {};
    columns.forEach(function (c) { byId[c.colId] = c; });
    var ordered = [];
    var seen = {};
    stateColumns.forEach(function (sc) {
      if (!sc || sc.colId === undefined) return;
      var col = byId[sc.colId];
      if (!col || seen[sc.colId]) return;
      seen[sc.colId] = true;
      ordered.push(col);
      if (typeof sc.width === 'number' && sc.width > 0) result.widths[sc.colId] = sc.width;
      if (sc.hide !== undefined) result.hidden[sc.colId] = !!sc.hide;
    });
    columns.forEach(function (c) {
      if (!seen[c.colId]) ordered.push(c);
    });
    result.columns = ordered;
    return result;
  }

  /* ---------------------------------------------------------------------------
   * Event emitter
   * ------------------------------------------------------------------------- */

  function Emitter() {
    this._handlers = {};
  }
  Emitter.prototype.on = function (name, fn) {
    (this._handlers[name] = this._handlers[name] || []).push(fn);
    return this;
  };
  Emitter.prototype.off = function (name, fn) {
    var list = this._handlers[name];
    if (list) {
      var i = list.indexOf(fn);
      if (i !== -1) list.splice(i, 1);
    }
    return this;
  };
  Emitter.prototype.emit = function (name, payload) {
    var list = this._handlers[name];
    if (list) {
      list.slice().forEach(function (fn) {
        try { fn(payload); } catch (e) { console.error('[DataGrid] "' + name + '" handler failed:', e); }
      });
    }
  };

  /* ---------------------------------------------------------------------------
   * DataGrid
   * ------------------------------------------------------------------------- */

  var ROW_BUFFER = 6;

  function DataGrid(container, options) {
    if (!(this instanceof DataGrid)) return new DataGrid(container, options);
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container || !container.appendChild) {
      throw new Error('DataGrid: first argument must be a DOM element or selector of one.');
    }
    options = options || {};

    this.options = options;
    this._emitter = new Emitter();
    this._container = container;
    this._destroyed = false;

    /* column state */
    this._columns = this._buildColumns();
    this._colWidths = {};
    this._editable = options.editable !== false;

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

    /* change tracking + undo/redo */
    this._trackChanges = !!options.trackChanges;
    this._undoRedo = !!options.undoRedo;
    this._resetTracking();
    this._undoStack = [];
    this._redoStack = [];
    this._historyMuted = false;

    /* remote data source */
    this._sortMode = options.sortMode === 'server' ? 'server' : 'client';
    this._filterMode = options.filterMode === 'server' ? 'server' : 'client';
    this._pageMode = options.pageMode === 'server' ? 'server' : 'client';
    this._serverTotal = 0;
    this._loadSeq = 0;

    this._pasteCount = 0; /* paste 이벤트/클립보드 API 폴백의 이중 실행 방지용 */
    this._docListeners = [];
    this._buildDom();
    this._bindEvents();

    this.setRowData(options.rowData || []);
    if (options.dataSource) this.reloadData();

    /* gridReady: 생성자 반환 후 핸들러가 등록될 시간을 주기 위해 비동기로 1회 발생 */
    var self = this;
    setTimeout(function () {
      if (!self._destroyed) self._emitter.emit('gridReady', { rowCount: self._rows.length });
    }, 0);
  }

  /* ---- columns (normalize + built-in row number column) ---- */

  DataGrid.prototype._buildColumns = function () {
    var cols = normalizeColumns(this.options.columnDefs, this.options.defaultColDef);
    if (this.options.rowDetail) {
      cols.unshift({
        colId: '__detailToggle', headerName: '', width: 44, minWidth: 36, maxWidth: 60,
        sortable: false, resizable: false, editable: false, filter: false,
        hide: false, pinned: 'left', align: 'center', __detailToggle: true,
      });
    }
    if (this.options.rowNumbers) {
      cols.unshift({
        colId: '__rowNum', headerName: '', width: 52, minWidth: 40, maxWidth: 90,
        sortable: false, resizable: true, editable: false, filter: false,
        hide: false, pinned: 'left', align: 'right', __rowNumber: true,
      });
    }
    return cols;
  };

  /* ---- events ---- */
  DataGrid.prototype.on = function (name, fn) { this._emitter.on(name, fn); return this; };
  DataGrid.prototype.off = function (name, fn) { this._emitter.off(name, fn); return this; };

  /** 한 번만 실행되는 핸들러. 반환된 wrapper로 off(name, wrapper) 가능. */
  DataGrid.prototype.once = function (name, fn) {
    var self = this;
    var wrapper = function (payload) {
      self._emitter.off(name, wrapper);
      fn(payload);
    };
    this._emitter.on(name, wrapper);
    return wrapper;
  };

  /* ---- DOM scaffolding ---- */

  DataGrid.prototype._buildDom = function () {
    var root = el('div', 'dg-root');
    root.setAttribute('tabindex', '0');
    root.setAttribute('role', 'grid');
    if (this.options.theme === 'dark') root.classList.add('dg-theme-dark');
    if (this.options.zebra) root.classList.add('dg-zebra');
    if (this.options.domLayout === 'autoHeight') root.classList.add('dg-auto-height');
    if (this.options.showHeader === false) root.classList.add('dg-no-header');
    root.style.setProperty('--dg-row-height', this._rowHeight + 'px');
    root.style.setProperty('--dg-header-height', this._headerHeight + 'px');

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

    if (this._pagination) {
      this._pagingEl = el('div', 'dg-paging-panel', root);
    }

    this._container.appendChild(root);
    this._rootEl = root;
    this._renderedRows = {}; /* pageIndex -> row element */
    this._lastRange = null;
  };

  /** toolbar 옵션(Element 또는 grid를 받는 팩토리 함수)을 슬롯에 넣는다. */
  DataGrid.prototype._mountToolbar = function (toolbar) {
    if (!this._toolbarEl) return;
    this._toolbarEl.innerHTML = '';
    var node = typeof toolbar === 'function' ? toolbar(this) : toolbar;
    if (node && node.nodeType) this._toolbarEl.appendChild(node);
  };

  DataGrid.prototype._bindEvents = function () {
    var self = this;

    this._bodyEl.addEventListener('scroll', function () {
      self._headerEl.scrollLeft = self._bodyEl.scrollLeft;
      self._footerEl.scrollLeft = self._bodyEl.scrollLeft;
      self._pinnedTopEl.scrollLeft = self._bodyEl.scrollLeft;
      if (self.options.virtualX && self._updateColWindow()) {
        self._renderBody(); /* 컬럼 창이 바뀌면 행 셀을 새 창으로 재구성 */
      } else {
        self._renderVisibleRows();
      }
    });

    this._canvasEl.addEventListener('click', function (e) { self._onCellClick(e); });
    this._canvasEl.addEventListener('dblclick', function (e) { self._onCellDblClick(e); });
    this._rootEl.addEventListener('keydown', function (e) { self._onKeyDown(e); });

    this._canvasEl.addEventListener('contextmenu', function (e) {
      var hit = self._cellFromEvent(e);
      if (!hit || !hit.row || hit.row.__group) return;
      self._emitter.emit('cellContextMenu', {
        data: hit.row,
        colDef: hit.col,
        value: hit.col && hit.col.field !== undefined ? hit.row[hit.col.field] : undefined,
        rowIndex: hit.r,
        originalEvent: e, /* 컨텍스트 메뉴를 띄우려면 e.preventDefault() 후 직접 구현 */
      });
    });

    /* 셀/블록 선택: mousedown으로 앵커, 드래그로 범위 확장 */
    if (this._cellSelection) {
      this._canvasEl.addEventListener('mousedown', function (e) {
        if (e.button !== 0 || self._editing) return;
        if (e.target.closest('.dg-checkbox')) return;
        var hit = self._cellFromEvent(e);
        if (!hit || !hit.row || hit.row.__group) return;
        if (e.shiftKey && self._cellRange) {
          self._setCellRange(self._cellRange.anchor, { r: hit.r, c: hit.c });
        } else {
          self._setCellRange({ r: hit.r, c: hit.c }, { r: hit.r, c: hit.c });
        }
        self._rangeDragging = true;
        e.preventDefault(); /* 텍스트 선택 방지 */
      });
      this._canvasEl.addEventListener('mouseover', function (e) {
        var hit = self._cellFromEvent(e);
        if (!hit || !hit.row || hit.row.__group) return;
        if (self._fillDrag) { self._previewFill(hit.r); return; }
        if (!self._rangeDragging || !self._cellRange) return;
        self._setCellRange(self._cellRange.anchor, { r: hit.r, c: hit.c });
      });
      var endDrag = function () {
        self._rangeDragging = false;
        if (self._fillDrag) {
          self._applyFillDrag();
          self._fillDrag = null;
        }
      };
      document.addEventListener('mouseup', endDrag);
      this._docListeners.push(['mouseup', endDrag]);
    }

    /* Ctrl+V 1차 경로 — 브라우저가 클립보드 내용을 이벤트로 직접 전달 */
    this._rootEl.addEventListener('paste', function (e) {
      if (self._editing || !self._focusedCell) return;
      var text = e.clipboardData && e.clipboardData.getData('text/plain');
      if (!text) return;
      self._pasteCount++;
      e.preventDefault();
      self.pasteTsv(text);
    });

    var closeMenus = function (e) {
      if (!self._menuEl || self._menuEl.contains(e.target)) return;
      /* 메뉴를 연 컬럼의 메뉴 버튼 위 mousedown은 여기서 닫지 않는다 —
       * 닫아버리면 이어지는 click에서 다시 열려 토글이 불가능해진다. */
      var btn = e.target.closest ? e.target.closest('.dg-header-menu-btn') : null;
      if (btn && self._menuHeaderCell && self._menuHeaderCell.contains(btn)) return;
      self._closeMenu();
    };
    document.addEventListener('mousedown', closeMenus);
    this._docListeners.push(['mousedown', closeMenus]);

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(function () {
        self._layoutColumns();
        if (self.options.virtualX && self._updateColWindow()) self._renderBody();
      });
      this._resizeObserver.observe(this._rootEl);
    }
  };

  /* ---- row identity ---- */

  DataGrid.prototype._rowId = function (row) {
    if (this.options.getRowId) return this.options.getRowId(row);
    if (this._rowIds) {
      var id = this._rowIds.get(row);
      if (id === undefined) {
        id = 'dg-' + (this._idCounter++);
        this._rowIds.set(row, id);
      }
      return id;
    }
    return this._rows.indexOf(row);
  };

  /* ---- view pipeline ---- */

  DataGrid.prototype._visibleColumns = function () {
    var cols = this._columns.filter(function (c) { return !c.hide; });
    var left = cols.filter(function (c) { return c.pinned === 'left'; });
    var right = cols.filter(function (c) { return c.pinned === 'right'; });
    var middle = cols.filter(function (c) { return c.pinned !== 'left' && c.pinned !== 'right'; });
    return left.concat(middle, right);
  };

  DataGrid.prototype._recomputeView = function () {
    var comparators = {};
    this._columns.forEach(function (c) {
      var cmp = c.comparator || (c.dataType ? typeComparator(c.dataType) : null);
      if (cmp) comparators[c.field] = cmp;
    });
    var fields = this._visibleColumns()
      .map(function (c) { return c.field; })
      .filter(Boolean);

    if (this._treeData) {
      /* 트리 파이프라인이 _viewRows/_displayRows/_pageRows를 모두 채운다 */
      this._recomputeTreeView(comparators, fields);
      this._afterViewComputed();
      return;
    }

    applyValueGetters(this._rows, this._columns);
    /* server 모드인 축은 서버가 이미 처리했으므로 클라이언트 단계를 건너뛴다 */
    var rows = this._rows.slice();
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
    this._aggColumns = this._columns.filter(function (c) { return c.aggFunc && c.field; });
    var display = rows;
    if (this._groupBy.length > 0) {
      var toggled = this._groupToggled;
      var defaultExpanded = this._groupDefaultExpanded;
      display = buildGroupView(rows, this._groupBy, function (path) {
        return toggled[path] !== undefined ? toggled[path] : defaultExpanded;
      }, this._aggColumns);
    }
    this._displayRows = display;

    if (this._pagination) {
      if (this._pageMode === 'server') {
        /* 서버 페이징: 현재 rows가 곧 한 페이지. 총계는 서버 응답 기준 */
        var total = this._serverTotal;
        var pageCount = Math.max(1, Math.ceil(total / this._pageSize));
        var page = clamp(this._currentPage, 0, pageCount - 1);
        this._currentPage = page;
        var start = page * this._pageSize;
        this._pageInfo = {
          page: page,
          pageCount: pageCount,
          start: start,
          end: start + display.length,
          firstRow: total === 0 ? 0 : start + 1,
          lastRow: start + display.length,
          total: total,
        };
        this._pageRows = display;
      } else {
        var info = paginate(display.length, this._pageSize, this._currentPage);
        this._currentPage = info.page;
        this._pageInfo = info;
        this._pageRows = display.slice(info.start, info.end);
      }
    } else {
      this._pageInfo = null;
      this._pageRows = display;
    }

    this._afterViewComputed();
  };

  /* 뷰 파이프라인 공통 꼬리: 가변 세로 레이아웃(마스터-디테일 삽입 +
   * autoRowHeight 행별 높이 추정) + 병합 맵. 일반/트리 파이프라인이 공유한다. */
  DataGrid.prototype._afterViewComputed = function () {
    this._rowTops = null;
    this._pageOrdinals = null;
    this._rowHeights = null;
    var self2 = this;
    if (this.options.rowDetail) {
      var withDetails = [];
      this._pageRows.forEach(function (row) {
        withDetails.push(row);
        if (!row.__group && self2._detailExpanded[self2._rowId(row)]) {
          withDetails.push({ __detail: true, row: row });
        }
      });
      this._pageRows = withDetails;
    }
    var wrapCols = [];
    if (this.options.autoRowHeight) {
      this._visibleColumns().forEach(function (c) {
        if (c.wrapText && c.field !== undefined) {
          wrapCols.push({
            field: c.field,
            valueFormatter: c.valueFormatter,
            width: (self2._computedWidths && self2._computedWidths[c.colId]) || c.width,
          });
        }
      });
    }
    if (this.options.rowDetail || wrapCols.length > 0) {
      var detailH = this._detailHeight();
      var heights;
      if (wrapCols.length > 0) {
        heights = computeAutoHeights(
          this._pageRows, wrapCols, this._textMeasurer(), this._rowHeight, this._lineHeight()
        );
        for (var hi = 0; hi < heights.length; hi++) {
          if (this._pageRows[hi] && this._pageRows[hi].__detail) heights[hi] = detailH;
        }
      } else {
        heights = this._pageRows.map(function (it) {
          return it && it.__detail ? detailH : self2._rowHeight;
        });
      }
      this._rowHeights = heights;
      var layout = computeTopsFromHeights(heights);
      this._rowTops = layout.tops;
      this._totalRowsHeight = layout.total;
      var ordinal = 0;
      this._pageOrdinals = this._pageRows.map(function (it) {
        var o = ordinal;
        if (!it || !it.__detail) ordinal++;
        return o;
      });
    }

    this._computeMergeMap();
  };

  /* 트리 뷰 파이프라인: 노드 구축 → 계층 필터(매치+조상 유지) → 계층 정렬(형제끼리)
   * → 펼침 평탄화. 페이징/그룹핑은 트리와 배타 (생성자에서 차단). */
  DataGrid.prototype._recomputeTreeView = function (comparators, fields) {
    var self = this;
    var td = this._treeData;
    var roots = buildTreeNodes(this._rows, td);
    this._treeRoots = roots; /* 필터 전 전체 트리 — 체크 캐스케이드가 사용 */
    applyValueGetters(
      collectTreeNodes(roots).map(function (n) { return n.row; }),
      this._columns
    );

    var hasFilter =
      this._filterMode !== 'server' &&
      (Object.keys(this._filterModel).length > 0 || this._quickFilter);
    if (hasFilter) {
      var model = this._filterModel;
      var quick = this._quickFilter;
      var pred = function (row) {
        return (
          filterRows([row], model).length > 0 &&
          quickFilterRows([row], quick, fields).length > 0
        );
      };
      roots = filterTreeNodes(roots, pred, td.filterKeepChildren !== false);
    }

    if (this._sortModel.length > 0 && this._sortMode !== 'server') {
      var sortModel = this._sortModel;
      roots = sortTreeNodes(roots, function (rows) {
        return sortRows(rows, sortModel, comparators);
      });
    }

    /* 펼침 상태: 처음 보는 노드는 defaultExpandLevel로 초기화 (-1 = 전부 펼침) */
    var defLevel = td.defaultExpandLevel === undefined ? 0 : td.defaultExpandLevel;
    var nodes = collectTreeNodes(roots);
    var info = {};
    /* fetchChildren(지연 로딩): 아직 로드 전인 노드도 hasChildren(row)가 true면 토글 표시 */
    var lazyHas = td.fetchChildren && td.hasChildren
      ? function (row) {
          try {
            return !!td.hasChildren(row);
          } catch (err) {
            console.error('[DataGrid] treeData.hasChildren failed:', err);
            return false;
          }
        }
      : null;
    nodes.forEach(function (n) {
      var id = self._rowId(n.row);
      var has =
        n.children.length > 0 ||
        !!(lazyHas && !self._treeLoaded[id] && lazyHas(n.row));
      if (has && self._treeExpanded[id] === undefined) {
        /* 지연 노드는 로드 전이므로 defaultExpandLevel과 무관하게 접힘으로 시작 */
        self._treeExpanded[id] =
          n.children.length > 0 && (defLevel === -1 || n.level < defLevel);
      }
      info[id] = { level: n.level, hasChildren: has, expanded: false };
    });
    var flat = flattenTreeNodes(roots, function (row) {
      return !!self._treeExpanded[self._rowId(row)];
    });
    flat.forEach(function (it) {
      info[self._rowId(it.row)].expanded = it.expanded;
    });
    this._treeInfo = info;

    /* 트리 UI를 그릴 컬럼: treeField 지정 컬럼 우선, 없으면 첫 데이터 컬럼 */
    var firstDataCol = null;
    var treeFieldCol = null;
    this._visibleColumns().forEach(function (c) {
      if (c.field === undefined || c.__rowNumber || c.__detailToggle) return;
      if (firstDataCol === null) firstDataCol = c.colId;
      if (td.treeField && c.field === td.treeField && treeFieldCol === null) {
        treeFieldCol = c.colId;
      }
    });
    this._treeColId = treeFieldCol !== null ? treeFieldCol : firstDataCol;

    this._aggColumns = this._columns.filter(function (c) { return c.aggFunc && c.field; });

    /* checkboxSelection 컬럼이 있으면 트리 체크박스 모드.
     * 3상태 유도 표시는 cascade일 때만 — 비캐스케이드에서 부모 표시를 자식에서
     * 유도하면 부모 자신의 선택과 어긋나 토글이 갇힌다 (BUG-004) */
    this._treeChecked = null;
    this._treeCheckboxMode = this._hasTreeCheckbox();
    if (this._treeCheckboxMode && this._treeCheckOpts().cascade) {
      this._treeChecked = deriveTreeCheckStates(
        this._treeRoots,
        function (r) { return self._rowId(r); },
        function (r) { return !!self._selection[self._rowId(r)]; }
      );
    }

    /* treeData.summary: 부모 행에 자손 리프 집계 표시 (필터 반영된 트리 기준) */
    this._treeSummary = null;
    if (td.summary && this._aggColumns.length > 0) {
      this._treeSummary = computeTreeSummary(
        roots,
        function (r) { return self._rowId(r); },
        this._aggColumns
      );
    }

    this._viewRows = nodes.map(function (n) { return n.row; });
    this._displayRows = flat.map(function (it) { return it.row; });
    this._pageInfo = null;
    this._pageRows = this._displayRows;
  };

  /** 루트 폰트 기준 텍스트 폭 측정 함수 (autoRowHeight용). */
  DataGrid.prototype._textMeasurer = function () {
    var canvas = this._measureCanvas || (this._measureCanvas = document.createElement('canvas'));
    var ctx = canvas.getContext('2d');
    var style = getComputedStyle(this._rootEl);
    ctx.font = style.fontSize + ' ' + style.fontFamily;
    return function (text) { return ctx.measureText(text).width; };
  };

  DataGrid.prototype._lineHeight = function () {
    return Math.round((parseFloat(getComputedStyle(this._rootEl).fontSize) || 14) * 1.45);
  };

  DataGrid.prototype._computeMergeMap = function () {
    this._mergeMap = null;
    var fields = this.options.mergeCells;
    if (!fields || fields.length === 0) return;
    this._mergeMap = {};
    /* _mergeMap[field] = { cont: 이어짐 여부 배열, span: run 시작 셀의 병합 행 수 } */
    for (var i = 0; i < fields.length; i++) {
      var cont = computeMergeContinuation(this._pageRows, fields[i]);
      this._mergeMap[fields[i]] = { cont: cont, span: computeMergeSpans(cont) };
    }
  };

  DataGrid.prototype._detailHeight = function () {
    return (this.options.rowDetail && this.options.rowDetail.height) || 200;
  };

  /** 페이지 인덱스의 top 오프셋(px). 디테일 행이 없으면 등간격. */
  DataGrid.prototype._rowTop = function (pageIndex) {
    return this._rowTops ? this._rowTops[pageIndex] : pageIndex * this._rowHeight;
  };

  /* ---- full refresh ---- */

  DataGrid.prototype.refresh = function () {
    if (this._destroyed) return;
    this._cancelEdit();
    this._recomputeView();
    this._renderHeader();
    this._layoutColumns();
    this._renderBody();
    this._renderPinnedTop();
    this._renderGrandTotal();
    this._renderPaging();
    this._updateOverlay();
    this._emitter.emit('viewRendered', {
      displayedRowCount: this._viewRows.length,
      page: this._pageInfo ? this._pageInfo.page : 0,
    });
  };

  DataGrid.prototype._emitDataChanged = function () {
    this._emitter.emit('dataChanged', { rowCount: this._rows.length });
  };

  /* ---- partial refresh (전체 재계산 없이 렌더된 DOM만 갱신) ---- */

  DataGrid.prototype._renderedRowEntry = function (row) {
    var id = String(this._rowId(row));
    for (var idx in this._renderedRows) {
      if (this._renderedRows[idx].dataset.rowId === id) {
        return { el: this._renderedRows[idx], index: Number(idx) };
      }
    }
    return null;
  };

  /** 렌더된 셀 하나를 제자리에서 다시 그린다. 화면 밖이면 false. */
  DataGrid.prototype.refreshCell = function (row, field) {
    var hit = this._renderedRowEntry(row);
    if (!hit) return false;
    var col = this._visibleColumns().find(function (c) { return c.field === field; });
    if (!col) return false;
    var cellEl = hit.el.querySelector('[data-col-id="' + col.colId + '"]');
    if (!cellEl) return false;
    cellEl.innerHTML = '';
    this._renderCellValue(cellEl, col, row);
    return true;
  };

  /** 렌더된 행 하나를 새로 만들어 교체한다. 화면 밖이면 false. */
  DataGrid.prototype.refreshRow = function (row) {
    var hit = this._renderedRowEntry(row);
    if (!hit) return false;
    /* 이벤트 핸들러 재진입 등으로 추적 중인 행이 이미 캔버스에서 떨어져
     * 있으면 교체를 시도하지 않는다 (BUG-007 방어선). */
    if (hit.el.parentNode !== this._canvasEl) return false;
    var fresh = this._buildRowEl(hit.index);
    this._canvasEl.replaceChild(fresh, hit.el);
    this._renderedRows[hit.index] = fresh;
    return true;
  };

  /** 렌더된 모든 행에서 한 컬럼의 셀을 다시 그린다. 컬럼이 없으면 false. */
  DataGrid.prototype.refreshColumn = function (colId) {
    var col = this._columns.find(function (c) { return c.colId === colId || c.field === colId; });
    if (!col) return false;
    for (var idx in this._renderedRows) {
      var rowEl = this._renderedRows[idx];
      var row = this._pageRows[Number(idx)];
      if (!row || row.__group || row.__detail) continue;
      var cellEl = rowEl.querySelector('[data-col-id="' + col.colId + '"]');
      if (cellEl) {
        cellEl.innerHTML = '';
        this._renderCellValue(cellEl, col, row);
      }
    }
    return true;
  };

  /* ---- runtime option changes (setOptions) ---- */

  /**
   * 재생성 없이 옵션을 갱신한다. 지원: title, toolbar, theme, zebra,
   * rowHeight, headerHeight, editable, sortModel, groupBy, quickFilter 계열,
   * columnDefs/defaultColDef/rowNumbers/rowDetail(컬럼 재구성),
   * pagination/paginationPageSize, floatingFilter, columnGroups,
   * getRowClass, grandTotal 등 렌더 파이프라인이 읽는 값 전반.
   * 반영 후 refresh() 1회.
   */
  DataGrid.prototype.setOptions = function (patch) {
    if (!patch) return;
    for (var k in patch) this.options[k] = patch[k];

    if ('columnDefs' in patch || 'defaultColDef' in patch ||
        'rowNumbers' in patch || 'rowDetail' in patch) {
      this._columns = this._buildColumns();
      this._colWidths = {};
    }
    if ('rowHeight' in patch) {
      this._rowHeight = patch.rowHeight || 42;
      this._rootEl.style.setProperty('--dg-row-height', this._rowHeight + 'px');
    }
    if ('headerHeight' in patch) {
      this._headerHeight = patch.headerHeight || 48;
      this._rootEl.style.setProperty('--dg-header-height', this._headerHeight + 'px');
    }
    if ('zebra' in patch) this._rootEl.classList.toggle('dg-zebra', !!patch.zebra);
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
  };

  /* ---- header ---- */

  DataGrid.prototype._renderHeader = function () {
    var self = this;
    this._renderGroupHeader();
    this._headerRowEl.innerHTML = '';
    this._headerCells = {};

    this._visibleColumns().forEach(function (col) {
      var cell = el('div', 'dg-header-cell', self._headerRowEl);
      cell.setAttribute('role', 'columnheader');
      cell.dataset.colId = col.colId;
      var headerAlign = col.headerAlign || col.align;
      if (headerAlign === 'right') cell.classList.add('dg-align-right');
      if (headerAlign === 'center') cell.classList.add('dg-align-center');
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');

      if (col.headerCheckboxSelection && self.options.rowSelection === 'multiple') {
        cell.classList.add('dg-checkbox-header');
        var cb = el('input', 'dg-checkbox', cell);
        cb.type = 'checkbox';
        cb.setAttribute('aria-label', 'Select all rows');
        cb.addEventListener('click', function (e) { e.stopPropagation(); });
        cb.addEventListener('change', function () {
          if (self._hasTreeCheckbox()) {
            /* 트리 모드: 캐스케이드와 동일 규칙 — checkboxDisabled 행은 건드리지 않는다 */
            self._treeCheckAll(cb.checked);
          } else if (cb.checked) {
            self.selectAll();
          } else {
            self.deselectAll();
          }
        });
        self._headerSelectAllEl = cb;
      }

      var label = el('span', 'dg-header-cell-label', cell);
      label.textContent = col.headerName;

      cell.addEventListener('click', function (e) {
        if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn') || e.target.closest('.dg-checkbox')) return;
        self._emitter.emit('headerClicked', { colDef: col });
      });

      if (col.sortable) {
        cell.classList.add('dg-sortable');
        cell.insertAdjacentHTML('beforeend', SORT_ICON_SVG);
        var orderEl = el('span', 'dg-sort-order', cell);
        var sortIdx = self._sortModel.findIndex(function (s) { return s.field === col.field; });
        if (sortIdx !== -1) {
          cell.classList.add(self._sortModel[sortIdx].dir === 'asc' ? 'dg-sort-asc' : 'dg-sort-desc');
          cell.setAttribute('aria-sort', self._sortModel[sortIdx].dir === 'asc' ? 'ascending' : 'descending');
          if (self._sortModel.length > 1) orderEl.textContent = String(sortIdx + 1);
        }
        cell.addEventListener('click', function (e) {
          if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn')) return;
          self._toggleSort(col, e.shiftKey);
        });
      }

      if (col.filter) {
        cell.insertAdjacentHTML('beforeend', FILTER_ICON_SVG);
        if (self._filterModel[col.field]) cell.classList.add('dg-filter-active');
        var menuBtn = el('button', 'dg-header-menu-btn', cell);
        menuBtn.type = 'button';
        menuBtn.innerHTML = MENU_ICON_SVG;
        menuBtn.setAttribute('aria-label', col.headerName + ' filter menu');
        menuBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          /* 같은 컬럼 메뉴가 이미 열려 있으면 토글로 닫는다 */
          if (self._menuHeaderCell === cell) {
            self._closeMenu();
            return;
          }
          self._openFilterMenu(col, cell);
        });
      }

      if (col.resizable) {
        var resizer = el('div', 'dg-header-resizer', cell);
        self._bindResizer(resizer, col);
      }

      if (self.options.columnReorder !== false && !col.pinned && !col.checkboxSelection && !col.suppressMove) {
        self._bindReorder(cell, col);
      }

      self._headerCells[col.colId] = cell;
    });

    this._renderFloatingFilters();
  };

  /* ---- column group header (columnGroups — 2단 헤더) ---- */

  DataGrid.prototype._renderGroupHeader = function () {
    if (this._groupHeaderRowEl && this._groupHeaderRowEl.parentNode) {
      this._groupHeaderRowEl.parentNode.removeChild(this._groupHeaderRowEl);
    }
    this._groupHeaderRowEl = null;
    this._groupHeaderCells = [];
    var groups = this.options.columnGroups;
    if (!groups || groups.length === 0) return;

    var row = el('div', 'dg-header-group-row');
    row.setAttribute('role', 'row');
    this._headerEl.insertBefore(row, this._headerEl.firstChild);
    this._groupHeaderRowEl = row;

    var self = this;
    buildGroupHeaderRuns(this._visibleColumns(), groups).forEach(function (run) {
      var cell = el('div', 'dg-header-group-cell', row);
      if (run.group === -1) {
        cell.classList.add('dg-header-group-empty');
      } else {
        var label = el('span', 'dg-header-group-label', cell);
        label.textContent = run.headerName;
      }
      if (run.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (run.pinned === 'right') cell.classList.add('dg-pinned-right');
      self._groupHeaderCells.push({ el: cell, colIds: run.colIds, pinned: run.pinned });
    });
  };

  /* ---- floating filter row (헤더 아래 인라인 필터) ---- */

  /* set 필터 select에서 빈 문자열 값을 '(All)'(value="")과 구분하기 위한 센티널 */
  var FLOATING_BLANK = '__blank__';

  DataGrid.prototype._renderFloatingFilters = function () {
    var self = this;
    if (this._floatingRowEl && this._floatingRowEl.parentNode) {
      this._floatingRowEl.parentNode.removeChild(this._floatingRowEl);
    }
    this._floatingRowEl = null;
    this._floatingCells = {};

    var cols = this._visibleColumns();
    var hasFilter = cols.some(function (c) { return c.filter && c.field; });
    if (!this.options.floatingFilter || !hasFilter) return;

    var row = el('div', 'dg-floating-row', this._headerEl);
    row.setAttribute('role', 'row');
    this._floatingRowEl = row;

    cols.forEach(function (col) {
      var cell = el('div', 'dg-floating-cell', row);
      cell.dataset.colId = col.colId;
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      self._applyCellLayout(cell, col.colId);
      self._floatingCells[col.colId] = cell;
      if (!col.filter || !col.field) return;

      var current = self._filterModel[col.field];

      if (col.filter === 'set') {
        var select = el('select', 'dg-floating-input', cell);
        select.setAttribute('aria-label', col.headerName + ' filter');
        var optAll = el('option', null, select);
        optAll.value = '';
        optAll.textContent = '(All)';
        self._uniqueFieldValues(col.field).forEach(function (v) {
          var opt = el('option', null, select);
          opt.value = v === '' ? FLOATING_BLANK : v;
          opt.textContent = v === '' ? '(Blanks)' : v;
        });
        if (current && current.type === 'set' && current.values && current.values.length === 1) {
          var cv = String(current.values[0]);
          select.value = cv === '' ? FLOATING_BLANK : cv;
        }
        select.addEventListener('change', function () {
          var raw = select.value === '' ? null
            : select.value === FLOATING_BLANK ? '' : select.value;
          self._applyFloatingFilter(col, buildFloatingFilterModel('set', raw, null));
        });
        return;
      }

      var input = el('input', 'dg-floating-input', cell);
      input.type = col.filter === 'number' ? 'number' : 'text';
      input.placeholder = 'Filter…';
      input.setAttribute('aria-label', col.headerName + ' filter');
      if (current && current.value !== undefined) input.value = current.value;
      var timer = null;
      var apply = function () {
        self._applyFloatingFilter(
          col,
          buildFloatingFilterModel(col.filter, input.value, self._filterModel[col.field])
        );
      };
      input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(apply, 250);
      });
      input.addEventListener('keydown', function (e) {
        e.stopPropagation(); /* 그리드 키보드 내비게이션과 분리 */
        if (e.key === 'Enter') { clearTimeout(timer); apply(); }
        else if (e.key === 'Escape') {
          clearTimeout(timer);
          input.value = '';
          self._applyFloatingFilter(col, null);
        }
      });
    });
  };

  /* refresh()가 헤더 DOM을 재생성하므로, 필터 적용 후 입력 포커스·캐럿을 복원한다. */
  DataGrid.prototype._applyFloatingFilter = function (col, model) {
    var hadFocus = this._floatingCells[col.colId] &&
      this._floatingCells[col.colId].contains(document.activeElement);
    this.applyColumnFilter(col.field, model);
    if (!hadFocus) return;
    var cell = this._floatingCells[col.colId];
    var input = cell && cell.querySelector('.dg-floating-input');
    if (input) {
      input.focus();
      if (input.setSelectionRange && input.type === 'text') {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  };

  DataGrid.prototype._uniqueFieldValues = function (field) {
    var values = [];
    var seen = Object.create(null);
    this._rows.forEach(function (r) {
      var v = String(r[field]);
      if (!seen[v]) { seen[v] = true; values.push(v); }
    });
    values.sort();
    return values;
  };

  /* ---- column layout (widths + pinned offsets) ---- */

  DataGrid.prototype._layoutColumns = function () {
    if (this._destroyed) return;
    var cols = this._visibleColumns();
    var available = this._bodyEl.clientWidth || this._rootEl.clientWidth;

    var widths = computeColumnWidths(cols, this._colWidths, available);
    this._computedWidths = widths;

    /* 캔버스에 전체 컬럼 폭을 직접 고정한다 (BUG-003).
     * 행은 전부 absolute 배치라 캔버스 자체 폭에 기여하지 못하므로, 행 DOM을
     * 비웠다 다시 만드는 사이 강제 레이아웃이 끼면 scrollWidth가 뷰포트 폭으로
     * 붕괴해 브라우저가 scrollLeft를 0으로 클램프한다 (virtualX 가로 스크롤바
     * 드래그가 제자리로 튕기는 증상). 캔버스 min-width를 고정하면 행 유무와
     * 무관하게 가로 스크롤 폭이 안정된다. */
    var totalW = 0;
    cols.forEach(function (c) { totalW += widths[c.colId] || 0; });
    this._canvasEl.style.minWidth = 'max(100%, ' + totalW + 'px)';

    if (this.options.virtualX) this._updateColWindow();

    /* pinned offsets */
    var leftOffset = 0;
    var offsets = {};
    cols.forEach(function (c) {
      if (c.pinned === 'left') { offsets[c.colId] = { left: leftOffset }; leftOffset += widths[c.colId]; }
    });
    var rightOffset = 0;
    for (var i = cols.length - 1; i >= 0; i--) {
      var c = cols[i];
      if (c.pinned === 'right') { offsets[c.colId] = { right: rightOffset }; rightOffset += widths[c.colId]; }
    }
    this._pinnedOffsets = offsets;

    var lastLeft = null, firstRight = null;
    cols.forEach(function (c) {
      if (c.pinned === 'left') lastLeft = c.colId;
      if (c.pinned === 'right' && firstRight === null) firstRight = c.colId;
    });
    this._pinnedEdges = { left: lastLeft, right: firstRight };

    /* apply to header */
    for (var colId in this._headerCells) {
      this._applyCellLayout(this._headerCells[colId], colId);
    }
    /* apply to floating filter row */
    for (var flColId in this._floatingCells) {
      this._applyCellLayout(this._floatingCells[flColId], flColId);
    }
    /* apply to column group header (스팬 폭 = 멤버 폭 합) */
    if (this._groupHeaderCells) {
      var ghOffsets = offsets;
      this._groupHeaderCells.forEach(function (gh) {
        var w = 0;
        gh.colIds.forEach(function (id) { w += widths[id] || 0; });
        gh.el.style.width = w + 'px';
        if (gh.pinned === 'left' && ghOffsets[gh.colIds[0]]) {
          gh.el.style.left = ghOffsets[gh.colIds[0]].left + 'px';
        }
        if (gh.pinned === 'right' && ghOffsets[gh.colIds[gh.colIds.length - 1]]) {
          gh.el.style.right = ghOffsets[gh.colIds[gh.colIds.length - 1]].right + 'px';
        }
      });
    }
    /* apply to grand total footer */
    for (var fColId in this._footerCells) {
      this._applyCellLayout(this._footerCells[fColId], fColId);
    }
    /* apply to pinned top rows */
    if (this._pinnedTopEl && !this._pinnedTopEl.hidden) {
      for (var pt = 0; pt < this._pinnedTopEl.children.length; pt++) {
        var ptRow = this._pinnedTopEl.children[pt];
        for (var pc = 0; pc < ptRow.children.length; pc++) {
          this._applyCellLayout(ptRow.children[pc], ptRow.children[pc].dataset.colId);
        }
      }
    }
    /* apply to rendered rows */
    for (var idx in this._renderedRows) {
      var rowEl = this._renderedRows[idx];
      if (rowEl.classList.contains('dg-detail-row')) {
        var detailBody = rowEl.firstChild;
        if (detailBody) detailBody.style.width = (this._bodyEl.clientWidth || 400) + 'px';
        continue;
      }
      for (var j = 0; j < rowEl.children.length; j++) {
        this._applyCellLayout(rowEl.children[j], rowEl.children[j].dataset.colId);
      }
    }
  };

  /** 현재 스크롤 기준 컬럼 렌더 창을 갱신한다. 창이 바뀌었으면 true. */
  DataGrid.prototype._updateColWindow = function () {
    if (!this.options.virtualX) { this._colWindow = null; return false; }
    var self = this;
    var specs = this._visibleColumns().map(function (c) {
      return { width: (self._computedWidths && self._computedWidths[c.colId]) || c.width, pinned: c.pinned };
    });
    var next = computeColumnWindow(
      specs,
      this._bodyEl.scrollLeft,
      this._bodyEl.clientWidth || 800
    );
    if (this._colWindow && this._colWindow.c1 === next.c1 && this._colWindow.c2 === next.c2) {
      return false;
    }
    this._colWindow = next;
    return true;
  };

  DataGrid.prototype._applyCellLayout = function (cellEl, colId) {
    if (!cellEl || !colId || !this._computedWidths) return;
    cellEl.style.width = this._computedWidths[colId] + 'px';
    var off = this._pinnedOffsets[colId];
    if (off) {
      if (off.left !== undefined) cellEl.style.left = off.left + 'px';
      if (off.right !== undefined) cellEl.style.right = off.right + 'px';
    }
    cellEl.classList.toggle(
      'dg-pinned-edge',
      colId === this._pinnedEdges.left || colId === this._pinnedEdges.right
    );
  };

  /* ---- body rendering (virtualized) ---- */

  DataGrid.prototype._renderBody = function () {
    this._canvasEl.innerHTML = '';
    this._renderedRows = {};
    this._lastRange = null;
    this._canvasEl.style.height =
      (this._rowTops ? this._totalRowsHeight : this._pageRows.length * this._rowHeight) + 'px';
    this._renderVisibleRows(true);
  };

  DataGrid.prototype._renderVisibleRows = function (force) {
    var total = this._pageRows.length;
    var viewportH = this._bodyEl.clientHeight || 400;
    var first, last;
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
    for (var idx in this._renderedRows) {
      if (idx < first || idx >= last) {
        this._canvasEl.removeChild(this._renderedRows[idx]);
        delete this._renderedRows[idx];
      }
    }
    /* add missing rows */
    for (var i = first; i < last; i++) {
      if (!this._renderedRows[i]) {
        this._renderedRows[i] = this._buildRowEl(i);
        this._canvasEl.appendChild(this._renderedRows[i]);
      }
    }
  };

  DataGrid.prototype._buildRowEl = function (pageIndex) {
    var self = this;
    var row = this._pageRows[pageIndex];
    if (row && row.__detail) return this._buildDetailRowEl(pageIndex, row);
    if (row && row.__group) return this._buildGroupRowEl(pageIndex, row);
    var id = this._rowId(row);
    var rowEl = el('div', 'dg-row');
    rowEl.setAttribute('role', 'row');
    rowEl.style.top = this._rowTop(pageIndex) + 'px';
    if (this._rowHeights) rowEl.style.height = this._rowHeights[pageIndex] + 'px';
    rowEl.dataset.rowIndex = pageIndex;
    rowEl.dataset.rowId = id;
    var ordinal = this._pageOrdinals ? this._pageOrdinals[pageIndex] : pageIndex;
    var globalIndex = (this._pageInfo ? this._pageInfo.start : 0) + ordinal;
    if (globalIndex % 2 === 1) rowEl.classList.add('dg-row-odd');
    if (this._selection[id]) rowEl.classList.add('dg-row-selected');
    if (this.options.getRowClass) {
      try {
        var rowCls = this.options.getRowClass(row, globalIndex);
        if (rowCls) rowEl.classList.add.apply(rowEl.classList, String(rowCls).split(/\s+/));
      } catch (e) {
        console.error('[DataGrid] getRowClass failed:', e);
      }
    }
    var dirtyFields = null;
    if (this._trackChanges) {
      if (this._addedRows.indexOf(row) !== -1) rowEl.classList.add('dg-row-added');
      else if (this._originals) dirtyFields = this._originals.get(row) || null;
    }
    /* 스크롤로 새로 생성되는 행에도 셀 범위 표시를 적용 */
    var rangeRect = this._cellSelection ? this._normalizedRange() : null;
    if (rangeRect && (pageIndex < rangeRect.r1 || pageIndex > rangeRect.r2)) rangeRect = null;

    /* virtualX: 창 밖 일반 컬럼은 셀 대신 폭 스페이서로 대체 */
    var colWindow = this.options.virtualX ? this._colWindow : null;
    var leftSpacer = null;
    var rightSpacer = null;
    var skippedBefore = 0;
    var skippedAfter = 0;

    this._visibleColumns().forEach(function (col, cIdx) {
      if (colWindow && !col.pinned && (cIdx < colWindow.c1 || cIdx > colWindow.c2)) {
        var w = (self._computedWidths && self._computedWidths[col.colId]) || col.width;
        if (cIdx < colWindow.c1) {
          if (!leftSpacer) leftSpacer = el('div', 'dg-cell dg-colspacer', rowEl);
          skippedBefore += w;
        } else {
          if (!rightSpacer) rightSpacer = el('div', 'dg-cell dg-colspacer', rowEl);
          skippedAfter += w;
        }
        return;
      }
      var cell = el('div', 'dg-cell', rowEl);
      cell.setAttribute('role', 'gridcell');
      cell.dataset.colId = col.colId;
      cell.dataset.colIndex = cIdx;
      if (col.align === 'right') cell.classList.add('dg-align-right');
      if (col.align === 'center') cell.classList.add('dg-align-center');
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      if (col.wrapText) cell.classList.add('dg-cell-wrap');
      if (col.editable && self._editable) cell.classList.add('dg-cell-editable');
      if (dirtyFields && col.field !== undefined && (col.field in dirtyFields)) {
        cell.classList.add('dg-cell-dirty');
        cell.title = 'Original: ' + dirtyFields[col.field];
      }
      if (rangeRect && cIdx >= rangeRect.c1 && cIdx <= rangeRect.c2) {
        cell.classList.add('dg-cell-range');
      }
      if (col.cellClass) {
        var cls = typeof col.cellClass === 'function' ? col.cellClass(row[col.field], row) : col.cellClass;
        if (cls) cell.classList.add.apply(cell.classList, String(cls).split(/\s+/));
      }
      if (
        self._focusedCell &&
        self._focusedCell.r === pageIndex &&
        self._focusedCell.c === cIdx
      ) {
        cell.classList.add('dg-cell-focused');
      }
      self._applyCellLayout(cell, col.colId);

      /* mergeCells: run 시작 셀을 run 전체 높이로 늘려 하나의 병합 셀처럼 그리고
       * (값 세로 중앙, 불투명 배경이 아래 행들을 덮음), 이어지는 셀은 값 없이
       * 시작 셀 아래에 숨긴다. 시작 행이 렌더 창(버퍼) 밖으로 나가면 이어지는
       * 셀만 남는데, 그때는 기존처럼 경계선만 지운 빈 셀로 폴백된다. */
      var mergeInfo =
        self._mergeMap && col.field !== undefined ? self._mergeMap[col.field] : null;
      if (mergeInfo && mergeInfo.cont[pageIndex]) {
        cell.classList.add('dg-cell-merged');
        return;
      }
      if (mergeInfo && mergeInfo.span[pageIndex] > 1) {
        cell.classList.add('dg-cell-merge-start');
        var mergeEnd = pageIndex + mergeInfo.span[pageIndex];
        var mergeBottom = mergeEnd < self._pageRows.length
          ? self._rowTop(mergeEnd)
          : (self._rowTops ? self._totalRowsHeight : mergeEnd * self._rowHeight);
        /* -1px: run 마지막 행의 아래 경계선은 남긴다 */
        cell.style.height = (mergeBottom - self._rowTop(pageIndex) - 1) + 'px';
      }

      if (col.__rowNumber) {
        cell.classList.add('dg-rownum-cell');
        var num = el('span', 'dg-cell-value', cell);
        num.textContent = (globalIndex + 1).toLocaleString();
        return;
      }

      if (col.__detailToggle) {
        cell.classList.add('dg-detail-toggle-cell');
        var expanded = !!self._detailExpanded[id];
        var chev = el('span', 'dg-group-chevron' + (expanded ? ' dg-expanded' : ''), cell);
        chev.innerHTML = CHEVRON_SVG;
        cell.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        return;
      }

      if (col.checkboxSelection) {
        cell.classList.add('dg-checkbox-cell');
        var cb = el('input', 'dg-checkbox', cell);
        cb.type = 'checkbox';
        if (self._treeCheckboxMode) {
          /* 트리 모드: 선택 연동 체크박스 — cascade면 3상태(유도), 아니면 자기 선택 */
          var tState = self._treeChecked ? self._treeChecked[id] : !!self._selection[id];
          cb.checked = tState === true;
          cb.indeterminate = tState === 'indeterminate';
          cb.disabled = self._treeCheckOpts().isDisabled(row);
          cb.setAttribute('aria-label', 'Select subtree');
          cb.addEventListener('click', function (e) { e.stopPropagation(); });
          cb.addEventListener('change', function () {
            self._treeCheckToggle(row, cb.checked);
          });
        } else {
          cb.checked = !!self._selection[id];
          cb.setAttribute('aria-label', 'Select row');
          cb.addEventListener('click', function (e) { e.stopPropagation(); });
          cb.addEventListener('change', function () {
            self._setRowSelected(row, cb.checked, true);
          });
        }
        if (col.field === undefined) return; /* checkbox-only column */
      }

      /* treeData: 트리 컬럼에 들여쓰기 + 펼침 토글(자식 있을 때) */
      if (self._treeData && col.colId === self._treeColId && self._treeInfo) {
        var tInfo = self._treeInfo[id];
        if (tInfo) {
          cell.classList.add('dg-tree-cell');
          if (tInfo.level > 0) {
            var tIndent = el('span', 'dg-tree-indent', cell);
            tIndent.style.width = tInfo.level * (self._treeData.indent || 20) + 'px';
          }
          if (tInfo.hasChildren) {
            var tChev = el(
              'span',
              'dg-group-chevron dg-tree-toggle' +
                (tInfo.expanded ? ' dg-expanded' : '') +
                (self._treeLoading[id] ? ' dg-tree-loading' : ''),
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
      if (self._treeSummary && col.aggFunc && col.field) {
        var tNode = self._treeInfo && self._treeInfo[id];
        var tAgg = self._treeSummary[id];
        if (tNode && tNode.hasChildren && tAgg &&
            tAgg[col.field] !== null && tAgg[col.field] !== undefined) {
          cell.classList.add('dg-cell-agg');
          var tHolder = el('span', 'dg-cell-value', cell);
          tHolder.textContent = self._formatAggValue(col, tAgg[col.field]);
          return;
        }
      }

      self._renderCellValue(cell, col, row);
    });

    if (leftSpacer) leftSpacer.style.width = skippedBefore + 'px';
    if (rightSpacer) rightSpacer.style.width = skippedAfter + 'px';

    return rowEl;
  };

  /* 그룹 헤더 행: 일반 행과 같은 셀 레이아웃을 유지해 컬럼 폭·고정 컬럼과 정렬을 맞추고,
   * 첫 콘텐츠 컬럼에 셰브론+라벨+건수, aggFunc 컬럼에 집계값을 표시한다. */
  DataGrid.prototype._buildGroupRowEl = function (pageIndex, item) {
    var self = this;
    var rowEl = el('div', 'dg-row dg-group-row');
    rowEl.setAttribute('role', 'row');
    rowEl.setAttribute('aria-expanded', item.expanded ? 'true' : 'false');
    rowEl.style.top = this._rowTop(pageIndex) + 'px';
    rowEl.dataset.rowIndex = pageIndex;

    var cols = this._visibleColumns();
    var labelColId = null;
    for (var i = 0; i < cols.length; i++) {
      if (!cols[i].checkboxSelection && !cols[i].__rowNumber) { labelColId = cols[i].colId; break; }
    }

    cols.forEach(function (col, cIdx) {
      var cell = el('div', 'dg-cell', rowEl);
      cell.setAttribute('role', 'gridcell');
      cell.dataset.colId = col.colId;
      cell.dataset.colIndex = cIdx;
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      self._applyCellLayout(cell, col.colId);

      if (col.colId === labelColId) {
        cell.classList.add('dg-group-cell');
        if (item.level > 0) {
          var indent = el('span', 'dg-group-indent', cell);
          indent.style.width = 'calc(var(--dg-group-indent) * ' + item.level + ')';
        }
        var chevron = el('span', 'dg-group-chevron' + (item.expanded ? ' dg-expanded' : ''), cell);
        chevron.innerHTML = CHEVRON_SVG;
        var label = el('span', 'dg-group-label', cell);
        label.textContent =
          item.value === null || item.value === undefined || item.value === ''
            ? '(Blanks)'
            : String(item.value);
        var count = el('span', 'dg-group-count', cell);
        count.textContent = '(' + item.leafCount.toLocaleString() + ')';
        return;
      }

      if (col.aggFunc && col.field && item.agg[col.field] !== null && item.agg[col.field] !== undefined) {
        if (col.align === 'right') cell.classList.add('dg-align-right');
        if (col.align === 'center') cell.classList.add('dg-align-center');
        cell.classList.add('dg-cell-agg');
        var holder = el('span', 'dg-cell-value', cell);
        holder.textContent = self._formatAggValue(col, item.agg[col.field]);
      }
    });

    return rowEl;
  };

  /* 디테일 행: 전체 폭을 차지하는 컨테이너 하나. 내용은 rowDetail.renderer가 채운다. */
  DataGrid.prototype._buildDetailRowEl = function (pageIndex, item) {
    var rowEl = el('div', 'dg-row dg-detail-row');
    rowEl.setAttribute('role', 'row');
    rowEl.style.top = this._rowTop(pageIndex) + 'px';
    rowEl.style.height = this._detailHeight() + 'px';
    rowEl.dataset.rowIndex = pageIndex;
    var body = el('div', 'dg-detail-body', rowEl);
    body.style.width = (this._bodyEl.clientWidth || 400) + 'px';
    var renderer = this.options.rowDetail && this.options.rowDetail.renderer;
    if (renderer) {
      try {
        var out = renderer(item.row);
        if (out instanceof (global.Node || Object)) body.appendChild(out);
        else if (out !== undefined && out !== null) body.innerHTML = out;
      } catch (e) {
        console.error('[DataGrid] rowDetail.renderer failed:', e);
      }
    }
    return rowEl;
  };

  DataGrid.prototype._formatAggValue = function (col, value) {
    if (value === null || value === undefined) return '';
    if (col.valueFormatter && col.aggFunc !== 'count') {
      try { return String(col.valueFormatter(value, null)); }
      catch (e) { /* 집계 행에는 row가 없으므로 실패 시 원시 값으로 폴백 */ }
    }
    if (typeof value === 'number' && !Number.isInteger(value)) {
      value = Math.round(value * 100) / 100;
    }
    return typeof value === 'number' ? value.toLocaleString() : String(value);
  };

  DataGrid.prototype._renderCellValue = function (cell, col, row) {
    var value = col.field !== undefined ? row[col.field] : undefined;
    var formatted = value;
    if (col.valueFormatter) {
      try { formatted = col.valueFormatter(value, row); }
      catch (e) { console.error('[DataGrid] valueFormatter failed for "' + col.field + '":', e); }
    }
    var holder = el('span', 'dg-cell-value', cell);

    if (col.cellRenderer) {
      try {
        var out = col.cellRenderer({
          value: value, formatted: formatted, data: row, colDef: col,
          /* lazy 검색(editorSearch.fetch)에서 고른 value→label 캐시 (없으면 null) */
          optionLabels: (this._searchSelectLabels && this._searchSelectLabels[col.colId]) || null,
        });
        if (out instanceof (global.Node || Object)) holder.appendChild(out);
        else if (out !== undefined && out !== null) holder.innerHTML = out;
        return;
      } catch (e) {
        console.error('[DataGrid] cellRenderer failed for "' + col.field + '":', e);
      }
    }
    holder.textContent = formatted === null || formatted === undefined ? '' : String(formatted);
  };

  /* ---- sorting ---- */

  /** 제안된 정렬 모델로 beforeSort(취소 가능)를 거쳐 적용한다. */
  DataGrid.prototype._applySortModel = function (proposed) {
    var evt = { sortModel: proposed.slice(), cancel: false };
    this._emitter.emit('beforeSort', evt);
    if (evt.cancel) return;
    this._sortModel = evt.sortModel.slice();
    this.refresh();
    this._emitter.emit('sortChanged', { sortModel: this._sortModel.slice() });
    if (this._sortMode === 'server') this.reloadData();
  };

  DataGrid.prototype._toggleSort = function (col, additive) {
    if (!col.field) return;
    var existing = this._sortModel.find(function (s) { return s.field === col.field; });
    var next;
    if (!existing) next = 'asc';
    else if (existing.dir === 'asc') next = 'desc';
    else next = null;

    var proposed = additive
      ? this._sortModel.filter(function (s) { return s.field !== col.field; })
      : [];
    if (next) proposed.push({ field: col.field, dir: next });
    this._applySortModel(proposed);
  };

  DataGrid.prototype.setSortModel = function (model) {
    this._applySortModel((model || []).slice());
  };

  DataGrid.prototype.getSortModel = function () { return this._sortModel.slice(); };

  /* ---- filtering ---- */

  DataGrid.prototype._openFilterMenu = function (col, headerCell) {
    var self = this;
    this._closeMenu();

    var menu = el('div', 'dg-menu');
    menu.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    var title = el('div', 'dg-menu-title', menu);
    title.textContent = col.headerName;

    var current = this._filterModel[col.field] || {};
    var getModel;

    if (col.filter === 'set') {
      var values = this._uniqueFieldValues(col.field);
      var active = {};
      (current.values || values).forEach(function (v) { active[v] = true; });

      var list = el('div', 'dg-menu-set-list', menu);
      var itemCbs = [];
      values.forEach(function (v) {
        var item = el('label', 'dg-menu-set-item', list);
        var cb = el('input', 'dg-checkbox', item);
        cb.type = 'checkbox';
        cb.checked = !!active[v];
        cb.dataset.value = v;
        itemCbs.push(cb);
        var span = el('span', null, item);
        span.textContent = v === '' ? '(Blanks)' : v;
      });
      getModel = function () {
        var checked = itemCbs.filter(function (cb) { return cb.checked; })
          .map(function (cb) { return cb.dataset.value; });
        if (checked.length === values.length) return null; /* all = no filter */
        return { type: 'set', values: checked };
      };
    } else if (col.filter === 'number') {
      var opSel = el('select', null, menu);
      [
        ['equals', 'Equals'], ['notEqual', 'Not equal'],
        ['lessThan', 'Less than'], ['lessThanOrEqual', 'Less than or equal'],
        ['greaterThan', 'Greater than'], ['greaterThanOrEqual', 'Greater than or equal'],
        ['inRange', 'In range'],
      ].forEach(function (o) {
        var opt = el('option', null, opSel);
        opt.value = o[0]; opt.textContent = o[1];
      });
      opSel.value = current.op || 'equals';
      var input = el('input', null, menu);
      input.type = 'number';
      input.placeholder = 'Filter…';
      input.value = current.value !== undefined ? current.value : '';
      var inputTo = el('input', null, menu);
      inputTo.type = 'number';
      inputTo.placeholder = 'To…';
      inputTo.value = current.valueTo !== undefined ? current.valueTo : '';
      var syncRange = function () { inputTo.style.display = opSel.value === 'inRange' ? '' : 'none'; };
      opSel.addEventListener('change', syncRange);
      syncRange();
      getModel = function () {
        if (input.value === '') return null;
        return { type: 'number', op: opSel.value, value: input.value, valueTo: inputTo.value };
      };
    } else {
      var opSel2 = el('select', null, menu);
      [
        ['contains', 'Contains'], ['notContains', 'Does not contain'],
        ['equals', 'Equals'], ['notEqual', 'Not equal'],
        ['startsWith', 'Starts with'], ['endsWith', 'Ends with'],
      ].forEach(function (o) {
        var opt = el('option', null, opSel2);
        opt.value = o[0]; opt.textContent = o[1];
      });
      opSel2.value = current.op || 'contains';
      var input2 = el('input', null, menu);
      input2.type = 'text';
      input2.placeholder = 'Filter…';
      input2.value = current.value !== undefined ? current.value : '';
      getModel = function () {
        if (input2.value === '') return null;
        return { type: 'text', op: opSel2.value, value: input2.value };
      };
    }

    var actions = el('div', 'dg-menu-actions', menu);
    var clearBtn = el('button', 'dg-btn', actions);
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', function () {
      self.applyColumnFilter(col.field, null);
      self._closeMenu();
    });
    var applyBtn = el('button', 'dg-btn dg-btn-primary', actions);
    applyBtn.type = 'button';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', function () {
      self.applyColumnFilter(col.field, getModel());
      self._closeMenu();
    });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyBtn.click();
      if (e.key === 'Escape') self._closeMenu();
    });

    /* 메뉴는 .dg-root 안에 두어야 --dg-* 토큰과 다크 테마를 상속받는다.
     * (position:fixed이므로 위치는 뷰포트 기준 그대로 동작) */
    this._rootEl.appendChild(menu);
    var rect = headerCell.getBoundingClientRect();
    var menuW = menu.offsetWidth;
    menu.style.top = rect.bottom + 4 + 'px';
    menu.style.left = clamp(rect.left, 8, window.innerWidth - menuW - 8) + 'px';
    headerCell.classList.add('dg-menu-open');
    this._menuEl = menu;
    this._menuHeaderCell = headerCell;
    var focusable = menu.querySelector('input, select');
    if (focusable) focusable.focus();
  };

  DataGrid.prototype._closeMenu = function () {
    if (this._menuEl) {
      this._menuEl.parentNode && this._menuEl.parentNode.removeChild(this._menuEl);
      this._menuEl = null;
    }
    if (this._menuHeaderCell) {
      this._menuHeaderCell.classList.remove('dg-menu-open');
      this._menuHeaderCell = null;
    }
  };

  DataGrid.prototype.applyColumnFilter = function (field, model) {
    if (model) this._filterModel[field] = model;
    else delete this._filterModel[field];
    this._currentPage = 0;
    this.refresh();
    this._emitter.emit('filterChanged', { filterModel: this.getFilterModel() });
    if (this._filterMode === 'server') this.reloadData();
  };

  DataGrid.prototype.getFilterModel = function () {
    var out = {};
    for (var k in this._filterModel) out[k] = this._filterModel[k];
    return out;
  };

  DataGrid.prototype.clearFilters = function () {
    this._filterModel = {};
    this._quickFilter = '';
    this._currentPage = 0;
    this.refresh();
    this._emitter.emit('filterChanged', { filterModel: {} });
    if (this._filterMode === 'server') this.reloadData();
  };

  DataGrid.prototype.setQuickFilter = function (text) {
    this._quickFilter = text || '';
    this._currentPage = 0;
    this.refresh();
    this._emitter.emit('filterChanged', { filterModel: this.getFilterModel(), quickFilter: this._quickFilter });
    if (this._filterMode === 'server') this.reloadData();
  };

  /* ---- row grouping ---- */

  DataGrid.prototype.setGroupBy = function (fields) {
    this._groupBy = (fields || []).slice();
    this._groupToggled = {};
    this._groupDefaultExpanded = this.options.groupDefaultExpanded !== false;
    this._currentPage = 0;
    this._focusedCell = null;
    this.refresh();
    this._emitter.emit('groupChanged', { groupBy: this._groupBy.slice() });
  };

  DataGrid.prototype.getGroupBy = function () { return this._groupBy.slice(); };

  DataGrid.prototype.expandAllGroups = function () {
    this._groupDefaultExpanded = true;
    this._groupToggled = {};
    this.refresh();
  };

  DataGrid.prototype.collapseAllGroups = function () {
    this._groupDefaultExpanded = false;
    this._groupToggled = {};
    this._currentPage = 0;
    this.refresh();
  };

  DataGrid.prototype._toggleGroup = function (item) {
    var expanded = !item.expanded;
    this._groupToggled[item.path] = expanded;
    this.refresh();
    this._emitter.emit('groupToggled', {
      field: item.field,
      value: item.value,
      path: item.path,
      expanded: expanded,
    });
  };

  /* ---- master-detail rows (rowDetail) ---- */

  /** 행의 디테일 패널을 펼친다. rowDetail 미설정·이미 펼침이면 false. */
  DataGrid.prototype.expandRow = function (row) {
    if (!this.options.rowDetail || !row) return false;
    var id = this._rowId(row);
    if (this._detailExpanded[id]) return false;
    this._detailExpanded[id] = true;
    this.refresh();
    this._emitter.emit('rowExpanded', { data: row });
    return true;
  };

  /** 행의 디테일 패널을 접는다. 펼쳐져 있지 않으면 false. */
  DataGrid.prototype.collapseRow = function (row) {
    if (!this.options.rowDetail || !row) return false;
    var id = this._rowId(row);
    if (!this._detailExpanded[id]) return false;
    delete this._detailExpanded[id];
    this.refresh();
    this._emitter.emit('rowCollapsed', { data: row });
    return true;
  };

  DataGrid.prototype.toggleRowDetail = function (row) {
    if (!this.expandRow(row)) this.collapseRow(row);
  };

  DataGrid.prototype.isRowExpanded = function (row) {
    return !!(row && this._detailExpanded[this._rowId(row)]);
  };

  /* ---- tree API (treeData) ---- */

  /**
   * 노드 펼침/접힘. expanded 생략 시 토글. 상태가 바뀌면 true.
   * beforeNodeToggle(취소 가능) → 갱신 → nodeExpanded/nodeCollapsed 순으로 발생.
   */
  DataGrid.prototype.toggleNode = function (row, expanded) {
    if (!this._treeData || !row || !this._treeInfo) return false;
    var td = this._treeData;
    var id = this._rowId(row);
    var info = this._treeInfo[id];
    if (!info || !info.hasChildren) return false;
    var target = expanded === undefined ? !this._treeExpanded[id] : !!expanded;
    if (target === !!this._treeExpanded[id]) return false;

    /* fetchChildren: 첫 펼침이면 자식을 비동기 로드한 뒤 펼친다 */
    var kids = row[td.childrenField || 'children'];
    if (target && td.fetchChildren && !this._treeLoaded[id] && !(Array.isArray(kids) && kids.length > 0)) {
      return this._loadChildren(row);
    }

    var ev = { data: row, expanded: target, cancel: false };
    this._emitter.emit('beforeNodeToggle', ev);
    if (ev.cancel) return false;
    this._treeExpanded[id] = target;
    this.refresh();
    this._emitter.emit(target ? 'nodeExpanded' : 'nodeCollapsed', { data: row });
    return true;
  };

  /** fetchChildren 비동기 로드: 로딩 표시 → row.children에 부착 → 펼침. 시작하면 true. */
  DataGrid.prototype._loadChildren = function (row) {
    var self = this;
    var td = this._treeData;
    var id = this._rowId(row);
    if (this._treeLoading[id]) return false; /* 이미 로드 중 — 중복 요청 방지 */
    var ev = { data: row, expanded: true, cancel: false };
    this._emitter.emit('beforeNodeToggle', ev);
    if (ev.cancel) return false;
    this._treeLoading[id] = true;
    this.refreshRow(row); /* 토글에 로딩 스피너 표시 */
    Promise.resolve()
      .then(function () { return td.fetchChildren(row); })
      .then(function (children) {
        if (self._destroyed) return;
        delete self._treeLoading[id];
        self._treeLoaded[id] = true; /* 빈 배열이면 리프로 확정 (토글 제거) */
        row[td.childrenField || 'children'] = Array.isArray(children) ? children : [];
        self._treeExpanded[id] = true;
        self.refresh();
        self._emitter.emit('nodeExpanded', { data: row });
      })
      .catch(function (err) {
        if (self._destroyed) return;
        delete self._treeLoading[id];
        self.refreshRow(row); /* 스피너 제거 — 접힌 상태 유지, 재시도 가능 */
        console.error('[DataGrid] treeData.fetchChildren failed:', err);
        self._emitter.emit('dataLoadError', { error: err });
      });
    return true;
  };

  DataGrid.prototype.expandNode = function (row) { return this.toggleNode(row, true); };
  DataGrid.prototype.collapseNode = function (row) { return this.toggleNode(row, false); };

  DataGrid.prototype.isNodeExpanded = function (row) {
    return !!(row && this._treeExpanded[this._rowId(row)]);
  };

  /** level 미지정 = 전부 펼침. 지정 시 그 깊이 미만 레벨의 노드만 펼침 (예: 1 = 루트만). */
  DataGrid.prototype.expandAllNodes = function (level) {
    if (!this._treeData || !this._treeInfo) return;
    for (var id in this._treeInfo) {
      var info = this._treeInfo[id];
      if (info.hasChildren) {
        this._treeExpanded[id] = level === undefined || info.level < level;
      }
    }
    this.refresh();
  };

  DataGrid.prototype.collapseAllNodes = function () {
    if (!this._treeData || !this._treeInfo) return;
    for (var id in this._treeInfo) {
      if (this._treeInfo[id].hasChildren) this._treeExpanded[id] = false;
    }
    this.refresh();
  };

  /* ---- tree checkbox (checkboxSelection 컬럼 연동) ----
   * 별도 체크 상태를 두지 않는다: 행 선택(_selection)이 단일 진실이고,
   * 체크박스 표시는 deriveTreeCheckStates로 선택에서 유도한다.
   * 조회는 getSelectedRows(), 일괄 조작은 selectAll()/deselectAll(),
   * 이벤트는 beforeSelectionChange(취소 가능)/selectionChanged를 그대로 쓴다. */

  /** treeData + checkboxSelection 컬럼이 있으면 트리 체크박스 모드. */
  DataGrid.prototype._hasTreeCheckbox = function () {
    if (!this._treeData) return false;
    return this._columns.some(function (c) { return c.checkboxSelection; });
  };

  DataGrid.prototype._treeCheckOpts = function () {
    var td = this._treeData;
    return {
      cascade: td.cascade !== false, /* 기본 켜짐 */
      isDisabled: function (row) {
        if (!td.checkboxDisabled) return false;
        try {
          return !!td.checkboxDisabled(row);
        } catch (err) {
          console.error('[DataGrid] checkboxDisabled failed:', err);
          return false;
        }
      },
    };
  };

  /**
   * 트리 모드 체크박스 토글: 캐스케이드 결과를 행 선택으로 커밋한다.
   * 선택에 들어가는 행은 상태가 온전히 true인 행뿐(indeterminate 부모 제외).
   */
  DataGrid.prototype._treeCheckToggle = function (row, checked) {
    var self = this;
    var getId = function (r) { return self._rowId(r); };
    var opts = this._treeCheckOpts();
    if (opts.isDisabled(row)) return;
    /* indeterminate에서 출발한 클릭은 브라우저가 항상 checked=true를 준다.
     * 체크 가능한 리프가 이미 전부 선택돼 있으면(비활성 리프 때문에 완전
     * 체크 불가) "체크"는 무의미하므로 해제 의도로 해석한다 (BUG-004). */
    if (checked && opts.cascade && subtreeFullyChecked(
      this._treeRoots, row,
      function (r) { return !!self._selection[self._rowId(r)]; },
      opts.isDisabled
    )) {
      checked = false;
    }
    var next = {};
    if (opts.cascade) {
      var states = applyTreeCheck(
        this._treeRoots, getId, this._treeChecked || {}, row, !!checked, opts
      );
      collectTreeNodes(this._treeRoots).forEach(function (n) {
        if (states[getId(n.row)] === true) next[getId(n.row)] = n.row;
      });
    } else {
      for (var k in this._selection) next[k] = this._selection[k];
      if (checked) next[getId(row)] = row;
      else delete next[getId(row)];
    }
    if (!this._commitSelection(next)) {
      this.refreshRow(row); /* beforeSelectionChange 취소 → 체크박스 원복 */
    }
  };

  /**
   * 헤더 체크박스의 트리 모드 전체 체크/해제: 모든 루트에 캐스케이드를 적용한다.
   * checkboxDisabled 행은 건드리지 않으므로(캐스케이드와 동일 규칙),
   * 해제 시에도 비활성 행의 기존 선택은 유지된다.
   */
  DataGrid.prototype._treeCheckAll = function (checked) {
    var self = this;
    var getId = function (r) { return self._rowId(r); };
    var opts = this._treeCheckOpts();
    var next = {};
    if (opts.cascade) {
      var states = this._treeChecked || {};
      this._treeRoots.forEach(function (n) {
        states = applyTreeCheck(self._treeRoots, getId, states, n.row, !!checked, opts);
      });
      collectTreeNodes(this._treeRoots).forEach(function (n) {
        if (states[getId(n.row)] === true) next[getId(n.row)] = n.row;
      });
    } else {
      /* 비캐스케이드: 노드를 개별 설정 (disabled 행은 기존 선택 유지) */
      collectTreeNodes(this._treeRoots).forEach(function (n) {
        var id = getId(n.row);
        var selected = opts.isDisabled(n.row) ? !!self._selection[id] : !!checked;
        if (selected) next[id] = n.row;
      });
    }
    if (!this._commitSelection(next)) {
      this._syncSelectionDom(); /* 취소 → 헤더 체크박스 원복 */
    }
  };

  /* ---- pinned top rows ---- */

  /** 헤더 아래 고정 행(표시 전용 — 정렬·필터·선택·편집 대상 아님)을 렌더링한다. */
  DataGrid.prototype._renderPinnedTop = function () {
    var container = this._pinnedTopEl;
    if (!container) return;
    container.innerHTML = '';
    var rows = this._pinnedTopRows;
    container.hidden = !rows || rows.length === 0;
    if (container.hidden) return;
    var self = this;
    rows.forEach(function (row) {
      var rowEl = el('div', 'dg-row dg-pinned-top-row', container);
      rowEl.setAttribute('role', 'row');
      self._visibleColumns().forEach(function (col) {
        var cell = el('div', 'dg-cell', rowEl);
        cell.setAttribute('role', 'gridcell');
        cell.dataset.colId = col.colId;
        if (col.align === 'right') cell.classList.add('dg-align-right');
        if (col.align === 'center') cell.classList.add('dg-align-center');
        if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
        if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
        self._applyCellLayout(cell, col.colId);
        if (col.field !== undefined && !col.__rowNumber && !col.__detailToggle && !col.checkboxSelection) {
          self._renderCellValue(cell, col, row);
        }
      });
    });
    container.scrollLeft = this._bodyEl.scrollLeft;
  };

  /** 상단 고정 행을 교체한다 (빈 배열이면 숨김). */
  DataGrid.prototype.setPinnedTopRows = function (rows) {
    this._pinnedTopRows = (rows || []).slice();
    this._renderPinnedTop();
  };

  DataGrid.prototype.getPinnedTopRows = function () { return this._pinnedTopRows.slice(); };

  /* ---- grand total footer ---- */

  DataGrid.prototype._renderGrandTotal = function () {
    var self = this;
    this._footerRowEl.innerHTML = '';
    this._footerCells = {};
    var show = !!this.options.grandTotal && this._aggColumns.length > 0;
    this._footerEl.hidden = !show;
    if (!show) return;

    var rows = this._viewRows;
    var cols = this._visibleColumns();
    var labelColId = null;
    for (var i = 0; i < cols.length; i++) {
      if (!cols[i].checkboxSelection && !cols[i].aggFunc && !cols[i].__rowNumber) { labelColId = cols[i].colId; break; }
    }

    cols.forEach(function (col) {
      var cell = el('div', 'dg-cell', self._footerRowEl);
      cell.dataset.colId = col.colId;
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      self._applyCellLayout(cell, col.colId);
      self._footerCells[col.colId] = cell;

      if (col.colId === labelColId) {
        var label = el('span', 'dg-footer-label', cell);
        label.textContent = 'Total';
        var count = el('span', 'dg-group-count', cell);
        count.textContent = '(' + rows.length.toLocaleString() + ')';
        return;
      }
      if (col.aggFunc && col.field) {
        if (col.align === 'right') cell.classList.add('dg-align-right');
        if (col.align === 'center') cell.classList.add('dg-align-center');
        cell.classList.add('dg-cell-agg');
        var holder = el('span', 'dg-cell-value', cell);
        holder.textContent = self._formatAggValue(col, aggregateValues(rows, col.field, col.aggFunc));
      }
    });
    this._footerEl.scrollLeft = this._bodyEl.scrollLeft;
  };

  /* ---- selection ---- */

  /**
   * 제안된 선택 상태(next: id → row)를 beforeSelectionChange(취소 가능)를
   * 거쳐 적용한다. 취소되면 false를 반환하고 아무것도 바꾸지 않는다.
   */
  DataGrid.prototype._commitSelection = function (next) {
    var proposed = [];
    for (var id in next) proposed.push(next[id]);
    var evt = { selectedRows: proposed, cancel: false };
    this._emitter.emit('beforeSelectionChange', evt);
    if (evt.cancel) return false;
    this._selection = next;
    this._syncSelectionDom();
    this._emitSelection();
    return true;
  };

  DataGrid.prototype._setRowSelected = function (row, selected, emit) {
    var mode = this.options.rowSelection;
    if (!mode) return;
    var id = this._rowId(row);
    var next = {};
    if (mode !== 'single') {
      for (var k in this._selection) next[k] = this._selection[k];
    }
    if (selected) next[id] = row;
    else delete next[id];
    if (emit) {
      this._commitSelection(next);
    } else {
      this._selection = next;
      this._syncSelectionDom();
    }
  };

  DataGrid.prototype._syncSelectionDom = function () {
    var self = this;
    /* 트리 체크박스 모드: 선택이 어떤 경로로 바뀌었든 3상태를 다시 유도 */
    if (this._treeChecked && this._treeRoots) {
      this._treeChecked = deriveTreeCheckStates(
        this._treeRoots,
        function (r) { return self._rowId(r); },
        function (r) { return !!self._selection[self._rowId(r)]; }
      );
    }
    for (var idx in this._renderedRows) {
      var rowEl = this._renderedRows[idx];
      var selected = !!this._selection[rowEl.dataset.rowId];
      rowEl.classList.toggle('dg-row-selected', selected);
      var cb = rowEl.querySelector('.dg-checkbox-cell .dg-checkbox');
      if (cb) {
        if (this._treeChecked) {
          var tState = this._treeChecked[rowEl.dataset.rowId];
          cb.checked = tState === true;
          cb.indeterminate = tState === 'indeterminate';
        } else {
          cb.checked = selected;
        }
      }
    }
    if (this._headerSelectAllEl) {
      var count;
      var total;
      if (this._treeCheckboxMode && this._treeRoots) {
        /* 트리 모드: 체크 가능한(비활성 아닌) 행만 기준으로 전체/일부 판단.
         * 캐스케이드에서는 부모 선택이 자식에서 유도되고, 비활성 자손을 가진
         * 부모는 결코 true가 될 수 없으므로 리프만 센다 — 아니면 헤더가
         * indeterminate에 갇혀 전체 해제가 불가능해진다. */
        var opts = this._treeCheckOpts();
        count = 0;
        total = 0;
        var sel = this._selection;
        collectTreeNodes(this._treeRoots).forEach(function (n) {
          if (opts.isDisabled(n.row)) return;
          if (opts.cascade && n.children.length > 0) return;
          total++;
          if (sel[self._rowId(n.row)]) count++;
        });
      } else {
        count = this.getSelectedRows().length;
        total = this._viewRows.length;
      }
      this._headerSelectAllEl.checked = count > 0 && count >= total && total > 0;
      this._headerSelectAllEl.indeterminate = count > 0 && count < total;
    }
  };

  DataGrid.prototype._emitSelection = function () {
    this._emitter.emit('selectionChanged', { selectedRows: this.getSelectedRows() });
  };

  DataGrid.prototype.getSelectedRows = function () {
    var out = [];
    for (var id in this._selection) out.push(this._selection[id]);
    return out;
  };

  DataGrid.prototype.selectAll = function () {
    if (this.options.rowSelection !== 'multiple') return;
    var self = this;
    var next = {};
    for (var k in this._selection) next[k] = this._selection[k];
    this._viewRows.forEach(function (row) { next[self._rowId(row)] = row; });
    this._commitSelection(next);
  };

  DataGrid.prototype.deselectAll = function () {
    this._commitSelection({});
  };

  /* ---- cell / block selection (cellSelection) ---- */

  DataGrid.prototype._setCellRange = function (anchor, focus) {
    var prev = this._cellRange;
    this._cellRange = { anchor: anchor, focus: focus };
    if (!prev || prev.anchor.r !== anchor.r || prev.anchor.c !== anchor.c) {
      this._setFocusedCell(anchor.r, anchor.c);
    }
    this._syncRangeDom();
    this._emitter.emit('cellRangeChanged', { range: this.getCellRange() });
  };

  DataGrid.prototype._normalizedRange = function () {
    if (!this._cellRange) return null;
    var a = this._cellRange.anchor;
    var f = this._cellRange.focus;
    return {
      r1: Math.min(a.r, f.r), r2: Math.max(a.r, f.r),
      c1: Math.min(a.c, f.c), c2: Math.max(a.c, f.c),
    };
  };

  DataGrid.prototype._syncRangeDom = function () {
    var range = this._normalizedRange();
    for (var idx in this._renderedRows) {
      var rowEl = this._renderedRows[idx];
      var r = Number(idx);
      var isGroup = rowEl.classList.contains('dg-group-row');
      for (var j = 0; j < rowEl.children.length; j++) {
        var cell = rowEl.children[j];
        var c = Number(cell.dataset.colIndex);
        var inRange = !!range && !isGroup &&
          r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
        cell.classList.toggle('dg-cell-range', inRange);
      }
    }
    if (this.options.fillHandle) this._positionFillHandle(range);
  };

  /* ---- fill handle (fillHandle — 엑셀식 채우기) ---- */

  /** 범위 우하단 셀에 채우기 핸들을 붙인다. 화면 밖이면 숨긴다. */
  DataGrid.prototype._positionFillHandle = function (range) {
    if (this._fillHandleEl && this._fillHandleEl.parentNode) {
      this._fillHandleEl.parentNode.removeChild(this._fillHandleEl);
    }
    if (!range) return;
    var rowEl = this._renderedRows[range.r2];
    if (!rowEl || rowEl.classList.contains('dg-group-row') || rowEl.classList.contains('dg-detail-row')) return;
    var cell = rowEl.querySelector('[data-col-index="' + range.c2 + '"]');
    if (!cell) return;
    if (!this._fillHandleEl) {
      var self = this;
      this._fillHandleEl = document.createElement('div');
      this._fillHandleEl.className = 'dg-fill-handle';
      this._fillHandleEl.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        self._fillDrag = { range: self._normalizedRange(), target: null };
      });
    }
    /* 핸들의 absolute 기준점 — 고정(sticky) 셀은 이미 positioned */
    if (!cell.classList.contains('dg-pinned-left') && !cell.classList.contains('dg-pinned-right')) {
      cell.classList.add('dg-cell-fill-anchor');
    }
    cell.appendChild(this._fillHandleEl);
  };

  /** 드래그 중 채우기 대상 미리보기(세로 확장만 지원). */
  DataGrid.prototype._previewFill = function (hitR) {
    var d = this._fillDrag;
    if (!d) return;
    var range = d.range;
    d.target = hitR > range.r2 ? { from: range.r2 + 1, to: hitR, dir: 1 }
      : hitR < range.r1 ? { from: hitR, to: range.r1 - 1, dir: -1 }
      : null;
    for (var idx in this._renderedRows) {
      var rowEl = this._renderedRows[idx];
      var r = Number(idx);
      var inRows = !!d.target && r >= d.target.from && r <= d.target.to;
      for (var j = 0; j < rowEl.children.length; j++) {
        var cell = rowEl.children[j];
        var c = Number(cell.dataset.colIndex);
        cell.classList.toggle('dg-cell-fill-preview', inRows && c >= range.c1 && c <= range.c2);
      }
    }
  };

  /** 드래그 종료: 원본 범위의 컬럼별 값으로 대상 행을 채운다 (숫자 등차 외삽/패턴 반복). */
  DataGrid.prototype._applyFillDrag = function () {
    var d = this._fillDrag;
    var self = this;
    if (!d || !d.target) { this._previewFill(-1); return; }
    var range = d.range;
    var target = d.target;
    var cols = this._visibleColumns();
    var updated = 0;
    var rowChangesMap = []; /* [{row, changes}] — 행 단위 rowValueChanged 묶음 */

    for (var c = range.c1; c <= range.c2; c++) {
      var col = cols[c];
      if (!col || !col.editable || !this._editable || col.field === undefined) continue;
      var source = [];
      for (var r = range.r1; r <= range.r2; r++) {
        var srow = this._pageRows[r];
        if (srow && !srow.__group && !srow.__detail) source.push(srow[col.field]);
      }
      if (source.length === 0) continue;
      var count = target.to - target.from + 1;
      var seq = target.dir === 1 ? fillSeries(source, count) : fillSeries(source.slice().reverse(), count);
      for (var i = 0; i < count; i++) {
        var tr = target.dir === 1 ? target.from + i : target.to - i;
        var trow = this._pageRows[tr];
        if (!trow || trow.__group || trow.__detail) continue;
        var value = seq[i];
        var oldValue = trow[col.field];
        if (value === oldValue) continue;
        if (col.validator) {
          var result;
          try { result = col.validator(value, trow); }
          catch (e) { result = true; }
          if (validationMessage(result)) continue;
        }
        var evt = { data: trow, colDef: col, oldValue: oldValue, newValue: value, cancel: false };
        this._emitter.emit('beforeCellSave', evt);
        if (evt.cancel) continue;
        trow[col.field] = evt.newValue;
        this._recordUpdate(trow, col.field, oldValue, evt.newValue);
        updated++;
        this._emitter.emit('cellValueChanged', {
          data: trow, colDef: col, oldValue: oldValue, newValue: evt.newValue,
        });
        var entry = null;
        for (var m = 0; m < rowChangesMap.length; m++) {
          if (rowChangesMap[m].row === trow) { entry = rowChangesMap[m]; break; }
        }
        if (!entry) { entry = { row: trow, changes: {} }; rowChangesMap.push(entry); }
        entry.changes[col.field] = { oldValue: oldValue, newValue: evt.newValue };
      }
    }
    rowChangesMap.forEach(function (en) {
      self._emitter.emit('rowValueChanged', { data: en.row, changes: en.changes });
    });

    /* 범위를 채운 영역까지 확장하고 다시 그린다 */
    this._cellRange = {
      anchor: { r: Math.min(range.r1, target.from), c: range.c1 },
      focus: { r: Math.max(range.r2, target.to), c: range.c2 },
    };
    this.refresh();
    this._syncRangeDom();
    if (updated > 0) this._emitter.emit('fillApplied', { updatedCells: updated });
  };

  /** 현재 셀 범위(페이지 좌표 정규화 + 대상 컬럼/리프 행)를 반환. 없으면 null. */
  DataGrid.prototype.getCellRange = function () {
    var range = this._normalizedRange();
    if (!range) return null;
    var cols = this._visibleColumns().slice(range.c1, range.c2 + 1);
    var rows = [];
    for (var r = range.r1; r <= range.r2; r++) {
      var row = this._pageRows[r];
      if (row && !row.__group && !row.__detail) rows.push(row);
    }
    return {
      startRow: range.r1, endRow: range.r2,
      startCol: range.c1, endCol: range.c2,
      columns: cols,
      fields: cols.map(function (c) { return c.field; }).filter(function (f) { return f !== undefined; }),
      rows: rows,
    };
  };

  DataGrid.prototype.clearCellRange = function () {
    this._cellRange = null;
    this._syncRangeDom();
  };

  /* ---- text search (findNext) ---- */

  /**
   * 현재 뷰(표시 순서)에서 text를 포함하는 다음 셀을 찾아 포커스·스크롤한다.
   * 같은 텍스트로 다시 호출하면 다음 매치로 이동하고 끝에서 처음으로 감싼다.
   * 매치가 없으면 null.
   */
  DataGrid.prototype.findNext = function (text) {
    var needle = String(text || '');
    if (!needle) { this._findCursor = null; return null; }
    var fields = this._visibleColumns()
      .map(function (c) { return c.field; })
      .filter(function (f) { return f !== undefined; });
    var cursor = this._findCursor && this._findCursor.text === needle.toLowerCase()
      ? this._findCursor
      : null;
    var m = findNextMatch(this._displayRows, fields, needle, cursor);
    if (!m) { this._findCursor = null; return null; }
    this._findCursor = { text: needle.toLowerCase(), index: m.index, col: m.col };
    this.focusCell(m.index, fields[m.col]);
    return { data: this._displayRows[m.index], field: fields[m.col], rowIndex: m.index };
  };

  /* ---- cell / row interaction ---- */

  DataGrid.prototype._cellFromEvent = function (e) {
    var cellEl = e.target.closest('.dg-cell');
    if (!cellEl || !this._canvasEl.contains(cellEl)) return null;
    var rowEl = cellEl.parentNode;
    var r = Number(rowEl.dataset.rowIndex);
    return {
      cellEl: cellEl,
      rowEl: rowEl,
      r: r,
      c: Number(cellEl.dataset.colIndex),
      row: this._pageRows[r],
      col: this._visibleColumns()[Number(cellEl.dataset.colIndex)],
    };
  };

  DataGrid.prototype._onCellClick = function (e) {
    var hit = this._cellFromEvent(e);
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

    /* cellSelection에서는 클릭 행 선택을 끈다 (체크박스 선택은 유지) */
    var mode = this.options.rowSelection;
    if (mode && !this._cellSelection && !e.target.closest('.dg-checkbox')) {
      var id = this._rowId(hit.row);
      if (mode === 'multiple' && e.shiftKey && this._lastClickedViewIndex !== -1) {
        var from = Math.min(this._lastClickedViewIndex, hit.r);
        var to = Math.max(this._lastClickedViewIndex, hit.r);
        var next = {};
        if (e.ctrlKey || e.metaKey) {
          for (var k in this._selection) next[k] = this._selection[k];
        }
        for (var i = from; i <= to; i++) {
          var row = this._pageRows[i];
          if (row && !row.__group) next[this._rowId(row)] = row;
        }
        this._commitSelection(next);
      } else if (mode === 'multiple' && (e.ctrlKey || e.metaKey)) {
        this._setRowSelected(hit.row, !this._selection[id], true);
        this._lastClickedViewIndex = hit.r;
      } else {
        var wasOnlySelected = this._selection[id] && this.getSelectedRows().length === 1;
        var single = {};
        if (!wasOnlySelected) single[id] = hit.row;
        this._commitSelection(single);
        this._lastClickedViewIndex = hit.r;
      }
    }

    this._emitter.emit('cellClicked', { data: hit.row, colDef: hit.col, value: hit.col && hit.col.field !== undefined ? hit.row[hit.col.field] : undefined });
    this._emitter.emit('rowClicked', { data: hit.row, rowIndex: hit.r });

    /* editOnSingleClick: 클릭 한 번으로 편집 시작 (체크박스 클릭 제외) */
    if (
      this.options.editOnSingleClick &&
      hit.col && hit.col.editable && this._editable &&
      !e.target.closest('.dg-checkbox')
    ) {
      this._startEdit(hit);
    }
  };

  DataGrid.prototype._onCellDblClick = function (e) {
    var hit = this._cellFromEvent(e);
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
    if (hit.col && hit.col.editable && this._editable) this._startEdit(hit);
  };

  DataGrid.prototype._setFocusedCell = function (r, c) {
    var prev = this._rootEl.querySelector('.dg-cell-focused');
    if (prev) prev.classList.remove('dg-cell-focused');
    this._focusedCell = { r: r, c: c };
    var rowEl = this._renderedRows[r];
    if (rowEl) {
      var cell = rowEl.querySelector('[data-col-index="' + c + '"]');
      if (cell) cell.classList.add('dg-cell-focused');
    }
  };

  DataGrid.prototype._onKeyDown = function (e) {
    if (this._enabled === false) return; /* setEnabled(false) — 입력 잠금 */
    if (this._editing) return; /* editor handles its own keys */

    if (this._focusedCell) {
      var fRow = this._pageRows[this._focusedCell.r];
      var fCol = this._visibleColumns()[this._focusedCell.c];
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
      var focus = this._cellRange.focus;
      var nr2 = focus.r + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0);
      var nc2 = focus.c + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0);
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
      var tsv = this._selectionTsv();
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
      var self = this;
      var seqBefore = this._pasteCount;
      if (this._focusedCell && navigator.clipboard && navigator.clipboard.readText) {
        setTimeout(function () {
          if (self._pasteCount !== seqBefore || self._destroyed) return;
          navigator.clipboard.readText()
            .then(function (text) { if (text) self.pasteTsv(text); })
            .catch(function () { /* 권한 거부 — 붙여넣기 불가 환경 */ });
        }, 80);
      }
      return;
    }

    if (!this._focusedCell) return;
    var r = this._focusedCell.r;
    var c = this._focusedCell.c;
    var maxR = this._pageRows.length - 1;
    var maxC = this._visibleColumns().length - 1;
    var handled = true;

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
        var row = this._pageRows[r];
        if (row && row.__group) { this._toggleGroup(row); break; }
        var col = this._visibleColumns()[c];
        if (col && col.editable && this._editable && row) {
          var rowEl = this._renderedRows[r];
          var cellEl = rowEl && rowEl.querySelector('[data-col-index="' + c + '"]');
          if (cellEl) this._startEdit({ cellEl: cellEl, r: r, c: c, row: row, col: col });
        }
        break;
      }
      case ' ': {
        var srow = this._pageRows[r];
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
        if (this._cellSelection) this._setCellRange({ r: r, c: c }, { r: r, c: c });
      }
    }
  };

  DataGrid.prototype._scrollRowIntoView = function (r) {
    var top = this._rowTop(r);
    var item = this._pageRows[r];
    var h = this._rowHeights
      ? this._rowHeights[r]
      : item && item.__detail ? this._detailHeight() : this._rowHeight;
    var bottom = top + h;
    if (top < this._bodyEl.scrollTop) this._bodyEl.scrollTop = top;
    else if (bottom > this._bodyEl.scrollTop + this._bodyEl.clientHeight) {
      this._bodyEl.scrollTop = bottom - this._bodyEl.clientHeight;
    }
  };

  /* ---- programmatic navigation ---- */

  /** 표시 리스트 인덱스의 행이 다른 페이지면 이동하고, 페이지 내 인덱스를 반환. 범위 밖이면 -1. */
  DataGrid.prototype._goToDisplayIndex = function (displayIndex) {
    if (displayIndex < 0 || displayIndex >= this._displayRows.length) return -1;
    if (this._pagination) {
      var page = Math.floor(displayIndex / this._pageSize);
      if (page !== this._currentPage) this.setPage(page);
      return displayIndex - this._currentPage * this._pageSize;
    }
    return displayIndex;
  };

  /**
   * 표시 리스트(그룹 헤더 포함) 기준 rowIndex의 셀에 포커스를 준다.
   * field 생략 시 첫 번째 콘텐츠 컬럼. 페이지 이동·스크롤을 포함하며 성공 여부를 반환.
   */
  DataGrid.prototype.focusCell = function (rowIndex, field) {
    var cols = this._visibleColumns();
    var cIdx = -1;
    if (field === undefined) {
      cIdx = cols.findIndex(function (c) { return c.field !== undefined; });
    } else {
      cIdx = cols.findIndex(function (c) { return c.field === field; });
    }
    if (cIdx === -1) return false;
    var pageIndex = this._goToDisplayIndex(rowIndex);
    if (pageIndex === -1) return false;
    this._scrollRowIntoView(pageIndex);
    this._renderVisibleRows();
    this._setFocusedCell(pageIndex, cIdx);
    this.ensureColumnVisible(cols[cIdx].colId);
    return true;
  };

  /** 행 객체가 현재 뷰에 보이도록 페이지 이동 + 세로 스크롤. 뷰에 없으면 false. */
  DataGrid.prototype.ensureRowVisible = function (row) {
    var displayIndex = this._displayRows.indexOf(row);
    var pageIndex = this._goToDisplayIndex(displayIndex);
    if (pageIndex === -1) return false;
    this._scrollRowIntoView(pageIndex);
    this._renderVisibleRows();
    return true;
  };

  /** 컬럼이 고정 컬럼에 가리지 않고 보이도록 가로 스크롤. 없거나 숨김이면 false. */
  DataGrid.prototype.ensureColumnVisible = function (colId) {
    var cols = this._visibleColumns();
    var target = null;
    var x = 0;
    for (var i = 0; i < cols.length; i++) {
      if (cols[i].colId === colId || cols[i].field === colId) { target = cols[i]; break; }
      x += this._computedWidths[cols[i].colId] || 0;
    }
    if (!target) return false;
    if (target.pinned) return true; /* 고정 컬럼은 항상 보인다 */
    var w = this._computedWidths[target.colId] || 0;
    var pinnedLeft = 0;
    var pinnedRight = 0;
    var self = this;
    cols.forEach(function (c) {
      if (c.pinned === 'left') pinnedLeft += self._computedWidths[c.colId] || 0;
      if (c.pinned === 'right') pinnedRight += self._computedWidths[c.colId] || 0;
    });
    var viewLeft = this._bodyEl.scrollLeft + pinnedLeft;
    var viewRight = this._bodyEl.scrollLeft + this._bodyEl.clientWidth - pinnedRight;
    if (x < viewLeft) this._bodyEl.scrollLeft = x - pinnedLeft;
    else if (x + w > viewRight) this._bodyEl.scrollLeft = x + w - this._bodyEl.clientWidth + pinnedRight;
    return true;
  };

  /* ---- editing ---- */

  var editorSeq = 0; /* radio 에디터의 name 그룹 유일성 보장용 */

  DataGrid.prototype._startEdit = function (hit) {
    this._cancelEdit();
    var col = hit.col;
    var row = hit.row;
    var value = row[col.field];
    var cellEl = hit.cellEl;
    var self = this;
    cellEl.innerHTML = '';

    /* 에디터 준비 — 내장(input/select) 또는 커스텀 객체({ init, getValue, destroy }) */
    var isCustom = col.editor && typeof col.editor === 'object';
    var editorType = isCustom ? 'custom'
      : col.editor || (col.dataType === 'number' || col.filter === 'number' ? 'number' : 'text');
    var input = null;
    var invalidEl; /* dg-invalid 표시 대상 */
    var getValue;
    var cleanup = null;

    /* 셀 앵커 패널(multiselect/radio/searchselect 공용) — 아래 공간이 부족하고
     * 위가 더 넉넉하면 위로 펼침. 내용이 바뀌어 다시 불러도 안전하게 양방향 설정. */
    var flipPanelUp = function (panel) {
      var bodyRect = self._bodyEl.getBoundingClientRect();
      var cellRect = cellEl.getBoundingClientRect();
      if (cellRect.bottom + panel.offsetHeight + 4 > bodyRect.bottom &&
          cellRect.top - panel.offsetHeight - 4 > bodyRect.top) {
        panel.style.top = 'auto';
        panel.style.bottom = 'calc(100% + 2px)';
      } else {
        panel.style.top = 'calc(100% + 2px)';
        panel.style.bottom = 'auto';
      }
    };

    if (isCustom) {
      try {
        col.editor.init(cellEl, value, row, col);
      } catch (e) {
        console.error('[DataGrid] custom editor init failed for "' + col.field + '":', e);
        this._renderCellValue(cellEl, col, row);
        return;
      }
      cellEl.classList.add('dg-cell-editing');
      getValue = function () {
        try { return col.editor.getValue(); }
        catch (e) {
          console.error('[DataGrid] custom editor getValue failed for "' + col.field + '":', e);
          return value;
        }
      };
      cleanup = function () {
        cellEl.classList.remove('dg-cell-editing');
        if (col.editor.destroy) {
          try { col.editor.destroy(); }
          catch (e) { console.error('[DataGrid] custom editor destroy failed:', e); }
        }
      };
      invalidEl = cellEl;
      var focusable = cellEl.querySelector('input, select, textarea, [tabindex]');
      if (focusable) focusable.focus();
    } else if (editorType === 'checkbox') {
      /* 인라인 체크박스 — 셀 자체가 편집 프레임(dg-cell-editing).
       * editorOptions: { checked, unchecked }로 'Y'/'N', 0/1 같은 표기 매핑 지원. */
      var cbOpts = col.editorOptions && typeof col.editorOptions === 'object' &&
        !Array.isArray(col.editorOptions) ? col.editorOptions : null;
      input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'dg-checkbox';
      input.checked = isCheckedValue(value, cbOpts);
      cellEl.classList.add('dg-cell-editing');
      cleanup = function () { cellEl.classList.remove('dg-cell-editing'); };
      cellEl.appendChild(input);
      input.focus();
      getValue = function () {
        if (cbOpts && 'checked' in cbOpts) {
          return input.checked ? cbOpts.checked : cbOpts.unchecked;
        }
        return input.checked;
      };
      invalidEl = cellEl;
    } else if (editorType === 'radio') {
      /* 라디오 패널 — multiselect와 같은 셀 앵커 패널에서 단일 선택 */
      var radioOptions = normalizeEditorOptions(col.editorOptions);
      var radioWrap = el('div', 'dg-editor-radio', cellEl);
      radioWrap.tabIndex = -1; /* 패널 배경 클릭 시에도 포커스가 셀 안에 머물게 */
      var radioName = 'dg-radio-' + (editorSeq++);
      radioOptions.forEach(function (o) {
        var lab = el('label', '', radioWrap);
        var rb = document.createElement('input');
        rb.type = 'radio';
        rb.name = radioName;
        rb.className = 'dg-radio';
        rb.__dgValue = o.value;
        rb.checked = o.value === value ||
          (value !== null && value !== undefined && String(o.value) === String(value));
        lab.appendChild(rb);
        lab.appendChild(document.createTextNode(o.label));
      });
      cellEl.classList.add('dg-cell-editing');
      flipPanelUp(radioWrap);
      cleanup = function () { cellEl.classList.remove('dg-cell-editing'); };
      var checkedRadio = radioWrap.querySelector('input:checked') || radioWrap.querySelector('input');
      if (checkedRadio) checkedRadio.focus();
      getValue = function () {
        var picked = radioWrap.querySelector('input:checked');
        return picked ? picked.__dgValue : value; /* 아무것도 안 고르면 이전 값 유지 */
      };
      invalidEl = cellEl;
    } else if (editorType === 'multiselect') {
      /* 체크리스트 패널 — 값은 배열, editorOptions 순서로 커밋 */
      var msOptions = normalizeEditorOptions(col.editorOptions);
      var msCurrent = normalizeMultiValue(value);
      var panel = el('div', 'dg-editor-multiselect', cellEl);
      panel.tabIndex = -1; /* 패널 배경 클릭 시에도 포커스가 셀 안에 머물게 */
      msOptions.forEach(function (o) {
        var lab = el('label', '', panel);
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'dg-checkbox';
        cb.__dgValue = o.value;
        cb.checked = msCurrent.indexOf(o.value) !== -1 ||
          msCurrent.some(function (v) {
            return v !== null && v !== undefined && String(v) === String(o.value);
          });
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(o.label));
      });
      cellEl.classList.add('dg-cell-editing');
      flipPanelUp(panel);
      cleanup = function () { cellEl.classList.remove('dg-cell-editing'); };
      var firstCb = panel.querySelector('input');
      (firstCb || panel).focus();
      getValue = function () {
        var out = [];
        panel.querySelectorAll('input').forEach(function (cb) {
          if (cb.checked) out.push(cb.__dgValue);
        });
        return out;
      };
      invalidEl = cellEl;
    } else if (editorType === 'select' && col.editorSearch) {
      /* 검색형 select — 검색 입력 + 옵션 목록 패널에서 단일 선택.
       * editorSearch: true      → 정적 editorOptions를 로컬 필터
       * editorSearch: { fetch } → 질의마다 비동기 로드 (lazy 검색) */
      var ssCfg = col.editorSearch === true ? {} : col.editorSearch;
      var ssFetch = typeof ssCfg.fetch === 'function' ? ssCfg.fetch : null;
      var ssDebounce = ssCfg.debounce !== undefined ? ssCfg.debounce : 250;
      var ssMinLength = ssCfg.minLength || 0;
      var ssPicked = value; /* 옵션을 고르기 전에는 원래 값 유지 → 무변경이면 미커밋 */
      var ssShown = [];
      var ssActive = -1;
      var ssSeq = 0;
      var ssTimer = null;
      var ssPanel = el('div', 'dg-editor-searchselect', cellEl);
      ssPanel.tabIndex = -1;
      var ssInput = document.createElement('input');
      ssInput.type = 'text';
      ssInput.className = 'dg-searchselect-input';
      ssInput.placeholder = ssCfg.placeholder !== undefined ? ssCfg.placeholder : 'Search…';
      ssPanel.appendChild(ssInput);
      var ssList = el('div', 'dg-searchselect-list', ssPanel);
      /* 옵션 mousedown이 검색 입력의 포커스를 빼앗으면 focusout 커밋이
       * 클릭보다 먼저 달린다 — 포커스 이동 자체를 막는다 */
      ssList.addEventListener('mousedown', function (e) { e.preventDefault(); });
      /* lazy로 알게 된 value→label을 컬럼별로 기억 — 짝꿍 렌더러가
       * 정적 editorOptions에 없는 값도 label로 표시할 수 있게 */
      var ssCacheLabel = function (o) {
        if (!ssFetch) return;
        var all = self._searchSelectLabels || (self._searchSelectLabels = {});
        var bucket = all[col.colId] || (all[col.colId] = {});
        bucket[String(o.value)] = o.label;
      };
      var ssSetActive = function (i) {
        if (!ssShown.length) return;
        ssActive = clamp(i, 0, ssShown.length - 1);
        var els = ssList.querySelectorAll('.dg-searchselect-option');
        els.forEach(function (optEl, j) {
          optEl.classList.toggle('dg-active', j === ssActive);
        });
        if (els[ssActive] && els[ssActive].scrollIntoView) {
          els[ssActive].scrollIntoView({ block: 'nearest' });
        }
      };
      var ssRenderMsg = function (text, cls) {
        ssShown = [];
        ssActive = -1;
        ssList.innerHTML = '';
        el('div', 'dg-searchselect-msg' + (cls ? ' ' + cls : ''), ssList).textContent = text;
        flipPanelUp(ssPanel);
      };
      /* autoFirst: 검색 결과면 첫 항목을 활성으로 (빈 질의의 초기 목록은
       * 현재 값 항목만 활성 — Enter가 엉뚱한 첫 옵션을 고르지 않게) */
      var ssRenderList = function (opts, autoFirst) {
        ssShown = opts;
        ssActive = -1;
        ssList.innerHTML = '';
        if (!opts.length) { ssRenderMsg('No results'); return; }
        opts.forEach(function (o, i) {
          var optEl = el('div', 'dg-searchselect-option', ssList);
          optEl.dataset.idx = i;
          optEl.textContent = o.label;
          var isCurrent = o.value === ssPicked ||
            (ssPicked !== null && ssPicked !== undefined && String(o.value) === String(ssPicked));
          if (isCurrent) ssActive = i;
        });
        if (ssActive === -1 && autoFirst) ssActive = 0;
        if (ssActive !== -1) ssSetActive(ssActive);
        flipPanelUp(ssPanel);
      };
      var ssRunQuery = function (q) {
        if (!ssFetch) {
          ssRenderList(filterEditorOptions(col.editorOptions, q), q.trim() !== '');
          return;
        }
        if (q.length < ssMinLength) {
          ssRenderMsg('Type ' + ssMinLength + '+ characters');
          return;
        }
        var seq = ++ssSeq;
        ssRenderMsg('Loading…', 'dg-loading');
        var promised;
        try { promised = ssFetch(q, row, col); }
        catch (e) { promised = Promise.reject(e); }
        Promise.resolve(promised).then(function (opts) {
          if (finished || seq !== ssSeq) return; /* 닫혔거나 더 새 질의가 있음 */
          ssRenderList(normalizeEditorOptions(opts), q.trim() !== '');
        }).catch(function (err) {
          if (finished || seq !== ssSeq) return;
          console.error('[DataGrid] editorSearch.fetch failed for "' + col.field + '":', err);
          ssRenderMsg('Load failed', 'dg-error');
        });
      };
      ssList.addEventListener('click', function (e) {
        /* 커밋으로 에디터가 닫힌 뒤 캔버스로 버블되면 editOnSingleClick이
         * 편집을 재시작한다 (BUG-005 계열) — 여기서 전파를 끊는다 */
        e.stopPropagation();
        var optEl = e.target.closest('.dg-searchselect-option');
        if (!optEl) return;
        var o = ssShown[Number(optEl.dataset.idx)];
        if (!o) return;
        ssPicked = o.value;
        ssCacheLabel(o);
        finish(true);
      });
      ssInput.addEventListener('input', function () {
        clearInvalid();
        var q = ssInput.value;
        if (ssTimer) clearTimeout(ssTimer);
        if (!ssFetch) { ssRunQuery(q); return; }
        ssTimer = setTimeout(function () { ssRunQuery(q); }, ssDebounce);
      });
      ssInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); ssSetActive(ssActive + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); ssSetActive(ssActive - 1); }
        else if (e.key === 'Enter' && ssActive >= 0 && ssShown[ssActive]) {
          /* 선택만 반영 — 커밋은 셀로 버블된 Enter를 공용 핸들러가 처리 */
          ssPicked = ssShown[ssActive].value;
          ssCacheLabel(ssShown[ssActive]);
        }
      });
      cellEl.classList.add('dg-cell-editing');
      ssRunQuery('');
      flipPanelUp(ssPanel);
      cleanup = function () {
        if (ssTimer) clearTimeout(ssTimer);
        cellEl.classList.remove('dg-cell-editing');
      };
      ssInput.focus();
      getValue = function () { return ssPicked; };
      invalidEl = cellEl;
    } else {
      if (editorType === 'select') {
        input = document.createElement('select');
        var selectOptions = normalizeEditorOptions(col.editorOptions);
        selectOptions.forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = String(o.value);
          opt.textContent = o.label;
          input.appendChild(opt);
        });
        input.value = value === null || value === undefined ? '' : String(value);
        /* select.value는 항상 문자열 — 원본 옵션에서 찾아 value의 타입을 보존한다 */
        getValue = function () {
          var picked = input.value;
          for (var i = 0; i < selectOptions.length; i++) {
            if (String(selectOptions[i].value) === picked) return selectOptions[i].value;
          }
          return picked;
        };
      } else {
        input = document.createElement('input');
        input.type = editorType === 'number' ? 'number' : 'text';
        input.value = value === null || value === undefined ? '' : String(value);
        getValue = function () { return input.value; };
      }
      input.className = 'dg-cell-editor';
      cellEl.appendChild(input);
      input.focus();
      if (input.select) input.select();
      invalidEl = input;
    }

    var finished = false;
    var markInvalid = function (message) {
      invalidEl.classList.add('dg-invalid');
      invalidEl.setAttribute('aria-invalid', 'true');
      if (message) invalidEl.title = message;
      if (input) input.focus();
    };
    var clearInvalid = function () {
      invalidEl.classList.remove('dg-invalid');
      invalidEl.removeAttribute('aria-invalid');
      invalidEl.removeAttribute('title');
    };
    /* commit=true 커밋 시도: validator 실패 또는 beforeCellSave 취소면
     * 편집기를 닫지 않고 유지한다. 닫혔으면 true를 반환한다(연속 편집용). */
    var finish = function (commit) {
      if (finished) return true;
      var newValue = getValue();
      var committed = false;
      if (commit) {
        if (editorType === 'number') {
          var n = Number(newValue);
          newValue = newValue === '' || isNaN(n) ? value : n;
        }
        /* 배열 값(multiselect)은 참조가 아니라 내용으로 변경 여부를 판정.
         * 원본이 null/단일 값이어도 배열로 정규화해 비교한다 (열었다 그냥
         * 닫았을 때 null → [] 스퓨리어스 커밋 방지). */
        var changed = editorType === 'multiselect'
          ? !shallowArrayEquals(newValue, normalizeMultiValue(value))
          : newValue !== value;
        if (changed) {
          if (col.validator) {
            var result;
            try { result = col.validator(newValue, row); }
            catch (e) {
              console.error('[DataGrid] validator failed for "' + col.field + '":', e);
              result = true; /* validator 자체 오류는 편집을 막지 않는다 */
            }
            var message = validationMessage(result);
            if (message) { markInvalid(message); return false; }
          }
          var evt = { data: row, colDef: col, oldValue: value, newValue: newValue, cancel: false };
          self._emitter.emit('beforeCellSave', evt);
          if (evt.cancel) { markInvalid(); return false; }
          clearInvalid();
          row[col.field] = evt.newValue;
          self._recordUpdate(row, col.field, value, evt.newValue);
          newValue = evt.newValue;
          committed = true;
        }
      }
      /* 커밋/취소가 확정된 뒤에는 이벤트 발사 전에 에디터를 먼저 완전히 닫는다.
       * 이벤트를 열린 상태에서 발사하면, 핸들러가 refreshRow 등으로 포커스된
       * 에디터를 DOM에서 제거할 때 blur가 동기 발화해 finish가 재진입한다
       * (BUG-007 — 이중 커밋 + 떼어진 행에 replaceChild → NotFoundError). */
      finished = true;
      self._editing = null;
      if (cleanup) cleanup();
      /* re-render the cell in place */
      cellEl.innerHTML = '';
      self._renderCellValue(cellEl, col, row);
      /* 제자리 재렌더링이라 dirty 표시도 여기서 갱신해야 한다 (refresh 없이) */
      if (self._trackChanges && self._originals && col.field !== undefined) {
        var orig = self._originals.get(row);
        var dirtyNow = !!(orig && (col.field in orig));
        cellEl.classList.toggle('dg-cell-dirty', dirtyNow);
        if (dirtyNow) cellEl.title = 'Original: ' + orig[col.field];
        else cellEl.removeAttribute('title');
      }
      if (committed) {
        self._emitter.emit('cellValueChanged', {
          data: row, colDef: col, oldValue: value, newValue: newValue,
        });
        var rowChanges = {};
        rowChanges[col.field] = { oldValue: value, newValue: newValue };
        self._emitter.emit('rowValueChanged', { data: row, changes: rowChanges });
      }
      self._emitter.emit('editingStopped', {
        data: row,
        colDef: col,
        oldValue: value,
        newValue: committed ? newValue : value,
        committed: committed,
      });
      return true;
    };

    /* 연속 편집: 커밋에 성공해 닫힌 경우에만 인접 셀로 이동 */
    var onKeyDown = function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') {
        if (finish(true) && self.options.enterMovesDown) self._editNext(hit.r, hit.c, 1, 0);
      } else if (e.key === 'Tab' && self.options.tabMovesRight) {
        e.preventDefault();
        if (finish(true)) self._editNext(hit.r, hit.c, 0, e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        finish(false);
      }
    };

    if (input) {
      input.addEventListener('input', clearInvalid);
      input.addEventListener('keydown', onKeyDown);
      input.addEventListener('blur', function () { finish(true); });
    } else {
      cellEl.addEventListener('keydown', onKeyDown);
      cellEl.addEventListener('focusout', function (e) {
        if (finished) return;
        if (e.relatedTarget && cellEl.contains(e.relatedTarget)) return;
        finish(true);
      });
    }

    this._editing = { finish: finish, row: row, col: col };
    this._emitter.emit('editingStarted', { data: row, colDef: col, value: value });
  };

  /**
   * (r, c)에서 dr/dc 방향으로 다음 편집 가능 셀을 찾아 편집을 시작한다
   * (연속 편집 — enterMovesDown / tabMovesRight). 가로 이동은 행 끝에서
   * 다음/이전 행으로 감싼다. 그룹 헤더 행은 건너뛴다.
   */
  DataGrid.prototype._editNext = function (r, c, dr, dc) {
    var cols = this._visibleColumns();
    var nr = r;
    var nc = c;
    var guard = this._pageRows.length * cols.length + 2;
    while (guard-- > 0) {
      if (dc !== 0) {
        nc += dc;
        if (nc >= cols.length) { nc = 0; nr++; }
        else if (nc < 0) { nc = cols.length - 1; nr--; }
      } else {
        nr += dr;
      }
      if (nr < 0 || nr >= this._pageRows.length) return false;
      var row = this._pageRows[nr];
      if (!row || row.__group || row.__detail) continue;
      var col = cols[nc];
      if (!col || !col.editable || !this._editable || col.field === undefined) {
        if (dc !== 0) continue;
        continue; /* 세로 이동: 같은 컬럼이 계속 편집 불가면 다음 행에서 재시도 */
      }
      this._scrollRowIntoView(nr);
      this._renderVisibleRows();
      var rowEl = this._renderedRows[nr];
      var cellEl = rowEl && rowEl.querySelector('[data-col-index="' + nc + '"]');
      if (!cellEl) return false;
      this._setFocusedCell(nr, nc);
      this._startEdit({ cellEl: cellEl, r: nr, c: nc, row: row, col: col });
      return true;
    }
    return false;
  };

  DataGrid.prototype._cancelEdit = function () {
    if (this._editing) this._editing.finish(false);
  };

  /* ---- programmatic edit control ---- */

  /** 지정한 행/필드의 편집을 시작한다. 페이지 밖이면 해당 페이지로 이동 후 시작.
   *  편집 불가 컬럼·미표시 행이면 false를 반환한다. */
  DataGrid.prototype.startEdit = function (row, field) {
    var col = this._visibleColumns().find(function (c) { return c.field === field; });
    if (!col || !col.editable || !this._editable || !row) return false;

    var displayIndex = this._displayRows.indexOf(row);
    if (displayIndex === -1) return false;

    if (this._pagination) {
      var page = Math.floor(displayIndex / this._pageSize);
      if (page !== this._currentPage) this.setPage(page);
    }
    var pageIndex = this._pageRows.indexOf(row);
    if (pageIndex === -1) return false;

    this._scrollRowIntoView(pageIndex);
    this._renderVisibleRows();
    var rowEl = this._renderedRows[pageIndex];
    var cellEl = rowEl && rowEl.querySelector('[data-col-id="' + col.colId + '"]');
    if (!cellEl) return false;

    var cIdx = Number(cellEl.dataset.colIndex);
    this._setFocusedCell(pageIndex, cIdx);
    this._startEdit({ cellEl: cellEl, r: pageIndex, c: cIdx, row: row, col: col });
    return true;
  };

  /** 진행 중인 편집을 종료한다. commit=false면 취소(기본 커밋). */
  DataGrid.prototype.stopEdit = function (commit) {
    if (this._editing) this._editing.finish(commit !== false);
  };

  DataGrid.prototype.isEditing = function () { return !!this._editing; };

  /** 그리드 전체 편집 잠금/해제. false면 컬럼 editable 설정을 무시하고 잠근다. */
  DataGrid.prototype.setEditable = function (enabled) {
    this._editable = enabled !== false;
    this.refresh(); /* refresh가 진행 중 편집도 정리한다 */
  };

  DataGrid.prototype.isEditable = function () { return this._editable; };

  /* ---- clipboard (엑셀 호환 TSV) ---- */

  /** 셀 범위 > 선택 행(뷰 순서) > 포커스 셀 순으로 TSV를 만든다. 대상이 없으면 null. */
  DataGrid.prototype._selectionTsv = function () {
    var self = this;

    /* 셀/블록 범위가 있으면 범위를 그대로 복사 (블록 모양 유지를 위해 suppressCopy 무시) */
    var range = this._cellRange ? this.getCellRange() : null;
    if (range && range.rows.length > 0) {
      var rangeCols = range.columns.filter(function (c) { return c.field !== undefined; });
      if (rangeCols.length > 0) return buildTsv(range.rows, rangeCols);
    }

    var cols = this._visibleColumns().filter(function (c) {
      return c.field !== undefined && !c.suppressCopy;
    });
    if (cols.length === 0) return null;

    var rows = this._viewRows.filter(function (r) { return self._selection[self._rowId(r)]; });
    if (rows.length > 0) return buildTsv(rows, cols);

    if (this._focusedCell) {
      var row = this._pageRows[this._focusedCell.r];
      var col = this._visibleColumns()[this._focusedCell.c];
      if (row && !row.__group && col && col.field !== undefined && !col.suppressCopy) {
        return buildTsv([row], [col]);
      }
    }
    return null;
  };

  DataGrid.prototype._writeClipboard = function (text) {
    var fallback = function () {
      var ta = document.createElement('textarea');
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
  };

  /** 선택 행(없으면 포커스 셀)을 TSV로 클립보드에 복사하고 그 문자열을 반환한다. */
  DataGrid.prototype.copy = function () {
    var tsv = this._selectionTsv();
    if (tsv !== null) this._writeClipboard(tsv);
    return tsv;
  };

  /**
   * 포커스 셀을 시작점으로 TSV 텍스트를 붙여넣는다. 편집 가능한 셀에만 쓰며
   * validator·beforeCellSave를 통과한 값만 반영한다. 갱신된 셀 수를 반환.
   */
  DataGrid.prototype.pasteTsv = function (text) {
    if (!text || !this._focusedCell || !this._editable) return 0;
    var self = this;
    var matrix = parseTsv(String(text));
    var cols = this._visibleColumns();
    var startR = this._focusedCell.r;
    var startC = this._focusedCell.c;
    var updated = 0;

    matrix.forEach(function (cells, i) {
      var row = self._pageRows[startR + i];
      if (!row || row.__group || row.__detail) return;
      var rowChanges = null;
      cells.forEach(function (raw, j) {
        var col = cols[startC + j];
        if (!col || !col.editable || col.field === undefined) return;
        var value = raw;
        var editorType = col.editor ||
          (col.dataType === 'number' || col.filter === 'number' ? 'number' : 'text');
        if (editorType === 'number') {
          var n = Number(value);
          if (value === '' || isNaN(n)) return;
          value = n;
        }
        var oldValue = row[col.field];
        if (value === oldValue) return;
        if (col.validator) {
          var result;
          try { result = col.validator(value, row); }
          catch (e) {
            console.error('[DataGrid] validator failed for "' + col.field + '":', e);
            result = true;
          }
          if (validationMessage(result)) return;
        }
        var evt = { data: row, colDef: col, oldValue: oldValue, newValue: value, cancel: false };
        self._emitter.emit('beforeCellSave', evt);
        if (evt.cancel) return;
        row[col.field] = evt.newValue;
        self._recordUpdate(row, col.field, oldValue, evt.newValue);
        updated++;
        self._emitter.emit('cellValueChanged', {
          data: row, colDef: col, oldValue: oldValue, newValue: evt.newValue,
        });
        if (!rowChanges) rowChanges = {};
        rowChanges[col.field] = { oldValue: oldValue, newValue: evt.newValue };
      });
      if (rowChanges) self._emitter.emit('rowValueChanged', { data: row, changes: rowChanges });
    });

    if (updated > 0) this.refresh();
    return updated;
  };

  /* ---- column resize ---- */

  DataGrid.prototype._bindResizer = function (resizer, col) {
    var self = this;
    resizer.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      resizer.classList.add('dg-resizing');
      var startX = e.clientX;
      var startW = self._computedWidths[col.colId] || col.width;
      var onMove = function (me) {
        var w = Math.max(col.minWidth, startW + (me.clientX - startX));
        if (typeof col.maxWidth === 'number') w = Math.min(col.maxWidth, w);
        self._colWidths[col.colId] = w;
        self._layoutColumns();
      };
      var onUp = function () {
        resizer.classList.remove('dg-resizing');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        self._emitter.emit('columnResized', { colId: col.colId, width: self._colWidths[col.colId] });
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    resizer.addEventListener('dblclick', function (e) {
      e.stopPropagation();
      self.autoSizeColumn(col.colId);
    });
  };

  DataGrid.prototype.autoSizeColumn = function (colId) {
    var col = this._columns.find(function (c) { return c.colId === colId; });
    if (!col || !col.field) return;
    var canvas = this._measureCanvas || (this._measureCanvas = document.createElement('canvas'));
    var ctx = canvas.getContext('2d');
    var style = getComputedStyle(this._rootEl);
    ctx.font = '600 ' + style.fontSize + ' ' + style.fontFamily;
    var max = ctx.measureText(col.headerName).width + 60;
    ctx.font = style.fontSize + ' ' + style.fontFamily;
    var sample = this._viewRows.slice(0, 200);
    for (var i = 0; i < sample.length; i++) {
      var v = sample[i][col.field];
      if (col.valueFormatter) v = col.valueFormatter(v, sample[i]);
      if (v === null || v === undefined) continue;
      max = Math.max(max, ctx.measureText(String(v)).width + 34);
    }
    var w = Math.ceil(Math.max(col.minWidth, Math.min(max, 500)));
    if (typeof col.maxWidth === 'number') w = Math.min(col.maxWidth, w);
    this._colWidths[colId] = w;
    this._layoutColumns();
  };

  /* ---- column reorder (drag header) ---- */

  DataGrid.prototype._bindReorder = function (cell, col) {
    var self = this;
    cell.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn') || e.target.closest('.dg-checkbox')) return;

      var startX = e.clientX;
      var dragging = false;
      var indicator = null;
      var targetIndex = -1;

      var headerCells = function () {
        return Array.prototype.slice
          .call(self._headerRowEl.children)
          .filter(function (c) { return !c.classList.contains('dg-pinned-left') && !c.classList.contains('dg-pinned-right'); });
      };

      var onMove = function (me) {
        if (!dragging) {
          if (Math.abs(me.clientX - startX) < 6) return;
          dragging = true;
          cell.classList.add('dg-dragging');
          indicator = el('div', 'dg-drop-indicator', self._rootEl);
        }
        var cells = headerCells();
        targetIndex = -1;
        var rootRect = self._rootEl.getBoundingClientRect();
        for (var i = 0; i < cells.length; i++) {
          var r = cells[i].getBoundingClientRect();
          if (me.clientX < r.left + r.width / 2) {
            targetIndex = i;
            indicator.style.left = r.left - rootRect.left + 'px';
            break;
          }
        }
        if (targetIndex === -1) {
          targetIndex = cells.length;
          var lastR = cells[cells.length - 1].getBoundingClientRect();
          indicator.style.left = lastR.right - rootRect.left - 2 + 'px';
        }
      };

      var onUp = function () {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!dragging) return;
        cell.classList.remove('dg-dragging');
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);

        var unpinned = self._columns.filter(function (c) { return !c.hide && c.pinned !== 'left' && c.pinned !== 'right'; });
        var fromIdx = unpinned.indexOf(col);
        if (fromIdx === -1 || targetIndex === -1) return;
        var toIdx = targetIndex > fromIdx ? targetIndex - 1 : targetIndex;
        if (toIdx === fromIdx) return;

        /* reorder within the master column list */
        var master = self._columns;
        master.splice(master.indexOf(col), 1);
        var anchor = unpinned.filter(function (c) { return c !== col; })[toIdx];
        if (anchor) master.splice(master.indexOf(anchor), 0, col);
        else master.push(col);
        self.refresh();
        self._emitter.emit('columnMoved', { colId: col.colId, toIndex: toIdx });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  };

  /* ---- pagination ---- */

  DataGrid.prototype._renderPaging = function () {
    if (!this._pagingEl) return;
    var self = this;
    var info = this._pageInfo;
    this._pagingEl.innerHTML = '';

    var sizeWrap = el('div', 'dg-paging-page-size', this._pagingEl);
    var sizeLabel = el('span', null, sizeWrap);
    sizeLabel.textContent = 'Page size:';
    var sizeSel = el('select', null, sizeWrap);
    this._pageSizeOptions.forEach(function (s) {
      var opt = el('option', null, sizeSel);
      opt.value = s;
      opt.textContent = s;
    });
    sizeSel.value = this._pageSize;
    sizeSel.addEventListener('change', function () { self.setPageSize(Number(sizeSel.value)); });

    var summary = el('span', 'dg-paging-row-summary', this._pagingEl);
    summary.innerHTML =
      '<strong>' + info.firstRow.toLocaleString() + '</strong> to <strong>' +
      info.lastRow.toLocaleString() + '</strong> of <strong>' + info.total.toLocaleString() + '</strong>';

    var btns = el('div', 'dg-paging-buttons', this._pagingEl);
    var mkBtn = function (label, page, disabled, current, aria) {
      var b = el('button', 'dg-paging-btn' + (current ? ' dg-paging-current' : ''), btns);
      b.type = 'button';
      b.textContent = label;
      b.disabled = !!disabled;
      if (aria) b.setAttribute('aria-label', aria);
      if (!disabled && page !== null) b.addEventListener('click', function () { self.setPage(page); });
      return b;
    };

    mkBtn('«', 0, info.page === 0, false, 'First page');
    mkBtn('‹', info.page - 1, info.page === 0, false, 'Previous page');
    pageButtonModel(info.pageCount, info.page).forEach(function (p) {
      if (p === '…') mkBtn('…', null, true);
      else mkBtn(String(p + 1), p, false, p === info.page);
    });
    mkBtn('›', info.page + 1, info.page >= info.pageCount - 1, false, 'Next page');
    mkBtn('»', info.pageCount - 1, info.page >= info.pageCount - 1, false, 'Last page');
  };

  DataGrid.prototype.setPage = function (page) {
    if (!this._pagination) return;
    this._currentPage = page;
    this._focusedCell = null;
    this.refresh();
    this._bodyEl.scrollTop = 0;
    this._emitter.emit('paginationChanged', { page: this._currentPage, pageSize: this._pageSize });
    if (this._pageMode === 'server') this.reloadData();
  };

  DataGrid.prototype.setPageSize = function (size) {
    if (!this._pagination) return;
    var firstVisible = this._pageInfo ? this._pageInfo.start : 0;
    this._pageSize = size;
    this._currentPage = Math.floor(firstVisible / size);
    this.refresh();
    this._emitter.emit('paginationChanged', { page: this._currentPage, pageSize: this._pageSize });
    if (this._pageMode === 'server') this.reloadData();
  };

  /* ---- overlays ---- */

  DataGrid.prototype._updateOverlay = function () {
    if (this._loading) return; /* keep loading overlay */
    if (this._viewRows.length === 0) {
      this._overlayEl.innerHTML = '<div class="dg-overlay-panel">No rows to show</div>';
      this._overlayEl.hidden = false;
    } else {
      this._overlayEl.hidden = true;
    }
  };

  DataGrid.prototype.showLoadingOverlay = function () {
    this._loading = true;
    this._overlayEl.innerHTML = '<div class="dg-overlay-panel"><span class="dg-spinner"></span>Loading…</div>';
    this._overlayEl.hidden = false;
  };

  DataGrid.prototype.hideLoadingOverlay = function () {
    this._loading = false;
    this._updateOverlay();
  };

  /* ---- remote data source ---- */

  /**
   * dataSource에서 데이터를 (다시) 불러온다. server 모드인 축의 현재 상태
   * (페이지·정렬·필터)가 요청 파라미터로 전달되고, 응답이 도착하면
   * 행을 교체하고 refresh한다. 경합은 마지막 요청만 반영한다.
   */
  DataGrid.prototype.reloadData = function () {
    var ds = this.options.dataSource;
    if (!ds || !ds.url || typeof fetch === 'undefined') return;
    var self = this;
    var req = buildDataSourceRequest(ds, {
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
    var opts = { method: req.method };
    if (req.body !== null) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = req.body;
    }
    this.showLoadingOverlay();
    var seq = ++this._loadSeq;
    fetch(req.url, opts)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.statusText);
        return r.json();
      })
      .then(function (json) {
        if (self._destroyed || seq !== self._loadSeq) return;
        var parsed;
        if (ds.parse) {
          try { parsed = ds.parse(json); }
          catch (e) {
            console.error('[DataGrid] dataSource.parse failed:', e);
            parsed = parseDataSourceResponse(json);
          }
        } else {
          parsed = parseDataSourceResponse(json);
        }
        self._serverTotal = parsed.total;
        self._rows = (parsed.rows || []).slice();
        self._selection = {};
        self._focusedCell = null;
        self._lastClickedViewIndex = -1;
        self._resetTracking();
        self._undoStack = [];
        self._redoStack = [];
        self.hideLoadingOverlay();
        self.refresh(); /* 페이지는 유지 — 서버 페이징 이동 후 리셋되면 안 된다 */
        self._emitDataChanged();
      })
      .catch(function (err) {
        if (self._destroyed || seq !== self._loadSeq) return;
        console.error('[DataGrid] dataSource load failed:', err);
        self.hideLoadingOverlay();
        self._emitter.emit('dataLoadError', { error: err });
      });
  };

  /* ---- data API ---- */

  DataGrid.prototype.setRowData = function (rows) {
    this._rows = (rows || []).slice();
    this._selection = {};
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
  };

  DataGrid.prototype.getRowData = function () { return this._rows.slice(); };
  DataGrid.prototype.getDisplayedRows = function () { return this._viewRows.slice(); };
  DataGrid.prototype.getDisplayedRowCount = function () { return this._viewRows.length; };

  DataGrid.prototype.addRows = function (rows) {
    this._rows = this._rows.concat(rows);
    this._recordAdd(rows);
    this.refresh();
    this._emitDataChanged();
  };
  DataGrid.prototype.addRow = function (row) { this.addRows([row]); };

  DataGrid.prototype.removeRows = function (rows) {
    var ids = {};
    var self = this;
    var entries = [];
    rows.forEach(function (r) {
      var idx = self._rows.indexOf(r);
      if (idx !== -1) {
        entries.push({ row: r, index: idx, wasAdded: self._addedRows.indexOf(r) !== -1 });
      }
      ids[self._rowId(r)] = true;
    });
    this._rows = this._rows.filter(function (r) { return !ids[self._rowId(r)]; });
    rows.forEach(function (r) { delete self._selection[self._rowId(r)]; });
    if (entries.length > 0) this._recordRemove(entries);
    this.refresh();
    this._emitDataChanged();
  };

  DataGrid.prototype.removeSelectedRows = function () {
    this.removeRows(this.getSelectedRows());
    this._emitSelection();
  };

  DataGrid.prototype.updateRow = function (row, changes) {
    for (var k in changes) {
      if (row[k] !== changes[k]) this._recordUpdate(row, k, row[k], changes[k]);
      row[k] = changes[k];
    }
    this.refresh();
    this._emitDataChanged();
  };

  DataGrid.prototype.setColumnVisible = function (colId, visible) {
    var col = this._columns.find(function (c) { return c.colId === colId || c.field === colId; });
    if (col) {
      col.hide = !visible;
      this.refresh();
    }
  };

  DataGrid.prototype.getColumns = function () { return this._columns.slice(); };

  DataGrid.prototype.setTheme = function (theme) {
    this._rootEl.classList.toggle('dg-theme-dark', theme === 'dark');
  };

  /**
   * 그리드 전체 인터랙션을 잠근다/푼다. 잠그면 반투명 오버레이가 마우스를
   * 가로막고 키보드 입력도 무시된다 (저장 중 등 일시적 비활성용).
   */
  DataGrid.prototype.setEnabled = function (enabled) {
    this._enabled = enabled !== false;
    if (!this._enabled) this._cancelEdit();
    this._rootEl.classList.toggle('dg-disabled', !this._enabled);
  };

  DataGrid.prototype.isEnabled = function () { return this._enabled !== false; };

  /* ---- change tracking (trackChanges) + undo/redo ---- */

  DataGrid.prototype._resetTracking = function () {
    this._originals = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    this._updatedRows = [];
    this._addedRows = [];
    this._deletedRows = []; /* { row, index, wasAdded } */
  };

  /* -- 추적 상태만 갱신 (히스토리와 분리 — undo/redo도 재사용) -- */

  DataGrid.prototype._trackUpdate = function (row, field, oldValue, newValue) {
    if (!this._trackChanges || !this._originals) return;
    if (this._addedRows.indexOf(row) !== -1) return; /* 새 행의 수정은 added로 충분 */
    var orig = this._originals.get(row);
    if (!orig) { orig = {}; this._originals.set(row, orig); }
    if (!(field in orig)) orig[field] = oldValue;
    else if (orig[field] === newValue) delete orig[field]; /* 원래 값 복귀 → dirty 해제 */
    var hasDirty = false;
    for (var k in orig) { hasDirty = true; break; }
    var idx = this._updatedRows.indexOf(row);
    if (hasDirty && idx === -1) this._updatedRows.push(row);
    else if (!hasDirty && idx !== -1) this._updatedRows.splice(idx, 1);
  };

  DataGrid.prototype._trackAdd = function (rows) {
    if (!this._trackChanges) return;
    var self = this;
    rows.forEach(function (r) {
      if (self._addedRows.indexOf(r) === -1) self._addedRows.push(r);
    });
  };

  DataGrid.prototype._trackRemove = function (entries) {
    if (!this._trackChanges) return;
    var self = this;
    entries.forEach(function (en) {
      var ai = self._addedRows.indexOf(en.row);
      if (ai !== -1) self._addedRows.splice(ai, 1); /* 추가 후 삭제 = 흔적 없음 */
      else self._deletedRows.push(en);
      var ui = self._updatedRows.indexOf(en.row);
      if (ui !== -1) self._updatedRows.splice(ui, 1); /* 수정 이력은 삭제에 흡수 */
    });
  };

  DataGrid.prototype._untrackAdd = function (rows) {
    if (!this._trackChanges) return;
    var self = this;
    rows.forEach(function (r) {
      var i = self._addedRows.indexOf(r);
      if (i !== -1) self._addedRows.splice(i, 1);
    });
  };

  DataGrid.prototype._untrackRemove = function (entries) {
    if (!this._trackChanges) return;
    var self = this;
    entries.forEach(function (en) {
      if (en.wasAdded) {
        if (self._addedRows.indexOf(en.row) === -1) self._addedRows.push(en.row);
        return;
      }
      for (var i = 0; i < self._deletedRows.length; i++) {
        if (self._deletedRows[i].row === en.row) { self._deletedRows.splice(i, 1); return; }
      }
    });
  };

  /* -- 기록 = 추적 + 히스토리 푸시 -- */

  DataGrid.prototype._pushHistory = function (action) {
    if (!this._undoRedo || this._historyMuted) return;
    this._undoStack.push(action);
    this._redoStack = [];
  };

  DataGrid.prototype._recordUpdate = function (row, field, oldValue, newValue) {
    this._trackUpdate(row, field, oldValue, newValue);
    this._pushHistory({ type: 'update', row: row, field: field, oldValue: oldValue, newValue: newValue });
  };

  DataGrid.prototype._recordAdd = function (rows) {
    this._trackAdd(rows);
    this._pushHistory({ type: 'add', rows: rows.slice() });
  };

  DataGrid.prototype._recordRemove = function (entries) {
    this._pushHistory({ type: 'remove', entries: entries.slice() }); /* wasAdded는 추적 갱신 전에 캡처됨 */
    this._trackRemove(entries);
  };

  /* -- 공개 API -- */

  /** 마지막 commit/setRowData 이후의 변경 묶음. */
  DataGrid.prototype.getChanges = function () {
    return {
      added: this._addedRows.slice(),
      updated: this._updatedRows.slice(),
      deleted: this._deletedRows.map(function (d) { return d.row; }),
    };
  };

  DataGrid.prototype.isDirty = function () {
    return this._addedRows.length > 0 || this._updatedRows.length > 0 || this._deletedRows.length > 0;
  };

  /** 현재 상태를 새 기준선으로 확정한다 (dirty 표시·변경 목록 초기화). */
  DataGrid.prototype.commitChanges = function () {
    this._resetTracking();
    this.refresh();
  };

  /** 모든 변경을 기준선으로 되돌린다: 수정 값 원복, 추가 행 제거, 삭제 행 복원. */
  DataGrid.prototype.rollbackChanges = function () {
    var self = this;
    if (this._originals) {
      this._updatedRows.forEach(function (row) {
        var orig = self._originals.get(row);
        for (var f in orig) row[f] = orig[f];
      });
    }
    this._addedRows.forEach(function (r) { delete self._selection[self._rowId(r)]; });
    this._rows = rollbackRows(this._rows, this._addedRows, this._deletedRows);
    this._resetTracking();
    this._undoStack = []; /* 롤백을 가로지르는 undo는 지원하지 않는다 */
    this._redoStack = [];
    this.refresh();
    this._emitDataChanged();
  };

  DataGrid.prototype.canUndo = function () { return this._undoStack.length > 0; };
  DataGrid.prototype.canRedo = function () { return this._redoStack.length > 0; };

  /** 마지막 변경(셀 수정·행 추가·행 삭제)을 되돌린다. 되돌렸으면 true. */
  DataGrid.prototype.undo = function () {
    if (!this._undoRedo || this._undoStack.length === 0) return false;
    var a = this._undoStack.pop();
    var self = this;
    if (a.type === 'update') {
      a.row[a.field] = a.oldValue;
      this._trackUpdate(a.row, a.field, a.newValue, a.oldValue);
    } else if (a.type === 'add') {
      this._rows = this._rows.filter(function (r) { return a.rows.indexOf(r) === -1; });
      a.rows.forEach(function (r) { delete self._selection[self._rowId(r)]; });
      this._untrackAdd(a.rows);
    } else if (a.type === 'remove') {
      this._rows = rollbackRows(this._rows, [], a.entries);
      this._untrackRemove(a.entries);
    }
    this._redoStack.push(a);
    this.refresh();
    this._emitDataChanged();
    return true;
  };

  /** undo로 되돌린 변경을 다시 적용한다. 적용했으면 true. */
  DataGrid.prototype.redo = function () {
    if (!this._undoRedo || this._redoStack.length === 0) return false;
    var a = this._redoStack.pop();
    var self = this;
    if (a.type === 'update') {
      a.row[a.field] = a.newValue;
      this._trackUpdate(a.row, a.field, a.oldValue, a.newValue);
    } else if (a.type === 'add') {
      this._rows = this._rows.concat(a.rows);
      this._trackAdd(a.rows);
    } else if (a.type === 'remove') {
      var ids = {};
      a.entries.forEach(function (en) { ids[self._rowId(en.row)] = true; });
      this._rows = this._rows.filter(function (r) { return !ids[self._rowId(r)]; });
      a.entries.forEach(function (en) { delete self._selection[self._rowId(en.row)]; });
      this._trackRemove(a.entries);
    }
    this._undoStack.push(a);
    this.refresh();
    this._emitDataChanged();
    return true;
  };

  /* ---- grid state save / restore ---- */

  /**
   * 현재 그리드 상태(컬럼 순서·숨김·사용자 지정 폭, 정렬, 필터, 퀵 필터,
   * 그룹핑, 페이지)를 JSON 직렬화 가능한 객체로 반환한다.
   * localStorage 등에 저장했다가 setState()로 복원한다.
   */
  DataGrid.prototype.getState = function () {
    var self = this;
    var state = {
      columns: this._columns.map(function (c) {
        var entry = { colId: c.colId, hide: !!c.hide };
        if (self._colWidths[c.colId] !== undefined) entry.width = self._colWidths[c.colId];
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
  };

  /**
   * getState()가 반환한 상태를 복원한다. 상태에 포함된 부분만 적용하며
   * (부분 상태 허용), 알 수 없는 colId는 무시한다. 마지막에 refresh() 1회.
   */
  DataGrid.prototype.setState = function (state) {
    if (!state) return;
    var self = this;
    if (state.columns) {
      var applied = applyColumnState(this._columns, state.columns);
      this._columns = applied.columns;
      this._columns.forEach(function (c) {
        if (applied.hidden[c.colId] !== undefined) c.hide = applied.hidden[c.colId];
      });
      for (var colId in applied.widths) this._colWidths[colId] = applied.widths[colId];
    }
    if (state.sortModel) this._sortModel = state.sortModel.slice();
    if (state.filterModel) {
      this._filterModel = {};
      for (var f in state.filterModel) this._filterModel[f] = state.filterModel[f];
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
  };

  /**
   * 상태를 생성 시점 옵션 기준으로 되돌린다. 인자가 없으면 전체 리셋,
   * { filter, sort, group, columns, page } 중 true인 부분만 선택 리셋.
   */
  DataGrid.prototype.resetState = function (parts) {
    var all = !parts;
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
  };

  /* ---- CSV / Excel export ---- */

  /** 내보내기 대상 컬럼: exportFormatter가 있으면 valueFormatter를 대체한 사본. */
  DataGrid.prototype._exportColumns = function () {
    return this._visibleColumns()
      .filter(function (c) { return c.field !== undefined; })
      .map(function (c) {
        if (!c.exportFormatter) return c;
        var copy = {};
        for (var k in c) copy[k] = c[k];
        copy.valueFormatter = c.exportFormatter;
        return copy;
      });
  };

  /** beforeExport(취소 가능·rows/columns/filename 가공 가능)를 거친 내보내기 준비. */
  DataGrid.prototype._prepareExport = function (format, filename) {
    var evt = {
      format: format,
      filename: filename,
      rows: this._viewRows.slice(),
      columns: this._exportColumns(),
      cancel: false,
    };
    this._emitter.emit('beforeExport', evt);
    return evt.cancel ? null : evt;
  };

  DataGrid.prototype._downloadBlob = function (blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  DataGrid.prototype.getCsv = function () {
    return buildCsv(this._viewRows, this._exportColumns());
  };

  /**
   * 필터·정렬이 적용된 현재 뷰를 JSON 문자열로 반환한다.
   * 표시 중인 컬럼의 field만 포함하며 값은 원시 데이터(포매터 미적용).
   */
  DataGrid.prototype.getJson = function () {
    var cols = this._visibleColumns().filter(function (c) { return c.field !== undefined; });
    return JSON.stringify(buildJsonRows(this._viewRows, cols));
  };

  DataGrid.prototype.exportCsv = function (filename) {
    var prep = this._prepareExport('csv', filename || 'export.csv');
    if (!prep) return;
    var csv = buildCsv(prep.rows, prep.columns);
    this._downloadBlob(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
      prep.filename
    );
  };

  /**
   * 현재 뷰를 .xlsx 파일로 다운로드한다 (의존성 없는 무압축 ZIP +
   * SpreadsheetML — 포매터가 없는 숫자는 숫자 셀로 나가 엑셀에서 바로 계산 가능).
   */
  DataGrid.prototype.exportExcel = function (filename, sheetName) {
    var prep = this._prepareExport('xlsx', filename || 'export.xlsx');
    if (!prep) return;
    var zip = makeZip(buildXlsxParts(prep.rows, prep.columns, sheetName));
    this._downloadBlob(
      new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      prep.filename
    );
  };

  /* ---- teardown ---- */

  DataGrid.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;
    this._closeMenu();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._docListeners.forEach(function (l) { document.removeEventListener(l[0], l[1]); });
    if (this._rootEl.parentNode) this._rootEl.parentNode.removeChild(this._rootEl);
  };

  /* ---------------------------------------------------------------------------
   * Built-in cell renderers
   * ------------------------------------------------------------------------- */

  /* select/radio/searchselect 렌더러 공용 팩토리 — 저장된 value를 editorOptions의
   * label로. 정적 목록에 없으면 lazy 검색(editorSearch.fetch)에서 골랐던 label
   * 캐시(params.optionLabels)를 본다. */
  function optionLabelRenderer(options) {
    return function (params) {
      var label = lookupOptionLabel(
        options || (params.colDef && params.colDef.editorOptions), params.value);
      if (label === null && params.optionLabels &&
          params.value !== null && params.value !== undefined &&
          String(params.value) in params.optionLabels) {
        label = params.optionLabels[String(params.value)];
      }
      if (label !== null) return escapeHtml(label);
      var v = params.formatted;
      return v === null || v === undefined ? '' : escapeHtml(String(v));
    };
  }

  DataGrid.renderers = {
    /**
     * Colored status tag/badge. colorMap: { 'Paid': 'green', 'Overdue': 'red' }
     * Usage: cellRenderer: DataGrid.renderers.tag({ Paid: 'green' })
     */
    tag: function (colorMap) {
      return function (params) {
        var v = params.formatted === null || params.formatted === undefined ? '' : String(params.formatted);
        if (v === '') return '';
        var color = (colorMap && colorMap[String(params.value)]) || 'gray';
        return '<span class="dg-tag dg-tag-' + escapeHtml(color) + '">' + escapeHtml(v) + '</span>';
      };
    },
    /** ✓ / – for booleans */
    check: function () {
      return function (params) {
        return params.value
          ? '<span style="color:#0d8a44;font-weight:700">✓</span>'
          : '<span style="opacity:.35">–</span>';
      };
    },
    /** Simple progress bar for 0–100 values */
    progress: function () {
      return function (params) {
        var v = clamp(Number(params.value) || 0, 0, 100);
        return (
          '<div style="display:flex;align-items:center;gap:8px;width:100%">' +
          '<div style="flex:1;height:6px;border-radius:3px;background:var(--dg-chip-background-color);overflow:hidden">' +
          '<div style="width:' + v + '%;height:100%;border-radius:3px;background:var(--dg-accent-color)"></div></div>' +
          '<span style="font-size:12px;color:var(--dg-secondary-foreground-color)">' + v + '%</span></div>'
        );
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
     * 목록에 없는 값은 문자열 그대로 칩이 되고, 빈 배열/null은 빈 셀.
     */
    multiselect: function (options) {
      return function (params) {
        var labels = lookupOptionLabels(
          options || (params.colDef && params.colDef.editorOptions), params.value);
        return labels.map(function (l) {
          return '<span class="dg-tag dg-tag-plain">' + escapeHtml(l) + '</span>';
        }).join(' ');
      };
    },
    /**
     * checkbox 에디터 짝꿍 — 값을 실제 체크박스 모양으로 표시 (표시 전용).
     * options = { checked, unchecked } 매핑 (생략 시 컬럼 editorOptions →
     * 그것도 없으면 불리언/Y·N/0·1 관용 판정).
     * disabled가 아니라 pointer-events: none — disabled 폼 요소는 마우스
     * 이벤트를 삼켜서 셀 더블클릭 편집이 막힌다 (BUG-006).
     */
    checkbox: function (options) {
      return function (params) {
        var opts = options ||
          (params.colDef && params.colDef.editorOptions &&
            typeof params.colDef.editorOptions === 'object' &&
            !Array.isArray(params.colDef.editorOptions)
            ? params.colDef.editorOptions : null);
        return '<input type="checkbox" class="dg-checkbox dg-checkbox-display" tabindex="-1"' +
          (isCheckedValue(params.value, opts) ? ' checked' : '') + '>';
      };
    },
  };

  /** 선언적 포맷 유틸 — column.format과 같은 패턴을 어디서나 사용. */
  DataGrid.format = formatValue;

  DataGrid.version = '2.3.0';

  /* Internals exposed for headless unit tests (not part of the public API). */
  DataGrid._test = {
    defaultComparator: defaultComparator,
    typeComparator: typeComparator,
    formatNumber: formatNumber,
    formatDate: formatDate,
    formatValue: formatValue,
    sortRows: sortRows,
    buildFilterPredicate: buildFilterPredicate,
    filterRows: filterRows,
    quickFilterRows: quickFilterRows,
    buildFloatingFilterModel: buildFloatingFilterModel,
    validationMessage: validationMessage,
    normalizeEditorOptions: normalizeEditorOptions,
    filterEditorOptions: filterEditorOptions,
    lookupOptionLabel: lookupOptionLabel,
    lookupOptionLabels: lookupOptionLabels,
    isCheckedValue: isCheckedValue,
    normalizeMultiValue: normalizeMultiValue,
    shallowArrayEquals: shallowArrayEquals,
    buildTsv: buildTsv,
    parseTsv: parseTsv,
    aggregateValues: aggregateValues,
    buildGroupView: buildGroupView,
    paginate: paginate,
    pageButtonModel: pageButtonModel,
    csvEscape: csvEscape,
    buildCsv: buildCsv,
    buildJsonRows: buildJsonRows,
    applyValueGetters: applyValueGetters,
    rollbackRows: rollbackRows,
    findNextMatch: findNextMatch,
    fillSeries: fillSeries,
    computeMergeContinuation: computeMergeContinuation,
    computeMergeSpans: computeMergeSpans,
    buildTreeNodes: buildTreeNodes,
    collectTreeNodes: collectTreeNodes,
    filterTreeNodes: filterTreeNodes,
    sortTreeNodes: sortTreeNodes,
    flattenTreeNodes: flattenTreeNodes,
    applyTreeCheck: applyTreeCheck,
    deriveTreeCheckStates: deriveTreeCheckStates,
    subtreeFullyChecked: subtreeFullyChecked,
    computeTreeSummary: computeTreeSummary,
    buildGroupHeaderRuns: buildGroupHeaderRuns,
    buildDataSourceRequest: buildDataSourceRequest,
    parseDataSourceResponse: parseDataSourceResponse,
    computeRowTops: computeRowTops,
    computeAutoHeights: computeAutoHeights,
    computeTopsFromHeights: computeTopsFromHeights,
    findRowAtOffset: findRowAtOffset,
    crc32: crc32,
    makeZip: makeZip,
    buildWorksheetXml: buildWorksheetXml,
    buildXlsxParts: buildXlsxParts,
    normalizeColumns: normalizeColumns,
    applyColumnState: applyColumnState,
    computeColumnWidths: computeColumnWidths,
    computeColumnWindow: computeColumnWindow,
    escapeHtml: escapeHtml,
  };

  global.DataGrid = DataGrid;
})(typeof window !== 'undefined' ? window : globalThis);
