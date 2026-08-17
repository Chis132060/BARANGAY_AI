from typing import Dict, Any, Callable
from pydantic import BaseModel, Field

class ToolSchema(BaseModel):
    name: str
    description: str
    domain: str = "PUBLIC_KNOWLEDGE"
    parameters_schema: Dict[str, Any]

class ToolRegistry:
    """
    Central registry of all permissible backend tools.
    The AI does not execute code; it requests a tool by name, and the backend routes
    it to the mapped Python function here if the PolicyEngine approves.
    """
    def __init__(self):
        self._tools: Dict[str, ToolSchema] = {}
        self._handlers: Dict[str, Callable] = {}

    def register(self, schema: ToolSchema, handler: Callable):
        self._tools[schema.name] = schema
        self._handlers[schema.name] = handler

    def get_tool(self, name: str) -> ToolSchema:
        return self._tools.get(name)
        
    def execute(self, name: str, kwargs: dict) -> Any:
        if name not in self._handlers:
            raise ValueError(f"Tool {name} is not registered.")
        return self._handlers[name](**kwargs)

    def get_all_schemas_for_llm(self) -> str:
        """Returns a string description of tools for the LLM Tool Planner prompt."""
        descriptions = []
        for name, schema in self._tools.items():
            descriptions.append(f"Tool: {name}\nDescription: {schema.description}\nDomain: {schema.domain}\nParameters: {schema.parameters_schema}")
        return "\n\n".join(descriptions)

tool_registry = ToolRegistry()

# -------------------------------------------------------------------------
# Register Default Tools (Hardcoded parameter validation happens in handlers)
# -------------------------------------------------------------------------

def fetch_active_buses(barangay_id: str = "DEFAULT") -> dict:
    """
    Connects to the PostgreSQL database to fetch real-time active buses.
    """
    from services.supabase_service import get_supabase_client
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        supabase = get_supabase_client()
        # Fetch buses where status is ACTIVE
        res = supabase.table("buses").select("bus_id, current_location, status").eq("status", "ACTIVE").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Failed to fetch active buses from DB: {e}")
        return {"status": "error", "message": "Could not retrieve live bus data at this time."}

tool_registry.register(
    ToolSchema(
        name="get_active_buses",
        description="Returns live data from the database on active buses currently operating.",
        domain="SERVICES",
        parameters_schema={"barangay_id": "string (optional)"}
    ),
    fetch_active_buses
)
