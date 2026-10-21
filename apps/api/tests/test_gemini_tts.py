"""Gemini TTS response contract tests (no external API calls)."""
import base64
import io
import wave
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException

from core.config import settings
from routers.tts_router import TTSRequest, generate_tts


@pytest.mark.asyncio
async def test_gemini_pcm_converted_to_wav(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    pcm = b"\x00\x00" * 120
    response = httpx.Response(200, json={"candidates": [{"content": {"parts": [{
        "inlineData": {"mimeType": "audio/L16;rate=24000", "data": base64.b64encode(pcm).decode()}
    }]}}]})
    with patch("routers.tts_router.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.post = AsyncMock(return_value=response)
        result = await generate_tts(TTSRequest(text="Kumusta po!", language="tgl"))
        kwargs = client.return_value.__aenter__.return_value.post.call_args.kwargs
    assert "generativelanguage.googleapis.com" in client.return_value.__aenter__.return_value.post.call_args.args[0]
    assert kwargs["json"]["generationConfig"]["speechConfig"]["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"] == settings.GEMINI_TTS_VOICE
    assert result["data"]["source"] == "gemini"
    audio = base64.b64decode(result["data"]["audio_url"].split(",", 1)[1])
    with wave.open(io.BytesIO(audio), "rb") as wav:
        assert wav.getframerate() == 24000
        assert wav.readframes(120) == pcm


@pytest.mark.asyncio
async def test_gemini_missing_key(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    with pytest.raises(HTTPException) as error:
        await generate_tts(TTSRequest(text="Hello"))
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_gemini_quota_error(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    with patch("routers.tts_router.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.post = AsyncMock(return_value=httpx.Response(429))
        with pytest.raises(HTTPException) as error:
            await generate_tts(TTSRequest(text="Hello"))
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_gemini_rejects_missing_audio(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    with patch("routers.tts_router.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.post = AsyncMock(return_value=httpx.Response(200, json={"candidates": []}))
        with pytest.raises(HTTPException) as error:
            await generate_tts(TTSRequest(text="Hello"))
    assert error.value.status_code == 502
