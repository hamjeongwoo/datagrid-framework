# BUG-006: 표시용 체크박스(renderers.checkbox) 위에서 더블클릭해도 편집이 시작되지 않음

- **발견일**: 2026-08-01
- **보고자**: 사용자 ("checkbox 에디터는 체크박스 영역을 더블클릭하게 되면 에디터 영역이 활성화가 안돼")
- **심각도**: 높음 — checkbox 컬럼은 셀 대부분을 체크박스가 차지해 사실상 편집 진입 불가
- **수정 커밋**: (이 리포트와 동일 커밋)

## 증상

features.html "Multiselect · Radio · Checkbox" 카드에서 checkbox 컬럼의 셀 여백을
더블클릭하면 에디터가 열리지만, **체크박스 그림 위에서 더블클릭하면 아무 일도 일어나지 않는다.**

## 재현 절차

1. `http://localhost:8087/examples/features.html` → Multiselect · Radio · Checkbox 카드
2. Remote 컬럼의 체크박스 위에서 더블클릭 → 에디터가 열리지 않음
3. 같은 셀의 체크박스 옆 여백을 더블클릭 → 정상적으로 에디터 열림

### 계측

표시용 체크박스는 `<input type="checkbox" disabled>`로 렌더링돼 있었다 (`dispDisabled: true`).
**disabled 폼 요소는 브라우저가 마우스 이벤트(click/dblclick 포함)를 아예 발화하지 않는다** —
이벤트가 버블로 셀에 도달하는 게 아니라 처음부터 생기지 않는다.

주의: 이전 검증이 이걸 놓친 이유 — `dispatchEvent`로 합성 이벤트를 쏘면 disabled 요소도
강제로 발화·버블된다(`dblclickBubbledFromCheckbox: true`). 합성 이벤트 검증은 disabled의
이벤트 삼킴을 재현하지 못한다.

## 원인 분석

`renderers.checkbox()`가 클릭 방지 수단으로 `disabled` 속성을 썼다. disabled는
"조작 불가"뿐 아니라 "마우스 이벤트 미발생"까지 포함하는 시맨틱이라, 체크박스가
차지한 영역이 편집 진입(dblclick → `_onCellDblClick`)의 사각지대가 됐다.

## 수정 내용

`disabled` 대신 **CSS `pointer-events: none`** (+ `tabindex="-1"`)로 변경:

- `pointer-events: none`은 요소를 히트테스트에서 제외해 **마우스 이벤트가 셀을 직접
  타깃**으로 발생한다 → dblclick 편집 정상 동작.
- `tabindex="-1"`로 키보드 포커스도 차단해 표시 전용을 유지.
- `.dg-checkbox-display` CSS를 `:disabled` 흐림 해제에서 `pointer-events: none`으로 교체.

같은 커밋에서 checkbox 값 표기 매핑(`editorOptions: { checked, unchecked }`,
`isCheckedValue`)도 함께 추가됨 — 렌더러/에디터가 'Y'/'N', 0/1 등을 인식.

## 검증

- 체크박스 요소가 실제 히트 타깃에서 제외됨(computed `pointer-events: none`),
  셀 더블클릭 → 에디터 열림 (여백/체크박스 위 동일).
- 표시용 체크박스 클릭으로 값이 바뀌지 않음(포인터 통과), tab 포커스 안 잡힘.
- 'Y'/'N' 매핑 컬럼: 표시 체크 상태 정확, 편집 커밋 시 `approved: "N" → "Y"`.
- 테스트 417개 통과, 콘솔 에러 0.

## 재발 방지

- **표시 전용 폼 요소에 `disabled`를 쓰지 말 것** — disabled는 마우스 이벤트를 삼켜
  부모(셀)의 클릭/더블클릭 상호작용까지 막는다. 표시 전용은
  `pointer-events: none` + `tabindex="-1"` 조합이 기본.
- **합성 이벤트(dispatchEvent) 검증은 disabled의 이벤트 삼킴을 재현하지 못한다** —
  클릭 경로 검증에는 `document.elementFromPoint`(히트 타깃)나 computed
  `pointer-events`를 함께 확인할 것.
- CLAUDE.md "축적된 함정" 9번에 등재.
