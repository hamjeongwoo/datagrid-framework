# BUG-005: editOnSingleClick에서 select 에디터 드롭다운이 열리자마자 닫힘

- **발견일**: 2026-08-01
- **보고자**: 사용자 ("department cell의 select는 수정이 안돼 — 셀렉트 박스를 누르면 닫혀버려")
- **심각도**: 높음 — `editOnSingleClick` 그리드에서 select 에디터 사용 불가
- **수정 커밋**: (이 리포트와 동일 커밋)

## 증상

features.html "Continuous Editing & Custom Editor" 카드(`editOnSingleClick: true`)에서
Name(text 에디터) 셀은 정상 편집되지만, Department(select 에디터) 셀은
**셀렉트 박스를 누르는 순간 드롭다운이 닫혀버려** 값을 고를 수 없다.

## 재현 절차

1. `http://localhost:8087/examples/features.html` → Continuous Editing 카드
2. Department 셀 클릭 → select 에디터 표시
3. select를 클릭해 드롭다운 열기 → 즉시 닫힘 (반복해도 동일)

### 계측 (수정 전)

select 요소에 마커를 달고 클릭 이벤트 시퀀스(mousedown→mouseup→click)를 보낸 뒤 확인:

```
click cell   → hasSelect: true            (에디터 정상 생성)
click select → selectStillSame: false     ← select가 새 요소로 교체됨
               markerSurvived: false
```

## 원인 분석

`editOnSingleClick`의 클릭 핸들러가 **편집 중인 셀 내부에서 발생한 클릭을 구분하지 않았다.**

- select를 클릭하면 click 이벤트가 캔버스까지 버블 → `_onCellClick` →
  `editOnSingleClick` 분기 → `_startEdit(hit)` 재호출.
- `_startEdit`는 첫 줄에서 `_cancelEdit()` 후 `cellEl.innerHTML = ''`로
  에디터를 **통째로 재생성**한다.
- 네이티브 select 드롭다운은 mousedown으로 열리는데, 직후 click 단계에서
  select DOM이 교체되므로 드롭다운이 열리자마자 닫힌다.
- text 에디터도 매 클릭마다 재생성되고 있었지만(커서 위치 초기화),
  새 input에 같은 값 + focus가 들어가 시각적으로 티가 나지 않아 "정상처럼" 보였다.

## 수정 내용

`_onCellClick`·`_onCellDblClick` 진입부에서 **편집 중인 셀과 같은 셀의 클릭이면
아무것도 하지 않고 반환** — 에디터 내부 상호작용(드롭다운, 슬라이더 드래그,
텍스트 커서 이동)이 편집 재시작으로 이어지지 않는다:

```js
if (this._editing && this._editing.row === hit.row && this._editing.col === hit.col) return;
```

다른 셀 클릭 시의 연속 편집(현재 에디터 blur 커밋 → 새 셀 편집 시작)은 그대로다.

## 검증

- select 클릭/더블클릭 후에도 같은 요소 유지(`selectSurvivesClick/DblClick: true`)
  → 드롭다운이 닫히지 않음.
- select 값 변경 + blur → 커밋 정상 (`Sales → Design`, `cellValueChanged` 발생).
- 회귀: 편집 중 다른 셀 클릭 → 이전 에디터 닫히고 새 셀 편집 시작(연속 편집 유지),
  text/슬라이더 에디터 동작 불변. 테스트 346개 통과, 콘솔 에러 0.

## 재발 방지

- **편집 UI 안에서 발생해 버블되는 이벤트가 "편집을 (재)시작하는 핸들러"에
  다시 잡히지 않게 할 것** — 편집 중 좌표가 같은 셀이면 조기 반환이 기본.
- 에디터 검증은 text만으로는 부족하다 — **재생성이 시각적으로 드러나는
  에디터(select 드롭다운, range 드래그)로 클릭 상호작용을 꼭 확인**할 것
  (text 에디터는 재생성돼도 티가 나지 않아 이 버그를 숨겼다).
- CLAUDE.md "축적된 함정" 8번에 등재.
