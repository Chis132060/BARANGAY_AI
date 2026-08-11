# Barangay AI · AI Services Layer

Isolated Python microservices that provide the AI capabilities for Barangay AI. They are
**not** copied from upstream repositories and they are **not** part of the Next.js apps or
`packages/` — they are separate, self-contained HTTP services with their own dependencies,
Dockerfiles, and tests.

```
Next.js Applications
        │
        ▼
Application / API Layer   (Next.js route handlers, future FastAPI gateway)
        │            ┌───────────────┐
        ▼            ▼               ▼
   Supabase      AI services     (bridge later for RAG ingestion)
   ┌─────────────────────────────────────────────┐
   │  pdf-processor  (OpenDataLoader)  :8001     │
   │  translation    (Lingvanex/CT2)   :8002     │
   │  tts            (F5-TTS)          :8003     │
   └─────────────────────────────────────────────┘
```

Each service communicates through versioned HTTP APIs under `/api/v1/...` and returns a
consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

No stack traces or internal paths are ever returned to clients.

| Service | Purpose | Upstream | License |
| --- | --- | --- | --- |
| `pdf-processor` | PDF → Markdown/JSON/Text/HTML for the RAG pipeline | OpenDataLoader PDF | Apache-2.0 |
| `translation` | Cebuano ↔ English (and more) machine translation | Lingvanex models + CTranslate2 | repo MIT; **models REQUIRES VERIFICATION** |
| `tts` | Text → speech audio | F5-TTS | code MIT; **models CC-BY-NC (REQUIRES VERIFICATION)** |

Full license tracking: [`docs/OPEN_SOURCE.md`](../../docs/OPEN_SOURCE.md).

## Quick start

```bash
npm run ai:setup              # create .venv per service + install runtime deps
npm run ai:dev:pdf            # uvicorn on 8001
npm run ai:dev:translation   # uvicorn on 8002
npm run ai:dev:tts            # uvicorn on 8003

npm run ai:up                 # or build & run everything with Docker Compose
npm run ai:test               # run all service test suites
```

`npm run ai:models` downloads the translation models (en↔ceb). The TTS reference voice and
model checkpoint must be provided locally (see `tts/README.md`).

## Conventions

- Each service has its own `requirements.txt` (Python deps live here, never in the root
  `package.json`).
- Virtual environments are per-service (`.venv/`, gitignored).
- Model weights / generated audio / uploads are never committed (see root `.gitignore`).
- Ports 8001/8002/8003 bind to `127.0.0.1` only in Compose; production should route through
  the application/API layer rather than expose these directly.

## Adding a service

1. Copy the structure of an existing service (`app/`, `tests/`, `requirements*.txt`,
   `Dockerfile`, `.env.example`, `README.md`).
2. Keep the `/api/v1/*` + `/health` convention and the consistency envelope above.
3. Add it to `docker-compose.yml` and to `package.json` scripts.