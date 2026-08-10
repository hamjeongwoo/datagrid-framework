# BUG-014 — 검색형 multiselect에서 Enter가 방금 고른 항목을 도로 해제한다

- 보고: 사용자 (2026-08-10)
- 영향 버전: v2.25.0 (검색형 multiselect가 처음 들어간 릴리스)
- 수정 버전: v2.25.1
- 관련: [BUG-013](2026-08-03-013-popup-searchselect-covered-by-next-field.md) (같은 위젯), CLAUDE.md 함정 §7

## 증상

> "마지막 예제 카드에 팝업 에디터에서 multiselect에 아이템을 선택 후 엔터를 누르면 적용이 안 돼"

팝업 폼(`popupEditor`)의 검색형 multiselect에서 **마우스로 항목을 고른 뒤 Enter를 누르면
방금 고른 항목이 사라진다.** 사용자 눈에는 "선택이 적용되지 않는다"로 보인다.

조사 중 같은 원인에서 나온 증상 두 개를 더 찾았다:

| # | 상황 | 실제 동작 |
|---|---|---|
| A | 항목을 클릭한 뒤 Enter | 방금 고른 항목이 **해제됨** (보고된 증상) |
| B | 목록이 **접힌** 상태에서 Enter | 화면에 보이지도 않는 항목이 **토글됨** |
| C | 다 고르고 목록을 닫은 뒤 Enter로 저장 | **아무 일도 일어나지 않음** (폼이 저장되지 않음) |

## 재현 절차

1. `examples/features.html#searchable-multiselect`의 두 번째 카드에서 "첫 행 폼으로 편집" 클릭
2. Skills 필드의 입력창을 클릭해 목록을 편다
3. `go`를 입력하고 나타난 **"Go" 항목을 마우스로 클릭** → 칩 `[JavaScript, Go]` 확인
4. **Enter를 누른다** → 칩이 `[JavaScript]`로 되돌아간다

## 원인 분석

계측 결과 (수정 전):

```
B_optionText:      "Go"
B_chipsAfterClick: ["JavaScript", "Rust", "Go"]
B_activeStillSet:  true          ← 클릭한 항목에 커서가 그대로 남아 있다
B_activeText:      "Go"
B_chipsAfterEnter: ["JavaScript", "Rust"]   ← Enter가 같은 항목을 다시 토글

C_listOpen:        false         ← 목록이 접혀 있는데도
C_chipsAfter:      [..., "Go"]   ← Enter가 보이지 않는 항목을 토글했다
```

`ssActive`는 **키보드 탐색 커서**다. `↑`/`↓`로 움직이고, 질의 결과가 있으면
`ssRenderList(opts, autoFirst)`가 첫 항목을 커서로 잡는다. 그런데 Enter 핸들러의 조건이

```js
else if (e.key === 'Enter' && ssActive >= 0 && ssShown[ssActive]) {
```

**"커서가 살아 있는가"만** 묻고 **"그 커서가 지금 유효한가"**를 묻지 않았다. 그래서:

- **A**: 마우스 클릭은 커서를 건드리지 않는다. 클릭으로 고른 직후에도 커서가 그 항목에
  남아 있으니, 바로 뒤의 Enter가 **같은 항목을 다시 토글 = 방금 한 선택을 취소**한다.
  단일 값 select에서는 이 경로가 드러나지 않았다 — 클릭하면 즉시 커밋되고 닫히기 때문에
  "클릭 직후에 Enter를 누른다"는 상태 자체가 존재하지 않았다.
- **B**: 폼에서 목록을 접어도 커서는 그대로다. `dg-searchselect-open`이 없는 상태,
  즉 **사용자가 아무 목록도 보고 있지 않은 상태**에서도 Enter가 토글로 해석됐다.
- **C**: 팝업의 Enter=저장 핸들러가 `.dg-editor-searchselect` 안이면 **무조건** 건너뛰었다.
  위젯이 처리하는 줄 알고 넘겼는데, 목록이 닫혀 있을 때는 위젯도 아무것도 하지 않는다
  (A/B 수정 후에는 더더욱). **양쪽 다 "상대가 처리하겠지"로 빠져 Enter가 침묵했다.**

셋 다 뿌리가 같다: **Enter의 의미를 "지금 화면에 무엇이 보이는가"와 무관하게 정했다.**

## 수정 내용

판정을 순수 함수로 뽑아 테스트 가능하게 만들었다 (`dist/datagrid.js`):

```js
function resolveSearchEnterAction(state) {
  const s = state || {};
  const active = s.activeIndex === null || s.activeIndex === undefined ? -1 : s.activeIndex;
  if (s.listOpen && active >= 0) return s.multi ? 'toggle' : 'pick';
  if (s.listOpen && s.collapsible) return 'close';
  return 'bubble';   /* 인라인이면 셀 커밋, 폼이면 저장 */
}
```

1. **Enter는 목록이 실제로 보일 때만 커서를 쓴다** — `listOpen`은 인라인에서는 항상 참,
   폼에서는 `dg-searchselect-open` 여부. (B 수정)
2. **마우스로 고르면 키보드 커서를 지운다**(`ssClearActive()`) — 클릭은 끝난 동작이므로
   커서를 남기면 안 된다. (A 수정)
3. **팝업의 Enter=저장 가드를 "목록이 열려 있을 때만"으로 좁혔다** — 닫혀 있으면 폼이
   Enter를 가져가 저장한다. (C 수정)

인라인 단일 값 select의 `pick` 경로는 **일부러 가로채지 않는다** — 셀의 공용 Enter
핸들러가 커밋과 `enterMovesDown`(다음 행 이동)까지 처리해야 하기 때문이다.
(구현 중 한 번 `stopPropagation`을 걸었다가 `enterMovesDown`이 죽는 것을 회귀 검증에서 잡았다.)

## 검증

**단위 테스트** — `resolveSearchEnterAction` suite 11개 추가. 인라인/폼 × 목록 열림/닫힘 ×
커서 있음/없음 × 단일/다중 조합과 `null`/`undefined` 커서 표현까지. **1007 passed, 0 failed.**

**브라우저** (`node demo/server.js 8087`):

| 검증 | 결과 |
|---|---|
| A — 클릭 후 Enter | 칩 `[JavaScript, Go]` **유지**, 커서 지워짐, 목록만 닫힘 |
| B — 접힌 상태 Enter | 토글 없음 |
| C — 접힌 상태 Enter | 폼 저장 → 셀 `JavaScript Go` |
| 키보드 흐름 (타이핑 → Enter) | 토글 정상, 목록 유지, 폼 열린 채 유지 |
| 인라인 multiselect | 커서 있으면 토글, 클릭 후 Enter는 커밋 |
| 인라인 select 회귀 | Enter로 `de` 커밋 + `enterMovesDown`으로 다음 행 이동 |
| 팝업 select 회귀 | 첫 Enter는 선택+접기(저장 안 함), 두 번째 Enter가 저장 |

콘솔 에러 0.

## 재발 방지

- **"커서/활성 상태"를 근거로 키 입력을 해석할 때는 그 상태가 *화면에 보이는지*를 함께 물을 것.**
  안 보이는 커서로 동작하면 사용자에게는 원인 없는 변경으로 보인다. 이 프로젝트에서
  두 번째다 — 함정 §7(3상태 체크박스)도 "브라우저가 준 상태를 그대로 믿었다"가 원인이었다.
- **마우스 동작과 키보드 커서는 서로의 상태를 정리해 줘야 한다.** 클릭으로 끝난 동작이
  커서를 남기면 바로 뒤의 Enter가 그것을 되돌린다.
- **두 계층이 같은 키를 나눠 가질 때는 "누가 언제 가져가는가"를 한 가지 조건으로 못 박을 것.**
  여기서는 `dg-searchselect-open` 하나다. 양쪽이 서로 "상대가 처리한다"고 가정하면
  키가 조용히 사라진다(C).
- **검증은 키보드 경로만 돌리지 말 것.** v2.25.0 검증에서 "타이핑 → Enter"는 통과했고,
  버그는 **마우스로 고른 뒤 Enter**라는 혼합 경로에만 있었다. 입력 수단을 섞은 시퀀스를
  반드시 포함한다.

CLAUDE.md 함정 §25에 요약 추가.
