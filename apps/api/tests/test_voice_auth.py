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

@pytest.mark.asyncio
async def test_voice_quota_rejects_excessive_requests(monkeypatch):
    from core import auth
    monkeypatch.setattr(auth, "VOICE_QUOTA_PER_MINUTE", 2)
    auth._voice_quota.clear()
    test_user = {"id": "00000000-0000-4000-8000-0000000000aa"}
    with patch("core.auth.verify_access_token", new_callable=AsyncMock, return_value=test_user):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            responses = [await client.post("/api/v1/tts/generate", json={"text":"Hello"}, headers={"Authorization":"Bearer test"}) for _ in range(3)]
    assert [r.status_code for r in responses] == [503, 503, 429]
    auth._voice_quota.clear()


@pytest.mark.asyncio
async def test_voice_conversation_consumes_one_voice_quota_check(monkeypatch):
    """The voice route charges one quota check without importing the full RAG stack."""
    import sys
    from types import ModuleType, SimpleNamespace

    from core import auth
    from routers import voice_router as voice_module

    # The route's RAG integration is not under test here. Stub its public contract
    # so this auth/quota test does not import the heavyweight orchestrator and all
    # optional model-provider dependencies (langchain_core, embeddings, etc.).
    rag_stub = ModuleType("routers.rag_router")

    class ChatRequest:
        def __init__(self, *, query, language, session_id):
            self.query = query
            self.language = language
            self.session_id = session_id

    class ChatResponse:
        def __init__(self, *, answer, citations):
            self.answer = answer
            self.citations = citations

    async def fake_chat(request, authorization=None):
        assert request.query == "When is the barangay office open?"
        assert authorization == "Bearer test"
        return ChatResponse(
            answer="Please check the official office schedule.",
            citations=[],
        )

    rag_stub.ChatRequest = ChatRequest
    rag_stub.ChatResponse = ChatResponse
    rag_stub.chat = fake_chat
    monkeypatch.setitem(sys.modules, "routers.rag_router", rag_stub)

    test_user = {"id": "00000000-0000-4000-8000-0000000000bb"}
    auth._voice_quota.clear()
    monkeypatch.setattr(
        voice_module,
        "transcribe_voice",
        AsyncMock(return_value={
            "data": {"text": "When is the barangay office open?"}
        }),
    )
    monkeypatch.setattr(
        "routers.tts_router.generate_tts",
        AsyncMock(return_value={
            "data": {"audio_url": "data:audio/wav;base64,AA=="}
        }),
    )

    with patch(
        "core.auth.verify_access_token",
        new_callable=AsyncMock,
        return_value=test_user,
    ):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/api/v1/voice/converse",
                json={"audio_base64": "AAAA", "language": "en"},
                headers={"Authorization": "Bearer test"},
            )

    assert response.status_code == 200
    assert response.json()["data"]["transcript"] == "When is the barangay office open?"
    assert response.json()["data"]["answer"] == "Please check the official office schedule."
    assert auth._voice_quota[test_user["id"]][0] == 1
    auth._voice_quota.clear()
