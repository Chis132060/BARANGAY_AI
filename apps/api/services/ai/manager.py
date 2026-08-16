import uuid
import logging
from typing import List

from core.config import settings
from services.ai.interfaces import (
    AIRequest, AIResponse, AIServiceUnavailableError, ProviderHealth
)
from services.ai.circuit_breaker import CircuitBreaker, InMemoryCircuitStateStore
from services.ai.error_classifier import classify_error, should_failover

from services.ai.providers.gemini_provider import GeminiProvider
from services.ai.providers.groq_provider import GroqProvider
from services.ai.providers.openrouter_provider import OpenRouterProvider
from services.ai.providers.ollama_provider import OllamaProvider

logger = logging.getLogger(__name__)

class AIProviderManager:
    def __init__(self):
        # Register all available providers
        self._all_providers = {
            "gemini": GeminiProvider(),
            "groq": GroqProvider(),
            "openrouter": OpenRouterProvider(),
            "ollama": OllamaProvider(),
        }
        
        # Build priority queue based on config
        self.providers: List[str] = []
        for p in [
            settings.AI_PROVIDER_PRIMARY,
            settings.AI_PROVIDER_FALLBACK_1,
            settings.AI_PROVIDER_FALLBACK_2,
            settings.AI_PROVIDER_FALLBACK_3,
        ]:
            if p and p in self._all_providers and self._all_providers[p].is_available():
                if p not in self.providers:
                    self.providers.append(p)
                    
        # Initialize circuit state store and breakers per provider
        self.circuit_store = InMemoryCircuitStateStore()
        self.circuit_breakers = {
            p: CircuitBreaker(
                provider_name=p,
                store=self.circuit_store,
                failure_threshold=settings.AI_CIRCUIT_FAILURE_THRESHOLD,
                cooldown_seconds=settings.AI_CIRCUIT_COOLDOWN_SECONDS
            ) for p in self.providers
        }
        
        self.health_tracking = {
            p: {"status": "healthy", "last_error": None} for p in self.providers
        }

    def get_health(self) -> dict:
        """Returns diagnostic health information for all providers."""
        health_info = {}
        for p in self.providers:
            breaker = self.circuit_breakers[p]
            status = self.health_tracking[p]["status"]
            if breaker.state.name != "CLOSED":
                status = "degraded" if breaker.state.name == "HALF_OPEN" else "failing"
                
            health_info[p] = {
                "status": status,
                "circuit": breaker.state.name.lower(),
                "failures": self.circuit_store.get_failures(p),
            }
        return {"providers": health_info}

    def generate(self, request: AIRequest) -> AIResponse:
        request_id = str(uuid.uuid4())
        
        for attempt, provider_name in enumerate(self.providers, 1):
            breaker = self.circuit_breakers[provider_name]
            
            if not breaker.can_execute():
                logger.warning(
                    f"AI FAILOVER [{request_id}]: Skipping {provider_name} "
                    f"(Circuit is {breaker.state.value})"
                )
                continue
                
            provider = self._all_providers[provider_name]
            
            try:
                # Execute Request
                response = provider.generate(request, request_id)
                
                # Record Success
                breaker.record_success()
                self.health_tracking[provider_name]["status"] = "healthy"
                
                # Log success metrics
                logger.info(
                    f"AI SUCCESS [{request_id}]: {provider_name} "
                    f"latency={response.latency_ms}ms attempt={attempt}"
                )
                
                return response
                
            except Exception as e:
                # Record Failure
                breaker.record_failure()
                
                error_type = classify_error(e)
                self.health_tracking[provider_name]["status"] = "failing"
                self.health_tracking[provider_name]["last_error"] = str(e)
                
                logger.error(
                    f"AI FAILOVER [{request_id}]: {provider_name} failed "
                    f"errorType={error_type.name} attempt={attempt}"
                )
                
                if not should_failover(error_type):
                    # Unrecoverable error (like invalid user input), do not failover
                    logger.error(f"AI ABORT [{request_id}]: Unrecoverable error, stopping failover.")
                    raise e
                    
                continue
                
        # If we exit the loop, all providers failed or were open
        logger.error(f"AI CRITICAL [{request_id}]: All providers failed or unavailable.")
        raise AIServiceUnavailableError("AI service is temporarily unavailable. Please try again later.")
