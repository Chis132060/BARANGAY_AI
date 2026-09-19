import base64
import io
import wave

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import settings

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    language: str = "tgl"


def pcm_to_wav_data_url(base64_pcm: str, sample_rate: int = 24000) -> str:
    pcm = base64.b64decode(base64_pcm)
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
        raise HTTPException(status_code=502, detail=f"Gemini TTS request failed: {exc}") from exc

    if response.status_code >= 400:
        try:
            provider_error = response.json().get("error", {}).get("message")
        except ValueError:
            provider_error = None
        raise HTTPException(
            status_code=502,
            detail=provider_error or f"Gemini TTS returned HTTP {response.status_code}.",
        )

    data = response.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    audio_base64 = None
    for part in parts:
        inline_data = part.get("inlineData") or part.get("inline_data") or {}
        if inline_data.get("data"):
            audio_base64 = inline_data["data"]
            break
    if not audio_base64:
        raise HTTPException(status_code=502, detail="Gemini returned no audio data.")

    return {
        "success": True,
        "data": {
            "audio_url": pcm_to_wav_data_url(audio_base64),
            "format": "wav",
            "sample_rate": 24000,
            "source": "gemini",
            "voice": settings.GEMINI_TTS_VOICE,
        },
    }
