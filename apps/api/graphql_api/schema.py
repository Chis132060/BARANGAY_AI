import strawberry
from typing import List, Optional
import uuid
from .types import AISession, AIHealth, AIResponse, AIMessage, PageInfo, AISessionConnection, AIStreamEvent
from .security import require_auth
from .errors import AIError, create_error
from services.supabase_service import get_supabase_client
from services.orchestrator import rag_service
from services.memory.memory_service import memory_service

# Define input types
@strawberry.input
class CreateAISessionInput:
    title: Optional[str] = None

@strawberry.input
class SendAIMessageInput:
    sessionId: str
    message: str
    clientRequestId: str

@strawberry.type
class Query:
    @strawberry.field
    def ai_session(self, info: strawberry.Info, id: str) -> AISession:
        user_id = require_auth(info)
        supabase = get_supabase_client()
        
        # Check ownership
        res = supabase.table("ai_sessions").select("*").eq("id", id).eq("user_id", user_id).execute()
        if not res.data:
            raise Exception("SESSION_ACCESS_DENIED")
            
        session_data = res.data[0]
        
        # Fetch messages
        msg_res = supabase.table("ai_messages").select("*").eq("session_id", id).order("created_at").execute()
        messages = [
            AIMessage(
                id=m["id"], role=m["role"], content=m["content"], createdAt=m["created_at"]
            ) for m in msg_res.data
        ]
        
        return AISession(
            id=session_data["id"],
            title=session_data.get("title"),
            createdAt=session_data["created_at"],
            updatedAt=session_data["updated_at"],
            messages=messages
        )

    @strawberry.field
    def ai_health(self) -> AIHealth:
        from services.ai.embeddings import embedding_manager
        primary = embedding_manager.get_primary_provider()
        health = embedding_manager.get_health()
        active = sum(1 for p in health.values() if p["available"])
        return AIHealth(
            status="OK" if active > 0 else "DEGRADED",
            primaryProvider=primary.name if primary else "NONE",
            activeProviders=active
        )

@strawberry.type
class Mutation:
    @strawberry.field
    def create_ai_session(self, info: strawberry.Info, input: CreateAISessionInput) -> AISession:
        user_id = require_auth(info)
        supabase = get_supabase_client()
        
        res = supabase.table("ai_sessions").insert({
            "user_id": user_id,
            "title": input.title or "New Conversation"
        }).execute()
        
        data = res.data[0]
        return AISession(
            id=data["id"],
            title=data["title"],
            createdAt=data["created_at"],
            updatedAt=data["updated_at"],
            messages=[]
        )

    @strawberry.field
    async def send_ai_message(self, info: strawberry.Info, input: SendAIMessageInput) -> AIResponse:
        user_id = require_auth(info)
        supabase = get_supabase_client()
        
        # 1. Authorize Session
        res = supabase.table("ai_sessions").select("id").eq("id", input.sessionId).eq("user_id", user_id).execute()
        if not res.data:
            raise Exception("SESSION_ACCESS_DENIED")
            
        # 2. Idempotency Check
        existing_msg = supabase.table("ai_messages").select("metadata").eq("session_id", input.sessionId).eq("client_request_id", input.clientRequestId).execute()
        if existing_msg.data:
            # We already processed this request! Return the cached response
            # In a real app we'd construct a full AIResponse from the DB, but here we just raise for simplicity
            raise Exception("DUPLICATE_REQUEST")
            
        # 3. Call Orchestrator
        try:
            # The RAG service internally calls memory_service to append the turns
            response_data = await rag_service.generate_response(input.message, session_id=input.sessionId)
            
            # Attach the client request ID to the memory_service turn
            memory_service.add_turn(
                input.sessionId, 
                input.message, 
                response_data["answer"], 
                metadata={"provider": "gemini", "grounded": response_data["context_used"]},
                client_request_id=input.clientRequestId
            )
            
            return AIResponse(
                requestId=str(uuid.uuid4()),
                sessionId=input.sessionId,
                answer=response_data["answer"],
                grounded=response_data["context_used"],
                sources=[], # To be hydrated from citations
                toolsUsed=[]
            )
        except Exception as e:
            raise Exception(f"AI_UNAVAILABLE: {e}")

# The subscription will be added when stream_service is complete
from services.stream_service import stream_ai_response

@strawberry.type
class Subscription:
    @strawberry.subscription
    async def ai_response_stream(self, info: strawberry.Info, session_id: str, message: str) -> AIStreamEvent:
        # Authentication occurs in WebSocket init payload (handled by context/middleware)
        async for event in stream_ai_response(session_id, message):
            yield event

schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
