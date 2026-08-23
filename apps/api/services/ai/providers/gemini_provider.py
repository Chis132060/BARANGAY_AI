from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import settings
from services.ai.interfaces import AIRequest
from services.ai.providers.base_provider import BaseLangchainProvider

class GeminiProvider(BaseLangchainProvider):
    @property
    def name(self) -> str:
        return "gemini"

    def is_available(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def _get_model(self, request: AIRequest) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=request.temperature,
            max_output_tokens=request.max_tokens,
            timeout=settings.AI_PROVIDER_TIMEOUT_MS / 1000.0,
        )
