"""Normalize retrieval rows from provider-specific Supabase RPC contracts."""
from typing import Any, Dict, Optional


def normalize_retrieval_result(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return a retrieval row with a canonical string id or None.

    Current pgvector RPCs expose the identifier as chunk_id while legacy keyword
    search implementations may expose id. Downstream RAG stages consume id.
    """
    if not isinstance(row, dict):
        return None
    chunk_id = row.get("id") or row.get("chunk_id")
    if chunk_id is None or not str(chunk_id).strip():
        return None
    normalized = dict(row)
    normalized["id"] = str(chunk_id)
    return normalized
