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
| [x] | **`dataModel`** (원격 데이터: `url · method · postData · getData · location:'remote'`, remote 정렬/필터/페이징) | `dataSource: { url, method, params, parse }` + `sortMode/filterMode/pageMode: 'client'\|'server'`(v2.13.0부터 sort/filter는 미지정 시 `pageMode` 상속) + `reloadData()` + `dataLoadError` — 데모 서버 `/api/employees` 포함 — v1.2.0 | **P2** |
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
| [x] | (ParamQuery `editModel`은 셀/행 인라인만 — 폼 편집 없음. Kendo `editable: 'popup'` / AG Grid 팝업 에디터에 대응) | **`popupEditor`** — 행 단위 폼 편집. `position: 'center'`(기본)`\|'left'\|'right'`(슬라이드), 인라인 에디터 위젯 재사용, `instantUpdate`, 커스텀 버튼(`buttons`), 컬럼 단위 오버레이 `column.popupEditor`(label/hint/readonly/order/span/에디터 오버라이드/buttons/before/after), 이벤트 5종 — v2.16.0 | **P2** (사용자 요청) |
| [x] | 날짜 에디터 (`column > editor: 'date'` — ParamQuery는 jQuery UI datepicker 연동) | `editor: 'date' \| 'datetime'` — 네이티브 `<input type="date">` / `datetime-local`, 커밋 값은 원본 타입 보존(문자열/`Date`/타임스탬프), `editorOptions: { min, max, step, valueType }`, `dataType: 'date'`면 자동 선택 — v2.8.0 | **P2** (사용자 요청) |

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
| [x] | (없음 — 자체 개선) 편집 가능 컬럼의 시각적 구분 | `editableIndicator: true` — 편집 가능 컬럼 헤더에 연필 아이콘, 그리드 잠금 시 함께 사라짐 — v2.9.0 | **P2** (사용자 요청) |
| [x] | `column > nodrag/nodrop` | `column.suppressMove` — 드래그 이동 제외 — v1.2.0 | **P2** |
| [x] | `rowInit` (행별 클래스/속성) | `getRowClass(row, index) => string` 옵션 — v1.2.0 | **P2** |
| [x] | `column > halign` (헤더만 다른 정렬) | `column.headerAlign: 'left'\|'center'\|'right'` — v2.0.0 | P3 |
| [x] | `hwrap/wrap` (셀 줄바꿈 + 행 높이 자동) | `column.wrapText` + `autoRowHeight: true` — 텍스트 폭 측정 기반 가변 높이 가상화 — v2.0.0 | P3 |
| [x] | (없음 — 자체 개선) 부모 컨테이너 높이에 정확히 맞추기 | `domLayout: 'fill'` — 흐름 밖으로 빼 데이터 양과 무관하게 컨테이너 높이 고정 (`flex: 1` 영역용) — v2.12.0 | **P2** (사용자 제보) |
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
| [x] | (없음 — 자체 개선) UI 문자열 다국어 | `localeText: object` + 내장 `DataGrid.locales.en/.ko` — 그리드가 그리는 모든 문자열(필터 메뉴·페이지네이션·오버레이·요약·검색형 select·상태 컬럼·aria-label) 교체, 부분 번역 시 나머지는 영어, `{token}` 치환 — v2.15.0 | **P2** (사용자 요청) |

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

### v2.16 — 팝업 에디터 popupEditor (사용자 요청)
행 단위 폼 편집. 기존 인라인 셀 편집을 **대체하지 않고 추가 옵션으로** 얹는다.

**옵션 (그리드 레벨)**
```js
popupEditor: {
  position: 'center',    // 'center'(기본) | 'left' | 'right' (슬라이드 패널)
  width: 420, columns: 1,
  title: undefined,      // string | (row) => string, 생략 시 localeText.popupEditTitle
  trigger: 'dblclick',   // 'dblclick'(기본, 인라인 대체) | 'none'(API·버튼으로만)
  fields: undefined,     // 표시할 field 목록, 생략 시 field 있는 표시 컬럼 전부
  instantUpdate: false,
  closeOnBackdrop: true,
  buttons: ['save', 'cancel'],
}
```
`popupEditor: true` = 전부 기본값. `setOptions({ popupEditor })` 런타임 변경.

- **컬럼 정의를 그대로 재사용한다** — `editor`·`editorOptions`·`editorSearch`·`dataType`·`validator`·`format`, 라벨은 `headerName`. 별도 폼 스키마를 만들지 않는 것이 설계의 핵심. 편집 불가 컬럼은 폼에 readonly로 표시하고(스샷의 `Age (readonly)`), 내장 컬럼(`__rowNum`/`__rowStatus`/`__detailToggle`/체크박스)은 제외.
- readonly 표시는 `readOnly` 속성 + `pointer-events: none` + `tabindex="-1"`. **`disabled` 금지**(BUG-006).

**커밋 규약** — `instantUpdate: false`(기본)는 폼 버퍼에 모았다가 Save에서 변경 필드만 일괄 커밋, Cancel/Esc/바깥클릭은 전부 폐기. `instantUpdate: true`는 필드 확정 즉시 커밋하고 **Cancel은 팝업을 연 시점의 스냅샷으로 롤백**한다(사용자 결정 — "취소"라는 단어의 의미와 일치하고 instantUpdate on/off가 같은 최종 결과를 내야 하므로). 어느 쪽이든 실제 커밋 시 기존 `cellValueChanged`·`rowValueChanged`를 그대로 발사해 기존 핸들러 호환을 지킨다.

**검증** — `column.validator`를 필드 변경 시 + Save 시 실행. 실패하면 라벨을 `--dg-invalid-color`로 바꾸고 필드 아래 메시지, **Save 차단**. Save 시 변경 필드마다 `beforeCellSave`를 발사하고 하나라도 `e.cancel`이면 Save 전체 중단.

**컬럼 단위 커스터마이즈 `column.popupEditor`** — 팝업 안에서만 적용되는 오버레이 레이어. 그리드 셀 표시는 건드리지 않는다.
`hide` · `label` · `hint` · `readonly` · `order` · `span` / 오버라이드 `editor`·`editorOptions`·`editorSearch`·`validator`·`placeholder` / 커스텀 `buttons[]`(입력 오른쪽) · `before(ctx)` · `after(ctx)`(HTML 문자열 또는 Element).
셀은 좁아서 `select`, 폼은 넓어서 `searchselect` 같은 **맥락별 에디터 교체**가 주 용도.
입력 자체를 대체하는 `render(ctx)`는 **넣지 않는다** — `editor: { init, getValue, destroy }` 커스텀 에디터가 팝업에서도 동일하게 동작하므로 같은 일을 하는 두 번째 방법을 만들지 않는다. `before`/`after`는 값을 갖지 않는 표시 전용.

**버튼** — `buttons` 배열. 문자열 `'save'`/`'cancel'`은 내장, 객체는 `{ key, text, variant: 'primary'|'default'|'danger', disabled: bool|(ctx)=>bool, onClick(ctx) }`. 배열 순서가 곧 배치 순서라 기본 버튼을 빼거나 앞뒤에 끼울 수 있다. `ctx` = `{ grid, data, colDef?, value?, values, getValue, setValue, isValid, reset, save, cancel, close, fieldEl? }`.

**이벤트** — `beforePopupEdit`(취소 가능) / `popupEditStarted` / `popupFieldChanged` / `beforePopupSave`(취소 가능, `e.values` 가공) / `popupEditStopped`(`{ committed, changes }`).

**API** — `openEditPopup(row, field?) => boolean` · `closeEditPopup(commit?)` · `isPopupEditing()` · `getPopupValues()`.

**순수 함수** — `resolvePopupEditorConfig(option)`(모르는 `position`은 `'center'`로 — `resolveDomLayout` 관례) · `buildPopupFields(columns, config, gridEditable)` · `resolvePopupButtons(buttons)` · `diffPopupValues(original, values, fields)` · `validatePopupValues(fields, values, row)`. 전부 `_test` 노출.

**localeText 추가 키** — `popupEditTitle`(`'Editing {value}'` / `'{value} 편집'`) · `popupSave` · `popupCancel` · `popupClose`(aria).

**CSS** — `.dg-popup-backdrop` / `.dg-popup` / `-header` `-body` `-field` `-label` `-input` `-hint` `-error` `-footer`. BUG-001 3종 세트(루트 안 append + 토큰 블록 셀렉터에 `.dg-popup` 추가 + 다크 후손 셀렉터) 필수. 새 토큰 `--dg-popup-width` · `--dg-popup-backdrop-color` · `--dg-popup-shadow` · `--dg-popup-radius` · `--dg-slide-duration`. left/right는 `transform: translateX()` 트랜지션.

**배타/상호작용** — softDelete 삭제 표시 행·`setEditable(false)`은 열기 차단(인라인과 동일). 팝업 중 인라인 편집·키보드 탐색 잠금. 팝업 중 해당 행이 데이터에서 사라지면 닫기.

**에디터 위젯 팩토리 추출 (완료).** `_startEdit`(~350줄)이 셀에 강결합돼 있어(`cellEl.innerHTML` 직접 조작, 커밋 시 `_renderCellValue(cellEl)`, `flipPanelUp`이 `_bodyEl`/셀 rect 기준, blur=즉시 커밋, Enter/Tab=인접 셀 이동, `this._editing` 싱글턴) 위젯 생성부를 `_createEditorWidget(container, col, value, row, hooks) => { editorType, input, getValue, invalidEl, focus, destroy }`로 뽑았다. **위젯 생성만 공유하고 라이프사이클은 호출자가 감싼다** — 팝업은 필드가 동시에 여러 개 살아 있고 blur가 커밋이 아니다. 셀 결합부는 전부 hooks로 뒤집었다: `editingClass`(인라인 `'dg-cell-editing'`, 팝업 없음) · `flipPanel`(인라인은 셀 rect 기준 상하 반전, 팝업은 no-op — CSS가 패널을 `position: static`으로 흐름에 넣는다) · `onPick`(인라인은 즉시 커밋, 팝업은 값 변경 처리) · `onInput` · `isClosed`(늦게 도착한 `editorSearch.fetch` 판별) · `autoFocus`(팝업은 한 필드만). 검증: 10종 에디터 전수 + BUG-005(editOnSingleClick에서 select 재생성 없음)·BUG-007(커밋 이벤트 재진입 1회 커밋) 회귀 시나리오 통과.

**접근성 — 포커스 트랩 (문서 감사 중 발견).** 팝업에 `role="dialog" aria-modal="true"`를 선언해 놓고 Tab 순환을 구현하지 않아, 키보드로는 뒤 페이지까지 빠져나갈 수 있었다. 보조기술에는 "뒤는 비활성"이라 말하면서 실제로는 아닌 상태. `_popupTrapFocus`로 마지막↔첫 요소를 순환시킨다(중간 Tab은 가로채지 않고 네이티브 순서 유지). 키보드 규칙은 api.html Keyboard 섹션에 팝업 전용 표로 문서화: Tab(저장 안 함·순환) · Enter(단순 입력만 저장, 패널형 위젯 안에서는 위젯 동작) · Esc(2단계 — 목록이 열렸으면 목록만, 아니면 폼 취소) · ↑↓(검색 목록 이동).

**좁은 2열 폼이 깨지던 문제 (사용자 제보).** 520px 팝업에 `columns: 2`를 주면 필드가 227px인데 **라벨이 고정 120px**을 먹어 컨트롤에 95px만 남고, 거기에 필드 버튼 2개가 붙자 검색 입력이 **22px**로 뭉개졌다. 고정폭 라벨 + 고정 2열은 폭이 줄면 반드시 무너진다. 세 겹으로 고쳤다: ① `columns: 2`를 `repeat(auto-fit, minmax(--dg-popup-field-min, 1fr))`로 바꿔 **폭이 부족하면 자동으로 1열**, ② `.dg-popup-control { flex-wrap: wrap }` + `.dg-popup-input { flex: 1 1 --dg-popup-input-min }`으로 **버튼이 입력을 짓누르는 대신 줄바꿈**, ③ `.dg-popup-body`에 `container-type: inline-size`를 주고 `@container (max-width: 400px)`에서 **라벨을 입력 위로** 스택. 트랙에는 `minmax(0, ...)`을 씌워 긴 내용이 트랙을 밀어내지 못하게 했다. 검증은 폭 320/360/520/760/900 × 열 1/2 조합으로 오버플로·입력 최소폭을 단언. 컨테이너 쿼리 미지원 브라우저에서도 ①②만으로 무너지지는 않는다.

**데모 보강 중 추가된 것 (사용자 요청).** 두 카드를 에디터 전수로 확장하면서 `column.popupEditor.hide`의 의미를 넓혔다 — 원래는 그리드의 `hide: true`면 폼에서도 무조건 제외였는데, "그리드 컬럼으로는 안 보이지만 폼에서는 편집하고 싶다"(메모·내부 코드 같은 필드)가 정당한 요구라 **`readonly`와 같은 층위로 명시 지정이 이기게** 했다: 기본은 컬럼의 `hide`를 따르되 `popupEditor: { hide: false }`면 폼에 넣고, 반대로 보이는 컬럼도 `hide: true`로 폼에서만 뺄 수 있다. 데모 카드는 ① `#popup-editor` — 에디터 10종 전부(text·number·date·datetime·select(label/value)·검색형 select·multiselect·radio·checkbox·커스텀 객체) + readonly를 한 폼에, 2열 배치 토글·position 3종·instantUpdate 토글, ② `#popup-editor-custom` — 라벨/힌트/순서/`span: 2`/폼 전용 `validator`/폼에서만 편집 허용(`readonly: false` + `editor` 지정)/그리드 숨김 필드 편집/필드 버튼 2개(하나는 `disabled(ctx)`)/`before`·`after` 슬롯.

**폼에서 위젯의 형태가 달라져야 하는 경우가 있다 (사용자 제보 후속).** 검색형 select(`editorSearch`)를 폼에 그대로 넣었더니 ① 열자마자 목록이 펼쳐져 다른 필드를 밀어내고(필드 높이 241px, `align-items: center` 탓에 라벨이 목록 한복판인 99px 지점에 떴다) ② **옵션을 골라도 화면에 아무 표시가 없었다**(값은 바뀌는데 입력창은 빈 채였다). 원인은 이 위젯이 "고르면 커밋하고 닫힌다"는 **셀 전제로 설계**돼 있었다는 것 — 셀에서는 닫힌 뒤 셀이 값을 다시 그리므로 "고른 값을 보여주는 상태"가 아예 필요 없었고, 폼에서는 위젯이 계속 살아 있어 그 부재가 드러난다. `hooks.collapsible`로 폼에서만 **접히는 콤보박스**로 전환한다(입력창이 현재 값의 label을 표시, 클릭·타이핑에만 펼침, 고르면 label을 남기고 접힘, 블러하면 미선택 검색어를 되돌림, 목록이 열린 상태의 Esc는 목록만 닫음). 목록은 `position: absolute`라 펼쳐도 폼 레이아웃을 밀지 않는다. `multiselect`/`radio`는 펼친 채로 현재 상태를 보여주므로 그대로 두되, 세로로 길어 라벨이 한복판에 뜨는 문제만 `dg-popup-field-tall`(`align-items: start`)로 고쳤다. 일반화: **위젯을 다른 컨테이너에 재사용할 때는 "그 위젯이 원래 컨테이너의 어떤 성질에 기대고 있었는지"를 확인할 것** — 여기서는 "곧 사라진다"는 성질이었다.

**콤보박스 전환의 후속 결함 (사용자 제보).** [BUG-013](bug-reports/2026-08-03-013-popup-searchselect-covered-by-next-field.md) — 검색형 select가 폼에 **연달아 두 개** 있으면 앞 필드의 드롭다운을 **뒤 필드의 입력창이 덮었다**(가려진 옵션은 클릭도 안 됨). 위 콤보박스 전환에서 `position: absolute → relative`만 되돌리고 셀 앵커 패널의 `z-index: 30`을 그대로 둔 것이 원인 — `relative` + 숫자 `z-index`는 **stacking context를 생성**하므로 필드마다 30짜리 컨텍스트가 생겨 열린 목록의 `z-index: 31`이 그 안에 갇혔고, 같은 30끼리는 DOM 순서로 결판나 뒤 필드가 이겼다. `z-index: auto`를 함께 지정해 컨텍스트 승격을 막았다. multiselect/radio가 멀쩡했던 건 `absolute → static`이라 z-index가 자동 무효였기 때문 — **같은 오버라이드라도 `static`은 이 함정이 없고 `relative`는 있다.** 검증은 목록 사각형을 격자로 훑어 `elementFromPoint`가 항상 목록을 집는지 단언(1열/2열 × City/Manager 120/120), 음성 대조군으로 `z-index: 30`을 되살리면 20/28로 재현됨을 확인.

**남은 결함 (별도 사이클).** 위 계측 중 발견 — 폼 아래쪽 필드의 목록은 `.dg-popup-body { overflow-y: auto }`에 **잘려 아예 안 보인다**(목록이 `absolute`라 스크롤 컨테이너를 못 벗어남). 계측: body 뷰포트 80–296인데 목록은 298–494. 인라인 에디터의 `flipPanel` 훅처럼 "아래 공간 부족 시 위로 반전"하거나 열 때 필드를 뷰포트로 스크롤하는 설계 판단이 필요하다.

**구현하며 알게 된 것**
- **진입 애니메이션을 가시성에 걸면 안 된다.** 처음엔 `requestAnimationFrame`으로 `.dg-popup-open`을 붙여 `translateX(±100%) → 0` 트랜지션을 돌렸는데, 프레임이 생성되지 않는 환경(숨겨진 프리뷰 팬, 백그라운드 탭, `display:none` 조상)에서 rAF 콜백이 아예 안 돌아 **패널이 화면 밖에 영구히 남았다.** rAF를 지우고 강제 리플로우로 바꿔도, `@keyframes`로 바꿔도 같은 실패 모드였다(트랜지션·애니메이션 모두 프레임 생성에 묶여 `from` 상태에 멈춘다). 최종 해법은 **움직이는 거리를 24px로 줄이는 것** — 멈춰도 완전히 보이고 조작 가능하다. 일반화하면 *애니메이션의 `from` 상태는 그 자체로 사용 가능한 상태여야 한다.*
- `popupEditor.order`의 동점 처리: 미지정 필드는 자기 인덱스를 정렬 키로 쓰는데, `order: 0`이 첫 필드의 인덱스 0과 동점이 되어 안정 정렬이 원래 순서를 유지 → "맨 앞으로"가 조용히 무시됐다. **동점이면 명시 지정이 이기도록** 2차 키를 넣었다.
- 데모 서버에 `Cache-Control: no-store` 추가(server.js·server.py) — 캐시 헤더가 없어 브라우저 휴리스틱 캐시가 옛 `dist/datagrid.js`를 붙들었고, 고친 코드가 반영되지 않아 없는 버그를 쫓았다.
- Save는 **모든 필드의 `beforeCellSave`가 통과한 뒤에야** 행에 쓴다(중간 거부로 반쯤 저장되는 상태 방지). 닫기를 먼저 끝내고 이벤트를 발사하는 것도 BUG-007과 같은 이유.

### v2.15 — UI 문자열 다국어 localeText (사용자 선택)
- 배경: 한국어 프로젝트인데 그리드가 그리는 문자열은 전부 영어 하드코딩이었다(`'Filter…'`, `'(Blanks)'`, `'In range'`, `'No rows to show'`, `'Total'`, aria-label 등 41개). 소비자가 바꿀 방법이 없었다.
- `localeText: object` 옵션 + 내장 `DataGrid.locales.en` / `.ko`. 접근할 때마다 **사본**을 반환하는 getter라 여러 그리드가 같은 로케일을 써도 서로 오염시키지 않는다.
- **부분 번역이 기본 동작.** `resolveLocaleText`가 영어 기본값 위에 병합하므로, 몇 개만 지정해도 나머지는 영어로 정상 동작한다. 번역을 다 채워야 쓸 수 있는 all-or-nothing 설계를 피한 것 — 그래야 새 키가 추가돼도 기존 소비자 로케일이 깨지지 않는다.
- **문자열이 아닌 값은 무시**한다. 실수로 객체/숫자를 넣으면 화면에 `[object Object]`가 새는 대신 기본값이 유지된다(BUG-009의 "값이 원시값이 아닐 수 있는 자리" 교훈의 예방적 적용).
- `{token}` 치환은 순수 함수 `interpolate`. **params에 없는 토큰은 그대로 남긴다** — 커스텀 로케일의 오타(`{tota}`)가 화면에 드러나야 발견되기 때문. 치환값은 재스캔하지 않는다(replace 콜백).
- 로케일 문자열은 **소비자 입력**이므로 innerHTML 경로(`pageSummary`·오버레이)는 반드시 `escapeHtml`을 거친다. `pageSummary`는 템플릿을 먼저 이스케이프한 뒤 토큰만 `<strong>숫자</strong>`로 치환 — 토큰 표기 `{from}`은 이스케이프에 걸리지 않으므로 순서가 성립한다.
- `statusColumn`의 헤더·라벨 기본값을 로케일로 이관(`resolveStatusColumnConfig(option, localeText)`). **명시 설정이 로케일보다 우선** — 레이어는 기본값(영어) → 로케일 → 명시 설정.
- `setOptions({ localeText })` 런타임 전환. 로케일이 `statusColumn` 컬럼 정의의 입력이므로 **컬럼 재구성 축에 추가하고, 재구성보다 먼저 반영**해야 한다.
- 순수 함수 `interpolate`, `resolveLocaleText` — `_test` 노출. `LOCALE_EN`/`LOCALE_KO`도 노출해 **ko가 en의 키를 정확히 덮는지**를 테스트로 강제(번역 누락·오타 키 방지).
- 데모: features.html `#locale-text` — ko/en/커스텀 3-way 런타임 전환 + 빈 결과 오버레이 문구. api.html에 전용 가이드 섹션(kind: guide, 41개 키 전수 표 + 토큰 표).

### v2.14 — reloadData()가 1페이지로 리셋 (사용자 제보)
- 증상: `reloadData()`를 호출해도 현재 페이지가 그대로라, 조회 조건이 좁혀져 결과가 줄면 범위 밖 페이지(빈 화면)에 머문다. 서버는 범위 밖 페이지에 빈 배열을 주므로 에러도 안 난다.
- 원인: 공개 `reloadData()`가 내부 자동 재조회(정렬·필터·페이지 이동)와 **같은 메서드를 공유**하고 있었다. 페이지 이동(`setPage`)이 이 메서드를 쓰므로 안에서 리셋할 수 없었고, 그래서 아무도 리셋하지 않는 상태가 기본이 됐다.
- 수정: 경로를 둘로 나눈다. `_fetchData()`(내부, 현재 상태 그대로 요청) + `reloadData(opts)`(공개, 1페이지로 되돌린 뒤 `_fetchData()`). 내부 호출자는 전부 `_fetchData()`로 — `setPage`/`setPageSize`는 방금 계산한 페이지를 유지, `applyColumnFilter`/`clearFilters`/`setQuickFilter`는 이미 `_currentPage = 0`을 세운 뒤 호출, 정렬은 종전대로 페이지 유지.
- 리셋은 요청 조립 **전에** 해야 `page` 파라미터도 0으로 나간다. `dataSource`가 없으면 종전대로 완전한 no-op(페이지도 안 건드림).
- 탈출구: `reloadData({ keepPage: true })` — 저장 후 보던 페이지 그대로 새로고침하는 경우. 순수 함수 `shouldResetPageOnReload(opts)`로 분리해 `_test` 노출.
- `setDataSource()`는 자체 리셋을 지우고 `reloadData()`에 위임(동작 동일).

### v2.13 — sortMode/filterMode가 pageMode를 상속 (사용자 제안)
- 문제 제기: "pageMode가 server면 sortMode/filterMode도 따라와야 하는 것 아닌가?" — 맞을 뿐 아니라, 기존 기본값(세 축 독립 `'client'`)은 **조용히 틀린 결과를 내는 기본값**이었다.
- 계측 근거: 서버 페이징이면 `_rows`는 현재 한 페이지뿐이라 ① 클라 정렬은 그 페이지 안에서만 정렬되면서 헤더는 전체 정렬처럼 표시되고(사용자가 틀린 걸 알 수 없다), ② 클라 필터는 페이지를 걸러내는데 `pageInfo.total`은 `_serverTotal`이라 "1–20 / 10,000"이라 써놓고 7행만 나온다.
- `resolveDataModes(options)` 순수 함수 — `sortMode`/`filterMode`가 `null`/`undefined`면 `pageMode`를 따른다. `_test` 노출.
- **상속은 `pageMode` → `sortMode`/`filterMode` 단방향.** 반대 조합(`sortMode: 'server'` + `pageMode: 'client'` — 서버가 정렬된 전체를 주고 클라가 페이징)은 정상이므로 `pageMode`를 끌어올리지 않는다. "서버 페이징만이 클라이언트가 전체 데이터를 못 본다는 제약을 만든다"가 방향의 근거.
- 명시적으로 어긋나게 지정한 경우(`pageMode: 'server'` + `sortMode: 'client'`)는 "현재 페이지 안에서만 정렬"이 의도일 수 있으므로 **존중하되 `console.warn`**. 순수 함수는 `warnings` 배열만 반환하고 출력은 호출자가 한다(테스트에서 콘솔 오염 없음).
- 호환성: `dataSource` 없이 쓰던 코드는 `pageMode`가 `'client'`라 상속해도 결과 동일. 실제로 달라지는 건 `pageMode: 'server'`를 쓰면서 sort/filter를 안 적은 경우뿐이고, 그건 위의 깨진 동작이 고쳐지는 방향.

### v2.12 — domLayout: 'fill' (부모 높이 채우기, 사용자 제보)
- 증상: 부모 컨테이너가 `flex: 1`인데 **데이터가 없으면 그리드가 부모보다 작고, 많으면 부모를 넘어 커진다.**
- 계측(400px 부모, 300행): 그리드 12,650px + 부모까지 같이 12,650px로 부풀음. 빈 데이터 + 높이 불확정 부모에서는 120px(`min-height` 바닥)로 쪼그라듦.
- 원인 하나: **그리드 높이가 부모가 아니라 자기 콘텐츠에서 나온다.** `.dg-root { height: 100% }`는 ① flex 항목의 자동 최소 크기(`min-height: auto`)가 내용에 밀려 커지면 같이 커지고, ② 높이가 불확정인 부모에서는 아예 풀리지 않아 내용 높이로 떨어진다. 소비자가 `min-height: 0`을 직접 넣어야 풀리는 문제라 옵션으로 흡수.
- `domLayout: 'fill'` — 루트를 흐름 밖(`position: absolute; inset: 0`)으로 뺀다. 흐름 밖이라 **행 수가 컨테이너 높이에 영향을 줄 수 없어** 데이터 0행이든 300행이든 높이가 부모 그대로다. JS 측정/ResizeObserver 없이 CSS만으로 성립하므로 "높이 설정 → 부모 성장 → 재측정"의 되먹임 루프가 원천적으로 없다.
- `inset: 0` 기준을 위해 컨테이너가 `static`이면 `relative`로 올리고 **우리가 올린 경우에만** `destroy()`에서 되돌린다(소비자가 지정한 `position`은 보존).
- 전제: 컨테이너에 해결된 높이가 있어야 한다(높이가 `auto`면 0이 된다). 컨테이너 padding 안쪽이 아니라 테두리 안쪽 전체를 채운다 — 문서에 명시.
- 순수 함수 `resolveDomLayout(value)` — 모르는 값은 `'normal'`로(오타가 레이아웃을 통째로 바꾸지 않게). `_test` 노출.
- `setOptions({ domLayout })` 런타임 전환 지원. 데모: features.html `#fill-height` — 같은 400px `flex:1` 부모에 fill/normal을 나란히 두고 행 수(0·5·300)를 바꿔 실제 높이를 표시.

### v2.10 — 중첩 요청 파라미터 직렬화 (사용자 제보 버그 + 탈출구)
- [BUG-009](bug-reports/2026-08-02-009-nested-params-querystring.md) — `dataSource.request`/`params`가 중첩 객체·배열을 반환하면 GET 쿼리스트링에서 `[object Object]`가 되던 문제. `encodeURIComponent(value)`가 값에 `String()`을 걸기 때문. v2.5에서 `request` 훅으로 반환 구조를 자유화하면서 직렬화는 평면 전제 그대로 둔 것이 원인.
- 순수 함수 `buildQueryString(params, format)` — 중첩을 편다. `undefined` 생략 · `null`은 `key=` · `Date`는 ISO · 순환 참조는 경로 기준으로 건너뜀(소비자 객체 때문에 그리드가 스택 오버플로로 죽지 않게). `_test` 노출.
- `dataSource.paramsFormat: 'dot' | 'bracket'` (v2.11.0) — **쿼리스트링의 중첩 표기는 RFC 표준이 없고 서버 프레임워크마다 관례가 다르다**(어느 쪽이 옳다가 아니라 서버에 맞추는 문제). `'dot'`(기본) = `page.selectPage=1`·`sorts[0].field=name` (Spring MVC/Boot·ASP.NET Core), `'bracket'` = `page[selectPage]=1`·`sorts[0][field]=name` (qs·PHP·Rails·Laravel·jQuery `$.param()`). **배열 인덱스는 두 표기 모두 대괄호** — Spring의 List 바인딩이 `sorts[0].field` 규약이기 때문. 처음엔 bracket을 기본으로 냈다가 사용자 서버(닷 표기)에 맞춰 기본값을 dot으로 전환했다.
- `dataSource.paramsSerializer(params) => string` — 브래킷 표기로 표현 못 하는 서버(반복 키·JSON-in-query·compact 표기)를 위해 쿼리스트링 생성을 통째로 대체. `request`/`parse`/`headers`와 같은 "기본 동작 대체 훅" 패턴이며 예외 시 기본 직렬화로 폴백. 반환값 앞의 `?`/`&`는 떼고 붙인다.
- 데모 서버에 `/api/employees-v3` 추가(브래킷 표기 파싱 + compact `sortSpec` 수용 + `receivedParams` 에코) — server.js·server.py 양쪽. features.html `#nested-params` 카드에서 서버가 복원한 구조를 status line에 그대로 노출하고 paramsSerializer 토글도 제공.
- 검증: 실제 `qs` 파서로 왕복(구조 완전 복원) + 데모 서버 실요청.

### v2.9 — 편집 가능 컬럼 표시 + 템플릿 데모 에디터 전수 (사용자 요청)
- `editableIndicator: true` — 편집 가능한 컬럼 헤더에 연필 아이콘. **opt-in**으로 둔 이유: 기존 그리드(데모 54개 포함)의 외형을 바꾸지 않고, `rowNumbers`·`floatingFilter`·`zebra`처럼 시각 요소는 옵션으로 켜는 이 프로젝트의 관례를 따르기 위함.
- 표시 기준은 "지금 실제로 편집 가능한가" — `col.editable && grid._editable`. `setEditable(false)`로 잠그면 아이콘도 사라진다(편집 불가인데 아이콘이 남으면 거짓 정보). `setOptions({ editableIndicator })`로 런타임 토글 가능(둘 다 `refresh()`가 헤더를 재생성하므로 별도 처리 불필요).
- 아이콘 위치는 라벨 바로 옆 — 정렬·필터 아이콘은 *상태* 표시(활성일 때만 보임)인 반면 편집 가능 여부는 *컬럼 정체성*이라 라벨과 함께 읽히는 편이 맞다. `opacity: .55`(헤더 hover 시 1)로 라벨을 가리지 않게 한다.
- 순수 함수 `shouldShowEditableIcon(col, gridEditable, indicatorOn)` — `_test` 노출.
- index.html 템플릿 데모를 **모든 에디터 종류**로 확장: text(name/email) · number(salary) · select(department) · searchselect(city, 20개 도시) · radio(status) · multiselect(skills) · checkbox(remote) · date(hireDate) · datetime(lastReview) · 커스텀 range 슬라이더(progress). `skills`·`lastReview`는 index.html 안에서 결정적으로 파생시킨다 — `demo/data.js`는 원격 API·다른 예제와 공유하므로 필드를 늘리면 그쪽 퀵필터/응답이 함께 바뀐다.
- 데모: features.html `#editable-indicator`(표시 토글 + 그리드 잠금 버튼).

### v2.8 — date / datetime 에디터 (사용자 요청)
- `editor: 'date' | 'datetime'` — 네이티브 `<input type="date">` / `<input type="datetime-local">`로 편집(의존성 0 원칙에 따라 자체 달력 UI 대신 브라우저 기본 피커). 값 표시는 로컬 시각 기준 `'yyyy-MM-dd(THH:mm)'`.
- **커밋 값은 원본 타입을 보존한다** (select 에디터가 `editorOptions`의 value 타입을 보존하는 것과 같은 규약): `Date` → `Date`, 숫자(타임스탬프) → 숫자, 그 밖 → 문자열(컬럼 `format`이 날짜 패턴이면 그 표기로 맞춰 원시 값과 화면 표기를 일치시킴). 한 컬럼에 `Date`와 문자열이 섞이면 정렬·비교가 깨지므로 **붙여넣기(`pasteTsv`) 경로도 같은 규약을 따른다**(날짜로 못 읽는 값은 그 셀만 건너뜀).
- 빈 입력은 `null` 커밋(날짜 지우기). 단 원본도 빈 값(`null`/`undefined`/`''`)이면 원본을 그대로 둔다 — 열었다 그냥 닫았을 때의 스퓨리어스 커밋 방지(multiselect의 `null → []` 가드와 같은 취지).
- `editorOptions: { min, max, step, valueType }` — `min`/`max`는 선택 범위(문자열·`Date`·타임스탬프 모두 허용), `step`은 초 단위 정밀도, `valueType`은 커밋 타입 강제(`'date' | 'timestamp' | 'string'`, 생략 시 `'auto'`).
- `dataType: 'date'`면 `editor` 생략 시 date 에디터가 자동 선택된다 — `dataType`이 "기본 에디터를 자동 결정"한다는 §2.4 스펙(v1.1.0)의 date 축을 뒤늦게 채운 것.
- 순수 함수: `toDateInputValue(value, withTime)`, `parseDateInputValue(inputValue, originalValue, opts)`, `editValueEquals(a, b)`(Date를 참조가 아니라 시각으로 비교 — 없으면 열었다 닫을 때마다 변경으로 잡힘), `defaultEditorType(col)`, `dateEditorOptions(col)` — `_test` 노출.
- CSS: `.dg-cell-editor { color-scheme }` 라이트/다크 — 명시하지 않으면 네이티브 달력 피커가 OS 설정을 따라가 그리드 테마와 어긋난다.
- 전제 작업: [BUG-008](bug-reports/2026-08-01-008-formatdate-timezone-day-shift.md) — `formatDate`가 `'2024-03-15'`를 UTC로 파싱해 음수 오프셋 지역에서 하루 밀리던 문제. 에디터(로컬 기준)와 셀 표시가 어긋나므로 `parseLocalDate` 도입으로 선행 수정.
- 데모: features.html `#date-datetime-editor` — 문자열 / `Date` / 타임스탬프 세 컬럼으로 타입 보존을 상태 줄에 그대로 노출.

### v2.7 — addRow 삽입 위치 (사용자 요청)
- `addRow(row, index?)` / `addRows(rows, index?)` — `index`를 주면 그 위치에 삽입(`0` = 맨 앞), 생략하면 기존처럼 맨 뒤. `[0, 행 수]`로 클램프, 소수는 내림. index는 원본 배열 기준 — 정렬/그룹핑이 켜져 있으면 표시 순서는 뷰 파이프라인이 결정(문서 명시).
- undo/redo 정합: 'add' 히스토리 액션에 index를 기록해 redo가 같은 위치에 재삽입한다 (기존에는 redo 시 맨 뒤로 붙어 위치가 유실됐음).
- 순수 함수 `insertRowsAt(rows, newRows, index)` — `_test` 노출.
- 데모: #add-row-index 전용 카드(rowNumbers로 위치 시각화) + Built-in CRUD Staging 카드의 신규 버튼을 맨 앞 삽입으로 전환(스테이징 UX 개선 — 새 행을 찾으러 스크롤할 필요 없음).

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
