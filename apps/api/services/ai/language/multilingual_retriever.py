from typing import List, Dict, Any
from services.ai.retrieval.hybrid_search import hybrid_retriever
from services.ai.language.terminology import expand_query_terms

class MultilingualRetriever:
    """
    Wraps the HybridRetriever to ensure that Cebuano/Bisaya queries can 
    retrieve English authoritative documents.
    """
    
    async def retrieve(self, original_query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # 1. Expand local terms to include official English variants for better keyword matching
        expanded_query = expand_query_terms(original_query)
        
        # 2. Retrieve using the expanded query
        # Since the vector space is defined in the orchestrator/embeddings config,
        # we rely on the multilingual capability of the embedding model itself for semantic hits,
        # and our terminology expansion for exact keyword hits.
        results = await hybrid_retriever.retrieve(expanded_query, top_k=top_k)
        
        return results

multilingual_retriever = MultilingualRetriever()
