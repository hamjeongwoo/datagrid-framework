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
 *   demo        : examples/features.html의 데모 카드 앵커 id (있으면 "예제 ↗"
 *                 링크 배지 표시 — 앵커는 features.html의 <h2 class="section" id>)
 * ============================================================================= */
window.ApiDocs = {
  library: 'DataGrid',
  version: '2.5.0',
  updated: '2026-08-01',

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
          demo: 'row-selection',
          type: "'single' | 'multiple'",
          default: 'undefined (선택 비활성)',
          description:
            '행 선택 모드. <code>\'multiple\'</code>이면 Ctrl/⌘+클릭 토글, Shift+클릭 범위 선택, ' +
            '체크박스 컬럼(<code>checkboxSelection</code>)과 헤더 전체 선택을 사용할 수 있습니다.',
        },
        {
          name: 'pagination',
          demo: 'pagination',
          type: 'boolean',
          default: 'false',
          description:
            '페이지네이션 패널을 표시합니다. 끄면 전체 데이터가 가상 스크롤로 렌더링됩니다.',
        },
        {
          name: 'paginationPageSize',
          demo: 'pagination',
          type: 'number',
          default: '20',
          description: '페이지당 행 수.',
        },
        {
          name: 'paginationPageSizeOptions',
          demo: 'pagination',
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
          demo: 'sorting',
          type: '{ field, dir }[]',
          description:
            '초기 정렬 상태. <code>dir</code>은 <code>\'asc\'</code> 또는 <code>\'desc\'</code>. ' +
            '배열 순서가 다중 정렬 우선순위입니다.',
          example:
            "sortModel: [{ field: 'department', dir: 'asc' }, { field: 'salary', dir: 'desc' }]",
        },
        {
          name: 'getRowId',
          demo: 'row-data-api',
          type: '(row) => string',
          description:
            '행 식별자 함수. 생략하면 행 객체별 내부 id가 자동 발급됩니다. ' +
            '데이터를 통째로 교체하면서 선택 상태를 유지해야 할 때 지정하세요.',
          example: 'getRowId: function (row) { return row.employeeId; }',
        },
        {
          name: 'columnReorder',
          demo: 'column-pinning-resize-reorder',
          type: 'boolean',
          default: 'true',
          description:
            '헤더 드래그로 컬럼 순서 변경을 허용합니다. 고정(pinned) 컬럼은 드래그 대상에서 제외됩니다.',
        },
        {
          name: 'floatingFilter',
          demo: 'floating-filter',
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
          demo: 'row-grouping',
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
          demo: 'row-grouping',
          type: 'boolean',
          default: 'true',
          since: '1.1.0',
          description:
            '그룹의 초기 펼침 상태. <code>false</code>면 모든 그룹이 접힌 채 시작합니다.',
        },
        {
          name: 'grandTotal',
          demo: 'row-grouping',
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
          demo: 'continuous-editing-custom-editor',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '클릭 한 번으로 편집을 시작합니다(기본은 더블클릭 또는 <kbd>Enter</kbd>). ' +
            '체크박스 클릭은 제외됩니다.',
        },
        {
          name: 'enterMovesDown',
          demo: 'continuous-editing-custom-editor',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '편집 중 <kbd>Enter</kbd>로 커밋하면 같은 컬럼의 아래 행에서 편집을 이어갑니다(연속 편집). ' +
            '그룹 헤더 행은 건너뛰고, 검증 실패로 커밋되지 않으면 이동하지 않습니다.',
        },
        {
          name: 'tabMovesRight',
          demo: 'continuous-editing-custom-editor',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '편집 중 <kbd>Tab</kbd>/<kbd>Shift+Tab</kbd>으로 커밋 후 오른쪽/왼쪽의 다음 편집 가능 셀로 이동합니다. ' +
            '행 끝에서는 다음/이전 행으로 감쌉니다.',
        },
        {
          name: 'title',
          demo: 'partial-refresh-options-toolbar',
          type: 'string',
          since: '1.2.0',
          description:
            '그리드 최상단에 타이틀 바를 표시합니다. <code>setOptions({ title })</code>로 런타임 변경.',
        },
        {
          name: 'toolbar',
          demo: 'partial-refresh-options-toolbar',
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
          demo: 'master-detail',
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
          demo: 'remote-data',
          type: '{ url, method?, params?, request?, parse?, headers? }',
          since: '1.2.0',
          description:
            '원격 데이터 소스. <code>fetch</code>로 <code>url</code>을 호출해 행을 불러옵니다. ' +
            '<code>method</code> 기본은 GET(파라미터를 쿼리스트링으로, POST면 JSON body로), ' +
            '<code>params</code>는 항상 포함할 고정 파라미터(객체 또는 함수), ' +
            '<code>request(state)</code>는 기본 파라미터 매핑을 서버 스펙으로 대체하는 훅(since 2.5.0), ' +
            '<code>parse(json)</code>은 응답을 <code>{ rows, total }</code>로 바꾸는 훅' +
            '(기본: 배열 또는 <code>{ rows, total }</code> 그대로), ' +
            '<code>headers</code>는 인증 토큰 등 요청 헤더(객체 또는 함수, since 2.5.0)입니다. ' +
            '로딩 중 오버레이가 표시되고 실패 시 <code>dataLoadError</code> 이벤트가 발생합니다. ' +
            '<code>reloadData()</code>로 다시 불러오고 <code>setDataSource()</code>로 교체합니다. ' +
            '<strong>단계별 레시피는 <a href="#remote-data-guide">Remote Data Source 가이드</a> 참고.</strong>',
          example:
            "dataSource: {\n" +
            "  url: '/api/employees',\n" +
            "  params: function () { return { token: auth.token }; },\n" +
            '},\n' +
            "sortMode: 'server', pageMode: 'server', pagination: true",
        },
        {
          name: 'sortMode',
          demo: 'remote-data',
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
          demo: 'column-groups',
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
          demo: 'cell-selection-find',
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
          name: 'showHeader',
          demo: 'headerless',
          type: 'boolean',
          default: 'true',
          since: '2.0.0',
          description:
            '<code>false</code>면 헤더 영역 전체(컬럼 그룹·정렬·필터 UI 포함)를 숨깁니다.',
        },
        {
          name: 'pinnedTopRows',
          demo: 'pinned-rows-wrap-text',
          type: 'object[]',
          since: '2.0.0',
          description:
            '헤더 아래에 스크롤과 무관하게 고정되는 행(요약·평균 등 표시 전용 — 정렬·필터·선택·편집 대상 아님). ' +
            '<code>valueFormatter</code>/<code>cellRenderer</code>는 동일하게 적용되고 가로 스크롤·컬럼 폭과 ' +
            '동기화됩니다. 런타임에는 <code>setPinnedTopRows(rows)</code> / <code>getPinnedTopRows()</code>.',
          example: "pinnedTopRows: [{ name: '― 평균', salary: 61200 }]",
        },
        {
          name: 'autoRowHeight',
          demo: 'pinned-rows-wrap-text',
          type: 'boolean',
          default: 'false',
          since: '2.0.0',
          description:
            '<code>wrapText</code> 컬럼의 텍스트 폭을 측정해 행 높이를 내용에 맞춰 계산합니다' +
            '(명시적 <code>\\n</code> 포함, 가변 높이 가상 스크롤에 정확히 반영). ' +
            '컬럼 리사이즈 직후에는 다음 <code>refresh()</code>에서 높이가 재계산됩니다.',
        },
        {
          name: 'domLayout',
          demo: 'auto-height',
          type: "'normal' | 'autoHeight'",
          default: "'normal'",
          since: '2.0.0',
          description:
            '<code>\'autoHeight\'</code>면 컨테이너 높이 대신 내용 높이만큼 그리드가 늘어납니다 — ' +
            '컨테이너에 높이를 지정할 필요가 없어지는 대신 <strong>세로 가상화가 비활성</strong>화되므로 ' +
            '소량 데이터(수십~수백 행) 전용입니다.',
        },
        {
          name: 'virtualX',
          demo: 'virtual-x',
          type: 'boolean',
          default: 'false',
          since: '2.0.0',
          description:
            '컬럼 가상화. 가로 뷰포트에 보이는 일반 컬럼(+양쪽 버퍼 2개)만 셀을 렌더링하고 ' +
            '창 밖 컬럼은 폭 스페이서로 대체합니다 — 수백 개 컬럼에서 행 DOM을 가볍게 유지합니다. ' +
            '고정(pinned) 컬럼은 항상 렌더링되고, 헤더는 전체를 렌더링합니다(1회성). ' +
            '가로 스크롤로 창이 바뀌면 보이는 행만 재구성됩니다.',
          example: 'virtualX: true  // 300+ 컬럼 시나리오',
        },
        {
          name: 'mergeCells',
          demo: 'merge-cells',
          type: 'string[]',
          since: '2.0.0',
          description:
            '지정한 필드들에서 표시 순서상 <strong>연속된 같은 값</strong>을 세로 병합으로 표현합니다 — ' +
            '병합 구간이 하나의 셀이 되어 값이 세로 중앙에 표시됩니다(엄격 비교 <code>===</code>). ' +
            '해당 컬럼으로 정렬하면 병합 묶음이 커지고, 그룹 헤더/디테일 행에서 병합이 끊깁니다. ' +
            '표시만 병합될 뿐 데이터는 그대로이므로 CSV/클립보드/편집에는 영향이 없습니다.',
          example: "mergeCells: ['product', 'status'],\nsortModel: [{ field: 'product', dir: 'asc' }]",
        },
        {
          name: 'treeData',
          demo: 'tree-grid',
          type: 'object',
          since: '2.1.0',
          description:
            '계층 데이터를 트리로 표시합니다. nested 형식(각 행의 <code>childrenField</code> 배열이 자식, 기본 ' +
            '<code>children</code>)과 flat 형식(<code>parentIdField</code> + <code>idField</code>로 계층 구성)을 ' +
            '모두 지원합니다. <code>treeField</code> 컬럼(생략 시 첫 데이터 컬럼)에 들여쓰기(<code>indent</code>px, 기본 20)와 ' +
            '펼침 토글이 그려지고, <code>defaultExpandLevel</code>(기본 0, <code>-1</code> = 전부) 깊이까지 펼친 채 시작합니다. ' +
            '정렬은 형제끼리, 필터는 매치된 노드의 조상을 유지하며 동작합니다(<code>filterKeepChildren: false</code>로 ' +
            '매치된 부모의 자손 표시를 끌 수 있음). <code>pagination</code>/<code>groupBy</code>와는 함께 쓸 수 없습니다. ' +
            '트리 모드에서 <code>checkboxSelection</code> 컬럼은 3상태 캐스케이드 체크박스가 됩니다 — ' +
            '부모 체크 시 자손 전체가 <strong>행 선택</strong>되고 자식 일부만 선택되면 부모가 ' +
            '<code>indeterminate</code>로 표시됩니다. <code>cascade</code>(기본 true)로 연동을 끄고 ' +
            '<code>checkboxDisabled(row)</code>로 조건부 비활성(캐스케이드 제외)을 제어하며, 조회/조작/이벤트는 ' +
            '선택 API(<code>getSelectedRows()</code>·<code>selectAll()/deselectAll()</code>·' +
            '<code>beforeSelectionChange</code>/<code>selectionChanged</code>)를 그대로 씁니다. ' +
            '<code>summary: true</code>는 <code>column.aggFunc</code> 컬럼에서 부모 행에 자손 리프 집계를 ' +
            '표시합니다(표시 전용, 필터 반영). <code>fetchChildren(row) =&gt; Promise</code>는 첫 펼침 때 자식을 ' +
            '비동기 로드합니다(nested 형식 전용, <code>hasChildren(row)</code>로 로드 전 토글 표시 결정, ' +
            '실패 시 <code>dataLoadError</code> 후 재시도 가능).',
          example:
            "treeData: {\n  treeField: 'name',\n  indent: 20,\n  defaultExpandLevel: 1,\n  cascade: true,   // checkboxSelection 컬럼과 함께 쓰면 3상태 캐스케이드\n  // flat 형식이면: parentIdField: 'parentId', idField: 'id'\n},\ncolumnDefs: [\n  { checkboxSelection: true, width: 44 },\n  { field: 'name', headerName: 'Name', flex: 1 },\n],",
        },
        {
          name: 'fillHandle',
          demo: 'fill-handle',
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
          demo: 'change-tracking',
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
          demo: 'change-tracking',
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
          demo: 'computed-columns-row-styling',
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
          demo: 'row-numbers-maxwidth-editable',
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
          demo: 'row-numbers-maxwidth-editable',
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
     * Remote Data Source 가이드
     * ======================================================================= */
    {
      id: 'remote-data-guide',
      title: 'Remote Data Source 가이드',
      kind: 'guide',
      intro:
        '<p><code>dataSource</code>는 실무에서 가장 많이 쓰는 축입니다. 이 섹션은 서버 연동의 전체 흐름을 ' +
        '단계별로 안내합니다 — 기본 스펙 그대로 붙는 경우부터, <strong>파라미터·응답·인증이 우리 스펙과 다른 ' +
        '서버에 맞추는 방법</strong>까지.</p>' +
        '<p><strong>동작 원리:</strong> <code>dataSource</code>가 있으면 그리드는 생성 직후 <code>fetch</code>로 ' +
        '데이터를 불러옵니다. <code>sortMode</code> / <code>filterMode</code> / <code>pageMode</code>가 ' +
        '<code>\'server\'</code>인 축은 클라이언트 처리를 건너뛰고, 그 축의 상태가 바뀔 때마다(정렬 클릭, ' +
        '필터 변경, 페이지 이동) 자동으로 다시 요청합니다. 그 외에는 <code>reloadData()</code>(수동 재조회)와 ' +
        '<code>setDataSource()</code>(소스 교체) 시점에 요청합니다. 응답 대기 중에는 로딩 오버레이가 표시되고, ' +
        '요청이 겹치면 마지막 요청만 반영됩니다.</p>' +
        '<p><strong>기본 요청 스펙</strong> — server 모드인 축의 상태가 다음 파라미터로 나갑니다 ' +
        '(GET이면 쿼리스트링, POST면 JSON body):</p>' +
        '<ul>' +
        '<li><code>page</code> · <code>pageSize</code> — <code>pageMode: \'server\'</code> + <code>pagination</code>일 때 (0부터 시작)</li>' +
        '<li><code>sort</code> — <code>sortMode: \'server\'</code>일 때, <code>[{ "field": "name", "dir": "asc" }]</code> JSON 문자열</li>' +
        '<li><code>filter</code> — <code>filterMode: \'server\'</code>일 때, 필터 모델 JSON 문자열 (구조는 Filter Model 섹션)</li>' +
        '<li><code>quickFilter</code> — <code>filterMode: \'server\'</code> + <code>setQuickFilter()</code> 텍스트</li>' +
        '</ul>' +
        '<p><strong>기본 응답 스펙</strong> — 배열(<code>[...]</code>) 또는 <code>{ rows: [...], total: n }</code>. ' +
        '<code>total</code>은 서버 페이징의 전체 행 수(페이지네이션 계산에 사용)입니다.</p>' +
        '<p>서버 스펙이 다르면 세 훅으로 맞춥니다: <code>request(state)</code>(요청 파라미터 커스텀), ' +
        '<code>parse(json)</code>(응답 변환), <code>headers</code>(인증 등 요청 헤더). ' +
        '아래 단계별 레시피와 <a href="../examples/features.html#remote-data-server-spec" target="_blank" rel="noopener">' +
        '서버 스펙 맞춤 데모</a>, <a href="../examples/features.html#remote-data" target="_blank" rel="noopener">기본 스펙 데모</a>를 참고하세요.</p>',
      entries: [
        {
          name: 'Step 1. 기본 스펙 그대로 연동',
          demo: 'remote-data',
          since: '1.2.0',
          description:
            '서버가 기본 요청/응답 스펙을 따르면 <code>url</code>만으로 붙습니다. server로 돌릴 축만 ' +
            '<code>\'server\'</code>로 지정하세요 — 세 축은 독립이라 "정렬·필터는 클라이언트, 페이징만 서버" ' +
            '같은 조합도 됩니다. POST 서버면 <code>method: \'POST\'</code> — 파라미터가 JSON body로 갑니다. ' +
            '이때 기본 매핑의 <code>sort</code>·<code>filter</code> 값은 GET과 동일한 <strong>JSON 문자열</strong>로 ' +
            'body에 들어갑니다(<code>{"sort":"[{\\"field\\":...}]"}</code> — 이중 인코딩). ' +
            '서버가 중첩 객체/배열을 기대하면 Step 3의 <code>request</code>로 직접 만드세요.',
          example:
            'var grid = new DataGrid(el, {\n' +
            "  dataSource: { url: '/api/employees' },   // GET, { rows, total } 응답\n" +
            "  sortMode: 'server',    // 정렬 클릭 → sort 파라미터로 재조회\n" +
            "  filterMode: 'server',  // 필터/quickFilter → filter·quickFilter 파라미터\n" +
            "  pageMode: 'server',    // 페이지 이동 → page·pageSize 파라미터\n" +
            '  pagination: true,\n' +
            '  columnDefs: [ /* ... */ ],\n' +
            '});',
        },
        {
          name: 'Step 2. 응답 레이아웃이 다를 때 — parse',
          demo: 'remote-data-server-spec',
          since: '1.2.0',
          description:
            '응답이 envelope에 싸여 있거나 필드명이 다르면 <code>parse(json)</code>으로 ' +
            '<code>{ rows, total }</code>을 만들어 반환하세요. 원본 JSON 전체가 인자로 오므로 ' +
            '필요한 메타데이터(토큰, 서버 시각 등)를 여기서 빼둘 수도 있습니다. ' +
            'parse에서 예외가 나면 <code>console.error</code> 후 기본 해석으로 폴백합니다.',
          example:
            '// 서버 응답: { result: { items: [...], totalCount: 500 } }\n' +
            'dataSource: {\n' +
            "  url: '/api/employees-v2',\n" +
            '  parse: function (json) {\n' +
            '    return { rows: json.result.items, total: json.result.totalCount };\n' +
            '  },\n' +
            '}',
        },
        {
          name: 'Step 3. 요청 파라미터 스펙이 다를 때 — request',
          demo: 'remote-data-server-spec',
          since: '2.5.0',
          description:
            '서버가 <code>offset/limit</code>, <code>orderBy=field:dir</code> 같은 다른 파라미터를 쓰면 ' +
            '<code>request(state)</code>로 기본 매핑을 <strong>대체</strong>합니다. <code>state</code>는 ' +
            '<code>{ page, pageSize, sortModel, filterModel, quickFilter, sortMode, filterMode, pageMode }</code> ' +
            '읽기 전용 스냅샷이고, 반환한 객체가 요청 파라미터가 됩니다(<code>params</code> 고정 파라미터 위에 병합). ' +
            '값이 <code>undefined</code>인 키는 생략되므로 조건부 파라미터를 깔끔하게 표현할 수 있습니다. ' +
            '예외가 나면 <code>console.error</code> 후 기본 매핑으로 폴백합니다. ' +
            '<strong>병합 우선순위:</strong> <code>params</code>와 같은 키를 반환하면 <code>request</code>가 ' +
            '이깁니다(나중에 병합). 단 <code>undefined</code> 반환은 "생략"이지 "삭제"가 아니므로 ' +
            '<code>params</code>가 준 키를 지우지는 못합니다 — 조건부 제거는 <code>params</code> 쪽에서 하세요. ' +
            '<strong>직렬화:</strong> GET은 모든 값이 쿼리스트링 문자열이 되므로 배열·객체는 직접 문자열로 ' +
            '만들어야 합니다(객체를 그대로 반환하면 <code>[object Object]</code>). POST는 body 전체가 ' +
            '<code>JSON.stringify</code>되므로 <code>sort: state.sortModel</code>처럼 중첩 배열/객체를 ' +
            '그대로 반환해도 온전히 나갑니다.',
          example:
            '// GET — 값은 전부 문자열/숫자로 (쿼리스트링에 들어간다)\n' +
            'dataSource: {\n' +
            "  url: '/api/employees-v2',\n" +
            '  request: function (state) {\n' +
            '    return {\n' +
            '      offset: state.page * state.pageSize,\n' +
            '      limit: state.pageSize,\n' +
            '      orderBy: state.sortModel.length\n' +
            "        ? state.sortModel[0].field + ':' + state.sortModel[0].dir\n" +
            '        : undefined,               // 정렬 없으면 파라미터 자체를 생략\n' +
            '      q: state.quickFilter || undefined,\n' +
            '    };\n' +
            '  },\n' +
            '}\n' +
            '\n' +
            '// POST — body가 JSON.stringify되므로 중첩 구조를 그대로 반환해도 된다\n' +
            'dataSource: {\n' +
            "  url: '/api/employees/search',\n" +
            "  method: 'POST',\n" +
            '  request: function (state) {\n' +
            '    return {\n' +
            '      paging: { offset: state.page * state.pageSize, limit: state.pageSize },\n' +
            '      sort: state.sortModel,       // [{ field, dir }] 배열 그대로\n' +
            '      q: state.quickFilter || undefined,\n' +
            '    };\n' +
            '  },\n' +
            '}',
        },
        {
          name: 'Step 4. 인증 헤더 — headers',
          demo: 'remote-data-server-spec',
          since: '2.5.0',
          description:
            '토큰 등 요청 헤더는 <code>headers</code>에 객체 또는 함수로 지정합니다. ' +
            '<strong>함수는 요청마다 평가</strong>되므로 갱신되는 토큰도 항상 최신 값이 나갑니다. ' +
            'POST의 기본 <code>Content-Type: application/json</code>은 유지되며, 같은 키를 주면 덮어씁니다. ' +
            '예외가 나면 헤더 없이 요청합니다.',
          example:
            'dataSource: {\n' +
            "  url: '/api/employees',\n" +
            '  headers: function () {\n' +
            "    return { Authorization: 'Bearer ' + auth.currentToken() };\n" +
            '  },\n' +
            '}',
        },
        {
          name: 'Step 5. 조회 조건 변경 — params + reloadData',
          demo: 'remote-data-server-spec',
          since: '1.2.0',
          description:
            '정렬·필터·페이지 외의 조회 조건(검색 폼, 기간, 카테고리 등)은 <code>params</code>를 ' +
            '<strong>함수</strong>로 두세요 — 요청마다 다시 평가되므로, 조건 값을 바꾸고 ' +
            '<code>reloadData()</code>만 호출하면 됩니다. <code>request</code> 훅을 쓸 때도 ' +
            '<code>params</code>는 그대로 병합되므로 두 방식을 함께 쓸 수 있습니다 — 역할 분담은 ' +
            '"<code>request</code> = 그리드 상태 → 서버 스펙 변환, <code>params</code> = 그리드 상태와 무관한 ' +
            '조회 조건"이 기본입니다. 같은 키가 겹치면 <code>request</code>가 이깁니다(Step 3 참고).',
          example:
            "var cond = { dept: '', from: null };\n" +
            'var grid = new DataGrid(el, {\n' +
            '  dataSource: {\n' +
            "    url: '/api/employees',\n" +
            '    params: function () {\n' +
            '      return {\n' +
            '        dept: cond.dept || undefined,\n' +
            '        from: cond.from || undefined,\n' +
            '      };\n' +
            '    },\n' +
            '  },\n' +
            '});\n' +
            '\n' +
            "searchForm.addEventListener('submit', function () {\n" +
            '  cond.dept = deptSelect.value;\n' +
            '  grid.reloadData();          // params 함수가 새 조건으로 다시 평가된다\n' +
            '});',
        },
        {
          name: 'Step 6. 데이터 소스 교체 — setDataSource',
          demo: 'remote-data-server-spec',
          since: '2.5.0',
          description:
            'URL이나 훅 구성 자체가 바뀌는 경우(다른 엔드포인트, 다른 서버 스펙)는 ' +
            '<code>setDataSource(dataSource)</code>로 교체합니다. 1페이지로 리셋하고 즉시 다시 불러옵니다. ' +
            '조건 값만 바뀌는 경우는 Step 5(<code>params</code> 함수)가 더 가볍습니다.',
          example:
            "grid.setDataSource({ url: '/api/archived-employees' });",
        },
        {
          name: 'Step 7. 에러 처리와 로딩 표시',
          demo: 'remote-data',
          since: '1.2.0',
          description:
            '로드 중에는 로딩 오버레이가 자동 표시됩니다. 네트워크 오류·HTTP 에러 상태(4xx/5xx)·JSON 파싱 실패는 ' +
            '<code>dataLoadError</code> 이벤트로 옵니다 — 기존 행은 유지되므로 사용자에게 재시도 UI를 보여주고 ' +
            '<code>reloadData()</code>를 다시 호출하면 됩니다. 인증 만료(401) 처리도 이 이벤트에서 하세요.',
          example:
            "grid.on('dataLoadError', function (e) {\n" +
            "  toast('데이터를 불러오지 못했습니다: ' + e.error.message);\n" +
            "  if (String(e.error.message).indexOf('401') !== -1) auth.refresh().then(function () {\n" +
            '    grid.reloadData();\n' +
            '  });\n' +
            '});',
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
          demo: 'row-numbers-maxwidth-editable',
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
          demo: 'sorting',
          type: 'boolean',
          default: 'true',
          description:
            '헤더 클릭으로 정렬합니다. 클릭할 때마다 오름차순 → 내림차순 → 해제로 순환하고, ' +
            '<kbd>Shift</kbd>+클릭으로 다중 정렬에 추가합니다(헤더에 정렬 순서 배지 표시).',
        },
        {
          name: 'comparator',
          demo: 'sorting',
          type: '(a, b, rowA, rowB) => number',
          description:
            '커스텀 정렬 비교 함수. 기본 비교자는 숫자·날짜·불리언·문자열(자연 정렬, 대소문자 무시)을 처리하고 ' +
            '빈 값(null/undefined/\'\')을 항상 마지막에 배치합니다.',
          example:
            "comparator: function (a, b) { return a.length - b.length; } // 문자열 길이순",
        },
        {
          name: 'filter',
          demo: 'column-filters',
          type: "true | 'text' | 'number' | 'set'",
          default: 'false',
          description:
            '헤더 메뉴에서 열 수 있는 컬럼 필터 종류. <code>true</code>는 <code>dataType</code>에 맞는 종류' +
            '(number → <code>\'number\'</code>, bool → <code>\'set\'</code>, 그 외 <code>\'text\'</code>)로 해석됩니다. ' +
            '필터 모델 구조는 <a href="#filter-model">Filter Model</a> 섹션 참고.',
        },
        {
          name: 'headerAlign',
          demo: 'utility-v2',
          type: "'left' | 'center' | 'right'",
          since: '2.0.0',
          description:
            '헤더 라벨만 셀과 다른 정렬을 지정합니다. 생략 시 <code>align</code>을 따릅니다.',
          example: "{ field: 'salary', align: 'right', headerAlign: 'center' }",
        },
        {
          name: 'headerRenderer',
          demo: 'custom-header',
          type: '(params) => string | HTMLElement',
          since: '2.4.0',
          description:
            '헤더 라벨을 커스텀 콘텐츠로 교체합니다 — <code>cellRenderer</code>의 헤더판. ' +
            'params는 <code>{ colDef, headerName }</code>. HTML 문자열을 반환하면 그대로 삽입되고' +
            '(<strong>이스케이프되지 않으므로</strong> 신뢰된 마크업만), Element를 반환하면 append됩니다. ' +
            '정렬 아이콘·필터 메뉴·리사이저·리오더 등 기본 헤더 동작은 그대로 유지되며, ' +
            '커스텀 콘텐츠 안의 인터랙티브 요소(<code>button·input·select·textarea·a·label</code>) ' +
            '클릭/드래그는 정렬 토글·<code>headerClicked</code>·컬럼 리오더를 발동하지 않습니다. ' +
            '예외가 발생하면 <code>headerName</code> 텍스트로 폴백됩니다. ' +
            '참고: <code>autoSizeColumn</code>의 헤더 폭 측정은 <code>headerName</code> 텍스트 기준입니다.',
          example:
            'headerRenderer: function (params) {\n' +
            "  return '<b>' + params.headerName + '</b> <small>(원)</small>';\n" +
            '}',
        },
        {
          name: 'headerClass',
          demo: 'custom-header',
          type: 'string | (colDef) => string',
          since: '2.4.0',
          description:
            '헤더 셀에 추가할 CSS 클래스(공백 구분 다중 가능) — <code>cellClass</code>의 헤더판. ' +
            '함수형은 <code>colDef</code>를 받으며, 예외가 발생하면 클래스 없이 렌더링됩니다.',
          example: "headerClass: 'accent-header'",
        },
        {
          name: 'headerTooltip',
          demo: 'custom-header',
          type: 'string',
          since: '2.4.0',
          description: '헤더 셀에 마우스를 올렸을 때 표시할 툴팁(<code>title</code> 속성).',
          example: "headerTooltip: '세전 연봉 (원화)'",
        },
        {
          name: 'wrapText',
          demo: 'pinned-rows-wrap-text',
          type: 'boolean',
          default: 'false',
          since: '2.0.0',
          description:
            '셀 텍스트를 줄바꿈해 표시합니다. 행 높이가 내용에 맞게 늘어나려면 그리드 옵션 ' +
            '<a href="#grid-options-autoRowHeight"><code>autoRowHeight: true</code></a>를 함께 켜세요' +
            '(없으면 고정 행 높이 안에서 줄바꿈되어 잘립니다).',
        },
        {
          name: 'exportFormatter',
          demo: 'excel-export',
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
          demo: 'computed-columns-row-styling',
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
          demo: 'computed-columns-row-styling',
          type: 'boolean',
          default: 'false',
          since: '1.2.0',
          description:
            '이 컬럼을 헤더 드래그 순서 변경에서 제외합니다(다른 컬럼은 계속 이동 가능). ' +
            '고정(pinned) 컬럼은 원래 드래그 대상이 아닙니다.',
        },
        {
          name: 'dataType',
          demo: 'data-type-format',
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
          demo: 'data-type-format',
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
          demo: 'row-grouping',
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
          demo: 'cell-editing',
          type: 'boolean',
          default: 'false (editor 선언 시 true)',
          description:
            '셀 더블클릭 또는 포커스 상태에서 <kbd>Enter</kbd>로 인라인 편집을 시작합니다. ' +
            '<kbd>Enter</kbd>/blur로 커밋, <kbd>Esc</kbd>로 취소하며 커밋 시 ' +
            '<a href="#events-cellValueChanged"><code>cellValueChanged</code></a> 이벤트가 발생합니다. ' +
            '<code>editor</code>를 선언한 컬럼은 생략해도 <code>true</code>로 간주됩니다 — ' +
            '명시적 <code>editable: false</code>로 다시 끌 수 있습니다 (v2.2.0).',
        },
        {
          name: 'editor',
          demo: 'cell-editing',
          type: "'text' | 'number' | 'select' | 'multiselect' | 'radio' | 'checkbox' | { init, getValue, destroy? }",
          default: "'text'",
          since: '1.2.0',
          description:
            '인라인 에디터 종류. <code>\'number\'</code>는 커밋 시 숫자로 변환하고 숫자가 아니면 이전 값으로 되돌립니다. ' +
            '<code>\'select\'</code>·<code>\'radio\'</code>는 <code>editorOptions</code>에서 단일 선택 ' +
            '(select는 드롭다운, radio는 multiselect와 같은 셀 앵커 라디오 패널). ' +
            "select는 <a href='#column-defs-editorSearch'><code>editorSearch</code></a>를 주면 " +
            '검색 입력이 있는 옵션 패널로 바뀝니다 (v2.3.0). ' +
            '<code>\'multiselect\'</code>(v2.2.0)는 셀 아래에 체크리스트 패널을 펼치고 <strong>배열</strong>을 ' +
            '<code>editorOptions</code> 순서로 커밋합니다 — 내용이 같으면 커밋하지 않습니다. ' +
            '<code>\'checkbox\'</code>(v2.2.0)는 체크박스입니다 — 기본은 불리언 커밋이고, ' +
            "<code>editorOptions: { checked: 'Y', unchecked: 'N' }</code> 매핑을 주면 " +
            "그 값('Y'/'N', 1/0 등)으로 읽고 커밋합니다. 매핑 없이도 'y'/'yes'/'true'/'1' 계열 문자열은 " +
            '체크로 인식합니다 (커밋은 불리언). ' +
            '모두 <kbd>Enter</kbd>/바깥 클릭으로 커밋, <kbd>Esc</kbd>로 취소하며, ' +
            'editor를 선언하면 <code>editable: true</code>는 생략할 수 있습니다 (v2.2.0). ' +
            '문자열 대신 객체를 주면 <strong>커스텀 에디터</strong>입니다: ' +
            '<code>init(cellEl, value, row, col)</code>로 UI를 셀에 렌더링하고, 커밋 시 ' +
            '<code>getValue()</code>가 새 값을 반환하며, 닫힐 때 <code>destroy()</code>(선택)가 호출됩니다. ' +
            '커스텀 에디터에서도 <kbd>Enter</kbd>/<kbd>Esc</kbd>/포커스 이탈과 ' +
            '<code>validator</code>·<code>beforeCellSave</code> 검증이 동일하게 동작합니다. ' +
            '생략 시 <code>dataType</code>/<code>filter</code>가 number면 숫자, 아니면 텍스트 에디터입니다.',
          example:
            "{ field: 'skills', editor: 'multiselect',   // 값은 ['js', 'css'] 같은 배열\n" +
            "  editorOptions: [{ label: 'JavaScript', value: 'js' }, { label: 'CSS', value: 'css' }],\n" +
            '  cellRenderer: DataGrid.renderers.multiselect() }\n' +
            '\n' +
            '// 커스텀 에디터 — { init, getValue, destroy? } 객체\n' +
            "{ field: 'progress', editor: {\n" +
            "  init: function (cell, value) {\n" +
            "    this._input = document.createElement('input');\n" +
            "    this._input.type = 'range'; this._input.value = value;\n" +
            '    cell.appendChild(this._input); this._input.focus();\n' +
            '  },\n' +
            '  getValue: function () { return Number(this._input.value); },\n' +
            '} }',
        },
        {
          name: 'editorOptions',
          demo: 'select-label-value',
          type: 'Array<string | { label, value }>',
          description:
            "<code>editor: 'select' | 'multiselect' | 'radio'</code>의 선택지 목록. " +
            "<code>editor: 'checkbox'</code>에서는 배열 대신 <code>{ checked, unchecked }</code> " +
            "매핑 객체를 받습니다 (예: <code>{ checked: 'Y', unchecked: 'N' }</code> — 읽기/커밋 모두 그 값 사용). " +
            '문자열 배열이면 표시와 저장에 같은 값을 쓰고, ' +
            '<code>{ label, value }</code> 객체 배열이면 편집 UI에는 <code>label</code>이 표시되고 ' +
            '선택 시 <code>value</code>가 데이터에 저장됩니다 (셀에는 저장된 value가 보입니다 — ' +
            'label로 표시하려면 짝꿍 렌더러 <code>DataGrid.renderers.select()/radio()/multiselect()</code>를 쓰세요). ' +
            '<code>value</code>의 원본 타입은 보존됩니다 — 숫자 value를 고르면 숫자로 커밋됩니다. ' +
            '객체 형식은 v2.2.0부터 지원.',
          example:
            "{ field: 'country', editor: 'select',\n" +
            "  editorOptions: [\n" +
            "    { label: '한국', value: 'kr' },\n" +
            "    { label: '일본', value: 'jp' },\n" +
            '  ] }',
        },
        {
          name: 'editorSearch',
          demo: 'searchable-select',
          type: 'true | { fetch?, debounce?, minLength?, placeholder? }',
          default: 'undefined',
          since: '2.3.0',
          description:
            "<code>editor: 'select'</code>를 네이티브 셀렉트 대신 <strong>검색 입력이 있는 옵션 패널</strong>로 " +
            '바꿉니다. <code>true</code>면 정적 <code>editorOptions</code>를 로컬에서 필터하고(label 또는 ' +
            '문자열화한 value 부분 일치, 대소문자 무관), <code>fetch(query, row, col) =&gt; Promise&lt;options&gt;</code>를 ' +
            '주면 질의마다 비동기로 목록을 불러옵니다 (lazy 검색 — 반환 형식은 <code>editorOptions</code>와 동일). ' +
            '<code>debounce</code>(기본 250ms)는 입력 멈춤 후 fetch까지의 지연, <code>minLength</code>(기본 0)는 ' +
            'fetch를 시작할 최소 글자 수, <code>placeholder</code>(기본 "Search…")는 검색 입력의 플레이스홀더입니다. ' +
            '<kbd>↑</kbd>/<kbd>↓</kbd>로 옵션 이동, <kbd>Enter</kbd>로 선택·커밋, 옵션 클릭은 즉시 커밋, ' +
            '<kbd>Esc</kbd>는 취소합니다. 옵션을 고르지 않고 닫으면 값이 바뀌지 않으며, fetch 실패 시 ' +
            '<code>console.error</code> 후 "Load failed"가 표시됩니다(이전 응답이 늦게 도착해도 최신 질의만 반영). ' +
            "lazy로 고른 값의 label 표시는 짝꿍 렌더러 <a href='#renderers-searchselect'>" +
            '<code>renderers.searchselect()</code></a>가 담당합니다.',
          example:
            "{ field: 'city', editor: 'select',\n" +
            '  editorSearch: {\n' +
            '    minLength: 1, debounce: 300,\n' +
            "    fetch: function (query) { return fetch('/api/cities?q=' + query).then(r => r.json()); },\n" +
            '  },\n' +
            '  cellRenderer: DataGrid.renderers.searchselect() }',
        },
        {
          name: 'suppressCopy',
          demo: 'clipboard',
          type: 'boolean',
          default: 'false',
          since: '1.1.0',
          description:
            '클립보드 복사(<kbd>Ctrl+C</kbd> / <code>copy()</code>) 대상에서 이 컬럼을 제외합니다. ' +
            'CSV 내보내기에는 영향이 없습니다.',
        },
        {
          name: 'validator',
          demo: 'edit-validation',
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
            '셀 내용을 직접 렌더링합니다. <code>params</code>는 <code>{ value, formatted, data, colDef, optionLabels }</code> ' +
            '(<code>optionLabels</code>는 lazy 검색 select에서 고른 value→label 맵, 없으면 null — v2.3.0). ' +
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
          demo: 'column-pinning-resize-reorder',
          type: "'left' | 'right'",
          description:
            '컬럼을 좌/우에 고정합니다. 가로 스크롤 시 sticky로 유지되고 경계에 그림자가 표시됩니다. ' +
            '고정 컬럼은 드래그 순서 변경 대상에서 제외됩니다.',
        },
        {
          name: 'checkboxSelection',
          demo: 'row-selection',
          type: 'boolean',
          default: 'false',
          description:
            '셀 앞에 선택 체크박스를 표시합니다. 보통 <code>field</code> 없는 전용 컬럼으로 만듭니다. ' +
            '<code>treeData</code> 그리드에서는 3상태 캐스케이드 체크박스(부모↔자손 선택 연동, ' +
            'indeterminate 표시)로 동작합니다. indeterminate 부모를 클릭하면 남은 체크 가능 리프가 ' +
            '있을 때는 전부 체크하고, 없을 때(비활성 리프만 미체크)는 해제합니다.',
          example:
            "{ colId: 'sel', headerName: '', width: 48, minWidth: 48,\n" +
            '  checkboxSelection: true, headerCheckboxSelection: true,\n' +
            '  sortable: false, resizable: false }',
        },
        {
          name: 'headerCheckboxSelection',
          demo: 'row-selection',
          type: 'boolean',
          default: 'false',
          description:
            '헤더에 전체 선택 체크박스를 표시합니다(<code>rowSelection: \'multiple\'</code> 필요). ' +
            '일부만 선택된 상태에서는 indeterminate로 표시됩니다. 전체 선택은 필터가 적용된 현재 뷰 전체를 선택합니다. ' +
            '<code>treeData</code> 그리드에서는 트리 규칙을 따릅니다 — 전체 체크/해제 시 ' +
            '<code>treeData.checkboxDisabled(row)</code> 행은 건드리지 않고, 표시 상태도 체크 가능한 행만 기준으로 계산합니다.',
        },
        {
          name: 'resizable',
          demo: 'column-pinning-resize-reorder',
          type: 'boolean',
          default: 'true',
          description:
            '헤더 경계를 드래그해 폭을 조절합니다. 경계 더블클릭 시 내용에 맞춰 자동 조절(<code>autoSizeColumn</code>)됩니다.',
        },
        {
          name: 'hide',
          demo: 'column-visibility-autosize',
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
          demo: 'column-filters',
          kind: 'type',
          description:
            '<code>op</code>: <code>contains</code> · <code>notContains</code> · <code>equals</code> · ' +
            '<code>notEqual</code> · <code>startsWith</code> · <code>endsWith</code> — 대소문자를 무시하고 비교합니다.',
          example:
            "grid.applyColumnFilter('name', { type: 'text', op: 'startsWith', value: 'kim' });",
        },
        {
          name: 'NumberFilterModel',
          demo: 'column-filters',
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
          demo: 'column-filters',
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
          demo: 'row-data-api',
          group: 'Data',
          signature: 'setRowData(rows: object[]): void',
          description:
            '행 데이터를 통째로 교체합니다. 선택·포커스·페이지가 초기화됩니다(필터·정렬 상태는 유지).',
        },
        {
          name: 'getRowData',
          demo: 'row-data-api',
          group: 'Data',
          signature: 'getRowData(): object[]',
          description: '필터와 무관한 전체 행 배열(복사본)을 반환합니다.',
        },
        {
          name: 'getDisplayedRows',
          demo: 'row-data-api',
          group: 'Data',
          signature: 'getDisplayedRows(): object[]',
          description: '필터·정렬이 적용된 현재 뷰의 행 배열(모든 페이지 포함)을 반환합니다.',
        },
        {
          name: 'getDisplayedRowCount',
          demo: 'row-data-api',
          group: 'Data',
          signature: 'getDisplayedRowCount(): number',
          description: '현재 뷰의 행 수를 반환합니다.',
        },
        {
          name: 'reloadData',
          demo: 'remote-data',
          group: 'Data',
          signature: 'reloadData(): void',
          since: '1.2.0',
          description:
            '<code>dataSource</code>에서 데이터를 다시 불러옵니다. server 모드인 축의 현재 상태' +
            '(페이지·정렬·필터)가 요청 파라미터로 전달되고, 응답이 오면 행을 교체하고 ' +
            '<code>dataChanged</code>를 발생시킵니다. 여러 요청이 겹치면 마지막 요청만 반영됩니다. ' +
            '조회 조건 변경 패턴은 <a href="#remote-data-guide">가이드 Step 5</a> 참고.',
        },
        {
          name: 'setDataSource',
          demo: 'remote-data-server-spec',
          group: 'Data',
          signature: 'setDataSource(dataSource: object): void',
          since: '2.5.0',
          description:
            '원격 데이터 소스를 런타임에 교체하고 <strong>1페이지로 리셋한 뒤</strong> 즉시 다시 불러옵니다. ' +
            'URL·훅 구성이 통째로 바뀔 때 사용하고, 조회 조건 값만 바뀌면 <code>params</code> 함수 + ' +
            '<code>reloadData()</code>가 더 가볍습니다(<a href="#remote-data-guide">가이드</a> 참고).',
          example: "grid.setDataSource({ url: '/api/archived-employees' });",
        },
        {
          name: 'addRow',
          demo: 'row-data-api',
          group: 'Data',
          signature: 'addRow(row: object): void',
          description: '행 하나를 추가합니다. <code>addRows(rows)</code>로 여러 행을 한 번에 추가할 수 있습니다.',
        },
        {
          name: 'updateRow',
          demo: 'row-data-api',
          group: 'Data',
          signature: 'updateRow(row: object, changes: object): void',
          description: '행 객체에 <code>changes</code>를 병합하고 다시 렌더링합니다.',
          example: "grid.updateRow(grid.getSelectedRows()[0], { status: 'Inactive' });",
        },
        {
          name: 'removeRows',
          demo: 'row-data-api',
          group: 'Data',
          signature: 'removeRows(rows: object[]): void',
          description: '지정한 행들을 제거합니다. <code>removeSelectedRows()</code>는 선택된 행을 제거합니다.',
        },

        /* ---- 선택 ---- */
        {
          name: 'getSelectedRows',
          demo: 'row-selection',
          group: 'Selection',
          signature: 'getSelectedRows(): object[]',
          description: '선택된 행 배열을 반환합니다.',
        },
        {
          name: 'selectAll',
          demo: 'row-selection',
          group: 'Selection',
          signature: 'selectAll(): void',
          description:
            '현재 뷰(필터 적용)의 모든 행을 선택합니다. <code>rowSelection: \'multiple\'</code>에서만 동작. ' +
            '<code>deselectAll()</code>은 모든 선택을 해제합니다.',
        },

        /* ---- 편집 ---- */
        {
          name: 'startEdit',
          demo: 'edit-validation',
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
          demo: 'edit-validation',
          group: 'Editing',
          signature: 'stopEdit(commit?: boolean): void',
          since: '1.1.0',
          description:
            '진행 중인 편집을 종료합니다. 기본은 커밋(검증·<code>beforeCellSave</code> 통과 시 저장), ' +
            '<code>stopEdit(false)</code>는 취소합니다. 편집 중이 아니면 무시됩니다.',
        },
        {
          name: 'isEditing',
          demo: 'edit-validation',
          group: 'Editing',
          signature: 'isEditing(): boolean',
          since: '1.1.0',
          description: '인라인 편집이 진행 중인지 반환합니다.',
        },
        {
          name: 'setEditable',
          demo: 'row-numbers-maxwidth-editable',
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
          demo: 'clipboard',
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
          demo: 'clipboard',
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
          demo: 'quick-filter',
          group: 'Filter & Sort',
          signature: 'setQuickFilter(text: string): void',
          description:
            '모든 표시 컬럼을 대상으로 하는 전역 검색. 공백으로 구분한 모든 단어가 일치해야 합니다(AND).',
        },
        {
          name: 'applyColumnFilter',
          demo: 'column-filters',
          group: 'Filter & Sort',
          signature: 'applyColumnFilter(field: string, model: FilterModel | null): void',
          description:
            '컬럼 필터를 코드로 적용합니다. <code>null</code>을 넘기면 해당 컬럼 필터를 해제합니다. ' +
            '모델 구조는 <a href="#filter-model">Filter Model</a> 참고.',
        },
        {
          name: 'getFilterModel',
          demo: 'column-filters',
          group: 'Filter & Sort',
          signature: 'getFilterModel(): { [field]: FilterModel }',
          description: '현재 컬럼 필터 상태를 반환합니다.',
        },
        {
          name: 'clearFilters',
          demo: 'column-filters',
          group: 'Filter & Sort',
          signature: 'clearFilters(): void',
          description: '모든 컬럼 필터와 퀵 필터를 해제합니다.',
        },
        {
          name: 'setSortModel',
          demo: 'sorting',
          group: 'Filter & Sort',
          signature: 'setSortModel(model: { field, dir }[]): void',
          description:
            '정렬 상태를 코드로 설정합니다. <code>getSortModel()</code>로 현재 상태를 읽습니다.',
          example: "grid.setSortModel([{ field: 'salary', dir: 'desc' }]);",
        },

        /* ---- 그룹핑 ---- */
        {
          name: 'setGroupBy',
          demo: 'row-grouping',
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
          demo: 'row-grouping',
          group: 'Grouping',
          signature: 'getGroupBy(): string[]',
          since: '1.1.0',
          description: '현재 그룹핑 필드 목록(복사본)을 반환합니다.',
        },
        {
          name: 'expandAllGroups',
          demo: 'row-grouping',
          group: 'Grouping',
          signature: 'expandAllGroups(): void',
          since: '1.1.0',
          description:
            '모든 그룹을 펼칩니다. <code>collapseAllGroups()</code>는 모든 그룹을 접습니다.',
        },

        /* ---- 페이지네이션 ---- */
        {
          name: 'setPage',
          demo: 'pagination',
          group: 'Pagination',
          signature: 'setPage(page: number): void',
          description: '0부터 시작하는 페이지 번호로 이동합니다. 범위를 벗어나면 자동 보정됩니다.',
        },
        {
          name: 'setPageSize',
          demo: 'pagination',
          group: 'Pagination',
          signature: 'setPageSize(size: number): void',
          description: '페이지 크기를 변경합니다. 현재 보고 있던 첫 행이 포함된 페이지로 이동합니다.',
        },

        /* ---- 마스터-디테일 ---- */
        {
          name: 'expandRow',
          demo: 'master-detail',
          group: 'Master-Detail',
          signature: 'expandRow(row: object): boolean',
          since: '1.2.0',
          description:
            '행의 디테일 패널을 펼치고 <code>rowExpanded</code>를 발생시킵니다. ' +
            '<code>collapseRow(row)</code>는 접고 <code>rowCollapsed</code>를 발생, ' +
            '<code>toggleRowDetail(row)</code>는 토글, <code>isRowExpanded(row)</code>는 상태 조회. ' +
            '<code>rowDetail</code> 옵션이 없거나 이미 해당 상태면 <code>false</code>를 반환합니다.',
        },

        /* ---- 트리 그리드 ---- */
        {
          name: 'toggleNode',
          demo: 'tree-grid',
          group: 'Tree',
          signature: 'toggleNode(row: object, expanded?: boolean): boolean',
          since: '2.1.0',
          description:
            '트리 노드를 펼치거나 접습니다(<code>expanded</code> 생략 시 토글). ' +
            '<code>beforeNodeToggle</code>(취소 가능) → 갱신 → <code>nodeExpanded</code>/' +
            '<code>nodeCollapsed</code> 순으로 이벤트가 발생하고, 상태가 바뀌면 <code>true</code>를 반환합니다. ' +
            '<code>expandNode(row)</code> / <code>collapseNode(row)</code>는 방향 고정 단축형, ' +
            '<code>isNodeExpanded(row)</code>는 상태 조회입니다.',
          example:
            "grid.on('cellClicked', function (e) {\n  if (e.data.type === 'folder') grid.toggleNode(e.data);\n});",
        },
        {
          name: 'expandAllNodes',
          demo: 'tree-grid',
          group: 'Tree',
          signature: 'expandAllNodes(level?: number): void',
          since: '2.1.0',
          description:
            '트리 전체를 펼칩니다. <code>level</code>을 주면 그 깊이 미만 레벨의 노드만 펼칩니다 ' +
            '(예: <code>expandAllNodes(1)</code> = 루트만). <code>collapseAllNodes()</code>는 전부 접습니다. ' +
            '일괄 작업이므로 노드별 이벤트는 발생하지 않습니다.',
        },

        /* ---- 셀 선택 · 검색 ---- */
        {
          name: 'getCellRange',
          demo: 'cell-selection-find',
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
          demo: 'cell-selection-find',
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
          demo: 'change-tracking',
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
          demo: 'change-tracking',
          group: 'Change Tracking',
          signature: 'isDirty(): boolean',
          since: '1.2.0',
          description: '기준선 이후 변경이 하나라도 있는지 반환합니다.',
        },
        {
          name: 'commitChanges',
          demo: 'change-tracking',
          group: 'Change Tracking',
          signature: 'commitChanges(): void',
          since: '1.2.0',
          description:
            '현재 상태를 새 기준선으로 확정합니다 — 변경 목록과 dirty 표시가 초기화됩니다. ' +
            '서버 저장이 성공한 뒤 호출하세요.',
        },
        {
          name: 'rollbackChanges',
          demo: 'change-tracking',
          group: 'Change Tracking',
          signature: 'rollbackChanges(): void',
          since: '1.2.0',
          description:
            '모든 변경을 기준선으로 되돌립니다: 수정 값 원복, 추가 행 제거, 삭제 행을 원래 위치에 복원. ' +
            'undo/redo 스택도 함께 비워집니다(롤백을 가로지르는 undo는 지원하지 않음).',
        },
        {
          name: 'undo',
          demo: 'change-tracking',
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
          demo: 'navigation-json',
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
          demo: 'navigation-json',
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
          demo: 'navigation-json',
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
          demo: 'grid-state',
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
          demo: 'grid-state',
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
          demo: 'grid-state',
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
          demo: 'column-visibility-autosize',
          group: 'Columns',
          signature: 'setColumnVisible(colId: string, visible: boolean): void',
          description: '컬럼을 표시하거나 숨깁니다. <code>colId</code> 또는 <code>field</code>로 찾습니다.',
        },
        {
          name: 'getColumns',
          demo: 'column-visibility-autosize',
          group: 'Columns',
          signature: 'getColumns(): ColumnDef[]',
          description: '정규화된 컬럼 정의 배열을 반환합니다(현재 순서 반영).',
        },
        {
          name: 'autoSizeColumn',
          demo: 'column-visibility-autosize',
          group: 'Columns',
          signature: 'autoSizeColumn(colId: string): void',
          description:
            '헤더와 값 샘플(최대 200행)의 텍스트 폭을 측정해 컬럼 폭을 맞춥니다. ' +
            '헤더 리사이즈 핸들 더블클릭과 동일합니다.',
        },

        /* ---- 내보내기 ---- */
        {
          name: 'getCsv',
          demo: 'csv-export',
          group: 'Export',
          signature: 'getCsv(): string',
          description:
            '필터·정렬이 적용된 현재 뷰 전체를 CSV 문자열로 반환합니다. ' +
            '<code>valueFormatter</code>가 적용되고 RFC 4180 규칙으로 이스케이프됩니다.',
        },
        {
          name: 'exportCsv',
          demo: 'csv-export',
          group: 'Export',
          signature: "exportCsv(filename?: string): void",
          description:
            '<code>getCsv()</code> 결과를 UTF-8(BOM 포함) 파일로 다운로드합니다. 기본 파일명은 <code>export.csv</code>.',
        },
        {
          name: 'exportExcel',
          demo: 'excel-export',
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
          demo: 'navigation-json',
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
          demo: 'overlays',
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
          demo: 'partial-refresh-options-toolbar',
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
          demo: 'partial-refresh-options-toolbar',
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
          demo: 'data-type-format',
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
        {
          name: 'once',
          demo: 'utility-v2',
          group: 'Events',
          signature: 'once(eventName: string, handler: (e) => void): Function',
          since: '2.0.0',
          description:
            '첫 발생 후 자동 해제되는 핸들러를 등록합니다. 반환값(wrapper)으로 ' +
            '<code>off(eventName, wrapper)</code> 조기 해제가 가능합니다.',
        },
        {
          name: 'setEnabled',
          demo: 'utility-v2',
          group: 'Display',
          signature: 'setEnabled(enabled: boolean): void',
          since: '2.0.0',
          description:
            '그리드 전체 인터랙션을 잠급니다 — 반투명 오버레이가 마우스를 가로막고 키보드 입력도 무시됩니다' +
            '(저장 요청 중 등 일시적 비활성용). 진행 중 편집은 취소되며 <code>isEnabled()</code>로 상태 조회. ' +
            '편집만 잠그려면 <code>setEditable(false)</code>를 쓰세요.',
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
          demo: 'row-selection',
          payload: '{ selectedRows: object[] }',
          description: '행 선택이 바뀔 때(클릭, 체크박스, 전체 선택, API 호출).',
          example:
            "grid.on('selectionChanged', function (e) {\n" +
            "  console.log(e.selectedRows.length + ' rows selected');\n" +
            '});',
        },
        {
          name: 'cellValueChanged',
          demo: 'cell-editing',
          payload: '{ data, colDef, oldValue, newValue }',
          description: '인라인 편집이 커밋되어 값이 실제로 바뀌었을 때. 서버 저장 훅으로 사용하세요.',
        },
        {
          name: 'rowValueChanged',
          demo: 'utility-v2',
          payload: '{ data, changes: { field: { oldValue, newValue } } }',
          since: '2.0.0',
          description:
            '행 단위 변경 묶음 — 인라인 편집 커밋·붙여넣기·채우기 핸들에서 같은 행의 변경이 ' +
            '하나의 이벤트로 묶입니다(셀별 <code>cellValueChanged</code>는 그대로 함께 발생).',
        },
        {
          name: 'editingStarted',
          demo: 'edit-validation',
          payload: '{ data, colDef, value }',
          since: '1.1.0',
          description: '인라인 편집이 시작될 때 (더블클릭·<kbd>Enter</kbd>·<code>startEdit()</code> 모두).',
        },
        {
          name: 'editingStopped',
          demo: 'edit-validation',
          payload: '{ data, colDef, oldValue, newValue, committed }',
          since: '1.1.0',
          description:
            '편집기가 닫힐 때. <code>committed</code>가 <code>true</code>면 값이 저장된 것이고, ' +
            '<code>false</code>면 취소되었거나 값이 바뀌지 않은 것입니다(<code>newValue</code>는 이때 이전 값).',
        },
        {
          name: 'beforeCellSave',
          demo: 'edit-validation',
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
          demo: 'sorting',
          payload: '{ sortModel: { field, dir }[] }',
          description: '정렬 상태가 바뀔 때(헤더 클릭 또는 <code>setSortModel</code>).',
        },
        {
          name: 'filterChanged',
          demo: 'column-filters',
          payload: '{ filterModel, quickFilter? }',
          description: '컬럼 필터 또는 퀵 필터가 바뀔 때.',
        },
        {
          name: 'paginationChanged',
          demo: 'basic-events',
          payload: '{ page, pageSize }',
          description: '페이지 이동 또는 페이지 크기 변경 시.',
        },
        {
          name: 'groupChanged',
          demo: 'row-grouping',
          payload: '{ groupBy: string[] }',
          since: '1.1.0',
          description: '<code>setGroupBy()</code>로 그룹핑 필드가 바뀌었을 때.',
        },
        {
          name: 'groupToggled',
          demo: 'row-grouping',
          payload: '{ field, value, path, expanded }',
          since: '1.1.0',
          description:
            '그룹 헤더 행이 접히거나 펼쳐졌을 때. <code>path</code>는 중첩 그룹까지 포함한 그룹 고유 경로입니다.',
        },
        {
          name: 'rowClicked',
          demo: 'basic-events',
          payload: '{ data, rowIndex }',
          description: '행 클릭 시. <code>rowIndex</code>는 현재 페이지 기준 인덱스입니다.',
        },
        {
          name: 'rowDoubleClicked',
          demo: 'basic-events',
          payload: '{ data, rowIndex }',
          description: '행 더블클릭 시(편집 시작 여부와 무관하게 발생).',
        },
        {
          name: 'cellDoubleClicked',
          demo: 'navigation-json',
          payload: '{ data, colDef, value, rowIndex }',
          since: '1.1.0',
          description:
            '셀 더블클릭 시(그룹 헤더 행 제외). <code>rowDoubleClicked</code>보다 먼저 발생하며, ' +
            '편집 가능 셀이면 이어서 인라인 편집이 시작됩니다.',
        },
        {
          name: 'cellClicked',
          demo: 'basic-events',
          payload: '{ data, colDef, value }',
          description: '셀 클릭 시. <code>rowClicked</code>보다 먼저 발생합니다.',
        },
        {
          name: 'columnResized',
          demo: 'column-pinning-resize-reorder',
          payload: '{ colId, width }',
          description: '드래그 리사이즈가 끝났을 때.',
        },
        {
          name: 'columnMoved',
          demo: 'column-pinning-resize-reorder',
          payload: '{ colId, toIndex }',
          description: '헤더 드래그로 컬럼 순서가 바뀌었을 때.',
        },
        {
          name: 'stateChanged',
          demo: 'grid-state',
          payload: '{ state: GridState }',
          since: '1.1.0',
          description:
            '<code>setState()</code> 또는 <code>resetState()</code>로 상태가 복원/리셋되었을 때. ' +
            '<code>state</code>는 적용 후의 <code>getState()</code> 결과입니다.',
        },
        {
          name: 'cellRangeChanged',
          demo: 'cell-selection-find',
          payload: '{ range: CellRange | null }',
          since: '1.2.0',
          description:
            '셀/블록 범위가 바뀔 때(드래그 중 계속). <code>range</code>는 <code>getCellRange()</code> 결과와 같습니다.',
        },
        {
          name: 'fillApplied',
          demo: 'fill-handle',
          payload: '{ updatedCells }',
          since: '2.0.0',
          description: '채우기 핸들 드래그가 끝나 셀이 채워졌을 때. 셀별로는 <code>cellValueChanged</code>도 발생합니다.',
        },
        {
          name: 'cellContextMenu',
          demo: 'cell-selection-find',
          payload: '{ data, colDef, value, rowIndex, originalEvent }',
          since: '1.2.0',
          description:
            '셀 우클릭 시. 그리드는 기본 메뉴를 막지 않으므로 커스텀 메뉴를 띄우려면 ' +
            '<code>e.originalEvent.preventDefault()</code> 후 직접 구현하세요.',
        },
        {
          name: 'headerClicked',
          demo: 'cell-selection-find',
          payload: '{ colDef }',
          since: '1.2.0',
          description:
            '헤더 셀 클릭 시(리사이저·필터 메뉴 버튼 제외). 정렬 동작과 별개로 함께 발생합니다.',
        },
        {
          name: 'cellKeyDown',
          demo: 'cell-selection-find',
          payload: '{ data, colDef, rowIndex, originalEvent }',
          since: '1.2.0',
          description:
            '셀에 포커스가 있는 상태의 키 입력(편집 중 제외). 그리드 자체 키 처리(화살표·Enter 등)보다 먼저 발생합니다.',
        },
        {
          name: 'beforeExport',
          demo: 'excel-export',
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
          demo: 'master-detail',
          payload: '{ data }',
          since: '1.2.0',
          description:
            '디테일 패널이 펼쳐질 때(셰브론 클릭·<code>expandRow()</code>). ' +
            '접힐 때는 <code>rowCollapsed</code>가 발생합니다.',
        },
        {
          name: 'beforeNodeToggle',
          demo: 'tree-grid',
          payload: '{ data, expanded, cancel }',
          since: '2.1.0',
          description:
            '트리 노드가 펼쳐지거나 접히기 직전(<code>treeData</code> 필요). <code>expanded</code>는 ' +
            '전환될 목표 상태이며 <code>e.cancel = true</code>로 전환을 막을 수 있습니다. ' +
            '전환 후에는 <code>nodeExpanded</code> 또는 <code>nodeCollapsed</code>(payload <code>{ data }</code>)가 발생합니다.',
          example:
            "grid.on('beforeNodeToggle', function (e) {\n  if (e.data.locked) e.cancel = true;\n});",
        },
        {
          name: 'dataLoadError',
          demo: 'remote-data',
          payload: '{ error }',
          since: '1.2.0',
          description:
            '<code>dataSource</code> 로드가 실패했을 때(네트워크 오류, HTTP 에러 상태). ' +
            '콘솔에도 기록되며 기존 행은 유지됩니다.',
        },
        {
          name: 'gridReady',
          demo: 'lifecycle-events',
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
          demo: 'lifecycle-events',
          payload: '{ rowCount }',
          since: '1.1.0',
          description:
            '행 데이터 집합이 바뀌었을 때 — <code>setRowData</code> / <code>addRow(s)</code> / ' +
            '<code>removeRows</code> / <code>updateRow</code>. 개별 셀 편집은 대신 ' +
            '<code>cellValueChanged</code>가 발생합니다.',
        },
        {
          name: 'viewRendered',
          demo: 'lifecycle-events',
          payload: '{ displayedRowCount, page }',
          since: '1.1.0',
          description:
            '<code>refresh()</code>가 끝날 때마다(정렬·필터·페이지 이동·데이터 변경 등 모든 전체 렌더 후) 발생합니다. ' +
            '자주 발생하므로 무거운 작업은 피하세요.',
        },
        {
          name: 'beforeSort',
          demo: 'lifecycle-events',
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
          demo: 'lifecycle-events',
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
          demo: 'builtin-renderers',
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
          demo: 'builtin-renderers',
          signature: 'DataGrid.renderers.check()',
          description: '불리언 값을 ✓ / – 로 표시합니다.',
          example: 'cellRenderer: DataGrid.renderers.check()',
        },
        {
          name: 'progress',
          demo: 'builtin-renderers',
          signature: 'DataGrid.renderers.progress()',
          description: '0–100 값을 진행 바와 퍼센트 라벨로 표시합니다(범위 밖 값은 잘림).',
          example: 'cellRenderer: DataGrid.renderers.progress()',
        },
        {
          name: 'select',
          demo: 'select-renderer',
          signature: 'DataGrid.renderers.select(options?: Array<string | { label, value }>)',
          since: '2.2.0',
          description:
            'select 에디터의 짝꿍 렌더러 — 셀에 저장된 value를 <code>editorOptions</code>의 ' +
            '<code>label</code>로 표시합니다. <code>options</code>를 생략하면 그 컬럼의 ' +
            '<code>editorOptions</code>를 그대로 사용합니다. 표시만 바뀌고 데이터·정렬·필터·내보내기는 ' +
            '저장된 value 기준입니다. 목록에 없는 값은 원래 표시(포맷 적용값)로 폴백하며, ' +
            'label은 HTML 이스케이프됩니다.',
          example:
            "{ field: 'country', editor: 'select',\n" +
            "  editorOptions: [{ label: '한국', value: 'kr' }, { label: '일본', value: 'jp' }],\n" +
            '  cellRenderer: DataGrid.renderers.select() }',
        },
        {
          name: 'radio',
          demo: 'multi-radio-checkbox-editors',
          signature: 'DataGrid.renderers.radio(options?: Array<string | { label, value }>)',
          since: '2.2.0',
          description:
            "radio 에디터의 짝꿍 렌더러 — 동작은 <a href='#renderers-select'><code>select</code></a>와 동일하게 " +
            '저장된 value를 label로 표시합니다.',
          example: "{ field: 'level', editor: 'radio',\n" +
            "  editorOptions: [{ label: 'Junior', value: 1 }, { label: 'Senior', value: 3 }],\n" +
            '  cellRenderer: DataGrid.renderers.radio() }',
        },
        {
          name: 'searchselect',
          demo: 'searchable-select',
          signature: 'DataGrid.renderers.searchselect(options?: Array<string | { label, value }>)',
          since: '2.3.0',
          description:
            "검색형 select(<a href='#column-defs-editorSearch'><code>editorSearch</code></a>)의 짝꿍 렌더러 — " +
            "동작은 <a href='#renderers-select'><code>select</code></a>와 동일하게 저장된 value를 label로 " +
            '표시하되, lazy 검색(<code>fetch</code>)으로 고른 <strong>정적 editorOptions에 없는 값</strong>도 ' +
            '선택 당시의 label로 표시합니다 (그리드가 컬럼별 value→label 캐시를 유지). ' +
            '캐시에도 없는 값(초기 데이터 등)은 원래 표시로 폴백합니다.',
          example: "{ field: 'city', editor: 'select', editorSearch: { fetch: searchCities },\n" +
            '  cellRenderer: DataGrid.renderers.searchselect() }',
        },
        {
          name: 'multiselect',
          demo: 'multi-radio-checkbox-editors',
          signature: 'DataGrid.renderers.multiselect(options?: Array<string | { label, value }>)',
          since: '2.2.0',
          description:
            'multiselect 에디터의 짝꿍 렌더러 — 값 <strong>배열</strong>을 label 칩 목록으로 표시합니다. ' +
            '<code>options</code>를 생략하면 그 컬럼의 <code>editorOptions</code>를 사용하고, ' +
            '목록에 없는 값은 문자열 그대로 칩이 되며 빈 배열/null은 빈 셀입니다. label은 HTML 이스케이프됩니다.',
          example: "cellRenderer: DataGrid.renderers.multiselect()   // ['js','css'] → 'JavaScript' 'CSS' 칩",
        },
        {
          name: 'checkbox',
          demo: 'multi-radio-checkbox-editors',
          signature: 'DataGrid.renderers.checkbox(options?: { checked, unchecked })',
          since: '2.2.0',
          description:
            'checkbox 에디터의 짝꿍 렌더러 — 값을 실제 체크박스 모양으로 표시합니다(표시 전용). ' +
            '<code>options</code>(생략 시 컬럼의 <code>editorOptions</code> 매핑)가 있으면 ' +
            "<code>checked</code> 값과의 일치로 판정하고, 없으면 불리언 외에 'Y'/'yes'/'true'/'1' 계열도 " +
            '체크로 인식합니다. 마우스 이벤트는 셀로 통과시키므로(pointer-events) 더블클릭 편집을 막지 않습니다. ' +
            "✓/– 텍스트 표시를 원하면 <a href='#renderers-check'><code>check()</code></a>를 쓰세요.",
          example:
            "{ field: 'approved', editor: 'checkbox',\n" +
            "  editorOptions: { checked: 'Y', unchecked: 'N' },\n" +
            '  cellRenderer: DataGrid.renderers.checkbox() }',
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
