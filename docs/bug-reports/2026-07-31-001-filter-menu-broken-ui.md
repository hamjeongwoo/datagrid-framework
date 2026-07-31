# BUG-001: 컬럼 필터 메뉴 UI 깨짐 (토큰 미상속)

| 항목 | 내용 |
|---|---|
| ID | BUG-001 |
| 보고일 | 2026-07-31 (사용자 스크린샷 제보) |
| 수정일 | 2026-07-31 |
| 심각도 | **High** — 필터 기능 자체는 동작하나 UI가 사용 불가 수준으로 깨짐 |
| 영향 버전 | v1.0.0 |
| 영향 범위 | 모든 컬럼 필터 메뉴(text/number/set), 모든 페이지 · 컴포넌트 갤러리의 정적 메뉴 견본 |

## 증상

헤더의 필터 메뉴 버튼을 누르면 팝업이 **배경·테두리·그림자 없이 투명하게** 렌더링된다.
메뉴의 텍스트(컬럼명, 셋 필터 항목, Clear/Apply 버튼)가 그리드 본문 위에 겹쳐 보이고,
체크박스 테두리가 검정으로 나오는 등 스타일이 전반적으로 적용되지 않는다.

## 재현 절차

1. `examples/features.html` 열기 (아무 페이지나 동일)
2. Column Filters 예제에서 아무 컬럼 헤더에 마우스 오버 → 메뉴 버튼 클릭
3. 필터 팝업이 투명한 상태로 그리드 위에 겹쳐 표시됨

재현율 100%. 기능(Apply/Clear/필터링)은 정상 동작 — 순수 스타일 결함.

## 원인 분석

### 근본 원인

필터 메뉴는 클리핑을 피하기 위해 `document.body`에 append된다(`_openFilterMenu`).
그런데 모든 디자인 토큰(`--dg-*` CSS 커스텀 프로퍼티)은 **`.dg-root` 셀렉터에만 선언**되어
있었다. CSS 커스텀 프로퍼티는 DOM 트리 상속이므로, `.dg-root` 밖에 있는 `.dg-menu`에서는
모든 `var(--dg-*)`가 **빈 값으로 해석**된다:

| 선언 | 해석 결과 |
|---|---|
| `background: var(--dg-menu-background-color)` | `rgba(0,0,0,0)` — 투명 |
| `box-shadow: var(--dg-menu-shadow)` | `none` |
| `border: 1px solid var(--dg-border-color)` | 색 없음(currentColor로 폴백) |
| `.dg-checkbox { border-color: var(--dg-input-border-color) }` | 검정 |

브라우저 계측으로 확정: 수정 전 메뉴의 computed style은
`backgroundColor: rgba(0,0,0,0)`, `boxShadow: none`,
`getPropertyValue('--dg-menu-background-color') === ''`.

같은 이유로 `examples/components.html`의 정적 `.dg-menu` 견본(그리드 밖 배치)도 깨져 있었다.

### 수정 과정에서 발견된 2차 버그

1차 수정으로 토큰 선언 셀렉터를 `.dg-root, .dg-menu`로 확장하자 **다크 모드에서 메뉴만
라이트로 남는** 문제가 발생했다. `.dg-menu`에 라이트 토큰이 *직접 선언*되면서, 다크 루트로부터
*상속*되는 오버라이드 값보다 항상 우선하기 때문(직접 선언 > 상속). 다크 오버라이드 블록에
`.dg-theme-dark .dg-menu` 후손 셀렉터를 추가해 해결했다.

초기 렌더링 검증을 기능(DOM) 위주로만 하고 팝업의 computed style을 확인하지 않아
v1.0.0에서 걸러지지 않았다.

## 수정 내용

| 파일 | 변경 |
|---|---|
| `dist/datagrid.js` | 메뉴를 `document.body` 대신 **`this._rootEl`에 append** — 토큰·다크 테마를 자연 상속. `position: fixed`라 위치 계산은 뷰포트 기준 그대로 유효 (`.dg-root`의 `overflow: hidden`은 transform이 없는 한 fixed 요소를 클리핑하지 않음) |
| `dist/datagrid.css` | ① 토큰 선언 블록을 레이아웃 속성과 분리하고 셀렉터를 `.dg-root, .dg-menu`로 확장 — 메뉴가 어디에 렌더링되어도 스타일 보장 (방어층). ② 다크 오버라이드 셀렉터를 `.dg-theme-dark, .dg-theme-dark .dg-menu`로 확장 — 직접 선언된 라이트 토큰이 다크 상속을 덮는 2차 버그 해결 |
| `examples/components.html` | 다크 토글이 정적 `.dg-menu` 견본에도 `dg-theme-dark`를 적용하도록 셀렉터 확장 |

## 검증 (수정 후)

- 라이트: 메뉴 배경 `rgb(255,255,255)`, 테두리 `#dde2eb`, 그림자 있음, 크기·위치 정상 ✓
- 다크: 배경 `rgb(36,41,43)`(=`#24292b`), 텍스트 흰색 ✓
- 기능 회귀 없음: 셋 필터 Apply 정상 필터링, 외부 클릭 시 닫힘 ✓
- 컴포넌트 갤러리 정적 메뉴: 라이트/다크 모두 정상 ✓
- Node 단위 테스트 56개 전부 통과 (데이터 로직 무변경) ✓

## 재발 방지

1. **규칙**: `.dg-root` 밖에 렌더링될 수 있는 요소(팝업, 오버레이 등)를 새로 만들 때는
   (a) 루트 안에 append하는 것을 기본으로 하고, (b) CSS 토큰 블록 셀렉터에도 추가한다.
   이때 다크 테마 오버라이드 블록에도 반드시 후손 셀렉터를 함께 추가한다 (직접 선언 > 상속 함정).
2. **검증 절차 보강**: 팝업/오버레이류 UI는 기능 확인 외에 computed style
   (background/box-shadow) 검증을 체크리스트에 포함한다.
3. 향후 컨텍스트 메뉴(로드맵 §2.5) 등 팝업 계열 구현 시 이 문서를 선행 참조.
