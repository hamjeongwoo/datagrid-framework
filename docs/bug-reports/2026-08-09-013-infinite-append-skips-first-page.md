# BUG-013: 무한 스크롤이 0페이지를 건너뛰고 1페이지부터 받는다

- **발견일**: 2026-08-09
- **발견 경위**: `dataSource.autoLoad` 구현 후 조합 검증 중 (사용자 제보 아님)
- **심각도**: 높음 — 에러 없이 **데이터에 구멍이 생긴다**. 사용자는 목록이 불완전하다는 걸 알 수 없다
- **수정 커밋**: (이 커밋)

## 증상

첫 조회가 없었던 무한 스크롤 그리드를 **스크롤하기만 하면** 서버에 `page=1` 요청이 나간다.
`page=0`은 영영 요청되지 않아 **첫 페이지 분량이 통째로 빠진 목록**이 만들어진다.
요청도 응답도 정상(200)이라 에러가 나지 않는다.

도달 경로가 둘이다.

1. `dataSource.autoLoad: false` — 조회 버튼을 누르기도 전에 스크롤하면 발생
2. **첫 조회가 실패한 경우** (`autoLoad` 기본값에서도 발생) — 네트워크 오류로 0페이지를 못 받은
   뒤 사용자가 스크롤하면 재시도가 아니라 1페이지를 받아온다

## 재현 절차

```js
var g = new DataGrid(el, {
  dataSource: { url: '/api/employees-infinite', autoLoad: false },
  infiniteScroll: { pageSize: 7 },
  columnDefs: [{ field: 'id' }, { field: 'name' }],
});
// 아무 조회도 하지 않은 상태에서 스크롤 이벤트만 발생시킨다
var body = el.querySelector('.dg-body');
body.scrollTop = body.scrollHeight;
body.dispatchEvent(new Event('scroll'));
```

### 계측 (수정 전)

```
afterScroll.reqs : ["employees-infinite?page=1&pageSize=7",
                    "employees-infinite?page=2&pageSize=7"]
afterScroll.rows : 14          ← 0페이지(7행)가 빠진 채 14행
loadMore()       : true → "employees-infinite?page=3&pageSize=7"
```

0페이지 요청이 **한 번도 없다.** 이어받기가 1페이지부터 시작해 그대로 진행된다.

## 원인 분석

두 전제가 각각은 맞는데 겹치면 깨진다.

1. `shouldLoadMore`는 **`scrollHeight <= clientHeight`(내용이 뷰포트보다 작음)를 "바닥"으로 판정**한다.
   이건 의도된 것이다 — 첫 페이지가 화면을 못 채우면 scroll 이벤트가 영영 오지 않아
   "더 있는데 멈춘 그리드"가 되기 때문(함정 21). **행이 0개일 때도 이 조건은 참이다.**

2. `_fetchData({ append: true })`는 **`_currentPage += 1`로 시작**한다.
   "지금 페이지는 이미 받았으니 다음 것"이라는 전제인데, 아무것도 안 받았으면
   현재 페이지(0)도 안 받은 상태라 전제가 성립하지 않는다.

`_maybeLoadMore`에는 "이어받기가 가능한 상태인가"를 묻는 가드가 없었다.
`_loading`/`_loadingMore`(진행 중인가)와 `_hasMore`(더 있는가)만 봤을 뿐,
**"시작은 했는가"**를 아무도 확인하지 않았다.

v2.22에서 무한 스크롤을 만들 때는 "생성자가 항상 0페이지를 받는다"가 사실이어서
전제가 우연히 성립했다. `autoLoad: false`가 그 사실을 깨뜨리면서 드러났지만,
**첫 조회 실패 경로는 v2.22부터 있던 결함**이다.

## 수정 내용

`_loadedOnce` 상태 하나를 추가한다 — "이 데이터 소스에서 0페이지를 한 번이라도 받았는가".

- `_fetchData`의 **비-append 성공 경로**에서만 `true`가 된다 (실패면 그대로 `false`)
- `setDataSource()`에서 `false`로 되돌린다 — 지금 들고 있는 행은 새 소스의 0페이지가 아니다
- `_maybeLoadMore()`: `_loadedOnce`가 아니면 즉시 `false` (자동 이어받기 금지)
- `loadMore()`: `_loadedOnce`가 아니면 **append가 아니라 0페이지 조회**를 보낸다 —
  명시적 호출을 거부하는 대신 "다음 페이지"를 올바르게 해석한다

행 수(`_rows.length > 0`)로 판정하지 않은 이유: `rowData`로 씨앗 데이터를 주고
`autoLoad: false`를 쓰면 행은 있는데 서버에서 받은 0페이지는 없다. 그 경우에도
이어받기는 막아야 하므로 "행이 있는가"가 아니라 "받았는가"가 올바른 신호다.

## 검증

수정 후, 같은 재현 절차:

| 단계 | 결과 |
|---|---|
| 조회 전 스크롤 ×2 | 요청 **0건**, 0행 |
| `loadMore()` | `page=0` → (뷰포트 미달로 이어서) `page=1`, 14행 |
| 이후 스크롤 | `page=2`, 21행 |

두 번째 도달 경로(첫 조회 실패):

| 단계 | 결과 |
|---|---|
| 첫 조회 실패 (fetch 가로채기) | `page=0` 1건, 0행 |
| 실패 상태에서 스크롤 | 요청 **0건** (수정 전에는 `page=1`) |
| `reloadData()` 재시도 | `page=0` 재요청 → `page=1` 이어받기, 18행 |

## 재발 방지

- CLAUDE.md 함정 22 추가 — "증분 연산은 기준점이 존재하는지 확인할 것".
- 검증 측면: **자동 트리거는 "정상 흐름"뿐 아니라 "아직 시작 안 함 / 실패 후" 상태에서도
  돌려볼 것.** 이 버그는 정상 경로에서는 절대 나타나지 않는다.
- 요청 URL을 세는 검증에서 **건수만 보지 말고 페이지 번호를 볼 것.** "2건 요청됨"은
  0·1이든 1·2든 똑같이 통과한다. 구멍은 번호를 봐야 보인다.
