"""API tests for the translation service (mocked model boundary)."""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.errors import ServiceError
from app.main import app
from app.ratelimit import rate_limiter
from app.services.lingvanex import translation_service

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _defaults(monkeypatch):
    rate_limiter.reset()
    monkeypatch.setattr(settings, "TRANSLATION_RATE_LIMIT_PER_MINUTE", 100)
    monkeypatch.setattr(settings, "TRANSLATION_MAX_TEXT_LENGTH", 1000)


class TestTranslateEndpoint:
    def test_english_to_cebuano(self, monkeypatch):
        monkeypatch.setattr(
            translation_service,
            "translate",
            lambda text, src, tgt: "Asa ko makakuha og barangay clearance?",
        )
        resp = client.post(
            "/api/v1/translate",
            json={"text": "Where can I get a barangay clearance?", "source_language": "en", "target_language": "ceb"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["translation"] == "Asa ko makakuha og barangay clearance?"
        assert body["data"]["source_language"] == "en"
        assert body["data"]["target_language"] == "ceb"

    def test_cebuano_to_english(self, monkeypatch):
        monkeypatch.setattr(
            translation_service,
            "translate",
            lambda text, src, tgt: "Where can I get a barangay clearance?",
        )
        resp = client.post(
            "/api/v1/translate",
            json={"text": "Asa ko makakuha og barangay clearance?", "source_language": "ceb", "target_language": "en"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["translation"].startswith("Where")

    def test_empty_input(self, monkeypatch):
        resp = client.post(
            "/api/v1/translate",
            json={"text": "   ", "source_language": "ceb", "target_language": "en"},
        )
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "EMPTY_INPUT"

    def test_excessive_input(self, monkeypatch):
        monkeypatch.setattr(settings, "TRANSLATION_MAX_TEXT_LENGTH", 10)
        resp = client.post(
            "/api/v1/translate",
            json={"text": "this text is definitely longer than ten characters", "source_language": "ceb", "target_language": "en"},
        )
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "TEXT_TOO_LONG"

    def test_unsupported_language(self, monkeypatch):
        resp = client.post(
            "/api/v1/translate",
            json={"text": "hello", "source_language": "xx", "target_language": "en"},
        )
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "UNSUPPORTED_LANGUAGE"

    def test_same_language(self, monkeypatch):
        resp = client.post(
            "/api/v1/translate",
            json={"text": "hello", "source_language": "en", "target_language": "en"},
        )
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "SAME_LANGUAGE"

    def test_model_unavailable(self, monkeypatch):
        def failing(text, src, tgt):
            raise ServiceError("MODEL_UNAVAILABLE", "model missing", 503)

        monkeypatch.setattr(translation_service, "translate", failing)
        resp = client.post(
            "/api/v1/translate",
            json={"text": "hello", "source_language": "en", "target_language": "ceb"},
        )
        assert resp.status_code == 503
        assert resp.json()["error"]["code"] == "MODEL_UNAVAILABLE"

    def test_rate_limited(self, monkeypatch):
        monkeypatch.setattr(settings, "TRANSLATION_RATE_LIMIT_PER_MINUTE", 1)
        monkeypatch.setattr(
            translation_service,
            "translate",
            lambda text, src, tgt: "ok",
        )
        payload = {"text": "hello", "source_language": "en", "target_language": "ceb"}
        assert client.post("/api/v1/translate", json=payload).status_code == 200
        blocked = client.post("/api/v1/translate", json=payload)
        assert blocked.status_code == 429
        assert blocked.json()["error"]["code"] == "RATE_LIMITED"


class TestDiscoveryAndHealth:
    def test_languages_endpoint(self, monkeypatch):
        monkeypatch.setattr(
            translation_service,
            "available_pairs",
            lambda: [{"source": "en", "target": "ceb"}, {"source": "ceb", "target": "en"}],
        )
        resp = client.get("/api/v1/languages")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert "ceb" in body["data"]["languages"]
        assert {"source": "en", "target": "ceb"} in body["data"]["pairs"]

    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["status"] == "healthy"