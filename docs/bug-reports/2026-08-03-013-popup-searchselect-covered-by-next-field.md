# BUG-013: 팝업 폼에서 검색형 select의 옵션 목록을 바로 아래 필드가 덮음

- **발견일**: 2026-08-03
- **보고자**: 사용자 ("팝업 에디터에서 city컬럼에 searchselect를 띄우면 아이템 리스트 뷰가 나오는데 city컬럼 아래에 있는 manager input 엘리먼트 부분이 리스트 뷰영역을 가려")
- **심각도**: 높음 — 가려진 구간의 옵션은 보이지도, 눌리지도 않는다
- **수정 커밋**: (이 커밋)

## 증상

`popupEditor` 폼에 검색형 select(`editorSearch`) 컬럼이 **두 개 이상 연달아** 있을 때,
앞 필드의 드롭다운을 펼치면 **뒤 필드의 입력창이 목록 위에 그려진다.**

사용자 스크린샷에서는 City 목록이 `Seoul / Tokyo / London / Berlin / Singapore`인데
그 한복판에 Manager 입력창의 값 `Chris Park`이 끼어 있었다 — 목록 항목이 아니라
**뒤 필드의 입력창이 목록을 관통해 보이는 것**이다.

가려진 구간은 히트테스트에서도 목록이 잡히지 않으므로 그 옵션들은 **클릭할 수 없다.**

## 재현 절차

1. `http://localhost:8087/examples/features.html#popup-editor`
2. `2열 배치` 체크 해제 (1열로 — City 바로 아래에 Manager가 오게)
3. 아무 행이나 더블클릭 → 편집 폼
4. City 필드가 폼 상단에 오도록 스크롤 → City 입력창 클릭해 목록 펼침
5. 목록의 위에서 두세 번째 항목 자리를 보면 Manager 입력창이 목록을 덮고 있음

### 계측 (수정 전)

겹침 지점의 실제 페인트 순서 (`document.elementsFromPoint`, 위가 앞):

```
1. dg-searchselect-input                 ← Manager 입력창   ▲ 위
2. dg-editor-searchselect .collapsible   ← Manager 위젯
3. dg-searchselect-option.dg-active      ← City 목록 항목    ▼ 아래
4. dg-searchselect-list                  ← City 목록
```

목록 사각형을 격자로 훑은 결과 (`.dg-popup-body` 뷰포트 안 28개 지점):

```
listOnTop: 20 / 28        culprits: { 'dg-searchselect-input': 8 }
```

계산된 스타일:

```
City 위젯    : position: relative / z-index: 30
Manager 위젯 : position: relative / z-index: 30      ← 동점
City 목록    : position: absolute / z-index: 31
Status(radio): position: static   / z-index: 30      ← static이라 z-index 무효
```

## 원인 분석

**`position`만 오버라이드하고 `z-index`를 함께 되돌리지 않아, 필드마다 stacking context가 생겼다.**

셀 앵커 패널 공용 규칙 (`datagrid.css`) — 셀 위에 떠야 하므로 `z-index: 30`:

```css
.dg-editor-multiselect,
.dg-editor-radio,
.dg-editor-searchselect {
  position: absolute;
  z-index: 30;
}
```

v2.16.0에서 이 위젯을 팝업 폼에 재사용하며 추가한 오버라이드(BUG-010 수정):

```css
.dg-popup .dg-editor-searchselect.dg-searchselect-collapsible {
  position: relative;   /* absolute → relative */
  /* z-index 는 손대지 않음 → 30 이 그대로 살아남는다 */
}
```

`position: relative` + **숫자** `z-index`(= `auto`가 아님)는 **stacking context를 생성**한다. 그래서

1. 필드마다 `z-index: 30`짜리 stacking context가 생기고,
2. 열린 목록의 `z-index: 31`은 **자기 위젯 안에 갇혀** 형제 필드 위로 올라갈 수 없다.
   (`31 > 30`은 같은 stacking context 안에서만 의미가 있는 비교다.)
3. City 위젯과 Manager 위젯은 **둘 다 30으로 동점** → DOM 순서로 결판 →
   **뒤에 오는 Manager가 이긴다.**

### 왜 multiselect / radio는 멀쩡했나 (진단의 확증)

같은 공용 규칙에서 `z-index: 30`을 받지만, 폼 오버라이드가 `position: static`이다:

```css
.dg-popup .dg-editor-multiselect,
.dg-popup .dg-editor-radio { position: static; }
```

`static` 요소에서는 `z-index`가 **애초에 무효**라 stacking context가 생기지 않는다.
그래서 목록이 이들 위로 정상적으로 뜬다 — 계측에서도 `Manager 목록 vs 아래의 Status(radio)`는
`list-on-top`이었다. **증상이 "searchselect가 연달아 두 개일 때만" 나타나는 방향성**이
이 진단에서 그대로 예측되고, 실측과 일치했다.

## 수정 내용

오버라이드에서 `z-index`도 함께 되돌린다 (한 줄):

```css
.dg-popup .dg-editor-searchselect.dg-searchselect-collapsible {
  position: relative;
  z-index: auto;   /* 추가 — stacking context를 만들지 않는다 */
  ...
}
```

`z-index: auto`면 위젯은 stacking context가 아니게 되고, 목록의 `z-index: 31`은
`.dg-popup-body`의 stacking context에서 해석되어 **모든 형제 필드 위**에 뜬다.
(`.dg-popup-body`는 `container-type: inline-size` → `contain: layout` 때문에 이미
stacking context이므로, 목록이 팝업 밖으로 새어 나갈 걱정도 없다.)

인라인 셀 편집 경로는 건드리지 않는다 — 셀 앵커 패널은 여전히 `absolute / z-index: 30`이다.

## 검증

- **음성 대조군**: 인라인 스타일로 `z-index: 30`을 되살리면 `listOnTop 20/28` + 범인 `dg-searchselect-input` 8회로
  증상이 그대로 재현되고, 지우면 `28/28`로 복구 — 프로브가 이 결함에 민감함을 확인.
- 목록 격자 스캔 (`.dg-popup-body` 뷰포트 안 전 지점, 범인 0):
  `1열 City 28/28 · 1열 Manager 32/32 · 2열 City 28/28 · 2열 Manager 32/32`
- 계산된 스타일: 두 위젯 모두 `relative / z-index: auto`, 목록 `absolute / z-index: 31`
- 옵션 클릭 경로: `elementFromPoint`로 옵션 도달 확인 → 클릭 → 입력창에 고른 label 표시 + 접힘
- `#popup-editor-custom` 카드(콤보 2개, 둘 다 `z-index: auto`) 7/7
- **인라인 회귀**: `#searchable-select`의 셀 앵커 패널은 `absolute / z-index: 30` 유지,
  행 위로 정상 부유(`collapsible: false`)
- 다크 테마 7/7, 목록 배경 불투명(`rgb(36,41,43)`)
- `node test/run-tests.js` 751 passed, 콘솔 에러 0

주: 프리뷰 팬이 숨겨진 상태라 스크린샷 대신 `elementFromPoint` / `elementsFromPoint`
히트테스트로 단언했다 — 겹침 판정에는 이쪽이 더 직접적인 증거다.

## 남은 문제 (별도 사이클)

원인 계측 중 **독립된 두 번째 결함**을 재현했다. 이번 수정 범위에는 넣지 않는다(사용자 결정).

폼 아래쪽 필드의 목록은 `.dg-popup-body { overflow-y: auto }`에 **잘려 아예 보이지 않는다.**
목록이 `absolute`라 스크롤 컨테이너를 벗어날 수 없기 때문이다.

```
popup body 뷰포트 :  80 ~ 296
City 목록         : 298 ~ 494    ← 전 구간이 뷰포트 밖 → 완전히 클리핑
```

고치려면 "아래 공간이 부족하면 위로 반전"(인라인 에디터의 `flipPanel` 훅이 이미 하는 일)이나
열 때 필드를 뷰포트 안으로 스크롤하는 등의 설계 판단이 필요하다.

## 재발 방지

- **`position`을 오버라이드할 때는 그 요소에 걸린 `z-index`도 함께 판단할 것.**
  `absolute → relative`는 "떠 있던 걸 흐름으로 되돌린다"는 뜻인데, `z-index`가 남으면
  요소가 **stacking context로 승격**되어 자손의 z-index를 가둔다. `absolute → static`은
  z-index가 자동 무효라 이 함정이 없다 — 그래서 같은 파일의 multiselect/radio만 멀쩡했다.
- **자식의 `z-index`가 부모보다 크다고 해서 부모의 형제를 이기지 않는다.** z-index 비교는
  같은 stacking context 안에서만 성립한다. "목록에 더 큰 z-index를 줬는데 왜 가려지지?"는
  거의 항상 조상이 stacking context를 만들고 있다는 신호다.
- 겹침 버그의 검증은 `getBoundingClientRect` 겹침 여부가 아니라
  **`elementFromPoint` / `elementsFromPoint`로 실제 페인트 순서**를 단언할 것.
  겹치기만 하고 누가 위인지는 rect로 알 수 없다. 프로브는 **2D 교차**로 짤 것 —
  세로 겹침만 보면 2열 레이아웃에서 가로로 안 겹치는 필드를 범인으로 잘못 지목한다
  (이번에도 첫 프로브가 그렇게 오탐했다).
- CLAUDE.md "축적된 함정" 20번에 등재.
