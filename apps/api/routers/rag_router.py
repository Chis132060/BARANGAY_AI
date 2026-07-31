from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional

from services.rag_service import rag_service
from services.audit_service import audit_service

router = APIRouter()


# ── Request / Response Models ────────────────────────────────────────────────

class IngestRequest(BaseModel):
    doc_id: str
    text: str
    metadata: Optional[dict] = {}


class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None  # passed from Next.js proxy after JWT decode


class ChatResponse(BaseModel):
    answer: str
    citations: List[str]
    context_used: bool
    flagged: bool
    latency_ms: int


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/ingest")
async def ingest_document(request: IngestRequest):
    """Chunk, embed, and store a document into the knowledge base."""
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
async def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    """
    Full RAG pipeline: Guard → Retrieve → LLM → Guard output.
    Audit logging fires in the background so it never delays the response.
    """
    try:
        result = await rag_service.generate_response(
            query=request.query,
            session_id=request.session_id,
            user_id=request.user_id,
        )

        # Fire-and-forget audit log
        background_tasks.add_task(
            audit_service.log,
            query_text=request.query,
            response_text=result["answer"],
            retrieved_chunk_ids=result["chunk_ids"],
            model_used="gemini-1.5-flash",
            latency_ms=result["latency_ms"],
            user_id=request.user_id,
            session_id=request.session_id,
            flagged=result["flagged"],
            flag_reason=result.get("flag_reason"),
        )

        return ChatResponse(
            answer=result["answer"],
            citations=result["citations"],
            context_used=result["context_used"],
            flagged=result["flagged"],
            latency_ms=result["latency_ms"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{session_id}")
async def clear_session_memory(session_id: str):
    """Clear session memory — call on user logout."""
    from services.memory_service import memory_service
    memory_service.clear_session(session_id)
    return {"status": "cleared", "session_id": session_id}
