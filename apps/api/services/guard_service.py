"""
guard_service.py
Input sanitization (prompt injection) + Output PII filter.
"""

import re
from typing import Tuple

# ── Prompt-injection patterns ────────────────────────────────────────────────
INJECTION_PATTERNS = [
    r"ignore (all )?(previous|prior|above) instructions?",
    r"disregard (all )?(previous|prior|above) instructions?",
    r"forget (everything|all|your instructions?)",
    r"you are now",
    r"act as (a )?(different|new|another|evil|unrestricted)",
    r"pretend (you are|to be)",
    r"your (new |real )?instructions? are",
    r"system prompt",
    r"jailbreak",
    r"do anything now",
    r"dan mode",
    r"developer mode",
    r"override (safety|filter|restriction)",
    r"reveal (your |the )?(system |hidden |secret )?prompt",
    r"repeat (your |the )?(system |hidden |secret )?prompt",
]

# ── Philippine PII patterns in output ───────────────────────────────────────
PII_PATTERNS = [
    r"\b\d{3}-\d{2}-\d{4}\b",            # SSS number format
    r"\b\d{4}-\d{4}-\d{4}-\d{4}\b",      # PhilSys / PhilHealth
    r"\b09\d{9}\b",                       # PH mobile number
    r"\b\+639\d{9}\b",                    # PH mobile international
    r"\b\d{12}\b",                        # Generic 12-digit ID
]


def check_input(text: str) -> Tuple[bool, str]:
    """
    Returns (is_safe, reason).
    is_safe=False means the message should be blocked.
    """
    normalized = text.lower().strip()

    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return False, f"Possible prompt injection detected: matched pattern '{pattern}'"

    # Block if message is suspiciously long (likely pasting a system prompt override)
    if len(text) > 2000:
        return False, "Message too long (max 2000 characters)"

    return True, ""


def check_output(text: str) -> Tuple[str, bool, str]:
    """
    Returns (sanitized_text, was_flagged, flag_reason).
    Redacts PII patterns from the AI response.
    """
    flagged = False
    flag_reason = ""
    sanitized = text

    for pattern in PII_PATTERNS:
        if re.search(pattern, sanitized):
            sanitized = re.sub(pattern, "[REDACTED]", sanitized)
            flagged = True
            flag_reason = "Output contained potential PII — redacted before returning to client"

    return sanitized, flagged, flag_reason
