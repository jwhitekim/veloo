# Translator Specification

## Purpose
ML/DL/CV/NLP 논문의 영어 단어·구·문장·문단을 자연스러운 한국어로 옮기는 스트리밍 번역 기능. 수식·고유명사·코드 식별자 보존, 정착 학술 용어 처리 규칙을 프롬프트로 강제하고, 동일 사용자·동일 원문 재요청 시 캐시로 즉시 응답한다.

## Requirements

### Requirement: 번역 스트리밍 응답
시스템은 `POST /api/translate` 요청을 받아 번역 결과를 `text/plain; charset=utf-8` 스트리밍으로 반환해야 한다(SHALL). 요청 본문은 `text` 필드(string)를 가진다.

#### Scenario: 정상 번역 요청
- GIVEN 로그인한 사용자가 공백이 아닌 `text`를 보낸다
- WHEN `POST /api/translate`를 호출한다
- THEN AI 프로바이더의 스트리밍 응답을 토큰 단위로 그대로 전달한다
- AND 스트림 종료 후 원문과 번역 전문을 `translation_history`에 저장한다(Supabase 연결 시)

#### Scenario: 빈 텍스트 요청
- GIVEN `text`가 빈 문자열이거나 공백만으로 이루어져 있다
- WHEN `POST /api/translate`를 호출한다
- THEN HTTP 400과 함께 `{"error": "텍스트가 비어 있습니다."}`를 반환한다
- AND 스트리밍 응답을 생성하지 않는다

#### Scenario: 스트리밍 중 프로바이더 오류
- GIVEN AI 프로바이더 스트림 호출 중 예외가 발생한다
- WHEN 아직 한 조각도 전달되지 않은 상태다
- THEN 스트림에 "번역 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." 문자열을 담아 반환한다
- AND 이후 저장 로직을 실행하지 않고 스트림을 종료한다

### Requirement: 캐시 히트 시 즉시 응답
시스템은 동일 사용자가 동일한 `source_text`를 다시 요청하면 AI 프로바이더를 호출하지 않고 저장된 번역을 반환해야 한다(SHALL).

#### Scenario: 캐시된 원문 재요청
- GIVEN Supabase가 연결되어 있고 `translation_history`에 해당 사용자·원문의 레코드가 존재한다
- WHEN `POST /api/translate`를 동일 `text`로 호출한다
- THEN 캐시된 `translated_text`를 스트리밍으로 반환한다
- AND 응답 헤더에 `X-Cache: HIT`를 포함한다
- AND AI 프로바이더를 호출하지 않는다

#### Scenario: Supabase 미설정 또는 캐시 조회 실패
- GIVEN Supabase 클라이언트가 없거나 캐시 조회 중 예외가 발생한다
- WHEN `POST /api/translate`를 호출한다
- THEN 캐시 체크를 조용히 건너뛰고 AI 프로바이더 스트리밍 경로로 진행한다

### Requirement: 번역 규칙 프롬프트 적용
시스템은 번역 시 수식·변수·기호, 고유명사(모델명·데이터셋명·인용 키), 코드 식별자, 원문 문단·줄바꿈 구조를 보존해야 한다(SHALL). 확인 필요: 이 보존 규칙은 시스템 프롬프트 지시일 뿐 코드 레벨 검증·후처리는 없다 — 실제 준수 여부는 AI 응답 품질에 의존한다.

#### Scenario: 단어 또는 3어 이하 짧은 구 번역
- GIVEN 입력이 단어 하나 또는 3어 이하의 짧은 구다
- WHEN 번역을 수행한다
- THEN 기본 출력은 한국어 의미와 원어를 병기한다 (예: "트랜스포머(transformer)")
- AND 한국어 번역이 부자연스럽거나 실사용 빈도가 낮으면 영어를 그대로 유지할 수 있다(MAY)

#### Scenario: 문장·문단 내 고정 영어 용어
- GIVEN 입력이 문장 또는 문단이고 fine-tuning, transformer, encoder, decoder, token, layer, weight, bias, gradient, loss, batch, epoch, inference, prompt, dropout, downstream 중 하나를 포함한다
- WHEN 번역을 수행한다
- THEN 해당 용어는 번역하지 않고 영어 그대로 유지한다

### Requirement: 히스토리 유형 분류 및 저장
시스템은 번역 완료 후 원문의 공백 기준 단어 수로 `type`을 "word"(단어 1개) 또는 "sentence"(그 외)로 분류하여 저장해야 한다(SHALL).

#### Scenario: 단일 단어 저장
- GIVEN 원문이 공백으로 분리했을 때 토큰이 1개다
- WHEN 번역 완료 후 히스토리를 저장한다
- THEN `type` 값을 "word"로 저장한다

#### Scenario: 저장 실패
- GIVEN Supabase insert 중 예외가 발생한다
- WHEN 히스토리 저장을 시도한다
- THEN 예외를 로깅만 하고 클라이언트에는 이미 전송된 스트리밍 응답에 영향을 주지 않는다

### Requirement: 번역 히스토리 조회
시스템은 `GET /api/history`로 로그인 사용자의 번역 히스토리를 조회할 수 있어야 한다(SHALL).

#### Scenario: 최근 히스토리 목록 조회
- GIVEN `count` 쿼리 파라미터가 없거나 false다
- WHEN `GET /api/history`를 호출한다
- THEN `id, source_text, translated_text, type, created_at`을 최근 생성 순으로 최대 10건 반환한다

#### Scenario: 히스토리 개수 조회
- GIVEN `count=true`로 요청한다
- WHEN `GET /api/history`를 호출한다
- THEN 해당 사용자의 전체 히스토리 개수를 `{"count": N}`으로 반환한다

#### Scenario: Supabase 미설정 또는 조회 실패
- GIVEN Supabase 클라이언트가 없거나 조회 중 예외가 발생한다
- WHEN `GET /api/history`를 호출한다
- THEN `count` 여부에 따라 `{"count": 0}` 또는 `{"items": []}`를 반환한다
