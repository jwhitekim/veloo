# Auth Specification

## Purpose

veloo의 모든 서브앱(paper, translate, model-review, todo, contextor)과 프론트엔드 라우트를 단일 세션 쿠키 기반으로 보호하는 인증 계층. 회원가입은 관리자 승인을 거쳐야 로그인 가능하며, 세션은 Supabase `sessions` 테이블에 저장된 토큰으로 검증한다. 로그인 실패는 IP 단위로 레이트리밋한다.

## Requirements

### Requirement: 인증 미들웨어의 열린 경로 통과

시스템은 `AuthMiddleware`에서 `_OPEN_PATHS`에 정확히 일치하는 경로(`/`, `/login`, `/signup`, `/logout`, `/register`, `/api/me`, 정적 파일들: `/apple-touch-icon.png`, `/favicon.svg`, `/icon-192.png`, `/icon-512.png`, `/icon-512.svg`, `/manifest.json`, `/manifest.webmanifest`, `/registerSW.js`, `/sw.js`) 또는 `_OPEN_PREFIXES`(`/assets/`, `/marketing/`, `/workbox-`)로 시작하는 경로에 대해 세션 검증 없이 즉시 다음 핸들러로 통과시켜야 한다(SHALL).

#### Scenario: 정적 자산 요청은 인증 없이 통과
- GIVEN 요청 경로가 `/assets/app.js`
- WHEN 클라이언트가 쿠키 없이 요청을 보냄
- THEN 미들웨어는 세션을 조회하지 않고 요청을 다음 핸들러로 전달
- AND 401이나 리다이렉트가 발생하지 않음

#### Scenario: 로그인 페이지는 인증 없이 통과
- GIVEN 요청 경로가 정확히 `/login`
- WHEN 쿠키가 없는 상태로 요청
- THEN 미들웨어는 요청을 그대로 통과시킴

### Requirement: 유효한 세션 토큰으로 요청 인가

시스템은 `access_token` 쿠키가 있으면 Supabase `sessions` 테이블에서 `token` 일치 레코드를 조회하고, 레코드가 존재하며 `expires_at`이 현재 시각(UTC)보다 미래이면 `request.state.user_id`에 해당 `user_id`를 설정하고 요청을 통과시켜야 한다(SHALL).

#### Scenario: 유효한 세션 쿠키로 보호된 엔드포인트 접근
- GIVEN `access_token` 쿠키 값이 `sessions` 테이블에 존재하고 `expires_at`이 미래
- WHEN 사용자가 `/paper/history`를 요청
- THEN 미들웨어는 `request.state.user_id`를 세션의 `user_id`로 설정
- AND 요청이 라우트 핸들러까지 도달

#### Scenario: 만료된 세션 토큰은 DB에서 삭제되고 거부됨
- GIVEN `access_token` 쿠키가 `sessions` 테이블에 존재하지만 `expires_at`이 현재 시각보다 과거
- WHEN 사용자가 보호된 경로를 요청
- THEN 미들웨어는 해당 세션 레코드를 `sessions` 테이블에서 삭제
- AND 세션 없음과 동일하게 처리(아래 "세션 없음/무효 시 응답 분기" 참고)

### Requirement: 세션 없음/무효 시 응답 분기

시스템은 세션이 없거나 무효한 요청에 대해, 경로가 `_API_PREFIXES`(`/paper/`, `/translate/`, `/model-review/`, `/todo/`, `/contextor/`) 중 하나로 시작하면 HTTP 401과 `{"error": "세션이 만료됐습니다. 다시 로그인해주세요."}`를 JSON으로 응답해야 하며(SHALL), 그 외 경로는 원래 경로와 쿼리스트링을 `redirect` 쿼리 파라미터로 인코딩하여 `/login?redirect=...`로 302 리다이렉트해야 한다(SHALL).

#### Scenario: 세션 없이 API 서브앱 요청 시 401 JSON
- GIVEN 요청에 `access_token` 쿠키가 없음
- WHEN 사용자가 `POST /paper/analyze`를 요청
- THEN 응답 상태 코드는 401
- AND 응답 본문은 `{"error": "세션이 만료됐습니다. 다시 로그인해주세요."}`

#### Scenario: 세션 없이 일반 페이지 요청 시 로그인 리다이렉트
- GIVEN 요청에 `access_token` 쿠키가 없음
- WHEN 사용자가 쿼리스트링 포함 경로 `/calendar?week=3`을 요청
- THEN 응답은 302이며 `Location` 헤더가 `/login?redirect=%2Fcalendar%3Fweek%3D3`
- AND 원래 경로와 쿼리스트링이 URL 인코딩되어 보존됨

### Requirement: 회원가입 사용자명 검증 및 예약어

시스템은 `POST /register` 요청에서 사용자명을 소문자로 정규화한 뒤 `USERNAME_RE`(`^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$`, 3~30자, 영문 소문자/숫자/하이픈, 하이픈으로 시작·종료 불가) 패턴에 맞지 않으면 400을 반환해야 하며(SHALL), `RESERVED_USERNAMES`(`admin`, `api`, `assets`, `contextor`, `login`, `logout`, `model-review`, `paper`, `pricing`, `register`, `settings`, `signup`, `todo`, `translate`)에 포함된 사용자명도 400으로 거부해야 한다(SHALL). 비밀번호는 8자 미만이면 400으로 거부해야 한다(SHALL). 이미 존재하는 사용자명은 409로 거부해야 한다(SHALL).

#### Scenario: 형식에 맞지 않는 사용자명 거부
- GIVEN 요청 바디의 `username`이 `"ab"` (2자, 최소 3자 미달)
- WHEN `POST /register` 호출
- THEN 응답은 400
- AND 본문은 `{"error": "사용자명은 영문 소문자, 숫자, 하이픈을 사용해 3~30자로 입력해주세요."}`

#### Scenario: 예약어 사용자명 거부
- GIVEN 요청 바디의 `username`이 `"admin"`
- WHEN `POST /register` 호출
- THEN 응답은 400
- AND 본문은 `{"error": "사용할 수 없는 사용자명입니다."}`

#### Scenario: 8자 미만 비밀번호 거부
- GIVEN `username`이 유효하고 `password`가 `"short1"` (6자)
- WHEN `POST /register` 호출
- THEN 응답은 400
- AND 본문은 `{"error": "비밀번호는 8자 이상 입력해주세요."}`

#### Scenario: 중복 사용자명 거부
- GIVEN `users` 테이블에 동일한 `username`이 이미 존재
- WHEN 유효한 형식의 `username`/`password`로 `POST /register` 호출
- THEN 응답은 409
- AND 본문은 `{"error": "이미 사용 중인 사용자명입니다."}`

#### Scenario: 정상 가입은 승인 대기 상태로 생성
- GIVEN 형식이 유효하고 중복되지 않은 `username`, 8자 이상 `password`
- WHEN `POST /register` 호출
- THEN `users` 테이블에 `is_approved: false`로 레코드가 삽입됨
- AND 응답은 `{"ok": true, "message": "승인 대기 중입니다."}`

### Requirement: 로그인 시 레이트리밋

시스템은 동일 IP(`X-Forwarded-For` 첫 값 또는 클라이언트 IP)에서 15분 이내 로그인 실패가 5회 이상 누적되면 이후 로그인 시도를 429로 거부해야 한다(SHALL). 성공적인 로그인은 해당 IP의 실패 기록을 초기화해야 한다(SHALL).

#### Scenario: 5회 실패 후 6번째 시도 차단
- GIVEN 동일 IP에서 15분 이내 로그인 실패가 5회 기록됨
- WHEN 같은 IP로 다시 `POST /login` 호출(자격 증명 정확 여부 무관)
- THEN 응답은 429
- AND 본문은 `{"error": "너무 많은 시도가 있었습니다. 15분 후 다시 시도해주세요."}`

#### Scenario: 성공 로그인 후 실패 카운트 초기화
- GIVEN 동일 IP에서 로그인 실패가 3회 기록된 상태
- WHEN 올바른 자격 증명으로 `POST /login` 성공
- THEN 해당 IP의 실패 기록이 삭제됨
- AND 이후 다시 5회를 새로 실패해야 429가 발생

### Requirement: 로그인 자격 증명 검증 및 승인 상태 확인

시스템은 `POST /login`에서 사용자명이 존재하지 않거나 비밀번호가 불일치하면 401로 거부해야 하며(SHALL), 이때도 레이트리밋 실패 카운트를 증가시켜야 한다(SHALL). 사용자명·비밀번호가 유효하더라도 `is_approved`가 false이면 403으로 거부해야 한다(SHALL).

#### Scenario: 존재하지 않는 사용자명
- GIVEN `users` 테이블에 없는 `username`
- WHEN `POST /login` 호출
- THEN 응답은 401
- AND 본문은 `{"error": "사용자명 또는 비밀번호가 틀렸습니다."}`
- AND 해당 IP의 실패 카운트가 1 증가

#### Scenario: 비밀번호 불일치
- GIVEN 존재하는 `username`이지만 `password`가 틀림
- WHEN `POST /login` 호출
- THEN 응답은 401
- AND 본문은 `{"error": "사용자명 또는 비밀번호가 틀렸습니다."}`

#### Scenario: 미승인 사용자 로그인 거부
- GIVEN `username`/`password`는 올바르지만 `is_approved`가 false
- WHEN `POST /login` 호출
- THEN 응답은 403
- AND 본문은 `{"error": "승인 대기 중입니다."}`
- AND 실패 카운트는 증가하지 않음(자격 증명 자체는 맞았으므로 `_record_failure` 호출 전에 반환됨 — 코드상 확인됨)

### Requirement: 로그인 성공 시 세션 발급 및 쿠키 설정

시스템은 로그인 성공 시 32바이트 랜덤 토큰(`secrets.token_hex(32)`)을 생성하여 `sessions` 테이블에 `user_id`, `token`, 현재 시각으로부터 30일 후의 `expires_at`을 저장해야 하며(SHALL), 응답에 `access_token` 쿠키를 `httponly=true`, `samesite=lax`, `max_age=2592000`(30일)으로 설정해야 한다(SHALL). 쿠키의 `secure` 속성은 `SECURE_COOKIE` 환경변수가 설정되어 있으면 그 값을(`0`/`false`/`no`가 아니면 true), 설정되어 있지 않으면 요청 스킴이 `https`이거나 `X-Forwarded-Proto`가 `https`인지 여부로 결정해야 한다(SHALL).

#### Scenario: 정상 로그인 성공
- GIVEN 올바른 `username`/`password`이고 `is_approved`가 true
- WHEN `POST /login` 호출
- THEN 응답은 `{"ok": true}`
- AND `sessions` 테이블에 새 토큰 레코드가 `expires_at = now + 30일`로 삽입됨
- AND 응답에 `access_token` 쿠키가 `HttpOnly`, `SameSite=Lax` 속성으로 설정됨

#### Scenario: SECURE_COOKIE 미설정 시 HTTPS 여부로 secure 결정
- GIVEN `SECURE_COOKIE` 환경변수가 설정되지 않음
- WHEN `X-Forwarded-Proto: https` 헤더가 포함된 로그인 요청이 성공
- THEN 발급된 쿠키의 `Secure` 속성이 true로 설정됨

### Requirement: 로그아웃 시 세션 무효화

시스템은 `DELETE /logout` 요청 시 `access_token` 쿠키가 있으면 해당 토큰을 `sessions` 테이블에서 삭제하고, 응답에서 `access_token` 쿠키를 삭제해야 한다(SHALL). 쿠키가 없어도 200으로 응답해야 한다(SHALL, 에러 처리 없음 — 코드상 토큰 부재 시 삭제 쿼리를 건너뛰고 바로 쿠키 삭제 응답).

#### Scenario: 로그인 상태에서 로그아웃
- GIVEN 유효한 `access_token` 쿠키 보유
- WHEN `DELETE /logout` 호출
- THEN 해당 토큰이 `sessions` 테이블에서 삭제됨
- AND 응답 쿠키에서 `access_token`이 삭제 지시됨
- AND 응답은 `{"ok": true}`

#### Scenario: 쿠키 없이 로그아웃 호출
- GIVEN `access_token` 쿠키가 없음
- WHEN `DELETE /logout` 호출
- THEN DB 삭제 쿼리는 실행되지 않음
- AND 응답은 여전히 `{"ok": true}`

### Requirement: 현재 사용자 조회 (/api/me)

시스템은 `GET /api/me`에서 `access_token` 쿠키가 없으면 401을, 세션이 없거나 만료됐으면 401(`"세션이 만료됐습니다."`)을, `users` 테이블에서 해당 `user_id`를 찾지 못하면 401(`"사용자를 찾을 수 없습니다."`)을 반환해야 한다(SHALL). 모든 조건을 통과하면 `{"ok": true, "username": string}`을 반환해야 한다(SHALL). 이 엔드포인트 자체는 `AuthMiddleware`의 `_OPEN_PATHS`에 포함되어 미들웨어 차원에서는 인증 없이 통과하며, 라우터 핸들러 내부에서 자체적으로 세션을 재검증한다.

#### Scenario: 쿠키 없이 /api/me 호출
- GIVEN `access_token` 쿠키가 없음
- WHEN `GET /api/me` 호출
- THEN 응답은 401
- AND 본문은 `{"error": "인증이 필요합니다."}`

#### Scenario: 만료된 세션으로 /api/me 호출
- GIVEN `access_token` 쿠키는 있으나 `sessions` 테이블의 `expires_at`이 과거
- WHEN `GET /api/me` 호출
- THEN 응답은 401, 본문은 `{"error": "세션이 만료됐습니다."}`
- AND 해당 세션 레코드가 `sessions` 테이블에서 삭제됨

#### Scenario: 유효한 세션으로 /api/me 호출
- GIVEN 유효한 세션과 해당 `user_id`가 `users` 테이블에 존재
- WHEN `GET /api/me` 호출
- THEN 응답은 `{"ok": true, "username": string}`
