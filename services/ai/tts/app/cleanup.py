"""TTL cleanup of generated audio files (temporary artifacts are never committed)."""

import logging
import time
from pathlib import Path

from .config import settings

logger = logging.getLogger("tts.cleanup")


def _cleanup_once() -> None:
    out = Path(settings.TTS_OUTPUT_DIR)
    if not out.is_dir():
        return
    retention = settings.TTS_AUDIO_RETENTION_HOURS * 3600
    cutoff = time.time() - retention
    removed = 0
    for p in out.rglob("*.wav"):
        try:
            if p.stat().st_mtime < cutoff:
                p.unlink(missing_ok=True)
                removed += 1
        except OSError:  # pragma: no cover - best effort
            continue
    if removed:
        logger.info("audio_cleanup removed=%s", removed)