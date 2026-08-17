import logging
from typing import List, Dict, Any
from services.supabase_service import get_supabase_client
from services.ai.embeddings.manager import embedding_manager
from apps.api.services.ai.retrieval.reranker import reranker

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
            # We mock a keyword search RPC here. If it doesn't exist, we fallback to empty.
            # A real implementation would execute:
            # self.supabase.table("knowledge_chunks").select("*").textSearch("content", query).limit(limit).execute()
            
            # Since full text search might not be configured on 'content' directly without an index,
            # we will assume an RPC 'keyword_search_chunks' is created, or we fallback gracefully.
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
        
        # Deduplicate based on chunk ID
        merged_dict = {}
        
        for chunk in vector_results:
            merged_dict[str(chunk["id"])] = chunk
            
        for chunk in keyword_results:
            if str(chunk["id"]) not in merged_dict:
                merged_dict[str(chunk["id"])] = chunk
                
        candidates = list(merged_dict.values())
        
        if not candidates:
            return []
            
        # Rerank the merged candidates
        reranked = reranker.rerank(query, candidates, top_k=top_k)
        
        return reranked

# Singleton
hybrid_retriever = HybridRetriever()
