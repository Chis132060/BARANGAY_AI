# Barangay AI · Translation

Self-hosted machine translation for the Barangay AI assistant. Enables resident-facing
Cebuano ↔ English flows: queries are translated to English before RAG retrieval and the
answer is translated back to the resident's language.

Powered by **Lingvanex open models** (from the [lingvanex-mt/models](https://github.com/lingvanex-mt/models)
repository) running on **[CTranslate2](https://github.com/OpenNMT/CTranslate2)** + SentencePiece.
Models run locally; no data leaves the environment. CPU execution by default, with
optional GPU (`TRANSLATION_DEVICE=cuda`) and automatic CPU fallback.

## Why Lingvanex

- Publishes a ready-to-use **English–Cebuano** CTranslate2 model (`en_ceb` / `ceb_en`) — a
  rare fit for the target languages.
- Fully self-hosted (no proprietary translation API).
- The repo is MIT-licensed; **the model artifacts' license/terms are not explicitly
  published** → marked `REQUIRES VERIFICATION` in `docs/OPEN_SOURCE.md`.

## Install

```bash
cd services/ai/translation
python -m venv .venv
.venv\Scripts\activate                              # Windows
# source .venv/bin/activate                         # macOS/Linux
pip install -r requirements.txt -r requirements-dev.txt
```

### Download the Cebuano↔English models (local, not committed)

```bash
python scripts/download_models.py
```

This produces:

```
models/
├── en_ceb/   # model.bin, en.spm.model, ceb.spm.model
└── ceb_en/   # model.bin, ceb.spm.model, en.spm.model
```

## Run

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8002
```

## API

| Method | Path                 | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/translate` | Translate a single text |
| `GET`  | `/api/v1/languages` | Languages + available model pairs |
| `GET`  | `/health`           | Health check |

### `POST /api/v1/translate`

```json
{
  "text": "Asa ko makakuha og barangay clearance?",
  "source_language": "ceb",
  "target_language": "en"
}
```

```json
{
  "success": true,
  "data": { "translation": "Where can I get a barangay clearance?", "source_language": "ceb", "target_language": "en" }
}
```

Error codes: `LANGUAGE_UNSUPPORTED` (422), `EMPTY_INPUT` (422), `TEXT_TOO_LONG` (422),
`SAME_LANGUAGE` (422), `UNSUPPORTED_LANGUAGE` (422), `MODEL_UNAVAILABLE` (503),
`TRANSLATION_FAILED` (502), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

## Resident flow

```
Resident (Cebuano) → translate ceb→en → RAG/AI (English) → translate en→ceb → Resident
```

## Configuration

`.env.example`: `TRANSLATION_MODEL_ROOT`, `TRANSLATION_DEVICE` (cpu|cuda|auto),
`TRANSLATION_COMPUTE_TYPE` (int8), `TRANSLATION_MAX_TEXT_LENGTH`, rate limit.

## Tests

```bash
python -m pytest -q
```

Unit/API tests mock CTranslate2 (no model weights required). Integration tests for real
model execution are documented in `integration/` and run manually after downloading models.

## License

Integration code is part of Barangay AI. **Lingvanex repository: MIT.** Model artifacts:
**REQUIRES VERIFICATION** (vendor does not explicitly state the model/training-data terms).
See `docs/OPEN_SOURCE.md`.