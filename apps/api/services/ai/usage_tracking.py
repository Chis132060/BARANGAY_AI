"""Per-request LLM usage accounting without logging resident query contents.

ContextVar isolates concurrent requests. Unknown provider usage remains NULL in
persistent audits rather than being incorrectly reported as zero tokens.
"""
from contextvars import ContextVar, Token
from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class RequestAIUsage:
    attempted_calls: int = 0
    completed_calls: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    has_unknown_usage: bool = False
    models: List[str] = field(default_factory=list)

    @property
    def tokens_known(self) -> bool:
        return not self.has_unknown_usage and self.attempted_calls == self.completed_calls


_active_usage: ContextVar[Optional[RequestAIUsage]] = ContextVar("sora_ai_usage", default=None)


def begin_usage_tracking() -> Token:
    return _active_usage.set(RequestAIUsage())


def mark_provider_attempt() -> None:
    usage = _active_usage.get()
    if usage is not None:
        usage.attempted_calls += 1


def record_provider_success(provider: str, model: str, token_usage: Optional[dict]) -> None:
    usage = _active_usage.get()
    if usage is None:
        return
    usage.completed_calls += 1
    name = (provider + "/" + model)[:120]
    if name not in usage.models:
        usage.models.append(name)
    input_tokens = token_usage.get("inputTokens") if isinstance(token_usage, dict) else None
    output_tokens = token_usage.get("outputTokens") if isinstance(token_usage, dict) else None
    if (isinstance(input_tokens, int) and not isinstance(input_tokens, bool) and input_tokens >= 0
            and isinstance(output_tokens, int) and not isinstance(output_tokens, bool) and output_tokens >= 0):
        usage.prompt_tokens += input_tokens
        usage.completion_tokens += output_tokens
    else:
        usage.has_unknown_usage = True


def finish_usage_tracking(token: Token) -> RequestAIUsage:
    usage = _active_usage.get()
    _active_usage.reset(token)
    return usage if usage is not None else RequestAIUsage()
