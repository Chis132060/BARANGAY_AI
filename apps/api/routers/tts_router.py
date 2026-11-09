"""Ate Sora speech synthesis with ElevenLabs primary and legacy provider fallbacks."""
import base64
import io
import logging
import wave
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.auth import require_voice_access
from core.config import settings

router = APIRouter(dependencies=[Depends(require_voice_access)])
logger = logging.getLogger(__name__)

LANGUAGES = {"ceb": "Cebuano (Bisaya)", "tgl": "Filipino (Tagalog)", "en": "English"}
ALLOWED_OUTPUT_FORMATS = {
    "mp3_22050_32", "mp3_44100_32", "mp3_44100_64",
    "mp3_44100_96", "mp3_44100_128", "mp3_44100_192",
}


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    language: str = Field(default="ceb", pattern="^(tgl|ceb|en)$")


def _data_url(content: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(content).decode('ascii')}"


def _pcm_to_wav_data_url(encoded_pcm: str, sample_rate: int = 24000) -> str:
    pcm = base64.b64decode(encoded_pcm, validate=True)
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm)
    return _data_url(output.getvalue(), "audio/wav")


def build_elevenlabs_payload(text: str, model_id: str) -> dict:
    """Build a request compatible with ElevenLabs model-specific parameters.

    Eleven v3 uses its own expressive controls and rejects legacy similarity/style
    fields. Keep the v3 request minimal; legacy multilingual models accept them.
    """
    payload = {"text": text, "model_id": model_id}
    if not model_id.lower().startswith("eleven_v3"):
        payload["voice_settings"] = {
            "stability": 0.45,
            "similarity_boost": 0.8,
            "style": 0.0,
            "use_speaker_boost": True,
        }
    return payload


async def _elevenlabs(request: TTSRequest) -> dict:
    if not settings.ELEVENLABS_API_KEY or not settings.ELEVENLABS_VOICE_ID:
        raise HTTPException(status_code=503, detail="ElevenLabs voice is not configured.")
    output_format = settings.ELEVENLABS_OUTPUT_FORMAT
    if output_format not in ALLOWED_OUTPUT_FORMATS:
        logger.error("Unsupported ElevenLabs output format configured")
        raise HTTPException(status_code=500, detail="Voice service configuration is invalid.")

    voice_id = quote(settings.ELEVENLABS_VOICE_ID, safe="")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(40.0, connect=5.0)) as client:
            response = await client.post(
                url,
                params={"output_format": output_format},
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                },
                json=build_elevenlabs_payload(request.text, settings.ELEVENLABS_TTS_MODEL),
            )
    except httpx.HTTPError as exc:
        logger.warning("ElevenLabs transport failure: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="ElevenLabs voice is temporarily unavailable.") from exc

    if response.status_code != 200:
        logger.warning("ElevenLabs TTS failed with HTTP %s", response.status_code)
        raise HTTPException(status_code=503, detail="ElevenLabs voice is temporarily unavailable.")
    if not response.content or len(response.content) > 12 * 1024 * 1024:
        raise HTTPException(status_code=502, detail="ElevenLabs returned invalid audio.")

    return {"success": True, "data": {
        "audio_url": _data_url(response.content, "audio/mpeg"),
        "format": "mp3",
        "sample_rate": 44100 if "44100" in output_format else None,
        "source": "elevenlabs",
        "voice": settings.ELEVENLABS_VOICE_ID,
    }}


async def _gemini(request: TTSRequest) -> dict:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini voice is not configured.")
    payload = {
        "contents": [{"parts": [{"text": (
            f"Read the following text exactly in {LANGUAGES[request.language]}, "
            f"using a warm, clear, friendly feminine voice. Do not add or change any words: {request.text}"
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
        logger.warning("Gemini TTS transport failure: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Gemini voice is temporarily unavailable.") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="Gemini voice is temporarily unavailable.")
    try:
        parts = response.json()["candidates"][0]["content"]["parts"]
        audio = next(part["inlineData"] for part in parts if "inlineData" in part)
        if not audio.get("mimeType", "").startswith("audio/L16"):
            raise ValueError("Unexpected Gemini audio encoding")
        audio_url = _pcm_to_wav_data_url(audio["data"])
    except (KeyError, IndexError, StopIteration, TypeError, ValueError, base64.binascii.Error) as exc:
        logger.warning("Gemini returned invalid audio: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Gemini returned invalid audio.") from exc
    return {"success": True, "data": {
        "audio_url": audio_url, "format": "wav", "sample_rate": 24000,
        "source": "gemini", "voice": settings.GEMINI_TTS_VOICE,
    }}


async def _openai(request: TTSRequest) -> dict:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI voice is not configured.")
    payload = {
        "model": settings.OPENAI_TTS_MODEL,
        "voice": settings.OPENAI_TTS_VOICE,
        "input": request.text,
        "instructions": (
            f"Speak in {LANGUAGES[request.language]} with a warm, friendly, natural feminine-sounding voice. "
            "Read the words as written, without commentary."
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
        logger.warning("OpenAI TTS transport failure: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="OpenAI voice is temporarily unavailable.") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="OpenAI voice is temporarily unavailable.")
    if len(response.content) < 44 or not response.content.startswith(b"RIFF") or response.content[8:12] != b"WAVE":
        raise HTTPException(status_code=502, detail="OpenAI returned invalid audio.")
    return {"success": True, "data": {
        "audio_url": _data_url(response.content, "audio/wav"),
        "format": "wav", "sample_rate": None, "source": "openai",
        "voice": settings.OPENAI_TTS_VOICE,
    }}


PROVIDERS = {"elevenlabs": _elevenlabs, "gemini": _gemini, "openai": _openai}


@router.post("/tts/generate")
async def generate_tts(request: TTSRequest):
    """Generate speech with the primary provider and ordered server-side fallbacks."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text prompt is required.")

    primary = settings.TTS_PROVIDER.lower().strip()
    fallbacks = [p.strip().lower() for p in settings.TTS_FALLBACK_PROVIDERS.split(",") if p.strip()]
    provider_names = list(dict.fromkeys([primary, *fallbacks]))
    failures = []

    for name in provider_names:
        provider = PROVIDERS.get(name)
        if provider is None:
            logger.warning("Ignoring unsupported TTS provider: %s", name)
            continue
        try:
            result = await provider(request)
            if name != primary:
                result["data"]["fallback_from"] = primary
            return result
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            failures.append(name)
            logger.warning("TTS provider %s unavailable (HTTP %s)", name, exc.status_code)

    logger.error("All configured TTS providers failed: %s", ",".join(failures or provider_names))
    raise HTTPException(status_code=503, detail="Voice service is temporarily unavailable.")
