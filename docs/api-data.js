/* =============================================================================
 * DataGrid API 문서 데이터
 *
 * docs/api.html이 이 파일을 읽어 문서를 렌더링합니다.
 * 새 API를 추가할 때는 해당 섹션의 entries 배열에 항목을 추가하면 됩니다.
 *
 * 섹션 구조:
 *   { id, title, kind, intro, entries: [...] }
 *   kind: 'guide'   → intro(HTML)만 표시
 *         'options' → name / type / default / description / example
 *         'methods' → name / signature / params / returns / description / example
 *         'events'  → name / payload / description / example
 *         'tokens'  → name / default / description
 *
 * 엔트리 공통 필드:
 *   name        : API 이름 (앵커 id로도 사용됨)
 *   description : 설명 (HTML 허용 — <code>, <a href="#..."> 등)
 *   example     : 코드 예제 (문자열, JS로 하이라이팅)
 *   since       : 도입 버전 (생략 시 1.0.0)
 * ============================================================================= */
window.ApiDocs = {
  library: 'DataGrid',
  version: '1.2.0',
  updated: '2026-07-31',

  sections: [

    /* =========================================================================
     * Getting Started
     * ======================================================================= */
    {
      id: 'getting-started',
      title: 'Getting Started',
      kind: 'guide',
      intro:
        '<p>DataGrid는 의존성 없는 순수 JavaScript / CSS 데이터그리드입니다. ' +
        '모듈 시스템을 사용하지 않으므로 <code>&lt;script&gt;</code> 태그로 로드하면 ' +
        '전역 <code>DataGrid</code> 생성자 하나가 노출됩니다. 빌드 도구가 필요 없습니다.</p>',
      entries: [
        {
          name: 'new DataGrid(container, options)',
          kind: 'constructor',
          description:
            '그리드를 생성해 <code>container</code> 안에 렌더링합니다. ' +
            '<code>container</code>는 DOM 요소 또는 CSS 선택자 문자열이며, ' +
            '그리드는 컨테이너의 높이를 채우므로 <strong>컨테이너에 높이가 지정되어 있어야 합니다</strong>. ' +
            '유효하지 않은 컨테이너를 넘기면 <code>Error</code>를 던집니다.',
          example:
            '<link rel="stylesheet" href="dist/datagrid.css">\n' +
            '<script src="dist/datagrid.js"><\/script>\n' +
            '\n' +
            '<div id="myGrid" style="height: 400px"></div>\n' +
            '<script>\n' +
            "  var grid = new DataGrid(document.getElementById('myGrid'), {\n" +
            '    columnDefs: [\n' +
            "      { field: 'name',   headerName: 'Name',   filter: 'text', editable: true },\n" +
            "      { field: 'salary', headerName: 'Salary', align: 'right', filter: 'number',\n" +
            "        valueFormatter: function (v) { return '$' + v.toLocaleString(); } },\n" +
            '    ],\n' +
            "    rowData: [{ name: 'Alice', salary: 52000 }],\n" +
            "    rowSelection: 'multiple',\n" +
            '    pagination: true,\n' +
            '  });\n' +
            '<\/script>',
        },
      ],
    },

    /* =========================================================================
     * Grid Options
     * ======================================================================= */
    {
      id: 'grid-options',
      title: 'Grid Options',
      kind: 'options',
      intro:
        '<p><code>new DataGrid(container, options)</code>의 두 번째 인자로 전달하는 설정 객체입니다.</p>',
      entries: [
        {
          name: 'columnDefs',
          type: 'ColumnDef[]',
          required: true,
          description:
            '컬럼 정의 배열. 각 항목의 속성은 <a href="#column-defs">Column Definitions</a> 섹션을 참고하세요.',
        },
        {
          name: 'rowData',
          type: 'object[]',
          default: '[]',
          description:
            '행 데이터 배열. 각 행은 평범한 객체이며 컬럼의 <code>field</code> 키로 값을 읽습니다. ' +
            '생성 후에는 <a href="#api-methods-setRowData"><code>setRowData()</code></a>로 교체합니다.',
        },
        {
          name: 'defaultColDef',
          type: 'Partial<ColumnDef>',
          description:
            '모든 컬럼에 적용할 기본값. 개별 <code>columnDefs</code> 항목이 이를 덮어씁니다.',
          example:
            'defaultColDef: { sortable: true, resizable: true, minWidth: 80 }',
        },
        {
          name: 'rowSelection',
          type: "'single' | 'multiple'",
          default: 'undefined (선택 비활성)',
          description:
            '행 선택 모드. <code>\'multiple\'</code>이면 Ctrl/⌘+클릭 토글, Shift+클릭 범위 선택, ' +
            '체크박스 컬럼(<code>checkboxSelection</code>)과 헤더 전체 선택을 사용할 수 있습니다.',
        },
        {
          name: 'pagination',
          type: 'boolean',
          default: 'false',
          description:
            '페이지네이션 패널을 표시합니다. 끄면 전체 데이터가 가상 스크롤로 렌더링됩니다.',
        },
        {
          name: 'paginationPageSize',
          type: 'number',
          default: '20',
          description: '페이지당 행 수.',
        },
        {
          name: 'paginationPageSizeOptions',
          type: 'number[]',
          default: '[10, 20, 50, 100]',
          description: '페이지 크기 셀렉트 박스에 표시할 선택지.',
        },
        {
          name: 'zebra',
          type: 'boolean',
          default: 'false',
          description:
            '홀수 행에 배경색(<code>--dg-odd-row-background-color</code>)을 적용합니다.',
        },
        {
          name: 'theme',
          type: "'light' | 'dark'",
          default: "'light'",
          description:
            '초기 테마. 런타임에는 <a href="#api-methods-setTheme"><code>setTheme()</code></a>으로 변경합니다.',
        },
        {
          name: 'rowHeight',
          type: 'number',
          default: '42',
          description:
            '행 높이(px). 가상 스크롤 계산에 사용되므로 CSS로 직접 바꾸지 말고 이 옵션을 사용하세요.',
        },
        {
          name: 'headerHeight',
          type: 'number',
          default: '48',
          description: '헤더 행 높이(px).',
        },
        {
          name: 'sortModel',
          type: '{ field, dir }[]',
          description:
            '초기 정렬 상태. <code>dir</code>은 <code>\'asc\'</code> 또는 <code>\'desc\'</code>. ' +
            '배열 순서가 다중 정렬 우선순위입니다.',
          example:
            "sortModel: [{ field: 'department', dir: 'asc' }, { field: 'salary', dir: 'desc' }]",
        },
        {
          name: 'getRowId',
          type: '(row) => string',
          description:
            '행 식별자 함수. 생략하면 행 객체별 내부 id가 자동 발급됩니다. ' +
            '데이터를 통째로 교체하면서 선택 상태를 유지해야 할 때 지정하세요.',
          example: 'getRowId: function (row) { return row.employeeId; }',
        },
        {
          name: 'columnReorder',
          type: 'boolean',
          default: 'true',
          description:
            '헤더 드래그로 컬럼 순서 변경을 허용합니다. 고정(pinned) 컬럼은 드래그 대상에서 제외됩니다.',
        },
        {
          name: 'floatingFilter',
          type: 'boolean',
          default: 'false',
          since: '1.1.0',
          description:
            '헤더 바로 아래에 컬럼별 인라인 필터 행을 표시합니다. <code>filter</code>가 지정된 컬럼마다 ' +
            'text/number는 입력창(입력 즉시 250ms 디바운스로 적용, <kbd>Enter</kbd> 즉시 적용, <kbd>Esc</kbd> 해제), ' +
            '<code>set</code>은 단일 값 드롭다운이 생깁니다. 필터 메뉴와 같은 필터 모델을 공유하며, ' +
            '단일 입력으로 표현할 수 없는 <code>inRange</code>는 <code>equals</code>로 대체됩니다.',
          example: 'floatingFilter: true',
        },
        {
          name: 'groupBy',
          type: 'string[]',
          default: '[]',
          since: '1.1.0',
          description:
            '행을 그룹핑할 필드 목록. 배열 순서대로 중첩 그룹이 만들어지고, 그룹 헤더 행을 클릭(또는 <kbd>Enter</kbd>)해 ' +
            '접고 펼칠 수 있습니다. 그룹 순서는 정렬된 데이터에서의 첫 등장 순서를 따르므로, 그룹 컬럼을 정렬하면 ' +
            '그룹 순서도 함께 바뀝니다. 런타임 변경은 <a href="#api-methods-setGroupBy"><code>setGroupBy()</code></a>.',
          example:
            "groupBy: ['department', 'city']  // 부서 → 도시 2단계 그룹핑",
        },
        {
          name: 'groupDefaultExpanded',
          type: 'boolean',
          default: 'true',
          since: '1.1.0',
          description:
            '그룹의 초기 펼침 상태. <code>false</code>면 모든 그룹이 접힌 채 시작합니다.',
        },
        {
          name: 'grandTotal',
          type: 'boolean',
          default: 'false',
          since: '1.1.0',
          description:
            '그리드 하단에 전체 요약 행을 고정 표시합니다. <code>aggFunc</code>가 지정된 컬럼의 집계값과 ' +
            '전체 행 수(필터 적용 후)를 보여주며, <code>aggFunc</code> 컬럼이 하나도 없으면 표시되지 않습니다. ' +
            '그룹핑 없이도 사용할 수 있습니다.',
        },
        {
          name: 'editOnSingleClick',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '클릭 한 번으로 편집을 시작합니다(기본은 더블클릭 또는 <kbd>Enter</kbd>). ' +
            '체크박스 클릭은 제외됩니다.',
        },
        {
          name: 'enterMovesDown',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '편집 중 <kbd>Enter</kbd>로 커밋하면 같은 컬럼의 아래 행에서 편집을 이어갑니다(연속 편집). ' +
            '그룹 헤더 행은 건너뛰고, 검증 실패로 커밋되지 않으면 이동하지 않습니다.',
        },
        {
          name: 'tabMovesRight',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '편집 중 <kbd>Tab</kbd>/<kbd>Shift+Tab</kbd>으로 커밋 후 오른쪽/왼쪽의 다음 편집 가능 셀로 이동합니다. ' +
            '행 끝에서는 다음/이전 행으로 감쌉니다.',
        },
        {
          name: 'title',
          type: 'string',
          since: '1.2.0',
          description:
            '그리드 최상단에 타이틀 바를 표시합니다. <code>setOptions({ title })</code>로 런타임 변경.',
        },
        {
          name: 'toolbar',
          type: 'HTMLElement | (grid) => HTMLElement',
          since: '1.2.0',
          description:
            '타이틀 바 아래 툴바 슬롯. <strong>소비자가 만든 DOM</strong>(또는 grid를 받아 DOM을 반환하는 함수)을 ' +
            '그대로 넣습니다 — 버튼 구성·동작은 앱이 소유하고 그리드는 자리만 제공합니다.',
          example:
            "var bar = document.createElement('div');\n" +
            "bar.innerHTML = '<button>Export</button>';\n" +
            'new DataGrid(el, { toolbar: bar, ... });',
        },
        {
          name: 'rowDetail',
          type: '{ renderer: (row) => string | Node, height?: number }',
          since: '1.2.0',
          description:
            '마스터-디테일 행. 첫 컬럼에 셰브론 토글 컬럼이 자동 추가되고, 펼치면 행 아래에 ' +
            '<code>renderer</code>가 그린 디테일 패널이 나타납니다(기본 높이 200px, ' +
            '<code>height</code>로 조절 — 가상 스크롤 레이아웃에 정확히 반영). ' +
            '<code>expandRow()</code> / <code>collapseRow()</code> / <code>toggleRowDetail()</code> / ' +
            '<code>isRowExpanded()</code>로 제어합니다. ' +
            '<strong>renderer가 반환한 HTML은 이스케이프되지 않습니다</strong> — ' +
            '<code>cellRenderer</code>와 같은 주의가 필요합니다.',
          example:
            'rowDetail: {\n' +
            '  height: 150,\n' +
            "  renderer: function (row) { return '<h4>' + row.name + '</h4>…'; },\n" +
            '}',
        },
        {
          name: 'dataSource',
          type: '{ url, method?, params?, parse? }',
          since: '1.2.0',
          description:
            '원격 데이터 소스. <code>fetch</code>로 <code>url</code>을 호출해 행을 불러옵니다. ' +
            '<code>method</code> 기본은 GET(파라미터를 쿼리스트링으로, POST면 JSON body로), ' +
            '<code>params</code>는 항상 포함할 고정 파라미터(객체 또는 함수), ' +
            '<code>parse(json)</code>은 응답을 <code>{ rows, total }</code>로 바꾸는 훅입니다' +
            '(기본: 배열 또는 <code>{ rows, total }</code> 그대로). ' +
            '로딩 중 오버레이가 표시되고 실패 시 <code>dataLoadError</code> 이벤트가 발생합니다. ' +
            '<code>reloadData()</code>로 다시 불러옵니다.',
          example:
            "dataSource: {\n" +
            "  url: '/api/employees',\n" +
            "  params: function () { return { token: auth.token }; },\n" +
            '},\n' +
            "sortMode: 'server', pageMode: 'server', pagination: true",
        },
        {
          name: 'sortMode',
          type: "'client' | 'server'",
          default: "'client'",
          since: '1.2.0',
          description:
            '정렬 수행 주체. <code>\'server\'</code>면 클라이언트 정렬을 건너뛰고 정렬이 바뀔 때마다 ' +
            '<code>dataSource</code>를 다시 호출하며 <code>sort</code> 파라미터(sortModel JSON)를 보냅니다. ' +
            '<code>filterMode</code>(<code>filter</code>/<code>quickFilter</code> 파라미터)와 ' +
            '<code>pageMode</code>(<code>page</code>/<code>pageSize</code> 파라미터, 응답 <code>total</code>로 ' +
            '페이지네이션 계산)도 같은 방식입니다. 세 축을 독립적으로 설정할 수 있습니다.',
        },
        {
          name: 'columnGroups',
          type: '{ headerName: string, children: string[] }[]',
          since: '1.2.0',
          description:
            '헤더 위에 2단 그룹 스팬 행을 추가합니다. <code>children</code>은 <code>colId</code> 또는 ' +
            '<code>field</code>로 컬럼을 지칭하며, <strong>연속으로 배치된</strong> 같은 그룹 컬럼이 ' +
            '하나의 스팬으로 묶입니다(드래그로 떨어뜨리면 스팬도 갈라짐). 그룹에 속하지 않은 컬럼 위는 ' +
            '빈 스팬으로 채워지고, 고정(pinned) 컬럼 경계에서는 스팬이 끊깁니다. ' +
            '높이는 <code>--dg-group-header-height</code> 토큰으로 조절합니다.',
          example:
            "columnGroups: [\n" +
            "  { headerName: 'Person', children: ['name', 'email'] },\n" +
            "  { headerName: 'Compensation', children: ['salary', 'rating'] },\n" +
            ']',
        },
        {
          name: 'cellSelection',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '셀/블록 범위 선택 모드. 셀 클릭이 앵커가 되고 드래그·<kbd>Shift</kbd>+클릭·' +
            '<kbd>Shift</kbd>+화살표로 사각 범위를 확장합니다. <kbd>Ctrl/⌘+C</kbd>는 범위를 TSV로 복사하고 ' +
            '<a href="#api-methods-getCellRange"><code>getCellRange()</code></a>로 범위를 읽습니다. ' +
            '이 모드에서는 클릭 행 선택이 꺼지며(체크박스 선택은 유지) 범위가 바뀔 때마다 ' +
            '<code>cellRangeChanged</code> 이벤트가 발생합니다.',
        },
        {
          name: 'mergeCells',
          type: 'string[]',
          since: '2.0.0',
          description:
            '지정한 필드들에서 표시 순서상 <strong>연속된 같은 값</strong>을 세로 병합으로 표현합니다 — ' +
            '이어지는 셀은 값과 위 경계선을 숨깁니다(엄격 비교 <code>===</code>). ' +
            '해당 컬럼으로 정렬하면 병합 묶음이 커지고, 그룹 헤더/디테일 행에서 병합이 끊깁니다. ' +
            '표시만 병합될 뿐 데이터는 그대로이므로 CSV/클립보드/편집에는 영향이 없습니다.',
          example: "mergeCells: ['product', 'status'],\nsortModel: [{ field: 'product', dir: 'asc' }]",
        },
        {
          name: 'fillHandle',
          type: 'boolean',
          default: 'false',
          since: '2.0.0',
          description:
            '선택 범위 우하단에 엑셀식 채우기 핸들을 표시합니다(<code>cellSelection: true</code> 필요). ' +
            '세로 드래그로 채우며, 원본이 모두 숫자이고 2개 이상이면 등차 수열로 외삽하고 ' +
            '그 외에는 패턴을 순환 반복합니다. 편집 가능한 셀에만 쓰이고 ' +
            '<code>validator</code>/<code>beforeCellSave</code>를 통과한 값만 반영되며, ' +
            '완료 시 <code>fillApplied</code> 이벤트가 발생합니다.',
        },
        {
          name: 'trackChanges',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '마지막 기준선(생성/<code>setRowData</code>/<code>commitChanges</code>) 이후의 변경을 추적합니다. ' +
            '수정된 셀은 모서리 마커(dirty, 툴팁에 원래 값), 추가된 행은 배경색으로 표시되고 ' +
            '<a href="#api-methods-getChanges"><code>getChanges()</code></a> / ' +
            '<code>commitChanges()</code> / <code>rollbackChanges()</code>로 제어합니다. ' +
            '값이 원래대로 돌아오면 dirty가 자동 해제됩니다.',
        },
        {
          name: 'undoRedo',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '셀 수정·행 추가·행 삭제의 실행 취소 스택을 활성화합니다 — ' +
            '<kbd>Ctrl/⌘+Z</kbd>(undo), <kbd>Ctrl/⌘+Shift+Z</kbd> 또는 <kbd>Ctrl/⌘+Y</kbd>(redo), ' +
            '<code>undo()</code> / <code>redo()</code> / <code>canUndo()</code> / <code>canRedo()</code>. ' +
            '<code>trackChanges</code>와 독립적으로 사용할 수 있고 함께 켜면 추적 상태도 같이 되돌아갑니다.',
        },
        {
          name: 'getRowClass',
          type: '(row, index) => string',
          since: '1.2.0',
          description:
            '행별 CSS 클래스. 표시 순서 기준 <code>index</code>와 행 객체를 받아 클래스 문자열' +
            '(공백 구분 복수 허용)을 반환합니다. falsy 반환 시 클래스 없음. 예외는 콘솔 기록 후 무시됩니다.',
          example:
            "getRowClass: function (row) { return row.total >= 2000 ? 'row-hot' : ''; }",
        },
        {
          name: 'rowNumbers',
          type: 'boolean',
          default: 'false',
          since: '1.1.0',
          description:
            '왼쪽에 고정(pinned left)된 행 번호 컬럼을 추가합니다. 번호는 필터·정렬이 적용된 표시 순서 기준이며 ' +
            '정렬·필터·클립보드 복사·CSV 대상에서 제외됩니다. 그룹 헤더 행에는 번호가 표시되지 않습니다.',
          example: 'rowNumbers: true',
        },
        {
          name: 'editable',
          type: 'boolean',
          default: 'true',
          since: '1.1.0',
          description:
            '그리드 전체 편집 스위치. <code>false</code>면 컬럼의 <code>editable</code> 설정을 무시하고 ' +
            '더블클릭·<kbd>Enter</kbd>·<code>startEdit()</code>·붙여넣기를 모두 잠급니다. ' +
            '런타임에는 <a href="#api-methods-setEditable"><code>setEditable()</code></a>로 전환합니다.',
        },
      ],
    },

    /* =========================================================================
     * Column Definitions
     * ======================================================================= */
    {
      id: 'column-defs',
      title: 'Column Definitions',
      kind: 'options',
      intro:
        '<p><code>columnDefs</code> 배열의 각 항목입니다. ' +
        '모든 속성은 <code>defaultColDef</code>로 일괄 지정할 수 있습니다.</p>',
      entries: [
        {
          name: 'field',
          type: 'string',
          description:
            '행 객체에서 값을 읽을 키. 생략하면 셀이 비고(체크박스 전용 컬럼 등), 정렬/필터 대상에서 제외됩니다.',
        },
        {
          name: 'headerName',
          type: 'string',
          default: 'field 값',
          description: '헤더에 표시할 라벨. CSV 내보내기의 헤더 행에도 사용됩니다.',
        },
        {
          name: 'colId',
          type: 'string',
          default: 'field 값',
          description:
            '컬럼 고유 id. <code>setColumnVisible()</code>, <code>autoSizeColumn()</code> 등에서 컬럼을 지칭할 때 사용합니다. ' +
            '<code>field</code>가 없는 컬럼(체크박스 등)에는 직접 지정하세요.',
        },
        {
          name: 'width',
          type: 'number',
          default: '160',
          description: '픽셀 폭.',
        },
        {
          name: 'minWidth',
          type: 'number',
          default: '60',
          description: '최소 폭(px). 리사이즈·flex 계산 시에도 이 값 아래로 줄어들지 않습니다.',
        },
        {
          name: 'maxWidth',
          type: 'number',
          since: '1.1.0',
          description:
            '최대 폭(px). 드래그 리사이즈·flex 분배·<code>autoSizeColumn()</code> 모두 이 값을 넘지 않습니다.',
          example: "{ field: 'code', width: 90, maxWidth: 120 }",
        },
        {
          name: 'flex',
          type: 'number',
          description:
            '고정 폭 컬럼을 배치한 뒤 남은 공간을 <code>flex</code> 비율로 나눠 가집니다. ' +
            '<code>width</code>보다 우선하며, 사용자가 직접 리사이즈하면 고정 폭으로 전환됩니다.',
          example: "{ field: 'description', flex: 2 }, { field: 'note', flex: 1 }",
        },
        {
          name: 'sortable',
          type: 'boolean',
          default: 'true',
          description:
            '헤더 클릭으로 정렬합니다. 클릭할 때마다 오름차순 → 내림차순 → 해제로 순환하고, ' +
            '<kbd>Shift</kbd>+클릭으로 다중 정렬에 추가합니다(헤더에 정렬 순서 배지 표시).',
        },
        {
          name: 'comparator',
          type: '(a, b, rowA, rowB) => number',
          description:
            '커스텀 정렬 비교 함수. 기본 비교자는 숫자·날짜·불리언·문자열(자연 정렬, 대소문자 무시)을 처리하고 ' +
            '빈 값(null/undefined/\'\')을 항상 마지막에 배치합니다.',
          example:
            "comparator: function (a, b) { return a.length - b.length; } // 문자열 길이순",
        },
        {
          name: 'filter',
          type: "true | 'text' | 'number' | 'set'",
          default: 'false',
          description:
            '헤더 메뉴에서 열 수 있는 컬럼 필터 종류. <code>true</code>는 <code>dataType</code>에 맞는 종류' +
            '(number → <code>\'number\'</code>, bool → <code>\'set\'</code>, 그 외 <code>\'text\'</code>)로 해석됩니다. ' +
            '필터 모델 구조는 <a href="#filter-model">Filter Model</a> 섹션 참고.',
        },
        {
          name: 'editor',
          type: "'text' | 'number' | 'select' | { init, getValue, destroy? }",
          since: '1.2.0',
          description:
            '인라인 에디터. 문자열이면 내장 에디터(<code>\'select\'</code>는 <code>editorOptions</code> 배열 필요), ' +
            '객체면 커스텀 에디터: <code>init(cellEl, value, row, col)</code>로 UI를 셀에 렌더링하고, ' +
            '커밋 시 <code>getValue()</code>가 새 값을 반환하며, 닫힐 때 <code>destroy()</code>(선택)가 호출됩니다. ' +
            '커스텀 에디터에서도 <kbd>Enter</kbd> 커밋 / <kbd>Esc</kbd> 취소 / 포커스 이탈 커밋과 ' +
            '<code>validator</code>·<code>beforeCellSave</code> 검증이 동일하게 동작합니다. ' +
            '생략 시 <code>dataType</code>/<code>filter</code>가 number면 숫자, 아니면 텍스트 에디터.',
          example:
            "editor: {\n" +
            "  init: function (cell, value) {\n" +
            "    this._input = document.createElement('input');\n" +
            "    this._input.type = 'range'; this._input.value = value;\n" +
            '    cell.appendChild(this._input); this._input.focus();\n' +
            '  },\n' +
            '  getValue: function () { return Number(this._input.value); },\n' +
            '}',
        },
        {
          name: 'exportFormatter',
          type: '(value, row) => any',
          since: '1.2.0',
          description:
            'CSV/Excel 내보내기에서 <code>valueFormatter</code> 대신 사용할 포맷 함수. ' +
            '화면 표시와 내보내기 포맷을 분리할 때 씁니다(예: 화면은 <code>$1,234</code>, ' +
            '엑셀은 원시 숫자). 숫자를 반환하면 xlsx에서 숫자 셀로 나갑니다.',
          example:
            "{ field: 'total', format: '$#,##0',            // 화면\n" +
            '  exportFormatter: function (v) { return v; } } // 내보내기는 원시 값',
        },
        {
          name: 'valueGetter',
          type: '(row) => any',
          since: '1.2.0',
          description:
            '파생 값 계산 컬럼. 뷰가 재계산될 때마다 결과가 <code>row[field]</code>에 <strong>기록</strong>되므로 ' +
            '정렬·필터·퀵 필터·CSV/JSON 내보내기·클립보드가 모두 같은 파생 값을 봅니다. ' +
            '전용 <code>field</code> 이름을 주세요(기존 필드를 덮어쓸 수도 있음). ' +
            'getter 예외는 콘솔에 기록되고 해당 셀만 건너뜁니다.',
          example:
            "{ field: 'total', headerName: 'Total', dataType: 'number',\n" +
            '  valueGetter: function (row) { return row.quantity * row.unitPrice; } }',
        },
        {
          name: 'suppressMove',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '이 컬럼을 헤더 드래그 순서 변경에서 제외합니다(다른 컬럼은 계속 이동 가능). ' +
            '고정(pinned) 컬럼은 원래 드래그 대상이 아닙니다.',
        },
        {
          name: 'dataType',
          type: "'string' | 'number' | 'date' | 'bool'",
          since: '1.1.0',
          description:
            '컬럼 값의 데이터 타입 선언. 지정하면 ① 정렬이 타입 기준 비교로 동작하고' +
            '(문자열로 저장된 숫자·날짜도 올바르게 정렬, 해석 불가/빈 값은 마지막), ' +
            '② <code>filter: true</code>의 필터 종류가 자동 결정되며, ' +
            '③ <code>\'number\'</code>는 <code>align</code> 미지정 시 오른쪽 정렬 + 숫자 에디터가 기본이 됩니다. ' +
            '<code>comparator</code>를 함께 주면 그것이 우선합니다.',
          example: "{ field: 'hireDate', dataType: 'date', filter: true, format: 'yyyy-MM-dd' }",
        },
        {
          name: 'format',
          type: 'string',
          since: '1.1.0',
          description:
            '선언적 표시 포맷 — <code>valueFormatter</code>의 간편판입니다. ' +
            '<code>\'#\'</code>/<code>\'0\'</code>이 포함되면 숫자 마스크' +
            '(<code>\',\'</code> 그룹핑, 소수 자릿수 반올림, <code>\'0\'</code> 필수 자리, 리터럴 접두/접미), ' +
            '아니면 날짜 패턴(<code>yyyy MM dd HH mm ss</code> 토큰)으로 해석합니다. ' +
            'CSV 내보내기·집계 표시·자동 폭 계산에도 적용되며, <code>valueFormatter</code>가 있으면 무시됩니다. ' +
            '같은 패턴을 <a href="#api-methods-format"><code>DataGrid.format()</code></a> 유틸로 직접 쓸 수 있습니다.',
          example:
            "{ field: 'salary', dataType: 'number', format: '$#,##0.00' }\n" +
            "{ field: 'hireDate', dataType: 'date', format: 'yyyy.MM.dd' }",
        },
        {
          name: 'aggFunc',
          type: "'sum' | 'avg' | 'min' | 'max' | 'count'",
          since: '1.1.0',
          description:
            '이 컬럼의 집계 함수. <a href="#grid-options-groupBy"><code>groupBy</code></a> 그룹 헤더 행과 ' +
            '<a href="#grid-options-grandTotal"><code>grandTotal</code></a> 요약 행에 집계값이 표시됩니다. ' +
            '<code>count</code>를 제외한 함수는 숫자로 해석 가능한 값만 집계하며(빈 값·문자 제외), ' +
            '집계값에도 <code>valueFormatter</code>가 적용됩니다(이때 두 번째 인자 <code>row</code>는 <code>null</code>).',
          example:
            "{ field: 'salary', aggFunc: 'sum', align: 'right',\n" +
            "  valueFormatter: function (v) { return '$' + v.toLocaleString(); } }",
        },
        {
          name: 'editable',
          type: 'boolean',
          default: 'false',
          description:
            '셀 더블클릭 또는 포커스 상태에서 <kbd>Enter</kbd>로 인라인 편집을 시작합니다. ' +
            '<kbd>Enter</kbd>/blur로 커밋, <kbd>Esc</kbd>로 취소하며 커밋 시 ' +
            '<a href="#events-cellValueChanged"><code>cellValueChanged</code></a> 이벤트가 발생합니다.',
        },
        {
          name: 'editor',
          type: "'text' | 'number' | 'select'",
          default: "'text'",
          description:
            '인라인 에디터 종류. <code>\'number\'</code>는 커밋 시 숫자로 변환하고 숫자가 아니면 이전 값으로 되돌립니다. ' +
            '<code>\'select\'</code>는 <code>editorOptions</code>의 선택지를 보여줍니다.',
          example:
            "{ field: 'department', editable: true, editor: 'select',\n" +
            "  editorOptions: ['Engineering', 'Design', 'Sales'] }",
        },
        {
          name: 'editorOptions',
          type: 'string[]',
          description: "<code>editor: 'select'</code>일 때의 선택지 목록.",
        },
        {
          name: 'suppressCopy',
          type: 'boolean',
          default: 'false',
          since: '1.1.0',
          description:
            '클립보드 복사(<kbd>Ctrl+C</kbd> / <code>copy()</code>) 대상에서 이 컬럼을 제외합니다. ' +
            'CSV 내보내기에는 영향이 없습니다.',
        },
        {
          name: 'validator',
          type: "(value, row) => true | string",
          since: '1.1.0',
          description:
            '편집 커밋 직전에 호출되는 검증 함수. <code>true</code>(또는 반환 없음)면 저장하고, ' +
            '문자열을 반환하면 그 메시지로 커밋을 거부합니다 — 편집기가 빨간 테두리(<code>--dg-invalid-color</code>)로 ' +
            '유지되고 메시지는 title 툴팁으로 표시되며, 값을 고치거나 <kbd>Esc</kbd>로 취소할 때까지 닫히지 않습니다. ' +
            '검증 통과 후에는 <a href="#events-beforeCellSave"><code>beforeCellSave</code></a> 이벤트로 한 번 더 거부할 수 있습니다.',
          example:
            "{ field: 'salary', editable: true, editor: 'number',\n" +
            "  validator: function (v) { return v >= 0 || '급여는 0 이상이어야 합니다'; } }",
        },
        {
          name: 'valueFormatter',
          type: '(value, row) => string',
          description:
            '셀에 표시할 문자열을 만듭니다. 표시·CSV 내보내기에 적용되며, 정렬·필터는 원본 값을 사용합니다. ' +
            '포맷 결과는 기본적으로 HTML 이스케이프되어 안전합니다.',
          example:
            "valueFormatter: function (v) { return '$' + Number(v).toLocaleString(); }",
        },
        {
          name: 'cellRenderer',
          type: '(params) => string | Node',
          description:
            '셀 내용을 직접 렌더링합니다. <code>params</code>는 <code>{ value, formatted, data, colDef }</code>. ' +
            'HTML 문자열 또는 DOM Node를 반환하며, <strong>반환한 HTML은 이스케이프되지 않으므로</strong> ' +
            '사용자 입력을 넣을 때는 직접 이스케이프해야 합니다. 렌더러에서 예외가 발생하면 해당 셀은 포맷된 원본 값으로 대체됩니다. ' +
            '내장 렌더러는 <a href="#renderers">Built-in Renderers</a> 참고.',
          example:
            'cellRenderer: function (params) {\n' +
            "  return '<a href=\"/user/' + params.data.id + '\">' + params.formatted + '</a>';\n" +
            '}',
        },
        {
          name: 'cellClass',
          type: 'string | (value, row) => string',
          description: '셀에 추가할 CSS 클래스(공백 구분 다중 가능).',
          example:
            "cellClass: function (v) { return v < 0 ? 'cell-negative' : ''; }",
        },
        {
          name: 'align',
          type: "'left' | 'center' | 'right'",
          default: "'left'",
          description: '셀·헤더 정렬. 숫자 컬럼에는 <code>\'right\'</code>를 권장합니다.',
        },
        {
          name: 'pinned',
          type: "'left' | 'right'",
          description:
            '컬럼을 좌/우에 고정합니다. 가로 스크롤 시 sticky로 유지되고 경계에 그림자가 표시됩니다. ' +
            '고정 컬럼은 드래그 순서 변경 대상에서 제외됩니다.',
        },
        {
          name: 'checkboxSelection',
          type: 'boolean',
          default: 'false',
          description:
            '셀 앞에 선택 체크박스를 표시합니다. 보통 <code>field</code> 없는 전용 컬럼으로 만듭니다.',
          example:
            "{ colId: 'sel', headerName: '', width: 48, minWidth: 48,\n" +
            '  checkboxSelection: true, headerCheckboxSelection: true,\n' +
            '  sortable: false, resizable: false }',
        },
        {
          name: 'headerCheckboxSelection',
          type: 'boolean',
          default: 'false',
          description:
            '헤더에 전체 선택 체크박스를 표시합니다(<code>rowSelection: \'multiple\'</code> 필요). ' +
            '일부만 선택된 상태에서는 indeterminate로 표시됩니다. 전체 선택은 필터가 적용된 현재 뷰 전체를 선택합니다.',
        },
        {
          name: 'resizable',
          type: 'boolean',
          default: 'true',
          description:
            '헤더 경계를 드래그해 폭을 조절합니다. 경계 더블클릭 시 내용에 맞춰 자동 조절(<code>autoSizeColumn</code>)됩니다.',
        },
        {
          name: 'hide',
          type: 'boolean',
          default: 'false',
          description:
            '컬럼을 숨깁니다. 런타임에는 <a href="#api-methods-setColumnVisible"><code>setColumnVisible()</code></a>을 사용하세요.',
        },
      ],
    },

    /* =========================================================================
     * Filter Model
     * ======================================================================= */
    {
      id: 'filter-model',
      title: 'Filter Model',
      kind: 'guide',
      intro:
        '<p>컬럼 필터의 상태 객체입니다. 헤더 메뉴 UI가 내부적으로 만들지만, ' +
        '<a href="#api-methods-applyColumnFilter"><code>applyColumnFilter(field, model)</code></a>로 ' +
        '코드에서 직접 적용할 수도 있습니다. 여러 컬럼의 필터는 AND로 결합되고, ' +
        '퀵 필터와도 AND로 결합됩니다.</p>',
      entries: [
        {
          name: 'TextFilterModel',
          kind: 'type',
          description:
            '<code>op</code>: <code>contains</code> · <code>notContains</code> · <code>equals</code> · ' +
            '<code>notEqual</code> · <code>startsWith</code> · <code>endsWith</code> — 대소문자를 무시하고 비교합니다.',
          example:
            "grid.applyColumnFilter('name', { type: 'text', op: 'startsWith', value: 'kim' });",
        },
        {
          name: 'NumberFilterModel',
          kind: 'type',
          description:
            '<code>op</code>: <code>equals</code> · <code>notEqual</code> · <code>lessThan</code> · ' +
            '<code>lessThanOrEqual</code> · <code>greaterThan</code> · <code>greaterThanOrEqual</code> · ' +
            '<code>inRange</code>(<code>valueTo</code> 필요, 양끝 포함). 숫자가 아닌 값과 빈 값은 항상 제외됩니다.',
          example:
            "grid.applyColumnFilter('salary', { type: 'number', op: 'inRange', value: 50000, valueTo: 90000 });",
        },
        {
          name: 'SetFilterModel',
          kind: 'type',
          description:
            '<code>values</code> 배열에 포함된 값(문자열 비교)만 통과시킵니다. ' +
            'UI에서는 컬럼의 고유 값 목록이 체크박스로 표시됩니다.',
          example:
            "grid.applyColumnFilter('status', { type: 'set', values: ['Active', 'Contract'] });",
        },
      ],
    },

    /* =========================================================================
     * API Methods
     * ======================================================================= */
    {
      id: 'api-methods',
      title: 'API Methods',
      kind: 'methods',
      intro:
        '<p>그리드 인스턴스의 공개 메서드입니다. <code>destroy()</code> 이후의 호출은 무시됩니다.</p>',
      entries: [
        /* ---- 데이터 ---- */
        {
          name: 'setRowData',
          group: 'Data',
          signature: 'setRowData(rows: object[]): void',
          description:
            '행 데이터를 통째로 교체합니다. 선택·포커스·페이지가 초기화됩니다(필터·정렬 상태는 유지).',
        },
        {
          name: 'getRowData',
          group: 'Data',
          signature: 'getRowData(): object[]',
          description: '필터와 무관한 전체 행 배열(복사본)을 반환합니다.',
        },
        {
          name: 'getDisplayedRows',
          group: 'Data',
          signature: 'getDisplayedRows(): object[]',
          description: '필터·정렬이 적용된 현재 뷰의 행 배열(모든 페이지 포함)을 반환합니다.',
        },
        {
          name: 'getDisplayedRowCount',
          group: 'Data',
          signature: 'getDisplayedRowCount(): number',
          description: '현재 뷰의 행 수를 반환합니다.',
        },
        {
          name: 'reloadData',
          group: 'Data',
          signature: 'reloadData(): void',
          since: '1.2.0',
          description:
            '<code>dataSource</code>에서 데이터를 다시 불러옵니다. server 모드인 축의 현재 상태' +
            '(페이지·정렬·필터)가 요청 파라미터로 전달되고, 응답이 오면 행을 교체하고 ' +
            '<code>dataChanged</code>를 발생시킵니다. 여러 요청이 겹치면 마지막 요청만 반영됩니다.',
        },
        {
          name: 'addRow',
          group: 'Data',
          signature: 'addRow(row: object): void',
          description: '행 하나를 추가합니다. <code>addRows(rows)</code>로 여러 행을 한 번에 추가할 수 있습니다.',
        },
        {
          name: 'updateRow',
          group: 'Data',
          signature: 'updateRow(row: object, changes: object): void',
          description: '행 객체에 <code>changes</code>를 병합하고 다시 렌더링합니다.',
          example: "grid.updateRow(grid.getSelectedRows()[0], { status: 'Inactive' });",
        },
        {
          name: 'removeRows',
          group: 'Data',
          signature: 'removeRows(rows: object[]): void',
          description: '지정한 행들을 제거합니다. <code>removeSelectedRows()</code>는 선택된 행을 제거합니다.',
        },

        /* ---- 선택 ---- */
        {
          name: 'getSelectedRows',
          group: 'Selection',
          signature: 'getSelectedRows(): object[]',
          description: '선택된 행 배열을 반환합니다.',
        },
        {
          name: 'selectAll',
          group: 'Selection',
          signature: 'selectAll(): void',
          description:
            '현재 뷰(필터 적용)의 모든 행을 선택합니다. <code>rowSelection: \'multiple\'</code>에서만 동작. ' +
            '<code>deselectAll()</code>은 모든 선택을 해제합니다.',
        },

        /* ---- 편집 ---- */
        {
          name: 'startEdit',
          group: 'Editing',
          signature: 'startEdit(row: object, field: string): boolean',
          since: '1.1.0',
          description:
            '지정한 행/필드의 인라인 편집을 코드로 시작합니다. 다른 페이지에 있으면 해당 페이지로 이동하고 ' +
            '행을 스크롤해 보이게 만든 뒤 시작합니다. 편집 불가 컬럼이거나 행이 현재 뷰에 없으면 ' +
            '<code>false</code>를 반환합니다.',
          example: "grid.startEdit(grid.getSelectedRows()[0], 'salary');",
        },
        {
          name: 'stopEdit',
          group: 'Editing',
          signature: 'stopEdit(commit?: boolean): void',
          since: '1.1.0',
          description:
            '진행 중인 편집을 종료합니다. 기본은 커밋(검증·<code>beforeCellSave</code> 통과 시 저장), ' +
            '<code>stopEdit(false)</code>는 취소합니다. 편집 중이 아니면 무시됩니다.',
        },
        {
          name: 'isEditing',
          group: 'Editing',
          signature: 'isEditing(): boolean',
          since: '1.1.0',
          description: '인라인 편집이 진행 중인지 반환합니다.',
        },
        {
          name: 'setEditable',
          group: 'Editing',
          signature: 'setEditable(enabled: boolean): void',
          since: '1.1.0',
          description:
            '그리드 전체 편집을 잠그거나 해제합니다(<code>editable</code> 옵션의 런타임 버전). ' +
            '잠그면 진행 중인 편집도 정리됩니다. 현재 상태는 <code>isEditable()</code>로 확인합니다.',
          example: 'grid.setEditable(false);  // 읽기 전용 모드',
        },

        /* ---- 클립보드 ---- */
        {
          name: 'copy',
          group: 'Clipboard',
          signature: 'copy(): string | null',
          since: '1.1.0',
          description:
            '선택된 행(뷰 순서, 없으면 포커스 셀)을 엑셀 호환 TSV로 클립보드에 복사하고 그 문자열을 반환합니다. ' +
            '복사할 대상이 없으면 <code>null</code>. 값은 <strong>원시 데이터</strong>를 사용합니다' +
            '(포매터 미적용 — 스프레드시트 숫자 인식과 붙여넣기 왕복을 위해). ' +
            '<code>suppressCopy</code> 컬럼과 <code>field</code> 없는 컬럼(체크박스 등)은 제외됩니다. ' +
            '<kbd>Ctrl/⌘+C</kbd>와 같은 동작입니다.',
          example: "var tsv = grid.copy();  // '1\\tAlice\\t52000\\r\\n2\\tBob\\t61000'",
        },
        {
          name: 'pasteTsv',
          group: 'Clipboard',
          signature: 'pasteTsv(text: string): number',
          since: '1.1.0',
          description:
            '포커스 셀을 시작점으로 TSV 텍스트를 붙여넣고 갱신된 셀 수를 반환합니다. ' +
            '<strong>편집 가능한(<code>editable</code>) 셀에만</strong> 쓰이며, 숫자 에디터 컬럼은 숫자로 변환' +
            '(실패 시 건너뜀), <code>validator</code>와 <code>beforeCellSave</code>를 통과한 값만 반영됩니다. ' +
            '갱신된 셀마다 <code>cellValueChanged</code>가 발생합니다. <kbd>Ctrl/⌘+V</kbd>가 내부적으로 사용하는 API입니다.',
          example: "grid.pasteTsv('Kim\\t72000\\nLee\\t68000');  // 포커스 셀부터 2행 2열",
        },

        /* ---- 필터/정렬 ---- */
        {
          name: 'setQuickFilter',
          group: 'Filter & Sort',
          signature: 'setQuickFilter(text: string): void',
          description:
            '모든 표시 컬럼을 대상으로 하는 전역 검색. 공백으로 구분한 모든 단어가 일치해야 합니다(AND).',
        },
        {
          name: 'applyColumnFilter',
          group: 'Filter & Sort',
          signature: 'applyColumnFilter(field: string, model: FilterModel | null): void',
          description:
            '컬럼 필터를 코드로 적용합니다. <code>null</code>을 넘기면 해당 컬럼 필터를 해제합니다. ' +
            '모델 구조는 <a href="#filter-model">Filter Model</a> 참고.',
        },
        {
          name: 'getFilterModel',
          group: 'Filter & Sort',
          signature: 'getFilterModel(): { [field]: FilterModel }',
          description: '현재 컬럼 필터 상태를 반환합니다.',
        },
        {
          name: 'clearFilters',
          group: 'Filter & Sort',
          signature: 'clearFilters(): void',
          description: '모든 컬럼 필터와 퀵 필터를 해제합니다.',
        },
        {
          name: 'setSortModel',
          group: 'Filter & Sort',
          signature: 'setSortModel(model: { field, dir }[]): void',
          description:
            '정렬 상태를 코드로 설정합니다. <code>getSortModel()</code>로 현재 상태를 읽습니다.',
          example: "grid.setSortModel([{ field: 'salary', dir: 'desc' }]);",
        },

        /* ---- 그룹핑 ---- */
        {
          name: 'setGroupBy',
          group: 'Grouping',
          signature: 'setGroupBy(fields: string[]): void',
          since: '1.1.0',
          description:
            '그룹핑 필드를 런타임에 변경합니다. 빈 배열(또는 <code>null</code>)이면 그룹핑을 해제합니다. ' +
            '접힘/펼침 상태는 초기화되고 <a href="#events-groupChanged"><code>groupChanged</code></a> 이벤트가 발생합니다.',
          example: "grid.setGroupBy(['department', 'city']);",
        },
        {
          name: 'getGroupBy',
          group: 'Grouping',
          signature: 'getGroupBy(): string[]',
          since: '1.1.0',
          description: '현재 그룹핑 필드 목록(복사본)을 반환합니다.',
        },
        {
          name: 'expandAllGroups',
          group: 'Grouping',
          signature: 'expandAllGroups(): void',
          since: '1.1.0',
          description:
            '모든 그룹을 펼칩니다. <code>collapseAllGroups()</code>는 모든 그룹을 접습니다.',
        },

        /* ---- 페이지네이션 ---- */
        {
          name: 'setPage',
          group: 'Pagination',
          signature: 'setPage(page: number): void',
          description: '0부터 시작하는 페이지 번호로 이동합니다. 범위를 벗어나면 자동 보정됩니다.',
        },
        {
          name: 'setPageSize',
          group: 'Pagination',
          signature: 'setPageSize(size: number): void',
          description: '페이지 크기를 변경합니다. 현재 보고 있던 첫 행이 포함된 페이지로 이동합니다.',
        },

        /* ---- 마스터-디테일 ---- */
        {
          name: 'expandRow',
          group: 'Master-Detail',
          signature: 'expandRow(row: object): boolean',
          since: '1.2.0',
          description:
            '행의 디테일 패널을 펼치고 <code>rowExpanded</code>를 발생시킵니다. ' +
            '<code>collapseRow(row)</code>는 접고 <code>rowCollapsed</code>를 발생, ' +
            '<code>toggleRowDetail(row)</code>는 토글, <code>isRowExpanded(row)</code>는 상태 조회. ' +
            '<code>rowDetail</code> 옵션이 없거나 이미 해당 상태면 <code>false</code>를 반환합니다.',
        },

        /* ---- 셀 선택 · 검색 ---- */
        {
          name: 'getCellRange',
          group: 'Selection',
          signature: 'getCellRange(): CellRange | null',
          since: '1.2.0',
          description:
            '현재 셀/블록 범위를 반환합니다(<code>cellSelection: true</code> 필요): ' +
            '<code>{ startRow, endRow, startCol, endCol, columns, fields, rows }</code> — ' +
            '좌표는 페이지 뷰 기준으로 정규화되고 <code>rows</code>는 범위의 리프 행 객체입니다. ' +
            '<code>clearCellRange()</code>로 해제합니다.',
        },
        {
          name: 'findNext',
          group: 'Selection',
          signature: 'findNext(text: string): { data, field, rowIndex } | null',
          since: '1.2.0',
          description:
            '현재 뷰(표시 순서)에서 <code>text</code>를 포함하는 다음 셀을 찾아 페이지 이동·스크롤·포커스합니다. ' +
            '같은 텍스트로 다시 호출하면 다음 매치로 이어지고 끝에서 처음으로 순환합니다. ' +
            '퀵 필터와 달리 행을 걸러내지 않고 탐색만 합니다. 매치가 없으면 <code>null</code>.',
          example:
            "searchBtn.onclick = function () { grid.findNext(input.value); };",
        },

        /* ---- 변경 추적 ---- */
        {
          name: 'getChanges',
          group: 'Change Tracking',
          signature: 'getChanges(): { added: object[], updated: object[], deleted: object[] }',
          since: '1.2.0',
          description:
            '기준선 이후 추가/수정/삭제된 행 목록을 반환합니다(<code>trackChanges: true</code> 필요). ' +
            '추가했다가 삭제한 행은 흔적이 남지 않고, 수정 후 삭제한 행은 <code>deleted</code>에만 나타납니다. ' +
            '서버 저장 페이로드로 사용하세요.',
          example:
            'var ch = grid.getChanges();\n' +
            "fetch('/api/save', { method: 'POST', body: JSON.stringify(ch) })\n" +
            '  .then(function () { grid.commitChanges(); });',
        },
        {
          name: 'isDirty',
          group: 'Change Tracking',
          signature: 'isDirty(): boolean',
          since: '1.2.0',
          description: '기준선 이후 변경이 하나라도 있는지 반환합니다.',
        },
        {
          name: 'commitChanges',
          group: 'Change Tracking',
          signature: 'commitChanges(): void',
          since: '1.2.0',
          description:
            '현재 상태를 새 기준선으로 확정합니다 — 변경 목록과 dirty 표시가 초기화됩니다. ' +
            '서버 저장이 성공한 뒤 호출하세요.',
        },
        {
          name: 'rollbackChanges',
          group: 'Change Tracking',
          signature: 'rollbackChanges(): void',
          since: '1.2.0',
          description:
            '모든 변경을 기준선으로 되돌립니다: 수정 값 원복, 추가 행 제거, 삭제 행을 원래 위치에 복원. ' +
            'undo/redo 스택도 함께 비워집니다(롤백을 가로지르는 undo는 지원하지 않음).',
        },
        {
          name: 'undo',
          group: 'Change Tracking',
          signature: 'undo(): boolean',
          since: '1.2.0',
          description:
            '마지막 변경(셀 수정·행 추가·행 삭제)을 되돌립니다(<code>undoRedo: true</code> 필요). ' +
            '되돌릴 것이 없으면 <code>false</code>. <kbd>Ctrl/⌘+Z</kbd>와 동일합니다. ' +
            '<code>redo()</code>는 반대로 다시 적용하며 <kbd>Ctrl/⌘+Y</kbd>와 동일합니다. ' +
            '<code>canUndo()</code> / <code>canRedo()</code>로 버튼 상태를 동기화하세요.',
        },

        /* ---- 탐색 ---- */
        {
          name: 'focusCell',
          group: 'Navigation',
          signature: 'focusCell(rowIndex: number, field?: string): boolean',
          since: '1.1.0',
          description:
            '표시 리스트(그룹 헤더 행 포함) 기준 <code>rowIndex</code>의 셀에 포커스를 줍니다. ' +
            '다른 페이지에 있으면 페이지를 이동하고, 세로·가로 스크롤로 셀을 보이게 만듭니다. ' +
            '<code>field</code> 생략 시 첫 번째 콘텐츠 컬럼. 범위 밖이거나 컬럼이 없으면 <code>false</code>.',
          example: "grid.focusCell(137, 'salary');",
        },
        {
          name: 'ensureRowVisible',
          group: 'Navigation',
          signature: 'ensureRowVisible(row: object): boolean',
          since: '1.1.0',
          description:
            '행 객체가 화면에 보이도록 페이지 이동 + 세로 스크롤합니다. ' +
            '행이 현재 뷰에 없으면(필터로 제외, 접힌 그룹 안 등) <code>false</code>.',
          example: 'grid.ensureRowVisible(grid.getSelectedRows()[0]);',
        },
        {
          name: 'ensureColumnVisible',
          group: 'Navigation',
          signature: 'ensureColumnVisible(colId: string): boolean',
          since: '1.1.0',
          description:
            '컬럼이 고정(pinned) 컬럼에 가리지 않고 보이도록 가로 스크롤합니다. ' +
            '<code>colId</code> 또는 <code>field</code>로 찾으며, 고정 컬럼은 항상 보이므로 바로 <code>true</code>를 반환합니다.',
        },

        /* ---- 상태 저장/복원 ---- */
        {
          name: 'getState',
          group: 'State',
          signature: 'getState(): GridState',
          since: '1.1.0',
          description:
            '현재 그리드 상태를 JSON 직렬화 가능한 객체로 반환합니다: 컬럼 순서·숨김·사용자 지정 폭' +
            '(<code>columns: [{ colId, hide, width? }]</code>), <code>sortModel</code>, <code>filterModel</code>, ' +
            '<code>quickFilter</code>, <code>groupBy</code>, 페이지네이션 사용 시 <code>pagination: { page, pageSize }</code>. ' +
            'localStorage 등에 저장했다가 <code>setState()</code>로 복원하세요.',
          example:
            "localStorage.setItem('grid-state', JSON.stringify(grid.getState()));",
        },
        {
          name: 'setState',
          group: 'State',
          signature: 'setState(state: GridState): void',
          since: '1.1.0',
          description:
            '<code>getState()</code>가 반환한 상태를 복원합니다. 상태 객체에 포함된 부분만 적용하므로 ' +
            '<code>setState({ sortModel: [...] })</code>처럼 부분 상태도 허용됩니다. ' +
            '알 수 없는 <code>colId</code>는 무시되고, 상태에 없는 컬럼은 원래 상대 순서를 유지합니다. ' +
            '적용 후 <code>stateChanged</code> 이벤트가 발생합니다.',
          example:
            "var saved = localStorage.getItem('grid-state');\n" +
            'if (saved) grid.setState(JSON.parse(saved));',
        },
        {
          name: 'resetState',
          group: 'State',
          signature: 'resetState(parts?: { filter?, sort?, group?, columns?, page? }): void',
          since: '1.1.0',
          description:
            '상태를 <strong>생성 시점 옵션 기준</strong>으로 되돌립니다. 인자가 없으면 전체 리셋, ' +
            '<code>{ sort: true }</code>처럼 넘기면 해당 부분만 리셋합니다. ' +
            '<code>columns</code>는 순서·숨김·폭을 <code>columnDefs</code> 정의대로 재정규화합니다.',
          example: 'grid.resetState({ filter: true, sort: true });',
        },

        /* ---- 컬럼 ---- */
        {
          name: 'setColumnVisible',
          group: 'Columns',
          signature: 'setColumnVisible(colId: string, visible: boolean): void',
          description: '컬럼을 표시하거나 숨깁니다. <code>colId</code> 또는 <code>field</code>로 찾습니다.',
        },
        {
          name: 'getColumns',
          group: 'Columns',
          signature: 'getColumns(): ColumnDef[]',
          description: '정규화된 컬럼 정의 배열을 반환합니다(현재 순서 반영).',
        },
        {
          name: 'autoSizeColumn',
          group: 'Columns',
          signature: 'autoSizeColumn(colId: string): void',
          description:
            '헤더와 값 샘플(최대 200행)의 텍스트 폭을 측정해 컬럼 폭을 맞춥니다. ' +
            '헤더 리사이즈 핸들 더블클릭과 동일합니다.',
        },

        /* ---- 내보내기 ---- */
        {
          name: 'getCsv',
          group: 'Export',
          signature: 'getCsv(): string',
          description:
            '필터·정렬이 적용된 현재 뷰 전체를 CSV 문자열로 반환합니다. ' +
            '<code>valueFormatter</code>가 적용되고 RFC 4180 규칙으로 이스케이프됩니다.',
        },
        {
          name: 'exportCsv',
          group: 'Export',
          signature: "exportCsv(filename?: string): void",
          description:
            '<code>getCsv()</code> 결과를 UTF-8(BOM 포함) 파일로 다운로드합니다. 기본 파일명은 <code>export.csv</code>.',
        },
        {
          name: 'exportExcel',
          group: 'Export',
          signature: "exportExcel(filename?: string, sheetName?: string): void",
          since: '1.2.0',
          description:
            '필터·정렬이 적용된 현재 뷰를 <strong>.xlsx</strong> 파일로 다운로드합니다 — ' +
            '의존성 없이 무압축 ZIP + SpreadsheetML로 생성합니다. ' +
            '<code>valueFormatter</code>/<code>exportFormatter</code>가 없는 숫자는 숫자 셀로 나가 ' +
            '엑셀에서 바로 계산할 수 있습니다. <code>beforeExport</code>로 취소/가공 가능. ' +
            '기본 파일명 <code>export.xlsx</code>, 시트명 <code>Data</code>.',
          example: "grid.exportExcel('orders.xlsx', 'Orders');",
        },
        {
          name: 'getJson',
          group: 'Export',
          signature: 'getJson(): string',
          since: '1.1.0',
          description:
            '필터·정렬이 적용된 현재 뷰 전체를 JSON 문자열(객체 배열)로 반환합니다. ' +
            '표시 중인 컬럼의 <code>field</code>만 포함하며 값은 원시 데이터입니다(포매터 미적용 — ' +
            '<code>getCsv()</code>와 달리 데이터 왕복이 목적).',
          example: 'var rows = JSON.parse(grid.getJson());',
        },

        /* ---- 표시 ---- */
        {
          name: 'showLoadingOverlay',
          group: 'Display',
          signature: 'showLoadingOverlay(): void',
          description:
            '로딩 스피너 오버레이를 표시합니다. <code>hideLoadingOverlay()</code>로 해제합니다. ' +
            '행이 0개면 "No rows to show" 빈 상태가 자동 표시됩니다.',
        },
        {
          name: 'setTheme',
          group: 'Display',
          signature: "setTheme(theme: 'light' | 'dark'): void",
          description: '라이트/다크 테마를 전환합니다.',
        },
        {
          name: 'refresh',
          group: 'Display',
          signature: 'refresh(): void',
          description:
            '뷰 파이프라인(필터 → 퀵 필터 → 정렬 → 페이지)을 다시 계산하고 전체를 다시 렌더링합니다. ' +
            '행 객체를 외부에서 직접 수정한 뒤 호출하세요.',
        },
        {
          name: 'refreshCell',
          group: 'Display',
          signature: 'refreshCell(row: object, field: string): boolean',
          since: '1.2.0',
          description:
            '뷰 재계산 없이 렌더된 셀 하나만 다시 그립니다(값을 외부에서 바꾼 뒤 실시간 갱신용 — ' +
            '정렬/필터 위치는 다음 <code>refresh()</code>까지 유지). 행이 화면 밖이면 <code>false</code>. ' +
            '<code>refreshRow(row)</code>는 행 전체, <code>refreshColumn(colId)</code>는 렌더된 모든 행의 ' +
            '해당 컬럼 셀을 다시 그립니다.',
          example:
            'row.price = tick.price;\n' +
            "grid.refreshCell(row, 'price');",
        },
        {
          name: 'setOptions',
          group: 'Display',
          signature: 'setOptions(patch: object): void',
          since: '1.2.0',
          description:
            '그리드를 재생성하지 않고 옵션을 갱신합니다. <code>title</code>·<code>toolbar</code>·' +
            '<code>theme</code>·<code>zebra</code>·<code>rowHeight</code>/<code>headerHeight</code>·' +
            '<code>editable</code>·<code>sortModel</code>·<code>groupBy</code>·<code>pagination</code>(패널 생성/제거)·' +
            '<code>paginationPageSize</code>·<code>columnDefs</code>(컬럼 재구성·사용자 폭 초기화) 등 ' +
            '렌더 파이프라인이 읽는 값 전반을 지원하며 마지막에 <code>refresh()</code>를 1회 수행합니다.',
          example: "grid.setOptions({ rowHeight: 32, zebra: true, title: '요약 보기' });",
        },
        {
          name: 'destroy',
          group: 'Display',
          signature: 'destroy(): void',
          description:
            '그리드 DOM과 document 레벨 이벤트 리스너를 모두 제거합니다. 이후의 API 호출은 무시됩니다.',
        },

        /* ---- 유틸리티 (정적) ---- */
        {
          name: 'format',
          group: 'Utility',
          signature: 'DataGrid.format(value: any, pattern: string): string',
          since: '1.1.0',
          description:
            '<code>column.format</code>과 동일한 선언적 포맷을 아무 값에나 적용하는 <strong>정적</strong> 유틸입니다. ' +
            '패턴에 <code>#</code>/<code>0</code>이 있으면 숫자 마스크, 아니면 날짜 패턴으로 해석합니다. ' +
            '빈 값(null/undefined/\'\')은 빈 문자열, 해석 불가 값은 원본 문자열을 반환합니다.',
          example:
            "DataGrid.format(1234567.891, '#,##0.00')        // '1,234,567.89'\n" +
            "DataGrid.format(-1234.5, '$#,##0.00')           // '-$1,234.50'\n" +
            "DataGrid.format('2026-07-31', 'yyyy년 MM월 dd일') // '2026년 07월 31일'",
        },

        /* ---- 이벤트 ---- */
        {
          name: 'on',
          group: 'Events',
          signature: 'on(eventName: string, handler: (e) => void): this',
          description:
            '이벤트 핸들러를 등록합니다. <code>off(eventName, handler)</code>로 해제합니다. ' +
            '이벤트 목록은 <a href="#events">Events</a> 섹션 참고.',
        },
      ],
    },

    /* =========================================================================
     * Events
     * ======================================================================= */
    {
      id: 'events',
      title: 'Events',
      kind: 'events',
      intro:
        '<p><code>grid.on(name, handler)</code>로 구독합니다. ' +
        '핸들러에서 발생한 예외는 그리드 동작을 막지 않고 콘솔에 기록됩니다.</p>',
      entries: [
        {
          name: 'selectionChanged',
          payload: '{ selectedRows: object[] }',
          description: '행 선택이 바뀔 때(클릭, 체크박스, 전체 선택, API 호출).',
          example:
            "grid.on('selectionChanged', function (e) {\n" +
            "  console.log(e.selectedRows.length + ' rows selected');\n" +
            '});',
        },
        {
          name: 'cellValueChanged',
          payload: '{ data, colDef, oldValue, newValue }',
          description: '인라인 편집이 커밋되어 값이 실제로 바뀌었을 때. 서버 저장 훅으로 사용하세요.',
        },
        {
          name: 'editingStarted',
          payload: '{ data, colDef, value }',
          since: '1.1.0',
          description: '인라인 편집이 시작될 때 (더블클릭·<kbd>Enter</kbd>·<code>startEdit()</code> 모두).',
        },
        {
          name: 'editingStopped',
          payload: '{ data, colDef, oldValue, newValue, committed }',
          since: '1.1.0',
          description:
            '편집기가 닫힐 때. <code>committed</code>가 <code>true</code>면 값이 저장된 것이고, ' +
            '<code>false</code>면 취소되었거나 값이 바뀌지 않은 것입니다(<code>newValue</code>는 이때 이전 값).',
        },
        {
          name: 'beforeCellSave',
          payload: '{ data, colDef, oldValue, newValue, cancel }',
          since: '1.1.0',
          description:
            '<strong>취소 가능 이벤트</strong> — 검증 통과 후, 값이 저장되기 직전에 발생합니다. ' +
            '핸들러에서 <code>e.cancel = true</code>를 설정하면 저장이 거부되고 편집기가 유지됩니다. ' +
            '<code>e.newValue</code>를 수정하면 그 값으로 저장됩니다(정규화 훅).',
          example:
            "grid.on('beforeCellSave', function (e) {\n" +
            "  if (e.colDef.field === 'salary' && e.newValue > 900000) e.cancel = true;\n" +
            '});',
        },
        {
          name: 'sortChanged',
          payload: '{ sortModel: { field, dir }[] }',
          description: '정렬 상태가 바뀔 때(헤더 클릭 또는 <code>setSortModel</code>).',
        },
        {
          name: 'filterChanged',
          payload: '{ filterModel, quickFilter? }',
          description: '컬럼 필터 또는 퀵 필터가 바뀔 때.',
        },
        {
          name: 'paginationChanged',
          payload: '{ page, pageSize }',
          description: '페이지 이동 또는 페이지 크기 변경 시.',
        },
        {
          name: 'groupChanged',
          payload: '{ groupBy: string[] }',
          since: '1.1.0',
          description: '<code>setGroupBy()</code>로 그룹핑 필드가 바뀌었을 때.',
        },
        {
          name: 'groupToggled',
          payload: '{ field, value, path, expanded }',
          since: '1.1.0',
          description:
            '그룹 헤더 행이 접히거나 펼쳐졌을 때. <code>path</code>는 중첩 그룹까지 포함한 그룹 고유 경로입니다.',
        },
        {
          name: 'rowClicked',
          payload: '{ data, rowIndex }',
          description: '행 클릭 시. <code>rowIndex</code>는 현재 페이지 기준 인덱스입니다.',
        },
        {
          name: 'rowDoubleClicked',
          payload: '{ data, rowIndex }',
          description: '행 더블클릭 시(편집 시작 여부와 무관하게 발생).',
        },
        {
          name: 'cellDoubleClicked',
          payload: '{ data, colDef, value, rowIndex }',
          since: '1.1.0',
          description:
            '셀 더블클릭 시(그룹 헤더 행 제외). <code>rowDoubleClicked</code>보다 먼저 발생하며, ' +
            '편집 가능 셀이면 이어서 인라인 편집이 시작됩니다.',
        },
        {
          name: 'cellClicked',
          payload: '{ data, colDef, value }',
          description: '셀 클릭 시. <code>rowClicked</code>보다 먼저 발생합니다.',
        },
        {
          name: 'columnResized',
          payload: '{ colId, width }',
          description: '드래그 리사이즈가 끝났을 때.',
        },
        {
          name: 'columnMoved',
          payload: '{ colId, toIndex }',
          description: '헤더 드래그로 컬럼 순서가 바뀌었을 때.',
        },
        {
          name: 'stateChanged',
          payload: '{ state: GridState }',
          since: '1.1.0',
          description:
            '<code>setState()</code> 또는 <code>resetState()</code>로 상태가 복원/리셋되었을 때. ' +
            '<code>state</code>는 적용 후의 <code>getState()</code> 결과입니다.',
        },
        {
          name: 'cellRangeChanged',
          payload: '{ range: CellRange | null }',
          since: '1.2.0',
          description:
            '셀/블록 범위가 바뀔 때(드래그 중 계속). <code>range</code>는 <code>getCellRange()</code> 결과와 같습니다.',
        },
        {
          name: 'fillApplied',
          payload: '{ updatedCells }',
          since: '2.0.0',
          description: '채우기 핸들 드래그가 끝나 셀이 채워졌을 때. 셀별로는 <code>cellValueChanged</code>도 발생합니다.',
        },
        {
          name: 'cellContextMenu',
          payload: '{ data, colDef, value, rowIndex, originalEvent }',
          since: '1.2.0',
          description:
            '셀 우클릭 시. 그리드는 기본 메뉴를 막지 않으므로 커스텀 메뉴를 띄우려면 ' +
            '<code>e.originalEvent.preventDefault()</code> 후 직접 구현하세요.',
        },
        {
          name: 'headerClicked',
          payload: '{ colDef }',
          since: '1.2.0',
          description:
            '헤더 셀 클릭 시(리사이저·필터 메뉴 버튼 제외). 정렬 동작과 별개로 함께 발생합니다.',
        },
        {
          name: 'cellKeyDown',
          payload: '{ data, colDef, rowIndex, originalEvent }',
          since: '1.2.0',
          description:
            '셀에 포커스가 있는 상태의 키 입력(편집 중 제외). 그리드 자체 키 처리(화살표·Enter 등)보다 먼저 발생합니다.',
        },
        {
          name: 'beforeExport',
          payload: '{ format, filename, rows, columns, cancel }',
          since: '1.2.0',
          description:
            '<code>exportCsv()</code>/<code>exportExcel()</code>이 파일을 만들기 직전. ' +
            '<code>e.cancel = true</code>로 취소하거나 <code>e.rows</code>/<code>e.columns</code>/' +
            '<code>e.filename</code>을 바꿔 내보낼 내용을 가공할 수 있습니다. ' +
            '<code>format</code>은 <code>\'csv\'</code> 또는 <code>\'xlsx\'</code>.',
          example:
            "grid.on('beforeExport', function (e) {\n" +
            "  e.rows = e.rows.filter(function (r) { return r.active; });\n" +
            '});',
        },
        {
          name: 'rowExpanded',
          payload: '{ data }',
          since: '1.2.0',
          description:
            '디테일 패널이 펼쳐질 때(셰브론 클릭·<code>expandRow()</code>). ' +
            '접힐 때는 <code>rowCollapsed</code>가 발생합니다.',
        },
        {
          name: 'dataLoadError',
          payload: '{ error }',
          since: '1.2.0',
          description:
            '<code>dataSource</code> 로드가 실패했을 때(네트워크 오류, HTTP 에러 상태). ' +
            '콘솔에도 기록되며 기존 행은 유지됩니다.',
        },
        {
          name: 'gridReady',
          payload: '{ rowCount }',
          since: '1.1.0',
          description:
            '초기 렌더링이 끝난 뒤 <strong>1회</strong> 발생합니다. 생성자 반환 직후 등록한 핸들러도 ' +
            '받을 수 있도록 비동기(다음 태스크)로 발생합니다.',
          example:
            "grid.on('gridReady', function (e) { console.log(e.rowCount + ' rows ready'); });",
        },
        {
          name: 'dataChanged',
          payload: '{ rowCount }',
          since: '1.1.0',
          description:
            '행 데이터 집합이 바뀌었을 때 — <code>setRowData</code> / <code>addRow(s)</code> / ' +
            '<code>removeRows</code> / <code>updateRow</code>. 개별 셀 편집은 대신 ' +
            '<code>cellValueChanged</code>가 발생합니다.',
        },
        {
          name: 'viewRendered',
          payload: '{ displayedRowCount, page }',
          since: '1.1.0',
          description:
            '<code>refresh()</code>가 끝날 때마다(정렬·필터·페이지 이동·데이터 변경 등 모든 전체 렌더 후) 발생합니다. ' +
            '자주 발생하므로 무거운 작업은 피하세요.',
        },
        {
          name: 'beforeSort',
          payload: '{ sortModel, cancel }',
          since: '1.1.0',
          description:
            '정렬이 적용되기 직전(헤더 클릭·<code>setSortModel()</code> 모두). ' +
            '<code>e.sortModel</code>은 적용될 제안 모델이며 핸들러에서 수정할 수 있고, ' +
            '<code>e.cancel = true</code>면 정렬이 적용되지 않습니다.',
          example:
            "grid.on('beforeSort', function (e) {\n" +
            "  if (locked) e.cancel = true;\n" +
            '});',
        },
        {
          name: 'beforeSelectionChange',
          payload: '{ selectedRows, cancel }',
          since: '1.1.0',
          description:
            '행 선택이 바뀌기 직전(클릭·체크박스·전체 선택·<kbd>Space</kbd>·API 모두). ' +
            '<code>e.selectedRows</code>는 적용될 선택 결과이며, <code>e.cancel = true</code>면 선택이 유지됩니다.',
        },
      ],
    },

    /* =========================================================================
     * Built-in Renderers
     * ======================================================================= */
    {
      id: 'renderers',
      title: 'Built-in Renderers',
      kind: 'methods',
      intro:
        '<p><code>DataGrid.renderers</code>의 팩토리 함수들입니다. ' +
        '호출 결과를 <code>cellRenderer</code>에 그대로 넘깁니다.</p>',
      entries: [
        {
          name: 'tag',
          signature: 'DataGrid.renderers.tag(colorMap: { [value]: color })',
          description:
            '값을 색상 배지로 표시합니다. <code>color</code>: <code>green</code> · <code>red</code> · ' +
            '<code>blue</code> · <code>yellow</code> · <code>gray</code>(기본). 값은 HTML 이스케이프됩니다.',
          example:
            "cellRenderer: DataGrid.renderers.tag({\n" +
            "  'Active': 'green', 'On Leave': 'yellow', 'Contract': 'blue', 'Inactive': 'gray',\n" +
            '})',
        },
        {
          name: 'check',
          signature: 'DataGrid.renderers.check()',
          description: '불리언 값을 ✓ / – 로 표시합니다.',
          example: 'cellRenderer: DataGrid.renderers.check()',
        },
        {
          name: 'progress',
          signature: 'DataGrid.renderers.progress()',
          description: '0–100 값을 진행 바와 퍼센트 라벨로 표시합니다(범위 밖 값은 잘림).',
          example: 'cellRenderer: DataGrid.renderers.progress()',
        },
      ],
    },

    /* =========================================================================
     * Theming
     * ======================================================================= */
    {
      id: 'theming',
      title: 'Theming (CSS Tokens)',
      kind: 'tokens',
      intro:
        '<p>모든 색·크기는 <code>.dg-root</code>에 선언된 CSS 커스텀 프로퍼티에서 나옵니다. ' +
        '자신의 클래스에서 토큰을 덮어쓰면 JS 수정 없이 테마를 바꿀 수 있습니다. ' +
        '다크 모드는 <code>dg-theme-dark</code> 클래스(또는 <code>setTheme(\'dark\')</code>)가 전체 토큰을 재정의합니다.</p>' +
        '<pre class="api-example"><code>.my-theme.dg-root {\n' +
        '  --dg-accent-color: #7c3aed;\n' +
        '  --dg-row-height: 36px;\n' +
        '  --dg-header-background-color: #faf5ff;\n' +
        '}</code></pre>',
      entries: [
        { name: '--dg-font-family', default: 'Inter, system stack', description: '그리드 전체 글꼴.' },
        { name: '--dg-font-size', default: '14px', description: '기본 글자 크기.' },
        { name: '--dg-background-color', default: '#ffffff', description: '그리드 배경.' },
        { name: '--dg-foreground-color', default: '#181d1f', description: '기본 글자색.' },
        { name: '--dg-secondary-foreground-color', default: 'rgba(24,29,31,.62)', description: '보조 텍스트(요약, 라벨).' },
        { name: '--dg-border-color', default: '#dde2eb', description: '외곽·헤더 경계선.' },
        { name: '--dg-row-border-color', default: '#eff1f6', description: '행 사이 경계선.' },
        { name: '--dg-header-background-color', default: '#f8f9fb', description: '헤더 배경.' },
        { name: '--dg-accent-color', default: '#2196f3', description: '포커스·선택·정렬 아이콘·주요 버튼 색.' },
        { name: '--dg-row-hover-color', default: 'rgba(33,150,243,.08)', description: '행 호버 배경.' },
        { name: '--dg-selected-row-background-color', default: 'rgba(33,150,243,.12)', description: '선택된 행 배경.' },
        { name: '--dg-odd-row-background-color', default: '#fcfdfe', description: 'zebra 홀수 행 배경.' },
        { name: '--dg-chip-background-color', default: '#eef1f5', description: '태그 기본 배경, 버튼 호버.' },
        { name: '--dg-input-background-color', default: '#ffffff', description: '에디터·필터 입력 배경.' },
        { name: '--dg-input-border-color', default: '#c2c8d0', description: '입력·체크박스 테두리.' },
        { name: '--dg-menu-background-color', default: '#ffffff', description: '필터 메뉴 팝업 배경.' },
        { name: '--dg-invalid-color', default: '#e02525', description: '오류 표시용(예약).' },
        { name: '--dg-group-row-background-color', default: '#f3f6fa', description: '그룹 헤더 행 배경.', since: '1.1.0' },
        { name: '--dg-group-indent', default: '20px', description: '중첩 그룹 레벨당 들여쓰기 폭.', since: '1.1.0' },
        { name: '--dg-floating-filter-height', default: '36px', description: '헤더 필터 행(floatingFilter) 높이.', since: '1.1.0' },
        { name: '--dg-header-height', default: '48px', description: '헤더 높이 — JS 옵션 headerHeight로 설정하세요.' },
        { name: '--dg-row-height', default: '42px', description: '행 높이 — JS 옵션 rowHeight로 설정하세요(가상 스크롤 계산에 사용).' },
        { name: '--dg-cell-horizontal-padding', default: '16px', description: '셀 좌우 패딩.' },
        { name: '--dg-wrapper-border-radius', default: '8px', description: '그리드 외곽 모서리.' },
        { name: '--dg-border-radius', default: '4px', description: '버튼·입력·체크박스 모서리.' },
      ],
    },

    /* =========================================================================
     * Keyboard Shortcuts
     * ======================================================================= */
    {
      id: 'keyboard',
      title: 'Keyboard',
      kind: 'guide',
      intro:
        '<p>셀을 클릭해 포커스한 뒤 사용할 수 있는 키보드 조작입니다.</p>' +
        '<table class="api-table"><thead><tr><th>키</th><th>동작</th></tr></thead><tbody>' +
        '<tr><td><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></td><td>셀 포커스 이동(스크롤 자동 추적)</td></tr>' +
        '<tr><td><kbd>Enter</kbd></td><td>편집 가능한 셀에서 편집 시작 / 편집 중 커밋</td></tr>' +
        '<tr><td><kbd>Esc</kbd></td><td>편집 취소</td></tr>' +
        '<tr><td><kbd>Space</kbd></td><td>포커스된 행 선택 토글</td></tr>' +
        '<tr><td><kbd>Ctrl/⌘</kbd>+<kbd>C</kbd></td><td>선택 행(없으면 포커스 셀)을 TSV로 복사 — <code>suppressCopy</code> 컬럼 제외</td></tr>' +
        '<tr><td><kbd>Ctrl/⌘</kbd>+<kbd>V</kbd></td><td>포커스 셀부터 TSV 붙여넣기 — 편집 가능 + 검증 통과 셀만</td></tr>' +
        '<tr><td><kbd>Shift</kbd>+클릭</td><td>범위 선택(multiple) / 헤더에서 다중 정렬 추가</td></tr>' +
        '<tr><td><kbd>Ctrl/⌘</kbd>+클릭</td><td>개별 선택 토글(multiple)</td></tr>' +
        '</tbody></table>',
      entries: [],
    },
  ],
};
