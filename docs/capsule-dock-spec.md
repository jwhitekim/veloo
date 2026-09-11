# 알약(캡슐) 독 디자인 스펙

앱 전환 탭의 "슬라이딩 캡슐 인디케이터" 컴포넌트 스펙. 데스크톱(상단)과 모바일(하단)에 각각 다른 형태로 구현되어 있고, 코드는 `frontend/src/app/Shell.tsx` + `frontend/src/app/Shell.css`.

디자인 근거·출처는 [`docs/liquid-glass-research.md`](./liquid-glass-research.md) 참고. 본 문서는 "왜"가 아니라 "지금 정확히 어떤 값인가"를 기록함. **2026-08-16 기준 — 앱이 6개(Todo/Calendar/Paper/Translate/Model Review/Contextor)로 늘고 모바일에서 Todo+Calendar가 "Plan" 탭으로 합쳐진 구조를 반영.**

## 앱 구조

```
DESKTOP_APPS (상단 탭바, 6개 그대로 노출)
  todo · calendar · paper · translate · model-review · contextor

MOBILE_APPS (하단 독, 5개)
  plan(=todo/calendar 통합) · paper · translate · model-review · contextor
```

- 모바일에서는 "Plan" 탭 하나가 Todo/Calendar를 대신함. 마지막으로 본 게 Todo였는지 Calendar였는지 `localStorage`(`veloo:last-plan-app`)에 저장해뒀다가 다음에 Plan 탭을 누르면 저장된 값을 복원함.
- Plan 탭이 활성 상태일 때만 본문 위쪽에 `.shell-plan-switcher`(Todo/Calendar 전환용 서브 탭 2개)가 나타남. 다른 탭(Paper 등)에서는 보이지 않음.

## 공통 원칙

1. **인디케이터는 원이 아니라 세그먼트(탭 하나) 폭을 따르는 캡슐임.** 탭 라벨 길이가 다르면 인디케이터 폭도 달라짐.
2. **인디케이터는 탭 자신이 아니라 별도 레이어임.** 탭 버튼 배경은 투명, `position: absolute`인 인디케이터 div가 뒤(`z-index: 0`)에서 위치/폭을 애니메이션. 탭은 `z-index: 1`.
3. **탭 전환 시 인디케이터는 즉시 이동하지 않고 슬라이드함.** `transform`(위치) + `width`(폭)를 함께 트랜지션.
4. **모바일 드래그 중에는 트랜지션을 끔** (`is-dragging` 상태) — 손가락을 실시간으로 따라가야 하므로. 손을 뗀 순간에만 스냅 애니메이션 복구.
5. 위치/폭 계산은 CSS가 아니라 JS(`getBoundingClientRect`/`offsetLeft`/`offsetWidth`)로 매 렌더 시 실측함.

---

## 데스크톱 (상단 탭바)

`.shell-app-nav` (≥641px)

| 속성 | 값 |
|---|---|
| 탭 높이 | 38px |
| 탭 간격(gap) | 4px |
| 탭 내부 패딩 | `0 13px` |
| 탭 모서리 | 8px (`.shell-app-tab-indicator`도 동일) |
| 라벨 표시 | 항상 표시 (아이콘+텍스트, 비활성 탭도 숨기지 않음) |
| 아이콘 크기 | 15px, lucide 기본 `strokeWidth`(2) |

**인디케이터**
```css
background: var(--bg-base);
border: 1px solid rgba(0, 0, 0, 0.08);
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
            width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
```
- 유리(블러) 효과 없음 — 불투명 흰 배경 + 얇은 테두리 + 옅은 그림자.
- 0.5초 + 오버슈트 이징. **0.3초 이하로 줄이지 말 것** — 실제로 0.3초는 "바뀌는 느낌이 안 든다"는 피드백으로 0.5초로 늘렸었음.
- 동기화: `ResizeObserver`로 nav 컨테이너와 활성 버튼을 관찰.
- 제스처 없음 — 클릭으로만 전환.

**우측 영역(`shell-topbar-end`)**: 언어 전환 스위처(`LanguageSwitcher`)가 위치. 981px 미만에서는 숨김.

---

## 모바일 (하단 독)

`.shell-mobile-dock` (≤640px)

### 독 컨테이너 위치

| 속성 | 값 | 근거 |
|---|---|---|
| 좌우 여백 | `21px` | iOS 26 실제 탭바 값 (FabBar) |
| 하단 여백 | `env(safe-area-inset-bottom) + 21px` | 홈 인디케이터 위 21px 추가 여유 |
| z-index | 100 | 콘텐츠 위에 항상 떠 있음 |

### 캡슐 바 (`.shell-mobile-tabs`)

| 속성 | 값 |
|---|---|
| 높이 | 64px (2026-09-10, 이전 58px — "독 전체가 작아 보인다"는 피드백으로 확대) |
| 모서리 | `9999px` (완전한 캡슐) |
| 배경 | `linear-gradient(135deg, rgba(255,255,255,.56), rgba(242,242,247,.32))` |
| 블러 | `blur(24px) saturate(175%)` |
| 테두리 | `1px solid rgba(255,255,255,.5)` |
| 그림자 | `inset 0 1px 0 rgba(255,255,255,.72)`, `inset 0 -0.5px 0 rgba(0,0,0,.08)`, `0 5px 20px rgba(0,0,0,.13)` |
| `touch-action` | `none` (2026-09-06, 원래 `pan-y`였음 — 드래그 중 브라우저가 세로 스크롤/스와이프로 오인해 가로채면 `pointercancel`로 원래 탭에 스냅되는 버그("알약을 놓친다")가 있어 제스처를 JS가 완전히 독점하도록 변경. `handlePointerMove`의 `event.preventDefault()`와 세트) |
| `backdrop-filter` 미지원 폴백 | `rgba(246,246,248,.94)` 불투명 배경 |

### 탭 아이템 (`.shell-mobile-tab`)

- **5개** 탭이 `flex: 1 1 20%`로 균등 분할 (탭 폭 = 독 내부 폭 ÷ 5).
- 아이콘(20px) 위 + 라벨(10px) 아래, 세로 배치.
- 라벨은 모바일 전용 축약형: `Plan · Paper · Trans · Models · Concepts`.
- **2026-09-06 색상 — accent(그린) 폐기, 항상 `var(--text-primary)`(검정 계열)**: "선택됨"은
  색이 아니라 아이콘 자체(선형에서 면형으로, 굵기)로 표현하므로 활성/비활성 구분 없이 아이콘·라벨 색이
  항상 같음. `stroke-width`는 비활성 `1.6px` / 활성 `3px`(`.shell-mobile-tab.is-active svg`) —
  처음엔 비활성 `2.35px`였는데 이미 두꺼워서 활성일 때 굵어지는 변화가 잘 느껴지지 않는다는
  피드백으로 비활성 쪽을 낮춰 대비를 키움.
- `:active` 시 `scale(0.92)`로 눌리는 피드백.
- **2026-09-06 아이콘을 heroicons로 교체, 활성=면형/비활성=선형**: 처음엔 lucide 아이콘에
  `fill: currentColor`를 CSS로 강제해서 채우려 했는데, lucide는 순수 스트로크 세트라 아이콘마다
  도형 구성이 달라 결과가 들쭉날쭉했음(중괄호·글자 모양처럼 열린 선 위주인 아이콘은 채울 도형이
  거의 없어 효과가 없음). 그래서 모바일 하단 독 5개 아이콘만 outline/solid 쌍을 제공하는
  **heroicons**(`@heroicons/react`)로 교체 — `MOBILE_NAV`의 각 항목이 `Icon`(outline)과
  `IconSolid`(solid) 둘 다 갖고, `MobileCapsuleNavigation.tsx`가 활성 탭에만 `IconSolid`를
  렌더링함. 데스크톱 사이드바(`WORKSPACE_NAV`)는 그대로 lucide 유지 — 이번 교체는 모바일 하단
  독 범위로 한정.

  | 탭 | 아이콘(outline/solid 쌍) |
  |---|---|
  | Plan | `Squares2X2Icon` |
  | Paper | `DocumentMagnifyingGlassIcon` |
  | Trans | `GlobeAltIcon` — **예외, 아래 참고** |
  | Models | `CpuChipIcon` |
  | Concepts | `LightBulbIcon` |

  **2026-09-06 GlobeAltIcon은 solid로 바꾸지 않음** — solid 버전 소스를 까보면 그물눈처럼 작은
  조각을 이어붙인 모자이크 구조인데, 20px 크기에서는 조각 사이 틈(선)이 안티앨리어싱으로
  뭉개져 민짜 원으로 보임("선택하면 오히려 밋밋해짐" — 다른 아이콘과 정반대 효과라는
  피드백). 그래서 `IconSolid: GlobeAltIcon`(=outline 그대로)로 두고, 대신
  `.shell-mobile-tab.is-active svg { stroke-width: 3; }`(비활성은 `1.6`)로 선만 굵게 해서
  "선택됨"을 표현함 — solid로 잘 안 바뀌는 아이콘엔 위 규칙이 일반적인 대안. 이미 solid로
  바뀌는 아이콘은 stroke 자체가 없어서(fill만) 위 규칙의 영향을 받지 않음.

  **2026-09-06 재조정** — 처음엔 Trans에 `LanguageIcon`, Concepts에 `CodeBracketIcon`을 썼는데,
  2개 아이콘 모두 solid(활성) 버전 안에 가는 선 디테일(악센트 표시, 슬래시 등)이 있어서 채워졌을 때
  오히려 outline보다 더 가늘어 보이는 문제가 있었음 — 굵고 뭉툭한 실루엣의 `GlobeAltIcon`(지구본),
  `LightBulbIcon`(전구, "개념/아이디어" 의미도 더 잘 맞음)으로 교체.

### 인디케이터 (`.shell-mobile-tab-indicator`)

**형태 — 2026-09-05, 2번 뒤집힘**: 처음엔 "바 표면 위에 얹혀 위쪽으로만 튀어나온 볼록 렌즈"로
바꿨었음(`frame_0011.png` 등 App Store 레퍼런스 참고 — 아래쪽은 바 안쪽 경계에 맞춰지고 위쪽만
돌출). 하지만 5개 탭이 `flex:1 20%`로 폭이 전부 동일하게 좁은 실제 화면(세그먼트 폭 ~70px)에서는
튀어나온 높이(52~60px)가 폭 대비 너무 커서 알약이 아니라 원형으로 보였음(실기기 DOM (Document Object Model) 계산값으로
확인: `width:60px / height:52px` ≈ 1.15:1) — 그래서 **돌출 컨셉 자체를 접고, 바 안에 대칭으로
들어간(돌출 없음) 원래 방식으로 되돌리되 높이를 세그먼트 폭보다 확실히 낮춰서** 폭:높이 비율을
알약답게 만듦. 모서리 반경은 네 군데 다른 반경(스퀴클)도 시도했다가 캡슐 굴곡이 깨져 보인다는
피드백으로 기존 바와 동일한 완전한 pill(`9999px`, 네 모서리 동일)로 되돌림 — 항상 위 pill 굴곡을
유지할 것.

**재질/색 — 2026-09-06 최종**: 실제 인스타그램 앱의 터치 피드백을 그대로 재현함.
- **평소(정지)**: `#c4c4c4` 고정 회색, 테두리·블러 없음. 다른 색으로 스와핑하는 경우는 없음.
- **탭(드래그 없이 누르기만, `is-pressed`)**: 색을 바꾸지 않고 `filter: brightness(1.2)`로
  지금 색 그대로 밝기만 올림(2026-09-11: 1.45 → 1.2로 하향 — 아래 "인디케이터 화이트아웃"
  참고). 해당 filter는 인디케이터 하나가 아니라 **바(`.shell-mobile-tabs`)
  자체**에 걸려있어서, 안의 배경·인디케이터·아이콘 5개 전부가 한 덩어리로 같이 밝아짐("인디케이터가
  아니라 캡슐 전체, 아이콘 독 모두 포함해서 밝아져야 한다"는 피드백 — 처음엔 인디케이터+활성
  아이콘에만 개별적으로 걸었다가, 부모 하나에 거는 지금 방식으로 단순화). 바(`.shell-mobile-tabs`)
  전체도 살짝 부풂(`--shell-press-scale: 1.05`) — 인디케이터·아이콘은 바의 자식이라 별도
  계산 없이 부모 scale을 따라 같이 커짐.
- **드래그 중(`is-dragging`)**: 부풀기(`--shell-press-scale`)는 유지, 밝기도 2026-09-11부터
  **유지됨**(아래 참고) — 아래 "러버밴드 엣지 스트레치"가 별도로 반응함.

**2026-09-10 높이 확대**: 바 58px→64px, 인디케이터 44px→48px, top 인셋 7px→8px(`(64-48)/2`)로
같이 조정함 — "캡슐 독 전체가 낮아 보인다"는 피드백. 세그먼트 폭(~70px)보다는 여전히 낮게
유지해서 원형으로 깨지지 않는 비율을 지킴.

```css
/* .shell-mobile-tab-indicator */
top: 8px;                  /* 돌출 없음 — 64px 바 안에 대칭으로 들어감((64-48)/2) */
height: 48px;
border-radius: 9999px;
background: #c4c4c4;                        /* 고정값 — 절대 다른 색으로 스와핑하지 않음 */
box-shadow: 0 4px 12px rgba(0,0,0,.18);     /* 2026-09-06: accent 톤 링 글로우 제거, 중립 그림자만 */
transition: transform .3s cubic-bezier(.4,0,.2,1),
            width .3s cubic-bezier(.4,0,.2,1);

/* .shell-mobile-tabs — 부풀기(scale)+엣지 스트레치(scaleX+translateX 보정)를 변수로 합성,
   아래 "러버밴드" 참고. transform-origin은 항상 center 고정(2026-09-11) */
--shell-edge-scale: 1;
--shell-edge-shift: 0px;
--shell-press-scale: 1;
transform-origin: center center;
transform: translateX(var(--shell-edge-shift)) scale(var(--shell-press-scale)) scaleX(var(--shell-edge-scale));
transition: transform .15s ease-out, filter .15s ease-out;

/* .shell-mobile-tabs.is-pressed */
--shell-press-scale: 1.05;

/* .shell-mobile-tabs.is-pressed — 2026-09-11부터 :not(.is-dragging) 제거, 아래 참고 */
filter: brightness(1.45);                   /* 바 전체(안의 아이콘 5개 전부 포함) 공통 —
                                                2026-09-06: 1.25에서 1.45로 상향, "값을 더 올려달라"는 요청 */
```

**2026-09-10 버그 수정 — "밝기가 올라가다가 갑자기 어두워짐"**: `.shell-mobile-tabs`
기본 상태에 `filter` 선언 자체가 없었음(암묵적으로 `none`). `is-pressed` 해제 시
`filter: brightness(1.45)` → (선언 없음, 즉 `none`)으로 전환되는데, 브라우저는 필터 함수
목록이 다른 두 값(`brightness()` 함수 vs 필터 없음) 사이를 보간하지 못해 트랜지션 없이
그 프레임에 바로 스냅됨 — 이게 "밝아지다가 뚝 어두워지는" 것처럼 보인 원인. 기본 상태에도
`filter: brightness(1);`을 명시해서 양끝이 같은 `brightness()` 함수가 되게 맞춰 정상
보간되도록 수정.
- **폭 = 탭 버튼 `offsetWidth`에서 좌우 각 3px씩 인셋**(`INDICATOR_INSET`,
  `MobileCapsuleNavigation.tsx`의 `indicatorRectFor()`) — 5개 탭 세그먼트 폭이 전부 동일하게
  좁은 화면(~70px)에서 인셋을 너무 크게 주면 폭이 다시 높이(44px)보다 좁아져 원형이 됨.
  처음엔 인셋 없이 `offsetWidth` 그대로, 그다음 5px 인셋을 시도했다가 둘 다 원형 문제가
  있었음(2026-09-05 실기기 DOM 계산값으로 확인).
- **드래그 중(`is-dragging`)에는 인디케이터의 `transform`/`width` transition을 끔** — 손가락
  x좌표를 매 프레임 실시간 추적해야 하므로 0.3s 지연이 있으면 손끝을 따라가지 못함.
- `isPressed`는 `isDragging`(5px 이상 움직여야 켜짐)과 별개로 `pointerdown` 즉시 켜진다 — 살짝
  눌렀다 떼는 단순 탭에도 부풀기/밝기 전환 피드백이 있어야 하므로.

**폐기된 시도들 (역사, 2026-09-05 하루 동안)**:
- ① 순백(`rgba(255,255,255,.96/.74)`) 배경 — 실사용에선 잘 보였지만, `frame_0001.png`/
  `frame_0011.png` 픽셀 샘플링 결과 실제 레퍼런스는 순백이 아니라 연한 그레이였음(RGB (Red Green Blue) 대략
  190,190,205, 나머지 바 색과 큰 차이도 없음 — "선택됨"은 색이 아니라 모양이 표현).
- ② SVG (Scalable Vector Graphics) "goo"(방울 합체) 필터로 드래그 중 인디케이터 두 개(즉시 추적 lead + 지연 추적 trail)가
  물방울처럼 이어 붙는 연출 — App Store 레퍼런스(`frame_0016.png`)의 "탄성 있게 늘어남" 느낌을
  내려던 시도. `feGaussianBlur`+`feColorMatrix`+`feComposite` 표준 gooey-effect 레시피는 **꽉 찬
  도형에서만 동작**하고, "움직일 때 투명+흰 테두리만" 요구사항(속이 빈 도형)에 적용하면 도형이
  사라지거나 엉뚱한 덩어리로 뭉개짐(격리 테스트로 확인) — 기술적으로 양립 불가능해서 폐기.
- ③ 사용자가 실제 인스타그램 앱을 직접 조작해서 확인해준 실제 동작(위 "재질/색" 항목)으로
  대체 — goo/이중 블롭 없이 색 전환 + 부모 scale만으로 훨씬 단순하게 구현됨.
- ④ 배경을 진한 그레이(정지) ↔ 연한 그레이(`is-pressed`)로 스와핑하는 방식 — "밝아짐"을 색
  교체로 구현했는데, 인디케이터와 아이콘이 서로 다른 엘리먼트라 색 스와핑으로는 "캡슐+아이콘이
  같이 밝아지는" 걸 못 만들어서 `filter: brightness()` 방식으로 교체(위 "재질/색" 항목).
- ⑤ 인디케이터/활성 아이콘 각각에 개별로 `is-pressed` 클래스를 붙이고 `filter`를 거는 방식 —
  "인디케이터가 아니라 바 전체(아이콘 독 5개 전부)가 밝아져야 한다"는 피드백으로, 부모
  (`.shell-mobile-tabs`) 하나에만 filter를 거는 지금 방식으로 단순화(자식 클래스 조합 불필요).

**표면 반사광(스페큘러 하이라이트, `::before`+`::after`) — 2026-09-06 완전히 제거함.**
2026-09-04에 추가해서 그날만 3번 방식을 바꿔가며(① mix-blend > ② 알파-블렌드 단색 흰색 >
③ 밝은 띠+그림자 띠 페어) 유지해왔는데, "블러나 미러링 없이 처음부터 끝까지 완전히 균일한 단색
그레이여야 한다"는 요구사항과 정면으로 상충해서 완전히 걷어냄(레퍼런스: 실제 인스타그램
탭바는 반사 효과 없는 플랫 그레이). `--sheen-x` CSS 변수와 `sheenPercent()` 계산 함수도 같이
제거됨 — 지금 인디케이터는 순수하게 단색 고정 배경(`#c4c4c4`)만 가짐. 밝기 조정(`filter:
brightness()`)은 인디케이터 자신이 아니라 부모 바(`.shell-mobile-tabs.is-pressed`)에 걸려있음
(위 "재질/색" 항목 참고). 아이콘은 outline일 땐 `stroke`만 그리고 `fill: none`이라 도형 안
뚫린 부분(문 모양 등)이 이미 배경색 그대로 비쳐 보이므로 별도 처리 불필요.

### 제스처 — 드래그로 탭 이동

iOS `UISegmentedControl`의 네이티브 드래그 동작을 웹 포인터 이벤트로 재현.

1. `onPointerDown`: 포인터 캡처(`setPointerCapture`), 시작 좌표·최근접 탭 기록.
2. `onPointerMove`: 시작점에서 5px 이상 움직이면 "드래그 시작" 확정 — 5px 미만은 단순 탭으로 간주. 확정 시점에 `event.preventDefault()`도 호출함(2026-09-06 추가). 드래그 중엔 인디케이터(캡슐)가 포인터 x좌표를 실시간 추적, 양끝 탭 경계에서 클램프. **단, 아이콘이 굵어지는/면형으로 바뀌는 것(`is-active`)은 위 실시간 추적과 분리돼 있음** — `isActive`는 `activeMobileKey`(실제 선택 확정)만 보고, 한때 있었던 `dragTarget`(드래그 중 캡슐이 지나가는 탭)은 더 이상 보지 않음. 드래그 중 캡슐이 여러 탭을 스치듯 지나가도, 지나가는 아이콘들은 손을 떼서 실제로 선택되기 전까지 그대로 선형/얇은 채로 남음(2026-09-06, "지나가기만 해도 굵어지면 안 되고 실제로 선택돼야 굵어져야 한다"는 피드백).
3. `onPointerUp`: 실제로 드래그했다면 가장 가까운 탭으로 전환(`selectMobileItem`). 클릭 이벤트 중복 방지 목적으로 `suppressMobileClickRef`를 짧게 세워둠.
4. `onPointerCancel`: 브라우저가 제스처를 가로챌 때도 동일하게 마무리 — 단, `cancelled=true`라 `activeMobileKey`(원래 탭)로 스냅되고 `selectMobileItem`은 호출되지 않음. 해당 콜백 자체가 자주 발생하면(=드래그를 자주 "놓침") 사용자 경험상 버그이므로, `touch-action: none` + `preventDefault()`로 애초에 브라우저가 제스처를 가로채지 못하게 막는 것이 근본 대책(2026-09-06, "알약을 놓친다"는 피드백으로 추가).

**2026-09-10 버그 수정 — "드래그 애니메이션이 뚝뚝 끊김"**: `onPointerMove`가 매 이벤트마다
바로 `moveIndicator()`를 호출해 `setState`를 트리거하고 있었음 — 기기에 따라 `pointermove`가
화면 주사율보다 훨씬 잦게 발생할 수 있는데, 그때마다 즉시 렌더를 유발하면 한 프레임에 렌더가
여러 번 몰려 오히려 끊겨 보임(transition을 끄는 것과는 별개 문제). `pendingClientXRef`에
최신 좌표만 기록해두고 `requestAnimationFrame`으로 프레임당 한 번만 `moveIndicator()`를
실행하도록 코얼레싱함 — `finishGesture()`에서 예약된 rAF가 있으면 취소하고 pending 좌표도
비움. `.shell-mobile-tabs.is-dragging .shell-mobile-tab-indicator { transition: none; }`
자체는 원래도 정상 동작하고 있었음(스펙 문서 오기 아님) — 문제는 transition이 아니라 렌더
빈도였음.

**2026-09-10 추가 개선 — 드래그 중 setState 제거**: rAF 코얼레싱 이후에도 프레임마다
`setIndicatorRect()`로 state를 갱신해 컴포넌트 전체(탭 5개, 아이콘, Plan 스위처 포함)가
매 프레임 리렌더되는 구조는 남아 있었음. 인디케이터 위치만 바뀌면 되므로, 드래그 중엔
`indicatorRef.current.style.transform`을 직접 갱신하고 state는 건드리지 않도록 변경 —
손을 뗄 때(`finishGesture`)만 최종 위치로 state를 동기화해 React 트리와 다시 맞춤. width는
드래그 중 안 바뀌므로 state 값 그대로 사용.

**2026-09-11 근본 해결 — "밝기가 늘어났다가 마는 버그"**: 09-10에 두 번 시도했던
땜질(60ms 지연 → 되돌림, `is-dragging` 시 filter 전환 0s로 즉시 컷오프)은 전부
**"드래그 중엔 밝아지면 안 된다"는 2026-09-06 결정을 유지한 채 그 전환 방식만 고치려던
시도**였음 — 근본 원인은 결정 자체였음. "손을 뗄 때까지 밝기가 계속 유지돼야 한다"는
피드백으로 `.shell-mobile-tabs.is-pressed:not(.is-dragging)`의 `:not(.is-dragging)`을
제거 — 이제 `is-pressed`가 유지되는 동안(드래그 여부와 무관하게) 밝기가 계속 유지되고,
손을 뗄 때만 0.15초 페이드아웃으로 꺼짐. 값이 중간에 방향을 트는 상황 자체가 없어짐.

**2026-09-11 인디케이터 화이트아웃 (위 수정의 부작용)**: 밝기가 드래그 내내 유지되면서
새로 드러난 문제 — `filter`는 바뿐 아니라 인디케이터(`#c4c4c4`, RGB 196)에도 그대로 걸리는데,
1.45배면 `196×1.45≈284`로 255(순백)에 클램핑됨. 인디케이터가 순백이 되면서 바의 반투명 흰색
글래스 배경과 구분이 안 가 "드래그하면 인디케이터가 사라진다"는 피드백으로 이어짐. 이전엔
탭 순간에만 잠깐 화이트아웃됐다가 곧 꺼져서(드래그 시작 즉시 밝기가 꺼졌으므로) 눈에 안
띄었는데, 드래그 내내 유지되도록 바꾸면서 지속적으로 보이게 됨. `brightness(1.2)`로 낮춰서
`196×1.2≈235`로 클램핑을 피함 — 바 전체가 밝아지는 느낌은 유지하되 인디케이터 대비가
끝까지 남음.

(아래는 09-10 시도 기록, 참고용 — 지금은 위 결정으로 대체됨)

**2026-09-10 원인 분석**: `isPressed`가 `pointerdown` 즉시 켜져 `filter`가
`brightness(1)→(1.45)`로 0.15초 동안 올라가기 시작하는데, 5px 이상 움직여 `isDragging`이
켜지는 순간 `.is-pressed:not(.is-dragging)` 조건이 깨지면서 목표값이 그 순간 즉시
`brightness(1)`로 바뀜. CSS는 이걸 새 전환으로 인식해 그때까지 올라간 값에서 다시
1.0으로 되돌아감 — 대부분의 드래그는 누른 직후 바로 시작되므로 이 되돌림이 거의 매번
발생해 "밝아지는 게 끝나는 걸 본 적이 없다"는 인상을 줌. 지연(60ms) 시도는 타이밍에
의존해 효과 없었고, filter 전환 0s 시도는 되돌림 자체는 안 보이게 했지만 "꺼진다"는
사실은 그대로라 근본 해결이 아니었음.

**러버밴드 엣지 스트레치 (2026-09-06 추가, 같은 날 방식 1번 교체, 2026-09-11 방식 2번 교체)** —
드래그로 첫/마지막 탭 경계를 넘어서려 하면 인디케이터만 경계에 멈추는 게 아니라 바
(`.shell-mobile-tabs`)도 반응함. **처음엔 바 전체를 `translateX`로 밀어내는 방식으로 만들었는데**,
"바가 통째로 옮겨가는 게 아니라 반대쪽 모서리는 원래 위치에 고정된 채 미는 쪽 모서리(굴곡선)만
늘어나 끌려가는 느낌이어야 한다"는 피드백으로 **`transform-origin`을 반대쪽 끝에 고정하고
`scaleX`로 미는 쪽만 늘리는 방식**으로 교체했음.

**2026-09-11 원인 진단 + 재교체**: `transform-origin` 전환 방식은 부풀기(`--shell-press-scale`,
중심 기준 대칭)와 엣지 스트레치(`--shell-edge-scale`, 한쪽 고정)가 같은 `transform-origin`을
공유한다는 구조적 문제가 있었음 — 경계를 넘는 순간 origin이 `center`에서 `left`/`right`로
즉시(트랜지션 불가능한 속성이라) 점프하는데, 그 직전까지 `center` 기준으로 대칭 부풀어 있던
왼쪽(또는 오른쪽) 끝이 그 순간 반대쪽으로 튕겨 보였음("오른쪽으로 늘어날 때 왼쪽 끝도 움직인다"는
피드백 — 인스타그램은 이런 스냅 없이 고정된 쪽이 완전히 정지해 있음).

**해결**: `transform-origin`을 항상 `center center`로 고정하고, 대신 `translateX`로 절반만큼
보정함. 중심 기준 `scaleX`는 양쪽을 `push/2`씩 대칭으로 늘리는데, 여기에 `push/2`만큼 반대
방향 `translateX`를 더하면 미는 쪽은 `push` 전체만큼 늘고 반대쪽은 정확히 고정되는 효과를
수학적으로 동일하게 얻으면서 origin 전환(=점프)이 아예 없어짐. `moveIndicator()`가 overshoot을
`sqrt`로 체감시켜 `push`(`EDGE_PUSH_MAX_PX` 8px 상한)를 구하고, `--shell-edge-scale`과
`--shell-edge-shift`(px 단위 `translateX` 보정값) 두 CSS 변수를 imperatively 반영함
(`tabsRef.current.style.setProperty`). 손을 떼면(`finishGesture`) 둘 다 기본값(1, 0px)으로
리셋 — 바의 `transition`이 복귀를 자연스럽게 애니메이션(이제 `transform-origin`을 안 건드리므로
전처럼 "리셋 시점을 고민할 필요"도 없어짐).

**(지난 기록, 대체됨) 2026-09-06 `transform-origin`은 리셋하지 않음** — 처음엔 손을 뗄 때
`transform-origin`도 `center center`로 같이 되돌렸는데, 트랜지션이 안 되는(즉시 바뀌는)
속성이라 scale이 줄어드는 애니메이션 도중 기준점이 갑자기 바뀌면 화면이 튀는 문제가 있었음.
당시엔 "부풀기(1.05)는 작아서 origin이 모서리로 옮겨져도 티가 안 난다"고 판단해 놔뒀으나,
실제로는 이 판단이 틀렸음 — 위 "2026-09-11 원인 진단"에서 나왔듯 이 작은 티가 "왼쪽 끝도
움직인다"는 형태로 눈에 띄었음. `transform-origin` 자체를 안 건드리는 지금 방식(위 참고)으로
교체되며 이 문제 자체가 해소됨.

```css
/* .shell-mobile-tabs — 현재 방식 */
--shell-edge-scale: 1;
--shell-edge-shift: 0px;
--shell-press-scale: 1;
transform-origin: center center;              /* 항상 고정, JS가 안 건드림 */
transform: translateX(var(--shell-edge-shift)) scale(var(--shell-press-scale)) scaleX(var(--shell-edge-scale));
```
```js
// moveIndicator() 안, overshoot 계산 후
const push = Math.min(EDGE_PUSH_MAX_PX, Math.sqrt(Math.abs(overshoot)) * EDGE_PUSH_FACTOR)
const shift = overshoot > 0 ? push / 2 : overshoot < 0 ? -push / 2 : 0
bar.style.setProperty('--shell-edge-scale', `${(barWidth + push) / barWidth}`)
bar.style.setProperty('--shell-edge-shift', `${shift}px`)
```
부풀기(`.is-pressed`가 `--shell-press-scale`만 갱신)와 엣지 스트레치(JS가 `--shell-edge-scale`/
`--shell-edge-shift`만 갱신)를 이렇게 변수로 분리 합성해야 함 — 인라인 스타일로 `transform`을
통째로 덮어쓰면 클래스가 주는 scale이 지워지기 때문.

**성능(2026-09-06 추가)**:
- `.shell-mobile-tabs`/`.shell-mobile-tab-indicator` 둘 다 `will-change: transform` — 드래그
  내내 매 프레임 `transform`이 바뀌는 요소라 컴포지팅 레이어 승격을 미리 예약해서 애니메이션
  시작 시점의 끊김을 줄임. `width`(인디케이터가 탭 전환 시에만 바꾸는 레이아웃 속성)는
  GPU 가속 대상이 아니라 `will-change`에서 제외.
- `barWidth`(엣지 스트레치 비율 계산에 쓰는 바 실측 폭)는 `moveIndicator()`가 매 프레임 다시
  읽지 않고 `handlePointerDown` 시점에 `barWidthRef`로 한 번만 캐싱함 — `offsetWidth` 읽기는
  강제 리플로우를 유발할 수 있는 레이아웃 읽기라, 드래그 중 반복 호출을 피함(드래그 도중 바
  너비가 바뀔 일은 없으므로 안전).
- `backface-visibility: hidden`은 적용 대상이 없어 미사용 — 3D 회전(`rotateY` 등)에서 깜빡임을
  막는 속성인데 해당 컴포넌트는 회전을 쓰지 않음.

### Plan 스위처 (`.shell-plan-switcher`)

모바일에서 "Plan" 탭이 활성일 때만 본문 상단에 나타나는 2단 서브 탭 (Todo / Calendar).

| 속성 | 값 |
|---|---|
| 배치 | `grid-template-columns: repeat(2, 1fr)`, gap 4px |
| 높이 | 40px (버튼 자체는 30px) |
| 배경 | `color-mix(in srgb, var(--bg-base) 94%, var(--accent-soft))` — 은은한 그린 틴트 |
| 활성 버튼 | `background: var(--bg-base)`, `color: var(--accent)`, 옅은 그림자로 떠 보이게 |
| 아이콘 | 14px |

### 접근성 · 축소 모션

- `.shell-mobile-tab:focus-visible` — `outline: 2px solid rgba(0,0,0,.72)`.
- `.shell-plan-switcher button:focus-visible` — `outline: 2px solid var(--accent)`.
- `@media (prefers-reduced-motion: reduce)` — 인디케이터/캡슐 바 트랜지션을 `0.01ms`로 강제.

---

## 하지 않는 것 (역사적으로 시도했다가 되돌린 것)

- ❌ 화면 끝까지 붙는 전체 폭 바 (Instagram 구버전 스타일) — 오해로 한 번 만들었다가 "알약 형태로 떠 있어야 한다"는 피드백으로 되돌림.
- ❌ 인디케이터를 고정 크기 원(28px)으로 — 세그먼트 폭을 따르는 캡슐이 맞는 방향으로 확인되어 폐기.
- ❌ 데스크톱 탭 라벨을 활성 상태에서만 펼치기 — 비활성 탭이 아이콘만 남아 뭔지 알 수 없다는 문제로 항상 라벨 표시로 변경.
- ❌ 별도 검색 캡슐(듀얼 캡슐 구조) — 초기 버전엔 있었으나 이후 단일 캡슐 구조로 단순화됨.
- ❌ 모바일 하단 독에 Todo/Calendar를 각각 독립 탭으로 — 탭 수가 6개까지 늘면서 하단 독이 좁아져, 성격이 비슷한 Todo/Calendar를 "Plan" 하나로 묶고 내부 서브 스위처로 분리.
