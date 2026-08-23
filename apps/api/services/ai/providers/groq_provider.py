from langchain_groq import ChatGroq
from core.config import settings
from services.ai.interfaces import AIRequest
from services.ai.providers.base_provider import BaseLangchainProvider

class GroqProvider(BaseLangchainProvider):
    @property
    def name(self) -> str:
        return "groq"

    def is_available(self) -> bool:
        return bool(settings.GROQ_API_KEY)

    def _get_model(self, request: AIRequest) -> ChatGroq:
        return ChatGroq(
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            timeout=settings.AI_PROVIDER_TIMEOUT_MS / 1000.0,
        )
