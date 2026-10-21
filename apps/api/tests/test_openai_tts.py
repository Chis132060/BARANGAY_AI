"""Contract tests for the OpenAI TTS adapter. Run: python -m pytest apps/api/tests/test_openai_tts.py"""
import base64
import io
import wave
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException

from routers.tts_router import TTSRequest, generate_tts
from core.config import settings


def wav_bytes():
    buf = io.BytesIO()
    with wave.open(buf, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24000)
        output.writeframes(b"\\x00\\x00" * 100)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_openai_wav_contract(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    response = httpx.Response(200, content=wav_bytes())
    with patch("routers.tts_router.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.post = AsyncMock(return_value=response)
        result = await generate_tts(TTSRequest(text="Kumusta po!"))
    assert result["success"] is True
    assert result["data"]["source"] == "openai"
    assert base64.b64decode(result["data"]["audio_url"].split(",", 1)[1]) == wav_bytes()


@pytest.mark.asyncio
async def test_missing_key_returns_503(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    with pytest.raises(HTTPException) as error:
        await generate_tts(TTSRequest(text="Hello"))
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_provider_error_returns_503(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    with patch("routers.tts_router.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.post = AsyncMock(return_value=httpx.Response(401))
        with pytest.raises(HTTPException) as error:
            await generate_tts(TTSRequest(text="Hello"))
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_invalid_audio_returns_502(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    with patch("routers.tts_router.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.post = AsyncMock(return_value=httpx.Response(200, content=b"not wav"))
        with pytest.raises(HTTPException) as error:
            await generate_tts(TTSRequest(text="Hello"))
    assert error.value.status_code == 502
