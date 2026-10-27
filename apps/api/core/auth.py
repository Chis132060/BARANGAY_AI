"""Supabase token verification and API authorization helpers."""

from typing import Any, Optional
import asyncio
import time
import os

import httpx
from fastapi import HTTPException, Header

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


# Best-effort worker-local quota; production also needs a shared edge/Redis quota.
_voice_quota: dict[str, tuple[int, float]] = {}
_voice_quota_lock = asyncio.Lock()
VOICE_WINDOW_SECONDS = 60
VOICE_QUOTA_PER_MINUTE = max(1, min(120, int(os.getenv("VOICE_QUOTA_PER_MINUTE", "12"))))
CHAT_QUOTA_PER_MINUTE = max(1, min(60, int(os.getenv("CHAT_QUOTA_PER_MINUTE", "20"))))


async def require_chat_access(authorization: Optional[str]) -> dict[str, Any]:
    """Require a verified user and bound billable chat requests per worker."""
    user = await require_user(authorization)
    now = time.monotonic()
    async with _voice_quota_lock:
        if len(_voice_quota) > 10000:
            for key, (_, expiry) in list(_voice_quota.items()):
                if expiry <= now:
                    del _voice_quota[key]
        key = f"chat:{user['id']}"
        count, expiry = _voice_quota.get(key, (0, now + VOICE_WINDOW_SECONDS))
        if expiry <= now:
            count, expiry = 0, now + VOICE_WINDOW_SECONDS
        if count >= CHAT_QUOTA_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Chat usage limit reached. Please try again shortly.")
        _voice_quota[key] = (count + 1, expiry)
    return user


async def require_voice_access(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    """Require a valid token and bound costly voice requests per worker."""
    user = await require_user(authorization)
    now = time.monotonic()
    async with _voice_quota_lock:
        if len(_voice_quota) > 10000:
            for key, (_, expiry) in list(_voice_quota.items()):
                if expiry <= now:
                    del _voice_quota[key]
        count, expiry = _voice_quota.get(user["id"], (0, now + VOICE_WINDOW_SECONDS))
        if expiry <= now:
            count, expiry = 0, now + VOICE_WINDOW_SECONDS
        if count >= VOICE_QUOTA_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Voice usage limit reached. Please try again shortly.")
        _voice_quota[user["id"]] = (count + 1, expiry)
    return user

