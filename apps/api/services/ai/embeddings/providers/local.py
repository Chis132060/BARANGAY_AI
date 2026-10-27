import time
import logging
from typing import List
from ..interfaces import EmbeddingProvider, EmbeddingRequest, EmbeddingResponse

logger = logging.getLogger(__name__)

class LocalEmbeddingProvider(EmbeddingProvider):
    def __init__(self):
        self._name = "local"
        self._model = "all-MiniLM-L6-v2"
        self._dimension = 384
        self._space_id = "all-minilm-l6-v2-v1"
        self._client = None
        self._load_attempted = False

    def ensure_loaded(self) -> bool:
        """Load the optional model only when embedding work actually needs it."""
        if self._client is not None:
            return True
        if self._load_attempted:
            return False
        self._load_attempted = True
        try:
            from sentence_transformers import SentenceTransformer
            self._client = SentenceTransformer(self._model)
        except ImportError:
            logger.warning("sentence-transformers not installed. Local embeddings disabled.")
        except Exception as e:
            logger.error("Failed to load local embedding model %s: %s", self._model, e)
        return self._client is not None

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
        if not self.ensure_loaded():
            raise RuntimeError("Local Embedding Provider not configured or failed to load.")
            
        start = time.time()
        # SentenceTransformers returns a numpy array, convert to list of lists of floats
        embeddings_np = self._client.encode(request.texts, show_progress_bar=False)
        embeddings = embeddings_np.tolist()
        latency = int((time.time() - start) * 1000)
        
        return EmbeddingResponse(
            embeddings=embeddings,
            provider=self.name,
            model=self._model,
            dimension=self.dimension,
            latency_ms=latency
        )
