import json
import logging
from enum import Enum
from typing import Optional

from services.ai.interfaces import AIRequest, Message
from services.ai.manager import AIProviderManager

logger = logging.getLogger(__name__)

class Route(str, Enum):
    LIVE_DATA = "LIVE_DATA"
    RAG = "RAG"
    HYBRID = "HYBRID"
    GENERAL = "GENERAL"

class QueryRouter:
    def __init__(self, provider_manager: AIProviderManager):
        self.provider_manager = provider_manager

    def route_query(self, query: str) -> Route:
        """
        Server-side router that inspects user queries and routes them to the correct data source.
        Uses a fast, low-temperature LLM classification call.
        """
        system_prompt = (
            "You are a strict query classification router for a barangay/city AI assistant.\n"
            "Classify the user's query into exactly one of these four categories:\n"
            "1. LIVE_DATA: For dynamic, real-time backend data (e.g., 'How many active buses?', 'What are today's announcements?', 'Who is logged in?').\n"
            "2. RAG: For static knowledge, documents, policies, or general barangay information (e.g., 'What is the barangay mission?', 'How do I apply for a permit?').\n"
            "3. HYBRID: If the query asks for BOTH live data and static policies.\n"
            "4. GENERAL: General conversation or questions completely unrelated to the application (e.g., 'What is Python?', 'Hello', 'Translate this').\n\n"
            "Respond ONLY with a valid JSON object matching this schema: {\"route\": \"LIVE_DATA|RAG|HYBRID|GENERAL\"}"
        )

        request = AIRequest(
            messages=[
                Message(role="system", content=system_prompt),
                Message(role="user", content=query)
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )

        try:
            # We use the provider manager to ensure high availability even for routing
            response = self.provider_manager.generate(request)
            
            # The output should be JSON.
            content = response.content.strip()
            # Handle potential markdown code blocks
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            data = json.loads(content)
            route_str = data.get("route", "RAG").upper()
            
            # Fallback to RAG if invalid
            if route_str in Route._value2member_map_:
                return Route(route_str)
            return Route.RAG
            
        except Exception as e:
            logger.error(f"Failed to route query '{query}', defaulting to RAG: {e}")
            return Route.RAG
