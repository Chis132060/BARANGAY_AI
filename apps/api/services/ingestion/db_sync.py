import hashlib
import json
import logging
from typing import List, Dict, Any, Optional
from services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

class DBSyncService:
    """
    Abstractions for synchronizing structured data from Supabase into the AI Brain.
    Since we don't assume any specific tables (like announcements) exist yet,
    this provides a generic pipeline for when those tables are created.
    """
    
    def __init__(self):
        self.supabase = get_supabase_client()

    def hash_content(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def row_to_semantic_text(self, table_name: str, row: Dict[str, Any]) -> str:
        """
        Converts a structured JSON row into a natural language representation
        optimized for RAG retrieval.
        """
        lines = [f"Record from {table_name}:"]
        for key, value in row.items():
            if value is not None:
                # Format key for readability (e.g., 'created_at' -> 'Created At')
                readable_key = str(key).replace("_", " ").title()
                lines.append(f"{readable_key}: {value}")
        return "\n".join(lines)

    async def fetch_table_rows(self, table_name: str, last_updated_at: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetches rows from a given Supabase table. If last_updated_at is provided,
        it only fetches rows modified after that timestamp (incremental sync).
        """
        try:
            query = self.supabase.table(table_name).select("*")
            
            # Simple incremental sync logic if table supports 'updated_at'
            if last_updated_at:
                query = query.gte("updated_at", last_updated_at)
                
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to fetch rows from table {table_name}: {e}")
            raise
            
    async def process_row_for_ingestion(self, table_name: str, row: Dict[str, Any]) -> dict:
        """
        Takes a raw row and prepares it for the embedding pipeline,
        preserving both structured metadata and semantic text.
        """
        semantic_text = self.row_to_semantic_text(table_name, row)
        content_hash = self.hash_content(semantic_text)
        
        # Primary key assumption (typically 'id')
        row_id = str(row.get("id", "unknown_id"))
        
        return {
            "source_type": "DATABASE",
            "source_url": f"db://{table_name}/{row_id}",
            "source_domain": table_name,
            "trust_level": "AUTHORITATIVE",
            "title": f"{table_name} Record {row_id}",
            "text": semantic_text,
            "content_hash": content_hash,
            "metadata": {
                "structured_data": row
            }
        }
