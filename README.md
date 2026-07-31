# DataGrid

의존성 없는 순수 JavaScript / CSS 데이터그리드 프레임워크.
AG Grid Design System (Community) — Quartz 테마의 디자인 토큰과 컴포넌트 구조를 따릅니다.

- **모듈 시스템 없음** — `<script>` 태그로 로드하면 전역 `DataGrid` 하나가 노출됩니다. 빌드 도구 불필요.
- **CSS 토큰 테마** — 모든 색·크기는 `.dg-root`의 CSS 커스텀 프로퍼티. 라이트/다크 내장.
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
| `examples/features.html` | **Features** — 기능별 데모 (정렬 · 그룹핑/집계 · 필터 · 선택 · 편집 · 페이지네이션 · 고정 컬럼 · 10만 행 가상화 · 오버레이) |
| `examples/components.html` | **Components** — 디자인 시스템 갤러리 (토큰 · 헤더/행 상태 · 체크박스 · 태그 · 필터 메뉴 · 페이지네이션 바) |

## 그리드 옵션

| 옵션 | 타입 | 설명 |
|---|---|---|
| `columnDefs` | array | 컬럼 정의 (아래 참조) |
| `rowData` | array | 행 객체 배열 |
| `defaultColDef` | object | 모든 컬럼의 기본값 |
| `rowSelection` | `'single'` \| `'multiple'` | 행 선택 모드 |
| `pagination` | boolean | 페이지네이션 사용 |
| `paginationPageSize` | number | 페이지 크기 (기본 20) |
| `paginationPageSizeOptions` | array | 페이지 크기 선택지 |
| `zebra` | boolean | 홀수 행 배경 |
| `theme` | `'light'` \| `'dark'` | 초기 테마 |
| `rowHeight` / `headerHeight` | number | px (기본 42 / 48) |
| `sortModel` | array | 초기 정렬 `[{ field, dir }]` |
| `getRowId` | function | 행 식별자 (기본: 자동) |
| `columnReorder` | boolean | 헤더 드래그 순서 변경 (기본 true) |
| `floatingFilter` | boolean | 헤더 아래 인라인 필터 행 (필터 메뉴와 모델 공유) |
| `groupBy` | array | 행 그룹핑 필드 목록 (`['dept', 'city']` 다단계 지원) |
| `groupDefaultExpanded` | boolean | 그룹 초기 펼침 상태 (기본 true) |
| `grandTotal` | boolean | 하단 전체 요약 행 (`aggFunc` 컬럼 집계) |

## 컬럼 정의

| 속성 | 설명 |
|---|---|
| `field` | 행 객체의 키 |
| `headerName` | 헤더 라벨 |
| `width` / `minWidth` / `flex` | 픽셀 폭 / 최소 폭 / 남은 공간 비율 |
| `sortable` (기본 true) | 헤더 클릭 정렬, Shift+클릭 다중 정렬 |
| `comparator(a, b, rowA, rowB)` | 커스텀 정렬 |
| `aggFunc` | `'sum'` \| `'avg'` \| `'min'` \| `'max'` \| `'count'` — 그룹/전체 요약 집계 |
| `filter` | `'text'` \| `'number'` \| `'set'` (`true` = text) |
| `editable` | 더블클릭/Enter로 인라인 편집 |
| `editor` | `'text'` \| `'number'` \| `'select'` (+ `editorOptions`) |
| `validator(value, row)` | `true` 또는 오류 메시지 반환 — 거부 시 커밋 차단 + 빨간 표시 |
| `suppressCopy` | 클립보드 복사에서 제외 (CSV에는 영향 없음) |
| `valueFormatter(value, row)` | 표시 문자열 (기본 HTML 이스케이프) |
| `cellRenderer(params)` | HTML/Node 반환 커스텀 렌더러 |
| `cellClass` | string 또는 `fn(value, row)` |
| `align` | `'left'` \| `'center'` \| `'right'` |
| `pinned` | `'left'` \| `'right'` 고정 컬럼 |
| `checkboxSelection` / `headerCheckboxSelection` | 선택 체크박스 / 헤더 전체 선택 |
| `resizable` (기본 true) | 드래그 크기 조절, 더블클릭 자동 맞춤 |
| `hide` | 컬럼 숨김 |

### 내장 셀 렌더러

```js
cellRenderer: DataGrid.renderers.tag({ Active: 'green', Overdue: 'red' })  // 상태 배지
cellRenderer: DataGrid.renderers.check()      // 불리언 ✓ / –
cellRenderer: DataGrid.renderers.progress()   // 0–100 진행 바
```

## API

`setRowData(rows)` · `getRowData()` · `addRow(row)` / `addRows(rows)` · `updateRow(row, changes)` ·
`removeRows(rows)` / `removeSelectedRows()` · `getSelectedRows()` · `selectAll()` / `deselectAll()` ·
`startEdit(row, field)` / `stopEdit(commit)` / `isEditing()` ·
`copy()` / `pasteTsv(text)` (Ctrl+C/V 엑셀 호환 TSV) ·
`setQuickFilter(text)` · `applyColumnFilter(field, model)` · `getFilterModel()` · `clearFilters()` ·
`setSortModel(model)` / `getSortModel()` · `setGroupBy(fields)` / `getGroupBy()` ·
`expandAllGroups()` / `collapseAllGroups()` · `setPage(n)` / `setPageSize(n)` ·
`setColumnVisible(colId, visible)` · `autoSizeColumn(colId)` ·
`getCsv()` / `exportCsv(filename)` · `showLoadingOverlay()` / `hideLoadingOverlay()` ·
`setTheme('light'|'dark')` · `refresh()` · `destroy()`

## 이벤트

```js
grid.on('selectionChanged', function (e) { e.selectedRows });
grid.on('cellValueChanged', function (e) { e.data, e.colDef, e.oldValue, e.newValue });
grid.on('sortChanged' | 'filterChanged' | 'paginationChanged' | 'groupChanged' |
        'groupToggled' | 'editingStarted' | 'editingStopped' | 'rowClicked' |
        'rowDoubleClicked' | 'cellClicked' | 'columnResized' | 'columnMoved', fn);

// 취소 가능 이벤트: e.cancel = true로 저장 거부
grid.on('beforeCellSave', function (e) { if (e.newValue < 0) e.cancel = true; });
```

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

정렬·필터·퀵 필터·페이지네이션·CSV 등 DOM 없는 데이터 로직 56개 단위 테스트.
