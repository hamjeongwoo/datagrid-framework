# BUG-008: `format: 'yyyy-MM-dd'` 날짜가 시간대에 따라 하루 밀림

| 항목 | 내용 |
|---|---|
| ID | BUG-008 |
| 보고일 | 2026-08-01 (date/datetime 에디터 스펙 설계 중 발견) |
| 수정일 | 2026-08-01 |
| 심각도 | **High** — 데이터 표시가 사실과 다름 (UTC 음수 오프셋 지역에서만 발현) |
| 영향 버전 | v1.1.0 (`column.format` 도입) ~ v2.7.0 |
| 영향 범위 | `column.format`의 날짜 패턴, `DataGrid.format()` 유틸, 날짜 문자열이 든 모든 셀 표시 |

## 증상

값이 `'2024-03-15'` 같은 **날짜만 있는 ISO 문자열**인 컬럼에 `format: 'yyyy-MM-dd'`를 주면,
UTC 오프셋이 음수인 지역(아메리카 대륙 전체)에서 셀에 **`2024-03-14`** — 하루 이른 날짜가
표시된다. 한국(UTC+9)·유럽 등 양수 오프셋 지역에서는 정상으로 보이기 때문에 개발 환경에서
드러나지 않는다.

`'2024/03/15'`(슬래시)나 `Date` 인스턴스, 시간대가 붙은 ISO(`'...T00:00:00Z'`)는 정상이다.
오직 시간대 표기가 없는 ISO 형식에서만 발생한다.

## 재현 절차

1. OS/브라우저 시간대를 UTC 음수 지역으로 변경 (예: America/New_York)
2. `columnDefs: [{ field: 'joined', format: 'yyyy-MM-dd' }]`, `rowData: [{ joined: '2024-03-15' }]`
3. 셀에 `2024-03-14`가 표시됨

재현율 100%(해당 시간대에서). 정렬·필터는 영향 없음 — 순수 표시 계층 결함.

## 원인 분석

### 근본 원인

`formatDate`가 문자열을 `new Date(value)`로 파싱했다. ECMAScript 명세상 **날짜만 있는 ISO
형식(`YYYY-MM-DD`)은 UTC로 해석**되고, 시각이 붙은 형식(`YYYY-MM-DDTHH:mm`)은 로컬로
해석되는 비대칭이 있다. 반면 출력은 `getFullYear()/getMonth()/getDate()` — 전부 **로컬**
필드를 읽는다. 입력은 UTC, 출력은 로컬이라 오프셋만큼 어긋난다.

계측 (Node, Asia/Seoul):

```
new Date('2024-03-15').toISOString()  →  2024-03-15T00:00:00.000Z   (UTC 자정)
                      .getHours()      →  9    (KST에서는 같은 날 09시 — 날짜는 우연히 일치)
                      .getDate()       →  15
```

UTC 자정이라는 절대 시각은 UTC-5 지역에서 **3월 14일 19시**다. 따라서 `getDate()`가 14를
반환하고 `2024-03-14`가 출력된다. 한국에서 테스트하면 09시로 밀려도 날짜 경계를 넘지 않아
증상이 보이지 않는다 — 이것이 여태 발견되지 않은 이유다.

### 왜 지금 발견됐나

`editor: 'date'` 구현 중, 에디터의 `<input type="date">` 값(로컬 기준)과 셀 표시값(위 경로)이
같은 원본 데이터에서 **서로 다른 날짜**가 될 수 있다는 것을 확인하면서 드러났다.

## 수정 내용

`parseLocalDate(value)` 순수 함수를 도입하고 `formatDate`가 이를 경유하게 했다
(`dist/datagrid.js`).

```js
function parseLocalDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(value));
  if (!m) return new Date(value);
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}
```

설계 판단:

- **시간대 표기가 없는 값 = 로컬 벽시계 시각**으로 해석한다. `'2024-03-15'`는 "그 지역의
  3월 15일"이라는 뜻이지 특정 절대 시각이 아니다. 출력이 로컬 필드를 읽으므로 입력도 로컬로
  맞춘 것.
- **시간대가 명시된 값(`Z`, `±hh:mm`)과 타임스탬프 숫자는 절대 시각**이므로 `new Date()`에
  그대로 위임한다 — 이 경우는 오프셋 변환이 의도된 동작이다.
- `'2024/03/15'`처럼 명세 밖 형식도 기존대로 `new Date()`에 위임(V8은 로컬로 해석).

## 검증

`test/run-tests.js`에 `parseLocalDate` suite 추가 — **실행 시간대와 무관하게 성립하는**
단언으로 구성했다:

```js
assertEq(T.parseLocalDate('2024-03-15').getHours(), 0, 'local midnight, not UTC midnight');
assertEq(T.parseLocalDate('2024-03-15').getDate(), 15, 'day (local, no shift)');
assertEq(T.formatDate('2024-03-15', 'yyyy-MM-dd'), '2024-03-15', 'round-trips in any timezone');
assertEq(T.parseLocalDate('2024-03-15T00:00:00Z').getTime(), Date.UTC(2024, 2, 15), 'zoned ISO respects Z');
```

`getHours() === 0`은 **수정 전 코드에서 KST 기준 9를 반환해 실패**한다 — 한국에서 돌려도
회귀를 잡는 단언이다(날짜 대신 시각을 보는 이유). 전체 500개 통과.

## 재발 방지

- **날짜 문자열 파싱은 `parseLocalDate` 경유** — `new Date(문자열)` 직접 호출 금지.
  입력이 UTC로 해석되고 출력이 로컬로 읽히는 조합은 오프셋만큼 어긋난다.
- **시간대 의존 로직의 테스트는 "시간대와 무관하게 성립하는 단언"으로 쓴다.**
  `getDate() === 15` 같은 단언은 KST에서 버그가 있어도 통과한다 — `getHours() === 0`처럼
  파싱 기준(UTC냐 로컬이냐)을 직접 드러내는 값을 봐야 한다. TZ 환경변수는 Windows Node에서
  무시되므로(확인함: `TZ=America/New_York`에도 `resolvedOptions().timeZone === 'Asia/Seoul'`)
  "다른 시간대로 돌려본다"는 검증 전략은 이 환경에서 쓸 수 없다.
- CLAUDE.md "축적된 함정"에 항목 추가.
