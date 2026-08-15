"""Meta MMS-TTS integration supporting Cebuano (ceb), Tagalog (tgl), and English (en).

Uses HuggingFace VITS models (e.g. facebook/mms-tts-ceb and facebook/mms-tts-tgl).
Models are cached locally after first download.
"""

import logging
import uuid
from pathlib import Path
from typing import Dict, Any

from ..config import settings
from ..errors import ServiceError

logger = logging.getLogger("tts.mms_tts")


class MmsTtsService:
    def __init__(self):
        self._models: Dict[str, Any] = {}
        self._tokenizers: Dict[str, Any] = {}

    def _get_model_name(self, lang: str) -> str:
        lang_clean = (lang or "tgl").lower().strip()
        if lang_clean in ("ceb", "bisaya", "cebuano"):
            return settings.MMS_TTS_CEB_MODEL
        elif lang_clean in ("en", "eng", "english"):
            return settings.MMS_TTS_ENG_MODEL
        else:
            # Default to Tagalog / Filipino
            return settings.MMS_TTS_TGL_MODEL

    def _load_model(self, model_name: str):
        if model_name in self._models:
            return self._models[model_name], self._tokenizers[model_name]

        try:
            from transformers import VitsModel, AutoTokenizer  # noqa: PLC0415
        except ImportError as exc:
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                "The HuggingFace transformers library is not installed.",
                status_code=503,
            ) from exc

        try:
            logger.info("loading_mms_model model=%s", model_name)
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = VitsModel.from_pretrained(model_name)
            self._models[model_name] = model
            self._tokenizers[model_name] = tokenizer
            return model, tokenizer
        except Exception as exc:
            logger.warning("mms_model_load_failed model=%s err=%s", model_name, exc)
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                f"Could not load MMS-TTS model '{model_name}'.",
                status_code=503,
            ) from exc

    def synthesize(self, text: str, language: str = "tgl") -> dict:
        model_name = self._get_model_name(language)
        model, tokenizer = self._load_model(model_name)

        output_dir = Path(settings.TTS_OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            import torch  # noqa: PLC0415
            import soundfile as sf  # noqa: PLC0415
        except ImportError as exc:
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                "Required dependencies (torch/soundfile) are missing.",
                status_code=503,
            ) from exc

        try:
            inputs = tokenizer(text, return_tensors="pt")
            with torch.no_grad():
                output = model(**inputs).waveform

            wav = output.squeeze().cpu().numpy()
            sr = model.config.sampling_rate
        except Exception as exc:
            logger.error("mms_generation_failed err=%s", exc)
            raise ServiceError(
                "GENERATION_FAILED",
                "Speech generation failed.",
                status_code=502,
            ) from exc

        if wav.size == 0:
            raise ServiceError(
                "GENERATION_FAILED",
                "Speech generation produced empty audio.",
                status_code=502,
            )

        duration = float(wav.shape[0]) / float(sr)
        file_id = uuid.uuid4().hex
        path = output_dir / f"{file_id}.wav"
        sf.write(str(path), wav, sr)

        return {
            "file_id": file_id,
            "filename": path.name,
            "format": "wav",
            "duration": round(duration, 2),
            "sample_rate": int(sr),
        }


mms_tts_service = MmsTtsService()
