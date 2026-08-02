# BUG-012: 셀을 클릭하면 그 자리에 텍스트 캐럿이 깜빡임

- **발견일**: 2026-08-02
- **보고자**: 사용자 ("그리드 셀에 클릭을 하면 포커스가 잡히는건 맞는데 왜 커서가 그자리에서 깜빡이지?")
- **심각도**: 중간 — 기능은 동작하지만 "여기 입력할 수 있다"는 잘못된 신호를 준다
- **수정 커밋**: (이 커밋)

## 증상

셀을 클릭하면 포커스 아웃라인과 별개로 클릭한 글자 위치에 **텍스트 캐럿이 깜빡인다.**
입력창처럼 보이지만 타이핑은 되지 않는다(편집 진입은 더블클릭).
같은 이유로 셀을 가로질러 드래그하면 웹페이지 문단처럼 텍스트가 긁힌다.

## 재현 절차

1. `http://localhost:8087/index.html` (또는 `cellSelection`을 쓰지 않는 아무 카드)
2. 아무 셀이나 클릭 → 클릭 지점에 캐럿
3. 셀을 가로질러 드래그 → 셀 텍스트가 선택됨

### 계측 (수정 전)

```
cellClass         dg-cell dg-cell-editable dg-cell-focused
cellCursor        text          ← I빔 포인터
cellUserSelect    auto          ← 텍스트 선택 가능
hasEditorInCell   false         ← input/textarea/select 없음
activeIsEditable  false         ← contenteditable 아님
rootTabindex      0
```

코드 전체에 `contenteditable`은 0건이고 `_onCellClick`은 편집을 시작하지 않는다
(`singleClickEdit` 옵션 자체가 없고 편집은 `_onCellDblClick` 전용).
즉 **그리드가 만든 캐럿이 아니라 브라우저가 그린 캐럿**이다.

## 원인 분석

세 가지가 겹쳤다.

1. 루트가 `tabindex="0"`(datagrid.js:2349)이라, 셀 클릭 시 브라우저가 가장 가까운
   포커서블 조상인 루트에 **네이티브로** 포커스를 준다(그리드가 `focus()`를 부르지 않는다).
2. 헤더(`.dg-header-cell`)와 행번호 셀에는 `user-select: none`이 있는데
   **일반 셀에는 없었다.** 셀 텍스트가 선택 대상이었다.
3. 텍스트 선택을 막는 `e.preventDefault()`가 `if (this._cellSelection)` 블록
   **안에만** 있었다(datagrid.js:2472, 주석 `/* 텍스트 선택 방지 */`).

그래서 `cellSelection`을 켜지 않은 그리드에서는 셀이 일반 문단과 똑같이 동작해
클릭이 collapsed 선택을 만들고, 브라우저가 포커스된 요소 안의 그 위치에 캐럿을 그렸다
(캐럿 브라우징이 켜져 있으면 깜빡임까지 보인다).

여기에 `.dg-cell-editable { cursor: text }`가 I빔 포인터를 더해
"클릭하면 입력된다"는 신호를 강화했지만, 실제 편집 진입은 더블클릭이다.

**근본 원인은 텍스트 선택 억제가 그리드 정책이 아니라 `cellSelection` 기능의
부수효과로 존재했던 것.** 옵션 하나로 같은 그리드가 "셀 UI"였다가
"선택 가능한 문단"이 됐다.

## 수정 내용

1. `.dg-root`에 `user-select: none` — 선택 억제를 **그리드 전체 정책**으로 올렸다.
   복사는 이미 Ctrl+C / `copyToClipboard()`가 담당한다.
2. 실제 입력 표면에서만 되살린다:
   `.dg-root/.dg-menu/.dg-popup`의 `input`·`textarea`에 `user-select: text`.
   `.dg-menu`/`.dg-popup`은 루트 안에 append되므로(BUG-001) `none`을 상속받는다 —
   되살리는 규칙이 없으면 필터 입력·팝업 폼에서 텍스트를 선택할 수 없게 된다.
3. `.dg-cell-editable`의 커서를 `text` → `default`.
   지키지 못할 약속을 하는 커서를 없앴다.

`datagrid.js`의 mousedown `preventDefault()`는 그대로 뒀다 — 드래그 범위 선택의
앵커 처리에 함께 걸려 있어 제거하면 포커스 동작이 바뀐다.

## 검증

`?v=` 캐시 버스팅 + `fetch(href, {cache:'reload'})`로 서빙된 CSS에 `BUG-012`
문자열이 있는지 먼저 확인한 뒤(pitfall 16) 계측:

| 대상 | user-select | 커서 |
|---|---|---|
| `.dg-cell` | none | default |
| `.dg-cell-value` (자손 상속) | none | — |
| `.dg-popup-label` | none | — |
| 인라인 에디터 `input` | **text** | text |
| 필터 메뉴 `input` (루트 안) | **text** | — |
| 팝업 폼 `input` 8개 전부 | **text** | — |
| 루트 밖 정적 `.dg-menu` 견본 | **text** | — |

- 인라인 에디터에서 `setSelectionRange(1,4)` → 선택 길이 3 (선택 정상 동작)
- 751 passed, 콘솔 에러 0

## 재발 방지

- **선택·커서·포커스처럼 "이 요소가 무엇인지"를 사용자에게 알리는 성질은
  기능 옵션의 부수효과가 아니라 컴포넌트 레벨 정책으로 둘 것.**
  한 기능을 켜고 끄는 것만으로 컴포넌트의 정체성이 바뀌면 안 된다.
- 컨테이너에 `user-select: none`을 걸 때는 **그 안에 나중에 들어올 입력 표면**까지
  생각할 것. 특히 루트 안에 append되는 팝업류는 조용히 상속받는다(BUG-001의 이면 —
  토큰이 상속되는 것과 같은 경로로 이런 억제 속성도 상속된다).
- 커서 모양은 상호작용 약속이다. `cursor: text`는 "클릭하면 캐럿이 선다"는 뜻이므로
  단일 클릭 편집이 없으면 쓰지 말 것.
- CLAUDE.md "축적된 함정" 19번에 등재.
