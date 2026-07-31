# BUG-003: virtualX 가로 스크롤바 드래그가 제자리로 튕김

- **발견일**: 2026-07-31
- **보고자**: 사용자 (features.html "Column Virtualization — 300 columns" 카드 수동 테스트)
- **심각도**: 높음 — virtualX 그리드에서 가로 스크롤바 드래그가 사실상 불가능
- **수정 커밋**: (이 리포트와 동일 커밋)

## 증상

features.html의 virtualX 카드(300컬럼)에서 가로 스크롤바 썸을 드래그하면
드래그 중에는 스크롤이 되다가 **계속 원래 위치(0)로 되돌아온다.**
마우스 휠·프로그램적 `scrollLeft` 설정은 간헐적으로 정상 동작해 재현이 헷갈릴 수 있다.

## 재현 절차

1. `node demo/server.js 8087` → `http://localhost:8087/examples/features.html`
2. "Column Virtualization" 카드에서 가로 스크롤바 썸을 오른쪽으로 드래그
3. 컬럼 렌더 창이 바뀌는 지점(약 수백 px)마다 스크롤이 0으로 튕김

### 계측으로 확정한 메커니즘

```js
// 수정 전 측정값
body.scrollLeft = 3000;
// 캔버스를 비우고(=_renderBody 첫 단계) 강제 레이아웃:
// { sl: 0, sw: 1142 }   ← scrollWidth 27070 → 1142 붕괴, scrollLeft 3000 → 0 클램프
// 행을 되돌려도 scrollLeft는 0에 머무름
```

## 원인 분석

가로 스크롤 폭(scrollWidth)이 **행 DOM에만 의존**하고 있었다.

- `.dg-canvas`는 `width: max-content; min-width: 100%`인데, 행(`.dg-row`)이 전부
  `position: absolute`라 캔버스의 max-content 폭에 기여하지 못한다 → 캔버스 폭 = 뷰포트 폭.
- 가로 오버플로는 순전히 absolute 행 내부 셀들의 overflow로만 만들어진다.
- virtualX는 스크롤 중 컬럼 창이 바뀔 때마다 `_renderBody()`가
  `canvas.innerHTML = ''`로 **모든 행을 제거**한 뒤 다시 만든다.
- 행이 비워진 상태에서 강제 레이아웃이 끼면(`_renderVisibleRows`의 `clientHeight` 읽기,
  또는 드래그 중 브라우저의 스크롤 위치 재계산) scrollWidth가 뷰포트 폭으로 붕괴하고,
  브라우저가 `scrollLeft`를 0으로 클램프한다. 이어지는 scroll 이벤트가 0 기준으로
  창을 다시 계산해 "제자리로 튕김"이 반복된다.

스크롤바 드래그에서 특히 잘 터지는 이유: 드래그는 창 경계를 연속으로 넘나들며
scroll 이벤트마다 전체 재구성을 유발하고, 브라우저가 드래그 중 썸 위치↔scrollLeft
매핑을 매 프레임 재평가하기 때문.

## 수정 내용

`_layoutColumns()`에서 캔버스에 전체 컬럼 폭을 직접 고정:

```js
var totalW = 0;
cols.forEach(function (c) { totalW += widths[c.colId] || 0; });
this._canvasEl.style.minWidth = 'max(100%, ' + totalW + 'px)';
```

- 행 DOM 유무와 무관하게 scrollWidth가 항상 전체 컬럼 폭으로 안정된다.
- `max(100%, Npx)`라서 컬럼 합이 뷰포트보다 좁을 때는 기존처럼 100%를 유지
  (행 배경·hover가 뷰포트 전체를 채우는 기존 시각 동작 보존).
- virtualX 전용 분기가 아니라 모든 그리드에 적용 — 일반 그리드의 `refresh()` 중
  발생할 수 있던 동일 계열의 미세한 가로 스크롤 점프도 함께 예방된다.

## 검증

- 수정 후 동일 계측: 캔버스를 비워도 `{ sl: 3000, sw: 27070 }` 유지.
- scroll 이벤트 수동 디스패치로 핸들러 전 경로 검증(1500→24000→0 등 7개 지점):
  모든 지점에서 scrollLeft 유지, 헤더 동기화 일치, 스페이서 폭 정합
  (좌 스페이서 + 렌더 셀 + 우 스페이서 = 전체 폭), 고정 컬럼(`id`) 항상 렌더.
- features.html 전체 35개 그리드 일괄 점검: fit 컬럼 그리드는 `minW ≤ 뷰포트`로
  가로 스크롤바 미발생(회귀 없음). virtualX 카드만 의도대로 27070px.
- `node test/run-tests.js` 287개 통과, features/index/components 3페이지 콘솔 에러 0.

## 재발 방지

- **스크롤 컨테이너의 scrollWidth/scrollHeight는 가상화로 제거되는 콘텐츠에
  의존시키지 않는다** — 전체 크기를 스페이서나 컨테이너 치수로 항상 명시한다.
  (세로는 `_canvasEl.style.height`로 이미 그렇게 하고 있었다 — 가로도 동일 원칙.)
- 스크롤 중 DOM을 대량 제거·재구성하는 경로는 "비워진 순간 강제 레이아웃이 끼면
  스크롤 위치가 클램프된다"를 항상 의심할 것.
- 프리뷰 팬이 숨겨진 상태에서는 컴포지팅이 멈춰 **scroll 이벤트가 발화하지 않는다**
  — 스크롤 핸들러 검증은 `dispatchEvent(new Event('scroll'))`로 수동 발화해서 할 것.
- CLAUDE.md "축적된 함정" 6번에 등재.
