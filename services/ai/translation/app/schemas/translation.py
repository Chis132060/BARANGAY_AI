"""Pydantic schemas for the translation API."""

from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to translate.")
    source_language: str = Field(..., min_length=1, description="ISO/language code, e.g. ceb or en.")
    target_language: str = Field(..., min_length=1, description="ISO/language code, e.g. en or ceb.")


class TranslationResult(BaseModel):
    translation: str
    source_language: str
    target_language: str


class TranslateResponse(BaseModel):
    success: bool = True
    data: TranslationResult