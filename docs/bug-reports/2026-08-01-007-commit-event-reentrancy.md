# BUG-007: cellValueChanged 핸들러에서 refreshRow 호출 시 NotFoundError (finish 재진입)

- **발견일**: 2026-08-01
- **보고자**: 사용자 (Select Renderer 카드에서 country 셀 수정 시 콘솔 오류)
- **심각도**: 높음 — 커밋 이벤트에서 부분 refresh를 쓰는 정석 패턴(공식 데모 코드 포함)이 오류 유발
- **수정 커밋**: (이 리포트와 동일 커밋)

## 증상

features.html "Select Renderer" 카드에서 country 셀을 편집하고 Enter로 커밋하면:

```
[DataGrid] "cellValueChanged" handler failed: NotFoundError: Failed to execute
'replaceChild' on 'Node': The node to be removed is no longer a child of this
node. Perhaps it was moved in a 'blur' event handler?
    at DataGrid.refreshRow (datagrid.js:2135)
    at (데모 카드의 cellValueChanged 핸들러 — grid.refreshRow(e.data))
    at finish → onKeyDown (Enter)
```

## 재현 절차

1. `editor: 'select'` 컬럼 + `cellValueChanged`에서 `grid.refreshRow(e.data)`를 호출하는 그리드
2. 셀을 더블클릭해 select 에디터 열기 (select가 포커스를 가짐)
3. 값 변경 후 Enter → 콘솔에 NotFoundError

## 원인 분석 (재진입 연쇄)

`finish(commit)`가 **에디터가 아직 열려 있고 `finished` 플래그도 아직 false인 시점**에
`cellValueChanged`를 발사했다:

1. Enter → `finish(true)` → 데이터 기록 → `cellValueChanged` 발사 (에디터 select는 아직 DOM에, 포커스 보유)
2. 소비자 핸들러가 `refreshRow(e.data)` → `replaceChild`로 행 교체 → **포커스된 select가 DOM에서 제거**
3. Chrome은 포커스된 요소가 제거되는 순간 **blur를 동기 발화** → 에디터의 blur 리스너 `finish(true)` **재진입** (`finished`가 아직 false)
4. 재진입 finish가 같은 변경을 **이중 커밋** → `cellValueChanged` 재발사 → 핸들러의 `refreshRow` 재호출
5. 이때 `_renderedRows`는 바깥 `refreshRow`가 아직 갱신 전(교체 후 대입) → 이미 떼어진 옛 행으로 `replaceChild` → **NotFoundError**

오류 메시지의 "Perhaps it was moved in a 'blur' event handler?"가 Chrome이 이
재진입 패턴에 주는 표준 힌트다.

## 수정 내용

1. **커밋/취소 확정 후, 이벤트 발사 전에 에디터를 먼저 완전히 닫는다** —
   `finished = true` → `_editing = null` → cleanup → 셀 재렌더까지 마친 뒤
   `cellValueChanged` → `rowValueChanged` → `editingStopped` 순서로 발사.
   이제 핸들러가 행 DOM을 제거해도 발화되는 blur는 `finished` 가드에 걸려 no-op.
   (`beforeCellSave`/validator는 기존대로 커밋 전 — 거부 시 에디터 유지 불변)
2. **`refreshRow` 방어선**: 추적 중인 행 요소가 캔버스에서 이미 떨어져 있으면
   교체를 시도하지 않고 false 반환.

## 검증

- 재현 하네스: `cellValueChanged` 핸들러에서 `refreshRow` + (제거성 blur를 흉내 내는)
  에디터 blur 동기 발화 → **커밋 정확히 1회**, NotFoundError 없음, 렌더러 label 갱신 정상.
- 회귀: validator 거부 시 에디터 유지 + `dg-invalid`, Esc 취소(이벤트 없음),
  이벤트 순서 `cellValueChanged → editingStopped` 유지, `enterMovesDown` 연속 편집 정상.
- 테스트 417개 통과, 콘솔 에러 0.

## 재발 방지

- **상태 전이를 알리는 이벤트는 전이를 완전히 끝낸 뒤 발사할 것** — 전이 중간에
  발사하면 리스너가 유발한 부수효과(blur, focusout, DOM 제거)가 전이 코드로
  재진입한다. 에디터·팝업처럼 "닫기" 경로가 이벤트(blur 등)에 걸려 있는 컴포넌트는 특히.
- 포커스된 요소를 DOM에서 제거하면 Chrome이 blur를 동기 발화한다 — 이벤트 핸들러가
  임의의 DOM 교체(refreshRow 등)를 할 수 있다는 전제로 설계할 것.
- 숨겨진 프리뷰 팬에선 제거성 blur가 발화하지 않아 재현이 안 된다 — 재진입 검증은
  핸들러 안에서 blur를 직접 동기 발화하는 하네스로.
- CLAUDE.md "축적된 함정" 10번에 등재.
