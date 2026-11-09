"""Unit tests for Ate Sora TTS contracts and provider fallback behavior."""
import base64
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from routers import tts_router
from routers.tts_router import TTSRequest, _data_url, build_elevenlabs_payload, generate_tts


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

    def test_elevenlabs_v3_payload_uses_configured_model_without_unsupported_settings(self):
        payload = build_elevenlabs_payload("Maayong adlaw", "eleven_v3")
        self.assertEqual(payload["text"], "Maayong adlaw")
        self.assertEqual(payload["model_id"], "eleven_v3")
        self.assertEqual(payload["language_code"], "ceb")
        self.assertNotIn("voice_settings", payload)
        self.assertNotIn("voice_id", payload)

    def test_legacy_multilingual_model_includes_voice_settings(self):
        payload = build_elevenlabs_payload("Maayong adlaw", "eleven_multilingual_v2")
        self.assertEqual(payload["model_id"], "eleven_multilingual_v2")
        self.assertEqual(payload["language_code"], "ceb")
        self.assertIn("similarity_boost", payload["voice_settings"])

    def test_tagalog_uses_elevenlabs_filipino_language_code(self):
        payload = build_elevenlabs_payload("Magandang araw", "eleven_v3", "tgl")
        self.assertEqual(payload["language_code"], "fil")

    def test_english_uses_english_language_code(self):
        payload = build_elevenlabs_payload("Hello", "eleven_v3", "en")
        self.assertEqual(payload["language_code"], "en")

    def test_audio_data_url_preserves_mime_and_bytes(self):
        encoded = _data_url(b"sample-audio", "audio/mpeg")
        header, data = encoded.split(",", 1)
        self.assertEqual(header, "data:audio/mpeg;base64")
        self.assertEqual(base64.b64decode(data), b"sample-audio")


class TTSFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_primary_provider_is_used_before_fallback(self):
        primary = AsyncMock(return_value={"success": True, "data": {"source": "elevenlabs"}})
        fallback = AsyncMock(return_value={"success": True, "data": {"source": "gemini"}})
        request = TTSRequest(text="Maayong adlaw")
        with (
            patch.object(tts_router.settings, "TTS_PROVIDER", "elevenlabs"),
            patch.object(tts_router.settings, "TTS_FALLBACK_PROVIDERS", "gemini,openai"),
            patch.dict(tts_router.PROVIDERS, {"elevenlabs": primary, "gemini": fallback}),
        ):
            result = await generate_tts(request)
        primary.assert_awaited_once_with(request)
        fallback.assert_not_awaited()
        self.assertEqual(result["data"]["source"], "elevenlabs")

    async def test_transient_primary_failure_uses_gemini_fallback(self):
        primary = AsyncMock(side_effect=HTTPException(status_code=503, detail="Unavailable"))
        fallback = AsyncMock(return_value={"success": True, "data": {"source": "gemini"}})
        request = TTSRequest(text="Maayong adlaw")
        with (
            patch.object(tts_router.settings, "TTS_PROVIDER", "elevenlabs"),
            patch.object(tts_router.settings, "TTS_FALLBACK_PROVIDERS", "gemini,openai"),
            patch.dict(tts_router.PROVIDERS, {"elevenlabs": primary, "gemini": fallback}),
        ):
            result = await generate_tts(request)
        primary.assert_awaited_once_with(request)
        fallback.assert_awaited_once_with(request)
        self.assertEqual(result["data"]["fallback_from"], "elevenlabs")

    async def test_client_error_does_not_fall_through_to_another_provider(self):
        primary = AsyncMock(side_effect=HTTPException(status_code=400, detail="Invalid input"))
        fallback = AsyncMock(return_value={"success": True, "data": {"source": "gemini"}})
        request = TTSRequest(text="Maayong adlaw")
        with (
            patch.object(tts_router.settings, "TTS_PROVIDER", "elevenlabs"),
            patch.object(tts_router.settings, "TTS_FALLBACK_PROVIDERS", "gemini"),
            patch.dict(tts_router.PROVIDERS, {"elevenlabs": primary, "gemini": fallback}),
        ):
            with self.assertRaises(HTTPException) as error:
                await generate_tts(request)
        self.assertEqual(error.exception.status_code, 400)
        fallback.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
