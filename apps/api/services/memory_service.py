"""
memory_service.py
In-process session memory store keyed by session_id.
Holds the last K turns so the LLM has conversation context.
"""

from collections import defaultdict, deque
from typing import List, Dict
import time

# Keep only the last N turns per session (1 turn = 1 user + 1 AI message)
MAX_TURNS = 10
# Sessions expire after 2 hours of inactivity (in seconds)
SESSION_TTL = 7200


class _Session:
    def __init__(self):
        self.history: deque[Dict[str, str]] = deque(maxlen=MAX_TURNS * 2)
        self.last_active: float = time.time()

    def add(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        self.last_active = time.time()

    def get_history(self) -> List[Dict[str, str]]:
        return list(self.history)

    def is_expired(self) -> bool:
        return (time.time() - self.last_active) > SESSION_TTL


class MemoryService:
    def __init__(self):
        self._sessions: Dict[str, _Session] = {}

    def _cleanup(self):
        """Remove expired sessions to prevent memory leaks."""
        expired = [sid for sid, s in self._sessions.items() if s.is_expired()]
        for sid in expired:
            del self._sessions[sid]

    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        """Return conversation history for a session."""
        self._cleanup()
        if session_id not in self._sessions:
            return []
        return self._sessions[session_id].get_history()

    def add_turn(self, session_id: str, user_message: str, ai_response: str):
        """Append one complete turn (user + AI) to session memory."""
        if session_id not in self._sessions:
            self._sessions[session_id] = _Session()
        session = self._sessions[session_id]
        session.add("user", user_message)
        session.add("assistant", ai_response)

    def clear_session(self, session_id: str):
        """Explicitly clear a session (e.g., on logout)."""
        self._sessions.pop(session_id, None)


# Singleton used across the app
memory_service = MemoryService()
