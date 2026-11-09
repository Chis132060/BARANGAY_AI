"""Unit tests for Ate Sora TTS contracts (no external provider calls)."""
import base64
import unittest
from routers.tts_router import TTSRequest, _data_url, build_elevenlabs_payload


class TTSContractTests(unittest.TestCase):
    def test_default_language_is_cebuano(self):
        self.assertEqual(TTSRequest(text="Maayong adlaw").language, "ceb")

    def test_all_supported_languages(self):
        for language in ("ceb", "tgl", "en"):
            with self.subTest(language=language):
                self.assertEqual(TTSRequest(text="Hello", language=language).language, language)

    def test_unsupported_language_is_rejected(self):
        with self.assertRaises(ValueError):
            TTSRequest(text="Hello", language="fr")

    def test_elevenlabs_payload_uses_configured_model(self):
        payload = build_elevenlabs_payload("Maayong adlaw", "eleven_v4")
        self.assertEqual(payload["text"], "Maayong adlaw")
        self.assertEqual(payload["model_id"], "eleven_v3")
        self.assertIn("similarity_boost", payload["voice_settings"])
        self.assertNotIn("voice_id", payload)

    def test_audio_data_url_preserves_mime_and_bytes(self):
        encoded = _data_url(b"sample-audio", "audio/mpeg")
        header, data = encoded.split(",", 1)
        self.assertEqual(header, "data:audio/mpeg;base64")
        self.assertEqual(base64.b64decode(data), b"sample-audio")


if __name__ == "__main__":
    unittest.main()
