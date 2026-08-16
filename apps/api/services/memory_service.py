"""
memory_service.py
Persistent session memory store backed by Supabase `ai_sessions` and `ai_messages`.
"""

from typing import List, Dict, Optional
import logging
from services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

# Keep only the last N turns per session in memory retrieval
MAX_TURNS = 10

class MemoryService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        """Return conversation history for a session."""
        try:
            # Fetch the last (MAX_TURNS * 2) messages, ordered by created_at DESC
            res = self.supabase.table("ai_messages") \
                .select("role, content") \
                .eq("session_id", session_id) \
                .order("created_at", desc=True) \
                .limit(MAX_TURNS * 2) \
                .execute()
                
            if not res.data:
                return []
                
            # Reverse to chronological order
            messages = res.data[::-1]
            return [{"role": m["role"], "content": m["content"]} for m in messages]
        except Exception as e:
            logger.error(f"Failed to get history for session {session_id}: {e}")
            return []

    def add_turn(self, session_id: str, user_message: str, ai_response: str, 
                 metadata: Optional[Dict] = None, client_request_id: Optional[str] = None):
        """Append one complete turn (user + AI) to session memory."""
        try:
            # First, update the session updated_at timestamp
            self.supabase.table("ai_sessions").update({
                "updated_at": "now()"
            }).eq("id", session_id).execute()

            # We insert the user message and AI response
            # If client_request_id is provided, we attach it to the user message for idempotency.
            user_msg = {
                "session_id": session_id,
                "role": "user",
                "content": user_message
            }
            if client_request_id:
                user_msg["client_request_id"] = client_request_id

            ai_msg = {
                "session_id": session_id,
                "role": "assistant",
                "content": ai_response,
                "metadata": metadata or {}
            }
            
            # Insert sequentially to ensure correct ordering if they have the exact same timestamp
            # Wait, Supabase lets us insert a list, which maintains order in the DB generally, 
            # but separating them ensures the AI message is strictly after the User message.
            self.supabase.table("ai_messages").insert([user_msg, ai_msg]).execute()
            
        except Exception as e:
            logger.error(f"Failed to add turn for session {session_id}: {e}")

    def clear_session(self, session_id: str):
        """Explicitly clear a session (deletes it from DB)."""
        try:
            self.supabase.table("ai_sessions").delete().eq("id", session_id).execute()
        except Exception as e:
            logger.error(f"Failed to clear session {session_id}: {e}")

# Singleton used across the app
memory_service = MemoryService()
