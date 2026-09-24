# veloo — CLAUDE.md

## 프로젝트 개요

개인 연구 허브 (가천대 PRML Lab 소속 연구자가 혼자 쓰는 개인용 도구, 랩 공용 도구 아님).
FastAPI 루트(backend/main.py)가 5개 서브앱을 마운트하는 SPA 구조.
배포: veloo.2joon.com (Docker + Cloudflare Tunnel, GitHub Actions 자동 배포)

## 아키텍처

```
[React Frontend (TypeScript)] → frontend/dist/ (정적 서빙)
[FastAPI Root — backend/main.py]
    ├── /paper        → backend/app/paper_analyzer/
    ├── /translate    → backend/app/translator.py
    ├── /model-review → backend/app/reviwer.py
    ├── /todo         → backend/app/todo/
    └── /contextor    → backend/app/contextor.py
```

## 기술 스택

- Backend: Python 3.11, FastAPI, Uvicorn, Pydantic v2
- Frontend: React 18 + TypeScript + Vite → frontend/dist/
- AI: Anthropic SDK (claude-haiku-4-5 / claude-sonnet-4-6)
- DB: Supabase (전 모듈 히스토리 + 인증)
- 배포: Docker + GitHub Actions SSH → nginx → Cloudflare Tunnel

## 환경변수


| 변수명                  | 사용 모듈                                                           |
| -------------------- | --------------------------------------------------------------- |
| ANTHROPIC_API_KEY    | 전 모듈                                                            |
| SUPABASE_URL         | 전 모듈                                                            |
| SUPABASE_KEY         | 전 모듈                                                            |
| SUPABASE_SERVICE_KEY | 전 모듈                                                            |
| S2_API_KEY           | paper_analyzer                                                  |
| SECURE_COOKIE        | backend/main.py                                                 |
| AI_PROVIDER          | 전 모듈 (backend/app/ai_provider.py, "claude"|"gemini", 기본 claude) |
| GEMINI_API_KEY       | 전 모듈 (AI_PROVIDER=gemini일 때)                                    |


## 프론트엔드 규칙

- 백엔드 호출은 상대경로 사용 (/paper, /translate, /arch-trainer, /todo)
- 별도 baseURL 환경변수 불필요 (동일 origin 서빙)
- 수정 후 npm run build 실행하여 dist/ 갱신
- dist/ 직접 수정 금지

## 공통 코드 규칙

- 환경변수 하드코딩 절대 금지
- 각 서브앱은 FastAPI() 인스턴스로 독립 선언 후 backend/main.py에서 mount
- Pydantic v2 문법 사용
- 임시 파일은 /tmp에 저장, 요청 종료 시 삭제
- AI 호출은 `backend/app/ai_provider.py`(Claude/Gemini 프로바이더 추상화, `AI_PROVIDER` env로 선택)를 통해 수행 — `backend/app/database.py`처럼 서브앱 전용 폴더가 아닌 `backend/app/` 레벨의 공용 모듈. 전 서브앱(paper_analyzer/translator/reviwer/todo/contextor)이 이 프로바이더를 사용
  - `complete(system, user, max_tokens, tier="fast"|"smart", images=[(media_type, bytes), ...])`: 단일턴 완성 응답. `tier`로 CLAUDE_MODEL_FAST/SMART(또는 GEMINI_MODEL_FAST/SMART) 선택, `images`로 멀티모달(이미지) 입력 첨부(reviwer의 `/api/explain`이 사용)
  - `stream(system, user, max_tokens, tier="smart")`: 토큰 단위 스트리밍(async generator). translator의 `/api/translate`가 사용
  - sync 컨텍스트(todo 라우터, paper_analyzer)는 `complete()` 직접 호출, async 컨텍스트(contextor, reviwer)는 `asyncio.to_thread(provider.complete, ...)`로 감싸 이벤트 루프 블로킹 방지
  - GeminiProvider의 스트리밍/이미지 입력 경로는 실제 google-genai SDK로 검증되지 않음 — AI_PROVIDER=gemini로 전환 시 반드시 동작 확인 필요

## 버전 관리

- 버전 소스는 `frontend/package.json`의 `version` 필드 하나뿐 (백엔드에는 버전 문자열 없음)
- "릴리즈해줘"/"배포해줘" 요청은 `release-pipeline` 하네스가 범프→빌드검증→커밋→푸시→배포확인까지 처리 (아래 하네스 섹션 참고)
- 버전 범프는 main 브랜치에서 직접 실행 (별도 브랜치 없음)

## 스키마

- 단일 스키마 파일: backend/schema.sql
- Supabase 마이그레이션은 대시보드에서 직접 실행

## 서브앱 상세

### paper_analyzer (`/paper`)

논문 검색·분석. PDF 업로드 또는 제목/URL 검색 → Semantic Scholar로 메타데이터·저자 조회 → Claude로 요약 → SJR 저널 품질 조회.

- 구조: `backend/app/paper_analyzer/api.py`(엔드포인트) / `core/semantic_scholar.py`(검색·저자 enrich) / `core/claude_analyzer.py`(요약) / `core/journal_quality.py`(`data/scimagojr 2025.csv` 기반 SJR 조회) / `core/pdf_extractor.py`(PDF에서 제목·초록·DOI·arXiv ID·그림 추출) / `data/venue_aliases.json`(저널명 별칭)
- 엔드포인트: `GET /history`, `POST /search`, `POST /analyze`(paper_id 또는 url), `POST /analyze-pdf`(최대 50MB)
- `__init__.py`가 `core/`를 flat import 하도록 `sys.path`에 추가 — `core.xxx`로 임포트
- `S2_API_KEY`로 Semantic Scholar 레이트리밋 완화, Supabase 미설정 시 히스토리/캐시는 조용히 비활성화

### translator (`/translate`)

ML/DL/CV/NLP 논문 문장·구·용어를 자연스러운 한국어로 번역하는 스트리밍 API. `backend/app/translator.py` 단일 파일 (폴더 없음).

- 엔드포인트: `POST /api/translate`(스트리밍, Supabase `translation_history` 캐시 히트 시 `X-Cache: HIT`), `GET /api/history`
- 번역 규칙(수식·고유명사 보존, 특정 용어 영어 유지 등)은 `translator.py`의 `_SYSTEM` 프롬프트에 하드코딩 — 톤/규칙 수정 시 여기를 고칠 것
- `CLAUDE_MODEL_SMART`로 모델 오버라이드(기본 `claude-sonnet-4-6`)

### arch_trainer / reviwer (`/model-review`)

논문 아키텍처 그림을 보고 스스로 설명하는 연습 → Claude가 기준 설명 생성, 사용자 설명을 채점/교정. `backend/app/reviwer.py` 단일 파일 (폴더 없음, 파일명 오탈자 "reviwer" 그대로 사용 중).

- 엔드포인트: `POST /api/explain`(이미지 업로드, 최대 10MB → JSON 스키마 설명 생성, Supabase `arch_history` 저장), `POST /api/feedback`(사용자 설명 채점), `GET /api/history`
- Claude 응답은 JSON만 나오도록 프롬프트로 강제, `_parse_json`이 코드펜스 제거 — 스키마 변경 시 파싱 로직도 확인
- `CLAUDE_MODEL_SMART`로 모델 오버라이드

### todo (`/todo`)

연구 할 일/단계/우선순위, AI 기반 단계 분해·전략 제안, 주간 리뷰, 마감일 리마인드 이메일.

- 구조: `backend/app/todo/api.py`(라우터 include) / `core/routers/{todos,steps,ai,reviews}.py` / `core/scheduler.py`(리마인드 이메일, `SMTP_USER` 설정 시에만 시작) / `core/email_sender.py` / `core/schemas.py` / `core/research_todo.db`(로컬 SQLite, gitignore 대상)
- 엔드포인트: `/api/todos`(CRUD, `/calendar` 목록, `/{id}/done`, `/{id}/steps`), `/api/steps/{id}`(CRUD, `/done`), `/api/ai/generate-steps`·`/generate-steps-async`·`/generate-strategy`, `/api/reviews/weekly`, `/health`
- `__init__.py`가 `core/`를 flat import 하도록 `sys.path`에 추가 — `routers.xxx`, `database`, `schemas`로 임포트
- 마감일은 달력 UI로 지정(텍스트 입력 아님). `frontend/src/features/calendar/`(타임블로킹 캘린더·주간 리뷰)는 현재 `Shell.tsx`에서 네비게이션이 주석 처리되어 임시 비활성 상태이나 라우팅은 남아 있음

### contextor (`/contextor`)

영어 단어/짧은 구를 ML/DL 논문 맥락별 의미로 구조화된 JSON으로 설명. `backend/app/contextor.py` 단일 파일 (폴더 없음).

- 엔드포인트: `POST /api/lookup`(Supabase `contextor_history` 캐시), `GET /api/history`
- 응답 스키마(`hasMlUsage`, `cases[]`, `note`)는 few-shot 프롬프트로 강제, `_extract_json`이 코드펜스 유무와 무관하게 JSON만 추출
- 다른 서브앱과 달리 `CLAUDE_MODEL_FAST`(기본 `claude-haiku-4-5-20251001`)가 기본 — 응답 속도 우선
- Supabase 클라이언트를 `backend.app.database.get_supabase()`가 아니라 `contextor.py` 내부에서 직접 생성 (다른 서브앱과의 사소한 불일치, 동작엔 문제 없음)

## 브랜치 전략

- main만 사용. 1인 개발이므로 브랜치 분리 없이 main에 직접 커밋·푸시.
- dev 브랜치는 사용하지 않음 (과거 운영되다 방치되어 폐기됨).

## 작업 흐름

1. main에서 작업 후 commit-and-push 스킬로 커밋/푸시
2. 버전을 올려 배포까지 할 때는 아래 "하네스: 릴리즈/배포 파이프라인" 참고
3. 푸시 시 GitHub Actions 자동 배포

## 하네스: 릴리즈/배포 파이프라인

**목표:** 버전 범프 → 프론트엔드 빌드 검증 → 커밋 → 사람 승인 후 main 푸시 → GitHub Actions 배포 감시 → 프로덕션 스모크 테스트까지 한 흐름으로 자동화.

**트리거:** "릴리즈해줘", "배포해줘", "버전 올리고 배포" 등 릴리즈 요청 시 `release-pipeline` 스킬을 사용하라 (에이전트: `release-preparer`, `deploy-monitor`). 단순 커밋/푸시만 필요하면 `commit-and-push` 스킬을 직접 쓴다.

**변경 이력:**


| 날짜         | 변경 내용                                                       | 대상                             | 사유                                   |
| ---------- | ----------------------------------------------------------- | ------------------------------ | ------------------------------------ |
| 2026-08-24 | 초기 구성 (release-preparer, deploy-monitor, release-pipeline)  | 전체                             | 릴리즈/배포 과정 자동화 요청                     |
| 2026-08-24 | commit-and-push 검증 명령을 pytest/mypy/ruff → npm run build로 수정 | .claude/skills/commit-and-push | 이 프로젝트에 없는 도구를 참조하고 있어 실제 실행 불가 상태였음 |
| 2026-08-24 | Makefile의 `make bump` 타깃 제거                                 | Makefile                       | 참조하던 bump.py가 이미 삭제되어 죽은 타깃이었음       |


## 자기 갱신 규칙

- 레포 루트의 이 CLAUDE.md 하나만 맥락 문서로 참고함 — 서브앱별 CLAUDE.md는 만들지 않음
- 새 모듈/파일 추가 시 이 파일 갱신
- 환경변수 추가 시 위 목록에 추가
- API 엔드포인트 변경 시 이 파일의 해당 서브앱 항목에 반영


## 하지말 것
- 매번 프론트엔드 코드 작성 후 npm 빌드는 하지말 것 


# 작업 관리 규칙 (todo-guard)

## TODO.md 운영

- 사용자의 모든 지시는 즉시 TODO.md 「진행 중」에 `- [ ]` 로 등록한다. 등록 없이 착수 금지
- 항목을 마치면 `- [x]` 로 바꾸고 「완료」로 옮긴다. 실제로 끝나지 않은 것을 완료 처리하지 않는다
- 사용자 판단이 필요해 진행 불가한 항목만 `- [?] 항목명 (사유)` 로 둔다

## 문서 규칙

슬라이드·보고서(`.pptx` `.pdf` `.doc` `.txt` `.hwp` `.md`)를 만들 때는
`~/.claude/skills/todo-guard/rules/doc-rules.md` 를 **쓰기 전에 읽고** 적용한다.

턴을 끝낼 때 바뀐 줄을 자동 검사한다. 위반이 있으면 종료가 막힌다.

| 사용자가 말하면 | 실행 |
|---|---|
| 전체 검수해줘 | `python ~/.claude/skills/todo-guard/scripts/doc-guard.py --all` |
| 바뀐 것만 검수해줘 | `python ~/.claude/skills/todo-guard/scripts/doc-guard.py --changed` |
| 문서 규칙 꺼줘 / 켜줘 | `bash ~/.claude/skills/todo-guard/scripts/doc-toggle.sh off｜on` |
