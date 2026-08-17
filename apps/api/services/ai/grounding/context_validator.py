import logging
from typing import List, Dict, Any
from core.config import settings

logger = logging.getLogger(__name__)

class ContextValidator:
    """
    Evaluates retrieved chunks against the user query before generation.
    Filters out irrelevant chunks based on semantic similarity, trust, and freshness.
    """
    
    def __init__(self, min_relevance_score: float = None):
        self.min_relevance_score = min_relevance_score or getattr(settings, "RAG_MIN_RELEVANCE_SCORE", 0.70)

    def validate_and_rank(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Ranks and filters retrieved chunks.
        chunks: List of dicts representing database rows from match_knowledge_chunks RPC.
        Expected keys: 'id', 'content', 'similarity', 'trust_level', 'published_at', etc.
        """
        valid_chunks = []
        
        # Mapping trust levels to weights
        trust_weights = {
            "AUTHORITATIVE": 1.0,
            "TRUSTED": 0.9,
            "VERIFIED": 0.8,
            "GENERAL": 0.5,
            "UNVERIFIED": 0.2
        }

        for chunk in chunks:
            semantic_score = chunk.get("similarity", 0.0)
            trust_level = chunk.get("trust_level", "GENERAL")
            trust_score = trust_weights.get(trust_level, 0.5)
            
            # Simplified ranking formula (could be expanded with freshness/keywords)
            # Example: 70% semantic, 30% trust
            final_score = (0.7 * semantic_score) + (0.3 * trust_score)
            
            # Store calculated score for ranking
            chunk["final_score"] = final_score
            
            if final_score >= self.min_relevance_score:
                valid_chunks.append(chunk)
            else:
                logger.debug(f"Chunk {chunk.get('id')} rejected. Score: {final_score:.2f} < {self.min_relevance_score}")
                
        # Sort descending by final score
        valid_chunks.sort(key=lambda x: x["final_score"], reverse=True)
        return valid_chunks
