# DataGrid 스펙 확장 로드맵

**기준 문서** — 이 문서를 기준으로 스펙을 확장한다. 항목을 구현하면 체크하고, `docs/api-data.js`에 `since` 버전과 함께 문서화한다.

- 비교 대상: [ParamQuery Pro Grid API v3.3–3.5](https://paramquery.com/api) 좌측 트리 전체 (옵션 130 · 메서드 92 · 이벤트 47 · 유틸리티 5 — 2026-07-31 추출)
- 우리 현재 스펙: v1.0.0 (그리드 옵션 14 · 컬럼 정의 21 · 메서드 26 · 이벤트 10 — `docs/api-data.js`)
- 우선순위: **P1** 다음 릴리스(v1.1) · **P2** 그다음(v1.2) · **P3** 백로그 · **제외** 도입 안 함(사유 명시)

## 유지 원칙 (스펙업 시 변하지 않는 것)

1. 의존성 0, 모듈 시스템 없음 — `<script>` 태그 + 전역 `DataGrid` 하나.
2. 테마는 CSS 토큰(`--dg-*`)으로만 — JS에 색·크기 하드코딩 금지.
3. 데이터 로직은 DOM 없는 순수 함수로 작성해 Node 단위 테스트 (`test/run-tests.js`).
4. 새 API는 반드시 `docs/api-data.js`에 등록하고, 데모는 Example/View Source 카드로 추가.
5. ParamQuery의 jQuery 위젯 관례(`option()` 시그니처, `ui` 인자 등)는 따르지 않고 **우리 관례**(옵션 객체, 명시적 메서드, `grid.on(name, payload)`)로 번역해서 도입한다.

---

## 1. 현재 커버리지 — 이미 동등 스펙이 있는 것

| ParamQuery | 우리 스펙 (v1.0.0) |
|---|---|
| `colModel` / `columnTemplate` | `columnDefs` / `defaultColDef` |
| `column > dataIndx · title · width · minWidth · align · hidden · sortable · resizable · editable · editor · cls · render` | `field · headerName · width · minWidth · align · hide · sortable · resizable · editable · editor · cellClass · cellRenderer` |
| `column > sortType`(커스텀 정렬) | `comparator` |
| `column > filter` | `filter: 'text' \| 'number' \| 'set'` |
| `freezeCols` | `pinned: 'left' \| 'right'` |
| `column > cb`(체크박스) | `checkboxSelection` / `headerCheckboxSelection` |
| `flex`(컬럼) | `flex` |
| `sortModel` (다중 정렬, UI 포함) | `sortModel` + Shift+클릭 다중 정렬, `setSortModel/getSortModel` |
| `filter()` 메서드 | `applyColumnFilter` / `getFilterModel` / `clearFilters` |
| `pageModel` (`rPP`, `rPPOptions`, `curPage`) | `pagination` / `paginationPageSize` / `paginationPageSizeOptions` / `setPage` / `setPageSize` |
| `selectionModel` row 선택 (single/multiple) | `rowSelection: 'single' \| 'multiple'` + 범위/토글 선택 |
| `virtualY` | 행 가상화 (기본 내장) |
| `stripeRows` | `zebra` |
| `rowHeight` | `rowHeight` |
| `dragColumns` / `columnOrder` | `columnReorder` / `columnMoved` |
| `addRow · updateRow · deleteRow` | `addRow(s) · updateRow · removeRows · removeSelectedRows` |
| `exportCsv` | `getCsv` / `exportCsv` |
| `showLoading` / `hideLoading` | `showLoadingOverlay` / `hideLoadingOverlay` |
| `refresh` / `destroy` / `on` / `off` | 동일 |
| `getColModel` / `getRowData` | `getColumns` / `getRowData` / `getDisplayedRows` |
| `cellClick · rowClick · rowDblClick · columnResize · columnOrder · selectChange · sort · filter` 이벤트 | `cellClicked · rowClicked · rowDoubleClicked · columnResized · columnMoved · selectionChanged · sortChanged · filterChanged` |
| — (우리가 앞서는 것) | 퀵 필터, CSS 토큰 테마 + 다크 모드, 내장 렌더러(tag/check/progress), 접근성 role, RFC4180+BOM CSV |

---

## 2. 추가로 가져가야 할 스펙 (Gap)

### 2.1 데이터 · 그룹핑

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`groupModel`** (행 그룹핑: `dataIndx[]`, `collapsed`, `dir`, `title`, 그룹 헤더 행) | `groupBy: ['dept']` 옵션 + `setGroupBy()`/`getGroupBy()`, `groupDefaultExpanded`, 그룹 헤더 행 접기/펼치기 — v1.1.0 | **P1** |
| [x] | `groupModel > showSummary · grandSummary`, `column > summary`, `summaryData`, util `aggregate` | `column.aggFunc: 'sum'\|'avg'\|'min'\|'max'\|'count'` (그룹 헤더 행 집계) + `grandTotal: true` 전체 요약 행 — v1.1.0 | **P1** (그룹핑과 함께) |
| [x] | `collapse() / expand() / toggle()` (그룹 전체) | `expandAllGroups()` / `collapseAllGroups()` — v1.1.0 | **P1** (그룹핑과 함께) |
| [x] | `group` / `beforeGroupExpand` / `toggle` 이벤트 | `groupChanged` / `groupToggled` — v1.1.0 | **P1** (그룹핑과 함께) |
| [ ] | **`dataModel`** (원격 데이터: `url · method · postData · getData · location:'remote'`, remote 정렬/필터/페이징) | `dataSource: { url, method, params, parse }` + `sortMode/filterMode/pageMode: 'client'\|'server'` | **P2** |
| [ ] | `detailModel` + `rowExpand/rowCollapse` (마스터-디테일 행) | `rowDetail: { renderer }` + `expandRow()/collapseRow()` + `rowExpanded` 이벤트 | **P2** |
| [ ] | `column > formula` (계산 컬럼) | `valueGetter(row)` — 파생 값 계산(정렬·필터에도 사용) | **P2** |
| [ ] | `mergeCells` | 셀 병합 | P3 |

### 2.2 편집 · 검증 · 변경 추적

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`column > validations`**, `validation`, `isValid()` (편집 검증: minLen/maxLen/format/regexp/nonEmpty/gte/lte) | `column.validator(value, row) => true \| '오류 메시지'` — 실패 시 커밋 거부 + 편집기 유지(`--dg-invalid-color` 표시, title 툴팁) — v1.1.0 | **P1** |
| [x] | **편집 프로그래매틱 제어**: `editCell() · quitEditMode() · saveEditCell() · getEditCell() · isEditableCell()` | `startEdit(row, field)`(페이지 이동·스크롤 포함, 성공 여부 반환) / `stopEdit(commit)` / `isEditing()` — v1.1.0 | **P1** |
| [x] | 편집 라이프사이클 이벤트: `editorBegin · editorEnd · cellBeforeSave(취소 가능) · cellSave` | `editingStarted` / `editingStopped`(payload에 `committed`) / `beforeCellSave`(`e.cancel = true` 거부, `e.newValue` 수정 가능) — v1.1.0 | **P1** |
| [ ] | `editModel` (Enter/Tab/화살표로 다음 셀 이동하며 연속 편집, 클릭 한 번 편집) | `editOnSingleClick`, `enterMovesDown`, `tabMovesRight` 옵션 | **P2** |
| [ ] | 커스텀 에디터 (`column > editor` 함수형: init/getData) | `editor: { init(cell, value), getValue(), destroy() }` 객체 지원 | **P2** |
| [ ] | **`trackModel` + `getChanges() · isDirty() · commit() · rollback()`** (변경 추적) | `trackChanges: true` 옵션 + `getChanges()` (added/updated/deleted) / `commitChanges()` / `rollbackChanges()` + dirty 셀 표시 | **P2** |
| [ ] | `historyModel` + `history({method:'undo'\|'redo'})` | `undo()` / `redo()` + `canUndo()/canRedo()` | **P2** (변경 추적 위에) |
| [ ] | `change` 이벤트 (행 단위 변경 묶음) | `rowValueChanged` | P3 |

### 2.3 클립보드 · 내보내기 · 상태

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`copy()` / `paste()` / `pasteModel` / `column > copy`** (엑셀 호환 TSV 클립보드) | 선택 행 <kbd>Ctrl+C</kbd> 복사(원시 값, `copy()` 메서드), 포커스 셀에 <kbd>Ctrl+V</kbd> 붙여넣기(`pasteTsv(text)`, editable+validator+beforeCellSave 통과 셀만), `column.suppressCopy` — v1.1.0 | **P1** |
| [x] | **`saveState()` / `loadState()`** (컬럼 폭·순서·정렬·필터·페이지 저장/복원) | `getState()` / `setState(state)` — JSON 직렬화 가능, `stateChanged` 이벤트 — v1.1.0 | **P1** |
| [x] | `exportData({format:'json'\|'html'})` | `getJson()` — 뷰 데이터 JSON 문자열 내보내기 (원시 값) — v1.1.0 | **P1** (쉬움) |
| [ ] | `exportExcel` / `exportData({format:'xlsx'})` | `exportExcel()` — 의존성 없이 가능한 SpreadsheetML/xlsx 최소 구현 검토 | **P2** |
| [ ] | `beforeExport` 이벤트, `column > exportRender` | `beforeExport`(취소·가공 가능), `column.exportFormatter` | **P2** |

### 2.4 컬럼 · 레이아웃

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [ ] | **`column > colModel`** (중첩 컬럼 = 헤더 그룹 2단) | `columnGroups: [{ headerName, children: [...] }]` | **P2** |
| [x] | `column > dataType/type` (`string·integer·float·date·bool`) | `column.dataType: 'string'\|'number'\|'date'\|'bool'` — 정렬 비교·필터 종류·기본 정렬(align)·기본 에디터 자동 결정 — v1.1.0 | **P1** |
| [x] | `column > format` (`#,###.00`, 날짜 포맷) + util `formatNumber` | `column.format: '#,##0.00' \| 'yyyy-MM-dd'` 선언적 포맷 (valueFormatter의 간편판) + `DataGrid.format()` 유틸 — v1.1.0 | **P1** |
| [x] | `numberCell` (행 번호 컬럼) | `rowNumbers: true` 옵션 (좌측 고정, 표시 순서 기준) — v1.1.0 | **P1** (쉬움) |
| [x] | `column > maxWidth` | `maxWidth` — 리사이즈·flex·autoSize 상한 — v1.1.0 | **P1** (쉬움) |
| [x] | `editable` (그리드 레벨 on/off) | `editable: false` 옵션 — 컬럼 설정 무시하고 잠금 + `setEditable(bool)` / `isEditable()` — v1.1.0 | **P1** (쉬움) |
| [ ] | `column > nodrag/nodrop` | `column.suppressMove` | **P2** |
| [ ] | `rowInit` (행별 클래스/속성) | `getRowClass(row, index) => string` 옵션 | **P2** |
| [ ] | `column > halign` (헤더만 다른 정렬) | `headerAlign` | P3 |
| [ ] | `hwrap/wrap` (셀 줄바꿈 + 행 높이 자동) | `wrapText` + `autoRowHeight` | P3 |
| [ ] | `freezeRows` (상단 행 고정) | `pinnedTopRows` | P3 |
| [ ] | `virtualX` (컬럼 가상화) | 컬럼 수백 개 시나리오용 | P3 |
| [ ] | `flexHeight/flexWidth` (콘텐츠 크기에 맞춘 그리드) | `domLayout: 'autoHeight'` | P3 |

### 2.5 선택 · 탐색 · 상호작용

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [ ] | **`selectionModel`** (`type:'cell'`, `type:'block'` — 셀/블록 범위 선택) | `cellSelection: true` — 셀 단위 선택 + 드래그 블록 선택 (클립보드 복사의 기반) | **P2** |
| [x] | `focus() · setSelection() · scrollRow() · scrollColumn()` | `focusCell(rowIndex, field)` / `ensureRowVisible(row)` / `ensureColumnVisible(colId)` — 페이지 이동·스크롤 포함, boolean 반환 — v1.1.0 | **P1** (쉬움) |
| [ ] | `search()` (찾아서 스크롤+포커스) | `findNext(text)` — 퀵필터와 별개의 탐색 | **P2** |
| [ ] | `cellRightClick / rowRightClick / headerCellClick` | `cellContextMenu` / `headerClicked` 이벤트 (컨텍스트 메뉴는 소비자 구현) | **P2** |
| [ ] | `cellKeyDown` | `cellKeyDown` 이벤트 (payload에 `e.originalEvent`) | **P2** |
| [x] | `cellDblClick` | `cellDoubleClicked` 이벤트 (payload: data/colDef/value/rowIndex) — v1.1.0 | **P1** (쉬움) |
| [ ] | `swipeModel` (모바일 킨네틱 스크롤) | 터치 스크롤은 네이티브로 충분 — 필요 시 재검토 | P3 |
| [ ] | `autofill / fillHandle` (엑셀식 채우기 핸들, 패턴 인식) | 셀 선택 + 편집 위에 `fillHandle: true` | P3 |
| [ ] | `hoverMode` (`cell` 호버) | 현재 row 호버로 충분 | P3 |

### 2.6 라이프사이클 · 렌더링 제어

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [ ] | `create · load · dataReady · render · refresh · complete` 이벤트 | `gridReady` / `dataChanged` / `viewRendered` 3개로 정리 | **P1** (쉬움) |
| [ ] | **취소 가능한 before 이벤트 패턴** (`beforeSort · beforeTableView · beforeCheck …`) | 이벤트 payload에 `e.cancel = true` 규약 도입 — 우선 `beforeSort` / `beforeCellSave`(✔ v1.1.0에서 규약 도입) / `beforeExport` / `beforeSelectionChange` | **P1** |
| [ ] | `refreshCell() / refreshRow() / refreshColumn()` (부분 갱신) | 동일 이름 — 대량 데이터에서 전체 refresh 회피 | **P2** |
| [ ] | `option(name, value)` (런타임 옵션 변경) | `setOptions({ ... })` — 재생성 없이 주요 옵션 갱신 | **P2** |
| [ ] | `one(event, fn)` | `once(event, fn)` | P3 |
| [ ] | `disable() / enable()` | `setEnabled(bool)` — 전체 인터랙션 잠금 오버레이 | P3 |
| [x] | `reset({filter, group, sort})` | `resetState({ filter, sort, group, columns, page })` 통합 리셋 (인자 없으면 전체) — v1.1.0 | **P1** (쉬움) |

### 2.7 툴바 · 표시 요소

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [ ] | `title / showTitle` | `title: '직원 목록'` 옵션 — 그리드 상단 타이틀 바 | **P2** |
| [ ] | `toolbar / showToolbar / refreshToolbar` | `toolbar: { items: [...] }` 슬롯 또는 소비자 DOM 주입 — 우리는 데모처럼 외부 툴바 권장, 내장은 최소한으로 | **P2** |
| [x] | `filterModel`의 **헤더 필터 행** (`header: true`, 컬럼 아래 인라인 필터 입력) | `floatingFilter: true` — 헤더 아래 필터 행, 메뉴와 필터 모델 공유 (text/number 입력 + set 드롭다운) — v1.1.0 | **P1** |
| [ ] | `showHeader / showTop / showBottom` | `showHeader: false` 정도만 | P3 |

---

## 3. 도입하지 않는 것 (제외 + 사유)

| ParamQuery 스펙 | 사유 |
|---|---|
| `widget() · getInstance() · option()`(jQuery 시그니처) · `hscrollbar() · vscrollbar() · pager() · toolbar()`(위젯 반환) | jQuery UI 위젯 관례. 우리는 인스턴스 메서드/옵션 객체로 대체 |
| `bootstrap` 옵션 | 특정 CSS 프레임워크 통합 — CSS 토큰 테마로 해결 |
| `xmlToArray · xmlToJson · tableToArray` | XML/레거시 변환 유틸은 그리드 책임 밖 |
| `draggable`(그리드 자체 드래그 이동) · `collapsible`(패널 접기) · `roundCorners` | 앱 레이아웃/테마 영역. `--dg-wrapper-border-radius` 토큰으로 대체 |
| `columnBorders · rowBorders` 옵션 | CSS 토큰(`--dg-row-border-color` 등)으로 이미 제어 가능 |
| `height · width · maxHeight · minWidth`(그리드 크기 옵션) | 컨테이너 기반 크기 정책 유지 — CSS가 담당 |
| `postRenderInterval · stringify · trigger · warning` | 내부 구현 세부사항 |
| `dataModel > beforeSend/contentType/dataType`(jQuery.ajax 세부) | 원격 데이터는 `fetch` 기반 `dataSource`로 재설계 (§2.1) |
| `bubble` | 툴팁은 `cellRenderer` + `title` 속성으로 충분 |

---

## 4. 버전 로드맵 제안

### v1.1 — "실무 편집 그리드" (P1 전부)
1. **행 그룹핑 + 요약**(groupBy, aggFunc, 그룹 접기/펼치기) — 최대 기능 갭
2. **헤더 필터 행**(floatingFilter)
3. **편집 완성**: validator, startEdit/stopEdit, beforeCellSave(취소 가능), editingStarted/Stopped
4. **클립보드 복사/붙여넣기**(TSV)
5. **상태 저장/복원**(getState/setState) + resetState
6. **컬럼 dataType + 선언적 format** + rowNumbers, maxWidth, 그리드 editable
7. 라이프사이클 이벤트(gridReady/dataChanged/viewRendered), cellDoubleClicked, focusCell/ensureVisible, getJson

### v1.2 — "대규모 · 연동" (P2)
- 변경 추적 + undo/redo, 원격 dataSource(서버 정렬/필터/페이징), 셀/블록 선택, 마스터-디테일 행, 중첩 컬럼 헤더, valueGetter, 커스텀 에디터, editModel(연속 편집), 부분 refresh, setOptions, search, 컨텍스트 메뉴 이벤트, exportExcel, title/toolbar

### v2.0+ — 백로그 (P3)
- fillHandle/autofill, mergeCells, virtualX, pinnedTopRows, wrapText/autoRowHeight, autoHeight 레이아웃, once, setEnabled, headerAlign

---

## 5. 진행 관리 방법

1. 스펙 하나를 시작할 때: 이 문서의 체크박스에 작업 중 표시 → 구현 → 테스트(`test/run-tests.js`에 데이터 로직 추가) → `docs/api-data.js`에 `since: '1.x.0'`으로 문서화 → Features 페이지에 Example/View Source 카드 추가 → 체크.
2. API 이름은 "제안 API" 컬럼을 기본으로 하되, 구현 중 바뀌면 이 문서를 갱신한다.
3. 새로운 비교 대상(AG Grid Enterprise, Kendo 등)을 추가 분석할 때는 §2 표에 컬럼을 추가하지 말고 별도 섹션으로 append한다.
