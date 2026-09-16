# Veloo UI 디자인 시스템

앱 전체에 적용되는 디자인 토큰과 규칙. 토큰 정의는 `frontend/src/shared/styles/index.css`.
제품 수준의 화면 구조, 정보 위계, 이미지, 완료 기준은
[`product-design-rules.md`](./product-design-rules.md)를 우선 적용.

## 브랜드 정체성

- 워드마크: 소문자 `veloo`, `Space Grotesk` 700 사용 (`Shell.css` `.shell-brand-text`)
- 아이콘 마크: `favicon.svg` — 곡선 없이 각진 직선 획으로만 구성된 "V"
- **포인트 컬러: 그린 (`#12876a`).** 2026-08-16 흑백 모노톤에서 그린 액센트로 전환 직후, 같은 날 내로 초기 그린(`#2f6f5e`, S41 L31)이 아이콘·UI 모두에서 채도가 낮아 밋밋하다는 판단으로 더 쨍한 값(`#12876a`, S76 L30 — 같은 색상각 유지, 채도만 올림)으로 재조정. 앱 아이콘(`favicon.svg`/`icon-512.svg`/`icon-192.png`/`apple-touch-icon.png`)도 같은 값으로 동기화됨. 앞으로 액센트를 또 바꾸게 되면 `--accent`/`--accent-hover`/`--accent-soft`/`--selected-bg`(+ 레거시 `--c-accent*`/`--c-login-btn*`) 토큰만 고치면 되도록 설계돼 있으니, 하드코딩된 hex 대신 반드시 위 토큰을 참조할 것. 아이콘 파일은 토큰 연동이 안 되므로 수동 동기화 필요.
- 워드마크(`Space Grotesk`)는 각진 아이콘 마크와 어울리게 고른 선택. 본문 폰트로 확장하지 말 것 — 헤더 로고 전용.

## 색상 토큰

```css
--bg-canvas:          #f6f7f4;  /* 페이지 캔버스(헤더 바깥 여백) */
--bg-base:            #ffffff;  /* 작업 패널·카드 배경 */
--bg-additive:         #f0f2ee;  /* 살짝 얹는 배경 — 웰(well) */
--bg-additive-hover:   #e5e9e3;  /* hover/active 배경 */
--text-primary:        #1d2421;
--text-secondary:      #626b66;
--text-disabled:       #929a95;
--accent:              #12876a;  /* 브랜드 액센트(그린) */
--accent-hover:        #0f6f58;
--accent-soft:         #cfe6da;
--selected-bg:          #12876a;  /* 채워진 버튼/체크박스/뱃지 — --accent와 동일 */
--selected-text:        #ffffff;
--border-subtle:       #cfd3cd;
--shadow-card:         0 2px 8px rgba(24, 25, 48, .07), 0 1px 2px rgba(24, 25, 48, .05);
--c-error:             #c0392b;  /* 삭제/에러 전용 */
--c-error-dim:         rgba(192, 57, 43, 0.08);
```

**규칙**

- 새 UI에 색을 추가할 때는 항상 위 토큰에서 골라 씀. 새 hex 값 직접 박아넣기 금지.
- 빨강(`--c-error`)은 삭제·에러 등 파괴적/경고 동작에만 사용. 액센트(`--accent`)와 혼동 금지.
- `--bg-canvas`는 페이지 바깥(헤더 등), `--bg-base`는 실제 작업 패널/카드에 사용 — 두 토큰을 같은 색으로 섞어 쓰지 않음.
- `--bg-additive`는 "패널 전체"가 아니라 "작은 웰(필터 탭 트랙 등)"에만 사용 — Todo 리스트 패널 전체를 회색으로 칠했다가 흰색으로 되돌린 전례 있음(`465bb06` 이전 작업, `frontend/src/features/todos/TodoList.tsx`). 현재는 웰 배경 위에 그린 액센트가 얹힌 구조이므로 재적용 시 참고.
- 레거시 별칭(`--c-card`, `--c-sidebar`, `--c-accent` 등)이 `index.css`에 남아있음 — Todo/Login 하위호환용. 새 코드에서는 위 1차 토큰만 쓸 것.
- `--border-subtle`은 원래 `#e5e5e5`로 `--bg-canvas`/`--bg-base` 대비 1.17~~1.26:1(사실상 식별 불가)이었음 — `#cfd3cd`(1.41~~1.52:1)로 조정. `--accent-soft`도 같은 이유로 `#e6f0ec`(1.08~~1.16:1)에서 `#cfe6da`(1.22~~1.31:1)로 조정.
- `--shadow-card`는 원래 `index.css`에 정의가 없어 `Todo.css`/`ArchTrainerPage.tsx`의 `var(--shadow-card)` 참조가 조용히 무효화(그림자 없음)되던 버그였음 — 이제 정의됨. 카드/패널에 그림자를 줄 땐 값을 새로 만들지 말고 위 토큰을 쓸 것.

## 타이포그래피

```css
--font-sans: "Roboto", "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif;
--fs-meta:    11px;
--fs-body:    13px;
--fs-title:   15px;
--fs-section: 18px;
--fw-regular:  400;
--fw-medium:   500;
--fw-semibold: 600;
--fw-bold:     700;
```

**규칙**

- 헤더 워드마크만 예외로 `Space Grotesk` 사용. 나머지 모든 텍스트는 `--font-sans`.
- **모바일 입력창(input/textarea/select)은 무조건 `font-size: 16px` 이상.** 16px 미만이면 iOS Safari가 포커스 시 자동 확대(줌인)한다 — 실제 버그였고 앱 전체(Todo/Login/Paper Analyzer)에 퍼져 있던 걸 일괄 수정함(`6d3674c`). 새 입력 필드 추가 시 반드시 16px 이상으로 시작할 것.

## 간격 · 모서리

```css
--space-xs:  4px;  --space-sm:  8px;  --space-md: 12px;
--space-lg: 16px;  --space-xl: 24px;  --space-2xl: 40px;

--radius-sm:   8px;
--radius-md:  10px;
--radius-lg:  12px;
--radius-pill: 9999px;
```

## 페이지 레이아웃

리서치 도구(Papers, Translate, Models, Concepts)는 아래의 공통 레일을 사용함.

```css
--page-gutter:      24px;   /* 모바일 12px */
--page-section-gap: 20px;   /* 모바일 12px */
--page-control-h:   44px;   /* 검색·입력 컨트롤 */
--page-reading-max: 960px;  /* 읽기·검색형 화면 */
--page-content-max: 1440px; /* 편집·분석형 작업 화면 */
```

**규칙**

- Papers·Concepts는 `--page-reading-max`, Translate·Models는 `--page-content-max` 레일을 사용하고 레일 자체를 `margin-inline: auto`로 중앙 배치함.
- 헤더, 검색/입력, 초기 안내와 결과 본문은 같은 레일을 사용해 왼쪽 시작선과 오른쪽 끝선을 맞춤.
- **레일 폭이 같은 `width: min(100%, --page-*-max); margin-inline: auto` 값이어도, 그중 하나만 `overflow-y: auto`로 스크롤되면 실제 렌더링 폭이 어긋남.** 스크롤 안 되는 헤더/검색바는 항상 전체 폭을 쓰는데, 스크롤되는 결과 영역은 콘텐츠가 길어져 스크롤바가 생기는 순간 그만큼 폭이 줄기 때문 — Mac 오버레이 스크롤바에서는 안 보이고 Windows 클래식 스크롤바에서만 보여서 놓치기 쉬움(`PaperAnalyzerPage.tsx` 실제 발생 사례, 2026-08-25). **레일 안에서 `overflow-y: auto`를 쓰는 컨테이너는 반드시 `scrollbar-gutter: stable`을 같이 써서 스크롤바 유무와 무관하게 폭을 고정할 것** (`Todo.css`의 `.todo-list-scroll`이 기존 예시).
- 중앙 정렬은 콘텐츠 블록의 배치에만 적용. 제목, 설명, 입력값, 카드 내부 문장은 좌측 정렬 유지.
- 페이지 헤더의 아래 간격이 이미 `--page-section-gap`을 담당하므로 본문에 별도 상단 패딩 중복 금지.
- 검색창과 검색 전 초기 안내는 같은 `--page-reading-max` 폭을 사용함. 초기 안내는 남은 화면의 세로 중앙이 아니라 검색창 바로 아래에서 시작.
- 페이지 캔버스는 `--bg-canvas`, 실제 작업 패널과 카드는 `--bg-base`를 사용. 헤더와 본문의 캔버스 색 구분 금지.
- 표, 카드 묶음, 업로드 영역, 번역 작업 패널은 해당 레일 안에서 중앙 배치하되 내부 텍스트 정렬은 유지.

## 아이콘

- [lucide-react](https://lucide.dev) 사용, 기본 `strokeWidth`(2) 그대로 씀 — 이전엔 `2.1`로 살짝 두껍게 쓰던 규칙이 있었으나 지금은 미사용.
- 데스크톱 탭 아이콘: 15px. 모바일 하단 독 아이콘: 20px, `stroke-width: 2.35`(`Shell.css` `.shell-mobile-tab svg`).

## 컴포넌트 패턴

### 히스토리 드롭다운

- `frontend/src/shared/components/HistoryDropdown.tsx` — Translator/Contextor/Paper Analyzer가 공유.
- 규칙: 최근 기록을 페이지 본문에 상시 노출하지 않음. 헤더의 아이콘 버튼(시계 아이콘) 클릭 시에만 드롭다운으로 펼침. 항목이 0개면 버튼 자체를 숨김.
- 배경 클릭 시 자동으로 닫힘.

### 우선순위 표시 (Todo / Calendar)

공유 모듈은 `frontend/src/features/todos/priority.ts` 하나. 용도별로 export가 나뉨 — **컴포넌트마다 새로 정의하지 말고 반드시 `priority.ts`에서 import할 것.**


| export              | 용도                            | 값                                                                            |
| ------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `priorityStyle`     | 배지(배경+글자 쌍) — Todo 리스트/상세     | `urgent`=`--selected-bg` 채움, `mid`=`--bg-additive` 채움, `normal`=투명+테두리 (모노톤) |
| `priorityLabels(t)` | 라벨 텍스트                        | i18n 함수 — `t()`를 받아 언어별 라벨 반환. 상수 아님                                         |
| `priorityAccent`    | 점·텍스트·막대 등 단독 색상표시 — Calendar | `urgent`=`#a32d2d`, `mid`=`#854f0b`, `normal`=`var(--accent)`                |


- `priorityStyle`이 아니라 `priorityAccent`가 따로 있는 이유: `priorityStyle`의 `mid`(옅은 회색 배경)·`normal`(투명)은 배지 형태(배경+글자)로 쓸 땐 괜찮지만, 점이나 텍스트처럼 색 하나로만 우선순위를 나타내면 거의 안 보인다. Calendar는 빽빽한 주간 그리드에서 한눈에 구분돼야 해서 빨강/주황/초록을 그대로 유지하기로 함(모노톤 강제 안 함) — 대신 값을 한 곳에만 정의.
- 과거 `TodoItem.tsx`/`FocusPanel.tsx`가 서로 다른 배지 색을 썼고, `CalendarPage.tsx`/`WeekGrid.tsx`/`WeeklyReviewPage.tsx` 3곳이 각자 다른 빨강/주황 hex를 하드코딩했던 버그가 있었음 — 전부 위 표의 공유 export로 통일함.

### 터치 대상 (모바일)

- `:hover`로만 나타나는 요소(예: `opacity-0 group-hover:opacity-100`)를 클릭 가능한 요소 위에 두지 않음. iOS Safari에서 첫 탭이 호버 진입으로 소비되고 2번째 탭에서야 클릭이 발생하는 버그를 유발함(`TodoItem.tsx` 연필 아이콘, `6d3674c`에서 수정). 꼭 필요하면 `@media (hover: hover)`로 감싸서 터치 기기에서는 상시 노출.

### 다국어 (i18n)

- `frontend/src/shared/i18n/` — `LanguageContext.tsx`(provider) + `locales/{ko,en,zh}.json` + `index.ts`의 `useT()` 훅.
- 화면에 보이는 문자열은 하드코딩하지 않고 `t('네임스페이스.키')`로 가져옴 (예: `t('shell.nav.todo')`). 새 문자열 추가 시 `ko.json`을 기준으로 세 언어 파일에 전부 키를 넣을 것 — 하나만 빠뜨리면 해당 언어에서 키가 그대로 노출됨.
- 언어 전환 UI는 `LanguageSwitcher` 컴포넌트, 데스크톱 헤더 우측(`shell-topbar-end`)에 위치.

## 다크 모드

**구현되어 있지 않음.** `tailwind.config.js`에 `darkMode: 'class'`가 설정돼 있고 일부 컴포넌트에 `dark:` 클래스가 남아있었지만, `.dark` 클래스를 토글하는 코드가 프로젝트 어디에도 없어 절대 발동하지 않는 죽은 코드였음 — Todo 쪽은 정리함(`25f7248`). 다크 모드를 실제로 지원하려면 토글 메커니즘부터 새로 설계해야 함.

## 알려진 부채

- Chrome 익스텐션(`extensions/paper`, `extensions/contextor`)은 안 쓰여서 삭제됨(`84e28b5`) — 관련 배포 워크플로우도 함께 삭제.
