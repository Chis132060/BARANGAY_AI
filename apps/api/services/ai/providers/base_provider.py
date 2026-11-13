import time
from abc import abstractmethod
from typing import Optional
from langchain_core.language_models.chat_models import BaseChatModel
from services.ai.interfaces import AIProvider, AIRequest, AIResponse

class BaseLangchainProvider(AIProvider):
    """
    Base class that bridges our AIProvider interface with Langchain's BaseChatModel.
    """
    
    @abstractmethod
    def _get_model(self, request: AIRequest) -> BaseChatModel:
        """Instantiate and return the configured Langchain chat model."""
        pass
        
    def generate(self, request: AIRequest, request_id: str) -> AIResponse:
        """
        Synchronous wrapper around invoke.
        In a production async environment, this could use ainvoke.
        """
        model = self._get_model(request)
        
        start_time = time.time()
        ai_msg = model.invoke(request.messages)
        latency_ms = int((time.time() - start_time) * 1000)
        
        # LangChain/Gemini commonly report usage_metadata, while other
        # integrations return response_metadata.token_usage. Never substitute
        # zero for absent token accounting: unknown usage must stay unknown.
        usage = None
        metadata_usage = getattr(ai_msg, "usage_metadata", None)
        if isinstance(metadata_usage, dict):
            prompt_tokens = metadata_usage.get("input_tokens")
            completion_tokens = metadata_usage.get("output_tokens")
        else:
            response_meta = getattr(ai_msg, "response_metadata", None)
            vendor_usage = response_meta.get("token_usage", {}) if isinstance(response_meta, dict) else {}
            prompt_tokens = vendor_usage.get("prompt_tokens") if isinstance(vendor_usage, dict) else None
            completion_tokens = vendor_usage.get("completion_tokens") if isinstance(vendor_usage, dict) else None
        if (isinstance(prompt_tokens, int) and not isinstance(prompt_tokens, bool) and prompt_tokens >= 0
                and isinstance(completion_tokens, int) and not isinstance(completion_tokens, bool) and completion_tokens >= 0):
            usage = {
                "inputTokens": prompt_tokens,
                "outputTokens": completion_tokens,
                "totalTokens": prompt_tokens + completion_tokens,
            }

        return AIResponse(
            content=str(ai_msg.content),
            provider=self.name,
            model=getattr(model, "model_name", getattr(model, "model", "unknown")),
            latency_ms=latency_ms,
            request_id=request_id,
            usage=usage
        )
