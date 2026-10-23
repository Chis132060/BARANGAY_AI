"""Gemini speech-to-text endpoint for Ate Sora's push-to-talk flow."""
import base64
import binascii
import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from core.config import settings
from core.auth import require_voice_access

router = APIRouter(dependencies=[Depends(require_voice_access)])
logger = logging.getLogger(__name__)
MAX_AUDIO_BYTES = 4 * 1024 * 1024
ALLOWED_MIME = {"audio/webm", "audio/ogg", "audio/wav", "audio/mp4", "audio/mpeg", "audio/aac", "audio/flac"}
LANGUAGES = {"tgl": "Filipino (Tagalog)", "ceb": "Cebuano (Bisaya)", "en": "English"}


class TranscribeRequest(BaseModel):
    audio_base64: str = Field(min_length=4, max_length=6_000_000)
    mime_type: str = Field(default="audio/webm")
    language: str = Field(default="tgl", pattern="^(tgl|ceb|en)$")


@router.post("/voice/transcribe")
async def transcribe_voice(request: TranscribeRequest):
    """Transcribe short recorded speech; never store or log the recording."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini voice is not configured.")
    mime = request.mime_type.split(";", 1)[0].strip().lower()
    if mime not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail="Unsupported audio format.")
    try:
        audio = base64.b64decode(request.audio_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid audio encoding.") from exc
    if not audio or len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio must be under 4 MB.")
    payload = {
        "contents": [{"parts": [
            {"text": (
                "Transcribe the speech in this audio verbatim. "
                f"The speaker may use {LANGUAGES[request.language]} or mix local languages. "
                "Return ONLY the spoken words, without a preface or commentary. "
                "If there is no intelligible speech, return an empty response."
            )},
            {"inline_data": {"mime_type": mime, "data": request.audio_base64}},
        ]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 512},
    }
    try:
        async with httpx.AsyncClient(timeout=50.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
                headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                json=payload,
            )
    except httpx.HTTPError as exc:
        logger.warning("Sora transcription transport failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Transcription temporarily unavailable.") from exc
    if response.status_code != 200:
        logger.warning("Sora transcription failed: HTTP %s", response.status_code)
        raise HTTPException(status_code=503, detail="Transcription temporarily unavailable.")
    try:
        parts = response.json()["candidates"][0]["content"]["parts"]
        transcript = " ".join(part.get("text", "") for part in parts).strip()
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Invalid transcription response.") from exc
    transcript = re.sub(r"^\s*(transcription|transcript)\s*:\s*", "", transcript, flags=re.I)
    return {"success": True, "data": {"text": transcript, "language": request.language, "source": "gemini"}}


class VoiceConversationRequest(TranscribeRequest):
    session_id: str | None = None


@router.post("/voice/converse")
async def converse_voice(request: VoiceConversationRequest):
    """Push-to-talk pipeline: speech -> audited barangay chat -> spoken reply."""
    from routers.rag_router import ChatRequest, chat
    from routers.tts_router import TTSRequest, generate_tts

    transcription = await transcribe_voice(request)
    spoken_text = transcription["data"]["text"].strip()
    if not spoken_text:
        raise HTTPException(status_code=422, detail="No intelligible speech detected.")
    chat_result = await chat(ChatRequest(
        query=spoken_text, language=request.language, session_id=request.session_id
    ))
    answer = chat_result.answer
    # A text answer is still useful if the speech provider is unavailable.
    audio = None
    voice_error = None
    try:
        speech = await generate_tts(TTSRequest(text=answer[:1500], language=request.language))
        audio = speech["data"]
    except HTTPException:
        voice_error = "Voice playback is temporarily unavailable."
    return {
        "success": True,
        "data": {
            "transcript": spoken_text,
            "answer": answer,
            "citations": chat_result.citations,
            "audio": audio,
            "voice_error": voice_error,
            "language": request.language,
        },
    }
