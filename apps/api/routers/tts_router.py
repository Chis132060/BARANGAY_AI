import base64
import io
import logging
import re
import wave

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.config import settings

router = APIRouter()
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
    """Generate Ate Sora audio using Gemini Umbriel only."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text prompt is required.")
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini TTS is not configured.")

    language_name = {"ceb": "Cebuano", "en": "English"}.get(request.language, "Filipino")
    payload = {
        "contents": [{
            "parts": [{
                "text": (
                    f"Read this {language_name} script exactly as written in a warm, "
                    f"natural, friendly female voice. Do not add commentary or extra words.\n\n"
                    f"{request.text}"
                )
            }]
        }],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": settings.GEMINI_TTS_VOICE}
                }
            },
        },
    }

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_TTS_MODEL}:generateContent"
    )
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, params={"key": settings.GEMINI_API_KEY}, json=payload)
    except httpx.HTTPError as exc:
        logger.warning("Gemini TTS transport failure: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Voice service is temporarily unavailable.") from exc

    if response.status_code >= 400:
        try:
            provider_error = response.json().get("error", {}).get("message")
        except ValueError:
            provider_error = None
        # Log only the provider's status and error category, never credentials or prompts.
        logger.warning("Gemini TTS rejected request: status=%s category=%s", response.status_code,
                       response.json().get("error", {}).get("status", "unknown") if response.headers.get("content-type", "").startswith("application/json") else "unknown")
        raise HTTPException(status_code=503 if response.status_code in (429, 503) else 502,
                            detail="Voice service is temporarily unavailable.")

    try:
        data = response.json()
        candidates = data.get("candidates") or []
        parts = (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    except (ValueError, TypeError, AttributeError, IndexError) as exc:
        logger.warning("Gemini TTS returned an invalid response")
        raise HTTPException(status_code=502, detail="Voice service returned an invalid response.") from exc
    audio_base64 = None
    audio_mime = ""
    for part in parts:
        inline_data = part.get("inlineData") or part.get("inline_data") or {}
        if inline_data.get("data"):
            audio_base64 = inline_data["data"]
            audio_mime = inline_data.get("mimeType") or inline_data.get("mime_type") or ""
            break
    if not audio_base64:
        raise HTTPException(status_code=502, detail="Gemini returned no audio data.")

    try:
        # Gemini can return raw PCM or an already encoded audio format.
        if audio_mime.startswith("audio/wav") or audio_mime.startswith("audio/x-wav"):
            base64.b64decode(audio_base64, validate=True)
            audio_url = f"data:audio/wav;base64,{audio_base64}"
        elif audio_mime.startswith("audio/mpeg"):
            base64.b64decode(audio_base64, validate=True)
            audio_url = f"data:audio/mpeg;base64,{audio_base64}"
        else:
            rate_match = re.search(r"rate=(\d+)", audio_mime)
            sample_rate = int(rate_match.group(1)) if rate_match else 24000
            if not 8000 <= sample_rate <= 48000:
                raise ValueError("Invalid sample rate")
            audio_url = pcm_to_wav_data_url(audio_base64, sample_rate)
    except (ValueError, base64.binascii.Error) as exc:
        logger.warning("Gemini TTS returned malformed audio")
        raise HTTPException(status_code=502, detail="Voice service returned invalid audio.") from exc

    return {
        "success": True,
        "data": {
            "audio_url": audio_url,
            "format": "wav",
            "sample_rate": 24000,
            "source": "gemini",
            "voice": settings.GEMINI_TTS_VOICE,
        },
    }
