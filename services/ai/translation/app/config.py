"""Configuration for the translation service.

Model layout convention:
    {TRANSLATION_MODEL_ROOT}/{source}_{target}/
        model.bin
        {source}.spm.model
        {target}.spm.model
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Languages offered by the open Lingvanex CTranslate2 model series.
LINGVANEX_LANGUAGES = {
    "en": "English",
    "be": "Belarusian",
    "ru": "Russian",
    "ku": "Kurdish",
    "sm": "Samoan",
    "xh": "Xhosa",
    "lo": "Lao",
    "co": "Corsican",
    "ceb": "Cebuano",
    "gl": "Galician",
    "yo": "Yoruba",
}


class Settings:
    APP_NAME: str = "Barangay AI · Translation"
    APP_VERSION: str = "1.0.0"

    TRANSLATION_MODEL_ROOT: str = os.getenv("TRANSLATION_MODEL_ROOT", "./models")
    # cpu (default) | cuda | auto — validated in the service, CPU is the safe fallback.
    TRANSLATION_DEVICE: str = (os.getenv("TRANSLATION_DEVICE", "cpu") or "cpu").lower()
    TRANSLATION_COMPUTE_TYPE: str = os.getenv("TRANSLATION_COMPUTE_TYPE", "int8") or "int8"
    TRANSLATION_MAX_TEXT_LENGTH: int = int(os.getenv("TRANSLATION_MAX_TEXT_LENGTH", "1000"))
    TRANSLATION_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("TRANSLATION_RATE_LIMIT_PER_MINUTE", "60"))

    LANGUAGES: dict = LINGVANEX_LANGUAGES


settings = Settings()