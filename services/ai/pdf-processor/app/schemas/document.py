"""Pydantic schemas for the document extraction API."""

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from ..config import settings


class ExtractRequest(BaseModel):
    file_url: str = Field(..., min_length=1, description="HTTP(S) URL of the PDF to process.")
    output_format: str = Field(default="markdown", description="markdown | json | text | html")

    @field_validator("file_url")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        lowered = v.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("file_url must be an http(s) URL.")
        return v

    @field_validator("output_format")
    @classmethod
    def validate_output_format(cls, v: str) -> str:
        fmt = v.strip().lower()
        if fmt not in settings.ALLOWED_OUTPUT_FORMATS:
            raise ValueError(
                f"Unsupported output format '{v}'. Allowed: {', '.join(settings.ALLOWED_OUTPUT_FORMATS)}"
            )
        return fmt


class DocumentResult(BaseModel):
    title: Optional[str] = None
    content: str
    format: str


class DocumentMetadata(BaseModel):
    pages: Optional[int] = None
    source: Optional[str] = None


class ExtractResponse(BaseModel):
    success: bool = True
    document: DocumentResult
    metadata: DocumentMetadata