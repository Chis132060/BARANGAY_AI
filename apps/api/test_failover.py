import os
import asyncio
import logging
from dotenv import load_dotenv

# Configure basic logging to see failover events
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

load_dotenv()

from langchain_core.messages import HumanMessage
from services.ai.manager import AIProviderManager
from services.ai.interfaces import AIRequest
from core.config import settings

def test_failover_simulation():
    print("\n=== Multi-Provider AI Failover Test ===\n")
    
    # Intentionally corrupt the primary API key to simulate failure
    print("1. Simulating Gemini Failure (Invalid API Key)")
    original_gemini_key = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = "invalid_gemini_key_123"
    
    manager = AIProviderManager()
    request = AIRequest(messages=[HumanMessage(content="Say 'Failover successful!'")])
    
    try:
        response = manager.generate(request)
        print(f"\n=> Final Response from {response.provider}: {response.content}")
        print(f"=> Latency: {response.latency_ms}ms\n")
    except Exception as e:
        print("=> Final Error:", e)
        
    print("2. Simulating Gemini AND Groq Failure")
    settings.GROQ_API_KEY = "invalid_groq_key_456"
    manager = AIProviderManager() # Re-instantiate to pickup fake keys
    try:
        response = manager.generate(request)
        print(f"\n=> Final Response from {response.provider}: {response.content}")
    except Exception as e:
        print("=> Final Error:", e)
        
    # Restore original settings
    settings.GEMINI_API_KEY = original_gemini_key

if __name__ == "__main__":
    test_failover_simulation()
