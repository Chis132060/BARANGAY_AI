# Barangay AI · Text-to-Speech

Self-hosted text-to-speech for voice responses in the resident PWA, powered by
**[F5-TTS](https://github.com/SWivid/F5-TTS)** (creative-flow-matching TTS).

The service is deliberately isolated from the Next.js apps — PyTorch / F5-TTS never run
inside the browser or the Next.js runtime. The app layer calls this service over HTTP and
streams generated audio back to the resident.

## Why F5-TTS

- High-quality zero-shot voice cloning from a short reference clip (ideal for a single
  Barangay voice persona).
- **MIT-licensed code**; but **pretrained models are CC-BY-NC** (training data: Emilia) —
  **important**: verify that non-commercial restriction is acceptable for your deployment.
  See `docs/OPEN_SOURCE.md` and the alternatives in `docs/OPEN_SOURCE.md` / Awesome-AI-Voice.

## Requirements

- Python 3.10+
- `requirements-ml.txt` pulls PyTorch (+ CUDA build if you select one) and `f5-tts`.

## Install

```bash
cd services/ai/tts
python -m venv .venv
.venv\Scripts\activate                       # Windows
# source .venv/bin/activate                  # macOS/Linux
pip install -r requirements.txt -r requirements-dev.txt
pip install -r requirements-ml.txt           # heavy: torch + f5-tts
```

F5-TTS downloads its base model checkpoint the first time it loads (HuggingFace Hub cache).
Models and the reference voice live under `models/` and are never committed.

## Run

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8003
```

## API

| Method | Path                          | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/tts/generate`       | Synthesize speech from text |
| `GET`  | `/api/v1/tts/audio/{file_id}`| Stream a generated WAV (`{file_id}` is a 32-hex UUID) |
| `GET`  | `/health`                     | Health check |

### `POST /api/v1/tts/generate`

```json
{ "text": "Your barangay clearance request has been approved." }
```

```json
{
  "success": true,
  "data": { "audio_url": "http://127.0.0.1:8003/api/v1/tts/audio/<32-hex>", "format": "wav", "duration": 4.2, "sample_rate": 24000 }
}
```

Error codes: `EMPTY_INPUT` (422), `TEXT_TOO_LONG` (422), `MODEL_UNAVAILABLE` (503),
`MODEL_CONFIGURATION` (503), `GENERATION_FAILED` (502), `NOT_FOUND` (404), `RATE_LIMITED` (429).

## Isolated-service guarantees

- Model loads **once** and is reused (never per request).
- GPU/CPU selection via `TTS_DEVICE`; CPU fallback is automatic.
- Text validated and length-capped (`TTS_MAX_TEXT_LENGTH`).
- Generation failures are logged **without logging the input text** and returned as a
  safe error — no stack traces, no filesystem paths leaked to clients.
- Audio files served by opaque 32-hex IDs (no path traversal), stored in
  `TTS_OUTPUT_DIR`, auto-cleaned after `TTS_AUDIO_RETENTION_HOURS`.

## Configuration

`.env.example`: `TTS_MODEL_NAME`, `TTS_MODEL_PATH`, `TTS_DEVICE`, `TTS_OUTPUT_DIR`,
`TTS_MAX_TEXT_LENGTH`, `TTS_REF_AUDIO`, `TTS_REF_TEXT`, `TTS_REF_AUDIO_URL`,
`TTS_PUBLIC_BASE_URL`, `TTS_AUDIO_RETENTION_HOURS`, `TTS_RATE_LIMIT_PER_MINUTE`.

## Tests

```bash
python -m pytest -q
```

Unit/API tests mock the F5-TTS model (no torch required). Integration tests that run the
real model live in `integration/` and run manually once weights are downloaded.

## License / public note

Code: MIT. **Pretrained models: CC-BY-NC 4.0 (REQUIRES VERIFICATION for commercial use).**
F5-TTS is MIT software; that does NOT make the model weights MIT. See `docs/OPEN_SOURCE.md`.