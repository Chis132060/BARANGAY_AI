from typing import List, Dict, Any
from .memory_service import memory_service
from .summarizer import summarizer
from .memory_policy import MemoryPolicy

class MemoryRetriever:
    """
    Retrieves and structures conversation history.
    Enforces the hierarchy: Memory is lower trust than authoritative data.
    """
    def get_intelligent_context(self, session_id: str, limit: int = 10) -> str:
        """
        Returns a formatted string containing recent messages and a summary of older ones.
        """
        raw_msgs = memory_service.get_history(session_id, limit=limit)
        if not raw_msgs:
            return "No previous conversation memory."
            
        # Optional: We could summarize the older half of raw_msgs
        # For this phase, we return the raw history bounded by limit, tagged with the Trust Level.
        
        trust_level = MemoryPolicy.get_trust_level()
        formatted = f"--- TRUST LEVEL: {trust_level} ---\n"
        
        for msg in reversed(raw_msgs):  # Oldest to newest in the limited set
            if not MemoryPolicy.is_sensitive(msg["content"]):
                formatted += f"{msg['role'].upper()}: {msg['content']}\n"
            else:
                formatted += f"{msg['role'].upper()}: [SENSITIVE CONTENT REDACTED]\n"
                
        return formatted

memory_retriever = MemoryRetriever()
