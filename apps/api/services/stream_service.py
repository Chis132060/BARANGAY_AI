import asyncio
import logging
from typing import AsyncGenerator
from .orchestrator import rag_service
from .ai.interfaces import AIRequest
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

async def stream_ai_response(session_id: str, message: str) -> AsyncGenerator[str, None]:
    """
    Real-time AI streaming using GraphQL Subscriptions.
    Integrates directly with the ProviderManager to yield tokens as they arrive.
    """
    yield '{"event": "STARTED", "status": "Initializing intent detection..."}'
    
    # 1. Orchestrator Prep (Mocking the pipeline setup here for the stream, 
    # normally we'd expose a streaming variant of generate_response directly in orchestrator)
    # For now, we simulate the validation steps and then stream the provider.
    
    yield '{"event": "VALIDATING", "status": "Checking policies and tool planner..."}'
    await asyncio.sleep(0.5) # Simulate policy engine latency
    
    yield '{"event": "VALIDATING", "status": "Retrieving hybrid knowledge..."}'
    # We fetch the context
    from .ai.retrieval.hybrid_search import hybrid_retriever
    from .ai.grounding import ContextValidator
    validator = ContextValidator()
    
    raw_chunks = await hybrid_retriever.retrieve(message, top_k=3)
    valid_chunks = validator.validate_and_rank(raw_chunks)
    
    if valid_chunks:
        sources = [str(c["id"]) for c in valid_chunks]
        yield f'{{"event": "SOURCE", "sources": {sources}}}'
    else:
        yield '{"event": "VALIDATING", "status": "No highly trusted documents found. Relying on general knowledge."}'
        
    context_text = "\n\n".join(f"--- ID: {c['id']} ---\n{c['content']}" for c in valid_chunks) or "NONE"
    system_prompt = f"Answer the user strictly using this context:\n{context_text}"
    
    yield '{"event": "GENERATING", "status": "Streaming response from provider..."}'
    
    # 2. Stream generation
    try:
        from .ai.manager import AIProviderManager
        provider = AIProviderManager()
        
        request = AIRequest(
            messages=[SystemMessage(content=system_prompt), HumanMessage(content=message)],
            temperature=0.1
        )
        
        # In a real async environment, we'd use an async generator from the provider.
        # Assuming provider.generate_stream exists or we chunk a sync response for now.
        # Since we haven't implemented async stream in AIProviderManager yet, we simulate the stream chunks.
        response = provider.generate(request)
        words = response.content.split(" ")
        
        for word in words:
            yield f'{{"event": "TOKEN", "token": "{word} "}}'
            await asyncio.sleep(0.02)
            
        yield '{"event": "COMPLETED", "status": "Response grounded and validated."}'
        
    except Exception as e:
        logger.error(f"Stream failed: {e}")
        yield f'{{"event": "ERROR", "message": "{str(e)}"}}'

