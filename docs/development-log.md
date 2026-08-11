# Development Log

> Complete, auditable timeline of Barangay AI development history.
> All timestamps are in **Asia/Manila (UTC+8)**. Entries are chronological, newest at the bottom.

### Rules

1. Create a new log entry immediately after completing a meaningful development task.
2. Record the **exact date and time** of the task.
3. Use `Asia/Manila (UTC+8)` for all timestamps.
4. Never fabricate timestamps.
5. Never claim a file was changed if it was not actually changed.
6. Include the exact file paths whenever possible.
7. If multiple related files are changed in one task, include all of them.
8. Separate independent tasks into separate log entries.
9. If a task fails, log it with `Status: Failed` and document the error.
10. If work is partially completed, use `Status: In Progress`.
11. Record important architectural or technical decisions in the Notes section.
12. Keep entries concise but technically specific.
13. Do not overwrite previous entries.
14. Treat this file as a permanent development history for the project.

---

## 2026-08-11

### [09:16:52] — TTS service test suite brought green

- **Timezone:** Asia/Manila (UTC+8)
- **Action:** Fixed
- **Module:** `services/ai/tts` — test suite + dev dependencies
- **Files Changed:**
  - `services/ai/tts/requirements-dev.txt`
  - `services/ai/tts/tests/test_api.py`
- **Details:** Added `httpx` to dev requirements (newer Starlette requires it for `TestClient`). Fixed the audio-traversal test: previously a raw `..` URL was normalized by `httpx` before reaching the route (producing FastAPI's default 404 instead of our envelope), and a URL-encoded `..%2F` was decoded into an extra path segment that bypassed the route handler entirely. Replaced with a single-segment invalid-id case (exercises the 32-hex regex rejection) plus a separate encoded-traversal case asserting a 404. First run logged at `09:16:52` (18 passed).
- **Reason:** `httpx2`-era Starlette requires `httpx` for `TestClient`; the path-traversal test previously asserted a code path that was never reached.
- **Status:** Completed
- **Dependencies:** FastAPI/Starlette with `TestClient`; per-service `.venv` already provisioned.
- **Notes:** The earlier URL-encoded variant (`%2e%2e%2fsecret`) still 404'd at the routing layer before our handler — the `%2f` decoded to a separator. The regex guard in `app/routes/speech.py` remains the defense-in-depth check.

---

### [09:28:06] — pdf-processor and translation test suites fixed and run

- **Timezone:** Asia/Manila (UTC+8)
- **Action:** Fixed
- **Module:** `services/ai/pdf-processor`, `services/ai/translation` — error handling, rate limiting, service validation, test harness
- **Files Changed:**
  - `services/ai/pdf-processor/app/main.py`
  - `services/ai/pdf-processor/app/ratelimit.py`
  - `services/ai/pdf-processor/app/services/opendataloader.py`
  - `services/ai/pdf-processor/tests/test_api.py`
  - `services/ai/translation/app/main.py`
  - `services/ai/translation/app/ratelimit.py`
  - `services/ai/translation/requirements-dev.txt`
  - `services/ai/translation/tests/test_api.py`
  - `services/ai/translation/tests/test_lingvanex.py`
- **Details:** Five root causes fixed:
  1. `RequestValidationError` handlers returned raw pydantic v2 `exc.errors()`, whose `ctx` embeds live exception objects (e.g. `ValueError`) that were not JSON-serializable — the handler itself crashed, escalating to a 500. Handlers now pass `jsonable_encoder(exc.errors())`.
  2. Test clients created with `raise_server_exceptions=True` re-raised handled 500s instead of returning our JSON envelope. Both `test_api.py` files now use `TestClient(app, raise_server_exceptions=False)`.
  3. The module-level rate limiter is a process-wide singleton, so budget accumulated across tests for the shared `testclient` key; a rate-limit test that lowered the cap was immediately 429'd. Added `RateLimiter.reset()` and called it in the autouse fixtures.
  4. `pdf_service.extract_from_bytes(...)` with `docx` raised a raw `KeyError` from `_FORMAT_SPECS[output_format]`. `_extract_content` now validates the format first and raises `ServiceError("INVALID_FORMAT", 422)`.
  5. The Lingvanex `_cache` is a service-level cache that persisted loaded models between tests, so the patched-failure test never invoked `_load_model`. The `mock_model` fixture now clears `_cache`.
  Added `httpx` to translation dev requirements. Both suites run green (first run logged `09:28:06/07`: pdf 30 passed, translation 15 passed + 2 then failing on shared-state issues resolved above).
- **Reason:** The suites failed under current FastAPI/Starlette/pydantic versions and cross-test state leakage; the intended behaviour is a consistent success/error envelope with no stack/exception serialization leaks.
- **Status:** Completed
- **Dependencies:** FastAPI ≥0.110, Starlette `TestClient` (httpx), pydantic v2, current `requirements.txt` matrices.
- **Notes:** `jsonable_encoder` coerces exception objects in `ctx` to strings — keeps serialization safe without leaking internals. ServerErrorMiddleware always re-raises to the server after sending the 500 response; that is exactly why the test clients needed `raise_server_exceptions=False`.

---

### [18:25:52] — AI layer wiring verified and scripts pointed at service venvs

- **Timezone:** Asia/Manila (UTC+8)
- **Action:** Modified / Configured
- **Module:** Root workspace scripts (`package.json`)
- **Files Changed:**
  - `package.json`
- **Details:** Re-ran the full root suite `npm run ai:test`, which confirmed docker-compose had already carried the `tts` service (port 8003, volumes, healthcheck) and discovery now resolves the shared pre-existing `docs/OPEN_SOURCE.md` gap (see next entry). Found the `ai:test:*` and `ai:dev:*` scripts invoked bare `python`, which picked up the global interpreter instead of each service `.venv` where the dependencies live. Updated all six scripts to reference `.venv\Scripts\python.exe`.
- **Reason:** `npm run ai:test` failed with `No module named pytest` because the venv interpreter was never selected; tests need to run against the provisioned per-service environments.
- **Status:** Completed
- **Dependencies:** Per-service `.venv` environments created by `scripts/setup_ai_venvs.py`; npm ≥10.
- **Notes:** Windows-only venv path uses `Scripts\python.exe`; macOS/Linux would use `.venv/bin/python`. If cross-platform support is needed, introduce a small env-agnostic runner script.

---

### [18:26:30] — Open-source & model-license compliance document created

- **Timezone:** Asia/Manila (UTC+8)
- **Action:** Created
- **Module:** `docs/` — compliance documentation
- **Files Changed:**
  - `docs/OPEN_SOURCE.md`
- **Details:** Created a centralized license review covering all first-party code, AI-service runtime libraries (FastAPI, OpenDataLoader PDF, CTranslate2, SentencePiece, F5-TTS code, PyTorch, soundfile), and — critically — the pretrained-model red zone: F5-TTS weights (`F5TTS_v1_Base`, E2-TTS) are **CC-BY-NC 4.0** (non-commercial), and Lingvanex `en_ceb`/`ceb_en` zip terms require verification. Documents the NC implications for a government/civic deployment and lists permissive alternatives (OPUS-MT for translation, self-trained VITS/XTTS-style models for TTS), plus a compliance process (license scanners before release, weights never committed).
- **Reason:** The service READMEs already referenced `docs/OPEN_SOURCE.md`; the F5-TTS model-license caveat is a genuine compliance risk for the LGU use case and needed to be recorded in one auditable place.
- **Status:** Completed
- **Dependencies:** Service inventory from `services/ai/*/README.md`; prior licensing decisions in `docs/ROADMAP.md`.
- **Notes:** The code-vs-weights distinction is the central risk: MIT/Apache code does not make model weights permissive. Recommended follow-up: run `license-checker` and `pip-licenses` and attach manifests before release.

---

### [18:27:12] — Development log established

- **Timezone:** Asia/Manila (UTC+8)
- **Action:** Created
- **Module:** `docs/` — project development history
- **Files Changed:**
  - `docs/development-log.md`
- **Details:** Created this file with the chronological entry format and session-summary convention per project rules. Backfilled the verified entries for 2026-08-11. Timestamps for earlier-in-session file-writing steps were not individually captured, so entries are anchored to the verified environment-clock test-run timestamps (`09:16:52`, `09:28:06/07`) and the current verified time for present actions; no fabricated times are used.
- **Reason:** Provide a complete, auditable timeline of the project's development history as required.
- **Status:** Completed
- **Dependencies:** None.
- **Notes:** Prior history (work before 2026-08-11) is not yet logged; when reconstructing it, only use verifiable timestamps or mark entries `In Progress`/unspecified rather than inventing times.

---

## Session Summary

- **Date:** 2026-08-11
- **Session Start:** 09:16:52
- **Session End:** 18:27:12
- **Tasks Completed:** 5
- **Files Created:** 1
- **Files Modified:** 12
- **Files Deleted:** 0
- **Major Changes:**
  - Brought all three AI-service test suites green (pdf 30 / translation 17 / tts 18 passed) via `npm run ai:test`
  - Fixed the pydantic v2 validation-error serialization crash in pdf-processor and translation
  - Added `RateLimiter.reset()` to prevent cross-test rate-limit leakage
  - Made the Lingvanex `mock_model` fixture reset the model cache so failure-path tests execute
  - Added format validation (`INVALID_FORMAT`) to the pdf processor service boundary
  - Pointed root `ai:dev:*` / `ai:test:*` scripts at the per-service `.venv` python
  - Created `docs/OPEN_SOURCE.md` model/license compliance documentation
- **Remaining Tasks:**
  - Backfill development-log entries for pre-2026-08-11 history using only verifiable timestamps
  - Run `license-checker` (npm) and `pip-licenses` and attach manifests to `docs/OPEN_SOURCE.md`
  - Decide/commercial-verify F5-TTS (CC-BY-NC) and Lingvanex model terms before any LGU deployment
  - Cross-platform venv path handling for `ai:*` npm scripts (macOS/Linux)
- **Blockers:** None