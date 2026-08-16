from .interfaces import EmbeddingProvider, EmbeddingRequest, EmbeddingResponse
from .manager import EmbeddingProviderManager
from .providers.gemini import GeminiEmbeddingProvider
from .providers.local import LocalEmbeddingProvider

# Initialize the global EmbeddingProviderManager
embedding_manager = EmbeddingProviderManager(
    providers=[
        GeminiEmbeddingProvider(),
        LocalEmbeddingProvider()
    ]
)
