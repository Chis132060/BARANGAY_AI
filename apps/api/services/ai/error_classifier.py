import httpx
from pydantic import ValidationError
from services.ai.interfaces import AIErrorType

def classify_error(error: Exception) -> AIErrorType:
    """
    Classify an exception into a standard AIErrorType.
    This helps the manager decide whether to failover or abort.
    """
    error_str = str(error).lower()
    
    # 1. Network / HTTP / Timeout errors (usually from httpx or requests)
    if isinstance(error, httpx.TimeoutException) or "timeout" in error_str:
        return AIErrorType.TIMEOUT
        
    if isinstance(error, httpx.NetworkError) or "connection" in error_str:
        return AIErrorType.NETWORK_ERROR
        
    # 2. HTTP Status Codes (often embedded in the error string by Langchain)
    if "429" in error_str or "rate limit" in error_str or "too many requests" in error_str:
        return AIErrorType.RATE_LIMITED
        
    if "401" in error_str or "403" in error_str or "unauthorized" in error_str or "invalid api key" in error_str or "api key not valid" in error_str:
        return AIErrorType.AUTH_ERROR
        
    if "quota" in error_str or "insufficient_quota" in error_str or "billing" in error_str:
        return AIErrorType.QUOTA_EXCEEDED
        
    if "404" in error_str or "model_not_found" in error_str or "decommissioned" in error_str:
        return AIErrorType.MODEL_UNAVAILABLE
        
    if "400" in error_str or isinstance(error, ValidationError):
        return AIErrorType.INVALID_REQUEST
        
    if "policy" in error_str or "safety" in error_str or "content" in error_str:
        return AIErrorType.CONTENT_POLICY
        
    if "500" in error_str or "502" in error_str or "503" in error_str or "504" in error_str:
        return AIErrorType.SERVER_ERROR
        
    # Default to unknown
    return AIErrorType.UNKNOWN

def should_failover(error_type: AIErrorType) -> bool:
    """
    Determine if the error type warrants failing over to the next provider.
    """
    recoverable_errors = {
        AIErrorType.RATE_LIMITED,
        AIErrorType.QUOTA_EXCEEDED,
        AIErrorType.TIMEOUT,
        AIErrorType.NETWORK_ERROR,
        AIErrorType.SERVER_ERROR,
        AIErrorType.MODEL_UNAVAILABLE,
        AIErrorType.AUTH_ERROR, # Auth error on one provider means we should try the next
        AIErrorType.UNKNOWN
    }
    
    # Do NOT failover for user-induced errors
    # (e.g. they asked something that triggered content policy)
    unrecoverable_errors = {
        AIErrorType.INVALID_REQUEST,
        AIErrorType.CONTENT_POLICY
    }
    
    return error_type in recoverable_errors
