import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OLLAMA_API_KEY: str = os.getenv("OLLAMA_API_KEY", "")

    # AI Failover Config
    AI_PROVIDER_PRIMARY: str = os.getenv("AI_PROVIDER_PRIMARY", "gemini")
    AI_PROVIDER_FALLBACK_1: str = os.getenv("AI_PROVIDER_FALLBACK_1", "groq")
    AI_PROVIDER_FALLBACK_2: str = os.getenv("AI_PROVIDER_FALLBACK_2", "openrouter")
    AI_PROVIDER_FALLBACK_3: str = os.getenv("AI_PROVIDER_FALLBACK_3", "ollama")
    
    # Embedding Config
    EMBEDDING_PROVIDER_PRIMARY: str = os.getenv("EMBEDDING_PROVIDER_PRIMARY", "gemini")
    EMBEDDING_PROVIDER_FALLBACK: str = os.getenv("EMBEDDING_PROVIDER_FALLBACK", "local")
    
    AI_PROVIDER_TIMEOUT_MS: int = int(os.getenv("AI_PROVIDER_TIMEOUT_MS", "15000"))
    AI_CIRCUIT_FAILURE_THRESHOLD: int = int(os.getenv("AI_CIRCUIT_FAILURE_THRESHOLD", "3"))
    AI_CIRCUIT_COOLDOWN_SECONDS: int = int(os.getenv("AI_CIRCUIT_COOLDOWN_SECONDS", "30"))

settings = Settings()
