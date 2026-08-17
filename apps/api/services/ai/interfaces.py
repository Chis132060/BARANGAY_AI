from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum, auto
from typing import Optional, Dict, Any, List
from langchain_core.messages import BaseMessage

class AIErrorType(Enum):
    RATE_LIMITED = auto()
    QUOTA_EXCEEDED = auto()
    TIMEOUT = auto()
    NETWORK_ERROR = auto()
    SERVER_ERROR = auto()
    AUTH_ERROR = auto()
    MODEL_UNAVAILABLE = auto()
    INVALID_REQUEST = auto()
    CONTENT_POLICY = auto()
    UNKNOWN = auto()

class CircuitState(Enum):
    CLOSED = "closed"       # Healthy, requests pass
    OPEN = "open"           # Unhealthy, requests blocked
    HALF_OPEN = "half_open" # Testing recovery

@dataclass
class AIRequest:
    messages: List[BaseMessage]
    temperature: float = 0.1
    max_tokens: int = 1024
    response_format: Optional[Dict[str, Any]] = None

@dataclass
class AIResponse:
    content: str
    provider: str
    model: str
    latency_ms: int
    request_id: str
    usage: Optional[Dict[str, int]] = None

@dataclass
class ProviderHealth:
    name: str
    status: str
    circuit_state: str
    last_error: Optional[str] = None
    consecutive_failures: int = 0

class AIServiceUnavailableError(Exception):
    """Raised when all configured AI providers fail or are unavailable."""
    pass

class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and conceptually available."""
        pass

    @abstractmethod
    def generate(self, request: AIRequest, request_id: str) -> AIResponse:
        """Generate response or raise exceptions to be classified."""
        pass
