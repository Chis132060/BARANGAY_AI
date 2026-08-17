import logging
from enum import Enum

logger = logging.getLogger(__name__)

class ModelCapability(Enum):
    FAST = "FAST_MODEL"         # e.g., Gemini 1.5 Flash, Groq Llama 3 8B
    STRONG = "STRONG_MODEL"     # e.g., Gemini 1.5 Pro, GPT-4o, Claude 3.5 Sonnet
    LOCAL = "LOCAL_MODEL"       # e.g., Local Ollama (fallback/privacy strict)

class ModelRouter:
    """
    Intelligently routes queries to the most efficient model class, reducing API cost 
    and latency for simple queries while reserving strong reasoning for complex ones.
    
    IMPORTANT: Regardless of the model chosen here, all models must strictly pass
    through the identical Response Validation and Grounding pipeline. No safety bypasses.
    """
    
    def route_query(self, query: str, requires_tools: bool = False, requires_kg: bool = False) -> ModelCapability:
        """
        Determines the appropriate model class based on query heuristics.
        """
        query_lower = query.lower()
        
        # 1. Tool Usage Requirement
        # If the query requires dispatching tools or complex planning, we need a strong model.
        if requires_tools or requires_kg:
            logger.info("Routing to STRONG_MODEL: Query requires tools or Knowledge Graph traversal.")
            return ModelCapability.STRONG
            
        # 2. Complexity / Ambiguity Heuristics
        # Words indicating synthesis, comparison, or high reasoning
        complex_keywords = ["compare", "analyze", "difference between", "summarize multiple", "evaluate"]
        if any(keyword in query_lower for keyword in complex_keywords):
            logger.info("Routing to STRONG_MODEL: Complex reasoning keywords detected.")
            return ModelCapability.STRONG
            
        # 3. Context Length Heuristics
        if len(query) > 1000:
            logger.info("Routing to STRONG_MODEL: Long context/query length.")
            return ModelCapability.STRONG
            
        # 4. Default to Fast
        logger.info("Routing to FAST_MODEL: Simple RAG/FAQ detected.")
        return ModelCapability.FAST

model_router = ModelRouter()
