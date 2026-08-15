"""Simple in-memory sliding-window rate limiter (per client IP)."""

import threading
import time
from collections import defaultdict, deque

from .errors import ServiceError


class _RateLimiter:
    def __init__(self):
        self._hits: dict = defaultdict(deque)
        self._lock = threading.Lock()

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