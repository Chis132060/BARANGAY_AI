import strawberry
from typing import List, Optional

@strawberry.type
class AISource:
    documentId: str
    chunkId: str
    title: Optional[str] = None
    url: Optional[str] = None
    sourceType: str
    trustLevel: str
    relevanceScore: Optional[float] = None

@strawberry.type
class AIToolUsage:
    toolName: str
    arguments: str
    result: Optional[str] = None

@strawberry.type
class AIResponse:
    requestId: str
    sessionId: str
    answer: str
    grounded: bool
    confidence: Optional[float] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    latencyMs: Optional[int] = None
    sources: List[AISource]
    toolsUsed: List[AIToolUsage]

@strawberry.type
class AIMessage:
    id: str
    role: str
    content: str
    createdAt: str

@strawberry.type
class AISession:
    id: str
    title: Optional[str] = None
    createdAt: str
    updatedAt: str
    messages: List[AIMessage]

@strawberry.type
class AISessionConnection:
    edges: List[AISession]
    pageInfo: "PageInfo"

@strawberry.type
class PageInfo:
    hasNextPage: bool
    endCursor: Optional[str] = None

@strawberry.type
class AIHealth:
    status: str
    primaryProvider: str
    activeProviders: int

import enum

# Streaming Enums and Types
@strawberry.enum
class AIStreamEventType(enum.Enum):
    STARTED = "STARTED"
    TOOL_STARTED = "TOOL_STARTED"
    TOOL_COMPLETED = "TOOL_COMPLETED"
    SOURCE = "SOURCE"
    TOKEN = "TOKEN"
    PROVIDER_FALLBACK = "PROVIDER_FALLBACK"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"

@strawberry.type
class AIStreamEvent:
    requestId: str
    type: AIStreamEventType
    content: Optional[str] = None
    provider: Optional[str] = None
    grounded: Optional[bool] = None
    source: Optional[AISource] = None
