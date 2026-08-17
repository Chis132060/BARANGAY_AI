from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Relationship(BaseModel):
    id: Optional[str] = None
    source_entity_id: str = Field(..., description="UUID of the source entity")
    target_entity_id: str = Field(..., description="UUID of the target entity")
    relationship_type: str = Field(..., description="The type of relationship (e.g., PROVIDED_BY, REQUIRES, DEFINED_BY)")
    
    # Strict Provenance
    source_document_id: str = Field(..., description="UUID of the original document that claims this relationship")
    source_chunk_id: Optional[str] = Field(None, description="UUID of the specific text chunk supporting this claim")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score from the extraction model")
    
    created_at: Optional[datetime] = None
