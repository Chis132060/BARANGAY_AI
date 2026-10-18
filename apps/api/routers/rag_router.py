from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from core.auth import authenticated_user, require_document_manager, require_user
from services.orchestrator import rag_service
from services.audit_service import audit_service
from services.supabase_service import get_supabase_client

router = APIRouter()


# ── Request / Response Models ────────────────────────────────────────────────

class IngestRequest(BaseModel):
    doc_id: str
    text: str
    metadata: Optional[dict] = {}


class ChatRequest(BaseModel):
    query: str
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


# ── Endpoints ────────────────────────────────────────────────────────────────

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
    Full RAG pipeline: Guard → Retrieve → LLM → Guard output.
    Audit logging is completed before the response is returned so every
    successful AI response has a durable audit attempt.
    """
    try:
        user = await authenticated_user(authorization)
        user_id = user["id"] if user else None
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

        result = await rag_service.generate_response(
            query=request.query,
            session_id=session_id,
            user_id=user_id,
            language=request.language,
        )

        await audit_service.log(
            query_text=request.query,
            response_text=result["answer"],
            retrieved_chunk_ids=result["chunk_ids"],
            model_used="gemini-1.5-flash",
            latency_ms=result["latency_ms"],
            user_id=user_id,
            session_id=session_id,
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
            audit_recorded=True,
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{session_id}")
async def clear_session_memory(session_id: str, authorization: Optional[str] = Header(default=None)):
    """Clear session memory — call on user logout."""
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
