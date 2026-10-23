"""HTTP-level regression tests for billable FastAPI voice endpoint authorization."""
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import FastAPI

from core.config import settings
from routers.voice_router import router as voice_router
from routers.tts_router import router as tts_router

app = FastAPI()
app.include_router(voice_router, prefix="/api/v1")
app.include_router(tts_router, prefix="/api/v1")

@pytest.mark.asyncio
@pytest.mark.parametrize("route,payload", [
    ("/api/v1/voice/transcribe", {"audio_base64":"AAAA"}),
    ("/api/v1/voice/converse", {"audio_base64":"AAAA"}),
    ("/api/v1/tts/generate", {"text":"Hello"}),
])
async def test_unauthenticated_requests_cannot_burn_ai_budget(route, payload):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://test") as client:
        response=await client.post(route,json=payload)
    assert response.status_code==401

@pytest.mark.asyncio
async def test_invalid_bearer_token_denied():
    with patch("core.auth.verify_access_token", new_callable=AsyncMock, return_value=None):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://test") as client:
            response=await client.post("/api/v1/tts/generate",json={"text":"Hello"},headers={"Authorization":"Bearer invalid"})
    assert response.status_code==401

@pytest.mark.asyncio
async def test_authenticated_request_passes_auth_gate_and_checks_provider(monkeypatch):
    monkeypatch.setattr(settings,"GEMINI_API_KEY","")
    monkeypatch.setattr(settings,"TTS_PROVIDER","gemini")
    with patch("core.auth.verify_access_token", new_callable=AsyncMock, return_value={"id":"00000000-0000-4000-8000-000000000001"}):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://test") as client:
            response=await client.post("/api/v1/tts/generate",json={"text":"Hello"},headers={"Authorization":"Bearer test"})
    assert response.status_code==503
