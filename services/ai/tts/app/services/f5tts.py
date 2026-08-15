"""F5-TTS integration for the Barangay AI voice service.

F5-TTS is a flow-matching diffusion-transformer TTS (MIT-licensed code), but the
pretrained models are distributed under CC-BY-NC (training data: Emilia). Confirm
license implications before any commercial/national deployment — see docs/OPEN_SOURCE.md.

The model is loaded lazily ONCE and reused for every request (never per request).
CPU execution is the default; CUDA is used only when explicitly configured AND available.
"""

import hashlib
import logging
import os
import urllib.request
import uuid
from pathlib import Path
from typing import Optional, Tuple

from ..config import settings
from ..errors import ServiceError

logger = logging.getLogger("tts.f5tts")


class TtsService:
    def __init__(self):
        self._model = None

    # ── Device selection (CPU default, CPU fallback) ─────────────────────────

    def _resolve_device(self) -> str:
        requested = settings.TTS_DEVICE or "cpu"
        if requested == "cpu":
            return "cpu"

        try:
            import torch  # noqa: PLC0415

            if requested == "cuda" or requested == "auto":
                if torch.cuda.is_available():
                    return "cuda"
                logger.warning("device '%s' requested but no CUDA device found; using cpu", requested)
                return "cpu"
            logger.warning("unknown device '%s'; using cpu", requested)
            return "cpu"
        except ImportError:
            logger.warning("torch not available; using cpu")
            return "cpu"
        except Exception as exc:  # pragma: no cover
            logger.warning("device selection failed (%s); using cpu", exc)
            return "cpu"

    # ── Model lifecycle ───────────────────────────────────────────────────────

    def _load_model(self) -> None:
        if self._model is not None:
            return
        try:
            from f5_tts.infer.infer import F5TTS  # noqa: PLC0415
        except ImportError as exc:
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                "The TTS runtime (f5-tts) is not installed.",
                status_code=503,
            ) from exc

        device = self._resolve_device()
        model_ref = settings.TTS_MODEL_PATH or settings.TTS_MODEL_NAME

        try:
            logger.info("loading_model model=%s device=%s", model_ref, device)
            self._model = F5TTS(model=model_ref, device=device, offline_mode=True)
        except Exception as exc:
            logger.warning("model_load_failed device=%s", device)
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                "The TTS model could not be loaded.",
                status_code=503,
            ) from exc

    def reset_for_tests(self) -> None:  # pragma: no cover - test helper
        self._model = None

    # ── Reference voice prompt ────────────────────────────────────────────────

    def _reference(self) -> Tuple[Optional[str], Optional[str]]:
        ref_audio = settings.TTS_REF_AUDIO
        if ref_audio and os.path.isfile(ref_audio):
            return ref_audio, settings.TTS_REF_TEXT or None

        url = settings.TTS_REF_AUDIO_URL
        if not url:
            return None, None

        ref_dir = Path(settings.TTS_OUTPUT_DIR) / "_references"
        ref_dir.mkdir(parents=True, exist_ok=True)
        key = hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]
        dest = ref_dir / f"ref_{key}.wav"
        if not dest.is_file():
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "barangay-ai/1.0"})
                with urllib.request.urlopen(req, timeout=60) as resp, dest.open("wb") as out:
                    out.write(resp.read())
            except Exception:
                return None, None
        return str(dest), settings.TTS_REF_TEXT or None

    # ── Synthesis ─────────────────────────────────────────────────────────────

    def synthesize(self, text: str) -> dict:
        self._load_model()
        if self._model is None:  # pragma: no cover - defensive
            raise ServiceError("MODEL_UNAVAILABLE", "The TTS model is not available.", 503)

        ref_audio, ref_text = self._reference()
        if not ref_audio or not ref_text:
            raise ServiceError(
                "MODEL_CONFIGURATION",
                "A reference voice (TTS_REF_AUDIO + TTS_REF_TEXT) is required to synthesize speech.",
                status_code=503,
            )

        output_dir = Path(settings.TTS_OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            import numpy as np  # noqa: PLC0415
            import soundfile as sf  # noqa: PLC0415
        except ImportError as exc:
            raise ServiceError(
                "MODEL_UNAVAILABLE",
                "Audio libraries (numpy/soundfile) are not installed.",
                status_code=503,
            ) from exc

        try:
            wav, sr, _ = self._model.infer(
                ref_audio=ref_audio,
                ref_text=ref_text,
                gen_text=text,
                nfe_step=32,
                cfg_strength=1.0,
                remove_silence=True,
                seed=-1,
            )
        except Exception as exc:
            # Never log the input text — it may contain sensitive business info.
            logger.error("generation_failed")
            raise ServiceError(
                "GENERATION_FAILED",
                "Speech generation failed.",
                status_code=502,
            ) from exc

        clean = np.asarray(wav).squeeze()
        if clean.size == 0:
            raise ServiceError(
                "GENERATION_FAILED",
                "Speech generation produced no audio.",
                status_code=502,
            )

        duration = float(clean.shape[0]) / float(sr)
        file_id = uuid.uuid4().hex
        path = output_dir / f"{file_id}.wav"
        sf.write(str(path), clean, sr)

        return {
            "file_id": file_id,
            "filename": path.name,
            "format": "wav",
            "duration": round(duration, 2),
            "sample_rate": int(sr),
        }


tts_service = TtsService()