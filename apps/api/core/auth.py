"""Supabase token verification and API authorization helpers."""

from typing import Any, Optional

import httpx
from fastapi import HTTPException

from core.config import settings


async def verify_access_token(token: str) -> Optional[dict[str, Any]]:
    """Verify a bearer token with Supabase Auth and return its user record."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={"apikey": settings.SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            )
        if response.status_code != 200:
            return None
        user = response.json()
        return user if isinstance(user, dict) and user.get("id") else None
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Unable to verify authentication")


async def authenticated_user(authorization: Optional[str]) -> Optional[dict[str, Any]]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return await verify_access_token(authorization[7:].strip())


async def require_user(authorization: Optional[str]) -> dict[str, Any]:
    user = await authenticated_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_document_manager(user_id: str) -> None:
    """Only recognized admin roles may add documents to the shared knowledge base."""
    if not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Authorization is not configured")
    try:
        from services.supabase_service import get_supabase_client

        result = (
            get_supabase_client()
            .table("users")
            .select("role:roles(name)")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        role = result.data.get("role") if result.data else None
        if isinstance(role, list):
            role = role[0] if role else None
        role_name = role.get("name") if isinstance(role, dict) else None
    except Exception:
        raise HTTPException(status_code=503, detail="Unable to verify document permissions")

    if role_name not in {"Super Admin", "Barangay Captain", "Secretary", "Staff"}:
        raise HTTPException(status_code=403, detail="Document management permission required")
