"""Simple in-memory sliding-window rate limiter (per client IP).

Good enough for protecting self-hosted AI services behind the API layer.
For multi-instance deployments, move this to Redis or a reverse proxy.
"""

import threading
import time
from collections import defaultdict, deque

from .errors import ServiceError


class _RateLimiter:
    def __init__(self):
        self._hits: dict = defaultdict(deque)
        self._lock = threading.Lock()

    def reset(self) -> None:
        """Clear all tracked hits (used between tests and on config change)."""
        with self._lock:
            self._hits.clear()

    def check(self, key: str, max_per_minute: int) -> None:
        if max_per_minute <= 0:
            return
        now = time.monotonic()
        window_start = now - 60.0
        with self._lock:
            dq = self._hits[key]
            while dq and dq[0] < window_start:
                dq.popleft()
            if len(dq) >= max_per_minute:
                raise ServiceError(
                    "RATE_LIMITED", "Too many requests. Please try again later.", status_code=429
                )
            dq.append(now)


rate_limiter = _RateLimiter()