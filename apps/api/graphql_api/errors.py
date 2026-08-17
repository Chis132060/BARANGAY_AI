import strawberry

@strawberry.type
class AIError:
    code: str
    message: str

# Pre-defined Error Codes
ERROR_CODES = {
    "AI_UNAVAILABLE": "The AI service is temporarily unavailable.",
    "AI_TIMEOUT": "The AI service timed out while processing your request.",
    "AI_RATE_LIMITED": "You have exceeded your rate limit.",
    "SESSION_NOT_FOUND": "The specified session was not found.",
    "SESSION_ACCESS_DENIED": "You do not have permission to access this session.",
    "INVALID_REQUEST": "The request payload is invalid.",
    "GROUNDING_FAILED": "The AI could not confidently ground its answer.",
    "TOOL_FAILED": "A required backend tool failed to execute.",
    "KNOWLEDGE_UNAVAILABLE": "Knowledge retrieval is currently unavailable.",
    "INTERNAL_ERROR": "An internal system error occurred."
}

def create_error(code: str, custom_message: str = None) -> AIError:
    return AIError(
        code=code,
        message=custom_message or ERROR_CODES.get(code, "An unknown error occurred.")
    )
