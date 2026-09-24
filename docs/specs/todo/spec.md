# Todo Specification

## Purpose

연구 할 일과 하위 단계(step)를 관리하고, AI로 단계 분해·우선순위 조언을 생성하며, 주간 리뷰 통계와 마감 리마인드 이메일을 제공하는 capability. `/todo` 경로로 마운트.

## Requirements

### Requirement: Todo CRUD
The system SHALL allow creating, reading, updating, and deleting todos, each scoped to the authenticated user via the `access_token` cookie / `sessions` table lookup.

#### Scenario: 인증 없이 목록 조회
- GIVEN `access_token` 쿠키가 없음
- WHEN `GET /api/todos` 호출
- THEN 401 응답과 "인증이 필요합니다." 에러 반환

#### Scenario: 만료된 세션으로 조회
- GIVEN `access_token`이 `sessions` 테이블에 존재하지 않음
- WHEN `GET /api/todos` 호출
- THEN 401 응답과 "세션이 만료됐습니다." 에러 반환

#### Scenario: 새 todo 생성
- GIVEN 인증된 사용자
- WHEN `POST /api/todos`에 `{name, memo, priority, deadline}`(TodoCreate) 전송
- THEN `todos` 테이블에 `user_id`가 채워져 삽입되고 `steps: []`가 포함된 TodoOut 반환

#### Scenario: 존재하지 않는 todo 조회
- GIVEN `todo_id`에 해당하는 row가 없음
- WHEN `GET /api/todos/{todo_id}` 호출
- THEN 404와 "Todo not found" 반환

#### Scenario: 부분 업데이트는 명시하지 않은 필드를 유지
- GIVEN 기존 todo가 존재
- WHEN `PATCH /api/todos/{todo_id}`에 `memo`만 포함한 TodoUpdate 전송
- THEN `exclude_unset=True`로 `memo`만 갱신되고 나머지 필드는 그대로 유지

#### Scenario: todo 삭제
- WHEN `DELETE /api/todos/{todo_id}` 호출
- THEN `todos` row 삭제되고 `{"ok": true}` 반환 (row 존재 여부와 무관하게 성공 응답)

#### Scenario: done 토글
- GIVEN todo의 현재 `done` 값
- WHEN `PATCH /api/todos/{todo_id}/done` 호출
- THEN `done` 값이 반전되어 저장되고 갱신된 TodoOut 반환
- AND 대상 todo가 없으면 404 "Todo not found"

### Requirement: 캘린더 지정과 리마인드 시각 자동 계산
The system SHALL let a todo be scheduled onto a calendar slot via `start_time`/`end_time`, and SHALL derive `remind_at` automatically when `start_time` changes unless the caller supplies `remind_at` explicitly.

#### Scenario: start_time 설정 시 remind_at 자동 계산
- GIVEN todo에 `remind_at`을 명시하지 않고
- WHEN `PATCH /api/todos/{todo_id}`에 `start_time`을 설정
- THEN `remind_at`이 `start_time - 30분`으로 계산되어 저장
- AND `reminded`가 `false`로 초기화됨

#### Scenario: start_time을 null로 해제
- WHEN `PATCH /api/todos/{todo_id}`에 `start_time: null` 전송
- THEN `remind_at`도 `null`로 초기화되고 `reminded`는 `false`로 초기화됨

#### Scenario: remind_at을 명시적으로 함께 전송
- WHEN `PATCH /api/todos/{todo_id}`에 `start_time`과 `remind_at`을 함께 전송
- THEN 자동 계산을 건너뛰고 전달된 `remind_at` 값을 그대로 저장

#### Scenario: 캘린더 범위 조회
- WHEN `GET /api/todos/calendar?start=<ISO>&end=<ISO>` 호출
- THEN `start_time`이 해당 구간(`gte start`, `lte end`)에 속하는 현재 사용자의 todo 목록을 `start_time` 오름차순으로 반환

### Requirement: 필터 조회 (주간/오늘/메모)
The system SHALL support `filter` query parameter values `week`, `today`, and `memo` on `GET /api/todos`, applying deadline-text parsing for `week`/`today`.

#### Scenario: filter=week
- WHEN `GET /api/todos?filter=week` 호출
- THEN `done=false`인 todo 중 `deadline` 텍스트를 파싱한 날짜가 이번 주(월~일, KST) 범위에 속하는 항목만 반환
- AND `deadline`을 파싱할 수 없는 항목은 제외

#### Scenario: filter=today
- WHEN `GET /api/todos?filter=today` 호출
- THEN `deadline` 텍스트를 파싱한 날짜가 오늘(KST)과 일치하는 항목만 반환 (done 여부 무관)

#### Scenario: filter=memo
- WHEN `GET /api/todos?filter=memo` 호출
- THEN `memo`가 빈 문자열이 아닌 todo를 생성일 역순으로 반환

#### Scenario: deadline 텍스트 파싱
- GIVEN `deadline` 값이 "오늘", "내일", "화요일" 같은 한국어 상대 표현이거나 일반 날짜 문자열
- WHEN 필터 로직이 파싱을 시도
- THEN "오늘"/"내일"/요일명은 규칙 기반으로, 그 외는 `dateutil.parser.parse(fuzzy=True)`로 파싱하고 실패 시 `None` 처리(해당 항목은 필터 결과에서 제외)

### Requirement: Step CRUD
The system SHALL allow creating steps under a todo and updating/toggling/deleting individual steps.

#### Scenario: todo에 step 추가
- WHEN `POST /api/todos/{todo_id}/steps`에 `{text, done, order_index}`(StepCreate) 전송
- THEN `steps` 테이블에 `todo_id`를 포함해 삽입되고 생성된 StepOut 반환

#### Scenario: step 부분 수정
- WHEN `PATCH /api/steps/{step_id}`에 일부 필드만 포함한 StepUpdate 전송
- THEN `exclude_none=True`로 값이 있는 필드만 갱신
- AND 대상 step이 없으면 404 "Step not found"

#### Scenario: step done 토글
- WHEN `PATCH /api/steps/{step_id}/done` 호출
- THEN 현재 `done` 값의 반전이 저장되고 갱신된 StepOut 반환
- AND 대상 step이 없으면 404 "Step not found"

#### Scenario: step 삭제
- WHEN `DELETE /api/steps/{step_id}` 호출
- THEN `steps` row 삭제되고 `{"ok": true}` 반환

#### Scenario: todo 응답의 step 정렬
- GIVEN todo가 여러 step을 가짐
- WHEN todo를 단건 또는 목록으로 조회
- THEN 응답의 `steps` 배열은 `order_index` 오름차순으로 정렬됨

### Requirement: AI 기반 단계 분해
The system SHALL generate 3-4 actionable steps for a todo via an AI provider, in synchronous and asynchronous (background) variants, returning structured JSON.

#### Scenario: 동기 단계 생성
- WHEN `POST /api/ai/generate-steps`에 `{todo_name, memo, priority, deadline}`(GenerateStepsRequest, `todo_id` 없이도 가능) 전송
- THEN AI 프로바이더 응답에서 JSON을 추출해 `{"steps": [...]}` 형태로 반환

#### Scenario: AI 응답이 유효한 JSON이 아님
- GIVEN AI 프로바이더가 파싱 불가능한 텍스트를 반환
- WHEN `POST /api/ai/generate-steps` 처리 중 `extract_json`이 실패
- THEN 500과 "AI returned invalid JSON: ..." 형태의 에러 반환

#### Scenario: 비동기 단계 생성 요청
- GIVEN `todo_id`가 포함된 GenerateStepsRequest
- WHEN `POST /api/ai/generate-steps-async` 호출
- THEN 즉시 `{"status": "generating"}`을 반환하고, 백그라운드 태스크가 완료되면 생성된 step들을 `todo_id`에 연결해 `steps` 테이블에 순서대로 삽입

#### Scenario: 비동기 요청에 todo_id 누락
- GIVEN GenerateStepsRequest에 `todo_id`가 없음
- WHEN `POST /api/ai/generate-steps-async` 호출
- THEN 422와 "todo_id required for async generation" 반환

#### Scenario: 비동기 생성 중 백그라운드 실패
- GIVEN 백그라운드 태스크 실행 중 AI 호출 또는 JSON 파싱이 실패
- WHEN 예외 발생
- THEN 예외를 로깅만 하고 클라이언트에는 별도 알림 없이 종료 (step 미생성 상태로 남음)

### Requirement: AI 우선순위 전략 제안 (미사용 경로, 유지)
The system SHALL provide an endpoint that generates a one-sentence scheduling suggestion for a given todo based on all incomplete todos, and persist it on the todo, even though the current frontend has no caller for it (2026-09-01 UI 제거, 엔드포인트는 되살리기 쉽도록 유지).

#### Scenario: 전략 생성
- WHEN `POST /api/ai/generate-strategy`에 `{todo_id}`(GenerateStrategyRequest) 전송
- THEN 대상 todo 이름과, `done=false`인 전체 todo 목록(우선순위·마감 포함)을 AI에 전달해 한 문장 조언을 받고
- AND 해당 문장을 대상 todo의 `ai_strategy` 필드에 저장한 뒤 갱신된 TodoOut 반환

#### Scenario: 대상 todo 없음
- GIVEN `todo_id`에 해당하는 todo가 없음
- WHEN `POST /api/ai/generate-strategy` 호출
- THEN 404 "Todo not found" 반환

### Requirement: 주간 리뷰 통계
The system SHALL compute weekly completion statistics for the authenticated user given a week start date.

#### Scenario: 정상 주간 리뷰 조회
- GIVEN 인증된 사용자와 유효한 ISO 8601 `week_start`
- WHEN `GET /api/reviews/weekly?week_start=<ISO>` 호출
- THEN `week_start`부터 7일간(`week_end` = `week_start + 7일`)의 `completed`(기간 내 완료), `created`(기간 내 생성), `completion_rate`(`completed/created`, 소수 3자리, `created`가 0이면 0.0), `overdue`(기간 시작 이전 생성되고 아직 미완료인 항목), `by_priority`(urgent/mid/normal별 done/todo 개수, 전체 todo 기준)를 반환

#### Scenario: week_start 형식 오류
- WHEN `GET /api/reviews/weekly?week_start=invalid` 호출
- THEN 400과 "week_start 형식 오류 (ISO 8601)" 반환

#### Scenario: 인증되지 않은 요청
- GIVEN `access_token` 쿠키 없음 또는 세션 만료
- WHEN `GET /api/reviews/weekly` 호출
- THEN 401 반환 (todos 라우터의 `_get_user_id`와 동일한 에러 메시지 규칙)

### Requirement: 마감 리마인드 이메일 스케줄러
The system SHALL run a background scheduler that sends reminder emails for due todos and a daily summary email, but only when `NOTIFY_TO` is configured (스케줄러 자체는 `SMTP_USER` 설정 여부와 무관하게 시작되며, 발송만 `NOTIFY_TO` 유무로 걸림 — 확인 필요: 레포 CLAUDE.md는 "`SMTP_USER` 설정 시에만 시작"이라 하나, `scheduler.py`의 `start_scheduler()` 코드 자체에는 그런 조건이 없고 잡 내부에서 `NOTIFY_TO` 부재 시 조용히 리턴함; 실제 시작 조건 분기는 `scheduler.py` 바깥의 앱 구동 코드에 있을 가능성 — 해당 호출부 확인 필요).

#### Scenario: 1분 주기 리마인드 잡
- GIVEN `NOTIFY_TO` 환경변수가 설정됨
- WHEN 1분마다 실행되는 리마인드 잡이 `remind_at <= now`이고 `reminded=false`, `done=false`인 todo를 조회
- THEN 각 todo에 대해 이메일을 발송하고 성공 시 `reminded=true`로 갱신

#### Scenario: NOTIFY_TO 미설정
- GIVEN `NOTIFY_TO` 환경변수가 없음
- WHEN 리마인드 잡 또는 매일 09:00(KST) 요약 잡이 실행
- THEN 아무 이메일도 보내지 않고 즉시 종료

#### Scenario: 발송 또는 DB 갱신 실패
- GIVEN 이메일 발송 또는 `reminded` 갱신 중 예외 발생
- WHEN 리마인드 잡이 해당 todo를 처리
- THEN 예외를 로깅하고 다음 todo 처리를 계속 진행 (잡 전체가 중단되지 않음)

#### Scenario: 매일 09:00 요약 메일
- GIVEN `NOTIFY_TO` 설정됨, 오늘(KST) `start_time`을 가진 미완료 todo가 1개 이상 존재
- WHEN 매일 KST 09:00에 요약 잡이 실행
- THEN 해당 todo 목록(이름·우선순위)을 담은 요약 이메일 1통 발송
- AND 오늘 예정된 todo가 없으면 메일을 보내지 않음

### Requirement: 헬스체크
The system SHALL expose a health check endpoint for the todo subapp.

#### Scenario: 헬스체크 호출
- WHEN `GET /health` 호출
- THEN `{"status": "ok"}` 반환
