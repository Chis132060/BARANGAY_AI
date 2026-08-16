import uuid
import asyncio
from typing import AsyncGenerator
from graphql.types import AIStreamEvent, AIStreamEventType, AISource
from services.rag_service import rag_service
from services.ai.grounding.response_validator import ResponseValidator

# We assume rag_service has or will have a stream capability, but for now we'll simulate the orchestrator
# flow to match the exact requirements of the stream failure states.

async def stream_ai_response(session_id: str, message: str) -> AsyncGenerator["AIStreamEvent", None]:
    request_id = str(uuid.uuid4())
    
    # 1. STARTED
    yield AIStreamEvent(requestId=request_id, type=AIStreamEventType.STARTED)
    
    try:
        # Retrieve context (mocking the RAG flow for the stream)
        context_results = await rag_service.search_knowledge(message, limit=4)
        
        # 2. Yield Sources
        for res in context_results:
            source = AISource(
                documentId=res["doc_id"],
                chunkId=str(res.get("chunk_index", 0)),
                title=res.get("metadata", {}).get("title"),
                sourceType=res.get("metadata", {}).get("source_type", "UNKNOWN"),
                trustLevel=res.get("metadata", {}).get("trust_level", "UNVERIFIED"),
            )
            yield AIStreamEvent(requestId=request_id, type=AIStreamEventType.SOURCE, source=source)
            
        # 3. Stream Generation
        # Ideally, we call the provider manager's generate_stream.
        # Since provider manager currently only has generate(), we simulate the stream 
        # by generating the full response and yielding it in chunks.
        # In a real implementation, we would await provider_manager.generate_stream()
        
        provider = rag_service.provider_manager.get_primary_provider()
        yield AIStreamEvent(requestId=request_id, type=AIStreamEventType.PROVIDER_FALLBACK, provider=provider.name)
        
        prompt = rag_service._build_prompt(message, context_results)
        
        # We'll just call the standard generator for now and simulate chunking for the API contract
        # A true production implementation would use async chunk yielding from the LLM client.
        llm_response = await provider.generate(prompt)
        
        accumulated_response = ""
        # Simulate chunked streaming (e.g. from Langchain/Gemini stream)
        words = llm_response.split(" ")
        for word in words:
            chunk = word + " "
            accumulated_response += chunk
            yield AIStreamEvent(requestId=request_id, type=AIStreamEventType.TOKEN, content=chunk)
            await asyncio.sleep(0.01) # Simulate network delay
            
        # 4. Final Validation
        validator = ResponseValidator()
        # Create a mock source list for the validator format
        mock_sources = [{"content": r["content"], "title": r.get("metadata", {}).get("title")} for r in context_results]
        
        validation_result = validator.validate(accumulated_response, mock_sources)
        
        if validation_result.status == "PASS":
            yield AIStreamEvent(
                requestId=request_id, 
                type=AIStreamEventType.COMPLETED, 
                grounded=True
            )
        else:
            yield AIStreamEvent(
                requestId=request_id, 
                type=AIStreamEventType.ERROR, 
                content="Response failed grounding validation.",
                grounded=False
            )
            
    except Exception as e:
        yield AIStreamEvent(
            requestId=request_id, 
            type=AIStreamEventType.ERROR, 
            content=str(e),
            grounded=False
        )
