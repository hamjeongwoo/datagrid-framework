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
| [x] | **`dataModel`** (원격 데이터: `url · method · postData · getData · location:'remote'`, remote 정렬/필터/페이징) | `dataSource: { url, method, params, parse }` + `sortMode/filterMode/pageMode: 'client'\|'server'` + `reloadData()` + `dataLoadError` — 데모 서버 `/api/employees` 포함 — v1.2.0 | **P2** |
| [x] | `detailModel` + `rowExpand/rowCollapse` (마스터-디테일 행) | `rowDetail: { renderer, height }` + `expandRow()/collapseRow()/toggleRowDetail()/isRowExpanded()` + `rowExpanded`/`rowCollapsed` — 가변 높이 가상화(computeRowTops) — v1.2.0 | **P2** |
| [x] | `column > formula` (계산 컬럼) | `valueGetter(row)` — 파생 값을 row[field]에 기록(정렬·필터·내보내기 공유) — v1.2.0 | **P2** |
| [x] | `mergeCells` | `mergeCells: ['field'...]` — 표시 순서 기준 연속 동일 값 세로 병합 (그룹/디테일에서 단절) — v2.0.0 | P3 |

### 2.2 편집 · 검증 · 변경 추적

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`column > validations`**, `validation`, `isValid()` (편집 검증: minLen/maxLen/format/regexp/nonEmpty/gte/lte) | `column.validator(value, row) => true \| '오류 메시지'` — 실패 시 커밋 거부 + 편집기 유지(`--dg-invalid-color` 표시, title 툴팁) — v1.1.0 | **P1** |
| [x] | **편집 프로그래매틱 제어**: `editCell() · quitEditMode() · saveEditCell() · getEditCell() · isEditableCell()` | `startEdit(row, field)`(페이지 이동·스크롤 포함, 성공 여부 반환) / `stopEdit(commit)` / `isEditing()` — v1.1.0 | **P1** |
| [x] | 편집 라이프사이클 이벤트: `editorBegin · editorEnd · cellBeforeSave(취소 가능) · cellSave` | `editingStarted` / `editingStopped`(payload에 `committed`) / `beforeCellSave`(`e.cancel = true` 거부, `e.newValue` 수정 가능) — v1.1.0 | **P1** |
| [x] | `editModel` (Enter/Tab/화살표로 다음 셀 이동하며 연속 편집, 클릭 한 번 편집) | `editOnSingleClick`, `enterMovesDown`, `tabMovesRight` 옵션 — 커밋 성공 시에만 이동, 행 끝 줄바꿈 — v1.2.0 | **P2** |
| [x] | 커스텀 에디터 (`column > editor` 함수형: init/getData) | `editor: { init(cell, value, row, col), getValue(), destroy() }` 객체 지원 — validator·beforeCellSave 동일 적용 — v1.2.0 | **P2** |
| [x] | **`trackModel` + `getChanges() · isDirty() · commit() · rollback()`** (변경 추적) | `trackChanges: true` 옵션 + `getChanges()` (added/updated/deleted) / `commitChanges()` / `rollbackChanges()` + dirty 셀·추가 행 표시 — v1.2.0 | **P2** |
| [x] | `historyModel` + `history({method:'undo'\|'redo'})` | `undoRedo: true` 옵션 + `undo()` / `redo()` / `canUndo()/canRedo()` + Ctrl+Z/Y — v1.2.0 | **P2** (변경 추적 위에) |
| [x] | `change` 이벤트 (행 단위 변경 묶음) | `rowValueChanged` — 편집·붙여넣기·채우기 공통, payload `{ data, changes }` — v2.0.0 | P3 |

### 2.3 클립보드 · 내보내기 · 상태

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`copy()` / `paste()` / `pasteModel` / `column > copy`** (엑셀 호환 TSV 클립보드) | 선택 행 <kbd>Ctrl+C</kbd> 복사(원시 값, `copy()` 메서드), 포커스 셀에 <kbd>Ctrl+V</kbd> 붙여넣기(`pasteTsv(text)`, editable+validator+beforeCellSave 통과 셀만), `column.suppressCopy` — v1.1.0 | **P1** |
| [x] | **`saveState()` / `loadState()`** (컬럼 폭·순서·정렬·필터·페이지 저장/복원) | `getState()` / `setState(state)` — JSON 직렬화 가능, `stateChanged` 이벤트 — v1.1.0 | **P1** |
| [x] | `exportData({format:'json'\|'html'})` | `getJson()` — 뷰 데이터 JSON 문자열 내보내기 (원시 값) — v1.1.0 | **P1** (쉬움) |
| [x] | `exportExcel` / `exportData({format:'xlsx'})` | `exportExcel(filename, sheetName)` — 의존성 없는 무압축 ZIP + SpreadsheetML, 숫자는 숫자 셀 — v1.2.0 | **P2** |
| [x] | `beforeExport` 이벤트, `column > exportRender` | `beforeExport`(취소·rows/columns/filename 가공), `column.exportFormatter` — v1.2.0 | **P2** |

### 2.4 컬럼 · 레이아웃

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`column > colModel`** (중첩 컬럼 = 헤더 그룹 2단) | `columnGroups: [{ headerName, children: [colId\|field...] }]` — 연속 컬럼 스팬, pinned 경계 분리 — v1.2.0 | **P2** |
| [x] | `column > dataType/type` (`string·integer·float·date·bool`) | `column.dataType: 'string'\|'number'\|'date'\|'bool'` — 정렬 비교·필터 종류·기본 정렬(align)·기본 에디터 자동 결정 — v1.1.0 | **P1** |
| [x] | `column > format` (`#,###.00`, 날짜 포맷) + util `formatNumber` | `column.format: '#,##0.00' \| 'yyyy-MM-dd'` 선언적 포맷 (valueFormatter의 간편판) + `DataGrid.format()` 유틸 — v1.1.0 | **P1** |
| [x] | `numberCell` (행 번호 컬럼) | `rowNumbers: true` 옵션 (좌측 고정, 표시 순서 기준) — v1.1.0 | **P1** (쉬움) |
| [x] | `column > maxWidth` | `maxWidth` — 리사이즈·flex·autoSize 상한 — v1.1.0 | **P1** (쉬움) |
| [x] | `editable` (그리드 레벨 on/off) | `editable: false` 옵션 — 컬럼 설정 무시하고 잠금 + `setEditable(bool)` / `isEditable()` — v1.1.0 | **P1** (쉬움) |
| [x] | `column > nodrag/nodrop` | `column.suppressMove` — 드래그 이동 제외 — v1.2.0 | **P2** |
| [x] | `rowInit` (행별 클래스/속성) | `getRowClass(row, index) => string` 옵션 — v1.2.0 | **P2** |
| [x] | `column > halign` (헤더만 다른 정렬) | `column.headerAlign: 'left'\|'center'\|'right'` — v2.0.0 | P3 |
| [x] | `hwrap/wrap` (셀 줄바꿈 + 행 높이 자동) | `column.wrapText` + `autoRowHeight: true` — 텍스트 폭 측정 기반 가변 높이 가상화 — v2.0.0 | P3 |
| [x] | `freezeRows` (상단 행 고정) | `pinnedTopRows: [rows]` + `setPinnedTopRows()` — 표시 전용 고정 행 — v2.0.0 | P3 |
| [x] | `virtualX` (컬럼 가상화) | `virtualX: true` — 가시 컬럼 + 버퍼만 렌더, 창 밖은 스페이서 (computeColumnWindow) — v2.0.0 | P3 |
| [x] | `flexHeight/flexWidth` (콘텐츠 크기에 맞춘 그리드) | `domLayout: 'autoHeight'` — 내용 높이만큼 확장 (세로 가상화 비활성, 소량 데이터용) — v2.0.0 | P3 |

### 2.5 선택 · 탐색 · 상호작용

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`selectionModel`** (`type:'cell'`, `type:'block'` — 셀/블록 범위 선택) | `cellSelection: true` — 드래그/Shift 블록 선택 + `getCellRange()`/`clearCellRange()` + Ctrl+C 블록 복사 + `cellRangeChanged` — v1.2.0 | **P2** |
| [x] | `focus() · setSelection() · scrollRow() · scrollColumn()` | `focusCell(rowIndex, field)` / `ensureRowVisible(row)` / `ensureColumnVisible(colId)` — 페이지 이동·스크롤 포함, boolean 반환 — v1.1.0 | **P1** (쉬움) |
| [x] | `search()` (찾아서 스크롤+포커스) | `findNext(text)` — 순환 탐색, 퀵필터와 별개 — v1.2.0 | **P2** |
| [x] | `cellRightClick / rowRightClick / headerCellClick` | `cellContextMenu` / `headerClicked` 이벤트 (컨텍스트 메뉴는 소비자 구현) — v1.2.0 | **P2** |
| [x] | `cellKeyDown` | `cellKeyDown` 이벤트 (payload에 `originalEvent`) — v1.2.0 | **P2** |
| [x] | `cellDblClick` | `cellDoubleClicked` 이벤트 (payload: data/colDef/value/rowIndex) — v1.1.0 | **P1** (쉬움) |
| [x] | `swipeModel` (모바일 킨네틱 스크롤) | 도입하지 않기로 확정 — 터치 스크롤은 네이티브로 충분 (v2.0.0 검토 종결) | P3 |
| [x] | `autofill / fillHandle` (엑셀식 채우기 핸들, 패턴 인식) | `fillHandle: true` (cellSelection 필요) — 세로 드래그, 숫자 등차 외삽/패턴 반복, `fillApplied` — v2.0.0 | P3 |
| [x] | `hoverMode` (`cell` 호버) | 도입하지 않기로 확정 — row 호버로 충분 (v2.0.0 검토 종결) | P3 |

### 2.6 라이프사이클 · 렌더링 제어

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | `create · load · dataReady · render · refresh · complete` 이벤트 | `gridReady`(초기 1회, 비동기) / `dataChanged`(setRowData·addRows·removeRows·updateRow) / `viewRendered`(모든 refresh 후) — v1.1.0 | **P1** (쉬움) |
| [x] | **취소 가능한 before 이벤트 패턴** (`beforeSort · beforeTableView · beforeCheck …`) | `e.cancel = true` 규약 — `beforeSort` / `beforeSelectionChange` / `beforeCellSave` 도입(v1.1.0). `beforeExport`는 §2.3 P2에서 | **P1** |
| [x] | `refreshCell() / refreshRow() / refreshColumn()` (부분 갱신) | 동일 이름 — 렌더된 DOM만 제자리 갱신, boolean 반환 — v1.2.0 | **P2** |
| [x] | `option(name, value)` (런타임 옵션 변경) | `setOptions({ ... })` — 재생성 없이 주요 옵션 갱신 (pagination 패널 생성/제거 포함) — v1.2.0 | **P2** |
| [x] | `one(event, fn)` | `once(event, fn)` — wrapper 반환으로 조기 해제 가능 — v2.0.0 | P3 |
| [x] | `disable() / enable()` | `setEnabled(bool)` / `isEnabled()` — 오버레이 + 키보드 잠금 — v2.0.0 | P3 |
| [x] | `reset({filter, group, sort})` | `resetState({ filter, sort, group, columns, page })` 통합 리셋 (인자 없으면 전체) — v1.1.0 | **P1** (쉬움) |

### 2.7 툴바 · 표시 요소

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | `title / showTitle` | `title: '직원 목록'` 옵션 — 그리드 상단 타이틀 바 (setOptions로 변경) — v1.2.0 | **P2** |
| [x] | `toolbar / showToolbar / refreshToolbar` | `toolbar: HTMLElement \| (grid) => HTMLElement` 슬롯 — 소비자 DOM 주입 방식 — v1.2.0 | **P2** |
| [x] | `filterModel`의 **헤더 필터 행** (`header: true`, 컬럼 아래 인라인 필터 입력) | `floatingFilter: true` — 헤더 아래 필터 행, 메뉴와 필터 모델 공유 (text/number 입력 + set 드롭다운) — v1.1.0 | **P1** |
| [x] | `showHeader / showTop / showBottom` | `showHeader: false` — 헤더 영역 숨김 — v2.0.0 | P3 |

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

### v2.1 — "TreeGrid" (§6 T1~T4)
- treeData 코어(계층 표시·펼침/접힘·계층 정렬/필터), 체크박스 캐스케이드, 부모 요약, 지연 로딩

### v2.6 — CRUD 스테이징 내장화: softDelete + statusColumn (사용자 요청)
데모(#remote-crud-staging)에서 소비자 코드로 짜던 신규/수정/삭제 스테이징을 옵션으로 내장한다. 기존 `trackChanges` 추적 상태(added/updated/deleted)를 단일 진실로 사용 — 별도 상태 필드(`_rowStatus` 등)를 데이터에 심지 않는다.

- `softDelete: true` — `removeRows`/`removeSelectedRows`의 의미를 스테이징으로 전환: **기준선(서버) 행은 제거하지 않고 "삭제 표시"**(행 유지 + `dg-row-deleted` 취소선/흐림, `--dg-deleted-row-opacity` 토큰), **추가(신규) 행은 지금처럼 로우 자체 제거**(흔적 없음). 삭제 표시 행은 UI 편집 차단(더블클릭/Enter/`startEdit`/붙여넣기/채우기 — API `updateRow`는 허용), 선택은 가능(복원 UX). `getChanges().deleted`에 표시 행이 그대로 나온다.
- `statusColumn: true | { headerName: 'Status', width: 90, labels: { added: 'New', updated: 'Updated', deleted: 'Deleted' }, colors: { added: 'green', updated: 'yellow', deleted: 'red' } }` — 추적 상태를 표시하는 내장 컬럼(`__rowStatus`, 좌측 고정, 정렬/필터/편집 제외). dg-tag 렌더 재사용. `setOptions`로 켜고 끌 수 있음(컬럼 재구성 축에 추가).
- `softDelete` 또는 `statusColumn`을 켜면 `trackChanges`가 자동 활성화된다 (옵션 하나로 동작하는 zero-config).
- `restoreRows(rows) => number` — 삭제 표시 해제(복원된 행 수 반환). `getRowStatus(row) => 'added' | 'updated' | 'deleted' | null` 공개 메서드.
- 기존 API와의 결합: `commitChanges()`는 삭제 표시 행을 **물리 제거**하고 기준선 확정(물리 제거를 가로지르는 undo 미지원 — 히스토리 클리어), `rollbackChanges()`는 표시만 해제(행은 이미 제자리). undo/redo는 소프트 삭제(`en.soft` 엔트리)·복원을 마크 토글로 되돌린다(재삽입/재제거 아님).
- 순수 함수: `resolveStatusColumnConfig(option)`(기본값 병합), `partitionStagedRemoval(rows, allRows, addedRows, alreadyDeleted)`(hard/soft 분류) — `_test` 노출.

### v2.5 — Remote Data Source 서버 스펙 맞춤 (사용자 요청)
- `dataSource.request(state) => params` — 기본 파라미터 매핑(`page·pageSize·sort·filter·quickFilter`)을 **대체**하는 커스텀 요청 빌더. state는 `{ page, pageSize, sortModel, filterModel, quickFilter, sortMode, filterMode, pageMode }` 읽기 전용 스냅샷. 반환 객체가 `params`(고정 파라미터) 위에 merge되며, 값이 `undefined`인 키는 생략된다(조건부 파라미터). 예외 시 `console.error` + 기본 매핑 폴백. `offset/limit`, `orderBy=field:dir` 등 어떤 서버 스펙에도 대응.
- `dataSource.headers: object | () => object` — 요청 헤더(인증 토큰 등). 함수는 요청마다 평가(토큰 갱신 대응), 예외 시 헤더 없이 진행. POST의 `Content-Type: application/json` 기본값은 유지하되 같은 키를 주면 덮어쓴다.
- `setDataSource(dataSource)` — 런타임 교체(1페이지 리셋 + `reloadData()`). 조회 조건만 바뀌는 경우는 기존대로 `params`를 함수로 두고 `reloadData()`.
- 데모 서버에 다른 스펙의 엔드포인트 `/api/employees-v2`(offset/limit/orderBy=field:dir/q/dept, 응답 `{ result: { items, totalCount, receivedToken } }`, `X-Demo-Token` 에코)를 server.js·server.py 양쪽에 추가하고, features.html에 request/parse/headers/params 조합 카드로 시연.
- api.html에 Remote Data Source 전용 가이드 섹션(kind: guide) 추가 — 기본 스펙/3축 모드/응답·요청 커스텀/헤더/런타임 변경/에러 처리 전체 흐름.

### v2.4 — 커스텀 헤더 (사용자 요청)
- `column.headerRenderer(params) => string | HTMLElement` — 헤더 셀 라벨을 커스텀 콘텐츠로 교체 (`cellRenderer`의 헤더판). params: `{ colDef, headerName }`. 문자열 반환은 HTML로 삽입(이스케이프 안 함 — cellRenderer와 동일 경고), Element 반환은 append. 정렬 아이콘·필터 메뉴 버튼·리사이저·리오더·헤더 체크박스 등 기본 동작은 그대로 유지된다. 콜백 예외는 잡아서 `console.error` + 기본 텍스트 라벨 폴백.
- `column.headerClass: string | (colDef) => string` — 헤더 셀에 추가 클래스 (`cellClass`의 헤더판, 공백 구분 다중 클래스 지원).
- `column.headerTooltip: string` — 헤더 셀 `title` 속성.
- 인터랙티브 요소 가드 — 커스텀 헤더 안의 `button·input·select·textarea·a·label` 클릭/드래그는 정렬 토글·`headerClicked`·컬럼 리오더를 발동하지 않는다 (요소 본연의 동작만 수행).
- 참고: `autoSizeColumn`의 헤더 폭 측정은 `headerName` 텍스트 기준 유지 (커스텀 콘텐츠 폭은 미반영 — 문서에 명시).

### v2.3 — 검색형 select 에디터 (사용자 요청)
- `column.editorSearch` — `editor: 'select'`를 검색 입력이 있는 셀 앵커 옵션 패널로 전환 (옵셔널). `true`면 정적 `editorOptions`를 로컬 필터(label/문자열화 value 부분 일치, 대소문자 무관), `{ fetch(query, row, col) => Promise<options>, debounce: 250, minLength: 0, placeholder }`면 질의마다 비동기 로드(lazy 검색 — 디바운스, 최신 질의만 반영, 실패 시 console.error + "Load failed" 표시).
- 키보드: ↑/↓ 옵션 이동, Enter 선택+커밋, 옵션 클릭 즉시 커밋(전파 차단 — editOnSingleClick 재진입 방지), Esc 취소. 옵션을 고르지 않으면 미커밋.
- `DataGrid.renderers.searchselect(options?)` — 짝꿍 렌더러. select 렌더러와 동일 + lazy로 고른 값은 그리드가 유지하는 컬럼별 value→label 캐시로 표시 (cellRenderer params에 `optionLabels` 추가).
- 데모: features.html 카드에 editOnSingleClick 토글 체크박스 포함 (클릭 한 번 편집과 조합 테스트).

### v2.2 — select 에디터 label/value (사용자 요청)
- `editorOptions`가 문자열 배열 외에 `{ label, value }` 객체 배열 지원 — 드롭다운은 label 표시, 커밋은 value(원본 타입 보존). 셀에는 저장된 value가 표시된다.
- `editor`를 선언한 컬럼은 `editable: true` 생략 가능 — editor 선언 자체가 편집 의도. 명시적 `editable: false`(컬럼 또는 defaultColDef)가 우선.
- `DataGrid.renderers.select(options?)` — select 에디터 짝꿍 렌더러. 저장된 value를 editorOptions의 label로 표시 (options 생략 시 컬럼 editorOptions 사용, 목록 밖 값은 폴백).
- `editor: 'multiselect' | 'radio' | 'checkbox'` + 짝꿍 렌더러 `renderers.multiselect()/radio()/checkbox()` — multiselect는 셀에 앵커된 체크리스트 패널(아래 공간 부족 시 위로 펼침)에서 배열 값을 editorOptions 순서로 커밋(내용 동일하면 미커밋), radio는 multiselect와 같은 셀 앵커 패널에서 단일 선택(처음엔 인라인 그룹이었으나 multiselect와 형태 통일 — 사용자 요청), checkbox는 불리언 또는 `editorOptions: { checked, unchecked }` 매핑(Y/N·0/1 등 — 매핑 없이도 'y'/'yes'/'true'/'1' 계열 인식). 렌더러는 각각 label 칩 목록 / value→label / 표시 전용 체크박스(pointer-events 통과로 dblclick 편집 안 막음).

---

## 5. 진행 관리 방법

1. 스펙 하나를 시작할 때: 이 문서의 체크박스에 작업 중 표시 → 구현 → 테스트(`test/run-tests.js`에 데이터 로직 추가) → `docs/api-data.js`에 `since: '1.x.0'`으로 문서화 → Features 페이지에 Example/View Source 카드 추가 → 체크.
2. API 이름은 "제안 API" 컬럼을 기본으로 하되, 구현 중 바뀌면 이 문서를 갱신한다.
3. 새로운 비교 대상(AG Grid Enterprise, Kendo 등)을 추가 분석할 때는 §2 표에 컬럼을 추가하지 말고 별도 섹션으로 append한다.

---

## 6. TreeGrid (ParamQuery Pro `demos/treegrid` 비교) — 2026-08-01 추가

계층 데이터(트리) 표시 스펙. ParamQuery는 treegrid를 grid 위에 얹은 별도 위젯(`treeModel` 옵션 + `Tree()` API 객체)으로 제공한다.
우리는 별도 위젯 없이 **`treeData` 옵션 하나**로 기존 뷰 파이프라인(필터 → 정렬 → 가상화)에 통합한다.
트리 모드에서는 `pagination`·`groupBy`와 배타적이다 (ParamQuery도 페이징 비호환을 명시).

| | ParamQuery | 제안 API | 우선순위 |
|---|---|---|---|
| [x] | **`treeModel` 코어**: nested(`children[]`)/flat(`parentId`) 데이터(행마다 고유 id 필수), `dataIndx`(트리 컬럼), `indent`, 노드 펼침/접힘, `beforeTreeExpand`/`treeExpand` 이벤트 | `treeData: { childrenField: 'children' \| parentIdField+idField(flat), treeField, indent, defaultExpandLevel }` + `expandNode()/collapseNode()/toggleNode()/expandAllNodes()/collapseAllNodes()/isNodeExpanded()` + `beforeNodeToggle`(취소 가능)/`nodeExpanded`/`nodeCollapsed`. 계층 정렬(형제끼리 재귀)·계층 필터(매치의 조상 유지 + `filterKeepChildren`) 통합 — v2.1.0 | **T1** |
| [x] | **체크박스**: `treeModel.checkbox · cascade · select`, `Tree().getCheckedNodes() · checkNodes() · unCheckAll()`, `beforeCheck`/`check` 이벤트, `pq_tree_cb` 숨김 컬럼 트릭으로 비활성화 | 기존 **`checkboxSelection`/`headerCheckboxSelection` 컬럼 재활용** — 트리 모드에서 3상태 캐스케이드 체크박스(부모↔자손 **행 선택** 연동, indeterminate 표시)로 동작하고, 헤더 체크박스는 비활성 행을 제외한 전체 체크/해제(표시 판단도 체크 가능 리프 기준). `treeData.cascade`(기본 true)·`treeData.checkboxDisabled(row)`만 추가하고 조회/조작/이벤트는 선택 API(`getSelectedRows`/`selectAll`/`deselectAll`/`beforeSelectionChange`/`selectionChanged`) 그대로. 별도 체크 API 없음(구현 중 API 단순화 — 초기의 `treeData.checkbox`+전용 API 설계를 폐기) — v2.1.0 | **T2** |
| [x] | `treeModel.summaryInTitleRow` (부모 행 자체에 자식 집계 표시) | `treeData.summary: true` — `column.aggFunc` 재사용, 부모 노드 행에 자손 리프 집계를 표시(표시 전용, 데이터 불변, 필터 반영) — v2.1.0 | **T3** |
| [x] | **Lazy loading** (원격 자식 로딩) | `treeData.fetchChildren(row) => Promise<rows>` + `treeData.hasChildren(row)` — 첫 펼침 때 로드 + 토글 스피너, 빈 배열 = 리프 확정, 실패 시 `dataLoadError` 후 접힌 채 재시도 가능. nested 형식 전용 — v2.1.0 | **T4** |

### 도입하지 않는 것 (TreeGrid)

| ParamQuery 스펙 | 사유 |
|---|---|
| `Tree()` 별도 위젯 객체 | 인스턴스 메서드로 통합 (우리 관례 — §3의 위젯 제외와 동일) |
| `treeModel.hideLines`(계층 연결선) | 들여쓰기 + 화살표로 계층 표현 충분. CSS 복잡도 대비 가치 낮음 |
| `treeModel.icons` / `treeModel.render`(폴더/파일 아이콘) | `cellRenderer`로 앱에서 구현 가능 (treeField 컬럼도 cellRenderer 지원) |
| 체크박스-행 선택 분리(`treeModel.select` 없이 별도 체크 상태) | 도입하지 않음 — 체크 = 행 선택으로 통합(`checkboxSelection` 재활용)이 우리 설계. 선택과 무관한 체크가 필요하면 앱에서 별도 컬럼 + `cellRenderer`로 구현. `checkboxHead`는 `headerCheckboxSelection`이 트리 규칙(비활성 제외)으로 담당(T2). 참고: `selectAll()` API 직접 호출은 `checkboxDisabled` 행도 선택함 — 체크박스 UI 경로만 비활성 존중 |
| `treeModel.summary`(부모별 별도 요약 행) | 부모 행 내 집계(T3)만 채택 — 트리에서 행 수 이중화 방지 |
| 트리 DnD(노드 드래그 이동 · 트리 간 DnD) | 데이터 조작 API + 앱 구현 영역. 수요 확인 후 재검토 |
