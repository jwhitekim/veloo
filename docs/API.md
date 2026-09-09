# Veloo API 명세서

FastAPI 루트(`backend/main.py`)가 5개 서브앱을 서로 다른 prefix에 mount하고, 인증 라우터는 prefix 없이 루트에 직접 포함되는 구조. 실제 라우터 코드(`@app.get/post/...`, `@router.get/post/...`)와 Pydantic 모델을 근거로 각 엔드포인트의 request/response를 정리.

## 실제 마운트 prefix

| 서브앱 | 코드 위치 | mount prefix |
|---|---|---|
| Auth | `backend/app/auth.py` (root에 `include_router`, prefix 없음) | 없음 (`/register`, `/login`, `/logout`, `/api/me`) |
| Paper Analyzer | `backend/app/paper_analyzer/` | `/paper` |
| Translator | `backend/app/translator.py` | `/translate` |
| Model Review | `backend/app/reviwer.py` (파일명 오탈자 그대로) | `/model-review` |
| Todo | `backend/app/todo/` | `/todo` |
| Contextor | `backend/app/contextor.py` | `/contextor` |

## 인증 공통 동작

`backend/app/auth.py`의 `AuthMiddleware`(root app에 등록)가 모든 요청을 가로챔.

- OPEN(Open Path) PATHS(Path List) 목록(`_OPEN_PATHS`: `/`, `/login`, `/signup`, `/logout`, `/register`, `/api/me`, 정적 파일 등)와 `/assets/`, `/workbox-` prefix는 인증 없이 통과.
- OPEN PATHS 외의 경로는 `access_token` 쿠키 > Supabase `sessions` 테이블 조회로 세션 유효성을 검사하고, 유효하면 `request.state.user_id`를 세팅.
- 세션이 없거나 만료된 경우: 경로가 `/paper/`, `/translate/`, `/model-review/`, `/todo/`, `/contextor/`로 시작하면 `401 {"error": "세션이 만료됐습니다. 다시 로그인해주세요."}` JSON을 반환하고, 위 prefix 외의 경로는 `/login?redirect=...`로 리다이렉트.
- 즉 아래 모든 서브앱 엔드포인트는 유효한 `access_token` 쿠키가 전제 조건이다(개별 섹션에서 별도로 반복하지 않음).
- Todo 서브앱의 라우터들은 이와 별개로 자체 `_get_user_id` 의존성에서 같은 쿠키로 세션을 다시 조회한다(중복이지만 동작에는 문제 없음).

---

## Paper Analyzer

논문 검색·분석. `backend/app/paper_analyzer/api.py`.

### GET /paper/history

로그인 사용자의 논문 분석 히스토리 조회.

Request (query):
```
count: bool = False   # true면 개수만 반환
```

Response (count=false):
```
{
  "items": [
    {
      "id": int,
      "title": string,
      "paper_id": string | null,
      "query": string | null,
      "created_at": string,
      "result": object   # POST /paper/analyze의 응답 result와 동일 형태
    },
    ...  # 최대 10개, created_at desc
  ]
}
```

Response (count=true): `{"count": int}`

참고: Supabase 미설정 시 `{"count": 0}` 또는 `{"items": []}`을 조용히 반환.

### POST /paper/search

논문 제목 검색 또는 URL 파싱. **JSON이 아니라 form 필드**(`Form(...)`)로 받음.

Request (`multipart/form-data` 또는 `application/x-www-form-urlencoded`):
```
query: string (required)
```

Response — `query`가 `http`로 시작하는 경우:
```
{ "type": "unsupported_url" }
# 또는
{ "type": "url", "query": string }
```

Response — 제목 검색인 경우:
```
{
  "type": "candidates",
  "data": [
    { "paperId": string, "title": string, "year": int | null, "venue": string | null, "citationCount": int | null },
    ...  # 최대 5개
  ]
}
```

에러: 외부 API 오류(권한/레이트리밋) 시 `{"error": string}` + 502, 기타 예외 시 `{"error": "서버 오류가 발생했습니다."}` + 500.

### POST /paper/analyze

`paper_id`(Semantic Scholar ID) 또는 `url` 중 하나로 논문을 조회·분석. **form 필드**(`Form(None)`)로 받음.

Request (`multipart/form-data` 또는 `application/x-www-form-urlencoded`):
```
paper_id: string | null (optional)
url: string | null (optional)
```

Response (캐시 히트 시): 과거 저장된 `result` 그대로 + `"from_cache": true`

Response (신규 분석):
```
{
  "basic": {
    "title": string,
    "year": int | null,
    "venue": string,
    "doi": string | null,
    "arxivId": string | null,
    "citationCount": int | null
  },
  "analysis": {
    # AI(Claude/Gemini) 생성 JSON — Pydantic 강제 아님, 프롬프트 스키마 기준
    "keywords": [string],
    "domain": string,
    "problem_short": string,
    "problem": string,
    "method_short": string,
    "method": string,
    "conclusion_short": string,
    "conclusion": string,
    "relevance": string,      # "높음" | "중간" | "낮음"
    "relevance_reason": string
  },
  "authors": [
    {
      "name": string,
      "authorId": string,
      "hIndex": int | null,
      "citationCount": int | null,
      "topPapers": [ /* Semantic Scholar author API의 papers 원본, title/citationCount/year 필드 포함, 최대 5개 */ ]
    },
    ...  # 최대 3명
  ],
  "quality": {
    # lookup_venue 매치 실패 시 빈 객체 {}
    "matched_title": string,
    "sjr": string,
    "quartile": string,
    "issn": string,
    "type": string,
    "country": string
  }
}
```

에러: `paper_id`/`url` 둘 다 없으면 `{"error": "paper_id 또는 url이 필요합니다."}` — **status_code 지정 없이 반환되어 HTTP 200으로 나감** (코드상 명시적 status_code 인자가 없음). 논문을 못 찾으면 `{"error": "논문을 찾을 수 없습니다."}` 역시 200. 그 외 예외는 500.

### POST /paper/analyze-pdf

PDF 업로드로 분석. `multipart/form-data`.

Request:
```
file: UploadFile (required, PDF)
```

- `content_type`이 `application/pdf`가 아니고 파일명이 `.pdf`로 끝나지도 않으면 400.
- 파일 크기 50MB(`50 * 1024 * 1024` bytes) 초과 시 400.

Response: `POST /paper/analyze`의 응답과 동일한 `basic`/`analysis`/`authors`/`quality` + 아래 `figures` 추가.
```
{
  ...basic, analysis, authors, quality (위와 동일),
  "figures": [
    {
      "page": int,
      "width": int,
      "height": int,
      "caption": string,
      "data": string   # "data:image/png;base64,..." 데이터 URI
    },
    ...  # 최대 3개, PDF 자체 추출 이미지
  ]
}
```

PDF에서 arXiv ID나 DOI(Digital Object Identifier)가 추출되면 Semantic Scholar 재조회로 `basic`/`authors`를 보강하고, 실패 시 PDF 자체 추출값(제목/초록/DOI/arXiv ID)만 사용.

---

## Translator

문장/구/용어 한국어 번역 스트리밍 API. `backend/app/translator.py` (폴더 없는 단일 파일).

### POST /translate/api/translate

Request (JSON, `TranslateRequest`):
```
{ "text": string }
```

Response: **스트리밍**(`StreamingResponse`, `media_type: text/plain; charset=utf-8`). JSON이 아니라 번역된 텍스트 토큰이 순차적으로 내려옴.

- HIT(Cache Hit) 상태(Supabase `translation_history`에 동일 `user_id`+`source_text` 존재)면 응답 헤더 `X-Cache: HIT`와 함께 캐시된 번역 전체를 단일 청크로 전송.
- 캐시 미스 시: AI provider의 `stream()`을 그대로 프록시하여 토큰 단위로 전송, 완료 후 Supabase에 저장(`type`은 공백 기준 단어 1개면 `"word"`, 아니면 `"sentence"`).
- 스트림 도중 오류가 발생했고 응답 전송 전이면 한국어 에러 문구를 스트림으로 전송(HTTP status는 200 그대로, 별도 에러 JSON이 아님).
- `text`가 빈 문자열이면 `{"error": "텍스트가 비어 있습니다."}` + 400 (이 경우만 JSON).

### GET /translate/api/history

Request (query): `count: bool = False`

Response (count=false):
```
{
  "items": [
    { "id": int, "source_text": string, "translated_text": string, "type": "word" | "sentence", "created_at": string },
    ...  # 최대 10개
  ]
}
```
Response (count=true): `{"count": int}`

---

## Model Review

논문 아키텍처 그림 설명 훈련. `backend/app/reviwer.py` (파일명 오탈자 "reviwer" 그대로, mount prefix는 `/model-review`).

### POST /model-review/api/explain

아키텍처 이미지를 업로드하면 AI가 기준 설명(JSON)을 생성. `multipart/form-data`.

Request:
```
image: UploadFile (required)
```

- 허용 `content_type`: `image/jpeg`, `image/png`, `image/gif`, `image/webp` — 아니면 400.
- 이미지 크기 10MB(`10 * 1024 * 1024` bytes) 초과 시 400.

Response:
```
{
  "explanation": {
    # AI 생성 JSON — 프롬프트 스키마 기준, Pydantic 강제 아님
    "overview": string,
    "modules": [ { "name": string, "role": string, "operation": string } ],
    "data_flow": [ { "step": int, "description": string } ],
    "contribution": string,
    "uncertain_parts": [string]
  },
  "history_id": int | null   # Supabase 저장 성공 시 arch_history.id, 미설정/실패 시 null
}
```

에러: JSON 파싱 실패 등 내부 오류 시 `{"error": "서버 오류가 발생했습니다."}` + 500.

### POST /model-review/api/feedback

사용자가 작성한 설명을 기준 설명과 비교해 채점.

Request (JSON, `FeedbackRequest`):
```
{
  "ai_explanation": object,          # POST /api/explain의 explanation 객체
  "user_explanation": string,
  "history_id": int | null (optional)
}
```

Response:
```
{
  "feedback": {
    # AI 생성 JSON — 프롬프트 스키마 기준
    "correct": [string],
    "missing": [string],
    "incorrect": [string],
    "suggestion": string
  }
}
```

`history_id`가 주어지고 Supabase가 설정돼 있으면 `arch_history` 레코드에 `feedback`을 update.

### GET /model-review/api/history

Request (query): `count: bool = False`

Response (count=false):
```
{
  "items": [
    { "id": int, "image_name": string | null, "explanation": object, "created_at": string },
    ...  # 최대 5개 (다른 서브앱의 history는 대부분 10개 제한, 여기만 5개)
  ]
}
```
Response (count=true): `{"count": int}`

---

## Todo

연구 할 일/단계/우선순위, AI 단계 분해, 주간 리뷰. `backend/app/todo/`.

Todo 서브앱은 Supabase가 설정돼 있지 않으면 라우터들이 `Depends(get_supabase)`로 주입받은 `None` 클라이언트에 바로 메서드를 호출하게 되어 있어(다른 서브앱과 달리 존재 체크 없음) 정상 동작하지 않는다 — 사실상 Supabase 설정을 전제로 함.

### GET /todo/health

```
{ "status": "ok" }
```

### GET /todo/api/todos

Request (query):
```
filter: string | null (optional)   # "week" | "memo" | "today" | 지정한 값 외 또는 생략 시 전체
```

Response: `TodoOut` 배열(아래 스키마).

`TodoOut` (응답 공통 스키마):
```
{
  "id": int,
  "name": string,
  "memo": string,
  "priority": string,
  "deadline": string,
  "done": bool,
  "ai_strategy": string,        # 프론트엔드 미사용, 남아있는 필드
  "created_at": datetime,
  "updated_at": datetime,
  "steps": [ StepOut, ... ],
  "start_time": datetime | null,
  "end_time": datetime | null,
  "remind_at": datetime | null,
  "reminded": bool,
  "completed_at": datetime | null
}
```

`StepOut`:
```
{ "id": int, "todo_id": int, "text": string, "done": bool, "order_index": int }
```

### GET /todo/api/todos/calendar

Request (query, 둘 다 필수):
```
start: string
end: string
```
`start_time` 기준 범위 조회(`gte(start).lte(end)`). Response: `TodoOut` 배열.

### GET /todo/api/todos/{todo_id}

Response: `TodoOut`. 존재하지 않으면 404.

### POST /todo/api/todos

Request (JSON, `TodoCreate`):
```
{
  "name": string (required),
  "memo": string = "",
  "priority": string = "normal",
  "deadline": string = ""
}
```

Response: `TodoOut` (`steps: []`).

### PATCH (Partial Update) /todo/api/todos/{todo_id}

Request (JSON, `TodoUpdate`, 모든 필드 optional, 전달된 필드만 반영):
```
{
  "name": string,
  "memo": string,
  "priority": string,
  "deadline": string,
  "done": bool,
  "ai_strategy": string,        # 현재 호출하는 프론트엔드 없음, 되살리기 쉽게 유지 중인 필드
  "start_time": datetime,
  "end_time": datetime,
  "remind_at": datetime
}
```

Response: `TodoOut`.

참고: `start_time`을 명시적으로 보내면 `reminded`가 `false`로 리셋되고, `remind_at`을 같이 안 보냈다면 `start_time - 30분`으로 자동 계산된다. `start_time`을 명시적으로 `null`로 보내면 `remind_at`도 `null`로 초기화된다(캘린더 배정 해제 용도).

### DELETE /todo/api/todos/{todo_id}

Response: `{"ok": true}`

### PATCH /todo/api/todos/{todo_id}/done

`done` 값을 토글. Response: `TodoOut`. 대상 없으면 404.

### POST /todo/api/todos/{todo_id}/steps

Request (JSON, `StepCreate`):
```
{ "text": string (required), "done": bool = false, "order_index": int = 0 }
```

Response: `StepOut`.

### PATCH /todo/api/steps/{step_id}

Request (JSON, `StepUpdate`, optional 필드만 반영 — `exclude_none`):
```
{ "text": string, "done": bool, "order_index": int }
```

Response: `StepOut`. 대상 없으면 404.

### PATCH /todo/api/steps/{step_id}/done

`done` 값을 토글. Response: `StepOut`.

### DELETE /todo/api/steps/{step_id}

Response: `{"ok": true}`

### POST /todo/api/ai/generate-steps

TODO를 3~4개의 실행 단계로 분해(AI, 동기 호출).

Request (JSON, `GenerateStepsRequest`):
```
{
  "todo_id": int | null (optional),
  "todo_name": string (required, max 200자),
  "memo": string = "" (max 1000자),
  "priority": "urgent" | "mid" | "normal" = "normal",
  "deadline": string = "" (max 100자)
}
```

Response: AI가 생성한 JSON을 그대로 파싱해 반환(Pydantic 강제 아님, 프롬프트 스키마 기준):
```
{ "steps": [string, ...] }   # 3~4개를 요청하지만 실제로는 AI 출력에 의존
```

에러: AI 응답이 유효한 JSON이 아니면 `500 {"detail": "AI returned invalid JSON: ..."}`.

### POST /todo/api/ai/generate-steps-async

동일한 단계 분해를 백그라운드 태스크로 실행해 DB(`steps` 테이블)에 바로 기록.

Request: `GenerateStepsRequest`와 동일하되 **`todo_id` 필수**(없으면 422).

Response (즉시): `{"status": "generating"}` — 완료 여부는 별도로 폴링해야 함(예: 해당 todo의 steps 재조회).

### POST /todo/api/ai/generate-strategy

TODO 하나의 우선순위 조언 한 문장을 생성해 `ai_strategy` 필드에 저장.

> 2026-09-01부로 프론트엔드 AI 전략 UI가 제거되어 현재 이 엔드포인트를 호출하는 프론트엔드 코드는 없음(다시 쓰기 쉽도록 의도적으로 남겨둔 상태).

Request (JSON, `GenerateStrategyRequest`):
```
{ "todo_id": int }
```

Response: 업데이트된 todo 레코드(`TodoOut`과 동일한 형태, steps 포함). 대상 없으면 404.

### GET /todo/api/reviews/weekly

Request (query):
```
week_start: string (required, ISO(International Organization for Standardization) 8601)
```

Response:
```
{
  "week_start": string,           # ISO 8601, week_start를 KST 기준으로 정규화
  "week_end": string,              # week_start + 7일
  "completed": int,
  "created": int,
  "completion_rate": number,       # round(completed/created, 3), created=0이면 0.0
  "overdue": [
    { "id": int, "name": string, "priority": string, "done": bool, "created_at": string, "completed_at": string | null, "deadline": string }
  ],
  "by_priority": {
    "urgent": { "done": int, "todo": int },
    "mid":    { "done": int, "todo": int },
    "normal": { "done": int, "todo": int }
  }
}
```

에러: `week_start` 파싱 실패 시 `400 {"detail": "week_start 형식 오류 (ISO 8601)"}`.

---

## Contextor

영어 단어/구를 ML(Machine Learning)/DL(Deep Learning) 맥락별 의미로 설명. `backend/app/contextor.py` (폴더 없는 단일 파일).

### POST /contextor/api/lookup

Request (JSON, `LookupRequest`):
```
{ "text": string }
```

Response(캐시 히트 또는 AI 생성, 동일 스키마 — 프롬프트로 강제, Pydantic 아님):
```
{
  "query": string,
  "hasMlUsage": bool,
  "cases": [
    { "label": string, "term": string, "meaning": string, "exampleEn": string, "exampleKo": string }
  ],   # 최대 5개
  "note": string   # 특수 용법 없을 때만 사용
}
```

에러: `text`가 빈 문자열이면 `{"error": "단어가 비어 있습니다."}` + 400. AI 조회/파싱 실패 시 `{"error": "조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}` + 502.

### GET /contextor/api/history

Request (query): `count: bool = False`

Response (count=false):
```
{
  "items": [
    { "id": int, "query": string, "result": object, "created_at": string },
    ...  # 최대 10개
  ]
}
```
Response (count=true): `{"count": int}`

---

## Auth

로그인/회원가입/세션. `backend/app/auth.py`, root app에 prefix 없이 직접 포함(`app.include_router(auth_router)`).

### POST /register

Request (JSON, `RegisterRequest`):
```
{ "username": string, "password": string }
```

검증 규칙:
- `username`은 소문자로 정규화 후 `^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$` 패턴(영문 소문자/숫자/하이픈, 실질적으로 3~30자) 위반 시 400.
- 예약어(`RESERVED_USERNAMES`: admin, api, assets, contextor, login, logout, model-review, paper, pricing, register, settings, signup, todo, translate) 사용 시 400.
- `password`는 8자 미만이면 400.
- 이미 존재하는 username이면 409.

Response: `{"ok": true, "message": "승인 대기 중입니다."}` — 가입 즉시 사용 불가, `users.is_approved`가 별도로 승인돼야 함(승인 경로는 코드상 미확인 — 대시보드 등 외부에서 처리하는 것으로 추정).

### POST /login

Request (JSON, `LoginRequest`):
```
{ "username": string, "password": string }
```

- IP 기준 15분 내 5회 실패 시 429(`_is_rate_limited`).
- 계정 없음/비밀번호 불일치: 401.
- `is_approved`가 false: 403.

Response(성공): `{"ok": true}` + `Set-Cookie: access_token=...`(httponly, samesite=lax, max_age 30일, SECURE(Secure) COOKIE(Cookie) 관련 환경변수 `SECURE_COOKIE` 값 또는 요청 스킴으로 `secure` 플래그 결정).

### DELETE /logout

쿠키의 `access_token`으로 Supabase `sessions` 레코드를 삭제하고 쿠키를 지움.

Response: `{"ok": true}`

### GET /api/me

현재 세션의 사용자명 조회.

Response(성공): `{"ok": true, "username": string}`
Response(실패): `{"error": string}` + 401 (쿠키 없음/세션 만료/사용자 없음 각각 다른 메시지)

---

## 확인 필요 / 생략한 부분

- 에러 응답의 HTTP status code가 라우트마다 제각각(같은 "잘못된 요청"이어도 200/400/500이 섞여 있음, 특히 `POST /paper/analyze`는 에러 케이스에서도 status_code를 지정하지 않아 200으로 나감) — 라우트별로 위에 개별 명시했고 전체를 통일된 표로는 만들지 않음.
- `users.is_approved`를 true로 바꾸는 승인 플로우(관리자 API 등)는 코드베이스에서 별도 엔드포인트를 찾지 못함 — Supabase 대시보드에서 직접 처리하는 것으로 추정되나 확인 필요.
- AI가 생성하는 JSON 필드(`analysis`, `explanation`, `feedback`, `cases`, `steps` 등)는 Pydantic 모델이 아니라 프롬프트의 `<schema>` 블록으로만 강제 — 실제 AI 응답이 프롬프트 스키마를 벗어날 가능성은 코드상 배제되지 않음.
