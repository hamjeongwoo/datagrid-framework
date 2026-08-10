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
 *   description : 요점 설명 (HTML 허용 — 여러 문단이면 <p>로 나눈다. <br><br> 금지)
 *   props       : 하위 속성 표. [{ name, type, default, since, description }]
 *                 객체형 옵션의 키나 유니온 타입의 각 값을 산문 대신 표로 보여준다.
 *                 propsTitle로 표 제목을 바꿀 수 있다 (기본 '속성').
 *   notes       : 주제별 보조 설명. [{ title, body, variant }]
 *                 variant 'warn'(주의) / 'tip'이면 콜아웃 박스, 없으면 소제목 + 본문.
 *   example     : 코드 예제 (문자열, JS로 하이라이팅)
 *   since       : 도입 버전 (생략 시 1.0.0)
 *   demo        : examples/features.html의 데모 카드 앵커 id (있으면 "예제 ↗"
 *                 링크 배지 표시 — 앵커는 features.html의 <h2 class="section" id>)
 *
 * 렌더 순서: 헤드(배지/타입/기본값) → description → props → notes → example
 * 긴 설명은 description에 몰지 말고 props/notes로 나눈다. 내부 링크(#앵커)의
 * id 규칙은 api.html의 entryId()를 참고 — section.id + '-' + name(비단어→'-').
 * ============================================================================= */
window.ApiDocs = {
  library: 'DataGrid',
  version: '2.25.1',
  updated: '2026-08-10',

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
            '체크박스 컬럼(<code>checkboxSelection</code>)과 헤더 전체 선택을 사용할 수 있습니다. ' +
            '<strong>선택 진입점은 체크박스 컬럼의 유무로 갈립니다</strong>(v2.17) — ' +
            '<code>checkboxSelection</code> 컬럼이 있으면 선택은 그 컬럼에서만 이뤄지고 ' +
            '다른 셀을 클릭해도 선택이 바뀌지 않습니다(포커스만 이동). ' +
            '체크박스 컬럼이 없으면 종전대로 행의 아무 셀이나 클릭해 선택합니다. ' +
            '<code>cellSelection: true</code>에서는 행 클릭 선택이 항상 꺼집니다.',
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
          name: 'localeText',
          demo: 'locale-text',
          type: 'object',
          default: '영어 (DataGrid.locales.en)',
          since: '2.15.0',
          description:
            '그리드가 직접 그리는 UI 문자열(필터 메뉴 · 헤더 필터 행 · 페이지네이션 · 오버레이 · ' +
            '그룹/전체 요약 · 검색형 select · 상태 컬럼 · aria-label)을 교체합니다. ' +
            '<strong>지정한 키만 덮어쓰고 나머지는 영어 기본값</strong>이므로 일부만 번역해도 됩니다. ' +
            '내장 로케일은 <a href="#api-methods-locales"><code>DataGrid.locales.ko</code></a> / ' +
            '<code>.en</code>. 문자열이 아닌 값은 무시되고, ' +
            '<code>{from}</code>·<code>{total}</code>·<code>{column}</code>·<code>{count}</code> ' +
            '토큰은 값으로 치환됩니다. 값은 항상 HTML 이스케이프되어 삽입됩니다. ' +
            '런타임 전환은 <a href="#api-methods-setOptions"><code>setOptions({ localeText })</code></a>. ' +
            '전체 키 목록과 규칙은 <a href="#locale-guide">UI 문자열 다국어 가이드</a> 참고. ' +
            '<em>셀 값·컬럼 <code>headerName</code>·<code>title</code>은 소비자 데이터이므로 대상이 아닙니다.</em>',
          example:
            "localeText: DataGrid.locales.ko\n\n" +
            "// 또는 필요한 키만\n" +
            "localeText: { noRowsToShow: '데이터가 없습니다', filterApply: '조회' }",
        },
        {
          name: 'popupEditor',
          demo: 'popup-editor',
          type: 'boolean | object',
          default: 'false',
          since: '2.16.0',
          description:
            '<p>행 전체를 <strong>폼에서</strong> 편집합니다. 인라인 셀 편집을 대체하는 것이 아니라, ' +
            '켜면 편집 트리거가 폼을 여는 방식입니다.</p>' +
            '<p>폼의 각 필드는 <strong>컬럼 정의를 그대로 재사용</strong>합니다 — ' +
            '<code>editor</code> · <code>editorOptions</code> · <code>editorSearch</code> · ' +
            '<code>dataType</code> · <code>validator</code>를 쓰고 라벨은 <code>headerName</code>입니다. ' +
            '편집 불가 컬럼은 읽기 전용으로 표시되고, 내장 컬럼(행 번호 · 상태 · 디테일 토글 · ' +
            '체크박스)은 제외됩니다.</p>' +
            '<p>컬럼마다 폼에서만 다르게 꾸미려면 ' +
            '<a href="#column-defs-popupEditor"><code>column.popupEditor</code></a>를, ' +
            '런타임 변경은 <code>setOptions({ popupEditor })</code>를 쓰세요.</p>',
          props: [
            {
              name: 'position',
              type: "'center' | 'left' | 'right'",
              default: "'center'",
              description: '중앙 모달 또는 좌·우 슬라이드 패널. 모르는 값은 <code>\'center\'</code>로 떨어집니다.',
            },
            {
              name: 'width',
              type: 'number',
              default: '420',
              description: '팝업 폭(px).',
            },
            {
              name: 'columns',
              type: '1 | 2',
              default: '1',
              description:
                '필드 배치 열 수. <strong>폭이 모자라면 자동으로 1열</strong>로 떨어지고, ' +
                '더 좁아지면 라벨이 입력 위로 올라갑니다 — 기준은 ' +
                '<a href="#theming--dg-popup-field-min"><code>--dg-popup-field-min</code></a> 토큰입니다.',
            },
            {
              name: 'title',
              type: 'string | (row) => string',
              description: '헤더 제목. 생략하면 <code>localeText.popupEditTitle</code>을 씁니다.',
            },
            {
              name: 'trigger',
              type: "'dblclick' | 'none'",
              default: "'dblclick'",
              description:
                '<code>\'none\'</code>이면 <a href="#api-methods-openEditPopup"><code>openEditPopup()</code></a>' +
                '으로만 열립니다 — 더블클릭은 인라인 편집 그대로 남습니다.',
            },
            {
              name: 'fields',
              type: 'string[]',
              description: '표시할 field 목록이자 표시 순서. 생략하면 컬럼 순서를 따릅니다.',
            },
            {
              name: 'instantUpdate',
              type: 'boolean',
              default: 'false',
              description: '필드를 확정할 때마다 즉시 행에 반영합니다 — 아래 <em>커밋 규약</em> 참고.',
            },
            {
              name: 'closeOnBackdrop',
              type: 'boolean',
              default: 'true',
              description: '바깥(백드롭) 클릭으로 닫습니다. 끄더라도 헤더 닫기 버튼과 <kbd>Esc</kbd>는 남습니다.',
            },
            {
              name: 'buttons',
              type: "Array<'save' | 'cancel' | 'close' | object>",
              default: "['save', 'cancel']",
              description:
                '<strong>배열 순서가 곧 배치 순서</strong>입니다. 문자열은 내장 버튼이고, 객체는 ' +
                '<code>{ key, text, variant, title, disabled, onClick(ctx), onLoad(ctx) }</code> 형식의 ' +
                '커스텀 버튼입니다. 빈 배열은 "버튼 없음"으로 존중됩니다.',
            },
          ],
          notes: [
            {
              title: '폼에서 달라지는 위젯',
              body:
                '<p>검색형 select(<code>editorSearch</code>)는 셀에서는 "펼쳐진 패널 + 고르면 즉시 커밋"이지만, ' +
                '폼에서는 <strong>접히는 콤보박스</strong>가 됩니다 — 입력창이 현재 값의 label을 보여주고 ' +
                '클릭·타이핑할 때만 목록이 펼쳐집니다. <code>multiselect</code>/<code>radio</code>는 ' +
                '펼친 채로 현재 상태를 그대로 보여주므로 접지 않습니다.</p>',
            },
            {
              title: '커밋 규약',
              body:
                '<p>기본은 폼에 모았다가 Save에서 <strong>변경된 필드만 일괄 커밋</strong>하고, ' +
                'Cancel · <kbd>Esc</kbd> · 바깥클릭은 전부 폐기합니다.</p>' +
                '<p><code>instantUpdate: true</code>면 필드를 확정할 때마다 즉시 행에 반영되고, ' +
                '<strong>Cancel은 팝업을 연 시점으로 롤백</strong>합니다.</p>' +
                '<p>어느 쪽이든 실제 커밋 시 <a href="#events-cellValueChanged"><code>cellValueChanged</code></a> · ' +
                '<a href="#events-rowValueChanged"><code>rowValueChanged</code></a>가 그대로 발생하므로 ' +
                '기존 핸들러가 계속 동작합니다.</p>',
            },
            {
              title: 'buttons.onLoad — 폼이 만들어진 직후 (v2.18)',
              body:
                '<p>폼이 <strong>완전히 만들어진 직후 한 번</strong> 호출됩니다. 행 값을 보고 버튼 문구·잠금을 ' +
                '정하거나 필드 값을 초기화하는 자리입니다 — <code>ctx.buttonEl</code>로 버튼 DOM을 직접 ' +
                '만질 수 있습니다.</p>' +
                '<p>호출 순서는 <strong>DOM 순서</strong>(필드 버튼 → 푸터 버튼)이고 그 시점에 모든 필드가 ' +
                '이미 존재하므로 다른 필드도 안전하게 건드릴 수 있습니다. 내장 버튼은 동작이 고정이라 ' +
                '콜백을 받지 않습니다 ' +
                '(<a href="../examples/features.html#popup-button-onload" target="_blank" rel="noopener">' +
                'onLoad 데모 ↗</a>).</p>',
            },
            {
              variant: 'warn',
              title: 'disabled와 onLoad를 함께 쓸 때',
              body:
                '<p><code>disabled</code>를 함께 선언하면 그 결과가 <code>onLoad</code>의 수동 지정을 ' +
                '덮습니다. 로드 시점에만 잠그려면 <code>disabled</code> 없이 <code>onLoad</code>에서 ' +
                '<code>ctx.buttonEl.disabled</code>만 쓰세요.</p>',
            },
          ],
          example:
            'popupEditor: {\n' +
            "  position: 'right',        // 오른쪽에서 슬라이드\n" +
            '  width: 460,\n' +
            "  title: function (row) { return row.name + ' 편집'; },\n" +
            '  buttons: [\n' +
            "    { key: 'reset', text: '초기화', onClick: function (ctx) { ctx.reset(); } },\n" +
            "    { key: 'approve', text: '승인',\n" +
            '      onLoad: function (ctx) {          // 폼이 만들어진 직후 한 번\n' +
            "        var done = ctx.data.status === 'Active';\n" +
            '        ctx.buttonEl.disabled = done;\n' +
            "        ctx.buttonEl.textContent = done ? '승인 완료' : '승인';\n" +
            '      },\n' +
            "      onClick: function (ctx) { ctx.setValue('status', 'Active'); } },\n" +
            "    { key: 'del', text: '삭제', variant: 'danger',\n" +
            '      disabled: function (ctx) { return ctx.values.locked; },\n' +
            '      onClick: function (ctx) { ctx.grid.removeRows([ctx.data]); ctx.close(); } },\n' +
            "    'save', 'cancel',      // 문자열 = 내장 버튼, 배열 순서가 배치 순서\n" +
            '  ],\n' +
            '}',
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
          name: 'editableIndicator',
          demo: 'editable-indicator',
          type: 'boolean',
          default: 'false',
          since: '2.9.0',
          description:
            '편집 가능한 컬럼의 헤더에 연필 아이콘을 표시합니다 — 어떤 컬럼을 더블클릭할 수 있는지 ' +
            '한눈에 알 수 있습니다. 표시 기준은 <strong>지금 실제로 편집할 수 있는가</strong>입니다: ' +
            '<a href="#column-defs-editable"><code>editable</code></a>이 <code>true</code>인 컬럼' +
            '(<a href="#column-defs-editor"><code>editor</code></a>를 선언하면 자동으로 true)이면서 ' +
            '그리드가 잠기지 않은 경우에만 나타나고, ' +
            '<a href="#api-methods-setEditable"><code>setEditable(false)</code></a>로 잠그면 ' +
            '아이콘도 함께 사라집니다(편집할 수 없는데 아이콘이 남아 거짓 정보가 되는 것을 막습니다). ' +
            '체크박스 선택 컬럼·행 번호 컬럼 같은 내장 컬럼은 편집 대상이 아니므로 제외됩니다. ' +
            '아이콘 색·크기는 <code>.dg-editable-icon</code>으로 재정의할 수 있습니다.',
          example: 'editableIndicator: true',
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
          type: '{ url, method?, params?, autoLoad?, request?, parse?, headers?, paramsFormat?, paramsSerializer? }',
          since: '1.2.0',
          description:
            '<p>원격 데이터 소스. <code>fetch</code>로 <code>url</code>을 호출해 행을 불러옵니다. ' +
            '로딩 중에는 오버레이가 표시되고, 실패하면 ' +
            '<a href="#events-dataLoadError"><code>dataLoadError</code></a> 이벤트가 발생합니다. ' +
            '<a href="#api-methods-reloadData"><code>reloadData()</code></a>로 다시 불러오고 ' +
            '<a href="#api-methods-setDataSource"><code>setDataSource()</code></a>로 교체합니다.</p>' +
            '<p><strong>단계별 레시피는 <a href="#remote-data-guide">Remote Data Source 가이드</a>를 ' +
            '참고하세요.</strong></p>',
          props: [
            {
              name: 'url',
              type: 'string',
              description: '요청 대상 주소.',
            },
            {
              name: 'method',
              type: "'GET' | 'POST'",
              default: "'GET'",
              description: 'GET이면 파라미터가 쿼리스트링으로, POST면 JSON body로 나갑니다.',
            },
            {
              name: 'autoLoad',
              type: 'boolean',
              default: 'true',
              since: '2.24.0',
              description: '생성 시 자동 조회 여부 — 아래 <em>autoLoad: false가 끄는 것</em> 참고.',
            },
            {
              name: 'params',
              type: 'object | () => object',
              description: '항상 포함할 고정 파라미터.',
            },
            {
              name: 'request',
              type: '(state) => object',
              since: '2.5.0',
              description:
                '기본 파라미터 매핑을 서버 스펙으로 <strong>대체</strong>하는 훅 ' +
                '(<a href="#remote-data-guide-Step-3-request">가이드 Step 3</a>).',
            },
            {
              name: 'parse',
              type: '(json) => { rows, total }',
              description:
                '응답을 <code>{ rows, total }</code>로 바꾸는 훅. 기본은 배열 또는 ' +
                '<code>{ rows, total }</code>를 그대로 씁니다 ' +
                '(<a href="#remote-data-guide-Step-2-parse">가이드 Step 2</a>).',
            },
            {
              name: 'headers',
              type: 'object | () => object',
              since: '2.5.0',
              description: '인증 토큰 등 요청 헤더.',
            },
            {
              name: 'paramsFormat',
              type: "'dot' | 'bracket'",
              default: "'dot'",
              since: '2.11.0',
              description:
                '중첩 파라미터 표기 — <code>page.selectPage=1</code> 또는 ' +
                '<code>page[selectPage]=1</code>.',
            },
            {
              name: 'paramsSerializer',
              type: '(params) => string',
              since: '2.10.0',
              description: 'GET 쿼리스트링 생성을 통째로 대체하는 훅.',
            },
          ],
          notes: [
            {
              title: 'autoLoad: false가 끄는 것 (2.24.0)',
              body:
                '<p>그리드가 <strong>스스로 첫 조회를 하지 않습니다.</strong> 검색 조건을 받은 뒤에 ' +
                '조회하는 화면, 비싼 쿼리, 탭이 열릴 때까지 미루는 경우에 씁니다.</p>' +
                '<p>데이터 소스를 끄는 게 아니라 <strong>"자동"만 끄는 것</strong>이라 ' +
                '<code>reloadData()</code> · <code>loadMore()</code> 같은 명시적 호출은 그대로 동작하고, ' +
                '정렬·필터·페이지 이동에 따른 자동 재조회도 <strong>한 번이라도 조회한 뒤부터는</strong> ' +
                '평소처럼 동작합니다. <code>rowData</code>를 함께 주면 첫 조회 전까지 그 데이터가 ' +
                '보입니다.</p>' +
                '<ul>' +
                '<li><code>setDataSource()</code>도 새 소스가 <code>autoLoad: false</code>면 교체만 하고 ' +
                '조회하지 않습니다 — "이 소스는 그리드가 스스로 부르지 않는다"가 생성 시점에만 적용되면 ' +
                '반쪽짜리가 되기 때문입니다.</li>' +
                '<li><a href="#grid-options-infiniteScroll"><code>infiniteScroll</code></a>과 함께 쓰면 ' +
                '첫 조회 전까지는 스크롤로도 자동 조회되지 않고, 그 상태의 <code>loadMore()</code>는 ' +
                '이어받기가 아니라 <strong>첫 페이지</strong>를 불러옵니다.</li>' +
                '</ul>',
            },
          ],
          example:
            "dataSource: {\n" +
            "  url: '/api/employees',\n" +
            "  params: function () { return { token: auth.token }; },\n" +
            '},\n' +
            "sortMode: 'server', pageMode: 'server', pagination: true\n" +
            '\n' +
            '// 조회 버튼을 누를 때까지 서버를 부르지 않는 화면\n' +
            "dataSource: { url: '/api/employees', autoLoad: false },\n" +
            '// …\n' +
            "searchBtn.addEventListener('click', function () { grid.reloadData(); });",
        },
        {
          name: 'infiniteScroll',
          demo: 'infinite-scroll',
          type: 'boolean | { threshold?: number, pageSize?: number, pageSizeSelector?: boolean }',
          default: 'false',
          since: '2.22.0',
          description:
            '<p>바닥에서 <code>threshold</code> 안으로 들어오면 다음 페이지를 자동으로 조회해 ' +
            '<strong>기존 행 뒤에 이어 붙입니다</strong>(교체가 아닙니다).</p>' +
            '<p>정렬·필터가 바뀌거나 <a href="#api-methods-reloadData"><code>reloadData()</code></a>를 ' +
            '호출하면 누적을 버리고 0페이지부터 다시 쌓습니다(스크롤도 맨 위로). 추가 로드 중에는 전면 ' +
            '로딩 오버레이를 띄우지 않습니다 — 보고 있던 행이 매번 가려지면 페이지 이동처럼 느껴지기 ' +
            '때문입니다.</p>',
          props: [
            {
              name: 'threshold',
              type: 'number',
              default: '200',
              description: '바닥까지 남은 거리(px)가 이 값 안으로 들어오면 다음 페이지를 요청합니다.',
            },
            {
              name: 'pageSize',
              type: 'number',
              default: 'paginationPageSize',
              description: '한 번에 받을 행 수.',
            },
            {
              name: 'pageSizeSelector',
              type: 'boolean',
              default: 'true',
              since: '2.23.0',
              description:
                '<p>상태 바 왼쪽의 크기 선택 UI. 선택지는 <code>paginationPageSizeOptions</code>' +
                '(기본 <code>[10, 20, 50, 100]</code>)이며, 현재 크기가 목록에 없으면 정렬된 자리에 ' +
                '끼워 넣습니다. 바꾸면 <code>setPageSize()</code>가 호출돼 쌓인 것을 버리고 새 크기로 ' +
                '다시 받습니다(로드 중에는 비활성).</p>' +
                '<p>서버 부하 때문에 크기를 고정하려면 <code>false</code>로 끄세요.</p>',
            },
          ],
          notes: [
            {
              title: '전제 — dataSource와 모드 상속',
              body:
                '<p><a href="#grid-options-dataSource"><code>dataSource</code></a>가 ' +
                '<strong>필요합니다</strong>. 없으면 <code>console.warn</code> 후 무시됩니다 — ' +
                '클라이언트가 이미 전량을 들고 있으면 자동 조회할 대상이 없습니다.</p>' +
                '<p>켜면 <code>pageMode</code>가 <code>\'server\'</code>로 올라가고 ' +
                '<a href="#grid-options-sortMode"><code>sortMode</code></a>/<code>filterMode</code>도 ' +
                '따라옵니다(명시하면 그 값이 우선).</p>',
            },
            {
              title: '페이저 UI와 배타적입니다',
              body:
                '<p>대신 하단 상태 바가 "불러오는 중 / N건 불러옴 / 마지막 페이지"를 표시합니다 ' +
                '(높이가 고정이라 상태가 바뀌어도 그리드가 흔들리지 않습니다).</p>' +
                '<p><code>setPage()</code>는 무한 스크롤에서 동작하지 않고, ' +
                '<a href="#grid-options-treeData"><code>treeData</code></a>와도 함께 쓸 수 없습니다.</p>',
            },
            {
              title: '마지막 페이지 판정 순서',
              body:
                '<ol>' +
                '<li><strong>서버가 준 플래그</strong> — 응답(또는 <code>parse</code> 반환값)의 ' +
                '<code>last</code> · <code>lastPage</code> · <code>isLast</code>가 <code>true</code>이거나 ' +
                '<code>hasMore</code> · <code>hasNext</code>가 <code>false</code>면 마지막입니다 ' +
                '(Spring Data <code>Page</code>의 <code>last</code>가 그대로 동작합니다).</li>' +
                '<li>수신 0건.</li>' +
                '<li>응답에 <code>total</code>이 있고 누적이 그에 도달.</li>' +
                '<li>받은 건수가 요청한 <code>pageSize</code>보다 적을 때.</li>' +
                '</ol>' +
                '<p>플래그를 주면 <strong>끝을 확인하려고 빈 페이지를 한 번 더 요청하지 ' +
                '않습니다.</strong></p>',
            },
            {
              variant: 'warn',
              title: '바닥을 판정할 수 없는 레이아웃',
              body:
                '<p><a href="#grid-options-domLayout"><code>domLayout: \'autoHeight\'</code></a>는 바디가 ' +
                '내용만큼 자라 스크롤이 생기지 않으므로 마지막 페이지까지 연달아 불러옵니다(경고 표시). ' +
                '그리드가 화면에 없거나 높이가 0이면 바닥을 판정할 수 없어 자동 조회하지 않습니다.</p>',
            },
          ],
          example:
            "var grid = new DataGrid(el, {\n" +
            "  dataSource: { url: '/api/employees' },   // { rows, last } 또는 { rows, total }\n" +
            '  infiniteScroll: { threshold: 200, pageSize: 25 },\n' +
            '  paginationPageSizeOptions: [10, 25, 50, 100],   // 상태 바 크기 선택지\n' +
            '});\n' +
            '\n' +
            "grid.on('rowsAppended', function (e) {\n" +
            "  console.log(e.rows.length + '행 추가, 누적 ' + e.loaded);\n" +
            '});\n' +
            "grid.on('lastPageReached', function (e) {\n" +
            "  console.log('끝 — 총 ' + e.loaded + '행');\n" +
            '});',
        },
        {
          name: 'sortMode',
          demo: 'remote-data',
          type: "'client' | 'server'",
          default: "pageMode를 따름 (pageMode 기본값은 'client')",
          since: '1.2.0',
          description:
            '<p>정렬 수행 주체. <code>\'server\'</code>면 클라이언트 정렬을 건너뛰고, 정렬이 바뀔 때마다 ' +
            '<a href="#grid-options-dataSource"><code>dataSource</code></a>를 다시 호출하며 ' +
            '<code>sort</code> 파라미터(sortModel JSON)를 보냅니다.</p>' +
            '<p><code>filterMode</code>(<code>filter</code>/<code>quickFilter</code> 파라미터)와 ' +
            '<code>pageMode</code>(<code>page</code>/<code>pageSize</code> 파라미터, 응답 ' +
            '<code>total</code>로 페이지네이션 계산)도 같은 방식입니다.</p>',
          notes: [
            {
              title: '기본값 상속 (2.13.0부터)',
              body:
                '<p><code>sortMode</code>와 <code>filterMode</code>를 적지 않으면 <code>pageMode</code>를 ' +
                '따릅니다. <code>pageMode</code>의 기본값이 <code>\'client\'</code>이므로 원격 데이터를 안 ' +
                '쓰면 종전과 동일합니다.</p>' +
                '<p>서버 페이징에서는 클라이언트가 <strong>현재 한 페이지만</strong> 들고 있습니다. ' +
                '그래서 클라이언트 정렬은 그 페이지 안에서만 정렬되면서 헤더에는 전체 정렬처럼 표시되고, ' +
                '클라이언트 필터는 페이지를 걸러내는데 총 건수는 서버 값이라 "1–20 / 10,000"이라 써놓고 ' +
                '7행만 나오는 식으로 어긋납니다.</p>',
            },
            {
              title: '상속은 단방향입니다',
              body:
                '<p><strong><code>pageMode</code> → <code>sortMode</code>/<code>filterMode</code></strong> ' +
                '방향으로만 흐릅니다. 반대 조합(<code>sortMode: \'server\'</code> + ' +
                '<code>pageMode: \'client\'</code> — 서버가 정렬된 전체를 주고 클라이언트가 페이징)은 ' +
                '정상이므로 <code>pageMode</code>를 끌어올리지 않습니다.</p>' +
                '<p><code>pageMode: \'server\'</code>에 <code>sortMode: \'client\'</code>를 명시하면 ' +
                '"현재 페이지 안에서만 정렬"이 의도일 수 있으므로 그대로 존중하되 ' +
                '<code>console.warn</code>으로 알립니다.</p>',
            },
          ],
          example:
            "pageMode: 'server',   // sortMode·filterMode도 자동으로 'server'\n" +
            'pagination: true,\n' +
            '\n' +
            '// 서버가 정렬된 전체를 주고 페이징은 클라이언트가 하는 구성\n' +
            "sortMode: 'server',   // pageMode는 기본값 'client' 그대로",
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
          demo: 'fill-height',
          type: "'normal' | 'autoHeight' | 'fill'",
          default: "'normal'",
          since: '2.0.0',
          description:
            '<p>그리드 높이를 무엇이 결정할지 고릅니다.</p>' +
            '<table class="api-table"><thead><tr><th>값</th><th>높이</th><th>쓰는 곳</th></tr></thead><tbody>' +
            "<tr><td><code>'normal'</code> (기본)</td><td><code>height: 100%</code> — 컨테이너 높이를 따름</td>" +
            '<td>컨테이너 높이가 <strong>확정</strong>된 경우(px·vh 등)</td></tr>' +
            "<tr><td><code>'fill'</code> (v2.12.0)</td><td>컨테이너를 <strong>정확히</strong> 채움 " +
            '— 데이터 양과 무관하게 고정</td><td><code>flex: 1</code>·grid 등 <strong>CSS가 높이를 계산</strong>해 주는 레이아웃</td></tr>' +
            "<tr><td><code>'autoHeight'</code></td><td>내용 높이만큼 늘어남</td>" +
            '<td>컨테이너에 높이를 안 주고 싶을 때 (<strong>세로 가상화 비활성</strong> — 소량 데이터 전용)</td></tr>' +
            '</tbody></table>',
          notes: [
            {
              title: "'fill'이 필요한 이유",
              body:
                '<p><code>\'normal\'</code>의 <code>height: 100%</code>는 컨테이너 높이가 확정일 때만 ' +
                '동작합니다. 컨테이너가 <code>flex: 1</code> 항목이면 자동 최소 크기' +
                '(<code>min-height: auto</code>)가 내용에 밀려 커지므로 <strong>행이 많을수록 그리드가 ' +
                '부모를 넘어 늘어나고</strong>, 높이가 불확정인 부모에서는 <code>100%</code>가 아예 풀리지 ' +
                '않아 <strong>데이터가 없을 때 쪼그라듭니다</strong>.</p>' +
                '<p><code>\'fill\'</code>은 그리드를 흐름 밖(<code>position: absolute; inset: 0</code>)으로 ' +
                '빼서 행 수가 컨테이너 높이에 영향을 주지 못하게 합니다 — 넘치는 행은 본문이 ' +
                '스크롤합니다.</p>',
            },
            {
              title: "'fill'의 전제",
              body:
                '<ul>' +
                '<li>컨테이너에 해결된 높이가 있어야 합니다 — 높이가 <code>auto</code>인 컨테이너라면 ' +
                '<code>0</code>이 됩니다.</li>' +
                '<li>컨테이너가 <code>position: static</code>이면 그리드가 <code>relative</code>로 ' +
                '올립니다(<code>destroy()</code>에서 되돌립니다 — 직접 지정한 값은 건드리지 않습니다).</li>' +
                '<li>컨테이너 padding 안쪽이 아니라 <strong>테두리 안쪽 전체</strong>를 채웁니다.</li>' +
                '</ul>',
            },
          ],
          example:
            '// 부모가 flex:1 로 높이를 잡아주는 레이아웃\n' +
            '// <div style="display:flex; flex-direction:column; height:100vh">\n' +
            '//   <header>…</header>\n' +
            '//   <div id="grid" style="flex:1"></div>\n' +
            '// </div>\n' +
            "new DataGrid(document.getElementById('grid'), {\n" +
            "  domLayout: 'fill',   // 데이터가 0행이든 10만행이든 높이는 부모 그대로\n" +
            '  rowData: rows,\n' +
            '});',
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
            '<p>계층 데이터를 트리로 표시합니다. <strong>nested 형식</strong>(각 행의 ' +
            '<code>childrenField</code> 배열이 자식)과 <strong>flat 형식</strong>' +
            '(<code>parentIdField</code> + <code>idField</code>로 계층 구성)을 모두 지원합니다.</p>' +
            '<p>정렬은 형제끼리, 필터는 매치된 노드의 조상을 유지하며 동작합니다. ' +
            '<a href="#grid-options-pagination"><code>pagination</code></a>/' +
            '<a href="#grid-options-groupBy"><code>groupBy</code></a>와는 함께 쓸 수 없습니다.</p>',
          props: [
            {
              name: 'treeField',
              type: 'string',
              default: '첫 데이터 컬럼',
              description: '들여쓰기와 펼침 토글을 그릴 컬럼.',
            },
            {
              name: 'childrenField',
              type: 'string',
              default: "'children'",
              description: 'nested 형식에서 자식 배열이 들어 있는 필드.',
            },
            {
              name: 'parentIdField · idField',
              type: 'string',
              description: 'flat 형식에서 계층을 구성할 두 필드.',
            },
            {
              name: 'indent',
              type: 'number',
              default: '20',
              description: '깊이 한 단계당 들여쓰기(px).',
            },
            {
              name: 'defaultExpandLevel',
              type: 'number',
              default: '0',
              description: '시작할 때 펼쳐 둘 깊이. <code>-1</code>이면 전부 펼칩니다.',
            },
            {
              name: 'filterKeepChildren',
              type: 'boolean',
              default: 'true',
              description: '<code>false</code>면 매치된 부모의 자손 표시를 끕니다.',
            },
            {
              name: 'cascade',
              type: 'boolean',
              default: 'true',
              description: '체크박스 캐스케이드 — 아래 <em>3상태 체크박스</em> 참고.',
            },
            {
              name: 'checkboxDisabled',
              type: '(row) => boolean',
              description: '조건부로 체크박스를 비활성화합니다(캐스케이드 대상에서도 제외).',
            },
            {
              name: 'summary',
              type: 'boolean',
              default: 'false',
              description:
                '<a href="#column-defs-aggFunc"><code>column.aggFunc</code></a> 컬럼에서 부모 행에 자손 ' +
                '리프 집계를 표시합니다(표시 전용이며 필터를 반영합니다).',
            },
            {
              name: 'fetchChildren',
              type: '(row) => Promise',
              description:
                '첫 펼침 때 자식을 비동기로 불러옵니다(nested 형식 전용). ' +
                '<code>hasChildren(row)</code>로 로드 전 토글 표시를 정하고, 실패하면 ' +
                '<a href="#events-dataLoadError"><code>dataLoadError</code></a> 후 재시도할 수 있습니다.',
            },
          ],
          notes: [
            {
              title: '3상태 체크박스',
              body:
                '<p>트리 모드에서 <a href="#column-defs-checkboxSelection"><code>checkboxSelection</code></a> ' +
                '컬럼은 캐스케이드 체크박스가 됩니다 — 부모를 체크하면 자손 전체가 <strong>행 선택</strong>되고, ' +
                '자식 일부만 선택되면 부모가 <code>indeterminate</code>로 표시됩니다.</p>' +
                '<p>조회·조작·이벤트는 기존 선택 API를 그대로 씁니다 — ' +
                '<a href="#api-methods-getSelectedRows"><code>getSelectedRows()</code></a> · ' +
                '<a href="#api-methods-selectAll"><code>selectAll()</code></a>/' +
                '<code>deselectAll()</code> · ' +
                '<a href="#events-beforeSelectionChange"><code>beforeSelectionChange</code></a>/' +
                '<a href="#events-selectionChanged"><code>selectionChanged</code></a>.</p>',
            },
          ],
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
            '값이 원래대로 돌아오면 dirty가 자동 해제됩니다. ' +
            '<code>softDelete</code> 또는 <code>statusColumn</code>을 켜면 자동으로 활성화됩니다.',
        },
        {
          name: 'softDelete',
          demo: 'builtin-crud-staging',
          type: 'boolean',
          default: 'false',
          since: '2.6.0',
          description:
            'CRUD 스테이징용 소프트 삭제. <code>removeRows()</code>/<code>removeSelectedRows()</code>가 ' +
            '<strong>기준선(서버) 행은 제거하지 않고 "삭제 표시"</strong>로 전환합니다 — 행은 취소선+흐림으로 ' +
            '남고(<code>--dg-deleted-row-opacity</code> 토큰) <code>getChanges().deleted</code>에 나타납니다. ' +
            '<strong>추가된(신규) 행은 지금처럼 로우 자체가 제거</strong>됩니다(흔적 없음). ' +
            '삭제 표시 행은 UI 편집(더블클릭/Enter/<code>startEdit</code>/붙여넣기/채우기)이 차단되고 ' +
            '선택은 가능합니다(복원 UX). <code>restoreRows()</code>로 표시를 해제하고, ' +
            '<code>commitChanges()</code>가 이 행들을 물리 제거하며, <code>rollbackChanges()</code>는 표시만 ' +
            '해제합니다. undo/redo는 표시 토글로 되돌립니다. <code>trackChanges</code>를 자동 활성화합니다.',
          example:
            'var grid = new DataGrid(el, {\n' +
            '  softDelete: true,\n' +
            '  statusColumn: true,   // 상태 컬럼과 함께 쓰면 zero-config 스테이징\n' +
            '  columnDefs: [ /* ... */ ],\n' +
            '});',
        },
        {
          name: 'statusColumn',
          demo: 'builtin-crud-staging',
          type: 'true | { headerName?, width?, labels?, colors? }',
          default: 'false',
          since: '2.6.0',
          description:
            '변경 추적 상태(added/updated/deleted)를 태그로 표시하는 내장 컬럼을 좌측에 추가합니다 ' +
            '(정렬/필터/편집/드래그 제외, 데이터에 상태 필드를 심지 않음 — 추적 상태가 단일 진실). ' +
            '기본값: <code>headerName: \'Status\'</code>, <code>width: 90</code>, ' +
            '<code>labels: { added: \'New\', updated: \'Updated\', deleted: \'Deleted\' }</code>, ' +
            '<code>colors: { added: \'green\', updated: \'yellow\', deleted: \'red\' }</code> ' +
            '(색은 <code>renderers.tag</code>와 같은 green/red/blue/yellow/gray). ' +
            'labels/colors는 키 단위로 부분 지정할 수 있습니다. <code>trackChanges</code>를 자동 활성화하며 ' +
            '<code>setOptions({ statusColumn })</code>로 런타임에 켜고 끌 수 있습니다.',
          example:
            "statusColumn: {\n" +
            "  headerName: '상태',\n" +
            "  labels: { added: '신규', updated: '수정', deleted: '삭제' },\n" +
            '}',
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
     * UI 문자열 다국어 가이드 (localeText)
     * ======================================================================= */
    {
      id: 'locale-guide',
      title: 'UI 문자열 다국어 가이드',
      kind: 'guide',
      intro:
        '<p>그리드가 <strong>직접 그리는</strong> 문자열은 전부 ' +
        '<a href="#grid-options-localeText"><code>localeText</code></a> 한 곳에서 나옵니다 — ' +
        '필터 메뉴, 헤더 필터 행, 페이지네이션 바, 오버레이, 그룹/전체 요약, 검색형 select, ' +
        '상태 컬럼, 그리고 각종 <code>aria-label</code>. ' +
        '셀 값, 컬럼 <code>headerName</code>, <code>title</code> 옵션처럼 ' +
        '<strong>소비자가 넘긴 데이터는 대상이 아닙니다</strong>(그건 이미 여러분의 언어입니다).</p>' +
        '<p><strong>부분 번역이 기본 동작입니다.</strong> 지정하지 않은 키는 영어 기본값이 그대로 쓰이므로, ' +
        '필요한 키만 골라 덮어써도 됩니다. 값은 삽입 전에 항상 HTML 이스케이프되고, ' +
        '문자열이 아닌 값(객체·숫자·<code>null</code>)은 무시되어 기본값이 유지됩니다.</p>' +
        '<p><strong>토큰</strong> — 중괄호 표기는 그리드가 값으로 치환합니다. ' +
        '번역문에서 순서를 바꾸거나 빼도 되지만, <em>없는 토큰을 쓰면 치환되지 않고 화면에 그대로 남습니다</em> ' +
        '— 오타를 바로 발견하도록 한 의도적인 동작입니다.</p>' +
        '<table class="api-table"><thead><tr><th>토큰</th><th>쓰이는 키</th><th>값</th></tr></thead><tbody>' +
        '<tr><td><code>{from}</code> <code>{to}</code> <code>{total}</code></td><td><code>pageSummary</code></td>' +
        '<td>현재 페이지의 시작·끝 행 번호와 전체 건수 (각각 <code>&lt;strong&gt;</code>으로 강조됨)</td></tr>' +
        '<tr><td><code>{column}</code></td><td><code>filterMenuLabel</code> · <code>columnFilterLabel</code></td>' +
        '<td>컬럼의 <code>headerName</code></td></tr>' +
        '<tr><td><code>{count}</code></td><td><code>rowCount</code> · <code>searchMinLength</code></td>' +
        '<td>행 수 / 최소 입력 글자 수</td></tr>' +
        '<tr><td><code>{value}</code></td><td><code>popupEditTitle</code></td>' +
        '<td>팝업 편집 중인 행의 첫 필드 값</td></tr>' +
        '</tbody></table>' +
        '<p><strong>전체 키 목록</strong> (내장 로케일: ' +
        '<a href="#api-methods-locales"><code>DataGrid.locales.en</code> · <code>.ko</code></a>)</p>' +
        '<table class="api-table"><thead><tr><th>키</th><th>영어 기본값</th><th>내장 한국어</th><th>쓰이는 곳</th></tr></thead><tbody>' +
        [
          ['filterPlaceholder', 'Filter…', '필터…', '필터 메뉴 · 헤더 필터 행 입력'],
          ['filterToPlaceholder', 'To…', '끝값…', '숫자 필터 In range의 끝값 입력'],
          ['filterApply', 'Apply', '적용', '필터 메뉴 버튼'],
          ['filterClear', 'Clear', '지우기', '필터 메뉴 버튼'],
          ['filterAll', '(All)', '(전체)', '헤더 필터 행의 set 드롭다운 첫 항목'],
          ['blanks', '(Blanks)', '(빈 값)', 'set 필터 목록 · 그룹 헤더의 빈 값'],
          ['opContains', 'Contains', '포함', '텍스트 필터 연산자'],
          ['opNotContains', 'Does not contain', '포함하지 않음', '텍스트 필터 연산자'],
          ['opEquals', 'Equals', '같음', '텍스트 · 숫자 필터 연산자'],
          ['opNotEqual', 'Not equal', '같지 않음', '텍스트 · 숫자 필터 연산자'],
          ['opStartsWith', 'Starts with', '시작 문자', '텍스트 필터 연산자'],
          ['opEndsWith', 'Ends with', '끝 문자', '텍스트 필터 연산자'],
          ['opLessThan', 'Less than', '미만', '숫자 필터 연산자'],
          ['opLessThanOrEqual', 'Less than or equal', '이하', '숫자 필터 연산자'],
          ['opGreaterThan', 'Greater than', '초과', '숫자 필터 연산자'],
          ['opGreaterThanOrEqual', 'Greater than or equal', '이상', '숫자 필터 연산자'],
          ['opInRange', 'In range', '범위', '숫자 필터 연산자'],
          ['selectAllRows', 'Select all rows', '전체 행 선택', '헤더 체크박스 aria-label'],
          ['selectRow', 'Select row', '행 선택', '행 체크박스 aria-label (트리)'],
          ['selectSubtree', 'Select subtree', '하위 트리 선택', '부모 노드 체크박스 aria-label'],
          ['editableColumn', 'Editable column', '편집 가능한 컬럼', 'editableIndicator 연필 아이콘 title'],
          ['filterMenuLabel', '{column} filter menu', '{column} 필터 메뉴', '헤더 필터 메뉴 버튼 aria-label'],
          ['columnFilterLabel', '{column} filter', '{column} 필터', '헤더 필터 행 입력 aria-label'],
          ['pageSizeLabel', 'Page size:', '페이지 크기:', '페이지네이션 바'],
          ['pageSummary', '{from} to {to} of {total}', '{total}건 중 {from}–{to}', '페이지네이션 바 행 범위'],
          ['firstPage', 'First page', '첫 페이지', '« 버튼 aria-label'],
          ['previousPage', 'Previous page', '이전 페이지', '‹ 버튼 aria-label'],
          ['nextPage', 'Next page', '다음 페이지', '› 버튼 aria-label'],
          ['lastPage', 'Last page', '마지막 페이지', '» 버튼 aria-label'],
          ['noRowsToShow', 'No rows to show', '표시할 데이터가 없습니다', '빈 데이터 오버레이'],
          ['loading', 'Loading…', '불러오는 중…', '로딩 오버레이 · 검색형 select 로딩'],
          ['loadingMore', 'Loading more…', '더 불러오는 중…', 'infiniteScroll 상태 바 — 추가 로드 중'],
          ['rowsLoaded', '{loaded} rows loaded', '{loaded}건 불러옴', 'infiniteScroll 상태 바 — total을 모를 때'],
          ['rowsLoadedOfTotal', '{loaded} of {total} rows loaded', '{total}건 중 {loaded}건 불러옴', 'infiniteScroll 상태 바 — total을 알 때'],
          ['noMoreRows', 'All {loaded} rows loaded', '{loaded}건 — 마지막 페이지입니다', 'infiniteScroll 상태 바 — 마지막 페이지'],
          ['groupTotal', 'Total', '합계', 'grandTotal 요약 행 라벨'],
          ['rowCount', '({count})', '({count}건)', '그룹 헤더 · 전체 요약 행의 건수'],
          ['searchPlaceholder', 'Search…', '검색…', 'editorSearch 검색 입력 (컬럼 placeholder가 우선)'],
          ['searchMinLength', 'Type {count}+ characters', '{count}자 이상 입력하세요', 'editorSearch minLength 안내'],
          ['noResults', 'No results', '결과 없음', 'editorSearch 결과 없음'],
          ['loadFailed', 'Load failed', '불러오기 실패', 'editorSearch fetch 실패'],
          ['removeChipLabel', 'Remove {label}', '{label} 제거', '검색형 multiselect 칩의 × 버튼 aria-label (v2.25)'],
          ['statusColumnHeader', 'Status', '상태', 'statusColumn 헤더 기본값'],
          ['statusAdded', 'New', '신규', 'statusColumn 신규 행 태그'],
          ['statusUpdated', 'Updated', '수정', 'statusColumn 수정 행 태그'],
          ['statusDeleted', 'Deleted', '삭제', 'statusColumn 삭제 표시 행 태그'],
          ['popupEditTitle', 'Editing {value}', '{value} 편집', 'popupEditor 헤더 (title 미지정 시)'],
          ['popupSave', 'Save', '저장', 'popupEditor 내장 save 버튼'],
          ['popupCancel', 'Cancel', '취소', 'popupEditor 내장 cancel/close 버튼'],
          ['popupCloseLabel', 'Close editor', '편집 창 닫기', 'popupEditor 헤더 닫기 버튼 aria-label'],
          ['popupReadonlySuffix', ' (readonly)', ' (읽기 전용)', 'popupEditor 읽기 전용 필드 라벨 접미사'],
          ['requiredValue', '{column} is required', '{column}은(는) 필수 항목입니다', 'column.required 위반 시 거부 메시지'],
          ['requiredIndicatorLabel', 'Required', '필수', '팝업 폼 필수 필드 라벨 <code>*</code>의 title 툴팁'],
        ].map(r =>
          `<tr><td><code>${r[0]}</code></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`
        ).join('') +
        '</tbody></table>' +
        '<p><a href="../examples/features.html#locale-text" target="_blank" rel="noopener">' +
        'UI Text Localization 데모 ↗</a>에서 세 로케일을 런타임으로 전환해 볼 수 있습니다.</p>',
      entries: [
        {
          name: 'Step 1. 내장 로케일 쓰기',
          demo: 'locale-text',
          since: '2.15.0',
          description:
            '<code>DataGrid.locales.ko</code>를 <code>localeText</code>에 그대로 넘기면 끝입니다. ' +
            '접근할 때마다 <strong>사본</strong>이 반환되므로 여러 그리드가 같은 로케일을 써도 서로 간섭하지 않습니다.',
          example:
            'var grid = new DataGrid(el, {\n' +
            '  columnDefs: cols,\n' +
            '  rowData: rows,\n' +
            '  localeText: DataGrid.locales.ko,   // 내장 한국어\n' +
            '});',
        },
        {
          name: 'Step 2. 일부만 덮어쓰기',
          demo: 'locale-text',
          since: '2.15.0',
          description:
            '내장 로케일 위에 얹으면 그 로케일이 기준이 되고, 겹치는 키만 교체됩니다. ' +
            '내장 로케일 없이 몇 개만 지정하면 나머지는 영어 기본값입니다 — ' +
            '<strong>번역을 다 채우지 않아도 화면이 깨지지 않습니다.</strong>',
          example:
            '// 한국어 기준 + 도메인 용어만 교체\n' +
            'localeText: Object.assign({}, DataGrid.locales.ko, {\n' +
            "  pageSummary: '전체 {total}명 가운데 {from}번째 ~ {to}번째',\n" +
            "  groupTotal: '총계',\n" +
            "  rowCount: '({count}명)',\n" +
            '})\n\n' +
            '// 영어 기준 + 필요한 키만\n' +
            "localeText: { noRowsToShow: '데이터가 없습니다', filterApply: '조회' }",
        },
        {
          name: 'Step 3. 런타임 전환',
          demo: 'locale-text',
          since: '2.15.0',
          description:
            '<a href="#api-methods-setOptions"><code>setOptions({ localeText })</code></a>로 언제든 바꿉니다. ' +
            '헤더·필터 행·페이지네이션·오버레이가 한 번의 <code>refresh()</code>로 함께 갱신됩니다. ' +
            '<code>statusColumn</code>의 헤더·라벨 기본값도 로케일에서 오므로 같이 바뀌지만, ' +
            '<code>statusColumn: { headerName, labels }</code>로 <strong>명시한 값이 로케일보다 우선</strong>합니다.',
          example:
            "grid.setOptions({ localeText: DataGrid.locales.en });\n\n" +
            '// statusColumn: 로케일 기본값 위에 일부만 명시\n' +
            'new DataGrid(el, {\n' +
            '  localeText: DataGrid.locales.ko,   // 헤더 \'상태\', 라벨 신규/수정/삭제\n' +
            "  statusColumn: { labels: { deleted: '폐기' } },   // 이 키만 우선\n" +
            '});',
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
        '필터 변경, 페이지 이동) 자동으로 다시 요청합니다. 그 외에는 <code>reloadData()</code>(수동 재조회 — ' +
        '2.14.0부터 1페이지로 되돌린 뒤 요청, 유지하려면 <code>{ keepPage: true }</code>)와 ' +
        '<code>setDataSource()</code>(소스 교체) 시점에 요청합니다. 응답 대기 중에는 로딩 오버레이가 표시되고, ' +
        '요청이 겹치면 마지막 요청만 반영됩니다.</p>' +
        '<p><strong>세 축의 기본값 (2.13.0부터):</strong> <code>sortMode</code>·<code>filterMode</code>를 ' +
        '적지 않으면 <code>pageMode</code>를 따릅니다. 즉 <code>pageMode: \'server\'</code>만 켜도 정렬·필터가 ' +
        '함께 서버로 갑니다 — 서버 페이징에서는 클라이언트가 현재 한 페이지만 들고 있어 클라이언트 정렬/필터가 ' +
        '그 페이지 안에서만 동작하면서도 전체를 처리한 것처럼 보이기 때문입니다. 상속은 ' +
        '<code>pageMode</code> → 나머지 <strong>단방향</strong>이라, <code>sortMode: \'server\'</code>만 켜서 ' +
        '"서버가 정렬한 전체를 받아 클라이언트가 페이징"하는 구성은 그대로 됩니다.</p>' +
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
        '서버 스펙 맞춤 데모</a>, <a href="../examples/features.html#remote-data" target="_blank" rel="noopener">기본 스펙 데모</a>, ' +
        '<a href="../examples/features.html#remote-crud-staging" target="_blank" rel="noopener">CRUD 스테이징 데모</a>' +
        '(서버 데이터에 신규/수정/삭제 상태를 쌓았다가 저장하는 실무 패턴)를 참고하세요.</p>',
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
            '<p>서버가 <code>offset/limit</code>, <code>orderBy=field:dir</code> 같은 다른 파라미터를 쓰면 ' +
            '<code>request(state)</code>로 기본 매핑을 <strong>대체</strong>합니다.</p>' +
            '<p><code>state</code>는 <code>{ page, pageSize, sortModel, filterModel, quickFilter, ' +
            'sortMode, filterMode, pageMode }</code> 읽기 전용 스냅샷이고, 반환한 객체가 요청 파라미터가 ' +
            '됩니다. 값이 <code>undefined</code>인 키는 생략되므로 조건부 파라미터를 깔끔하게 표현할 수 ' +
            '있습니다. 예외가 나면 <code>console.error</code> 후 기본 매핑으로 폴백합니다.</p>',
          notes: [
            {
              title: 'params와의 병합 우선순위',
              body:
                '<p><code>params</code> 고정 파라미터 위에 병합되므로, 같은 키를 반환하면 ' +
                '<code>request</code>가 이깁니다.</p>' +
                '<p>단 <code>undefined</code> 반환은 "생략"이지 "삭제"가 아니므로 <code>params</code>가 ' +
                '준 키를 지우지는 못합니다 — 조건부 제거는 <code>params</code> 쪽에서 하세요.</p>',
            },
            {
              title: '중첩 구조의 직렬화 (v2.10.0)',
              body:
                '<p>GET에서 <strong>중첩 객체·배열도 그대로 반환할 수 있습니다</strong>. 표기는 ' +
                '<a href="#remote-data-guide-Step-3-1-paramsFormat-paramsSerializer">' +
                '<code>paramsFormat</code></a>이 정하며 기본은 점 표기입니다 — ' +
                '<code>{ page: { selectPage: 1 } }</code> → <code>page.selectPage=1</code>. ' +
                '<code>Date</code>는 ISO 문자열, <code>null</code>은 빈 값(<code>key=</code>)이 됩니다.</p>' +
                '<p>v2.9.0까지는 값에 <code>String()</code>이 걸려 중첩 구조가 ' +
                '<code>[object Object]</code>로 뭉개졌습니다(BUG-009). POST는 body 전체가 ' +
                '<code>JSON.stringify</code>되므로 예나 지금이나 중첩 구조가 온전히 나갑니다.</p>',
            },
          ],
          example:
            '// GET — 중첩 구조 그대로 반환 (기본 dot 표기: page.selectPage=1&sorts[0].field=…)\n' +
            'dataSource: {\n' +
            "  url: '/api/employees-v3',\n" +
            '  request: function (state) {\n' +
            '    return {\n' +
            '      page: { selectPage: state.page + 1, pageSize: state.pageSize },  // 서버는 1-based\n' +
            '      sorts: state.sortModel.map(function (m) {\n' +
            '        return { field: m.field, dir: m.dir };\n' +
            '      }),\n' +
            '    };\n' +
            '  },\n' +
            '}\n' +
            '\n' +
            '// GET — 평면 파라미터를 쓰는 서버\n' +
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
          name: 'Step 3-1. 중첩 표기가 다를 때 — paramsFormat / paramsSerializer',
          demo: 'nested-params',
          since: '2.10.0',
          description:
            '<p><strong>쿼리스트링에 중첩 구조를 담는 표준 표기는 없습니다</strong> — RFC에 정의된 것이 ' +
            '없어 서버 프레임워크마다 관례가 다릅니다. 어느 쪽이 옳고 그르다가 아니라 서버에 맞추는 ' +
            '문제이므로 <code>paramsFormat</code>으로 고릅니다 (v2.11.0).</p>' +
            '<table class="api-table"><thead><tr><th>paramsFormat</th><th>출력</th>' +
            '<th>이 표기를 기본으로 파싱하는 곳</th></tr></thead><tbody>' +
            "<tr><td><code>'dot'</code> (기본)</td>" +
            '<td><code>page.selectPage=1</code><br><code>sorts[0].field=name</code></td>' +
            '<td>Spring MVC/Boot · ASP.NET Core</td></tr>' +
            "<tr><td><code>'bracket'</code></td>" +
            '<td><code>page[selectPage]=1</code><br><code>sorts[0][field]=name</code></td>' +
            '<td>qs(Express) · PHP · Rails · Laravel · jQuery <code>$.param()</code></td></tr>' +
            '</tbody></table>' +
            '<p><strong>배열 인덱스는 두 표기 모두 대괄호</strong>입니다 — Spring의 List 바인딩이 ' +
            '<code>sorts[0].field</code> 규약이기 때문입니다. 원시값 배열(<code>tags[0]=x</code>)도 두 ' +
            '표기가 같습니다.</p>',
          notes: [
            {
              title: 'paramsSerializer — 두 표기로도 안 될 때',
              body:
                '<p>반복 키(<code>tags=a&amp;tags=b</code>), JSON-in-query, ' +
                '<code>sortSpec=name:asc,pay:desc</code> 같은 compact 표기 등은 ' +
                '<code>paramsSerializer(params)</code>로 <strong>쿼리스트링 생성 전체를 ' +
                '대체</strong>합니다(<code>paramsFormat</code>보다 우선).</p>' +
                '<ul>' +
                '<li>인자 <code>params</code>는 <code>params</code> + <code>request</code>가 합쳐진 ' +
                '최종 객체입니다.</li>' +
                '<li>반환한 문자열이 그대로 <code>?</code> 뒤에 붙습니다 — <strong>인코딩도 직접 ' +
                '책임집니다</strong>(<code>encodeURIComponent</code>). 앞에 <code>?</code>나 ' +
                '<code>&amp;</code>가 붙어 있으면 떼고 붙입니다.</li>' +
                '<li>예외가 나면 <code>console.error</code> 후 기본 직렬화로 폴백합니다.</li>' +
                '<li>GET에서만 쓰입니다(POST는 body가 JSON).</li>' +
                '</ul>',
            },
          ],
          example:
            'dataSource: {\n' +
            "  url: '/api/employees',\n" +
            '  request: function (state) {\n' +
            '    return { sorts: state.sortModel };\n' +
            '  },\n' +
            "  paramsFormat: 'bracket',   // qs·PHP·Rails 서버라면 이렇게\n" +
            '\n' +
            '  // 두 표기로도 안 되면 직렬화를 통째로 대체 (paramsFormat보다 우선)\n' +
            '  // sorts=[{field,dir}] → sortSpec=name:asc,salary:desc\n' +
            '  paramsSerializer: function (params) {\n' +
            '    if (!params.sorts || !params.sorts.length) return "";\n' +
            '    var spec = params.sorts.map(function (s) {\n' +
            "      return s.field + ':' + s.dir;\n" +
            "    }).join(',');\n" +
            "    return 'sortSpec=' + encodeURIComponent(spec);\n" +
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
        {
          name: 'Step 8. 페이저 대신 무한 스크롤 — infiniteScroll',
          demo: 'infinite-scroll',
          since: '2.22.0',
          description:
            '<p><code>pagination</code> 대신 <code>infiniteScroll</code>을 켜면 바닥에 닿을 때마다 다음 ' +
            '페이지를 자동으로 받아 <strong>이어 붙입니다</strong>. 요청 파라미터는 서버 페이징과 똑같이 ' +
            '<code>page</code>/<code>pageSize</code>이므로 <strong>서버는 그대로 두고</strong> 옵션만 ' +
            '바꾸면 됩니다.</p>' +
            '<p><strong>서버가 할 일은 하나</strong> — 마지막 페이지임을 알려주는 것입니다. ' +
            '<code>last</code>(Spring Data <code>Page</code> 그대로) · <code>lastPage</code> · ' +
            '<code>isLast</code> · <code>hasMore</code> · <code>hasNext</code> 중 아무 이름이나 좋습니다. ' +
            '이걸 주면 하단 상태 바가 곧바로 "마지막 페이지"로 바뀌고, <strong>끝을 확인하려고 빈 페이지를 ' +
            '한 번 더 요청하지 않습니다.</strong> 플래그가 없으면 <code>total</code>로, 그것도 없으면 ' +
            '"받은 건수 &lt; pageSize"로 추론합니다.</p>' +
            '<p><code>parse</code>를 쓰는 경우, 플래그를 <strong>반환 객체에 실어도 되고 안 실어도 ' +
            '됩니다</strong> — 반환값에서 못 찾으면 <strong>원본 응답의 최상위</strong>에서 다시 찾습니다. ' +
            '다만 플래그가 envelope 안쪽(<code>json.result.last</code>)에 있으면 최상위가 아니므로 ' +
            '<code>parse</code>가 꺼내 올려줘야 합니다.</p>',
          example:
            '// 서버 응답: { "rows": [...], "last": false }\n' +
            'var grid = new DataGrid(el, {\n' +
            "  dataSource: { url: '/api/employees' },\n" +
            '  infiniteScroll: { pageSize: 50 },   // pagination·pageMode 지정 불필요\n' +
            '});\n' +
            '\n' +
            '// envelope 응답 — 플래그가 안쪽에 있으면 parse가 꺼내 올린다\n' +
            'dataSource: {\n' +
            "  url: '/api/employees',\n" +
            '  parse: function (json) {\n' +
            '    return { rows: json.result.items, last: json.result.last };\n' +
            '  },\n' +
            '}',
        },
        {
          name: 'Step 9. 첫 조회를 미루기 — autoLoad',
          demo: 'auto-load',
          since: '2.24.0',
          description:
            '<p>기본적으로 그리드는 생성되자마자 <code>dataSource</code>를 한 번 호출합니다. ' +
            '<strong>검색 조건을 받은 뒤에 조회하는 화면</strong>에서는 이 첫 요청이 낭비이고 ' +
            '(조건 없는 전체 조회) 비싼 쿼리라면 서버에도 부담입니다. ' +
            '<code>autoLoad: false</code>로 끄고 조회 시점을 소비자가 정하세요.</p>' +
            '<p>끄는 건 <strong>자동 조회뿐</strong>입니다 — <code>reloadData()</code>는 그대로 동작하고, ' +
            '한 번 조회한 뒤에는 정렬·필터·페이지 이동에 따른 자동 재조회도 평소처럼 일어납니다. ' +
            '조회 전까지 뭔가 보여주고 싶으면 <code>rowData</code>를 함께 주면 됩니다 ' +
            '(그 데이터가 첫 조회 때 교체됩니다).</p>',
          example:
            'var grid = new DataGrid(el, {\n' +
            '  dataSource: {\n' +
            "    url: '/api/employees',\n" +
            '    autoLoad: false,                       // 생성 시 조회하지 않는다\n' +
            '    params: function () {                  // 조회할 때마다 입력값을 읽는다\n' +
            '      return { dept: deptInput.value || undefined };\n' +
            '    },\n' +
            '  },\n' +
            "  pageMode: 'server',\n" +
            '  pagination: true,\n' +
            '});\n' +
            '\n' +
            "searchBtn.addEventListener('click', function () {\n" +
            '  grid.reloadData();   // 여기서부터 조회 — 이후 정렬·필터는 자동 재조회\n' +
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
            '③ <code>\'number\'</code>는 <code>align</code> 미지정 시 오른쪽 정렬 + 숫자 에디터가 기본이 되고, ' +
            '④ <code>\'date\'</code>는 <a href="#column-defs-editor"><code>editor</code></a> 미지정 시 ' +
            'date 에디터(날짜 피커)가 기본이 됩니다 (v2.8.0). ' +
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
          demo: 'agg-func-custom',
          type: "'sum' | 'avg' | 'min' | 'max' | 'count' | (values, ctx) => any",
          since: '1.1.0',
          description:
            '<p>이 컬럼의 집계 함수. <a href="#grid-options-groupBy"><code>groupBy</code></a> 그룹 헤더 행 · ' +
            '<a href="#grid-options-grandTotal"><code>grandTotal</code></a> 요약 행 · ' +
            '<a href="#grid-options-treeData"><code>treeData.summary</code></a> 부모 노드 행 ' +
            '<strong>세 곳 모두</strong>에 같은 규칙으로 적용됩니다.</p>' +
            '<p><code>count</code>를 제외한 내장 집계는 숫자로 해석 가능한 값만 집계하며(빈 값·문자 제외), ' +
            '집계값에도 <a href="#column-defs-valueFormatter"><code>valueFormatter</code></a>가 ' +
            '적용됩니다(이때 두 번째 인자 <code>row</code>는 <code>null</code>).</p>' +
            '<p>집계는 <strong>필터가 적용된 뒤의 행</strong>으로 매번 다시 계산되므로, 트리에서 ' +
            '"이름 (자손 수)" 같은 표시를 만들면 필터를 자동으로 따라갑니다.</p>',
          notes: [
            {
              title: '커스텀 함수 — (values, ctx) => any (v2.20)',
              body:
                '<ul>' +
                '<li><code>values</code> — 그 컬럼의 <strong>원본 값 배열</strong>입니다. null·빈 값도 ' +
                '들어 있고, 거르는 건 소비자 몫입니다.</li>' +
                '<li><code>ctx.rows</code> — 집계 대상 행. 그룹이면 그 그룹의 행, 트리면 자손 ' +
                '<strong>리프</strong>, 전체합계면 현재 뷰 전체입니다.</li>' +
                '<li><code>ctx.parent</code> — <strong>트리 요약에서만</strong> 부모 행이고 나머지 두 곳에서는 ' +
                '<code>null</code>입니다(그 자리엔 행 객체가 없습니다).</li>' +
                '<li>나머지는 <code>ctx.field</code> · <code>ctx.colDef</code>.</li>' +
                '</ul>' +
                '<p>반환값이 <code>null</code>/<code>undefined</code>면 그 셀은 비웁니다(내장 집계와 같은 ' +
                '규약). <code>0</code>과 빈 문자열은 유효한 결과로 그대로 표시됩니다.</p>' +
                '<p><strong>커스텀 함수의 결과에는 <code>valueFormatter</code>가 적용되지 않습니다</strong> — ' +
                '함수가 이미 출력을 결정했는데 포매터가 다시 가공하면 문자열 반환이 망가지기 때문입니다. ' +
                '함수가 예외를 던지면 그 집계만 비우고 <code>console.error</code>로 ' +
                '<strong>컬럼당 한 번</strong> 보고합니다(부모 노드마다 찍히면 콘솔이 쓸모없어지므로) — ' +
                '그리드는 계속 그려집니다.</p>',
            },
            {
              variant: 'warn',
              title: '요약 셀은 그 컬럼의 원래 값을 대체합니다',
              body:
                '<p>트리 컬럼에 <code>aggFunc</code>를 달면 부모 행의 이름 자리에 집계 결과가 ' +
                '그려집니다(들여쓰기·셰브론은 유지). 이름을 남기려면 <code>ctx.parent</code>에서 직접 ' +
                '만들어 붙이세요.</p>' +
                '<p>또 <a href="#grid-options-groupBy"><code>groupBy</code></a> 그룹 행은 ' +
                '"<code>aggFunc</code>가 없는 첫 컬럼"을 라벨 자리로 쓰므로, 첫 컬럼에 ' +
                '<code>aggFunc</code>를 달면 그룹 라벨이 다음 컬럼으로 밀립니다.</p>',
            },
          ],
          example:
            "{ field: 'salary', aggFunc: 'sum', align: 'right',\n" +
            "  valueFormatter: function (v) { return '$' + v.toLocaleString(); } }\n\n" +
            '// 트리: 부모 이름 옆에 자손 리프 수 — 필터를 자동으로 따라간다\n' +
            "{ field: 'name', headerName: 'Name', flex: 2,\n" +
            '  aggFunc: function (values, ctx) {\n' +
            "    return ctx.parent.name + ' (' + ctx.rows.length + ')';\n" +
            '  } }\n\n' +
            '// 중앙값처럼 내장에 없는 집계\n' +
            "{ field: 'salary', aggFunc: function (values) {\n" +
            '    var ns = values.map(Number).filter(function (n) { return !isNaN(n); }).sort(function (a, b) { return a - b; });\n' +
            '    if (!ns.length) return null;              // null = 표시하지 않음\n' +
            '    var m = Math.floor(ns.length / 2);\n' +
            '    return ns.length % 2 ? ns[m] : (ns[m - 1] + ns[m]) / 2;\n' +
            '  } }',
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
          type: "'text' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'radio' | 'checkbox' | { init, getValue, destroy? }",
          default: "'text'",
          since: '1.2.0',
          description:
            '<p>인라인 에디터 종류. 모두 <kbd>Enter</kbd>/바깥 클릭으로 커밋하고 <kbd>Esc</kbd>로 취소하며, ' +
            'editor를 선언하면 <a href="#column-defs-editable"><code>editable: true</code></a>는 ' +
            '생략할 수 있습니다 (v2.2.0).</p>' +
            '<p>생략하면 <code>dataType</code>/<code>filter</code>가 number면 숫자, ' +
            '<code>dataType: \'date\'</code>면 date 에디터, 아니면 텍스트 에디터가 선택됩니다.</p>',
          propsTitle: '에디터 종류',
          props: [
            {
              name: "'text'",
              default: '기본값',
              description: '한 줄 텍스트 입력.',
            },
            {
              name: "'number'",
              description: '커밋 시 숫자로 변환하고, 숫자가 아니면 이전 값으로 되돌립니다.',
            },
            {
              name: "'date' · 'datetime'",
              since: '2.8.0',
              description:
                '<p>브라우저 기본 날짜 피커(<code>&lt;input type="date"&gt;</code> / ' +
                '<code>datetime-local</code>)로 편집합니다. 커밋 값은 <strong>원본 타입을 보존</strong>합니다 — ' +
                '원본이 문자열이면 문자열(<a href="#column-defs-format"><code>format</code></a>이 날짜 패턴이면 ' +
                '그 표기로), <code>Date</code>면 <code>Date</code>, 타임스탬프 숫자면 숫자입니다.</p>' +
                '<p>입력을 비우면 <code>null</code>로 커밋해 날짜를 지웁니다(원본도 빈 값이면 변경 없음). ' +
                '선택 범위·정밀도·커밋 타입은 ' +
                '<a href="#column-defs-editorOptions"><code>editorOptions</code></a>의 ' +
                '<code>{ min, max, step, valueType }</code>로 조정합니다 ' +
                '(<a href="../examples/features.html#date-datetime-editor" target="_blank" rel="noopener">' +
                'date/datetime 데모 ↗</a>).</p>',
            },
            {
              name: "'select'",
              description:
                '<a href="#column-defs-editorOptions"><code>editorOptions</code></a>에서 단일 선택하는 드롭다운. ' +
                '<a href="#column-defs-editorSearch"><code>editorSearch</code></a>를 주면 검색 입력이 있는 ' +
                '옵션 패널로 바뀝니다 (v2.3.0).',
            },
            {
              name: "'radio'",
              description: 'select와 같은 단일 선택이지만, 셀에 앵커된 라디오 패널로 펼쳐집니다.',
            },
            {
              name: "'multiselect'",
              since: '2.2.0',
              description:
                '<p>셀 아래에 체크리스트 패널을 펼치고 <code>editorOptions</code> 순서로 커밋합니다 — ' +
                '내용이 같으면 커밋하지 않습니다.</p>' +
                '<p><a href="#column-defs-editorSearch"><code>editorSearch</code></a>를 주면 검색창 + ' +
                '체크리스트가 되고 고른 값은 칩으로 표시되며, 이때는 <strong>고른 순서</strong>로 커밋합니다 ' +
                '(v2.25 — <a href="../examples/features.html#searchable-multiselect" target="_blank" rel="noopener">' +
                '데모 ↗</a>).</p>',
            },
            {
              name: "'checkbox'",
              since: '2.2.0',
              description:
                '기본은 불리언 커밋입니다. ' +
                "<code>editorOptions: { checked: 'Y', unchecked: 'N' }</code> 매핑을 주면 그 값" +
                "('Y'/'N', 1/0 등)으로 읽고 커밋합니다. 매핑 없이도 'y'/'yes'/'true'/'1' 계열 문자열은 " +
                '체크로 인식합니다(커밋은 불리언).',
            },
            {
              name: '{ init, getValue, destroy? }',
              description:
                '<strong>커스텀 에디터.</strong> <code>init(cellEl, value, row, col)</code>으로 UI를 셀에 ' +
                '렌더링하고, 커밋 시 <code>getValue()</code>가 새 값을 반환하며, 닫힐 때 ' +
                '<code>destroy()</code>(선택)가 호출됩니다. <kbd>Enter</kbd>/<kbd>Esc</kbd>/포커스 이탈과 ' +
                '<a href="#column-defs-validator"><code>validator</code></a> · ' +
                '<a href="#events-beforeCellSave"><code>beforeCellSave</code></a> 검증이 내장 에디터와 ' +
                '동일하게 동작합니다.',
            },
          ],
          notes: [
            {
              title: '다중 값의 표현 — 배열과 콤마 문자열 (v2.21)',
              body:
                '<p><code>multiselect</code>는 <strong>두 표현을 모두 받습니다</strong> — ' +
                '<code>[\'js\', \'css\']</code>와 <code>"js,css"</code>(항목 앞뒤 공백 허용)가 같은 값이고, ' +
                '읽기·표시·편집·변경 판정이 모두 두 표현을 동일하게 다룹니다.</p>' +
                '<p>커밋할 때는 <strong>그 행이 원래 쓰던 표현을 유지</strong>합니다 — 배열이었으면 배열, ' +
                '문자열이었으면 콤마 문자열입니다. 원본이 <code>null</code>/빈 값이라 추론할 게 없으면 ' +
                '<strong>콤마 문자열이 기본</strong>입니다(편집 한 번에 컬럼의 값 타입이 바뀌면 서버 스키마와 ' +
                '어긋나므로). 전부 해제하면 문자열 컬럼은 <code>\'\'</code>, 배열 컬럼은 <code>[]</code>가 ' +
                '됩니다.</p>',
            },
            {
              variant: 'warn',
              title: '구분자는 쉼표로 고정입니다',
              body:
                '<p>옵션으로 열지 않습니다. <strong>옵션 값 자체에 쉼표가 들어 있으면 분해되므로</strong> ' +
                '그런 값은 배열로 저장하세요.</p>',
            },
          ],
          example:
            "// dataType만 줘도 date 에디터가 자동 선택된다 (값은 'yyyy-MM-dd' 문자열로 커밋)\n" +
            "{ field: 'hireDate', dataType: 'date', format: 'yyyy-MM-dd', editable: true }\n" +
            '\n' +
            "// 값이 Date 인스턴스면 커밋도 Date — 선택 범위는 editorOptions로 제한\n" +
            "{ field: 'reviewAt', editor: 'datetime', format: 'yyyy-MM-dd HH:mm',\n" +
            "  editorOptions: { min: '2026-01-01', max: '2026-12-31' } }\n" +
            '\n' +
            "{ field: 'skills', editor: 'multiselect',   // 값은 ['js','css'] 또는 'js,css'\n" +
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
          type: 'Array<string | { label, value }> | { checked, unchecked } | { min, max, step, valueType }',
          description:
            '<p>에디터의 부가 설정. <a href="#column-defs-editor"><code>editor</code></a> 종류에 따라 ' +
            '받는 형식이 다릅니다.</p>',
          propsTitle: 'editor 종류별 형식',
          props: [
            {
              name: "'select' · 'multiselect' · 'radio'",
              type: 'Array<string | { label, value }>',
              description:
                '<p>선택지 목록. 문자열 배열이면 표시와 저장에 같은 값을 쓰고, ' +
                '<code>{ label, value }</code> 객체 배열(v2.2.0)이면 편집 UI에는 <code>label</code>이 ' +
                '표시되고 선택 시 <code>value</code>가 데이터에 저장됩니다.</p>' +
                '<p>셀에는 저장된 value가 그대로 보이므로, label로 표시하려면 짝꿍 렌더러 ' +
                '<a href="#renderers-select"><code>DataGrid.renderers.select()</code></a> · ' +
                '<a href="#renderers-radio"><code>radio()</code></a> · ' +
                '<a href="#renderers-multiselect"><code>multiselect()</code></a>를 쓰세요. ' +
                '<code>value</code>의 원본 타입은 보존됩니다 — 숫자 value를 고르면 숫자로 ' +
                '커밋됩니다.</p>',
            },
            {
              name: "'checkbox'",
              type: '{ checked, unchecked }',
              description:
                "배열 대신 매핑 객체를 받습니다. 예를 들어 " +
                "<code>{ checked: 'Y', unchecked: 'N' }</code>이면 읽기·커밋 모두 그 값을 씁니다.",
            },
            {
              name: "'date' · 'datetime'",
              type: '{ min, max, step, valueType }',
              since: '2.8.0',
              description:
                '<ul>' +
                "<li><code>min</code> · <code>max</code> — 선택 가능한 날짜 범위. " +
                "<code>'yyyy-MM-dd'</code> 문자열 · <code>Date</code> · 타임스탬프 모두 가능합니다.</li>" +
                '<li><code>step</code> — 초 단위 정밀도(예: <code>60</code>).</li>' +
                "<li><code>valueType</code> — 커밋 타입을 <code>'date'</code>(Date) · " +
                "<code>'timestamp'</code>(숫자) · <code>'string'</code>(문자열) 중 하나로 고정합니다. " +
                "생략하면 <code>'auto'</code>로 원본 값의 타입을 보존합니다.</li>" +
                '</ul>',
            },
          ],
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
            '<p><a href="#column-defs-editor"><code>editor: \'select\'</code></a>(단일 선택)와 ' +
            '<code>editor: \'multiselect\'</code>(다중 선택, v2.25)를 ' +
            '<strong>검색 입력이 있는 옵션 패널</strong>로 바꿉니다.</p>' +
            '<p>옵션을 고르지 않고 닫으면 값이 바뀌지 않습니다. fetch가 실패하면 ' +
            '<code>console.error</code> 후 "Load failed"가 표시되며, 이전 응답이 늦게 도착해도 최신 질의만 ' +
            '반영됩니다.</p>',
          props: [
            {
              name: 'true',
              description:
                '정적 <a href="#column-defs-editorOptions"><code>editorOptions</code></a>를 로컬에서 ' +
                '필터합니다 — label 또는 문자열화한 value의 부분 일치이며 대소문자를 가리지 않습니다.',
            },
            {
              name: 'fetch',
              type: '(query, row, col) => Promise<options>',
              description:
                '질의마다 비동기로 목록을 불러옵니다(lazy 검색). 반환 형식은 ' +
                '<code>editorOptions</code>와 동일합니다.',
            },
            {
              name: 'debounce',
              type: 'number',
              default: '250',
              description: '입력이 멈춘 뒤 fetch까지의 지연(ms).',
            },
            {
              name: 'minLength',
              type: 'number',
              default: '0',
              description: 'fetch를 시작할 최소 글자 수.',
            },
            {
              name: 'placeholder',
              type: 'string',
              default: "'Search…'",
              description: '검색 입력의 플레이스홀더.',
            },
          ],
          notes: [
            {
              title: 'select — 단일 선택',
              body:
                '<p><kbd>↑</kbd>/<kbd>↓</kbd>로 이동하고 <kbd>Enter</kbd>로 선택·커밋합니다. 옵션 클릭은 ' +
                '즉시 커밋, <kbd>Esc</kbd>는 취소입니다.</p>' +
                '<p>lazy로 고른 값의 label 표시는 짝꿍 렌더러 ' +
                '<a href="#renderers-searchselect"><code>renderers.searchselect()</code></a>가 ' +
                '담당합니다.</p>',
            },
            {
              title: 'multiselect — 다중 선택 (v2.25)',
              body:
                '<p>고른 값이 <strong>칩</strong>으로 검색창 위에 상시 표시됩니다. 선택 상태를 DOM이 아니라 ' +
                '별도로 들고 있으므로, 필터로 목록에서 가려지거나 lazy 질의로 목록이 통째로 갈려도 선택이 ' +
                '사라지지 않습니다. 칩의 <code>×</code> 또는 항목 재클릭으로 해제합니다 ' +
                '(<a href="../examples/features.html#searchable-multiselect" target="_blank" rel="noopener">' +
                '데모 ↗</a>).</p>' +
                '<p>저장 순서는 <strong>고른 순서</strong>입니다 — 검색이 없는 multiselect의 ' +
                '"editorOptions 순서"와 다릅니다(lazy에는 전체 목록이라는 것이 없습니다). 값 표현은 원본을 ' +
                '따라 배열이면 배열, 콤마 문자열이면 콤마 문자열로 되돌려 커밋합니다. 셀 표시는 ' +
                '<a href="#renderers-multiselect"><code>renderers.multiselect()</code></a>가 같은 label ' +
                '캐시를 봅니다.</p>',
            },
            {
              title: 'Enter의 의미는 목록이 보이는지에 따라 갈립니다 (v2.25.1)',
              body:
                '<ul>' +
                '<li><kbd>↑</kbd>/<kbd>↓</kbd>로 고른 <strong>활성 항목이 있으면 토글</strong>합니다.</li>' +
                '<li>활성 항목이 없으면 폼에서는 목록만 닫고, 셀에서는 커밋합니다.</li>' +
                '<li><strong>목록이 접혀 있으면 토글하지 않습니다</strong> — 폼에서는 그 <kbd>Enter</kbd>가 ' +
                '저장으로 넘어갑니다.</li>' +
                '</ul>' +
                '<p>마우스로 항목을 고르면 키보드 커서가 지워지므로, <strong>고른 직후의 <kbd>Enter</kbd>가 ' +
                '방금 고른 항목을 되돌리지 않습니다.</strong></p>',
            },
          ],
          example:
            "{ field: 'city', editor: 'select',\n" +
            '  editorSearch: {\n' +
            '    minLength: 1, debounce: 300,\n' +
            "    fetch: function (query) { return fetch('/api/cities?q=' + query).then(r => r.json()); },\n" +
            '  },\n' +
            '  cellRenderer: DataGrid.renderers.searchselect() }\n' +
            '\n' +
            '// 다중 선택 + 검색 (v2.25) — 고른 값은 칩으로 표시된다\n' +
            "{ field: 'regions', editor: 'multiselect',\n" +
            "  editorSearch: { fetch: function (q) { return fetch('/api/regions?q=' + q).then(r => r.json()); } },\n" +
            '  cellRenderer: DataGrid.renderers.multiselect() }',
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
          name: 'required',
          demo: 'required-columns',
          type: 'boolean',
          default: 'false',
          since: '2.19.0',
          description:
            '<p><strong>표시와 검증을 한 번에</strong> 켭니다. 빈 값 커밋이 거부되며 인라인 편집 · ' +
            '팝업 폼 · 붙여넣기(<code>pasteTsv</code>) · <code>updateRows</code> · 채우기 드래그가 모두 ' +
            '같은 규칙을 따릅니다. 메시지는 <code>localeText.requiredValue</code>' +
            '(<code>{column}</code> 토큰)에서 옵니다.</p>',
          notes: [
            {
              title: '빈 값의 정의',
              body:
                '<p><code>null</code> · <code>undefined</code> · 빈 문자열 · 공백만 있는 문자열 · ' +
                '빈 배열(<code>multiselect</code>).</p>' +
                '<p><code>0</code>과 <code>false</code>는 <strong>유효한 값</strong>입니다 — 숫자 0이나 ' +
                '체크 해제를 미입력으로 취급하면 정상 값의 저장을 막게 됩니다.</p>',
            },
            {
              title: '그리드 표시는 셀 마커 하나입니다 (v2.19.1)',
              body:
                '<p><strong>비어 있는 셀에만</strong> 모서리 마커' +
                '(<a href="#theming--dg-required-color"><code>--dg-required-color</code></a>)가 붙어 ' +
                '<em>조치가 필요한 곳</em>을 가리킵니다. 필수 컬럼의 모든 셀에 그리면 전부 같은 표시라 ' +
                '정보량이 0이기 때문입니다(헤더 표식은 제거됐고, <code>*</code>는 <strong>팝업 폼 ' +
                '라벨에만</strong> 남습니다).</p>' +
                '<p>마커 자리는 <a href="#grid-options-trackChanges"><code>trackChanges</code></a>의 ' +
                '수정됨 마커(<strong>왼쪽 위 주황</strong>)와 겹치지 않는 <strong>오른쪽 위</strong>입니다 — ' +
                '한 셀에 둘이 동시에 뜰 수 있습니다.</p>',
            },
            {
              title: '다른 옵션과의 관계',
              body:
                '<ul>' +
                '<li><a href="#column-defs-editor"><code>editor</code></a>와 같은 규약으로 ' +
                '<strong>편집 의도로 해석</strong>되어, <code>editable</code>을 생략하면 ' +
                '<code>true</code>가 됩니다(명시적 <code>editable: false</code>가 우선).</li>' +
                '<li>표시 기준은 <a href="#grid-options-editableIndicator"><code>editableIndicator</code></a>와 ' +
                '같아 <strong>그리드를 잠그면(<code>setEditable(false)</code>) 셀 마커가 사라집니다</strong> — ' +
                '고칠 수 없는 자리의 "필수"는 할 일이 없기 때문입니다. 편집 불가 컬럼도 같은 이유로 ' +
                '표시하지 않습니다.</li>' +
                '<li><a href="#column-defs-validator"><code>validator</code></a>보다 ' +
                '<strong>먼저</strong> 검사되고, 빈 값이면 <code>validator</code>는 호출되지 않습니다 — ' +
                '소비자마다 빈 값 처리를 중복 작성하지 않게.</li>' +
                '<li><a href="#column-defs-popupEditor"><code>popupEditor.required</code></a>로 폼에서만 ' +
                '다르게 지정할 수 있습니다.</li>' +
                '</ul>',
            },
            {
              variant: 'warn',
              title: 'number · date 에디터는 인라인에서 빈 값을 만들지 않습니다',
              body:
                '<p>빈 입력이 기존 정규화 규칙에 따라 <strong>이전 값으로 되돌아가므로</strong> 인라인에서는 ' +
                '애초에 빈 값이 커밋되지 않습니다 — 이 컬럼들에서 required 오류 메시지를 보는 경로는 ' +
                '팝업 폼과 붙여넣기입니다.</p>' +
                '<p>또 <code>pasteTsv(\'\')</code>는 빈 문자열 가드에서 곧바로 <code>0</code>을 반환해 ' +
                '검증을 거치지 않습니다.</p>',
            },
          ],
          example:
            "{ field: 'city', headerName: 'City', editor: 'select', editorOptions: cities,\n" +
            '  required: true }   // editable도 함께 켜진다\n\n' +
            '// required가 먼저 검사되므로 validator는 빈 값을 볼 일이 없다\n' +
            "{ field: 'salary', headerName: 'Salary', editor: 'number', required: true,\n" +
            "  validator: function (v) { return v >= 40000 || '40,000 이상이어야 합니다'; } }",
        },
        {
          name: 'popupEditor',
          demo: 'popup-editor-custom',
          type: 'false | object',
          since: '2.16.0',
          description:
            '<p><a href="#grid-options-popupEditor">팝업 폼</a> 안에서만 적용되는 ' +
            '<strong>컬럼 오버레이</strong>입니다. 그리드 셀의 표시·동작은 전혀 바뀌지 않고, 원본 컬럼 ' +
            '정의도 변경되지 않습니다 — 셀은 좁아서 <code>select</code>, 폼은 넓어서 검색형처럼 ' +
            '<strong>맥락별로 다르게</strong> 쓰는 것이 주 용도입니다.</p>' +
            '<p><code>popupEditor: false</code>면 그 컬럼을 폼에서 제외합니다.</p>',
          props: [
            {
              name: 'label',
              type: 'string',
              default: 'headerName',
              description: '폼에서 쓸 필드 라벨.',
            },
            {
              name: 'hint',
              type: 'string',
              description: '입력 아래에 표시할 도움말.',
            },
            {
              name: 'hide',
              type: 'boolean',
              description:
                '기본은 컬럼의 <code>hide</code>를 따르지만 <strong>여기 지정한 값이 이깁니다</strong> — ' +
                '<code>hide: false</code>로 "그리드에선 숨기고 폼에서만 편집"이 됩니다.',
            },
            {
              name: 'readonly',
              type: 'boolean',
              description:
                '마찬가지로 컬럼의 <code>editable</code>을 덮어씁니다. 단 ' +
                '<code>setEditable(false)</code> 그리드 잠금은 못 이깁니다.',
            },
            {
              name: 'order',
              type: 'number',
              description: '작을수록 앞. 지정한 필드만 움직이고 나머지는 컬럼 순서를 유지합니다.',
            },
            {
              name: 'span',
              type: 'boolean',
              description: '<code>columns: 2</code>에서 두 칸을 차지합니다.',
            },
            {
              name: 'editor · editorOptions · editorSearch · validator',
              description: '폼에서만 다른 위젯·선택지·검증을 씁니다. 형식은 원본 컬럼 옵션과 같습니다.',
            },
            {
              name: 'required',
              type: 'boolean',
              since: '2.19.0',
              description:
                '폼에서만 필수로 올리거나 해제합니다. 그리드 셀의 마커는 원본 컬럼의 ' +
                '<a href="#column-defs-required"><code>required</code></a>를 따릅니다.',
            },
            {
              name: 'buttons',
              type: 'object[]',
              description:
                '<p>입력 오른쪽에 붙는 버튼 배열. 그리드 레벨 ' +
                '<a href="#grid-options-popupEditor"><code>buttons</code></a>와 같은 형식이되 내장 ' +
                '<code>\'save\'</code>/<code>\'cancel\'</code>은 무시됩니다.</p>' +
                '<p><code>onLoad(ctx)</code>도 같이 지원합니다 — 필드 버튼의 <code>onLoad</code>가 푸터 ' +
                '버튼보다 먼저 호출되고, 그 시점에 <strong>모든 필드가 이미 존재</strong>하므로 뒤 필드의 ' +
                '값도 초기화할 수 있습니다.</p>',
            },
            {
              name: 'before · after',
              type: '(ctx) => string | Element',
              description: '필드 위/아래에 임의 콘텐츠를 넣습니다.',
            },
          ],
          notes: [
            {
              title: 'ctx 객체',
              body:
                '<p><code>{ grid, data, colDef, field, fieldEl, buttonEl, value, values, ' +
                'getValue(field), setValue(field, v), isValid(), reset(), save(), cancel(), close() }</code> ' +
                '— <code>buttonEl</code>은 버튼 콜백에서만 채워집니다.</p>',
            },
            {
              variant: 'warn',
              title: 'before / after의 반환 문자열은 이스케이프되지 않습니다',
              body:
                '<p>HTML로 그대로 삽입됩니다(<a href="#column-defs-cellRenderer"><code>cellRenderer</code></a>와 ' +
                '동일한 규약). 입력 자체를 대체하려면 이 슬롯이 아니라 ' +
                '<a href="#column-defs-editor"><code>editor</code></a>의 커스텀 객체' +
                '(<code>{ init, getValue, destroy }</code>)를 쓰세요 — 팝업에서도 그대로 동작합니다.</p>',
            },
          ],
          example:
            "{ field: 'city', headerName: 'City', editor: 'select', editorOptions: cities,\n" +
            '  popupEditor: {\n' +
            "    label: '근무 도시',\n" +
            '    order: 0,                 // 폼에서는 맨 위로\n' +
            '    editorSearch: true,       // 폼에서만 검색형 select로 교체\n' +
            "    buttons: [{ key: 'hq', text: '본사',\n" +
            '      onLoad: function (ctx) {                     // 빈 값이면 로드 시점에 채운다\n' +
            "        if (!ctx.getValue('city')) ctx.setValue('city', 'Seoul');\n" +
            '      },\n' +
            "      onClick: function (ctx) { ctx.setValue('city', 'Seoul'); } }],\n" +
            "    after: function (ctx) { return '<span>저장된 값: ' + ctx.data.city + '</span>'; },\n" +
            '  } }',
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
            '<strong>이 컬럼을 두면 그리드의 선택 진입점이 여기로 한정됩니다</strong>(v2.17) — ' +
            '다른 셀을 클릭해도 선택이 바뀌지 않고, 체크박스 셀은 체크박스를 정확히 누르지 않고 ' +
            '셀 여백을 클릭해도 토글됩니다(비활성 체크박스는 여백도 무시). ' +
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
          signature: 'reloadData(options?: { keepPage?: boolean }): void',
          since: '1.2.0',
          description:
            '<p><a href="#grid-options-dataSource"><code>dataSource</code></a>에서 데이터를 다시 ' +
            '불러옵니다. <strong>1페이지로 되돌린 뒤</strong> 요청하며(2.14.0부터), server 모드인 축의 현재 ' +
            '상태(정렬·필터)가 요청 파라미터로 전달됩니다. 응답이 오면 행을 교체하고 ' +
            '<a href="#events-dataChanged"><code>dataChanged</code></a>를 발생시키며, 여러 요청이 겹치면 ' +
            '마지막 요청만 반영됩니다.</p>' +
            '<p>저장 후 <strong>보던 페이지 그대로</strong> 새로고침하려면 ' +
            '<code>reloadData({ keepPage: true })</code>를 쓰세요. ' +
            '<code>dataSource.autoLoad: false</code>로 자동 조회를 꺼둔 그리드에서 ' +
            '<strong>첫 조회를 시작하는 것도 이 메서드</strong>입니다(2.24.0).</p>',
          notes: [
            {
              title: '1페이지로 되돌리는 이유',
              body:
                '<p>이 메서드는 조회 조건이 바뀌어 호출하는 경우가 대부분입니다. 12페이지를 보던 중 조건이 ' +
                '좁혀져 결과가 3페이지로 줄면, 페이지를 유지한 채로는 범위 밖 페이지(빈 화면)에 머물게 ' +
                '됩니다. <a href="#api-methods-setDataSource"><code>setDataSource()</code></a>가 1페이지로 ' +
                '리셋하는 것과도 일관됩니다.</p>' +
                '<p>정렬 클릭·필터 변경·페이지 이동에 따른 자동 재조회는 이 메서드를 거치지 않으므로 ' +
                '영향받지 않습니다 — 페이지 이동은 이동한 페이지를, 필터는 1페이지를 요청합니다. ' +
                '조회 조건 변경 패턴은 ' +
                '<a href="#remote-data-guide-Step-5-params-reloadData">가이드 Step 5</a>를 참고하세요.</p>',
            },
          ],
          example:
            'grid.reloadData();                    // 조건 변경 후 — 1페이지부터\n' +
            'grid.reloadData({ keepPage: true });  // 저장 후 새로고침 — 보던 페이지 유지',
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
          name: 'loadMore',
          demo: 'infinite-scroll',
          group: 'Data',
          signature: 'loadMore(): boolean',
          since: '2.22.0',
          description:
            '<code>infiniteScroll</code>에서 다음 페이지를 <strong>수동으로</strong> 불러옵니다 — ' +
            '스크롤이 생기지 않는 레이아웃이나 "더 보기" 버튼용입니다. ' +
            '요청을 시작했으면 <code>true</code>, 이미 마지막이거나 로드 중이거나 무한 스크롤이 ' +
            '아니면 <code>false</code>를 반환합니다. ' +
            '<code>autoLoad: false</code>로 아직 아무것도 받지 않은 상태라면 ' +
            '이어받기가 아니라 <strong>첫 페이지</strong>를 불러옵니다(2.24.0) — ' +
            '받지도 않은 페이지의 "다음"을 요청하면 첫 페이지가 통째로 비기 때문입니다.',
          example:
            'if (!grid.loadMore()) {\n' +
            "  console.log(grid.hasMoreRows() ? '로드 중' : '마지막 페이지');\n" +
            '}',
        },
        {
          name: 'hasMoreRows',
          demo: 'infinite-scroll',
          group: 'Data',
          signature: 'hasMoreRows(): boolean',
          since: '2.22.0',
          description:
            '아직 받을 페이지가 남아 있는지. <code>infiniteScroll</code>이 아니면 항상 ' +
            '<code>false</code>입니다.',
          example: 'moreBtn.disabled = !grid.hasMoreRows();',
        },
        {
          name: 'addRow',
          demo: 'add-row-index',
          group: 'Data',
          signature: 'addRow(row: object, index?: number): void',
          description:
            '행 하나를 추가합니다. <code>addRows(rows, index?)</code>로 여러 행을 한 번에 추가할 수 있습니다. ' +
            '<code>index</code>(since 2.7.0)를 주면 그 위치에 삽입됩니다 — <code>0</code>이면 맨 앞, 생략하면 맨 뒤, ' +
            '범위를 벗어나면 <code>[0, 행 수]</code>로 클램프. index는 원본 배열 기준이므로 정렬/그룹핑이 켜져 있으면 ' +
            '표시 순서는 뷰 파이프라인이 결정합니다. undo/redo도 삽입 위치를 보존합니다.',
          example: "grid.addRow({ name: '새 직원' }, 0);   // 맨 앞에 삽입",
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
          description:
            '지정한 행들을 제거합니다. <code>removeSelectedRows()</code>는 선택된 행을 제거합니다. ' +
            '<code>softDelete: true</code>면 기준선(서버) 행은 제거 대신 "삭제 표시"가 되고 ' +
            '추가된(신규) 행만 실제로 제거됩니다.',
        },
        {
          name: 'restoreRows',
          demo: 'builtin-crud-staging',
          group: 'Data',
          signature: 'restoreRows(rows: object[]): number',
          since: '2.6.0',
          description:
            '<code>softDelete</code>로 삭제 표시된 행을 복원합니다(표시 해제). 복원된 행 수를 반환하며, ' +
            '삭제 표시가 아닌 행은 무시됩니다. undo/redo 히스토리에도 기록됩니다.',
          example: 'grid.restoreRows(grid.getSelectedRows());',
        },
        {
          name: 'getRowStatus',
          demo: 'builtin-crud-staging',
          group: 'Data',
          signature: "getRowStatus(row: object): 'added' | 'updated' | 'deleted' | null",
          since: '2.6.0',
          description:
            '변경 추적 기준 행 상태를 반환합니다 — <code>statusColumn</code>이 표시하는 값과 동일합니다. ' +
            '기준선 그대로인 행은 <code>null</code>. <code>trackChanges</code>(또는 이를 자동 활성화하는 ' +
            '<code>softDelete</code>/<code>statusColumn</code>)가 필요합니다.',
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
          name: 'openEditPopup',
          demo: 'popup-editor',
          group: 'Editing',
          signature: 'openEditPopup(row: object, field?: string): boolean',
          since: '2.16.0',
          description:
            '<a href="#grid-options-popupEditor">팝업 편집 폼</a>을 엽니다. <code>field</code>를 주면 ' +
            '그 필드에 포커스하고, 없으면 첫 편집 가능 필드에 포커스합니다. ' +
            '<code>popupEditor</code>가 꺼져 있거나, 그리드가 잠겨 있거나(<code>setEditable(false)</code>), ' +
            '<code>softDelete</code>로 삭제 표시된 행이거나, 행이 그리드에 없으면 <code>false</code>를 반환합니다. ' +
            '<a href="#events-beforePopupEdit"><code>beforePopupEdit</code></a>에서 취소해도 <code>false</code>입니다. ' +
            '<code>trigger: \'none\'</code>이어도 이 메서드는 동작하므로 툴바 버튼에서 열 수 있습니다.',
          example:
            "grid.openEditPopup(grid.getSelectedRows()[0], 'city');",
        },
        {
          name: 'closeEditPopup',
          demo: 'popup-editor',
          group: 'Editing',
          signature: 'closeEditPopup(commit?: boolean): void',
          since: '2.16.0',
          description:
            '열린 팝업을 닫습니다. <code>commit === true</code>면 Save와 같은 경로를 타므로 ' +
            '검증에 실패하면 닫히지 않습니다. 그 밖에는 변경을 폐기하고 닫습니다 ' +
            '(<code>instantUpdate</code>면 연 시점으로 롤백).',
        },
        {
          name: 'isPopupEditing',
          demo: 'popup-editor',
          group: 'Editing',
          signature: 'isPopupEditing(): boolean',
          since: '2.16.0',
          description: '팝업 편집 폼이 열려 있는지 반환합니다.',
        },
        {
          name: 'getPopupValues',
          demo: 'popup-editor',
          group: 'Editing',
          signature: 'getPopupValues(): object | null',
          since: '2.16.0',
          description:
            '팝업 폼의 <strong>현재 입력 값</strong> 스냅샷을 반환합니다(아직 행에 반영되지 않은 값 포함). ' +
            '열려 있지 않으면 <code>null</code>. 사본이므로 수정해도 폼에 영향이 없습니다 — ' +
            '값을 바꾸려면 버튼 콜백의 <code>ctx.setValue(field, value)</code>를 쓰세요.',
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
          description:
            '<p>페이지 크기를 변경합니다. 현재 보고 있던 첫 행이 포함된 페이지로 이동합니다.</p>' +
            '<p><a href="#grid-options-infiniteScroll"><code>infiniteScroll</code></a>에서는 ' +
            '<strong>"한 번에 받을 행 수"</strong>가 되며, 쌓인 것을 버리고 새 크기로 0페이지부터 다시 ' +
            '받습니다(스크롤도 맨 위로). 상태 바의 크기 선택 UI가 이 메서드를 호출합니다(2.23.0).</p>',
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
            '서버 저장이 성공한 뒤 호출하세요. <code>softDelete</code>로 삭제 표시된 행은 이 시점에 ' +
            '물리 제거됩니다(물리 제거를 가로지르는 undo는 지원하지 않아 히스토리도 비워집니다).',
        },
        {
          name: 'rollbackChanges',
          demo: 'change-tracking',
          group: 'Change Tracking',
          signature: 'rollbackChanges(): void',
          since: '1.2.0',
          description:
            '모든 변경을 기준선으로 되돌립니다: 수정 값 원복, 추가 행 제거, 삭제 행을 원래 위치에 복원 ' +
            '(<code>softDelete</code>의 삭제 표시 행은 표시만 해제 — 행은 이미 제자리). ' +
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
          name: 'locales',
          demo: 'locale-text',
          group: 'Utility',
          signature: 'DataGrid.locales.en | DataGrid.locales.ko : object',
          since: '2.15.0',
          description:
            '내장 로케일 문자열 맵입니다(<strong>정적</strong>). ' +
            '<a href="#grid-options-localeText"><code>localeText</code></a> 옵션에 그대로 넘기거나, ' +
            '전개 후 원하는 키만 덮어써서 부분 커스터마이즈합니다. ' +
            '접근할 때마다 <strong>사본</strong>을 돌려주므로 반환값을 수정해도 원본과 다른 그리드에 영향이 없습니다. ' +
            '전체 키 목록은 <a href="#locale-guide">UI 문자열 다국어 가이드</a> 참고.',
          example:
            "localeText: DataGrid.locales.ko\n\n" +
            "// 일부만 바꾸기\n" +
            "localeText: Object.assign({}, DataGrid.locales.ko, {\n" +
            "  noRowsToShow: '조건에 맞는 직원이 없습니다',\n" +
            "  pageSummary: '전체 {total}명 중 {from}–{to}',\n" +
            "})",
        },
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
          name: 'beforePopupEdit',
          demo: 'popup-editor',
          payload: '{ data, field, cancel }',
          since: '2.16.0',
          description:
            '<strong>취소 가능 이벤트</strong> — <a href="#grid-options-popupEditor">팝업 폼</a>이 ' +
            '열리기 직전에 발생합니다. <code>e.cancel = true</code>면 열리지 않고 ' +
            '<code>openEditPopup()</code>은 <code>false</code>를 반환합니다. ' +
            '<code>e.field</code>는 트리거된 컬럼(API 호출 시 인자, 없으면 <code>null</code>).',
          example:
            "grid.on('beforePopupEdit', function (e) {\n" +
            "  if (e.data.locked) e.cancel = true;   // 잠긴 행은 폼을 열지 않는다\n" +
            '});',
        },
        {
          name: 'popupEditStarted',
          demo: 'popup-editor',
          payload: '{ data, field }',
          since: '2.16.0',
          description: '팝업 폼이 열려 필드가 모두 생성된 뒤 발생합니다.',
        },
        {
          name: 'popupFieldChanged',
          demo: 'popup-editor-custom',
          payload: '{ data, colDef, oldValue, newValue }',
          since: '2.16.0',
          description:
            '팝업 폼 <strong>안에서</strong> 값이 바뀔 때마다 발생합니다. ' +
            '<code>instantUpdate</code>가 아니면 이 시점에는 <strong>아직 행에 반영되지 않았습니다</strong> ' +
            '(행에 실제로 쓰이는 시점은 <code>cellValueChanged</code>). ' +
            '실시간 미리보기나 다른 필드 연동에 씁니다.',
          example:
            "grid.on('popupFieldChanged', function (e) {\n" +
            "  status.textContent = e.colDef.headerName + ': ' + e.oldValue + ' → ' + e.newValue;\n" +
            '});',
        },
        {
          name: 'beforePopupSave',
          demo: 'popup-editor',
          payload: '{ data, values, cancel }',
          since: '2.16.0',
          description:
            '<strong>취소 가능 이벤트</strong> — 검증을 통과하고 값이 행에 쓰이기 직전에 한 번 발생합니다. ' +
            '<code>e.cancel = true</code>면 저장이 멈추고 폼이 유지됩니다. ' +
            '<code>e.values</code>(전체 필드 값 사본)를 수정하면 그 값으로 저장됩니다 — 일괄 정규화 훅입니다. ' +
            '이후 변경된 필드마다 <a href="#events-beforeCellSave"><code>beforeCellSave</code></a>가 ' +
            '한 번 더 발생하고, 그중 하나라도 거부하면 <strong>아무것도 저장되지 않습니다</strong>' +
            '(반쯤 저장되는 상태를 만들지 않기 위해). ' +
            '<code>instantUpdate</code> 모드에서는 이미 필드 단위로 커밋되었으므로 발생하지 않습니다.',
          example:
            "grid.on('beforePopupSave', function (e) {\n" +
            "  e.values.name = e.values.name.trim();   // 저장 전 일괄 정규화\n" +
            '});',
        },
        {
          name: 'popupEditStopped',
          demo: 'popup-editor',
          payload: '{ data, committed, changes }',
          since: '2.16.0',
          description:
            '팝업 폼이 닫힐 때 발생합니다. <code>committed</code>는 저장 여부, ' +
            '<code>changes</code>는 <code>{ field: { oldValue, newValue } }</code> 형태의 변경 묶음입니다 ' +
            '(취소면 빈 객체). 실제 값 저장은 표준 <code>cellValueChanged</code>·' +
            '<code>rowValueChanged</code>로도 발생하므로 기존 핸들러가 그대로 동작합니다.',
          example:
            "grid.on('popupEditStopped', function (e) {\n" +
            "  if (e.committed) save(e.data, Object.keys(e.changes));\n" +
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
            '콘솔에도 기록되며 기존 행은 유지됩니다. <code>infiniteScroll</code>의 추가 로드가 ' +
            '실패하면 <strong>페이지 번호가 되돌려지므로</strong> 다음 시도가 같은 페이지를 다시 요청합니다 ' +
            '(건너뛰지 않습니다).',
        },
        {
          name: 'rowsAppended',
          demo: 'infinite-scroll',
          payload: '{ rows, page, loaded, hasMore }',
          since: '2.22.0',
          description:
            '<code>infiniteScroll</code>이 다음 페이지를 이어 붙였을 때. <code>rows</code>는 ' +
            '<strong>이번에 받은 행만</strong>, <code>loaded</code>는 누적 행 수, ' +
            '<code>page</code>는 방금 받은 페이지 번호(0-based)입니다. ' +
            '누적을 버리고 다시 쌓는 경우(정렬·필터 변경, <code>reloadData()</code>)에는 ' +
            '발생하지 않습니다 — 그때는 <code>dataChanged</code>를 쓰세요.',
          example:
            "grid.on('rowsAppended', function (e) {\n" +
            "  status.textContent = e.loaded + '행 로드됨';\n" +
            '});',
        },
        {
          name: 'lastPageReached',
          demo: 'infinite-scroll',
          payload: '{ loaded, total }',
          since: '2.22.0',
          description:
            '더 받을 페이지가 없다고 판정된 순간 <strong>한 번만</strong> 발생합니다(전이 시점). ' +
            '<code>total</code>은 서버가 <code>total</code>을 준 경우에만 숫자이고, 아니면 ' +
            '<code>null</code>입니다 — 마지막 페이지 플래그만 주는 서버에서는 <code>loaded</code>가 ' +
            '유일한 전체 건수입니다. 정렬·필터로 다시 쌓기 시작하면 상태가 초기화되므로 ' +
            '조건이 바뀔 때마다 다시 발생할 수 있습니다.',
          example:
            "grid.on('lastPageReached', function (e) {\n" +
            "  moreBtn.disabled = true;\n" +
            '});',
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
            'multiselect 에디터의 짝꿍 렌더러 — 다중 값을 label 칩 목록으로 표시합니다. ' +
            '<strong>배열과 콤마 구분 문자열을 모두 받습니다</strong>(v2.21) — ' +
            '<code>[\'js\',\'css\']</code>와 <code>"js,css"</code>·<code>"js, css"</code>가 같은 결과를 냅니다. ' +
            '<code>options</code>를 생략하면 그 컬럼의 <code>editorOptions</code>를 사용하고, ' +
            '빈 배열·빈 문자열·null은 빈 셀입니다. label은 HTML 이스케이프됩니다. ' +
            "정적 목록에 없는 값은 <strong>lazy 검색(<a href='#column-defs-editorSearch'><code>editorSearch." +
            'fetch</code></a>)으로 고를 당시의 label 캐시</strong>를 보고(v2.25 — 단일 값 쪽 ' +
            "<a href='#renderers-searchselect'><code>searchselect</code></a>와 같은 출처), " +
            '캐시에도 없으면 값 그대로 칩이 됩니다. 컬럼 재구성(<code>setColumns</code> 등) 후에는 ' +
            '캐시가 비므로 그런 값은 원시 값으로 폴백합니다.',
          example:
            "cellRenderer: DataGrid.renderers.multiselect()\n" +
            "// ['js','css'] → 'JavaScript' 'CSS' 칩\n" +
            "// 'js,css'     → 같은 결과 (콤마 문자열도 매핑된다)\n" +
            '// editorSearch.fetch로 고른 값도 코드가 아니라 label로 표시된다 (v2.25)',
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
        { name: '--dg-disabled-foreground-color', default: 'rgba(24,29,31,.38)', description: '비활성 텍스트(빈 값, 잠긴 항목).' },
        { name: '--dg-header-foreground-color', default: '#181d1f', description: '헤더 글자색.' },
        { name: '--dg-accent-foreground-color', default: '#ffffff', description: '강조 배경 위의 글자색(주요 버튼 등).' },
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
        { name: '--dg-menu-shadow', default: '0 4px 16px rgba(24,29,31,.16)', description: '필터 메뉴·에디터 패널 그림자.' },
        { name: '--dg-invalid-color', default: '#e02525', description: '검증 실패 표시(테두리·메시지·팝업 폼 라벨).' },
        { name: '--dg-dirty-color', default: '#e07c00', description: '변경 추적(trackChanges) dirty 셀 표시 — 셀 <strong>왼쪽 위</strong> 모서리.', since: '1.2.0' },
        { name: '--dg-required-color', default: '#e02525', description: '필수 컬럼(column.required)의 빈 셀 마커 — 셀 <strong>오른쪽 위</strong> 모서리(dirty와 겹치지 않게). 팝업 폼 라벨의 <code>*</code>에도 쓰인다. 다크는 #ff6b6b.', since: '2.19.0' },
        { name: '--dg-added-row-background-color', default: 'rgba(13,138,68,.08)', description: '추가된 행 배경(trackChanges).', since: '1.2.0' },
        { name: '--dg-range-background-color', default: 'rgba(33,150,243,.14)', description: '셀/블록 범위 선택 배경(cellSelection).', since: '1.2.0' },
        { name: '--dg-group-row-background-color', default: '#f3f6fa', description: '그룹 헤더 행 배경.', since: '1.1.0' },
        { name: '--dg-group-indent', default: '20px', description: '중첩 그룹 레벨당 들여쓰기 폭.', since: '1.1.0' },
        { name: '--dg-floating-filter-height', default: '36px', description: '헤더 필터 행(floatingFilter) 높이.', since: '1.1.0' },
        { name: '--dg-group-header-height', default: '34px', description: '2단 컬럼 그룹 헤더(columnGroups) 행 높이.', since: '1.2.0' },
        { name: '--dg-icon-size', default: '16px', description: '헤더 정렬·필터 아이콘 크기.' },
        { name: '--dg-header-height', default: '48px', description: '헤더 높이 — JS 옵션 headerHeight로 설정하세요.' },
        { name: '--dg-row-height', default: '42px', description: '행 높이 — JS 옵션 rowHeight로 설정하세요(가상 스크롤 계산에 사용).' },
        { name: '--dg-cell-horizontal-padding', default: '16px', description: '셀 좌우 패딩.' },
        { name: '--dg-wrapper-border-radius', default: '8px', description: '그리드 외곽 모서리.' },
        { name: '--dg-border-radius', default: '4px', description: '버튼·입력·체크박스 모서리.' },
        { name: '--dg-deleted-row-opacity', default: '0.55', description: 'softDelete 삭제 표시 행의 흐림 정도.', since: '2.6.0' },
        { name: '--dg-popup-width', default: '420px', description: '팝업 에디터 기본 폭 — 보통은 JS 옵션 <code>popupEditor.width</code>로 설정합니다.', since: '2.16.0' },
        { name: '--dg-popup-backdrop-color', default: 'rgba(24,29,31,.32)', description: '팝업 에디터 뒷배경.', since: '2.16.0' },
        { name: '--dg-popup-shadow', default: '0 12px 40px rgba(24,29,31,.22)', description: '팝업 에디터 그림자.', since: '2.16.0' },
        { name: '--dg-popup-radius', default: '8px', description: '중앙 팝업 모서리(슬라이드 패널은 각짐).', since: '2.16.0' },
        { name: '--dg-popup-label-width', default: '120px', description: '팝업 폼 라벨 열 너비(좁아지면 라벨이 입력 위로 올라감).', since: '2.16.0' },
        { name: '--dg-popup-field-min', default: '320px', description: '팝업 폼 필드의 최소 폭 — <code>columns: 2</code>가 이 폭을 못 주면 자동으로 1열이 된다.', since: '2.16.0' },
        { name: '--dg-popup-input-min', default: '150px', description: '팝업 폼 입력의 최소 폭 — 필드 버튼이 붙어도 이보다 좁아지지 않고 버튼이 줄바꿈된다.', since: '2.16.0' },
        { name: '--dg-slide-duration', default: '180ms', description: '팝업 진입 효과 길이(가시성은 여기에 의존하지 않음).', since: '2.16.0' },
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
        '<tr><td><kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd></td><td>실행 취소 / 다시 실행 (<code>undoRedo: true</code>)</td></tr>' +
        '</tbody></table>' +
        '<p><strong><a href="#grid-options-popupEditor">팝업 편집 폼</a>(<code>popupEditor</code>) 안에서는</strong> ' +
        '규칙이 조금 다릅니다 — 폼은 여러 필드가 동시에 열려 있고 저장이 한 번에 일어나기 때문입니다.</p>' +
        '<table class="api-table"><thead><tr><th>키</th><th>동작</th></tr></thead><tbody>' +
        '<tr><td><kbd>Tab</kbd></td><td>다음 필드로 이동 — 저장하지 않습니다(셀 편집의 "커밋 후 다음 셀"과 다름). ' +
        '폼은 <strong>모달</strong>이라 마지막 요소에서 <kbd>Tab</kbd>하면 첫 요소로 순환하고, ' +
        '뒤 페이지로 빠져나가지 않습니다</td></tr>' +
        '<tr><td><kbd>Enter</kbd></td><td>단순 입력(text·number·date 등)에서 <strong>저장</strong>. ' +
        '검색형 select·multiselect·radio 패널 안에서는 그 위젯의 동작(선택 확정)만 하고 저장하지 않습니다</td></tr>' +
        '<tr><td><kbd>Esc</kbd></td><td>폼 취소(변경 폐기, <code>instantUpdate</code>면 연 시점으로 롤백). ' +
        '단 검색형 select의 목록이 열려 있으면 <strong>목록만 닫습니다</strong> — 한 번 더 누르면 폼이 닫힙니다</td></tr>' +
        '<tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>검색형 select 목록에서 옵션 이동</td></tr>' +
        '</tbody></table>',
      entries: [],
    },
  ],
};
