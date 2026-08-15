"""API tests for the TTS service (mocked model boundary)."""

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from app.config import settings
from app.errors import ServiceError
from app.main import app
from app.services.f5tts import tts_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def _defaults(monkeypatch):
    monkeypatch.setattr(settings, "TTS_RATE_LIMIT_PER_MINUTE", 100)
    monkeypatch.setattr(settings, "TTS_MAX_TEXT_LENGTH", 1000)
    monkeypatch.setattr(settings, "TTS_PUBLIC_BASE_URL", "")


def _canned_result(**overrides):
    result = {
        "file_id": "a" * 32,
        "filename": "a" * 32 + ".wav",
        "format": "wav",
        "duration": 4.2,
        "sample_rate": 24000,
    }
    result.update(overrides)
    return result


class TestGenerateEndpoint:
    def test_generate_valid_text(self, monkeypatch):
        monkeypatch.setattr(tts_service, "synthesize", lambda text: _canned_result())
        resp = client.post("/api/v1/tts/generate", json={"text": "Your barangay clearance has been approved."})
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["audio_url"].endswith(f"/api/v1/tts/audio/{'a' * 32}")
        assert body["data"]["format"] == "wav"
        assert body["data"]["duration"] == 4.2
        assert body["data"]["sample_rate"] == 24000

    def test_generate_empty_text(self, monkeypatch):
        resp = client.post("/api/v1/tts/generate", json={"text": "   "})
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "EMPTY_INPUT"

    def test_generate_excessive_text(self, monkeypatch):
        monkeypatch.setattr(settings, "TTS_MAX_TEXT_LENGTH", 5)
        resp = client.post("/api/v1/tts/generate", json={"text": "this is way too long"})
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "TEXT_TOO_LONG"

    def test_model_unavailable(self, monkeypatch):
        def failing(text):
            raise ServiceError("MODEL_UNAVAILABLE", "not installed", 503)

        monkeypatch.setattr(tts_service, "synthesize", failing)
        resp = client.post("/api/v1/tts/generate", json={"text": "hello"})
        assert resp.status_code == 503
        assert resp.json()["error"]["code"] == "MODEL_UNAVAILABLE"

    def test_generation_failure(self, monkeypatch):
        def failing(text):
            raise ServiceError("GENERATION_FAILED", "boom", 502)

        monkeypatch.setattr(tts_service, "synthesize", failing)
        resp = client.post("/api/v1/tts/generate", json={"text": "hello"})
        assert resp.status_code == 502
        assert resp.json()["error"]["code"] == "GENERATION_FAILED"
        assert "boom" in resp.json()["error"]["message"]

    def test_missing_configuration(self, monkeypatch):
        def failing(text):
            raise ServiceError("MODEL_CONFIGURATION", "reference voice required", 503)

        monkeypatch.setattr(tts_service, "synthesize", failing)
        resp = client.post("/api/v1/tts/generate", json={"text": "hello"})
        assert resp.status_code == 503
        assert resp.json()["error"]["code"] == "MODEL_CONFIGURATION"


class TestAudioServing:
    def test_audio_file_served(self, tmp_path, monkeypatch):
        file_id = "b" * 32
        out_dir = tmp_path / "out"
        out_dir.mkdir()
        wav_path = out_dir / f"{file_id}.wav"
        sf.write(str(wav_path), np.zeros(8000, dtype=np.float32), 16000)

        monkeypatch.setattr(settings, "TTS_OUTPUT_DIR", str(out_dir))
        resp = client.get(f"/api/v1/tts/audio/{file_id}")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("audio/wav")
        assert len(resp.content) > 0

    def test_audio_invalid_id(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "TTS_OUTPUT_DIR", str(tmp_path))
        # Not a 32-hex id → rejected by the regex before any file access.
        resp = client.get("/api/v1/tts/audio/THIS-IS-NOT-A-VALID-FILE-ID!!")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "NOT_FOUND"

    def test_audio_path_traversal_is_404(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "TTS_OUTPUT_DIR", str(tmp_path))
        # Historically these could probe filesystem paths; httpx normalizes ".." but the
        # route still maps to {file_id}. Whatever path is produced must never serve a file.
        resp = client.get("/api/v1/tts/audio/..%2F..%2Fetc%2Fpasswd")
        assert resp.status_code == 404

    def test_audio_missing_file(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "TTS_OUTPUT_DIR", str(tmp_path))
        resp = client.get(f"/api/v1/tts/audio/{'c' * 32}")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "NOT_FOUND"


class TestHealth:
    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["status"] == "healthy"