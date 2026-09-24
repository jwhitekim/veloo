# Model Review Specification

## Purpose
논문 아키텍처 그림을 보고 스스로 설명하는 연습을 지원하는 기능. 업로드된 아키텍처 이미지에서 AI가 기준 설명(JSON)을 생성하고, 사용자가 작성한 설명을 기준 설명과 비교해 채점·교정한다.

## Requirements

### Requirement: 아키텍처 이미지 기준 설명 생성
시스템은 `POST /api/explain`으로 업로드된 이미지 하나를 받아 AI가 생성한 구조화된 JSON 설명을 반환해야 한다(SHALL).

#### Scenario: 정상 이미지 업로드
- GIVEN 사용자가 jpeg/png/gif/webp 중 하나의 이미지 파일을 업로드하고 크기가 10MB 이하다
- WHEN `POST /api/explain`을 호출한다
- THEN AI 프로바이더에 이미지를 첨부해 호출하고 응답 텍스트를 JSON으로 파싱한다
- AND `{"explanation": {...}, "history_id": <id 또는 null>}`을 반환한다

#### Scenario: 허용되지 않는 이미지 형식
- GIVEN 업로드 파일의 `content_type`이 image/jpeg, image/png, image/gif, image/webp 중 어느 것도 아니다
- WHEN `POST /api/explain`을 호출한다
- THEN HTTP 400과 `{"error": "지원하지 않는 이미지 형식입니다. (jpeg/png/gif/webp만 허용)"}`을 반환한다
- AND AI 프로바이더를 호출하지 않는다

#### Scenario: 이미지 용량 초과
- GIVEN 업로드된 이미지가 10MB(10 * 1024 * 1024 바이트)를 초과한다
- WHEN `POST /api/explain`을 호출한다
- THEN HTTP 400과 `{"error": "이미지가 너무 큽니다 (최대 10MB)"}`을 반환한다
- AND AI 프로바이더를 호출하지 않는다

#### Scenario: AI 응답 파싱 실패 또는 프로바이더 오류
- GIVEN AI 호출 자체가 예외를 던지거나 응답 텍스트가 유효한 JSON이 아니다
- WHEN `POST /api/explain`을 호출한다
- THEN 예외를 로깅하고 HTTP 500과 `{"error": "서버 오류가 발생했습니다."}`을 반환한다

#### Scenario: 기준 설명 히스토리 저장
- GIVEN Supabase가 연결되어 있고 JSON 파싱까지 성공했다
- WHEN 설명 생성이 완료된다
- THEN `arch_history`에 `user_id, image_name, explanation`을 저장하고 생성된 레코드의 `id`를 `history_id`로 응답에 포함한다

#### Scenario: 히스토리 저장 실패
- GIVEN Supabase insert 중 예외가 발생한다
- WHEN 히스토리 저장을 시도한다
- THEN 예외를 로깅만 하고 `history_id`를 null로 둔 채 정상 응답(`explanation` 포함)을 반환한다

### Requirement: JSON 전용 응답 강제 및 코드펜스 제거
시스템은 AI 응답 텍스트에서 마크다운 코드펜스(예: ```json ... ```)를 제거한 뒤 JSON으로 파싱해야 한다(SHALL). 확인 필요: 코드펜스 제거 외의 JSON 정합성 보정(예: 트레일링 콤마 수정)은 없으며, 파싱 실패 시 그대로 예외로 처리되어 500 응답으로 이어진다.

#### Scenario: 코드펜스로 감싸인 응답
- GIVEN AI 응답이 ` ```json { ... } ``` ` 형태로 코드펜스에 감싸여 있다
- WHEN 응답을 파싱한다
- THEN 코드펜스 마커를 제거한 순수 JSON 문자열을 `json.loads`로 파싱한다

### Requirement: 사용자 설명 채점 및 교정
시스템은 `POST /api/feedback`으로 사용자가 작성한 아키텍처 설명을 기준 설명과 비교해 채점 결과를 반환해야 한다(SHALL). 요청 본문은 `ai_explanation`(dict), `user_explanation`(string), `history_id`(int | null, 선택) 필드를 가진다.

#### Scenario: 정상 채점 요청
- GIVEN `ai_explanation`(기준 설명 JSON)과 `user_explanation`(사용자 설명 텍스트)이 주어진다
- WHEN `POST /api/feedback`을 호출한다
- THEN 사용자 설명의 `<`, `>` 문자를 각각 `&lt;`, `&gt;`로 이스케이프한 뒤 AI 프로바이더에 전달한다
- AND 응답을 JSON으로 파싱해 `{"feedback": {"correct": [...], "missing": [...], "incorrect": [...], "suggestion": "..."}}` 형태로 반환한다

#### Scenario: 채점 완료 후 히스토리 갱신
- GIVEN 요청에 `history_id`가 포함되어 있고 Supabase가 연결되어 있다
- WHEN 채점이 완료된다
- THEN 해당 `history_id`(및 동일 `user_id`)의 `arch_history` 레코드에 `feedback` 필드를 갱신한다

#### Scenario: history_id 없음 또는 갱신 실패
- GIVEN `history_id`가 없거나, 있어도 Supabase 갱신 중 예외가 발생한다
- WHEN 채점 요청을 처리한다
- THEN 히스토리 갱신을 건너뛰거나 예외를 무시하고, 채점 결과 응답은 정상적으로 반환한다

#### Scenario: AI 호출 또는 파싱 실패
- GIVEN AI 호출이 예외를 던지거나 응답이 유효한 JSON이 아니다
- WHEN `POST /api/feedback`을 호출한다
- THEN 예외를 로깅하고 HTTP 500과 `{"error": "서버 오류가 발생했습니다."}`을 반환한다

### Requirement: 아키텍처 리뷰 히스토리 조회
시스템은 `GET /api/history`로 로그인 사용자의 아키텍처 설명 히스토리를 조회할 수 있어야 한다(SHALL).

#### Scenario: 최근 히스토리 목록 조회
- GIVEN `count` 쿼리 파라미터가 없거나 false다
- WHEN `GET /api/history`를 호출한다
- THEN `id, image_name, explanation, created_at`을 최근 생성 순으로 최대 5건 반환한다

#### Scenario: 히스토리 개수 조회
- GIVEN `count=true`로 요청한다
- WHEN `GET /api/history`를 호출한다
- THEN 해당 사용자의 전체 히스토리 개수를 `{"count": N}`으로 반환한다

#### Scenario: Supabase 미설정 또는 조회 실패
- GIVEN Supabase 클라이언트가 없거나 조회 중 예외가 발생한다
- WHEN `GET /api/history`를 호출한다
- THEN `count` 여부에 따라 `{"count": 0}` 또는 `{"items": []}`를 반환한다
