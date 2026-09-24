# Paper Analyzer Specification

## Purpose

논문 제목 검색, URL 붙여넣기, PDF 업로드 중 하나로 논문을 식별하여 Semantic Scholar에서 메타데이터·저자 정보를 조회하고, AI(Claude/Gemini)로 요약을 생성하며, SJR 저널 품질 데이터로 저널 등급을 매기는 기능. 사용자별 분석 결과를 Supabase에 캐시·히스토리로 저장한다. `/paper` prefix로 마운트되며, 모든 엔드포인트는 root의 `AuthMiddleware`를 통과한 유효 세션을 전제로 한다(auth capability 참고).

## Requirements

### Requirement: 히스토리 조회

시스템은 `GET /paper/history`에서 로그인 사용자(`request.state.user_id`)의 `paper_history` 레코드를 `created_at` 내림차순 최대 10건 반환해야 한다(SHALL). `count=true` 쿼리 파라미터가 주어지면 개수만 반환해야 한다(SHALL). Supabase가 설정되지 않았거나 조회 중 예외가 발생하면 에러를 전파하지 않고 빈 결과(`{"items": []}` 또는 `{"count": 0}`)를 반환해야 한다(SHALL).

#### Scenario: 기본 히스토리 조회
- GIVEN 로그인 사용자가 과거 분석 기록 3건을 가짐
- WHEN `GET /paper/history` 호출
- THEN 응답은 `{"items": [...]}` 이며 각 항목은 `id`, `title`, `paper_id`, `query`, `created_at`, `result` 필드를 포함
- AND `created_at` 내림차순으로 정렬됨

#### Scenario: count 파라미터로 개수만 조회
- GIVEN 로그인 사용자가 과거 분석 기록 3건을 가짐
- WHEN `GET /paper/history?count=true` 호출
- THEN 응답은 `{"count": 3}`

#### Scenario: Supabase 미설정 시 조용히 빈 값 반환
- GIVEN Supabase 클라이언트가 초기화되지 않음(`_supabase`가 None)
- WHEN `GET /paper/history` 호출
- THEN 응답은 500 에러 없이 `{"items": []}` (count 파라미터 없을 때) 반환

### Requirement: 논문 검색

시스템은 `POST /paper/search`에서 `query` form 필드를 받아, 값이 `http`로 시작하면 URL 파싱을 시도하고 그렇지 않으면 Semantic Scholar 제목 검색을 수행해야 한다(SHALL). URL이 지원되지 않는 형식이면 `{"type": "unsupported_url"}`을, 파싱 가능한 URL이면 `{"type": "url", "query": string}`을 반환해야 한다(SHALL, 이 단계에서는 아직 논문을 조회하지 않고 원본 URL만 돌려줌). 제목 검색은 최대 5건의 후보를 `{"type": "candidates", "data": [...]}`로 반환해야 한다(SHALL).

#### Scenario: URL이 아닌 일반 제목 검색
- GIVEN `query`가 `"Attention is all you need"`
- WHEN `POST /paper/search` (form: query) 호출
- THEN Semantic Scholar 제목 검색이 최대 5건 실행됨
- AND 응답은 `{"type": "candidates", "data": [{"paperId", "title", "year", "venue", "citationCount"}, ...]}`

#### Scenario: 지원되는 학술 URL 입력
- GIVEN `query`가 `"https://arxiv.org/abs/1706.03762"`
- WHEN `POST /paper/search` 호출
- THEN 응답은 `{"type": "url", "query": "https://arxiv.org/abs/1706.03762"}`
- AND 이 단계에서 Semantic Scholar 조회는 수행되지 않음(파싱만 수행)

#### Scenario: 지원되지 않는 URL 형식
- GIVEN `query`가 `http`로 시작하지만 arxiv/doi/s2/pmid 패턴 어디에도 매치되지 않는 URL(예: ResearchGate 링크로 DOI가 URL에 없는 경우)
- WHEN `POST /paper/search` 호출
- THEN 응답은 `{"type": "unsupported_url"}`

#### Scenario: Semantic Scholar 외부 오류
- GIVEN Semantic Scholar API가 401/403/429를 반환하는 상황(S2_API_KEY 미설정 또는 무효)
- WHEN `POST /paper/search`로 제목 검색을 시도
- THEN 응답은 502이며 본문은 `{"error": string}`(구체적 원인 메시지 포함)

### Requirement: paper_id 또는 URL로 논문 분석

시스템은 `POST /paper/analyze`에서 `paper_id` 또는 `url` form 필드 중 하나로 논문을 조회해야 한다(SHALL). 조회된 `paperId`에 대해 사용자별 캐시(`paper_history`)에 이미 결과가 있으면 AI 재호출 없이 캐시된 `result`에 `"from_cache": true`를 추가하여 반환해야 한다(SHALL). 캐시 미스 시 초록 기반(또는 초록이 없으면 제목 기반)으로 AI 분석을 수행하고, 저자 최대 3명을 enrich하고, venue로 SJR 품질을 조회하여 결과를 조합한 뒤 `paper_history`에 저장하고 반환해야 한다(SHALL).

#### Scenario: paper_id도 url도 없는 요청
- GIVEN 요청 form에 `paper_id`와 `url`이 모두 없음
- WHEN `POST /paper/analyze` 호출
- THEN 응답 본문은 `{"error": "paper_id 또는 url이 필요합니다."}`
- AND 응답 상태 코드는 200 (코드상 명시적 status_code 지정 없음 — API.md에서도 확인된 기존 동작, 확인 필요 표시하지 않고 코드 그대로 반영)

#### Scenario: paper_id로 캐시 히트
- GIVEN 동일 사용자가 동일 `paper_id`를 이전에 분석해 `paper_history`에 저장됨
- WHEN 같은 `paper_id`로 `POST /paper/analyze` 재호출
- THEN Semantic Scholar나 AI 재호출 없이 캐시된 `result`를 반환
- AND 응답에 `"from_cache": true`가 추가됨

#### Scenario: url로 신규 분석 및 캐시 저장
- GIVEN 캐시에 없는 논문의 URL(예: arxiv 링크)
- WHEN `POST /paper/analyze` (form: url) 호출
- THEN Semantic Scholar에서 paper 조회 후 resolved paper_id로 재차 캐시 확인
- AND 캐시 미스 시 `analyze_paper`(AI), `enrich_authors`, `lookup_venue`를 모두 실행
- AND 응답은 `{"basic": {...}, "analysis": {...}, "authors": [...], "quality": {...}}` 형태
- AND 결과가 `paper_history`에 `user_id`, `query`(url 또는 paper_id), `paper_id`, `title`, `result`로 저장됨

#### Scenario: 논문을 찾지 못한 경우
- GIVEN 존재하지 않는 paper_id 또는 조회 실패하는 URL
- WHEN `POST /paper/analyze` 호출
- THEN 응답 본문은 `{"error": "논문을 찾을 수 없습니다."}` (status_code 미지정, 200)

#### Scenario: analyze 처리 중 예외 발생
- GIVEN Semantic Scholar 또는 AI 호출 중 처리되지 않은 예외가 발생
- WHEN `POST /paper/analyze` 호출
- THEN 응답은 500이며 본문은 `{"error": "서버 오류가 발생했습니다."}`

### Requirement: PDF 업로드 분석

시스템은 `POST /paper/analyze-pdf`에서 업로드된 파일이 PDF가 아니면(`content_type`이 `application/pdf`가 아니고 파일명도 `.pdf`로 끝나지 않으면) 400으로 거부해야 하며(SHALL), 파일 크기가 50MB를 초과하면 400으로 거부해야 한다(SHALL). PDF에서 제목·초록·DOI·arXiv ID·대표 그림(최대 3개)을 추출한 뒤, arXiv ID나 DOI가 있으면 Semantic Scholar 조회를 시도하여 메타데이터를 보강해야 한다(SHALL, 조회 실패는 무시하고 PDF 추출값 사용). 추출/보강된 정보로 AI 분석과 venue 품질 조회를 수행하고, 결과와 함께 추출된 `figures`를 응답에 포함해야 한다(SHALL).

#### Scenario: PDF가 아닌 파일 업로드
- GIVEN 업로드 파일의 `content_type`이 `image/png`이고 파일명이 `chart.png`
- WHEN `POST /paper/analyze-pdf` 호출
- THEN 응답은 400
- AND 본문은 `{"error": "PDF 파일만 지원합니다."}`

#### Scenario: 50MB 초과 PDF 업로드
- GIVEN 업로드 PDF 바이트 크기가 50MB를 초과
- WHEN `POST /paper/analyze-pdf` 호출
- THEN 응답은 400
- AND 본문은 `{"error": "파일이 너무 큽니다 (최대 50MB)."}`

#### Scenario: arXiv ID가 추출된 PDF는 Semantic Scholar로 메타데이터 보강
- GIVEN 업로드 PDF 본문에서 arXiv ID가 정규식으로 추출됨
- WHEN `POST /paper/analyze-pdf` 호출
- THEN `https://arxiv.org/abs/{arxiv_id}` URL로 Semantic Scholar 조회를 시도
- AND 조회 성공 시 title/abstract/doi/venue/year/citationCount/authors가 Semantic Scholar 값으로 덮어써짐(단, Semantic Scholar 값이 없는 필드는 PDF 추출값 유지)

#### Scenario: Semantic Scholar 매칭 실패해도 PDF 추출값으로 분석 진행
- GIVEN PDF에서 arXiv ID/DOI가 없거나 Semantic Scholar 조회가 예외로 실패
- WHEN `POST /paper/analyze-pdf` 호출
- THEN 예외는 무시되고 PDF에서 추출한 title/abstract만으로 AI 분석이 진행됨
- AND `authors`는 빈 배열, `venue`는 빈 문자열로 처리되어 quality 조회 결과도 빈 객체

#### Scenario: 정상 처리 시 그림 포함 응답
- GIVEN 유효한 PDF 업로드
- WHEN `POST /paper/analyze-pdf` 호출이 성공
- THEN 응답은 `{"basic": {...}, "analysis": {...}, "authors": [...], "quality": {...}, "figures": [...]}`
- AND `figures`는 최대 3개, 각 항목은 `page`, `width`, `height`, `caption`, `data`(base64 PNG data URI) 필드를 가짐

#### Scenario: analyze-pdf 처리 중 예외 발생
- GIVEN PDF 파싱 또는 AI 호출 중 처리되지 않은 예외가 발생
- WHEN `POST /paper/analyze-pdf` 호출
- THEN 응답은 500이며 본문은 `{"error": "서버 오류가 발생했습니다."}`

### Requirement: 저널 품질(SJR) 조회

시스템은 venue 문자열이 주어지면 `venue_aliases.json`에서 대소문자 무시 정확 일치로 별칭을 정식 저널명으로 치환을 시도한 뒤, `scimagojr 2025.csv` 데이터에서 정확 일치 또는 단어 단위 Jaccard 유사도 0.6 이상인 최고점 항목을 매칭해야 한다(SHALL). venue가 빈 문자열이면 빈 객체를 반환해야 하며(SHALL), 매칭되는 항목이 없으면 빈 객체를 반환해야 한다(SHALL). 조회 결과는 정규화된 venue명 기준으로 캐시되어야 한다(SHALL).

#### Scenario: 별칭을 통한 저널 매칭
- GIVEN `venue_aliases.json`에 약어 → 정식명 매핑이 존재하고, 입력 venue가 그 약어와 대소문자 무시 일치
- WHEN `lookup_venue(venue)` 호출
- THEN 별칭이 정식명으로 치환된 뒤 CSV에서 매칭 시도
- AND 정식명으로 매칭 실패 시 원래 venue로 재시도

#### Scenario: 매칭 실패 시 빈 객체
- GIVEN venue 문자열이 CSV의 어떤 저널명과도 0.6 이상 유사도를 갖지 않음
- WHEN `lookup_venue(venue)` 호출
- THEN 반환값은 빈 딕셔너리 `{}`

#### Scenario: 정확히 일치하는 저널명
- GIVEN venue 문자열이 CSV의 `Title` 컬럼과 대소문자 무시 정확히 일치
- WHEN `lookup_venue(venue)` 호출
- THEN 즉시 해당 행을 매칭하여 `matched_title`, `sjr`, `quartile`, `issn`, `type`, `country`를 반환

### Requirement: PDF에서 제목/초록/식별자 추출

시스템은 PDF 첫 페이지에서 가장 큰 폰트 크기(최대값의 88% 이상)를 가진 연속된 줄들을 결합하여 제목을 추출해야 한다(SHALL). 초록은 처음 3페이지 텍스트에서 "Abstract" 헤더 뒤 텍스트를(introduction/keywords 등 다음 섹션 헤더 전까지) 순차적으로 3가지 정규식 전략으로 시도하고, 추출된 텍스트가 80자 이상일 때만 유효한 것으로 간주하여 최대 3000자까지 반환해야 한다(SHALL). arXiv ID와 DOI는 각각 정규식으로 첫 2페이지에서 추출해야 한다(SHALL).

#### Scenario: 초록이 80자 미만이면 빈 문자열 반환
- GIVEN 정규식으로 매칭된 "Abstract" 이후 텍스트가 80자 미만
- WHEN `extract_abstract(doc)` 호출
- THEN 반환값은 빈 문자열 `""`(analyze-pdf에서는 이후 제목만으로 AI 분석 진행)

#### Scenario: 하이픈 줄바꿈 제거 및 공백 정규화
- GIVEN 추출된 초록 원문에 `-\n`로 끊긴 단어와 여러 공백/개행이 포함됨
- WHEN `extract_abstract(doc)` 호출
- THEN 하이픈+개행은 제거되어 단어가 이어붙고, 연속 공백은 단일 공백으로 정규화됨

### Requirement: PDF에서 대표 그림 추출

시스템은 PDF 첫 12페이지 내 이미지 중, 크기(가로 200px, 세로 150px 미만 제외), 종횡비(0.3~7 범위 밖 제외), 페이지 대비 면적(3% 미만 제외) 조건을 만족하는 이미지만 후보로 삼아야 한다(SHALL). 각 후보는 80pt 이내 가장 가까운 캡션 텍스트와 매칭되며, 캡션에 "architecture/overview/framework/pipeline" 키워드가 있으면 최우선(300점), "Fig./Figure 1"이면 그다음(200점), 기타 Figure 캡션이면 100점, 캡션 없음은 0점으로 우선순위를 매겨야 한다(SHALL). 우선순위 내림차순, 동일 우선순위 내에서는 이미지 크기 내림차순으로 정렬해 최대 3개를 반환해야 한다(SHALL).

#### Scenario: architecture 캡션을 가진 그림이 최우선으로 선택됨
- GIVEN 페이지에 캡션 "Figure 1" 그림과 캡션 "Figure 3: Overview of our architecture" 그림이 모두 크기 조건을 통과
- WHEN `extract_figures(doc)` 호출
- THEN "Overview of our architecture" 캡션을 가진 그림이 우선순위 300으로 먼저 정렬됨

#### Scenario: 크기 조건 미달 이미지는 후보에서 제외
- GIVEN 이미지 폭이 150px(200px 미만)
- WHEN `extract_figures(doc)` 호출
- THEN 해당 이미지는 후보 목록에 포함되지 않음
