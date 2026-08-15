"""
audit_service.py
Writes every LLM interaction to the ai_audit_logs Supabase table.
Runs as a fire-and-forget background task — never blocks the response.
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

            self.supabase.table("ai_audit_logs").insert(record).execute()
        except Exception as e:
            # Audit failures must never crash the main request
            print(f"[AuditService] WARNING: Failed to write audit log: {e}")


# Singleton
audit_service = AuditService()
