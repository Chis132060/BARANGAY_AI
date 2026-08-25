from langchain_openai import ChatOpenAI
from core.config import settings
from services.ai.interfaces import AIRequest
from services.ai.providers.base_provider import BaseLangchainProvider

class OpenRouterProvider(BaseLangchainProvider):
    @property
    def name(self) -> str:
        return "openrouter"

    def is_available(self) -> bool:
        return bool(settings.OPENROUTER_API_KEY)

    def _get_model(self, request: AIRequest) -> ChatOpenAI:
        return ChatOpenAI(
            model=settings.OPENROUTER_MODEL,
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            timeout=settings.AI_PROVIDER_TIMEOUT_MS / 1000.0,
        )
