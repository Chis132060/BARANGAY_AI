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
        
        # Extract usage if available
        usage = None
        if hasattr(ai_msg, "response_metadata") and ai_msg.response_metadata:
            token_usage = ai_msg.response_metadata.get("token_usage", {})
            if token_usage:
                usage = {
                    "inputTokens": token_usage.get("prompt_tokens", 0),
                    "outputTokens": token_usage.get("completion_tokens", 0),
                    "totalTokens": token_usage.get("total_tokens", 0),
                }

        return AIResponse(
            content=str(ai_msg.content),
            provider=self.name,
            model=getattr(model, "model_name", getattr(model, "model", "unknown")),
            latency_ms=latency_ms,
            request_id=request_id,
            usage=usage
        )
