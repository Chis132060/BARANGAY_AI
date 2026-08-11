# Barangay AI · PDF Processor

Document ingestion service for the Barangay AI RAG pipeline. Converts PDFs into LLM-ready
Markdown / JSON / Text / HTML using **[OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf)**
(Apache-2.0). No parsing is re-implemented here — extraction is delegated to OpenDataLoader,
which performs layout analysis, reading-order reconstruction, table detection and AI-safety
filtering.

## Why OpenDataLoader?

- **Licensing:** Apache-2.0 (permissive, commercial-friendly).
- **Deterministic extraction** without GPU; supports hybrid mode for complex/scanned pages.
- **Structured output** (JSON with per-element bounding boxes + page numbers) that feeds
  semantic chunking and "click-to-source" citation in RAG.
- **Built-in AI-safety filtering** (`sanitize`) strips hidden text, off-page content and
  prompt-injection payloads from untrusted PDFs before they enter the knowledge base.
- Runs 100% locally — no data leaves the environment.

## Requirements

- Python 3.10+
- **Java 11+** (JDK) available on `PATH` at runtime — OpenDataLoader spawns a JVM per `convert()` call.

## Install & Run

```bash
cd services/ai/pdf-processor
python -m venv .venv
.venv\Scripts\activate                                # Windows
# source .venv/bin/activate                           # macOS/Linux
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Verify Java is installed first: `java -version`. On Ubuntu: `sudo apt install openjdk-17-jdk`;
on Windows install a JDK from [Adoptium](https://adoptium.net/).

## API

| Method | Path                          | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/documents/extract`   | Extract text from a PDF at an HTTP(S) URL |
| `POST` | `/api/v1/documents/upload`    | Extract from an uploaded PDF (multipart) |
| `GET`  | `/health`                     | Health check |
| `GET`  | `/docs`                       | OpenAPI UI |

### `POST /api/v1/documents/extract`

```json
{
  "file_url": "https://example.com/policies/orgdinance-2024-001.pdf",
  "output_format": "markdown"
}
```

Response (standard envelope):

```json
{
  "success": true,
  "document": { "title": "orgdinance-2024-001", "content": "# ...", "format": "markdown" },
  "metadata": { "pages": 10, "source": "https://example.com/policies/orgdinance-2024-001.pdf" }
}
```

Failure:

```json
{ "success": false, "error": { "code": "EXTRACTION_FAILED", "message": "..." } }
```

### Error codes

`DOWNLOAD_FAILED`, `PDF_TOO_LARGE` (413), `INVALID_PDF` (422), `EMPTY_DOCUMENT` (422),
`EXTRACTION_FAILED` (502), `EXTRACTION_TIMEOUT` (504), `EXTRACTOR_UNAVAILABLE` (503),
`RATE_LIMITED` (429), `INTERNAL_ERROR` (500). Stack traces are never returned to clients.

## RAG pipeline fit

```
Barangay PDF → pdf-processor (OpenDataLoader) → markdown content + metadata
    → app/api `/ingest` (chunk + embed via GoogleGenerativeAIEmbeddings)
    → Supabase pgvector → RAG retrieval → Barangay AI answer
```

## Security

- HTTP(S) URLs only (rejects `file://` and other schemes).
- File-size guard (`PDF_MAX_BYTES`, default 25 MB) on downloads and uploads.
- In-memory rate limiting per client IP (`PDF_RATE_LIMIT_PER_MINUTE`).
- `sanitize=True` enables OpenDataLoader's prompt-injection / hidden-text filtering.
- Extraction runs in a thread with a hard wall-clock timeout; temp files are always cleaned up.
- Structured JSON logs without request payloads or secrets.

## Tests

```bash
python -m pytest -q
```

Unit/API tests mock the OpenDataLoader boundary (no JDK required). Integration tests that
exercise the real JVM pipeline are run manually once Java is installed — see `integration/`.

## Configuration

See `.env.example`: `PDF_MAX_BYTES`, `PDF_DOWNLOAD_TIMEOUT_SECONDS`,
`PDF_EXTRACTION_TIMEOUT_SECONDS`, `PDF_RATE_LIMIT_PER_MINUTE`.

## License

Integration code in this service is part of Barangay AI. The embedded dependency
**OpenDataLoader PDF is Apache-2.0** (versions < 2.0 were MPL-2.0). See
[`docs/OPEN_SOURCE.md`](../../../docs/OPEN_SOURCE.md) for license details.