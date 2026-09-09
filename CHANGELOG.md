# Changelog

본 Changelog는 git 커밋 이력을 기반으로 재구성. 버전 구분은 `frontend/package.json`의 `version` 필드 변경 시점만을 기준으로 함.

> **참고 (정확성 관련 특이사항)**
> - 저장소 전체 224개 커밋 중 `frontend/package.json`의 `version` 값이 실제로 바뀐 적은 **단 1회**입니다 (`0.1.0` → `2.3.0`, 커밋 `0e05965`, 2026-06-03). 이후 오늘(2026-09-06)까지 3개월·160여 개 커밋 동안 `version` 필드는 `2.3.0`에서 전혀 변경되지 않았습니다.
> - 커밋 `e954e2f`(2026-06-03)와 `5c02a3c`는 커밋 메시지에 각각 `(v2.4.0)`, `(v2.4.1)`을 표기하고 있으나, 두 커밋 모두 `frontend/package.json`을 수정하지 않았습니다. 즉 이 표기는 실제 배포 버전과 무관한 커밋 메시지상의 기록으로 보이며, 아래 버전 구분에는 반영하지 않았습니다.
> - 초기 62개 커밋 중 30개는 커밋 메시지가 `Edit` 한 단어뿐이라 내용 분류가 불가능합니다. Misc 항목에 묶어 표기했습니다.

## [2.3.0] - 2026-06-03 ~ 현재 (버전 미변경, 진행 중)

커밋 `0e05965`(스키마 통합·버전 관리 툴링 추가, v2.3.0 표기 시작)부터 HEAD (Head Commit)인 `9fc57b7`까지. 도메인 인증 전환, Contextor 신규 서브앱 추가, 타임블로킹 캘린더, PWA (Progressive Web App) 전환, 라우팅/네비게이션 전면 개편, 디자인 시스템 정비 등 프로젝트의 사실상 대부분의 기능 개발이 위 커밋 구간에서 진행.

### Added
- 프론트엔드 라우팅에 `/:username/` prefix 추가, 확장앱 아이콘 적용
- 확장앱 "웹에서 열기" 버튼에 `/api/me` 기반 username 경로 적용
- Contextor 앱 신규 추가, `arch-trainer` > `model-review` 경로 변경, 번역기 정리
- Todo 메모 줄바꿈 렌더링, 메모 수정 시 AI 단계 자동 재생성
- Todo 완료 토글 옵티미스틱 업데이트, 메모 수정 시 스텝 재생성
- 타임블로킹 캘린더·주간 리뷰·마감일 알림 스케줄러 추가
- Contextor Chrome 확장앱 추가 (Alt+C 단축키)
- `ai_provider.py` 추가 및 적용 (Claude/Gemini 프로바이더 추상화)
- 반응형 메뉴 디자인 추가
- veloo를 Progressive Web App으로 전환
- Todo 리스트-상세 화면 간 스와이프 백 제스처 지원
- Todo·Paper·Contextor·번역기 등에 다국어 빈 상태(empty-state) 가이드 추가
- 완료된 Todo 기본 접힘 처리, 빈 상태 가이드, 리사이즈 드래그 방향 수정
- 전체 UI 문자열 i18n 커버리지 완성
- release-pipeline 하네스 추가, 오래된 bump.py 참조 수정
- 공개 랜딩 페이지, 회원가입 플로우, username 유효성 검증 추가
- Shell을 URL 기반 라우팅(사이드바/모바일 내비 분리)으로 전환
- 모바일 독에 Heroicons 적용 (선택 상태별 outline/solid)
- Todo 우측 사이드바·초기 포커스, 개요 대시보드, 앱 소개 대시보드 복원 (3건)

### Fixed
- `analyzePdf`를 popup.js로 이동해 httpOnly 쿠키 전송 문제 해결
- Todo 생성/조회에 `user_id` 적용 — 500 에러 수정
- 디자인/버튼 크기 조정 관련 소규모 수정 다수 (`fix: 디자인 조정` 2건, `fix: 버튼 크기 수정` 3건, `fix: 네비게이션바 디자인 수정`)
- DB 조회 버그 수정
- iOS Safari 접속 타임아웃을 유발하던 PWA 정적 파일 서빙 수정, vitePWA 설정 수정
- 배포 스크립트 수정, `analyze_paper` Gemini 설정 버그 수정
- 히스토리 추가 안되는 버그, pull 병합 문제 수정
- Gemini smart-tier 기본 모델명을 GA (General Availability) 버전으로 수정
- iOS 입력창 확대(zoom-on-focus)·hover tap-trap 방지
- 오늘 필터를 마감일 기준으로 통일(주간 필터와 일치)
- FEEDBACK_PROMPT (Feedback Prompt Template) 포맷 템플릿의 JSON 중괄호 이스케이프 처리
- 언어 프로바이더로 앱 전체 래핑, 로그인 화면 "Veloo" 표기 복원
- Todo 대시보드를 기본 상세 뷰로 복원
- 무한 루프를 유발하던 Stop 훅 제거
- 캘린더 셸(cal-shell) 상단 중복 패딩 제거
- model-review `/api/feedback` 500 에러 해결 (max_tokens, 빈 AI 응답, 스키마 문제)
- Todo 행 접근성(a11y) 복원, NavFilter 라벨 중복 제거, 폴링 타이머 정리
- AI JSON 파싱 하드닝(태그 누출 방지), 출력 계약 중복 제거
- 모바일 독 드래그 제스처를 브라우저가 취소하는 문제 방지
- 버그 수정 다수 (`fix: bug fixes`, 상세 미기재)

### Changed
- 번역기 프롬프트 단일화 + 단어 번역 지원 추가
- Contextor / arch_trainer 프롬프트를 XML 구조로 재정리, 응답 스키마 개선
- 프론트엔드 폴더 구조를 type-based > feature-based로 재편
- 백엔드 Supabase 초기화를 `backend/database.py`로 단일화
- `main.py` 인증 로직을 `backend/auth.py`로 분리
- 메인 페이지 라우팅을 사이드바 단일 SPA (Single Page Application) 구조로 전환
- Todo 프롬프트 반복 수정(제약 조건, 스텝 단순화·목적 변경 등, 4건)
- 스텝 재생성 시 기존 스텝 삭제 후 재생성
- Contextor 검색 속도 개선
- Todo 필터 위치를 리스트 상단으로 이동
- Todo 마감일 입력을 텍스트 입력 > 달력 선택으로 변경, 시작일-마감일 코드 제거
- 백엔드 폴더 구조 정리, `setup-veloo-linux.sh`를 `setup-nginx-https.sh`로 재작성
- Todo 탭 UX 단순화(인라인 편집·AI 전략 제거), Todo AI 단계 프롬프트를 메모 기반으로 개선
- paper_analyzer 프롬프트에 출력 스키마 태그 추가
- Todo 타이포그래피를 디자인 토큰으로 통일
- 디자인/네비게이션 전면 개편: 헤더 드롭다운화, 모노크롬 팔레트 통일, 독(dock) 재설계(pill dock, iOS 26 스펙 마진/사이징, 아이콘 크기, 유리 하이라이트, 인디케이터 애니메이션·색상 스코프 등 다수 반복 조정)
- 브랜드 컬러를 그린으로 리프레시, 그린 액센트 토큰 서브앱 전체 적용 및 채도 조정
- Shell 내비게이션을 플랫 앱 리스트로 단순화, 모바일 플랜 스위처 추가
- 서브앱 인트로/빈 상태 레이아웃 다듬기, model-review 내비 라벨 변경
- 캘린더 우선순위 색상 공유 토큰화
- Todo 2단 레이아웃, 유저 메뉴 팝오버 도입
- 디자인 토큰 통합, Papers 페이지 정비 및 레일 정렬 수정, 결과 패딩 위치 조정

### Removed
- 프론트엔드에서만 쓰이던 앱 2개 삭제 (백엔드 기능은 유지)
- Todo 캘린더·주간 리뷰 버튼 임시 삭제(주석 처리, 데스크톱/모바일 각각)
- `AppHeader` 컴포넌트 삭제

### Docs
- README 한국어 전면 재작성 및 재정리(총 3회), 배포 방식 반영
- CLAUDE.md를 레포 루트로 이동, 서브앱 문서 동기화(2회), 브랜치 전략을 main 단일화로 문서화
- 프로젝트 성격을 "개인 연구 허브(랩 공용 아님)"로 명확화하는 문서 수정
- Liquid Glass 리서치 노트, 디자인 시스템 문서, 캡슐 독 스펙 문서 추가 및 갱신(아이콘 사이즈 동기화 등)
- 릴리즈 하네스 문서화, 2026-08-24 배포 모니터 리포트 아카이브
- 프론트엔드 npm 빌드 관련 "하지 말 것" 규칙 추가, 문서 표 재포맷

### Chore
- CLAUDE.md 통합, 브랜치 전략 수립(dev 단일화 > 이후 main 단일화로 재변경), `bump.py` 관련 작업(양방향 업데이트 > 이후 참조 제거)
- 확장앱 배포 워크플로우 추가 후 미사용 Chrome 확장/워크플로우 제거
- `.claude` 커맨드 구조를 스킬 구조로 정리, `settings.json` 추가
- 설정 스크립트를 `scripts/`로 이동(2회), `generate_i18n.py`를 `scripts/`로 이동
- 중복 i18n 키(`weekDaysLabel`) 제거, 로컬 디자인 참고 영상/프레임 gitignore 처리
- `frontend-design` 에이전트 추가, AI 모델 설정 수정(2회), 각종 폴더명 정리

### Misc
- `임시 테스트`, `테스트 완료` (내용 미상, 접두어 없음)
- `prompt.md 제외` (gitignore 성격으로 추정)
- `wip: Veloo workspace/캘린더 리디자인 복원` (작업 중 커밋)
- 위 [2.3.0] 구간에는 dev 브랜치 병합에 따른 Merge 커밋 다수 포함(총 14건), 실제 변경 내용은 위 항목들에 이미 반영되어 있어 별도 나열하지 않음

## [0.1.0] - 2026-04-28 ~ 2026-05-26

최초 커밋(`061b521`)부터 `2.3.0`으로 버전이 바뀌기 직전 마지막 상태(`f9ec5d6`)까지. 총 62개 커밋. 초기 프로젝트명은 `lab-toolkit`이었으며, 해당 구간 후반부에 `veloo`로 개명.

### Added
- 라우팅별 브라우저 탭 제목 동적 업데이트
- 번역기 UI 개선, 네이버 사전 파싱 교체, 프롬프트 Context Engineering 적용
- 번역기 레이아웃 개선 및 사전 기능 고도화
- Todo 추가 시 AI 단계·전략 자동 생성 및 프롬프트 고도화
- 네이버 사전 폴백 파서 추가, Anthropic SDK 업그레이드
- 사전 패널 전면 개편 — 발음 오디오·동의어·품사 그룹핑 추가
- 앱 이름을 veloo로 변경, V 레터마크 favicon 추가
- 히스토리·캐시 기능 추가, 번역기 UX 개선
- Home 대시보드 재설계(오늘 할 일 + 최근 활동 2열 레이아웃)
- Home 대시보드 전면 개편(앱 카드 그리드 + 누적 횟수)
- username/password 인증 시스템 전환, 홈 대시보드 전면 개편
- 번역기 단어 모드에 네이버 사전 인라인 표시 추가
- 모바일 대응 — Todo 모달 반응형 크기 조정, 추가 버튼 위치 변경

### Fixed
- 보안 강화 및 비동기 처리 개선
- 미인증 API 요청 시 HTML 반환 및 `res.ok` 체크 누락 수정
- 세션 만료 시 401 반환 및 API 오류 처리 개선
- `todo.steps` undefined로 인한 TypeError 수정
- 네이버 사전 검색 결과 없을 때 TypeError 수정
- 네이버 사전 파싱 개선 및 검색창 너비 수정
- SSH 배포 스크립트 서버 경로를 절대경로로 수정
- favicon.svg 라우트 추가, 인증 미들웨어 bypass 처리

### Changed
- design.md 준수 및 paper_analyzer 관련성 필드 추가
- 번역 패널 자동 확장, 언어 탭 underline, 검색바 너비 조정
- 번역기 레이아웃을 구글 번역 구조로 재정렬
- 다크모드 제거 및 페이지 타이틀 한국어 통일
- 홈 히어로 텍스트를 한국어로 간결하게 수정
- 홈 및 로그인 페이지 리디자인 (접두어 없음)

### Docs
- README를 veloo로 업데이트, 배포 방식 반영

### Chore / CI
- Fly.io에서 SSH 서버 배포로 전환
- deploy 스크립트에 nginx·cloudflared 재시작 및 상태 확인 추가
- 중복 `requirements.txt` 제거, `.dockerignore` 최적화
- 익스텐션 서버 URL을 veloo.page로 업데이트

### Misc (초기 개발 구간, 버전 관리 이전 — 커밋 메시지가 "Edit" 한 단어뿐이라 내용 분류 불가)
- `061b521`, `b6c48ee`, `57bcdd8`, `925f1e0`, `818e040`, `d9b6d90`, `5fe7256`, `a2252a7`, `98357e3`, `4e2ddf0`, `486c734`, `6ce7a09`, `bbbb125`, `da3d813`, `97d414e`, `3772f8e`, `8769d76`, `c6b6aad`, `2f0ea3b`, `5e2ff18`, `943d876`, `b82d229`, `ad7803d`, `0fd5d46`, `99ca83e`, `ca2252b`, `034446c`, `666eb26`, `8ff9b73` (총 29건, 커밋 메시지 "Edit")
- `39a5ecf` Merge branch 'main' of https://github.com/jwhitekim/lab-toolkit (병합 커밋, 변경 내용 미상)
