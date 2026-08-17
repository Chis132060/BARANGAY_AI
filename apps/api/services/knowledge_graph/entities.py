from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Entity(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., description="The canonical name of the entity")
    entity_type: str = Field(..., description="The type of entity (e.g., DOCUMENT, OFFICE, OFFICIAL, SERVICE)")
    description: Optional[str] = Field(None, description="Brief description of the entity")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
