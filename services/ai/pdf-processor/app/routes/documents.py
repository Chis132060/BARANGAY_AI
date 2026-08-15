"""Document ingestion routes."""

from fastapi import APIRouter, File, UploadFile, Request
from typing import Optional

from ..config import settings
from ..errors import ServiceError
from ..ratelimit import rate_limiter
from ..schemas.document import ExtractRequest, ExtractResponse, DocumentResult, DocumentMetadata
from ..services.opendataloader import pdf_service

router = APIRouter()


def _client_key(request: Request) -> str:
    return getattr(request.client, "host", "unknown") or "unknown"


@router.post("/documents/extract", response_model=ExtractResponse)
async def extract_document(payload: ExtractRequest, request: Request):
    """Extract text from a PDF referenced by an HTTP(S) URL."""
    rate_limiter.check(_client_key(request), settings.PDF_RATE_LIMIT_PER_MINUTE)

    result = await pdf_service.extract_from_url(payload.file_url, payload.output_format)

    return ExtractResponse(
        success=True,
        document=DocumentResult(title=result.get("title"), content=result["content"], format=result["format"]),
        metadata=DocumentMetadata(pages=result.get("pages"), source=result.get("source")),
    )


@router.post("/documents/upload", response_model=ExtractResponse)
async def upload_document(request: Request, file: UploadFile = File(...)):
    """Extract text from a directly uploaded PDF file (multipart form)."""
    rate_limiter.check(_client_key(request), settings.PDF_RATE_LIMIT_PER_MINUTE)

    content_type = (file.content_type or "").lower()
    expect_pdf = content_type in {"", "application/pdf"} or "pdf" in content_type or "octet-stream" in content_type
    if not expect_pdf:
        raise ServiceError(
            "INVALID_PDF",
            "Only PDF documents are supported.",
            status_code=422,
        )

    data = bytearray()
    while chunk := await file.read(65536):
        data.extend(chunk)
        if len(data) > settings.PDF_MAX_BYTES:
            raise ServiceError(
                "PDF_TOO_LARGE",
                "The PDF exceeds the maximum allowed size.",
                status_code=413,
            )

    result = await pdf_service.extract_from_bytes(bytes(data), "markdown")

    return ExtractResponse(
        success=True,
        document=DocumentResult(title=result.get("title"), content=result["content"], format=result["format"]),
        metadata=DocumentMetadata(pages=result.get("pages"), source=result.get("source") or file.filename or None),
    )