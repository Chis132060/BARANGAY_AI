"""Pydantic schemas for the speech API."""

from pydantic import BaseModel, Field


class TtsGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to synthesize.")
    language: str = Field("tgl", description="Language code: 'tgl' (Tagalog), 'ceb' (Cebuano/Bisaya), or 'en' (English).")


class TtsGenerationResult(BaseModel):
    audio_url: str
    format: str = "wav"
    duration: float
    sample_rate: int


class TtsGenerateResponse(BaseModel):
    success: bool = True
    data: TtsGenerationResult