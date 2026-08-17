class MemoryPolicy:
    """
    Defines strict retention rules for conversation memory.
    """
    @staticmethod
    def is_sensitive(content: str) -> bool:
        # A real implementation would use NLP to detect PII. 
        # For now, flag obvious patterns.
        sensitive_keywords = ["password", "ssn", "credit card", "secret"]
        return any(keyword in content.lower() for keyword in sensitive_keywords)
        
    @staticmethod
    def get_trust_level() -> str:
        # Conversation memory is fundamentally lower-trust than official docs.
        return "CONVERSATION_MEMORY"
