"""Speech synthesis routes."""

import asyncio
import re
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse

from ..config import settings
from ..errors import ServiceError
from ..ratelimit import rate_limiter
from ..schemas.speech import TtsGenerateRequest, TtsGenerateResponse, TtsGenerationResult
from ..services.f5tts import tts_service
from ..services.mms_tts import mms_tts_service

router = APIRouter()

_FILE_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def _client_key(request: Request) -> str:
    return getattr(request.client, "host", "unknown") or "unknown"


def _audio_base_url(request: Request) -> str:
    base = settings.TTS_PUBLIC_BASE_URL
    if not base:
        base = str(request.base_url).rstrip("/")
    return base


@router.post("/tts/generate", response_model=TtsGenerateResponse)
async def generate_speech(payload: TtsGenerateRequest, request: Request):
    rate_limiter.check(_client_key(request), settings.TTS_RATE_LIMIT_PER_MINUTE)

    text = payload.text.strip()
    language = (payload.language or "tgl").lower().strip()
    if not text:
        raise ServiceError("EMPTY_INPUT", "Text cannot be empty.", status_code=422)
    if len(text) > settings.TTS_MAX_TEXT_LENGTH:
        raise ServiceError(
            "TEXT_TOO_LONG",
            f"Text must be at most {settings.TTS_MAX_TEXT_LENGTH} characters.",
            status_code=422,
        )

    # Model inference is blocking; run off the main event loop.
    # Try MMS-TTS for multi-language (ceb, tgl, en), with fallback to F5-TTS.
    try:
        result = await asyncio.to_thread(mms_tts_service.synthesize, text, language)
    except Exception:
        # Fallback to F5-TTS
        result = await asyncio.to_thread(tts_service.synthesize, text)

    audio_url = f"{_audio_base_url(request)}/api/v1/tts/audio/{result['file_id']}"

    return TtsGenerateResponse(
        success=True,
        data=TtsGenerationResult(
            audio_url=audio_url,
            format=result["format"],
            duration=result["duration"],
            sample_rate=result["sample_rate"],
        ),
    )


@router.get("/tts/audio/{file_id}")
async def get_audio(file_id: str):
    """Serve a previously generated audio clip. File IDs are opaque 32-hex UUIDs."""
    if not _FILE_ID_RE.fullmatch(file_id):
        raise ServiceError("NOT_FOUND", "Requested audio does not exist.", status_code=404)

    path = Path(settings.TTS_OUTPUT_DIR) / f"{file_id}.wav"
    if not path.is_file():
        raise ServiceError("NOT_FOUND", "Requested audio does not exist.", status_code=404)

    return FileResponse(str(path), media_type="audio/wav", filename=path.name, content_disposition_type="inline")