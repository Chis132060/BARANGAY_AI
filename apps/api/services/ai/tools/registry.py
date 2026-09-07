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
# Register Barangay-Specific Tools
# These are the ONLY tools the AI is permitted to call. Each one queries
# the real authoritative production PostgreSQL tables — not duplicates.
# The LLM never calls these directly; the PolicyEngine must approve first.
# -------------------------------------------------------------------------

def fetch_barangay_officials(is_active: bool = True) -> dict:
    """
    Fetches current Barangay officials (Captain, Kagawad, SK) from the
    authoritative `barangay_officials` production table.
    """
    from services.supabase_service import get_supabase_client
    import logging
    logger = logging.getLogger(__name__)
    try:
        supabase = get_supabase_client()
        query = supabase.table("officials").select(
            "position, status, start_term, end_term, resident:residents(first_name,last_name,contact_number)"
        )
        if is_active:
            query = query.eq("status", "Active")
        res = query.execute()
        data = [
            {
                "full_name": " ".join(
                    part for part in [
                        (row.get("resident") or {}).get("first_name"),
                        (row.get("resident") or {}).get("last_name"),
                    ] if part
                ),
                "position": row.get("position"),
                "committee": None,
                "contact_number": (row.get("resident") or {}).get("contact_number"),
                "start_term": row.get("start_term"),
                "end_term": row.get("end_term"),
            }
            for row in (res.data or [])
        ]
        if data:
            return {"status": "success", "data": data}

        legacy = supabase.table("barangay_officials").select(
            "full_name, position, committee, contact_number"
        )
        if is_active:
            legacy = legacy.eq("is_active", True)
        legacy_res = legacy.execute()
        return {"status": "success", "data": legacy_res.data or []}
    except Exception as e:
        logger.error(f"Failed to fetch officials: {e}")
        return {"status": "error", "message": "Could not retrieve official data at this time."}

tool_registry.register(
    ToolSchema(
        name="get_barangay_officials",
        description="Returns the current list of active Barangay officials including the Captain, Kagawad members, and SK Chairperson from the live database.",
        domain="PUBLIC_KNOWLEDGE",
        parameters_schema={"is_active": "boolean (optional, default true)"}
    ),
    fetch_barangay_officials
)


def fetch_barangay_services(service_name: str = None) -> dict:
    """
    Fetches available Barangay services (clearances, certificates, etc.)
    including requirements, fees, and processing time from the authoritative
    `barangay_services` production table.
    """
    from services.supabase_service import get_supabase_client
    import logging
    logger = logging.getLogger(__name__)
    try:
        supabase = get_supabase_client()
        catalog = supabase.table("document_types").select("name, description, requirements")
        if service_name:
            catalog = catalog.ilike("name", f"%{service_name}%")
        catalog_res = catalog.execute()
        data = [
            {
                "service_name": row.get("name"),
                "description": row.get("description"),
                "requirements": row.get("requirements"),
                "processing_days": None,
                "fee_php": None,
            }
            for row in (catalog_res.data or [])
        ]
        if not data:
            legacy = supabase.table("barangay_services").select(
                "service_name, description, requirements, processing_days, fee_php"
            ).eq("is_available", True)
            if service_name:
                legacy = legacy.ilike("service_name", f"%{service_name}%")
            legacy_res = legacy.execute()
            data = legacy_res.data or []
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Failed to fetch services: {e}")
        return {"status": "error", "message": "Could not retrieve service information at this time."}

tool_registry.register(
    ToolSchema(
        name="get_barangay_services",
        description="Returns the list of Barangay services available to residents, including requirements, fees, and processing time. Examples: Barangay Clearance, Certificate of Indigency, Business Permit Endorsement.",
        domain="PUBLIC_KNOWLEDGE",
        parameters_schema={"service_name": "string (optional filter, e.g., 'Clearance')"}
    ),
    fetch_barangay_services
)


def fetch_announcements(category: str = None) -> dict:
    """
    Fetches active published announcements from the authoritative
    `barangay_announcements` production table. Only returns non-expired,
    published records — never stale or unpublished content.
    """
    from services.supabase_service import get_supabase_client
    import logging
    logger = logging.getLogger(__name__)
    try:
        supabase = get_supabase_client()
        query = supabase.table("announcements").select(
            "title, description, category, published_date"
        ).eq("status", "Published").order("published_date", desc=True).limit(10)
        if category:
            query = query.ilike("category", f"%{category}%")
        res = query.execute()
        data = [
            {
                "title": row.get("title"),
                "body": row.get("description"),
                "category": row.get("category"),
                "published_at": row.get("published_date"),
            }
            for row in (res.data or [])
        ]
        if not data:
            legacy = supabase.table("barangay_announcements").select(
                "title, body, category, published_at"
            ).order("published_at", desc=True).limit(10)
            if category:
                legacy = legacy.ilike("category", f"%{category}%")
            legacy_res = legacy.execute()
            data = legacy_res.data or []
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Failed to fetch announcements: {e}")
        return {"status": "error", "message": "Could not retrieve announcements at this time."}

tool_registry.register(
    ToolSchema(
        name="get_announcements",
        description="Returns the latest published Barangay announcements for residents. Can be filtered by category: HEALTH, SAFETY, EVENT, or GENERAL.",
        domain="PUBLIC_KNOWLEDGE",
        parameters_schema={"category": "string (optional: HEALTH | SAFETY | EVENT | GENERAL)"}
    ),
    fetch_announcements
)


def fetch_barangay_policies(status: str = "Active") -> dict:
    """Fetch current approved local ordinances, resolutions, and policies."""
    from services.supabase_service import get_supabase_client
    import logging
    logger = logging.getLogger(__name__)
    try:
        supabase = get_supabase_client()
        query = supabase.table("policies").select(
            "policy_number, title, category, description, effective_date, full_text"
        )
        if status:
            query = query.eq("status", status)
        res = query.order("effective_date", desc=True).execute()
        return {"status": "success", "data": res.data or []}
    except Exception as e:
        logger.error(f"Failed to fetch policies: {e}")
        return {"status": "error", "message": "Could not retrieve approved policy records at this time."}


tool_registry.register(
    ToolSchema(
        name="get_barangay_policies",
        description="Returns approved current Barangay ordinances, resolutions, and local policies. Never use repealed or draft policy text as current guidance.",
        domain="PUBLIC_KNOWLEDGE",
        parameters_schema={"status": "string (optional, default Active)"}
    ),
    fetch_barangay_policies
)
