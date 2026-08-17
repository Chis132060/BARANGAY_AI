import time
from abc import ABC, abstractmethod
from typing import Dict, Any
from services.ai.interfaces import CircuitState

class CircuitStateStore(ABC):
    """Interface for storing circuit breaker state. Allows swapping InMemory for Redis later."""
    
    @abstractmethod
    def get_state(self, provider: str) -> CircuitState:
        pass
        
    @abstractmethod
    def set_state(self, provider: str, state: CircuitState) -> None:
        pass
        
    @abstractmethod
    def get_failures(self, provider: str) -> int:
        pass
        
    @abstractmethod
    def set_failures(self, provider: str, count: int) -> None:
        pass
        
    @abstractmethod
    def get_last_failure_time(self, provider: str) -> float:
        pass
        
    @abstractmethod
    def set_last_failure_time(self, provider: str, timestamp: float) -> None:
        pass

class InMemoryCircuitStateStore(CircuitStateStore):
    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}
        
    def _init_provider(self, provider: str):
        if provider not in self._data:
            self._data[provider] = {
                "state": CircuitState.CLOSED,
                "failures": 0,
                "last_failure_time": 0.0
            }

    def get_state(self, provider: str) -> CircuitState:
        self._init_provider(provider)
        return self._data[provider]["state"]

    def set_state(self, provider: str, state: CircuitState) -> None:
        self._init_provider(provider)
        self._data[provider]["state"] = state

    def get_failures(self, provider: str) -> int:
        self._init_provider(provider)
        return self._data[provider]["failures"]

    def set_failures(self, provider: str, count: int) -> None:
        self._init_provider(provider)
        self._data[provider]["failures"] = count

    def get_last_failure_time(self, provider: str) -> float:
        self._init_provider(provider)
        return self._data[provider]["last_failure_time"]

    def set_last_failure_time(self, provider: str, timestamp: float) -> None:
        self._init_provider(provider)
        self._data[provider]["last_failure_time"] = timestamp


class CircuitBreaker:
    def __init__(self, provider_name: str, store: CircuitStateStore, failure_threshold: int, cooldown_seconds: int):
        self.provider_name = provider_name
        self.store = store
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds

    @property
    def state(self) -> CircuitState:
        return self.store.get_state(self.provider_name)

    def can_execute(self) -> bool:
        current_state = self.store.get_state(self.provider_name)
        
        if current_state == CircuitState.CLOSED:
            return True
            
        if current_state == CircuitState.OPEN:
            last_failure = self.store.get_last_failure_time(self.provider_name)
            if time.time() - last_failure >= self.cooldown_seconds:
                self.store.set_state(self.provider_name, CircuitState.HALF_OPEN)
                return True
            return False
            
        # HALF_OPEN allows one test request (caller handles concurrency limits if needed)
        return True

    def record_success(self):
        self.store.set_state(self.provider_name, CircuitState.CLOSED)
        self.store.set_failures(self.provider_name, 0)

    def record_failure(self):
        failures = self.store.get_failures(self.provider_name) + 1
        self.store.set_failures(self.provider_name, failures)
        self.store.set_last_failure_time(self.provider_name, time.time())
        
        current_state = self.store.get_state(self.provider_name)
        
        if failures >= self.failure_threshold:
            self.store.set_state(self.provider_name, CircuitState.OPEN)
        elif current_state == CircuitState.HALF_OPEN:
            # Failed while testing recovery
            self.store.set_state(self.provider_name, CircuitState.OPEN)
