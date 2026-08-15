"""Service-level tests for the Lingvanex translation wrapper (mocked models)."""

import pytest
from types import SimpleNamespace

from app.config import settings
from app.errors import ServiceError
from app.services.lingvanex import translation_service

MODEL_ROOT = "models"


class FakeTranslator:
    def __init__(self, hypothesis_text: str):
        self.hypothesis = hypothesis_text

    def translate_batch(self, *args, **kwargs):
        return [SimpleNamespace(hypotheses=[[self.hypothesis]])]


class FakeSPM:
    def EncodeAsPieces(self, texts):
        return [["piece_one", "piece_two"] for _ in texts]

    def DecodePieces(self, token_lists):
        return [" ".join(tokens) for tokens in token_lists]


@pytest.fixture
def mock_model(monkeypatch):
    def fake_load(source, target):
        return FakeTranslator(f"translated_{source}_to_{target}"), FakeSPM(), FakeSPM()

    monkeypatch.setattr(translation_service, "_load_model", fake_load)
    monkeypatch.setattr(translation_service, "is_pair_available", lambda s, t: True)
    translation_service._cache.clear()
    return translation_service


class TestTranslate:
    def test_english_to_cebuano(self, mock_model):
        result = translation_service.translate("Where can I get a barangay clearance?", "en", "ceb")
        assert "translated_en_to_ceb" in result

    def test_cebuano_to_english(self, mock_model):
        result = translation_service.translate("Asa ko makakuha og barangay clearance?", "ceb", "en")
        assert "translated_ceb_to_en" in result

    def test_unsupported_pair(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "TRANSLATION_MODEL_ROOT", str(tmp_path))
        with pytest.raises(ServiceError) as ei:
            translation_service.translate("hello", "en", "ceb")
        assert ei.value.code == "LANGUAGE_UNSUPPORTED"
        assert ei.value.status_code == 422

    def test_model_unavailable(self, mock_model, monkeypatch):
        def failing_load(source, target):
            raise ServiceError("MODEL_UNAVAILABLE", "cannot load", 503)

        monkeypatch.setattr(translation_service, "_load_model", failing_load)
        with pytest.raises(ServiceError) as ei:
            translation_service.translate("hello", "en", "ceb")
        assert ei.value.code == "MODEL_UNAVAILABLE"
        assert ei.value.status_code == 503


class TestModelDiscovery:
    def test_is_pair_available_with_real_files(self, tmp_path):
        (tmp_path / "en_ceb").mkdir(parents=True)
        (tmp_path / "en_ceb" / "model.bin").write_bytes(b"x")
        monkeypatch = pytest.MonkeyPatch()
        monkeypatch.setattr(settings, "TRANSLATION_MODEL_ROOT", str(tmp_path))
        try:
            assert translation_service.is_pair_available("en", "ceb") is True
            assert translation_service.is_pair_available("ceb", "en") is False
        finally:
            monkeypatch.undo()

    def test_available_pairs_scans_disk(self, tmp_path):
        for pair in ("en_ceb", "ceb_en"):
            (tmp_path / pair).mkdir(parents=True)
            (tmp_path / pair / "model.bin").write_bytes(b"x")
        monkeypatch = pytest.MonkeyPatch()
        monkeypatch.setattr(settings, "TRANSLATION_MODEL_ROOT", str(tmp_path))
        try:
            pairs = translation_service.available_pairs()
            assert {"source": "en", "target": "ceb"} in pairs
            assert {"source": "ceb", "target": "en"} in pairs
        finally:
            monkeypatch.undo()

    def test_available_pairs_missing_root(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "TRANSLATION_MODEL_ROOT", str(tmp_path / "nope"))
        assert translation_service.available_pairs() == []