import logging
from typing import List, Dict, Any
from services.supabase_service import get_supabase_client
from services.ai.embeddings import embedding_manager
from services.ai.retrieval.reranker import reranker
from services.ai.retrieval.result_normalizer import normalize_retrieval_result

logger = logging.getLogger(__name__)

class HybridRetriever:
    """
    Coordinates semantic vector search and exact keyword search, merging the results 
    and passing them through a Cross-Encoder reranker.
    """
    def __init__(self):
        self.supabase = get_supabase_client()

    async def _vector_search(self, query: str, limit: int = 20, threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Perform dense semantic search using pgvector."""
        provider = embedding_manager.get_primary_provider()
        if not provider:
            logger.warning("No active embedding provider. Skipping vector search.")
            return []
            
        try:
            # Embed query in the active vector space
            response = embedding_manager.embed_for_space([query], provider.space_id)
            query_embedding = response.embeddings[0]
            
            rpc_name = f"match_knowledge_embeddings_{provider.name}"
            db_response = self.supabase.rpc(
                rpc_name,
                {"query_embedding": query_embedding, "match_threshold": threshold, "match_count": limit}
            ).execute()
            
            return db_response.data or []
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

    async def _keyword_search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Perform exact keyword / full-text search.
        Requires a PostgreSQL text search index or ILIKE fallback.
        For simplicity, we use a basic Supabase textSearch if available, or just fetch recent.
        In production, a dedicated RPC `keyword_search_chunks` should be used.
        """
        try:
            db_response = self.supabase.rpc("keyword_search_chunks", {"search_term": query, "match_count": limit}).execute()
            return db_response.data or []
        except Exception as e:
            # It's highly likely the RPC doesn't exist yet, catch and ignore
            logger.debug(f"Keyword search RPC not found or failed, skipping: {e}")
            return []

    async def retrieve(self, query: str, top_k: int = 8) -> List[Dict[str, Any]]:
        """
        1. Fetch candidates from Vector Search
        2. Fetch candidates from Keyword Search
        3. Merge & Deduplicate
        4. Rerank
        """
        # Fetch both concurrently (in a real async environment we use asyncio.gather)
        # Supabase python client is mostly sync right now, but wrapped in async.
        vector_results = await self._vector_search(query, limit=30)
        keyword_results = await self._keyword_search(query, limit=20)
        
        # Normalize provider-specific RPC shapes before merging. Vector RPCs
        # return chunk_id; legacy keyword search implementations may return id.
        merged_dict: Dict[str, Dict[str, Any]] = {}
        for raw_chunk in [*vector_results, *keyword_results]:
            chunk = normalize_retrieval_result(raw_chunk)
            if chunk is None:
                logger.warning("Skipping retrieval row without a chunk identifier.")
                continue

            chunk_id = chunk["id"]
            existing = merged_dict.get(chunk_id)
            if existing is None:
                merged_dict[chunk_id] = chunk
                continue

            # Merge metadata from both channels and keep the strongest similarity.
            merged = {**existing, **chunk}
            scores = [
                value for value in (existing.get("similarity"), chunk.get("similarity"))
                if isinstance(value, (int, float))
            ]
            if scores:
                merged["similarity"] = max(scores)
            merged_dict[chunk_id] = merged

        candidates = list(merged_dict.values())
        if not candidates:
            return []

        reranked = reranker.rerank(query, candidates, top_k=top_k)
        for rank, chunk in enumerate(reranked):
            chunk["retrieval_rank"] = rank
        return reranked

# Singleton
hybrid_retriever = HybridRetriever()
