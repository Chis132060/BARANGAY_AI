import logging
from typing import List, Dict, Any
from services.ai.manager import AIProviderManager
from services.ai.interfaces import AIRequest
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

class Summarizer:
    def __init__(self):
        self.provider = AIProviderManager()
        
    def summarize_conversation(self, messages: List[Dict[str, str]]) -> str:
        """
        Condenses a long conversation history into a tight summary to save tokens.
        """
        if len(messages) < 5:
            return "" # Not long enough to warrant summarization
            
        history_text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        prompt = "Summarize the key facts, user intents, and context from this conversation. Be extremely concise."
        
        request = AIRequest(
            messages=[SystemMessage(content=prompt), HumanMessage(content=history_text)],
            temperature=0.0
        )
        try:
            res = self.provider.generate(request)
            return res.content.strip()
        except Exception as e:
            logger.error(f"Failed to summarize: {e}")
            return ""

summarizer = Summarizer()
