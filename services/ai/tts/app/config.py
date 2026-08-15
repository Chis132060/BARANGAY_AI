"""Configuration for the TTS service."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = "Barangay AI · Text-to-Speech"
    APP_VERSION: str = "1.0.0"

    # F5-TTS model name (HuggingFace) or local checkpoint path.
    TTS_MODEL_NAME: str = os.getenv("TTS_MODEL_NAME", "F5TTS_v1_Base") or "F5TTS_v1_Base"
    TTS_MODEL_PATH: str = os.getenv("TTS_MODEL_PATH", "") or ""

    # MMS-TTS model names for Cebuano, Tagalog, and English
    MMS_TTS_CEB_MODEL: str = os.getenv("MMS_TTS_CEB_MODEL", "facebook/mms-tts-ceb")
    MMS_TTS_TGL_MODEL: str = os.getenv("MMS_TTS_TGL_MODEL", "facebook/mms-tts-tgl")
    MMS_TTS_ENG_MODEL: str = os.getenv("MMS_TTS_ENG_MODEL", "facebook/mms-tts-eng")

    # cpu (default) | cuda | auto — with automatic CPU fallback.
    TTS_DEVICE: str = (os.getenv("TTS_DEVICE", "cpu") or "cpu").lower()

    TTS_OUTPUT_DIR: str = os.getenv("TTS_OUTPUT_DIR", "./output")
    TTS_MAX_TEXT_LENGTH: int = int(os.getenv("TTS_MAX_TEXT_LENGTH", "1000"))
    TTS_AUDIO_RETENTION_HOURS: int = int(os.getenv("TTS_AUDIO_RETENTION_HOURS", "24"))

    # Reference voice prompt required by F5-TTS.
    TTS_REF_AUDIO: str = os.getenv("TTS_REF_AUDIO", "") or ""
    TTS_REF_TEXT: str = os.getenv("TTS_REF_TEXT", "") or ""
    TTS_REF_AUDIO_URL: str = os.getenv("TTS_REF_AUDIO_URL", "") or ""

    # Public base URL used to build audio links (defaults to the request's own base URL).
    TTS_PUBLIC_BASE_URL: str = (os.getenv("TTS_PUBLIC_BASE_URL", "") or "").rstrip("/")

    TTS_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("TTS_RATE_LIMIT_PER_MINUTE", "30"))


settings = Settings()