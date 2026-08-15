"""Configuration for the PDF processing service."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = "Barangay AI · PDF Processor"
    APP_VERSION: str = "1.0.0"

    PDF_MAX_BYTES: int = int(os.getenv("PDF_MAX_BYTES", str(25 * 1024 * 1024)))
    PDF_DOWNLOAD_TIMEOUT_SECONDS: float = float(os.getenv("PDF_DOWNLOAD_TIMEOUT_SECONDS", "30"))
    PDF_EXTRACTION_TIMEOUT_SECONDS: float = float(os.getenv("PDF_EXTRACTION_TIMEOUT_SECONDS", "180"))
    PDF_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("PDF_RATE_LIMIT_PER_MINUTE", "20"))

    # OpenDataLoader output formats we expose.
    ALLOWED_OUTPUT_FORMATS: tuple = ("markdown", "json", "text", "html")


settings = Settings()