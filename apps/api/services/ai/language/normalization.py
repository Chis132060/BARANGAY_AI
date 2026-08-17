import json
import logging
from typing import Dict, Any, Optional

from langchain_core.messages import SystemMessage, HumanMessage
from services.ai.interfaces import AIRequest
from services.ai.manager import AIProviderManager

logger = logging.getLogger(__name__)

class QueryNormalizer:
    """
    Normalizes Cebuano/Bisaya/Bislish queries into a language-independent Intent Representation.
    It does NOT blindly translate to English; it identifies the core service and intent.
    """
    def __init__(self, provider_manager: AIProviderManager):
        self.provider_manager = provider_manager
        
    def normalize(self, query: str, detected_language: str) -> Dict[str, Any]:
        """
        Transforms "Unsa requirements sa clearance?" into:
        { "intent": "SERVICE_REQUIREMENTS", "service": "BARANGAY_CLEARANCE", "language": "ceb" }
        """
        system_prompt = (
            "You are a Barangay query normalization engine. Extract the underlying INTENT and SERVICE "
            "from the user's query regardless of the language (English, Cebuano, Bisaya, Tagalog, Mixed).\n"
            "Possible Intents: SERVICE_REQUIREMENTS, SERVICE_FEE, SERVICE_LOCATION, OFFICIAL_INFO, ANNOUNCEMENTS, GENERAL, AMBIGUOUS.\n"
            "Possible Services: BARANGAY_CLEARANCE, BUSINESS_PERMIT, RESIDENCY_CERTIFICATE, NONE.\n"
            "If the query is too short (e.g., 'clearance', 'pila?'), set intent to AMBIGUOUS.\n"
            "Respond ONLY with valid JSON: {\"intent\": \"...\", \"service\": \"...\"}"
        )
        
        request = AIRequest(
            messages=[
                SystemMessage(content=system_prompt),
                HumanMessage(content=query)
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        try:
            response = self.provider_manager.generate(request)
            content = response.content.strip()
            if content.startswith("```json"): content = content[7:-3]
            elif content.startswith("```"): content = content[3:-3]
            
            data = json.loads(content)
            
            return {
                "intent": data.get("intent", "GENERAL"),
                "service": data.get("service", "NONE"),
                "language": detected_language,
                "original_query": query
            }
        except Exception as e:
            logger.error(f"Failed to normalize query: {e}")
            return {
                "intent": "GENERAL",
                "service": "NONE",
                "language": detected_language,
                "original_query": query
            }
