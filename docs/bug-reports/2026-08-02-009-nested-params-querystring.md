# BUG-009: `dataSource.request`/`params`의 중첩 객체·배열이 `[object Object]`로 직렬화됨

| 항목 | 내용 |
|---|---|
| ID | BUG-009 |
| 보고일 | 2026-08-02 (사용자 제보 — 실제 서버 연동 중 발견) |
| 수정일 | 2026-08-02 |
| 심각도 | **High** — 중첩 파라미터를 쓰는 서버와는 원격 연동이 아예 불가능 |
| 영향 버전 | v1.2.0 (`dataSource` 도입) ~ v2.9.0 |
| 영향 범위 | `method: 'GET'`(기본값) + `dataSource.request` 또는 `dataSource.params`가 중첩 구조를 반환하는 경우. POST(JSON body)는 영향 없음 |

## 증상

`dataSource.request`가 아래처럼 **중첩 객체·배열**을 반환하면 쿼리스트링이 깨진다.

```js
request: function () {
  return {
    page: { selectPage: 1, pageSize: 20 },
    sorts: [{ field: 'name', dir: 'asc' }, { field: 'salary', dir: 'desc' }],
  };
}
```

실제 요청 URL (계측):

```
/api/employees?page=%5Bobject%20Object%5D&sorts=%5Bobject%20Object%5D%2C%5Bobject%20Object%5D
디코딩: /api/employees?page=[object Object]&sorts=[object Object],[object Object]
```

서버는 `page`·`sorts`를 복원할 수 없으므로 정렬·페이징이 전혀 전달되지 않는다.
평면(flat) 파라미터만 쓰는 경우에는 정상이라 기존 데모(`/api/employees`,
`/api/employees-v2`)에서는 드러나지 않았다.

## 재현 절차

1. `dataSource.request`가 위 구조를 반환하도록 그리드를 구성 (`method` 생략 = GET)
2. 그리드 로드 → 네트워크 탭에서 요청 URL 확인
3. `page=[object Object]` 확인

재현율 100%.

## 원인 분석

### 근본 원인

`buildDataSourceRequest`의 GET 직렬화가 값을 **1단계 문자열 변환**만 했다
(`dist/datagrid.js`, 수정 전):

```js
const qs = Object.keys(params)
  .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  .join('&');
```

`encodeURIComponent(value)`는 인자에 `String()`을 적용한다. 객체·배열에서는
`Object.prototype.toString`이 걸려 정보가 통째로 사라진다:

```
String({ selectPage: 1 })      → "[object Object]"
String([{ a: 1 }, { b: 2 }])   → "[object Object],[object Object]"
```

즉 파라미터가 **평면 객체(값이 원시값)** 라는 전제가 코드에 암묵적으로 박혀 있었다.
v2.5에서 `dataSource.request`를 열어 "어떤 서버 스펙에도 대응"하게 만들면서
반환 구조의 자유도는 커졌는데 직렬화는 그 전제 그대로였던 것이 원인이다.

## 수정 내용

`buildQueryString(params)` 순수 함수를 도입하고 GET 경로가 이를 쓰게 했다.
중첩 구조를 **브래킷 표기**로 편다:

```
{ page: { selectPage: 1 } }   → page[selectPage]=1
{ sorts: [{ field: 'a' }] }   → sorts[0][field]=a
{ tags: ['x', 'y'] }          → tags[0]=x&tags[1]=y
```

표기 선택 근거: qs(Express 기본 파서)·PHP·Rails·Spring이 **추가 설정 없이 그대로
파싱**하는 사실상의 표준이다. `qs.stringify`의 기본 출력과 동일한 규칙(배열은 인덱스)을
따랐다.

부수 규칙:

| 입력 | 출력 | 이유 |
|---|---|---|
| `undefined` | 생략 | 조건부 파라미터 (기존 `request` 훅 규약과 동일) |
| `null` | `key=` | qs와 동일 |
| `Date` | ISO 문자열 | `String(date)`의 장황한 로캘 표기 대신 |
| 빈 객체/배열 | 생략 | 남길 것이 없음 |
| 순환 참조 | 해당 가지만 건너뜀 | 소비자가 준 객체 때문에 그리드가 스택 오버플로로 죽지 않게 |

순환 참조 검사는 **경로 기준**(`WeakSet`에 넣었다가 재귀 후 제거)이라, 형제 위치에
같은 객체가 두 번 나오는 정상 케이스는 양쪽 다 직렬화된다.

### 함께 추가한 탈출구 — `dataSource.paramsSerializer`

브래킷 표기로 표현할 수 없는 서버(반복 키 `tags=a&tags=b`, JSON-in-query, compact 표기 등)를
위해 직렬화를 통째로 대체하는 훅을 추가했다. `request`·`parse`·`headers`와 같은
"기본 동작을 대체하는 훅" 패턴이며, 예외 시 `console.error` + 기본 직렬화로 폴백한다.
반환값이 `'?a=1'`처럼 와도 앞의 `?`/`&`는 떼고 붙인다.

## 검증

- 단위 테스트 `buildQueryString` suite 20개 추가 (중첩 객체/객체 배열/원시값 배열/3단 중첩,
  undefined·null·빈 문자열·빈 객체·`false`/`0`, Date ISO, 키·값 인코딩, 유니코드,
  순환 참조, 공유 참조). 전체 573개 통과.
- **실제 `qs` 파서로 왕복 검증** — `qs.parse(buildQueryString(원본))`이 원본 구조를
  그대로 복원하고 `sorts`가 배열로 살아나는 것을 확인 (qs는 검증용으로만 사용, 프로젝트
  의존성 아님).
- 데모 서버에 `/api/employees-v3`(브래킷 표기 파싱 + `receivedParams` 에코) 추가,
  features.html `#nested-params` 카드에서 정렬·페이지 이동·paramsSerializer 토글을
  실제 요청으로 확인:
  ```
  GET /api/employees-v3?page%5BselectPage%5D=2&page%5BpageSize%5D=10
                       &sorts%5B0%5D%5Bfield%5D=salary&sorts%5B0%5D%5Bdir%5D=asc → 200
  서버 복원: {"page":{"selectPage":"2","pageSize":"10"},"sorts":[{"field":"salary","dir":"asc"}]}
  ```
  콘솔 에러 0.

## 재발 방지

- **쿼리스트링 직렬화에 `encodeURIComponent(value)`를 직접 쓰지 말 것** —
  `String()` 강제 변환이 걸려 객체·배열이 조용히 `[object Object]`가 된다. 값이 원시값이
  아닐 수 있는 자리는 재귀 직렬화(`buildQueryString`)를 경유한다.
- **"소비자가 반환하는 구조"의 자유도를 넓히는 API를 추가할 때는 그 값이 흘러가는
  경로(직렬화·비교·저장)도 같이 넓혔는지 확인할 것.** 이 버그는 v2.5에서 `request` 훅으로
  반환 구조를 자유화하면서 직렬화는 평면 전제 그대로 둔 데서 생겼다.
- CLAUDE.md "축적된 함정"에 항목 추가.
