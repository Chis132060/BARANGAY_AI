from supabase import create_client, Client
from core.config import settings

def get_supabase_client() -> Client:
    """
    Initializes and returns the Supabase client using the service role key.
    This allows the backend to bypass RLS for administrative actions (like inserting into knowledge_chunks).
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase credentials are not fully configured in the environment.")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
