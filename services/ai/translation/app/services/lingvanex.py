"""Self-hosted translation backed by Lingvanex models running on CTranslate2.

The Lingvanex models repository publishes ready-to-use CTranslate2 model zips
(e.g. `en_ceb.zip`, `ceb_en.zip`). Each unzipped model directory contains:
    model.bin
    {source}.spm.model
    {target}.spm.model

Models are loaded lazily once and cached per direction for reuse across requests.
CPU execution is the default; GPU (cuda) is optional and falls back to CPU.
"""

import logging
import os
from typing import Optional, Tuple

from ..config import settings
from ..errors import ServiceError

logger = logging.getLogger("translation.lingvanex")


class LingvanexService:
    def __init__(self):
        self._cache = {}

    # ── Model discovery ──────────────────────────────────────────────────────

    def _model_dir(self, source: str, target: str) -> str:
        return os.path.join(settings.TRANSLATION_MODEL_ROOT, f"{source}_{target}")

    def is_pair_available(self, source: str, target: str) -> bool:
        d = self._model_dir(source, target)
        return os.path.isdir(d) and os.path.isfile(os.path.join(d, "model.bin"))

    def available_pairs(self) -> list:
        pairs = []
        root = settings.TRANSLATION_MODEL_ROOT
        if not os.path.isdir(root):
            return pairs
        for name in sorted(os.listdir(root)):
            if "_" not in name:
                continue
            source, target = name.split("_", 1)
            if (
                source in settings.LANGUAGES
                and target in settings.LANGUAGES
                and self.is_pair_available(source, target)
            ):
                pairs.append({"source": source, "target": target})
        return pairs

    # ── Translation ──────────────────────────────────────────────────────────

    def translate(self, text: str, source: str, target: str) -> str:
        source = source.lower()
        target = target.lower()

        if not self.is_pair_available(source, target):
            raise ServiceError(
                "LANGUAGE_UNSUPPORTED",
                f"No model is available for {source} → {target}. "
                f"Download it into models/{source}_{target}/ first.",
                status_code=422,
            )

        key = (source, target)
        if key not in self._cache:
            self._cache[key] = self._load_model(source, target)

        translator, src_sp, tgt_sp = self._cache[key]

        try:
            input_tokens = src_sp.EncodeAsPieces([text])
            outputs = translator.translate_batch(
                input_tokens,
                batch_type="tokens",
                beam_size=2,
                max_input_length=0,
                max_decoding_length=512,
            )
            tokens = outputs[0].hypotheses[0]
            return tgt_sp.DecodePieces([tokens])[0]
        except Exception as exc:
            logger.warning("translate_failed pair=%s_%s", source, target)
            raise ServiceError(
                "TRANSLATION_FAILED",
                "The translation model failed to process the request.",
                status_code=502,
            ) from exc

    # ── Model loading with CPU fallback ──────────────────────────────────────

    def _load_model(self, source: str, target: str) -> Tuple:
        try:
            import ctranslate2  # noqa: PLC0415
            import sentencepiece  # noqa: PLC0415
        except ImportError as exc:
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                "The translation runtime (ctranslate2/sentencepiece) is not installed.",
                status_code=503,
            ) from exc

        model_dir = self._model_dir(source, target)
        compute_type = settings.TRANSLATION_COMPUTE_TYPE or "int8"
        device = (settings.TRANSLATION_DEVICE or "cpu").lower()

        try:
            translator = ctranslate2.Translator(model_dir, device=device, compute_type=compute_type)
        except Exception:
            logger.warning("model_load_failed device=%s falling_back=cpu", device)
            try:
                translator = ctranslate2.Translator(model_dir, device="cpu", compute_type=compute_type)
            except Exception as exc:
                raise ServiceError(
                    "MODEL_UNAVAILABLE",
                    "The translation model could not be loaded.",
                    status_code=503,
                ) from exc

        try:
            src_sp = sentencepiece.SentencePieceProcessor(
                model_file=os.path.join(model_dir, f"{source}.spm.model")
            )
            tgt_sp = sentencepiece.SentencePieceProcessor(
                model_file=os.path.join(model_dir, f"{target}.spm.model")
            )
        except Exception as exc:
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                "The translation model tokenizers could not be loaded.",
                status_code=503,
            ) from exc

        logger.info("model_loaded pair=%s_%s device=%s", source, target, device)
        return translator, src_sp, tgt_sp


translation_service = LingvanexService()