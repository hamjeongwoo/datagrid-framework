# BUG-004: 트리 체크박스가 indeterminate에 갇혀 해제 불가

- **발견일**: 2026-08-01
- **보고자**: 사용자 ("indeterminate 걸리는 애들은 다시 체크를 해제하려고 해도 해제가 안 되는데 의도한 건가?")
- **심각도**: 높음 — `checkboxDisabled` 행을 포함한 폴더는 한 번 체크하면 영원히 해제 불가
- **수정 커밋**: (이 리포트와 동일 커밋)

## 증상

features.html "Tree Checkbox" 카드에서 비활성(`checkboxDisabled`) license 파일을 포함한
폴더를 체크하면 체크박스가 indeterminate가 되는데(비활성 리프는 체크되지 않으므로 정상),
이후 **몇 번을 클릭해도 해제되지 않고 indeterminate에 머문다.**

## 재현 절차

1. `http://localhost:8087/examples/features.html` → Tree Checkbox 카드
2. license 파일을 포함한 폴더(예: `test-1`)의 체크박스 클릭 → indeterminate 표시
3. 다시 클릭 → 변화 없음 (반복해도 동일)

### 계측 (수정 전)

```
initial            { checked: false, ind: false }
click1(체크)       { checked: false, ind: true }   ← 정상 (비활성 리프 미체크)
click2(해제 시도)  { checked: false, ind: true }   ← 갇힘
click3(해제 재시도) { checked: false, ind: true }   ← 갇힘
```

## 원인 분석

두 가지가 결합된 문제:

1. **브라우저는 indeterminate 체크박스를 클릭하면 항상 `checked = true`를 준다**
   (indeterminate를 지우고 checked로 전환하는 것이 HTML 표준 동작).
   change 핸들러가 `cb.checked`를 그대로 믿으면 indeterminate에서 출발한 클릭은
   전부 "체크"로 해석된다.
2. 캐스케이드에서 부모의 체크 상태는 자식에서 유도되는데, **비활성 미선택 리프를 가진
   부모는 결코 완전 체크(true)가 될 수 없다.** 그래서 "체크" 시도는 매번 다시
   indeterminate로 유도되고, "해제" 단계(checked 상태에서의 클릭)에 도달할 수 없다.

같은 계열 문제로, `cascade: false`일 때도 3상태 유도 표시를 쓰고 있어서 부모 체크박스
표시(자식 기반)가 부모 자신의 선택 상태와 어긋나 동일하게 토글이 갇힐 수 있었다.

## 수정 내용

1. **클릭 의도를 브라우저의 `checked` 값이 아니라 상태에서 도출** — 새 순수 함수
   `subtreeFullyChecked(roots, row, isSelected, isDisabled)`: 서브트리의 "체크 가능한
   리프"(비활성 아닌 리프)가 이미 전부 선택돼 있으면, `checked = true`로 들어온 클릭을
   "해제"로 재해석한다 (`_treeCheckToggle`).
   - 남은 리프가 있는 부분 선택: 클릭 = 나머지 체크 (기존 대로)
   - 체크 가능한 리프 전부 선택(비활성 때문에 indeterminate 표시): 클릭 = 해제
2. **3상태 유도 표시를 cascade 모드로 한정** (`_treeCheckboxMode` 플래그 신설) —
   `cascade: false`에서는 부모 체크박스가 부모 자신의 선택 상태를 그대로 표시한다.

## 검증

- 수정 전 재현 시나리오: 체크 → indeterminate → 클릭 → **해제(선택 0, ind 해제)**,
  재체크/재해제 반복 가능.
- 부분 선택 회귀: 리프 일부만 선택된 폴더 클릭 → 나머지 체크(선택 6→10),
  이어서 클릭 → 전체 해제(10→0).
- 헤더 체크박스 사이클(체크 27 → 해제 0), 비트리 그리드 체크박스 회귀 없음.
- `subtreeFullyChecked` 단위 테스트 8건 추가, 전체 346개 통과. 콘솔 에러 0.

## 재발 방지

- **3상태 체크박스의 클릭 의도는 `checked` 값이 아니라 도메인 상태에서 도출할 것** —
  브라우저는 indeterminate 클릭에 항상 `checked=true`를 주므로, "체크가 불가능하거나
  무의미한 상태"가 존재하는 UI(비활성 자손, 부분 잠금 등)에서는 checked를 그대로 믿으면
  해제 경로가 사라진다.
- 유도(derived) 표시를 쓰는 컴포넌트는 **유도 규칙이 성립하지 않는 모드**(여기서는
  `cascade: false`)에서 반드시 원본 상태 표시로 폴백할 것.
- CLAUDE.md "축적된 함정" 7번에 등재.
