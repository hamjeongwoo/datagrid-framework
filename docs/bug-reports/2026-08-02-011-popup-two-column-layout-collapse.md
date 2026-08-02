# BUG-011: 좁은 팝업에서 2열 폼 레이아웃이 무너짐 (입력이 22px로 뭉개짐)

- **발견일**: 2026-08-02
- **보고자**: 사용자 ("2열 팝업 너비가 작아서 그런지 깨진다", 스크린샷 첨부)
- **심각도**: 높음 — `columns: 2` + 좁은 `width` 조합에서 폼 입력을 쓸 수 없음
- **수정 커밋**: f5585b9

## 증상

`popupEditor: { columns: 2, width: 520 }`에서 폼이 시각적으로 무너진다.
필드 버튼("본사", "지우기")이 라벨을 밀고 나와 "이름" 라벨과 겹치고,
검색 입력은 버튼 사이에 낀 조각으로 줄어들며, `after` 슬롯 텍스트가 엉뚱한 위치에 놓인다.

## 재현 절차

1. `http://localhost:8087/examples/features.html#popup-editor-custom`
2. (당시 설정) `popupEditor: { position: 'right', width: 520, columns: 2 }`
3. 행 더블클릭 → "근무 도시" 필드의 검색 입력이 버튼에 눌려 사라지다시피 함

### 계측 (수정 전)

```
popupWidth   520      bodyCols "227.4px 227.4px"
city  field 227px  label 120px(고정)  control 95px  input 22px   ← 입력 붕괴
name  field 227px  label 120px        control 95px  input 95px
```

## 원인 분석

세 가지가 겹쳤다. 근본은 **고정폭 라벨 + 고정 2열은 폭이 줄면 반드시 무너진다**는 것.

1. `.dg-popup-body.dg-popup-cols-2 { grid-template-columns: 1fr 1fr }` — 폭과 무관하게 **무조건 2열**.
   520px 팝업에서 필드가 227px까지 줄었다.
2. `.dg-popup-field { grid-template-columns: var(--dg-popup-label-width) 1fr }` — 라벨이 **고정 120px**.
   227px 필드에서 컨트롤에 남는 건 95px뿐이다.
3. `.dg-popup-control { display: flex; gap: 6px }`에서 필드 버튼은 `flex: none`이고
   `.dg-popup-input`은 `flex: 1`이라, **줄어드는 부담을 입력이 전부 떠안는다.**
   버튼 2개(각 ~36px)가 95px를 나눠 가지면서 입력이 22px가 됐다.

즉 어느 한 줄의 실수가 아니라, "폭이 줄어들 때 무엇이 양보하는가"를 아무도 정하지 않은 것이 원인이다.

## 수정 내용

양보 순서를 세 단계로 명시했다.

1. **열 수가 먼저 양보한다** — `repeat(auto-fit, minmax(var(--dg-popup-field-min), 1fr))`.
   필드에 320px을 못 주면 2열이 자동으로 1열이 된다.
2. **버튼이 다음으로 양보한다** — `.dg-popup-control { flex-wrap: wrap }` +
   `.dg-popup-input { flex: 1 1 var(--dg-popup-input-min) }`.
   입력이 150px 아래로 눌리는 대신 버튼이 줄바꿈된다.
3. **마지막으로 라벨이 위로 올라간다** — `.dg-popup-body { container-type: inline-size }` +
   `@container (max-width: 400px)`에서 라벨/컨트롤을 한 열로 스택.

추가로 모든 트랙에 `minmax(0, ...)`을 씌워 긴 내용이 트랙을 밀어내지 못하게 했다.
새 토큰 `--dg-popup-field-min`(320px) · `--dg-popup-input-min`(150px)로 임계값을 열어 뒀다.

컨테이너 쿼리를 지원하지 않는 브라우저에서도 1·2단계만으로 붕괴하지는 않는다(라벨이 좌측에 남을 뿐).

## 검증

폭 × 열 조합 전수 — 오버플로 0, 입력 최소폭 확보:

| width × columns | 트랙 | 라벨 스택 | 입력 폭 |
|---|---|---|---|
| 320 × 2 | 1 | 예 | 193px |
| 360 × 1 | 1 | 예 | 196px |
| 520 × 2 | 1 (자동 강등) | 아니오 | 224px |
| 760 × 2 | 2 | 아니오 | 159px |
| 900 × 2 | 2 | 아니오 | 166px |

- 제보 케이스(520px): 검색 입력 **22px → 214px**, 오버플로 없음
- 세 position(center/left/right) × 1·2열, 다크 테마, 59카드 콘솔 에러 0. 751 passed.

## 재발 방지

- **고정폭 요소와 고정 열 수를 같이 쓰면 좁은 폭에서 반드시 깨진다.**
  반응형 폼에서는 "폭이 부족할 때 **무엇이 먼저 양보하는가**"를 순서대로 정해 둘 것
  (여기서는 열 수 → 버튼 배치 → 라벨 위치).
- flex 컨테이너에서 `flex: none` 형제가 있으면 줄어드는 부담이 `flex: 1` 하나에 쏠린다 —
  최소 크기는 `flex-basis`/`min-width`로 **명시**하고, 넘치면 `flex-wrap`으로 흘려보낼 것.
- 레이아웃 검증은 한 가지 폭이 아니라 **폭 × 옵션 조합의 매트릭스**로,
  `getBoundingClientRect`로 오버플로와 최소 크기를 단언할 것 —
  "보기에 괜찮다"는 특정 폭에서만 성립한다.
- CLAUDE.md "축적된 함정" 18번에 등재.
