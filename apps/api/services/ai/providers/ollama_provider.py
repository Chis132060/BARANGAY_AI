try:
    from langchain_ollama import ChatOllama
except ImportError:
    try:
        from langchain_community.chat_models.ollama import ChatOllama
    except ImportError:
        from langchain_community.chat_models import ChatOllama
from services.ai.interfaces import AIRequest
from services.ai.providers.base_provider import BaseLangchainProvider

class OllamaProvider(BaseLangchainProvider):
    @property
    def name(self) -> str:
        return "ollama"

    def is_available(self) -> bool:
        # We assume local Ollama is available if configured as a fallback.
        # In a real setup, we might ping http://localhost:11434 first.
        return True

    def _get_model(self, request: AIRequest) -> ChatOllama:
        return ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=request.temperature,
            # Note: ChatOllama handles timeouts slightly differently, 
            # but we can rely on requests timeout or httpx inside.
        )
