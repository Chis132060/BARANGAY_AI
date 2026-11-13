"""
audit_service.py
Attempts a durable ai_audit_logs insert for model usage and response audits.
Returns the actual persistence result; never invents audit success.
"""

import time
from typing import List, Optional
from services.supabase_service import get_supabase_client


class AuditService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def log(
        self,
        query_text: str,
        response_text: str,
        retrieved_chunk_ids: List[str],
        model_used: str,
        latency_ms: int,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        tokens_prompt: Optional[int] = None,
        tokens_completion: Optional[int] = None,
        flagged: bool = False,
        flag_reason: Optional[str] = None,
    ):
        """
        Insert one row into ai_audit_logs.
        This is called as a FastAPI BackgroundTask so it never delays the user response.
        """
        try:
            record = {
                "query_text": query_text,
                "response_text": response_text,
                "retrieved_chunk_ids": retrieved_chunk_ids,
                "model_used": model_used,
                "latency_ms": latency_ms,
                "flagged": flagged,
            }
            if user_id:
                record["user_id"] = user_id
            if session_id:
                record["session_id"] = session_id
            if tokens_prompt is not None:
                record["tokens_prompt"] = tokens_prompt
            if tokens_completion is not None:
                record["tokens_completion"] = tokens_completion
            if flag_reason:
                record["flag_reason"] = flag_reason

            result = self.supabase.table("ai_audit_logs").insert(record).execute()
            return bool(getattr(result, "data", None))
        except Exception as e:
            # Logging failures must not crash chat, but the response must report
            # audit_recorded=False so the missing record is discoverable.
            print(f"[AuditService] WARNING: Failed to write audit log: {type(e).__name__}")
            return False


# Singleton
audit_service = AuditService()
