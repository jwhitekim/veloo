# Veloo

**언어:** [English](README.md) | 한국어

**라이브 데모:** <https://veloo.2joon.com/> — 프라이빗 베타로 운영 중이며, 가입 신청 후 관리자의 승인이 필요합니다. 연구실 공용 도구가 아닌 관리자 개인의 API 키와 Supabase 프로젝트로 운영되는 개인용 배포 버전입니다.

연구를 진행하다 보면 PDF 리더, 번역기, 메모 앱, 할 일 목록, 캘린더를 계속 오가게 되고, 그때마다 방금 작업하던 맥락을 다시 설명해야 하는 번거로움이 발생합니다. Veloo는 논문을 읽고 연구 결과물을 만드는 데 실제로 필요한 핵심 기능들을 하나의 작업 공간, 하나의 로그인, 하나의 히스토리 아래로 통합합니다.

## 기능

- [x] **Paper Analyzer** — 논문을 업로드하거나 검색하여 AI 요약과 저널 품질 점수를 먼저 확인한 뒤 읽을지 판단
- [x] **Translator** — ML(Machine Learning)/DL(Deep Learning)/CV(Computer Vision)/NLP(Natural Language Processing) 논문에 최적화된 영-한 스트리밍 번역
- [x] **Contextor** — 용어의 정의를 하나로 뭉뚱그리지 않고 논문 및 분야별 맥락에 맞게 분리하여 제공
- [x] **Model Review** — 아키텍처 구조도를 직접 설명해 보고 AI 레퍼런스와 비교하여 채점
- [x] **Plan (할 일 + 캘린더)** — AI가 제안하는 단계별 작업 분해와 드래그 앤 드롭 지원 주간 캘린더

승인된 계정은 `/:username` 경로에서 클릭 한 번으로 5가지 도구를 전환할 수 있으며, 로그인 상태와 작업 히스토리가 공유됩니다. 모듈별 상세 설명은 [docs/features_ko.md](docs/features_ko.md)를 참고해 주세요.

## 시작하기

**사전 준비:** Python 3.11, Node.js, [Anthropic Claude](https://console.anthropic.com/) API 키(또는 대체 프로바이더인 [Gemini](https://ai.google.dev/)), [Supabase](https://supabase.com/)(인증 + 도구별 히스토리 관리).

```bash
# .env에 ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY 등 입력 (CLAUDE.md 참고)

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m backend.main          # http://localhost:9000

cd frontend && npm install && npm run dev    # http://localhost:5173
```

프로덕션 빌드 확인:

```bash
cd frontend && npm run build && cd ..
python -m backend.main
```

```bash
# Docker
docker build -t veloo .
docker run --env-file .env -p 9000:9000 veloo
```

Supabase 스키마는 `backend/schema.sql`에 위치해 있으며, Supabase SQL(Structured Query Language) Editor에서 한 번 실행해 주시면 됩니다. 전체 환경변수 목록은 `CLAUDE.md`를 참고하세요.

## 기술 스택

- **Backend** — FastAPI, Python 3.11, Uvicorn
- **Frontend** — React 18, TypeScript, Vite
- **AI** — Anthropic Claude, 교체 가능한 프로바이더로 Gemini
- **DB** — Supabase (인증 + 도구별 히스토리)
- **Deploy** — Docker, Cloudflare Tunnel, GitHub Actions

## 문서

- [기능 상세](docs/features_ko.md)
- [스펙(API, 제품, 모바일 내비게이션)](docs/specs/)
- [Changelog](CHANGELOG.md)
- [UI 디자인 시스템](docs/ui-design-system.md)

## 라이선스

[MIT (Massachusetts Institute of Technology License)](LICENSE)
