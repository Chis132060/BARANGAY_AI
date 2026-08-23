try:
    from langchain_ollama import ChatOllama
except ImportError:
    try:
        from langchain_community.chat_models.ollama import ChatOllama
    except ImportError:
        from langchain_community.chat_models import ChatOllama
from services.ai.interfaces import AIRequest
from core.config import settings
from services.ai.providers.base_provider import BaseLangchainProvider

class OllamaProvider(BaseLangchainProvider):
    @property
    def name(self) -> str:
        return "ollama"

    def is_available(self) -> bool:
        # Ollama is opt-in. If it is not explicitly enabled, Gemini remains
        # the reliable cloud fallback for local development.
        return settings.OLLAMA_ENABLED

    def _get_model(self, request: AIRequest) -> ChatOllama:
        return ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=request.temperature,
            # Note: ChatOllama handles timeouts slightly differently, 
            # but we can rely on requests timeout or httpx inside.
        )
