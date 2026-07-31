# DataGrid Framework — 작업 지침

이 프로젝트는 **스펙 로드맵을 넓혀가며 구현 → 모든 문서 갱신**을 반복하는 사이클로 진행된다.
새 세션은 이 문서만 읽으면 이전 작업을 그대로 이어갈 수 있어야 한다.

## 프로젝트 개요

순수 JavaScript / CSS 데이터그리드 프레임워크. AG Grid Design System (Community, Quartz 테마) 디자인 기반.

### 절대 원칙 (모든 작업에서 유지)

1. **의존성 0, 모듈 시스템 없음** — `<script>` 태그 로드, 전역 `DataGrid` 하나만 노출 (IIFE). `import/export`, npm 패키지, CDN 금지. ES6 문법(class, arrow 등)은 사용 가능하나 모듈 문법만 금지.
2. **테마는 CSS 토큰(`--dg-*`)으로만** — JS와 CSS에 색·크기 하드코딩 금지. 라이트/다크 모두 지원.
3. **데이터 로직은 DOM 없는 순수 함수** — `DataGrid._test`로 노출하고 Node 단위 테스트 필수.
4. **표시되는 소스 = 실행되는 소스** — 데모는 `text/x-example` 스크립트 하나로 실행과 View Source 표시를 겸한다.
5. 사용자 대면 문서·주석은 **한국어**, API 이름·코드는 영어.
6. 셀 값은 기본 HTML 이스케이프. `cellRenderer` 반환값만 예외(문서에 경고 명시됨).

## 파일 맵

| 파일 | 역할 |
|---|---|
| `dist/datagrid.js` | 프레임워크 본체 (단일 IIFE). 섹션: 순수 데이터 로직 → 컬럼 정규화 → Emitter → DataGrid 클래스(DOM 스캐폴딩 → 헤더 → 레이아웃 → 가상화 바디 → 정렬 → 필터 메뉴 → 선택 → 편집 → 리사이즈/리오더 → 페이지네이션 → 오버레이 → 데이터 API → CSV) → 내장 렌더러 → `_test` 노출 |
| `dist/datagrid.css` | 테마. 최상단 토큰 블록 셀렉터는 `.dg-root, .dg-menu` (팝업도 직접 선언 — BUG-001), 다크는 `.dg-theme-dark, .dg-theme-dark .dg-menu` |
| `test/run-tests.js` | Node 단위 테스트. `node test/run-tests.js` — 실패 시 exit 1 |
| `docs/spec-roadmap.md` | **스펙 확장 기준 문서.** ParamQuery 전수 비교 기반 P1/P2/P3 체크박스 + 제안 API명. 여기서 다음 작업을 고른다 |
| `docs/api-data.js` | API 문서 데이터 (전 항목). `docs/api.html`이 렌더링. 새 API는 반드시 여기 등록 + `since` 버전 |
| `docs/api.html` | API 문서 페이지 (사이드바/검색/scrollspy — 내용 수정 불필요, 데이터만 추가하면 됨) |
| `index.html` | Template 데모 (10,000행 실전 예제, Example/View Source 카드) |
| `examples/features.html` | 기능별 데모 — 기능 추가 시 여기에 카드 추가 |
| `examples/components.html` | 디자인 시스템 갤러리 (시각 컴포넌트/상태/토큰) |
| `demo/example-tabs.js` | Example/View Source 탭 컴포넌트 |
| `demo/highlight.js` | 공용 구문 강조기 (api.html과 example-tabs가 공유) |
| `demo/data.js` | 데모 데이터 생성기 (시드 고정 PRNG — `Math.random` 사용 금지) |
| `demo/demo.css` | 데모 페이지 셸 + 예제 카드 + 코드 블록 스타일 (프레임워크 아님) |
| `demo/server.js` | 정적 서버: `node demo/server.js 8087` (`.claude/launch.json`의 `datagrid-demo`) |
| `docs/bug-reports/` | 버그 리포트 (`YYYY-MM-DD-NNN-제목.md`) |
| `docs/superpowers/specs/` | 최초 설계 스펙 (참고용) |
| `README.md` | 사용자용 요약 문서 (옵션/컬럼/API/이벤트 표) |

## 표준 작업 사이클 (스펙 1개 = 1사이클)

### 0. 상태 파악
- `git log --oneline -10`으로 최근 작업 확인
- `docs/spec-roadmap.md`에서 미체크 항목 확인. 사용자가 지정한 항목이 최우선, 없으면 P1 위에서부터.

### 1. 설계
- 로드맵의 "제안 API" 컬럼을 기본 설계로 사용. 구현 중 API가 달라지면 **로드맵 문서도 갱신**.
- 새 옵션/메서드/이벤트 이름은 기존 관례를 따른다(아래 컨벤션 참조).

### 2. 구현 (`dist/datagrid.js`)
- 정렬/필터/그룹핑/페이징 등 **계산 로직은 순수 함수**로 상단 섹션에 작성하고 `DataGrid._test`에 추가.
- 렌더링은 기존 파이프라인에 통합: `refresh()` → `_recomputeView()`(뷰 파이프라인: filter → quickFilter → sort → paginate) → `_renderHeader/_layoutColumns/_renderBody/_renderPaging/_updateOverlay`.
- 새 CSS는 `dist/datagrid.css`에 토큰 기반으로. 새 토큰을 추가하면 다크 테마 오버라이드도 함께.

### 3. 테스트 (`test/run-tests.js`)
- 새 순수 함수마다 `suite()` 추가 (엣지 케이스: null/빈 값/경계값 포함).
- `node test/run-tests.js` 전부 통과할 때까지. 기존 테스트가 깨지면 구현을 의심할 것.

### 4. 예제 페이지 반영 규칙 (스펙 구현 직후 필수)

**모든 스펙은 예외 없이 `examples/features.html`에 Example/View Source 카드를 추가한다.**
"API 전용이라 데모가 무의미하다"는 이유로 생략하지 않는다 — `getJson()` 같은 단순 getter라도
버튼 + status line으로 호출 결과를 보여주는 카드를 만든다. 추가로:

| 스펙 성격 | 추가로 반영할 곳 |
|---|---|
| 모든 스펙 (예외 없음) | `examples/features.html`에 Example/View Source 카드 **필수** — 전용 섹션(h2 + 설명 + 카드)으로 추가 |
| 실전 조합 시나리오에 어울리는 기능 (그룹핑, 상태 저장, 클립보드 등) | `index.html` 템플릿 예제에도 통합해 다른 기능과 함께 동작하는 모습을 보여준다 |
| 새 시각 요소/상태가 생긴 경우 (그룹 헤더 행, 요약 행, dirty 표시, 채우기 핸들 등) | `examples/components.html` 갤러리에 정적 견본 + 상태 변형 추가 |

카드 작성 규칙: **자체 완결형 코드**(복사하면 그대로 실행), 마크업은 `demo/example-tabs.js` 상단 주석 참조.
기존 카드에 기능을 덧붙이기보다 스펙당 전용 카드를 새로 만드는 것을 기본으로 한다(검색·링크 용이).

### 5. 문서 갱신 체크리스트 (전부 필수 — 하나라도 빠지면 미완성)
- [ ] `docs/api-data.js` — 해당 섹션에 항목 추가, `since: '1.x.0'` 명시. 새 카테고리면 섹션 추가(구조는 파일 상단 주석 참조)
- [ ] 예제 페이지 — 위 §4 규칙대로 반영했는지 확인
- [ ] `README.md` — 옵션/컬럼/API/이벤트 표에 항목 추가
- [ ] `docs/spec-roadmap.md` — 체크박스 `[x]` 처리, API명 바뀌었으면 반영
- [ ] 릴리스 단위 작업이면 `DataGrid.version`(datagrid.js)과 `version`(api-data.js) 갱신

### 6. 브라우저 검증
- 서버: `node demo/server.js 8087` (또는 launch.json `datagrid-demo`). **file:// 직접 열기는 프리뷰 제약이 있으니 반드시 HTTP로.**
- 브라우저 도구의 `javascript_tool`로 DOM 단위 검증: 렌더링 결과, 인터랙션 시나리오, **팝업류는 computed style(background/box-shadow)까지** (BUG-001 교훈).
- 라이트/다크 모두 확인. `read_console_messages`로 콘솔 에러 0 확인.
- 주의: 그리드 `refresh()`는 헤더 DOM을 재생성하므로 검증 스크립트에서 이전 element 참조는 stale — 매번 다시 query.
- 주의: 사용자가 프리뷰 패널을 직접 조작 중일 수 있음 — 검증 스크립트는 페이지 확인 후 한 번에(원자적으로) 실행.

### 7. 커밋
- 사이클당 1커밋. 메시지: 첫 줄 영어 요약(무엇을), 본문에 이유/설계 요점.
- 마지막 줄: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## 버그 처리 절차

1. **재현 먼저** — 수정 전에 브라우저/테스트로 증상 확인, 계측 데이터 수집(computed style, 값 등).
2. 근본 원인 확정 후 수정 (증상 가리기 금지).
3. `docs/bug-reports/YYYY-MM-DD-NNN-제목.md` 작성 — 형식은 [BUG-001](docs/bug-reports/2026-07-31-001-filter-menu-broken-ui.md) 참조: 증상/재현 절차/원인 분석(계측 포함)/수정 내용/검증/재발 방지.
4. 재발 방지 항목이 일반 규칙이면 이 문서(CLAUDE.md)의 "축적된 함정"에도 추가.
5. 수정 + 리포트를 한 커밋으로.

## 코드 컨벤션

- CSS 클래스는 `dg-` 접두사. 데모 셸 클래스는 접두사 없음(demo.css).
- 이벤트 이름: 과거형 (`selectionChanged`, `columnMoved`). 취소 가능 이벤트는 `before` 접두사 + `e.cancel = true` 규약(로드맵 §2.6).
- 옵션은 생성자 options 객체, 런타임 변경은 명시적 메서드(`setXxx`). jQuery식 `option()` 시그니처 금지.
- 내부 상태/메서드는 `_` 접두사. 공개 API만 문서화.
- 행 식별은 `_rowId(row)` 경유 (WeakMap 자동 발급 또는 `getRowId`).
- 예외 처리: 소비자 콜백(cellRenderer, 이벤트 핸들러 등)의 예외는 잡아서 `console.error` + 안전한 폴백. 그리드가 죽으면 안 된다.

## 축적된 함정 (실제로 겪은 것)

1. **팝업/오버레이 토큰 상속 (BUG-001)**: `.dg-root` 밖에 렌더링될 수 있는 요소는 ① 루트 안에 append + ② CSS 토큰 블록 셀렉터에 추가 + ③ 다크 오버라이드에 후손 셀렉터 추가, 세 가지 세트로. 직접 선언된 토큰이 상속보다 우선하는 것에 특히 주의.
2. **가상 행 레이아웃**: 스크롤 중 생성되는 행 셀은 `_buildRowEl` 안에서 `_applyCellLayout`을 거쳐야 폭이 적용된다.
3. **데모 데이터 결정성**: `demo/data.js`는 시드 PRNG — 검증 스크립트가 특정 값에 의존해도 안전. `Math.random` 추가 금지.
4. Windows 환경: PowerShell 5.1 (`&&` 없음), git 커밋 메시지는 here-string(`@'...'@`) 사용. here-string 파싱이 깨지면 스크래치패드에 메시지 파일을 쓰고 `git commit -F <파일>`로 우회.
5. **버튼으로 여는 팝업의 토글 (BUG-002)**: ① 같은 버튼 재클릭 = 닫기 분기, ② 바깥클릭(mousedown) 핸들러에서 그 버튼 제외 — 두 가지를 세트로. 빠지면 mousedown이 닫고 click이 재오픈해서 토글이 침묵 실패한다. 팝업 검증은 열기·재클릭 토글·다른 트리거 전환·바깥 클릭을 실제 이벤트 시퀀스(mousedown→mouseup→click)로 할 것 — `element.click()`만으론 mousedown 단계가 재현 안 됨.

## 버전 정책

- 로드맵 §4 기준: v1.1 = P1 완료, v1.2 = P2 완료. 항목 단위로도 `since`는 다음 릴리스 버전으로 표기.
- 버전 올릴 때: `DataGrid.version` + `api-data.js`의 `version` + README 소개 문구 동기화.

## 빠른 명령어

```bash
node test/run-tests.js        # 단위 테스트
node demo/server.js 8087      # 데모 서버 → http://localhost:8087
```

| 확인할 것 | 위치 |
|---|---|
| 다음 할 일 | `docs/spec-roadmap.md` 미체크 P1부터 |
| API 문서 작성법 | `docs/api-data.js` 상단 주석 |
| 데모 카드 작성법 | `demo/example-tabs.js` 상단 주석 |
| 버그 리포트 형식 | `docs/bug-reports/2026-07-31-001-*.md` |
