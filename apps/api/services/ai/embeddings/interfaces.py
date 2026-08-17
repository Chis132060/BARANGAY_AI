from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Any

@dataclass
class EmbeddingRequest:
    texts: List[str]

@dataclass
class EmbeddingResponse:
    embeddings: List[List[float]]
    provider: str
    model: str
    dimension: int
    latency_ms: int

class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g. gemini, local)"""
        pass
        
    @property
    @abstractmethod
    def space_id(self) -> str:
        """Unique ID for the vector space (e.g. gemini-embedding-2-v1)"""
        pass
        
    @property
    @abstractmethod
    def dimension(self) -> int:
        """The dimensionality of vectors produced by this provider."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and conceptually available."""
        pass

    @abstractmethod
    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings or raise exceptions to be handled by the queue."""
        pass
