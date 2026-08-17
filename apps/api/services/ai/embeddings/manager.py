import logging
from typing import List, Optional, Dict, Any
from .interfaces import EmbeddingProvider, EmbeddingRequest, EmbeddingResponse
from core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingProviderManager:
    def __init__(self, providers: List[EmbeddingProvider]):
        self.providers = {p.name: p for p in providers}
        
    def get_provider(self, name: str) -> Optional[EmbeddingProvider]:
        return self.providers.get(name)
        
    def get_primary_provider(self) -> EmbeddingProvider:
        provider = self.get_provider(settings.EMBEDDING_PROVIDER_PRIMARY)
        if not provider or not provider.is_available():
            fallback = self.get_provider(settings.EMBEDDING_PROVIDER_FALLBACK)
            if fallback and fallback.is_available():
                return fallback
            raise RuntimeError("No configured embedding providers are available.")
        return provider

    def embed_for_space(self, texts: List[str], space_id: str) -> EmbeddingResponse:
        """
        Retrieval method: Embeds a query for a specific vector space.
        Fails if the requested space's provider is unavailable.
        """
        # Find provider matching the space
        target_provider = None
        for p in self.providers.values():
            if p.space_id == space_id:
                target_provider = p
                break
                
        if not target_provider:
            raise ValueError(f"No provider configured for embedding space '{space_id}'")
            
        if not target_provider.is_available():
            raise RuntimeError(f"Provider for space '{space_id}' is currently unavailable.")
            
        return target_provider.embed(EmbeddingRequest(texts=texts))

    def get_health(self) -> Dict[str, Any]:
        health = {}
        for name, provider in self.providers.items():
            health[name] = {
                "available": provider.is_available(),
                "space_id": provider.space_id,
                "dimension": provider.dimension
            }
        return health
