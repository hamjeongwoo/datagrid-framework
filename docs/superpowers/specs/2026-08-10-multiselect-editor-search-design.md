# 검색형 multiselect 에디터 (multiselect + editorSearch) — 설계

- 날짜: 2026-08-10
- 대상 릴리스: v2.25.0
- 관련 기존 스펙: `editorSearch`(v2.3.0, select 전용) · `multiselect`(v2.2.0) · `popupEditor`(v2.16)

## 배경

`column.editorSearch`는 `editor: 'select'`에만 걸려 있다
(`_createEditorWidget`의 분기 조건이 `editorType === 'select' && col.editorSearch`).
`editor: 'multiselect'`는 그보다 위 분기에서 잡히므로, `editorSearch`를 같이 줘도
**에러도 경고도 없이 무시**된다. 옵션이 수십 개를 넘어가면 체크리스트를 스크롤로만
훑어야 하고, lazy 로딩(`fetch`)은 아예 쓸 수 없다.

## 목표

`editor: 'multiselect'`에서도 `editorSearch`가 동작한다. 스키마는 select와 **동일**하다
(`true` = 정적 `editorOptions` 로컬 필터, `{ fetch, debounce, minLength, placeholder }` = lazy).
선택된 값은 **칩**으로 상시 표시한다.

## 비목표

- `editorSearch`에 multiselect 전용 옵션을 새로 추가하지 않는다.
- 비검색 multiselect(기존 동작)는 그대로 둔다.
- 옵션 값 자체에 콤마가 들어가는 경우의 저장 표현 문제(`normalizeMultiValue`의 기존 한계)는 다루지 않는다.

## 구현 방식

`_createEditorWidget`의 searchselect 분기를 `multi` 플래그로 **일반화**한다.

```js
} else if (editorType === 'multiselect' && !col.editorSearch) {   // ← 가드가 세트다
  /* 기존 체크리스트 패널 */
} else if ((editorType === 'select' || editorType === 'multiselect') && col.editorSearch) {
  const multi = editorType === 'multiselect';
```

**위에 있는 비검색 `multiselect` 분기의 `&& !col.editorSearch` 가드가 세트다** —
그 분기가 먼저 잡으므로 가드가 없으면 새 분기에 영영 도달하지 못한다
(구현 중 실제로 이 상태가 됐고, 증상은 v2.25 이전과 똑같이 "옵션이 조용히 무시됨"이었다).

두 위젯의 공통부(질의 실행·디바운스·최신 질의 판별 `ssSeq`·`isClosed` 가드·label 캐시·
`flipPanel` 위치 결정·폼 접힘·focusout·Esc)가 분기부보다 훨씬 크다. 분기를 따로 파면
이 로직이 두 벌이 되어 이후 수정이 한쪽에만 반영되는 함정이 생긴다.

## 마크업

```
.dg-editor-searchselect.dg-searchselect-multi
├── .dg-searchselect-chips          ← 선택 0개면 hidden
│   └── .dg-searchselect-chip (.dg-tag.dg-tag-plain)
│       └── button.dg-searchselect-chip-remove  (aria-label = removeChipLabel)
├── input.dg-searchselect-input     ← 순수 검색어 입력 (값 표시 아님)
└── .dg-searchselect-list
    └── .dg-searchselect-option.dg-multi-option
        └── input.dg-checkbox (pointer-events: none, tabindex=-1) + 라벨 텍스트
```

`.dg-editor-searchselect` 계열 CSS를 그대로 상속하므로 폼 접힘(`dg-searchselect-collapsible`)의
**BUG-013 z-index 처리(`z-index: auto`)도 이미 검증된 규칙을 탄다**.

옵션 안의 체크박스는 **표시 전용**이다. `disabled`는 쓰지 않는다(BUG-006) —
`pointer-events: none` + `tabindex="-1"`로 클릭이 항상 옵션 div에 떨어지게 해서
"네이티브 change + 우리 click"이 이중으로 발화하는 경로를 없앤다.

## 상태 — 핵심

**선택 상태의 진실은 DOM이 아니라 내부 배열 `msPicked`다.**

기존 비검색 multiselect의 `getValue()`는 패널의 `<input>`을 순회해 값을 모은다.
검색형에서는 **필터로 가려진 항목이 DOM에서 사라지므로** 그 방식을 쓰면 선택이
조용히 유실된다. lazy면 질의마다 목록이 통째로 갈리므로 더 심하다.

- 진입: `msPicked = normalizeMultiValue(value).slice()`
- 옵션 클릭 / 칩 × → `toggleMultiValue` → 칩 줄 + 목록 체크 표시 재렌더
- 커밋: `denormalizeMultiValue(msPicked, value)` — 원본이 콤마 문자열이면 문자열로
  되돌리는 **기존 타입 보존 규칙 유지**
- 순서: **선택한 순서**(= 칩이 보이는 순서). 비검색 multiselect는 `editorOptions` 순서로
  커밋하지만, lazy에는 "전체 옵션 목록"이라는 것이 존재하지 않아 그 규칙을 적용할 수 없다.
  화면의 칩 순서와 저장 순서를 일치시키는 쪽을 택한다. **문서에 명시.**

## 값 → label (칩 텍스트)

lazy로 고른 값은 정적 `editorOptions`에 없다. searchselect가 쓰는 컬럼별
`_searchSelectLabels[colId]` 캐시를 **그대로 공유**한다.

곁들여 내장 렌더러 `DataGrid.renderers.multiselect`도 `params.optionLabels`(같은 캐시)를
보도록 확장한다 — 지금은 캐시를 안 봐서 lazy로 고른 값이 셀에서 원시 코드로 표시된다.

캐시 조회는 `hasOwnProperty` 기준으로 한다. `in`이나 `!== undefined`로 보면
`'toString'` 같은 값이 `Object.prototype`에 걸려 **함수가 label로 새어 나온다**
(단일 값 렌더러에도 있던 문제라 같이 고친다).

**뒤늦게 알게 되는 label(구현 중 추가).** 편집 진입 시점엔 정적 목록도 캐시도 없어
칩이 코드로 뜨지만, 첫 질의 결과에 그 값이 들어 있으면 이름을 알 수 있다.
결과를 렌더링할 때 이미 고른 값의 label을 캐시에 넣고 칩을 다시 그린다
(셀 표시도 같은 캐시를 보므로 커밋 후 셀까지 이름으로 바뀐다).

## 소비자 통지

| 경로 | 통지 |
|---|---|
| 인라인 셀 | `onPick()`을 **부르지 않는다**. 인라인의 `onPick`은 `finish(true)`(즉시 커밋+닫기)라 첫 선택에서 편집이 끝나 버린다. 커밋은 blur(`focusout`)/Enter/Tab이 담당 |
| 팝업 폼 | 상태 변경마다 패널에서 버블하는 `change` 이벤트를 합성 발사 → `fieldEl`의 기존 `change` 리스너가 `_popupFieldChanged`를 호출 |

`_popupFieldChanged`는 `sameEditValue(..., multi)`로 무변경을 걸러내므로 중복 통지는 무해하다.

## 키보드

| 키 | 동작 |
|---|---|
| ↓ / ↑ | 활성 항목 이동 (기존과 동일) |
| Enter | 활성 항목이 있으면 **토글**하고 전파 중단. 없으면 그대로 버블 → 셀 커밋 |
| Esc | 인라인은 편집 취소(기존), 폼 접힘 상태에서는 목록만 닫기(기존) |
| Tab / blur | 커밋 (기존) |

select는 "고르면 끝"이라 Enter=커밋이지만, multiselect는 여러 개를 골라야 해서
Enter를 커밋에 쓰면 첫 선택에서 편집이 닫힌다. 활성 항목 유무로 의도를 가른다.

## 폼(popupEditor)에서의 모습

**접히는 콤보박스**로 둔다(`collapsible: true` 경로 재사용). 평소엔 칩 줄 + 검색창만
보이고, 클릭·타이핑할 때만 목록이 떠서 다른 필드를 덮는다.

칩 줄이 현재 상태를 그대로 보여주므로 접혀도 정보 손실이 없다. 비검색 multiselect가
폼에서 항상 펼쳐지는 이유는 "고른 값을 보여줄 자리가 없어서"였는데(BUG 교훈 §14),
칩이 그 자리를 대신한다. 접힘 시 검색 입력은 **비운다**(select는 현재 값 label을 남기지만,
multi는 값이 칩에 있으므로 입력창에 남길 것이 없다).

**목록이 폼 바디에 잘리는 문제(구현 중 발견 — 기존 select에도 있던 것).**
`.dg-popup-body`는 `overflow-y: auto`인 스크롤 컨테이너라 그 밖으로 나간 절대 위치
목록을 **그리지 않는다**. 필드가 폼 아래쪽에 있으면 목록이 통째로 안 보이고 푸터에 덮인다.
`clippingRect(el)` 헬퍼로 가장 가까운 클립 조상을 찾아 ① 아래가 모자라고 위가 더 넉넉하면
위로 펴고(`dg-searchselect-up`) ② 어느 쪽으로도 안 담기면 남은 공간에 맞춰 `max-height`를
줄여 목록 안에서 스크롤한다. 칩 줄로 컨트롤이 높아지는 multiselect에서 훨씬 잘 드러나므로
이번 작업 범위에 포함한다.

## 실패·경계

- `fetch` 실패 → `console.error` + "Load failed". **칩은 유지**된다(상태가 DOM 밖이라 안전).
- `minLength` 미달 → 안내 메시지. 이때도 칩 줄은 계속 보인다.
- 선택 0개 커밋 → `[]` / `''`. 원본도 빈 값이면 기존 무변경 판정이 스퓨리어스 커밋을 막는다.
- 늦게 도착한 응답은 기존 `ssSeq` + `isClosed()` 규약으로 폐기.

## 순수 함수 + 테스트

- `toggleMultiValue(list, value)` — 느슨한 비교(`String()`) 기반 토글.
  콤마 문자열에서 온 `'1'`과 옵션의 숫자 `1`이 같은 항목으로 잡혀야 한다.
- `lookupOptionLabelsWith(options, values, cache)` — 기존 `lookupOptionLabels`에 캐시 폴백을 더한 것.
  기존 함수는 캐시 없이 호출하는 얇은 래퍼로 정리.
- 기존 `filterEditorOptions`는 그대로 재사용.
- `DataGrid._test` 노출 + `test/run-tests.js` suite (빈 목록·중복 토글·타입 불일치·캐시 미스).

## 문서·데모

- `examples/features.html` 맨 마지막에 전용 섹션 — 정적 필터 카드 + lazy 카드.
- `examples/components.html`에 칩 줄 정적 견본.
- `docs/api-data.js`: `editor`·`editorSearch`·`renderers.multiselect` 설명 갱신, `since: '2.25.0'`.
- 새 로케일 키 `removeChipLabel` (`'Remove {label}'` / `'{label} 제거'`).
- `README.md`, `docs/spec-roadmap.md`, `DataGrid.version` → `2.25.0`.
