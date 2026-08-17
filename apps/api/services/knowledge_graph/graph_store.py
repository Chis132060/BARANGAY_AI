import logging
from typing import List, Optional, Dict, Any
from services.supabase_service import get_supabase_client
from .entities import Entity
from .relationships import Relationship

logger = logging.getLogger(__name__)

class GraphStore:
    def __init__(self):
        self.supabase = get_supabase_client()

    def upsert_entity(self, entity: Entity) -> Optional[str]:
        """
        Upsert an entity. Returns the UUID.
        Matches on name + type to avoid duplicates.
        """
        try:
            # Check if exists first
            res = self.supabase.table("knowledge_entities") \
                .select("id") \
                .eq("name", entity.name) \
                .eq("entity_type", entity.entity_type) \
                .execute()
                
            if res.data:
                return res.data[0]["id"]
                
            # Insert new
            data = {
                "name": entity.name,
                "entity_type": entity.entity_type,
                "description": entity.description
            }
            if entity.id:
                data["id"] = entity.id
                
            insert_res = self.supabase.table("knowledge_entities").insert(data).execute()
            if insert_res.data:
                return insert_res.data[0]["id"]
        except Exception as e:
            logger.error(f"Failed to upsert entity {entity.name}: {e}")
        return None

    def insert_relationship(self, relationship: Relationship) -> Optional[str]:
        """
        Insert a relationship.
        STRICT PROVENANCE: Requires source_document_id and source_chunk_id.
        """
        if not relationship.source_document_id or not relationship.source_chunk_id:
            logger.error("Provenance Violation: Cannot create relationship without source document and chunk IDs.")
            return None
            
        try:
            data = {
                "source_entity_id": relationship.source_entity_id,
                "target_entity_id": relationship.target_entity_id,
                "relationship_type": relationship.relationship_type,
                "source_document_id": relationship.source_document_id,
                "source_chunk_id": relationship.source_chunk_id,
                "confidence": relationship.confidence
            }
            if relationship.id:
                data["id"] = relationship.id
                
            # Upsert on conflict (source_entity_id, target_entity_id, relationship_type, source_chunk_id)
            # The Supabase python client doesn't natively expose the ON CONFLICT clause easily via the ORM,
            # so we try to insert and catch the uniqueness constraint error, or just insert if we know it's new.
            # In a real environment, we'd use an RPC or raw SQL for UPSERT. For now, we do standard insert.
            insert_res = self.supabase.table("knowledge_relationships").upsert(
                data, 
                on_conflict="source_entity_id, target_entity_id, relationship_type, source_chunk_id"
            ).execute()
            
            if insert_res.data:
                return insert_res.data[0]["id"]
        except Exception as e:
            logger.error(f"Failed to insert relationship: {e}")
        return None

    def query_relationships(self, entity_name: str, depth: int = 1) -> List[Dict[str, Any]]:
        """
        Retrieve a local subgraph centered around `entity_name`.
        In PostgreSQL, a recursive CTE is usually best. For simple 1-depth, we just query direct edges.
        """
        try:
            # 1. Find entity ID
            res = self.supabase.table("knowledge_entities").select("id").eq("name", entity_name).execute()
            if not res.data:
                return []
            entity_id = res.data[0]["id"]
            
            # 2. Fetch edges where entity is source OR target
            # Currently Supabase ORM requires `or_` filters
            edges_res = self.supabase.table("knowledge_relationships") \
                .select("*, source:knowledge_entities!source_entity_id(*), target:knowledge_entities!target_entity_id(*)") \
                .or_(f"source_entity_id.eq.{entity_id},target_entity_id.eq.{entity_id}") \
                .execute()
                
            return edges_res.data or []
        except Exception as e:
            logger.error(f"Graph query failed for {entity_name}: {e}")
            return []

graph_store = GraphStore()
