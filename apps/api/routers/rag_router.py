from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

from core.auth import require_chat_access, require_document_manager, require_user
from services.orchestrator import rag_service
from services.audit_service import audit_service
from services.ai.usage_tracking import begin_usage_tracking, finish_usage_tracking
from services.supabase_service import get_supabase_client

router = APIRouter()


# â”€â”€ Request / Response Models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class IngestRequest(BaseModel):
    doc_id: str
    text: str
    metadata: Optional[dict] = {}


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    user_id: Optional[str] = None  # ignored; identity is derived from the verified token
    language: str = "tgl"


class ChatResponse(BaseModel):
    answer: str
    citations: List[str]
    context_used: bool
    flagged: bool
    latency_ms: int
    form_type: Optional[str] = None
    form_schema: Optional[dict] = None
    audit_recorded: bool = False
    model_used: Optional[str] = None


# â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/ingest")
async def ingest_document(request: IngestRequest, authorization: Optional[str] = Header(default=None)):
    """Chunk, embed, and store a document into the knowledge base."""
    user = await require_user(authorization)
    require_document_manager(user["id"])
    try:
        chunk_count = await rag_service.ingest_document(
            doc_id=request.doc_id,
            text=request.text,
            metadata=request.metadata,
        )
        return {"status": "success", "chunks_created": chunk_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: Optional[str] = Header(default=None)):
    """
    Full RAG pipeline: Guard â†’ Retrieve â†’ LLM â†’ Guard output.
    Audit logging is completed before the response is returned so every
    successful AI response has a durable audit attempt.
    """
    try:
        user = await require_chat_access(authorization)
        user_id = user["id"]
        session_id = None
        if user_id and request.session_id:
            try:
                session_id = str(UUID(request.session_id))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid session id")
            db = get_supabase_client()
            existing = db.table("ai_sessions").select("id,user_id").eq("id", session_id).maybe_single().execute()
            if existing.data and existing.data.get("user_id") != user_id:
                raise HTTPException(status_code=404, detail="Session not found")
            if not existing.data:
                db.table("ai_sessions").insert({"id": session_id, "user_id": user_id, "title": "Resident chat"}).execute()

        usage_token = begin_usage_tracking()
        try:
            result = await rag_service.generate_response(
                query=request.query,
                session_id=session_id,
                user_id=user_id,
                language=request.language,
            )
        finally:
            usage = finish_usage_tracking(usage_token)

        # Include query classification, tool-planning, and generation calls,
        # not just the final answer. Do not report zero if a provider omitted usage.
        model_used = ", ".join(usage.models)[:200] if usage.models else (
            "no-llm" if usage.attempted_calls == 0 else "unknown-provider-usage"
        )
        audit_recorded = await audit_service.log(
            query_text=request.query,
            response_text=result["answer"],
            retrieved_chunk_ids=result["chunk_ids"],
            model_used=model_used,
            latency_ms=result["latency_ms"],
            user_id=user_id,
            session_id=session_id,
            tokens_prompt=usage.prompt_tokens if usage.tokens_known else None,
            tokens_completion=usage.completion_tokens if usage.tokens_known else None,
            flagged=result["flagged"],
            flag_reason=result.get("flag_reason"),
        )

        return ChatResponse(
            answer=result["answer"],
            citations=result["citations"],
            context_used=result["context_used"],
            flagged=result["flagged"],
            latency_ms=result["latency_ms"],
            form_type=result.get("form_type"),
            form_schema=result.get("form_schema"),
            audit_recorded=bool(audit_recorded),
            model_used=model_used,
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{session_id}")
async def clear_session_memory(session_id: str, authorization: Optional[str] = Header(default=None)):
    """Clear session memory â€” call on user logout."""
    from services.memory.memory_service import memory_service
    user = await require_user(authorization)
    try:
        session_id = str(UUID(session_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session id")
    session = get_supabase_client().table("ai_sessions").select("id").eq("id", session_id).eq("user_id", user["id"]).maybe_single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    memory_service.clear_session(session_id)
    return {"status": "cleared", "session_id": session_id}

@router.get("/health/ai")
async def ai_health_check():
    """Returns the circuit breaker and health status of all AI providers."""
    # Assuming rag_service uses an AIProviderManager internally
    if hasattr(rag_service, 'provider_manager'):
        return rag_service.provider_manager.get_health()
    return {"status": "unknown", "message": "AIProviderManager not initialized"}

