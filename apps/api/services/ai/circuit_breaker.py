import time
from services.ai.interfaces import CircuitState

class CircuitBreaker:
    def __init__(self, failure_threshold: int, cooldown_seconds: int):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        
        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.last_failure_time = 0.0

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
            
        if self.state == CircuitState.OPEN:
            # Check if cooldown has elapsed
            if time.time() - self.last_failure_time >= self.cooldown_seconds:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
            
        # HALF_OPEN allows exactly one test request through per cooldown cycle.
        # But in a simple implementation, if it's HALF_OPEN, we let the caller try.
        return True

    def record_success(self):
        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0

    def record_failure(self):
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        
        if self.consecutive_failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
        else:
            # If we were in HALF_OPEN and failed, we immediately go back to OPEN
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
