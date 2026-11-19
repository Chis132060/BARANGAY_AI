"""Fast voice conversation must never block on unnecessary TTS generation."""
import sys
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from routers import voice_router


@pytest.mark.asyncio
async def test_fast_push_to_talk_returns_grounded_text_without_waiting_for_tts(monkeypatch):
    stub = ModuleType("routers.rag_router")

    class ChatRequest:
        def __init__(self, **kwargs):
            self.query = kwargs["query"]
            self.language = kwargs["language"]
            self.session_id = kwargs["session_id"]

    async def fake_chat(request, authorization=None):
        assert authorization == "Bearer dummy-token"
        assert request.query == "Paano kumuha ng clearance?"
        return SimpleNamespace(answer="Magtanong sa Barangay Office para sa kumpirmadong requirements.", citations=[])

    stub.ChatRequest = ChatRequest
    stub.chat = fake_chat
    monkeypatch.setitem(sys.modules, "routers.rag_router", stub)
    monkeypatch.setattr(voice_router, "transcribe_voice", AsyncMock(return_value={"data": {"text": "Paano kumuha ng clearance?"}}))
    with patch("routers.tts_router.generate_tts", new_callable=AsyncMock) as tts:
        result = await voice_router.converse_voice(
            voice_router.VoiceConversationRequest(audio_base64="AAAA", language="tgl", skip_tts=True),
            authorization="Bearer dummy-token",
        )
        tts.assert_not_awaited()

    assert result["data"]["answer"].startswith("Magtanong sa Barangay")
    assert result["data"]["audio"] is None
    assert result["data"]["voice_error"] is None


@pytest.mark.asyncio
async def test_existing_voice_clients_still_receive_generated_audio(monkeypatch):
    stub = ModuleType("routers.rag_router")

    class ChatRequest:
        def __init__(self, **kwargs):
            self.query = kwargs["query"]

    async def fake_chat(request, authorization=None):
        return SimpleNamespace(answer="Official answer", citations=[])

    stub.ChatRequest = ChatRequest
    stub.chat = fake_chat
    monkeypatch.setitem(sys.modules, "routers.rag_router", stub)
    monkeypatch.setattr(voice_router, "transcribe_voice", AsyncMock(return_value={"data": {"text": "Question"}}))
    with patch("routers.tts_router.generate_tts", new_callable=AsyncMock, return_value={"data": {"audio_url": "data:audio/wav;base64,AA=="}}) as tts:
        result = await voice_router.converse_voice(voice_router.VoiceConversationRequest(audio_base64="AAAA"))
        tts.assert_awaited_once()
    assert result["data"]["audio"]["audio_url"].startswith("data:audio/")
