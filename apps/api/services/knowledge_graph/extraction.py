import logging
import json
from typing import List, Dict, Any, Optional
from services.ai.manager import AIProviderManager
from services.ai.interfaces import AIRequest
from langchain_core.messages import SystemMessage, HumanMessage
from .entities import Entity
from .relationships import Relationship
from .graph_store import graph_store

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
You are a strict Data Extraction Engine.
Your task is to extract Entities and Relationships from the provided text chunk.

RULES:
1. DO NOT HALLUCINATE. Only extract facts explicitly stated in the text.
2. Entities must have a 'name' and 'entity_type'.
   Allowed entity_types: DOCUMENT, OFFICE, OFFICIAL, SERVICE, REQUIREMENT, LOCATION, EVENT, POLICY.
3. Relationships connect two entities: (source_entity_name, target_entity_name, relationship_type).
   Allowed relationship_types: PROVIDED_BY, REQUIRES, DEFINED_BY, LOCATED_AT, INVOLVES, WORKS_FOR.
4. Confidence must be between 0.0 and 1.0 based on how explicit the statement is.

Return a JSON object strictly matching this schema:
{
  "entities": [
    {"name": "Barangay Clearance", "entity_type": "DOCUMENT", "description": "A certificate of residency"}
  ],
  "relationships": [
    {"source": "Barangay Clearance", "target": "Barangay Office", "type": "PROVIDED_BY", "confidence": 0.95}
  ]
}
"""

class GraphExtractor:
    def __init__(self):
        self.provider_manager = AIProviderManager()

    def extract_from_chunk(self, document_id: str, chunk_id: str, text: str) -> None:
        """
        Extract entities and relationships from a text chunk and persist them to the Graph Store.
        Enforces strict provenance using the document_id and chunk_id.
        """
        try:
            messages = [
                SystemMessage(content=EXTRACTION_PROMPT),
                HumanMessage(content=f"Text Chunk:\n{text}")
            ]
            
            # Request JSON output
            request = AIRequest(messages=messages, temperature=0.0, response_format={"type": "json_object"})
            response = self.provider_manager.generate(request)
            
            content = response.content.strip()
            if content.startswith("```json"): content = content[7:-3]
            elif content.startswith("```"): content = content[3:-3]
                
            data = json.loads(content)
            
            # 1. Process and Insert Entities
            entity_map = {} # Maps entity name to UUID
            for e_data in data.get("entities", []):
                entity = Entity(
                    name=e_data["name"],
                    entity_type=e_data["entity_type"],
                    description=e_data.get("description")
                )
                e_uuid = graph_store.upsert_entity(entity)
                if e_uuid:
                    entity_map[entity.name] = e_uuid
                    
            # 2. Process and Insert Relationships (STRICT PROVENANCE)
            for r_data in data.get("relationships", []):
                source_name = r_data.get("source")
                target_name = r_data.get("target")
                rel_type = r_data.get("type")
                confidence = float(r_data.get("confidence", 0.5))
                
                source_id = entity_map.get(source_name)
                target_id = entity_map.get(target_name)
                
                if source_id and target_id:
                    relationship = Relationship(
                        source_entity_id=source_id,
                        target_entity_id=target_id,
                        relationship_type=rel_type,
                        source_document_id=document_id, # Provenance
                        source_chunk_id=chunk_id,       # Provenance
                        confidence=confidence
                    )
                    graph_store.insert_relationship(relationship)
                    
        except json.JSONDecodeError:
            logger.error("Failed to parse JSON from extraction LLM.")
        except Exception as e:
            logger.error(f"Extraction failed for chunk {chunk_id}: {e}")

graph_extractor = GraphExtractor()
