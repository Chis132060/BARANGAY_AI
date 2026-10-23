import base64
import io
import logging
import re
import wave

import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from core.config import settings
from core.auth import require_voice_access

router = APIRouter(dependencies=[Depends(require_voice_access)])
logger = logging.getLogger(__name__)


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    language: str = Field(default="tgl", pattern="^(tgl|ceb|en)$")


def pcm_to_wav_data_url(base64_pcm: str, sample_rate: int = 24000) -> str:
    pcm = base64.b64decode(base64_pcm, validate=True)
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm)
    return f"data:audio/wav;base64,{base64.b64encode(output.getvalue()).decode('ascii')}"


@router.post("/tts/generate")
async def generate_tts(request: TTSRequest):
    """Generate Ate Sora speech using the configured provider and existing WAV contract."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text prompt is required.")
    # Keep the existing /api/v1/tts/generate contract so the PWA's
    # playback and browser-speech fallback continue to work unchanged.
    language_name = {"ceb": "Cebuano", "en": "English"}.get(request.language, "Filipino")
    provider = settings.TTS_PROVIDER.lower().strip()
    if provider == "gemini":
        if not settings.GEMINI_API_KEY:
            raise HTTPException(status_code=503, detail="Gemini voice is not configured.")
        payload = {
            "contents": [{"parts": [{"text": (
                f"Read the following text exactly in {language_name}, using a warm, clear, "
                f"friendly feminine voice. Do not add or change any words: {request.text}"
            )}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {
                    "voiceName": settings.GEMINI_TTS_VOICE
                }}},
            },
        }
        try:
            async with httpx.AsyncClient(timeout=55.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_TTS_MODEL}:generateContent",
                    headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                    json=payload,
                )
        except httpx.HTTPError as exc:
            logger.warning("Gemini speech transport failure: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="Voice service is temporarily unavailable.") from exc
        if response.status_code != 200:
            logger.warning("Gemini speech request failed: HTTP %s", response.status_code)
            raise HTTPException(status_code=503, detail="Voice service is temporarily unavailable.")
        try:
            parts = response.json()["candidates"][0]["content"]["parts"]
            audio = next(part["inlineData"] for part in parts if "inlineData" in part)
            mime = audio.get("mimeType", "")
            if not mime.startswith("audio/L16"):
                raise ValueError("Unexpected Gemini audio encoding")
            audio_url = pcm_to_wav_data_url(audio["data"])
        except (KeyError, IndexError, StopIteration, TypeError, ValueError, base64.binascii.Error) as exc:
            logger.warning("Gemini speech returned invalid audio: %s", type(exc).__name__)
            raise HTTPException(status_code=502, detail="Voice service returned invalid audio.") from exc
        return {"success": True, "data": {
            "audio_url": audio_url, "format": "wav", "sample_rate": 24000,
            "source": "gemini", "voice": settings.GEMINI_TTS_VOICE,
        }}

    if provider != "openai":
        raise HTTPException(status_code=503, detail="Unsupported voice provider.")
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI voice is not configured.")

    payload = {
        "model": settings.OPENAI_TTS_MODEL,
        "voice": settings.OPENAI_TTS_VOICE,
        "input": request.text,
        "instructions": (
            f"Speak in {language_name} with a warm, friendly, natural feminine-sounding voice. "
            "Read the words as written, without adding any commentary."
        ),
        "response_format": "wav",
    }
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json=payload,
            )
    except httpx.HTTPError as exc:
        logger.warning("OpenAI speech transport failure: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Voice service is temporarily unavailable.") from exc

    if response.status_code != 200:
        logger.warning("OpenAI speech request failed: HTTP %s", response.status_code)
        raise HTTPException(status_code=503, detail="Voice service is temporarily unavailable.")
    if len(response.content) < 44 or not response.content.startswith(b"RIFF") or response.content[8:12] != b"WAVE":
        logger.warning("OpenAI speech returned non-WAV audio")
        raise HTTPException(status_code=502, detail="Voice service returned invalid audio.")
    audio_url = "data:audio/wav;base64," + base64.b64encode(response.content).decode("ascii")

    return {
        "success": True,
        "data": {
            "audio_url": audio_url,
            "format": "wav",
            "sample_rate": None,
            "source": "openai",
            "voice": settings.OPENAI_TTS_VOICE,
        },
    }
