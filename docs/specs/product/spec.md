# Product Specification

## Purpose

veloo는 연구자의 계획, 탐색, 번역, 모델 분석, 개념 학습을 하나의 워크스페이스로 연결하는 개인 연구 도구다. 이 스펙은 화면 구조와 시각 의사결정을 고정하는 기준을 담는다. 세부 디자인 토큰은 `docs/ui-design-system.md`, 모바일 하단 네비게이션은 `docs/specs/mobile-navigation/spec.md` 참고.

디자인 목표: 연구 콘텐츠가 장식보다 먼저 인식되는 편집 도구, 낮은 시각적 소음과 명확한 정보 위계, 동일 역할에 동일 구조를 적용하는 예측 가능한 인터페이스, 데스크톱 작업 효율과 모바일 탐색 효율 동시 보장, 마케팅 화면과 실제 제품 화면의 시각 언어 일치.

비목표: 화면마다 다른 카드 문법, 장식 목적의 글래스 효과 확대, 기능 구분 목적의 임의 색상 추가, 페이지마다 새로운 헤더/검색창/빈 화면 구조, 다크 모드 토글 없는 다크 스타일.

## Requirements

### Requirement: D-001 단일 시각 언어
시스템은 배경(`--bg-canvas`), 작업 패널/카드(`--bg-base`), 주요 행동/선택 상태(`--accent`), 오류/삭제(`--c-error`) 색상 역할을 고정 토큰으로만 표현해야 한다(SHALL). 신규 색상값을 직접 작성해서는 안 된다(SHALL NOT).

#### Scenario: 새 화면에 색상 추가
- GIVEN 새 화면 또는 컴포넌트를 만드는 중
- WHEN 강조·오류·배경 색이 필요함
- THEN 기존 토큰(`--accent`, `--c-error`, `--bg-canvas`, `--bg-base`) 중에서 선택
- AND 새 hex 값을 직접 작성하지 않음

### Requirement: D-002 페이지 계열
시스템은 화면을 계획(Tasks/Calendar), 탐색(Papers/Concepts), 처리(Translate/Models) 세 계열로 분류하고, 같은 계열의 화면은 같은 헤더/컨트롤/상태 표현을 공유해야 한다(SHALL).

#### Scenario: 탐색 계열 신규 화면
- GIVEN Papers 또는 Concepts와 같은 탐색 계열에 새 화면을 추가
- WHEN 레이아웃을 구성함
- THEN `--page-reading-max` 레일과 "헤더 > 검색 > 안내 또는 결과" 구조를 따름
- AND 탐색 계열과 처리 계열 사이의 레일 차이 외에는 페이지 전용 예외를 만들지 않음

### Requirement: D-003 정보 위계
각 화면은 제목/핵심 행동 → 입력/검색 컨트롤 → 결과/진행 상태 → 설명/예시 → 기록/부가 기능 순서로 시각적 우선순위를 배치해야 한다(SHALL). 화면마다 상시 노출되는 핵심 행동은 1개여야 한다(SHALL).

#### Scenario: 결과 없는 빈 화면
- GIVEN 사용자가 아직 검색/입력을 하지 않은 상태
- WHEN 결과 영역을 렌더링함
- THEN 대형 통계나 기록을 그 자리에 배치하지 않음
- AND 기록은 `HistoryDropdown`으로만 노출

### Requirement: D-004 공통 페이지 골격
시스템은 모든 작업 화면에서 `PageHeader → PrimaryControl → PageGuide 또는 PageEmptyIntro → ResultContent → StatePanel` 골격과 지정된 공유 컴포넌트를 사용해야 한다(SHALL). 동일 역할의 마크업/CSS를 기능 폴더에서 재정의해서는 안 된다(SHALL NOT).

#### Scenario: 새 탭에 헤더 추가
- GIVEN 새로운 기능 탭을 추가하는 중
- WHEN 페이지 상단 헤더가 필요함
- THEN `frontend/src/shared/components/PageHeader`를 재사용
- AND 해당 탭 폴더 안에 헤더를 새로 구현하지 않음

### Requirement: D-005 타이포그래피와 간격
시스템은 워드마크를 제외한 모든 텍스트에 `--font-sans`를, 간격에는 `--space-xs`~`--space-2xl` 토큰만 사용해야 한다(SHALL). 모바일 입력 필드 글자 크기는 16px 이상이어야 한다(MUST).

#### Scenario: 모바일 입력 필드
- GIVEN 모바일 폭에서 텍스트 입력 필드를 렌더링
- WHEN 폰트 크기를 지정함
- THEN 16px 이상을 사용(iOS 자동 확대 방지)

### Requirement: D-006 컴포넌트 표면
시스템은 카드 모서리에 `--radius-lg`, 입력/버튼에 `--radius-sm` 또는 `--radius-md`, 카드 그림자에 `--shadow-card`, 테두리에 `--border-subtle`을 사용해야 하며 카드 중첩은 최대 2단계까지 허용한다(SHALL).

#### Scenario: 카드 안에 카드
- GIVEN 카드 컴포넌트 안에 추가 카드를 배치하려는 상황
- WHEN 중첩 깊이가 3단계 이상이 됨
- THEN 구조를 재검토(2단계 제한 위반)

### Requirement: D-007 아이콘
시스템은 `lucide-react`를 기본 아이콘 세트로 사용해야 하며(SHALL), 의미가 같은 기능에는 항상 같은 아이콘을 사용해야 한다(SHALL). 모바일 하단 독의 Heroicons 예외는 `mobile-navigation` 스펙을 따른다.

#### Scenario: 브랜드 마크가 아닌 신규 아이콘
- GIVEN lucide-react에 없는 도형이 필요함
- WHEN 브랜드 마크가 아님
- THEN 직접 SVG(Scalable Vector Graphics) 작성 대신 라이브러리 안에서 대안을 우선 탐색

### Requirement: D-008 이미지
시스템은 제품 설명을 보조하는 이미지에만 GPT 생성 이미지를 사용해야 하며(SHALL), 제품 화면 내부의 실제 입력·결과·상태를 이미지로 대체해서는 안 된다(SHALL NOT). 공개 마케팅 이미지는 `frontend/public/marketing/`에 위치해야 한다(SHALL).

#### Scenario: 마케팅 히어로 이미지 추가
- GIVEN 랜딩 페이지에 새 히어로 이미지를 추가
- WHEN 이미지를 배치함
- THEN `frontend/public/marketing/`에 저장
- AND 이미지 위에 제품 미리보기 전체를 덮는 레이아웃을 쓰지 않음
- AND 빈 대체 텍스트와 `aria-hidden` 적용

### Requirement: D-009 모션
시스템의 모션은 상태 변화·공간 이동·직접 조작 피드백 목적에만 사용해야 하며(SHALL), 기본 전환 시간은 150ms~220ms, 큰 화면 진입 모션은 900ms를 넘지 않아야 한다(MUST). `prefers-reduced-motion`에 대응해야 한다(MUST).

#### Scenario: 접근성 설정 사용자
- GIVEN 사용자의 OS가 `prefers-reduced-motion: reduce`를 설정함
- WHEN 화면 전환 애니메이션이 실행됨
- THEN 애니메이션 지속시간이 대폭 단축되거나 생략됨

### Requirement: D-010 반응형
데스크톱은 고정 좌측 내비게이션과 넓은 작업 레일을, 모바일은 하단 내비게이션과 단일 열 콘텐츠를 사용해야 한다(SHALL). 모바일에서 카드/입력의 가로 스크롤은 발생해서는 안 된다(SHALL NOT). 터치 대상 최소 높이는 44px여야 한다(MUST).

#### Scenario: 360px 폭 모바일 화면
- GIVEN 화면 폭이 360px인 모바일 기기
- WHEN 아무 작업 화면이나 렌더링됨
- THEN 가로 스크롤이 발생하지 않음
- AND 보조 사이드바가 표시되지 않음

### Requirement: 화면별 계약
Tasks/Calendar는 `PageHeader > TodoSummaryBar > TodoList` 구조와 `priority.ts`/`priorityAccent` 기반 우선순위 표현만 사용해야 한다(SHALL). Papers/Concepts는 동일한 읽기 레일과 `PageEmptyIntro` 빈 화면을 공유해야 한다(SHALL). Translate/Models는 동일한 분석 레일과 입력 중심 구조를 공유해야 한다(SHALL). Marketing 화면은 실제 제품의 내비게이션과 화면 구조를 축약해 표현해야 하며(SHALL), 제품에 없는 가상 인터페이스를 표현해서는 안 된다(SHALL NOT).

#### Scenario: Models 페이지 최근 분석
- GIVEN 사용자가 이전에 분석한 기록이 있음
- WHEN Models 페이지를 다시 방문함
- THEN 최근 분석 기록이 상시 대형으로 노출되지 않음
- AND 안내 카드(`PageGuide`/`PageEmptyIntro`)는 유지됨

### Requirement: 접근성과 콘텐츠
화면에 보이는 모든 문자열은 `frontend/src/shared/i18n/`에서 관리해야 하며(SHALL), 한국어·영어·중국어 키를 동시에 추가해야 한다(SHALL). 색상만으로 선택·오류·우선순위를 표현해서는 안 된다(SHALL NOT).

#### Scenario: 새 UI 문자열 추가
- GIVEN 새 버튼 라벨을 추가함
- WHEN i18n 키를 등록함
- THEN en/ko/zh 로케일 파일 세 곳 모두에 동일 키가 존재함

## Notes (프로세스, 시스템 동작 아님)

**완료 기준**: 공유 컴포넌트 재사용 검토, 하드코딩 없음, 같은 계열 레일 일치, 360px/1280px 확인, 로딩/오류/빈/결과 상태 확인, en/ko/zh 레이아웃 유지, `prefers-reduced-motion` 대응, `cd frontend && npm run build` 성공, 관련 문서·TODO.md 갱신.

**변경 절차**: 기존 결정 번호·공유 컴포넌트 확인 → 기존 규칙으로 해결 가능하면 코드만 수정 → 신규 패턴이 필요하면 이 스펙을 먼저 수정하고 `docs/proposal.md` 변경이력에 기록 → 신규 토큰보다 기존 토큰 조합 우선 → 대표 화면 1개 검증 후 같은 계열 적용 → 빌드·문서 검사 통과 후 커밋.

**예외 기록**: 기존 결정(D-번호)을 적용할 수 없는 경우, 대상/기존 결정/예외 사유/범위/종료 조건을 명시한 예외 기록(E-001 형식)을 남긴다. 예외 번호 없는 페이지 전용 규칙 추가는 금지. 같은 예외가 2건 이상 반복되면 공통 결정 승격을 검토한다.
