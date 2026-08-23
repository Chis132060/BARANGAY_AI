import logging
from typing import List, Dict, Any
import os

try:
    from sentence_transformers import CrossEncoder
except ImportError:
    # Reranking is an optional quality enhancement. The API must still start
    # and can fall back to the original retrieval order on small/local setups.
    CrossEncoder = None

logger = logging.getLogger(__name__)

class CrossEncoderReranker:
    """
    Reranks a list of candidate documents using a Cross-Encoder model.
    This provides significantly higher accuracy than Bi-Encoders (standard embeddings) 
    by processing the (Query, Document) pair simultaneously.
    """
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self.model = None
        self._initialize()

    def _initialize(self):
        if CrossEncoder is None:
            logger.warning("sentence-transformers is not installed; reranking disabled.")
            return
        try:
            # Lazy load the model to save memory if not immediately needed,
            # but initializing here warms it up for the first request.
            logger.info(f"Loading CrossEncoder reranker model: {self.model_name}")
            self.model = CrossEncoder(self.model_name, max_length=512)
        except Exception as e:
            logger.error(f"Failed to load CrossEncoder model {self.model_name}: {e}")
            self.model = None

    def rerank(self, query: str, candidates: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Reranks candidates based on semantic relevance to the query.
        
        Args:
            query: The user's search query.
            candidates: A list of dictionaries representing the documents. 
                        Must contain a 'content' or 'text' key.
            top_k: The number of documents to return after reranking.
            
        Returns:
            The reranked top_k list of documents, including a new 'rerank_score' key.
        """
        if not candidates:
            return []
            
        if not self.model:
            logger.warning("Reranker model not initialized. Returning original candidates.")
            return candidates[:top_k]

        # Extract text content for scoring
        pairs = []
        for doc in candidates:
            # We assume 'content' holds the text, fallback to 'text' or empty string
            text = doc.get("content", doc.get("text", ""))
            pairs.append([query, text])
            
        try:
            # Predict scores for all (query, doc) pairs
            scores = self.model.predict(pairs)
            
            # Attach scores to the original candidates
            for idx, doc in enumerate(candidates):
                doc["rerank_score"] = float(scores[idx])
                
            # Sort descending by score
            reranked = sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)
            
            return reranked[:top_k]
        except Exception as e:
            logger.error(f"Reranking failed: {e}. Falling back to original retrieval order.")
            return candidates[:top_k]

# Singleton instance
reranker = CrossEncoderReranker()
