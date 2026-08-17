import asyncio
from services.orchestrator import rag_service

async def test_chat():
    print("Testing AI Brain RAG Pipeline...\n")
    
    query = "How do I get a Barangay Clearance?"
    print(f"User Query: {query}")
    
    try:
        response = await rag_service.generate_response(
            query=query,
            session_id="test_session_123",
            user_id="test_user"
        )
        
        print("\n--- AI Response ---")
        print(response["answer"])
        print("\n--- Metadata ---")
        print(f"Context Used: {response['context_used']}")
        print(f"Citations (Chunk IDs): {response['citations']}")
        print(f"Latency: {response['latency_ms']}ms")
        
    except Exception as e:
        print(f"Error during chat: {e}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(test_chat())
