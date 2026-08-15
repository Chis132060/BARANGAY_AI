"""Translation routes."""

import asyncio

from fastapi import APIRouter, Request

from ..config import settings
from ..errors import ServiceError
from ..ratelimit import rate_limiter
from ..schemas.translation import TranslateRequest, TranslateResponse, TranslationResult
from ..services.lingvanex import translation_service

router = APIRouter()


def _client_key(request: Request) -> str:
    return getattr(request.client, "host", "unknown") or "unknown"


@router.get("/languages")
async def languages():
    """List configured languages and the model pairs that are actually available."""
    return {
        "success": True,
        "data": {
            "languages": settings.LANGUAGES,
            "pairs": translation_service.available_pairs(),
        },
    }


@router.post("/translate", response_model=TranslateResponse)
async def translate(payload: TranslateRequest, request: Request):
    rate_limiter.check(_client_key(request), settings.TRANSLATION_RATE_LIMIT_PER_MINUTE)

    text = payload.text.strip()
    if not text:
        raise ServiceError("EMPTY_INPUT", "Text cannot be empty.", status_code=422)
    if len(text) > settings.TRANSLATION_MAX_TEXT_LENGTH:
        raise ServiceError(
            "TEXT_TOO_LONG",
            f"Text must be at most {settings.TRANSLATION_MAX_TEXT_LENGTH} characters.",
            status_code=422,
        )

    source = payload.source_language.lower().strip()
    target = payload.target_language.lower().strip()

    if source not in settings.LANGUAGES:
        raise ServiceError(
            "UNSUPPORTED_LANGUAGE",
            f"Source language '{payload.source_language}' is not supported.",
            status_code=422,
        )
    if target not in settings.LANGUAGES:
        raise ServiceError(
            "UNSUPPORTED_LANGUAGE",
            f"Target language '{payload.target_language}' is not supported.",
            status_code=422,
        )
    if source == target:
        raise ServiceError("SAME_LANGUAGE", "Source and target language must differ.", status_code=422)

    # ctranslate2 inference is blocking; run it off the event loop.
    translation = await asyncio.to_thread(translation_service.translate, text, source, target)

    return TranslateResponse(
        success=True,
        data=TranslationResult(translation=translation, source_language=source, target_language=target),
    )