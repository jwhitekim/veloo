# Veloo

**Languages:** English | [한국어](README_KO.md)

**Live demo:** <https://veloo.2joon.com/> — private beta; sign-up requests are
approved manually, so access isn't instant. It's a personal deployment run on
the maintainer's own API keys and Supabase project — not a shared lab tool.

Doing research usually means bouncing between a PDF reader, a translator, a
notes app, a to-do list, and a calendar — each one forgetting what you were
doing in the last one. Veloo puts the parts that actually matter for reading
and producing research into one workspace, under one login, sharing one
history.

## Features

- [x] **Paper Analyzer** — upload/search a paper, get an AI summary and a
      journal quality score before you invest time reading it
- [x] **Translator** — streaming EN → KO translation tuned for ML/DL/CV/NLP
      writing
- [x] **Contextor** — a term's meaning broken out by which paper/subfield
      you're reading, not one flattened definition
- [x] **Model Review** — upload an architecture diagram, explain it
      yourself, get it graded against an AI reference explanation
- [x] **Plan (Todo + Calendar)** — research tasks with AI-suggested
      breakdowns, plus a drag-and-drop weekly calendar

Every approved account gets all five one click apart at `/:username`,
sharing one login and one history — see [docs/features.md](docs/features.md)
for the full write-up of each module.

## Getting started

**Prerequisites:** Python 3.11, Node.js, and API keys for
[Anthropic Claude](https://console.anthropic.com/) (or
[Gemini](https://ai.google.dev/) as an alternate provider) and
[Supabase](https://supabase.com/) (auth + per-tool history).

```bash
# create .env with ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY, ... (see CLAUDE.md)

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m backend.main          # http://localhost:9000

cd frontend && npm install && npm run dev    # http://localhost:5173
```

Production build check:

```bash
cd frontend && npm run build && cd ..
python -m backend.main
```

```bash
# Docker
docker build -t veloo .
docker run --env-file .env -p 9000:9000 veloo
```

Supabase schema lives in `backend/schema.sql` — run it once in the Supabase
SQL Editor. Full environment variable list is in `CLAUDE.md`.

## Tech stack

- **Backend** — FastAPI, Python 3.11, Uvicorn
- **Frontend** — React 18, TypeScript, Vite
- **AI** — Anthropic Claude, with Gemini as a swappable provider
- **DB** — Supabase (auth + per-tool history)
- **Deploy** — Docker, Cloudflare Tunnel, GitHub Actions

## Docs

- [Feature details](docs/features.md)
- [API spec](docs/API.md)
- [Changelog](CHANGELOG.md)
- [UI design system](docs/ui-design-system.md)

## License

[MIT](LICENSE)
