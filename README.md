# DataGrid

의존성 없는 순수 JavaScript / CSS 데이터그리드 프레임워크.
AG Grid Design System (Community) — Quartz 테마의 디자인 토큰과 컴포넌트 구조를 따릅니다.

- **모듈 시스템 없음** — `<script>` 태그로 로드하면 전역 `DataGrid` 하나가 노출됩니다. 빌드 도구 불필요.
- **CSS 토큰 테마** — 모든 색·크기는 `.dg-root`의 CSS 커스텀 프로퍼티. 라이트/다크 내장.
- **UI 문자열 다국어** — `localeText` 한 곳으로 전체 교체. 한국어/영어 로케일 내장.
- **가상 스크롤** — 보이는 행만 DOM 렌더링, 100,000행도 부드럽게 동작.

## 시작하기

```html
<link rel="stylesheet" href="dist/datagrid.css">
<script src="dist/datagrid.js"></script>

<div id="myGrid" style="height: 400px"></div>
<script>
  var grid = new DataGrid(document.getElementById('myGrid'), {
    columnDefs: [
      { field: 'name', headerName: 'Name', filter: 'text', editable: true },
      { field: 'salary', headerName: 'Salary', align: 'right', filter: 'number',
        valueFormatter: function (v) { return '$' + v.toLocaleString(); } },
    ],
    rowData: [{ name: 'Alice', salary: 52000 }],
    rowSelection: 'multiple',
    pagination: true,
  });
</script>
```

## 데모

```bash
node demo/server.js 8087
```

Node가 없으면 Python으로도 띄울 수 있습니다 (브라우저 자동 오픈):

```bash
python demo/server.py
```

| 페이지 | 내용 |
|---|---|
| `index.html` | **Template** — 10,000행 실전 예제 (툴바 · 퀵 필터 · 선택 · 편집 · CSV · 다크 모드) |
| `examples/features.html` | **Features** — 기능별 데모 64개 (정렬 · 필터 · 그룹핑/집계 · 선택 · 인라인 편집 · **팝업 폼 편집** · 트리 · 원격 데이터/CRUD 스테이징 · 클립보드 · 상태 저장 · Excel/CSV · 10만 행 가상화 · 컬럼 가상화 · 다국어) |
| `examples/components.html` | **Components** — 디자인 시스템 갤러리 (토큰 · 헤더/행 상태 · 체크박스 · 태그 · 필터 메뉴 · 페이지네이션 바) |

## 그리드 옵션

| 옵션 | 타입 | 설명 |
|---|---|---|
| `columnDefs` | array | 컬럼 정의 (아래 참조) |
| `rowData` | array | 행 객체 배열 |
| `defaultColDef` | object | 모든 컬럼의 기본값 |
| `rowSelection` | `'single'` \| `'multiple'` | 행 선택 모드. `checkboxSelection` 컬럼이 있으면 선택은 그 컬럼에서만 이뤄진다(다른 셀 클릭은 포커스만 이동). 체크박스 컬럼이 없으면 행의 아무 셀이나 클릭해 선택 |
| `pagination` | boolean | 페이지네이션 사용 |
| `paginationPageSize` | number | 페이지 크기 (기본 20) |
| `paginationPageSizeOptions` | array | 페이지 크기 선택지 |
| `infiniteScroll` | boolean \| object | 무한 스크롤 `{ threshold, pageSize, pageSizeSelector }` — 바닥 근처에서 다음 페이지를 자동 조회해 **이어 붙임**(교체 아님). `dataSource` 필요, 페이저 UI·`treeData`와 배타. 켜면 `pageMode`가 `'server'`로 올라감. 끝 판정은 서버 플래그(`last`/`lastPage`/`isLast`/`hasMore`/`hasNext`) → `total` → 수신 건수 순. 하단 상태 바가 진행/마지막을 표시하고 **크기 선택 UI**를 제공(선택지는 `paginationPageSizeOptions`, `pageSizeSelector: false`로 끔) (`loadMore()` / `hasMoreRows()`, `rowsAppended` / `lastPageReached`) |
| `zebra` | boolean | 홀수 행 배경 |
| `theme` | `'light'` \| `'dark'` | 초기 테마 |
| `localeText` | object | 그리드가 그리는 UI 문자열(필터 메뉴·페이지네이션·오버레이·요약·aria-label) 교체. 내장 `DataGrid.locales.ko` / `.en`, 지정한 키만 덮어쓰고 나머지는 영어. `{from}`·`{total}`·`{column}`·`{count}` 토큰 치환, `setOptions`로 런타임 전환 |
| `rowHeight` / `headerHeight` | number | px (기본 42 / 48) |
| `sortModel` | array | 초기 정렬 `[{ field, dir }]` |
| `getRowId` | function | 행 식별자 (기본: 자동) |
| `columnReorder` | boolean | 헤더 드래그 순서 변경 (기본 true) |
| `floatingFilter` | boolean | 헤더 아래 인라인 필터 행 (필터 메뉴와 모델 공유) |
| `editableIndicator` | boolean | 편집 가능한 컬럼 헤더에 연필 아이콘 표시 (그리드를 잠그면 함께 사라짐) |
| `groupBy` | array | 행 그룹핑 필드 목록 (`['dept', 'city']` 다단계 지원) |
| `groupDefaultExpanded` | boolean | 그룹 초기 펼침 상태 (기본 true) |
| `grandTotal` | boolean | 하단 전체 요약 행 (`aggFunc` 컬럼 집계) |
| `rowNumbers` | boolean | 왼쪽 고정 행 번호 컬럼 |
| `getRowClass(row, index)` | function | 행별 CSS 클래스 |
| `editable` | boolean | 그리드 전체 편집 잠금 (`false`면 컬럼 설정 무시, `setEditable`로 전환) |
| `editOnSingleClick` / `enterMovesDown` / `tabMovesRight` | boolean | 클릭 한 번 편집 / Enter·Tab 연속 편집 |
| `popupEditor` | boolean 또는 object | 행 전체를 폼에서 편집 — `{ position: 'center'\|'left'\|'right', width, columns, title, trigger, fields, instantUpdate, closeOnBackdrop, buttons }`. 폼 필드는 컬럼 정의(`editor`/`editorOptions`/`validator`)를 그대로 재사용, 편집 불가 컬럼은 읽기 전용 표시. `buttons` 항목은 `{ key, text, variant, title, disabled, onClick(ctx), onLoad(ctx) }` — `onLoad`는 폼이 만들어진 직후 한 번 호출되어 버튼·필드·값을 초기화하는 자리. 컬럼별 커스터마이즈는 `column.popupEditor` |
| `trackChanges` | boolean | 변경 추적 — dirty 셀 표시 + `getChanges`/`commitChanges`/`rollbackChanges` (`softDelete`/`statusColumn`이 자동 활성화) |
| `softDelete` | boolean | CRUD 스테이징 삭제 — 서버(기준선) 행은 삭제 표시(취소선, 편집 차단, `restoreRows`로 복원), 신규 행은 로우 제거. `commitChanges`가 표시 행을 물리 제거 |
| `statusColumn` | boolean 또는 object | 변경 상태(신규/수정/삭제) 태그 컬럼 자동 표시 — `{ headerName, width, labels, colors }` 부분 지정 가능 |
| `undoRedo` | boolean | Ctrl+Z/Y 실행 취소 스택 (`undo`/`redo`/`canUndo`/`canRedo`) |
| `cellSelection` | boolean | 셀/블록 범위 선택 (드래그·Shift+화살표, Ctrl+C 블록 복사) |
| `fillHandle` | boolean | 엑셀식 채우기 핸들 (숫자 등차 외삽 / 패턴 반복) |
| `mergeCells` | array | 연속 동일 값 세로 병합 표시 `['field'...]` |
| `virtualX` | boolean | 컬럼 가상화 — 보이는 컬럼만 렌더링 (수백 컬럼용) |
| `pinnedTopRows` | array | 헤더 아래 고정 행 (표시 전용, `setPinnedTopRows`) |
| `autoRowHeight` | boolean | `wrapText` 컬럼 기준 행 높이 자동 계산 |
| `domLayout` | `'normal'` \| `'fill'` \| `'autoHeight'` | 높이 결정 방식. `'normal'`(기본) = `height: 100%`(컨테이너 높이가 확정일 때), `'fill'` = 컨테이너를 정확히 채움(데이터 양과 무관 — `flex: 1` 영역용), `'autoHeight'` = 내용 높이만큼 늘어남(세로 가상화 없음) |
| `showHeader` | boolean | `false`면 헤더 영역 숨김 |
| `columnGroups` | array | 2단 컬럼 그룹 헤더 `[{ headerName, children }]` |
| `dataSource` | object | 원격 데이터 `{ url, method, params, autoLoad, request, parse, headers, paramsFormat, paramsSerializer }` — `autoLoad: false`면 **생성 시 자동 조회를 하지 않음**(기본 true — 검색 조건을 받은 뒤 `reloadData()`로 시작, 명시적 호출과 첫 조회 이후의 자동 재조회는 그대로), `request(state)`로 요청 파라미터를 서버 스펙에 맞춤, `parse(json)`으로 응답 변환, `headers`로 인증, `paramsFormat`으로 중첩 표기 선택(`'dot'` 기본 → `page.selectPage=1` Spring·ASP.NET / `'bracket'` → `page[selectPage]=1` qs·PHP·Rails), `paramsSerializer(params)`로 쿼리스트링 생성 자체를 대체 (`reloadData()` 재요청, `setDataSource()` 교체) |
| `rowDetail` | object | 마스터-디테일 `{ renderer(row), height }` (`expandRow`/`collapseRow`/`toggleRowDetail`) |
| `treeData` | object | 계층 데이터 트리 표시 `{ treeField, indent, defaultExpandLevel, childrenField \| parentIdField+idField, cascade, checkboxDisabled(row), summary, fetchChildren(row), hasChildren(row) }` — `checkboxSelection` 컬럼과 함께 쓰면 3상태 캐스케이드 선택. `pagination`/`groupBy`와 배타 |
| `title` / `toolbar` | string / element | 그리드 타이틀 바 / 소비자 DOM 툴바 슬롯 |
| `sortMode` / `filterMode` / `pageMode` | `'client'` \| `'server'` | 각 축의 처리 주체 — server면 상태를 요청 파라미터로 전달. `sortMode`/`filterMode`를 생략하면 **`pageMode`를 따름**(기본 `'client'`) — 서버 페이징이면 클라이언트는 현재 한 페이지만 들고 있어 클라 정렬/필터가 그 페이지 안에서만 동작하기 때문. 상속은 `pageMode` → 나머지 단방향이라 `sortMode: 'server'` + 클라 페이징 조합은 그대로 가능 |

## 컬럼 정의

| 속성 | 설명 |
|---|---|
| `field` | 행 객체의 키 |
| `headerName` | 헤더 라벨 |
| `width` / `minWidth` / `maxWidth` / `flex` | 픽셀 폭 / 최소·최대 폭 / 남은 공간 비율 |
| `sortable` (기본 true) | 헤더 클릭 정렬, Shift+클릭 다중 정렬 |
| `comparator(a, b, rowA, rowB)` | 커스텀 정렬 |
| `dataType` | `'string'` \| `'number'` \| `'date'` \| `'bool'` — 정렬 비교·필터 종류·정렬 방향·기본 에디터 자동 결정 |
| `format` | `'$#,##0.00'` \| `'yyyy-MM-dd'` 선언적 포맷 (`DataGrid.format()` 유틸과 동일 패턴) |
| `aggFunc` | `'sum'` \| `'avg'` \| `'min'` \| `'max'` \| `'count'` 또는 커스텀 함수 `(values, ctx) => any` — 그룹 행 · 전체 요약 · 트리 부모 노드에 같은 규칙으로 적용. `ctx = { rows, field, colDef, parent }`이고 `parent`는 트리 요약에서만 부모 행(그룹·전체합계는 `null`). 반환 `null`이면 셀을 비움. 커스텀 결과에는 `valueFormatter`가 적용되지 않는다. 필터 적용 후 행으로 매번 재계산되므로 "이름 (자손 수)" 같은 표시가 필터를 따라간다 |
| `filter` | `'text'` \| `'number'` \| `'set'` (`true` = text) |
| `editable` | 더블클릭/Enter로 인라인 편집 — `editor` 선언 시 생략 가능 (명시적 `false`가 우선) |
| `editor` | `'text'` \| `'number'` \| `'date'` \| `'datetime'` \| `'select'` \| `'multiselect'` \| `'radio'` \| `'checkbox'` 또는 `{ init, getValue, destroy }` 커스텀 객체. 생략 시 `dataType`이 `number`/`date`면 그에 맞는 에디터.<br>`multiselect`의 값은 **배열과 콤마 구분 문자열을 모두** 받는다 — `['js','css']`와 `'js,css'`(항목 공백 허용)가 같은 값이고 표시·편집·변경 판정이 동일하다. 커밋은 **그 행이 원래 쓰던 표현을 유지**하며(배열→배열, 문자열→콤마 문자열), 원본이 `null`/빈 값이면 콤마 문자열이 기본. 구분자는 `,` 고정이라 옵션 값에 콤마가 들어가면 배열로 저장해야 한다 |
| `editorOptions` | select/multiselect/radio 선택지 — `['a', 'b']` 또는 `[{ label: '한국', value: 'kr' }]` (label 표시, value 저장·타입 보존). checkbox는 `{ checked: 'Y', unchecked: 'N' }` 매핑. date/datetime은 `{ min, max, step, valueType }` |
| `editorSearch` | select를 검색 패널로 — `true`(정적 목록 로컬 필터) 또는 `{ fetch(query) => Promise<options>, debounce, minLength, placeholder }` (lazy 검색) |
| `validator(value, row)` | `true` 또는 오류 메시지 반환 — 거부 시 커밋 차단 + 빨간 표시 |
| `required` | 필수 컬럼 — 표시 + 검증을 함께 켠다. 그리드 표시는 **비어 있는 셀**에만 붙는 오른쪽 위 모서리 마커 하나(`trackChanges`의 왼쪽 위 주황 마커와 자리·색 분리). 헤더에는 표식을 두지 않고, `*`는 팝업 폼 라벨에만. 빈 값 커밋은 인라인·팝업·붙여넣기·`updateRows`에서 모두 거부(`localeText.requiredValue`). `0`·`false`는 유효한 값. `editor`와 같이 편집 의도로 해석되어 `editable` 생략 시 true. 그리드를 잠그면 표시도 사라짐. `validator`보다 먼저 검사 |
| `popupEditor` | 팝업 폼 안에서만 적용되는 컬럼 오버레이 — `false`(폼에서 제외) 또는 `{ label, hint, hide, readonly, order, span, editor, editorOptions, editorSearch, validator, required, buttons, before(ctx), after(ctx) }`. `hide`/`readonly`는 컬럼의 `hide`/`editable`을 덮어쓰므로 "그리드엔 숨기고 폼에서만 편집"도 가능. 필드 버튼도 `onLoad(ctx)`를 지원하며 푸터 버튼보다 먼저 호출됨. 그리드 셀 표시는 그대로 |
| `suppressCopy` | 클립보드 복사에서 제외 (CSV에는 영향 없음) |
| `exportFormatter(value, row)` | CSV/Excel 내보내기 전용 포맷 (화면과 분리) |
| `wrapText` | 셀 줄바꿈 (`autoRowHeight`와 함께 행 높이 자동) |
| `valueGetter(row)` | 파생 값 계산 — 정렬·필터·내보내기에도 반영 |
| `suppressMove` | 드래그 순서 변경에서 제외 |
| `valueFormatter(value, row)` | 표시 문자열 (기본 HTML 이스케이프) |
| `cellRenderer(params)` | HTML/Node 반환 커스텀 렌더러 |
| `cellClass` | string 또는 `fn(value, row)` |
| `headerRenderer(params)` | 헤더 라벨 커스텀 콘텐츠(HTML/Element) — 정렬·필터·리사이즈는 유지, 내부 버튼 등 인터랙티브 요소는 정렬 미발동 |
| `headerClass` | string 또는 `fn(colDef)` — 헤더 셀 추가 클래스 |
| `headerTooltip` | 헤더 셀 툴팁 (`title` 속성) |
| `align` / `headerAlign` | `'left'` \| `'center'` \| `'right'` (헤더만 다른 정렬 가능) |
| `pinned` | `'left'` \| `'right'` 고정 컬럼 |
| `checkboxSelection` / `headerCheckboxSelection` | 선택 체크박스 / 헤더 전체 선택. 두면 그리드의 선택 진입점이 이 컬럼으로 한정된다. 체크박스를 정확히 누르지 않고 셀 여백을 클릭해도 토글 |
| `resizable` (기본 true) | 드래그 크기 조절, 더블클릭 자동 맞춤 |
| `hide` | 컬럼 숨김 |

### 내장 셀 렌더러

```js
cellRenderer: DataGrid.renderers.tag({ Active: 'green', Overdue: 'red' })  // 상태 배지
cellRenderer: DataGrid.renderers.check()      // 불리언 ✓ / –
cellRenderer: DataGrid.renderers.progress()   // 0–100 진행 바
cellRenderer: DataGrid.renderers.select()     // 저장된 value를 editorOptions의 label로 표시
cellRenderer: DataGrid.renderers.radio()      // select와 동일 (radio 에디터 짝꿍)
cellRenderer: DataGrid.renderers.searchselect() // select와 동일 + lazy 검색으로 고른 값도 label로 (editorSearch 짝꿍)
cellRenderer: DataGrid.renderers.multiselect() // 다중 값을 label 칩 목록으로 (배열·콤마 문자열 모두)
cellRenderer: DataGrid.renderers.checkbox()   // 값을 체크박스 모양으로 (표시 전용, Y/N·0/1 매핑 지원)
```

## API

`setRowData(rows)` · `getRowData()` · `addRow(row, index?)` / `addRows(rows, index?)` (index 0 = 맨 앞 삽입) · `updateRow(row, changes)` ·
`removeRows(rows)` / `removeSelectedRows()` / `restoreRows(rows)` / `getRowStatus(row)` · `getSelectedRows()` · `selectAll()` / `deselectAll()` · `getCellRange()` / `clearCellRange()` · `findNext(text)` ·
`startEdit(row, field)` / `stopEdit(commit)` / `isEditing()` · `setEditable(bool)` / `isEditable()` ·
`openEditPopup(row, field?)` / `closeEditPopup(commit?)` / `isPopupEditing()` / `getPopupValues()` ·
`copy()` / `pasteTsv(text)` (Ctrl+C/V 엑셀 호환 TSV) ·
`getChanges()` / `isDirty()` / `commitChanges()` / `rollbackChanges()` · `undo()` / `redo()` / `canUndo()` / `canRedo()` ·
`setQuickFilter(text)` · `applyColumnFilter(field, model)` · `getFilterModel()` · `clearFilters()` ·
`setSortModel(model)` / `getSortModel()` · `setGroupBy(fields)` / `getGroupBy()` ·
`expandAllGroups()` / `collapseAllGroups()` · `setPage(n)` / `setPageSize(n)` ·
`setColumnVisible(colId, visible)` · `autoSizeColumn(colId)` ·
`focusCell(rowIndex, field)` / `ensureRowVisible(row)` / `ensureColumnVisible(colId)` ·
`getState()` / `setState(state)` / `resetState(parts?)` (컬럼·정렬·필터·그룹·페이지 상태 저장/복원) ·
`getCsv()` / `exportCsv(filename)` / `exportExcel(filename, sheetName)` / `getJson()` ·
`showLoadingOverlay()` / `hideLoadingOverlay()` ·
`setTheme('light'|'dark')` · `refresh()` · `refreshCell(row, field)` / `refreshRow(row)` / `refreshColumn(colId)` ·
`setOptions(patch)` · `expandRow(row)` / `collapseRow(row)` / `toggleRowDetail(row)` · `reloadData({ keepPage? })`(1페이지로 리셋 후 재조회 — 보던 페이지를 지키려면 `{ keepPage: true }`) / `setDataSource(ds)` ·
`loadMore()` / `hasMoreRows()` (infiniteScroll — 수동 이어받기 · 남은 페이지 확인) ·
`toggleNode(row, expanded?)` / `expandNode(row)` / `collapseNode(row)` / `isNodeExpanded(row)` / `expandAllNodes(level?)` / `collapseAllNodes()` ·
`setPinnedTopRows(rows)` · `setEnabled(bool)` / `isEnabled()` · `once(event, fn)` · `destroy()`

정적: `DataGrid.format(value, pattern)` · `DataGrid.locales.ko` / `.en` (localeText용 내장 로케일) · `DataGrid.renderers.*` · `DataGrid.version`

### UI 문자열 다국어

```js
var grid = new DataGrid(el, {
  columnDefs: cols,
  rowData: rows,
  localeText: DataGrid.locales.ko,   // 필터 메뉴·페이지네이션·오버레이가 한국어로
});

// 일부만 바꾸기 — 지정하지 않은 키는 기준 로케일 값 유지
grid.setOptions({
  localeText: Object.assign({}, DataGrid.locales.ko, {
    pageSummary: '전체 {total}명 가운데 {from}번째 ~ {to}번째',
    noRowsToShow: '조건에 맞는 직원이 없습니다',
  }),
});
```

전체 키 목록은 [API 문서의 UI 문자열 다국어 가이드](docs/api.html#locale-guide) 참고.

## 이벤트

```js
grid.on('selectionChanged', function (e) { e.selectedRows });
grid.on('cellValueChanged', function (e) { e.data, e.colDef, e.oldValue, e.newValue });
grid.on('rowValueChanged', function (e) { e.data, e.changes /* 행 단위 변경 묶음 */ });
grid.on('rowsAppended', function (e) { e.rows /* 이번에 받은 행 */, e.page, e.loaded, e.hasMore });
grid.on('lastPageReached', function (e) { e.loaded, e.total /* 서버가 안 주면 null */ });
grid.on('sortChanged' | 'filterChanged' | 'paginationChanged' | 'groupChanged' |
        'groupToggled' | 'editingStarted' | 'editingStopped' | 'rowClicked' |
        'rowDoubleClicked' | 'cellClicked' | 'cellDoubleClicked' | 'columnResized' |
        'columnMoved' | 'stateChanged' | 'gridReady' | 'dataChanged' | 'viewRendered' |
        'cellRangeChanged' | 'cellContextMenu' | 'headerClicked' | 'cellKeyDown' |
        'nodeExpanded' | 'nodeCollapsed' | 'popupEditStarted' | 'popupFieldChanged' |
        'popupEditStopped', fn);

// 취소 가능 이벤트: e.cancel = true로 동작 거부
grid.on('beforeCellSave', function (e) { if (e.newValue < 0) e.cancel = true; });
grid.on('beforeNodeToggle', function (e) { if (e.data.locked) e.cancel = true; });
grid.on('beforeSort', function (e) { if (locked) e.cancel = true; });
grid.on('beforeSelectionChange', function (e) { if (frozen) e.cancel = true; });
grid.on('beforeExport', function (e) { e.filename = 'report-' + Date.now() + '.' + e.format; });
grid.on('beforePopupEdit', function (e) { if (e.data.locked) e.cancel = true; });
grid.on('beforePopupSave', function (e) { e.values.name = e.values.name.trim(); });
```

### 팝업 에디터

```js
var grid = new DataGrid(el, {
  columnDefs: [
    { field: 'name', headerName: 'Name', editable: true },
    { field: 'city', headerName: 'City', editor: 'select', editorOptions: cities,
      validator: function (v) { return v ? true : '도시를 선택하세요'; },
      // 팝업 안에서만 적용되는 오버레이 — 셀 표시는 그대로
      popupEditor: { label: '근무 도시', order: 0, editorSearch: true,
        buttons: [{ text: '본사', onClick: function (ctx) { ctx.setValue('city', 'Seoul'); } }] } },
    { field: 'age', headerName: 'Age' },   // editable 아님 → 폼에서 읽기 전용
  ],
  popupEditor: {
    position: 'right',                     // 'center'(기본) | 'left' | 'right'
    title: function (row) { return row.name + ' 편집'; },
    buttons: [
      { key: 'reset', text: '초기화', onClick: function (ctx) { ctx.reset(); } },
      { key: 'approve', text: '승인',
        // 폼이 완전히 만들어진 직후 한 번 — 버튼·필드·값을 초기화하는 자리
        onLoad: function (ctx) {
          var done = ctx.data.status === 'Active';
          ctx.buttonEl.disabled = done;
          ctx.buttonEl.textContent = done ? '승인 완료' : '승인';
        },
        onClick: function (ctx) { ctx.setValue('status', 'Active'); } },
      'save', 'cancel',                    // 배열 순서가 곧 배치 순서
    ],
  },
});
```

행을 더블클릭하면 폼이 열립니다(`trigger: 'none'`이면 `openEditPopup()`으로만).
기본은 Save에서 변경된 필드만 일괄 커밋하고, `instantUpdate: true`면 즉시 반영 + Cancel이 연 시점으로 롤백합니다.

버튼 콜백의 `ctx`는 `{ grid, data, colDef, field, fieldEl, buttonEl, value, values, getValue, setValue, isValid, reset, save, cancel, close }`입니다.
`onLoad`는 폼이 다 만들어진 뒤 **DOM 순서**(필드 버튼 → 푸터 버튼)로 한 번씩 호출되므로 그 시점에 모든 필드가 이미 존재합니다 — 다른 필드의 값도 초기화할 수 있습니다.
`disabled`를 함께 선언하면 그 결과가 `onLoad`의 수동 지정을 덮으니, 로드 시점에만 잠글 때는 `ctx.buttonEl.disabled`만 쓰세요.

## 테마 커스터마이징

```css
.my-theme.dg-root {
  --dg-accent-color: #7c3aed;
  --dg-row-height: 36px;
  --dg-header-background-color: #faf5ff;
}
```

다크 모드는 루트에 `dg-theme-dark` 클래스를 추가하거나 `grid.setTheme('dark')`를 호출합니다.

## 스펙 확장 로드맵

향후 기능 확장은 [docs/spec-roadmap.md](docs/spec-roadmap.md)를 기준으로 진행합니다
(ParamQuery Pro API 전수 비교 기반 — P1/P2/P3 우선순위와 제안 API 명세).

## 테스트

```bash
node test/run-tests.js
```

정렬·필터·퀵 필터·페이지네이션·CSV·로케일·팝업 에디터 등 DOM 없는 데이터 로직 72개 스위트 / 750개 단언.
