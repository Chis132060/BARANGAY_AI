"""Service-level tests for the F5-TTS wrapper (mocked model, no torch/f5-tts)."""

import builtins
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from app.config import settings
from app.errors import ServiceError
from app.services.f5tts import tts_service


class FakeF5Model:
    def __init__(self, wav=None, sr=24000, fail=False):
        self.wav = wav if wav is not None else np.linspace(0.0, 0.5, 48000, dtype=np.float32)
        self.sr = sr
        self.fail = fail

    def infer(self, **kwargs):
        if self.fail:
            raise RuntimeError("boom")
        return self.wav, self.sr, None


@pytest.fixture
def config(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "TTS_OUTPUT_DIR", str(tmp_path / "output"))
    ref = tmp_path / "ref.wav"
    sf.write(str(ref), np.zeros(16000, dtype=np.float32), 16000)
    monkeypatch.setattr(settings, "TTS_REF_AUDIO", str(ref))
    monkeypatch.setattr(settings, "TTS_REF_TEXT", "Reference voice prompt.")
    monkeypatch.setattr(settings, "TTS_DEVICE", "cpu")
    tts_service.reset_for_tests()
    return tmp_path


class TestSynthesize:
    def test_valid_text_creates_audio_file(self, config, monkeypatch):
        monkeypatch.setattr(settings, "TTS_REF_AUDIO_URL", "")
        tts_service._model = FakeF5Model()
        result = tts_service.synthesize("Your barangay clearance request has been approved.")
        assert result["format"] == "wav"
        assert result["sample_rate"] == 24000
        assert result["duration"] == pytest.approx(2.0, abs=0.01)
        audio_path = Path(settings.TTS_OUTPUT_DIR) / result["filename"]
        assert audio_path.is_file()
        assert audio_path.stat().st_size > 0

    def test_generation_failure_is_reported(self, config, monkeypatch):
        tts_service._model = FakeF5Model(fail=True)
        with pytest.raises(ServiceError) as ei:
            tts_service.synthesize("hello")
        assert ei.value.code == "GENERATION_FAILED"
        assert ei.value.status_code == 502

    def test_empty_audio_output_fails(self, config, monkeypatch):
        tts_service._model = FakeF5Model(wav=np.array([], dtype=np.float32))
        with pytest.raises(ServiceError) as ei:
            tts_service.synthesize("hello")
        assert ei.value.code == "GENERATION_FAILED"

    def test_missing_reference_voice(self, config, monkeypatch):
        monkeypatch.setattr(settings, "TTS_REF_AUDIO", "")
        monkeypatch.setattr(settings, "TTS_REF_AUDIO_URL", "")
        tts_service._model = FakeF5Model()
        with pytest.raises(ServiceError) as ei:
            tts_service.synthesize("hello")
        assert ei.value.code == "MODEL_CONFIGURATION"


class TestModelLifecycle:
    def test_runtime_missing_yields_model_unavailable(self, config, monkeypatch):
        real_import = builtins.__import__

        def blocked_import(name, *args, **kwargs):
            if name == "f5_tts" or name.startswith("f5_tts."):
                raise ImportError("blocked for tests")
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", blocked_import)
        tts_service.reset_for_tests()
        with pytest.raises(ServiceError) as ei:
            tts_service._load_model()
        assert ei.value.code == "MODEL_UNAVAILABLE"
        assert ei.value.status_code == 503

    def test_cuda_request_falls_back_to_cpu_without_torch(self, config, monkeypatch):
        monkeypatch.setattr(settings, "TTS_DEVICE", "cuda")
        real_import = builtins.__import__

        def blocked_import(name, *args, **kwargs):
            if name == "torch":
                raise ImportError("no torch in tests")
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", blocked_import)
        assert tts_service._resolve_device() == "cpu"

    def test_cpu_request_stays_cpu(self, config, monkeypatch):
        monkeypatch.setattr(settings, "TTS_DEVICE", "cpu")
        assert tts_service._resolve_device() == "cpu"