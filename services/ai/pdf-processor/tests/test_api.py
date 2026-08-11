"""API tests for the PDF processor using FastAPI TestClient with mocked extraction."""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.errors import ServiceError
from app.main import app
from app.ratelimit import rate_limiter
from app.services.opendataloader import pdf_service

# raise_server_exceptions=False lets tests assert on the 5xx JSON envelope instead of
# the test client re-raising the underlying exception.
client = TestClient(app, raise_server_exceptions=False)

FAKE_SOURCE = "https://foo.example/orgdinance-2024-001.pdf"


def _canned_result(**overrides):
    result = {
        "title": "ordnance-2024-001",
        "content": "# Barangay Ordinance 2024-001\nThis is a test.",
        "format": "markdown",
        "pages": 3,
        "source": FAKE_SOURCE,
    }
    result.update(overrides)
    return result


@pytest.fixture(autouse=True)
def _reset_rate_limit(monkeypatch):
    # Give tests a generous rate limit window by default.
    rate_limiter.reset()
    monkeypatch.setattr(settings, "PDF_RATE_LIMIT_PER_MINUTE", 100)


class TestExtractEndpoint:
    def test_extract_success(self, monkeypatch):
        async def fake_extract(url, fmt):
            return _canned_result()

        monkeypatch.setattr(pdf_service, "extract_from_url", fake_extract)
        resp = client.post(
            "/api/v1/documents/extract",
            json={"file_url": FAKE_SOURCE, "output_format": "markdown"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["document"]["content"].startswith("# Barangay Ordinance")
        assert body["document"]["format"] == "markdown"
        assert body["metadata"]["pages"] == 3
        assert body["metadata"]["source"] == FAKE_SOURCE

    def test_extract_default_format(self, monkeypatch):
        async def fake_extract(url, fmt):
            assert fmt == "markdown"
            return _canned_result()

        monkeypatch.setattr(pdf_service, "extract_from_url", fake_extract)
        resp = client.post("/api/v1/documents/extract", json={"file_url": FAKE_SOURCE})
        assert resp.status_code == 200

    def test_extract_rejects_unsupported_format(self, monkeypatch):
        resp = client.post(
            "/api/v1/documents/extract",
            json={"file_url": FAKE_SOURCE, "output_format": "docx"},
        )
        assert resp.status_code == 422
        assert resp.json()["success"] is False

    def test_extract_rejects_non_http_url(self, monkeypatch):
        resp = client.post(
            "/api/v1/documents/extract",
            json={"file_url": "file:///etc/passwd"},
        )
        assert resp.status_code == 422
        assert resp.json()["success"] is False

    def test_extract_rejects_empty_url(self, monkeypatch):
        resp = client.post("/api/v1/documents/extract", json={"file_url": ""})
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "code,status",
        [
            ("DOWNLOAD_FAILED", 502),
            ("PDF_TOO_LARGE", 413),
            ("INVALID_PDF", 422),
            ("EXTRACTION_FAILED", 502),
            ("EXTRACTION_TIMEOUT", 504),
            ("EMPTY_DOCUMENT", 422),
            ("EXTRACTOR_UNAVAILABLE", 503),
        ],
    )
    def test_service_errors_become_envlope(self, monkeypatch, code, status):
        async def failing(url, fmt):
            raise ServiceError(code, "boom", status)

        monkeypatch.setattr(pdf_service, "extract_from_url", failing)
        resp = client.post("/api/v1/documents/extract", json={"file_url": FAKE_SOURCE})
        assert resp.status_code == status
        body = resp.json()
        assert body["success"] is False
        assert body["error"]["code"] == code
        assert isinstance(body["error"]["message"], str)

    def test_unhandled_errors_never_leak_stack_traces(self, monkeypatch):
        async def exploding(url, fmt):
            raise RuntimeError("sensitive internal detail")

        monkeypatch.setattr(pdf_service, "extract_from_url", exploding)
        resp = client.post("/api/v1/documents/extract", json={"file_url": FAKE_SOURCE})
        assert resp.status_code == 500
        body = resp.json()
        assert body["success"] is False
        assert body["error"]["code"] == "INTERNAL_ERROR"
        assert "RuntimeError" not in body["error"]["message"]
        assert "sensitive" not in body["error"]["message"]


class TestUploadEndpoint:
    def test_upload_success(self, monkeypatch):
        async def fake_from_bytes(data, fmt):
            return _canned_result(source=None, title=None)

        monkeypatch.setattr(pdf_service, "extract_from_bytes", fake_from_bytes)
        resp = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_upload_rejects_wrong_content_type(self, monkeypatch):
        resp = client.post(
            "/api/v1/documents/upload",
            files={"file": ("bad.txt", b"hello", "text/plain")},
        )
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_PDF"

    def test_upload_oversized(self, monkeypatch):
        monkeypatch.setattr(settings, "PDF_MAX_BYTES", 10)
        resp = client.post(
            "/api/v1/documents/upload",
            files={"file": ("big.pdf", b"%PDF-1.4" + b"x" * 50, "application/pdf")},
        )
        assert resp.status_code == 413
        assert resp.json()["error"]["code"] == "PDF_TOO_LARGE"


class TestHealthAndRateLimit:
    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["status"] == "healthy"

    def test_rate_limit(self, monkeypatch):
        monkeypatch.setattr(settings, "PDF_RATE_LIMIT_PER_MINUTE", 2)

        async def fake_extract(url, fmt):
            return _canned_result()

        monkeypatch.setattr(pdf_service, "extract_from_url", fake_extract)

        payload = {"file_url": FAKE_SOURCE}
        assert client.post("/api/v1/documents/extract", json=payload).status_code == 200
        assert client.post("/api/v1/documents/extract", json=payload).status_code == 200
        blocked = client.post("/api/v1/documents/extract", json=payload)
        assert blocked.status_code == 429
        assert blocked.json()["error"]["code"] == "RATE_LIMITED"