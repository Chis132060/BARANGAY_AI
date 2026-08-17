import time
from typing import List
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from ..interfaces import EmbeddingProvider, EmbeddingRequest, EmbeddingResponse
from core.config import settings

class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self):
        self._name = "gemini"
        self._model = "gemini-embedding-2"
        self._dimension = 3072
        self._space_id = "gemini-embedding-2-v1"
        self._client = None
        if settings.GEMINI_API_KEY:
            self._client = GoogleGenerativeAIEmbeddings(
                model=f"models/{self._model}",
                google_api_key=settings.GEMINI_API_KEY
            )

    @property
    def name(self) -> str:
        return self._name
        
    @property
    def space_id(self) -> str:
        return self._space_id
        
    @property
    def dimension(self) -> int:
        return self._dimension

    def is_available(self) -> bool:
        return self._client is not None

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        if not self._client:
            raise RuntimeError("Gemini Embedding Provider not configured.")
            
        start = time.time()
        # This will raise exceptions natively if 429 occurs, allowing the queue to catch it.
        embeddings = self._client.embed_documents(request.texts)
        latency = int((time.time() - start) * 1000)
        
        return EmbeddingResponse(
            embeddings=embeddings,
            provider=self.name,
            model=self._model,
            dimension=self.dimension,
            latency_ms=latency
        )
