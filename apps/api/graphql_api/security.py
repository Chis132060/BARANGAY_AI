import strawberry
from typing import Optional, Any
from fastapi import Request, HTTPException, Depends
from starlette.websockets import WebSocket
from strawberry.fastapi import BaseContext
from strawberry.types import Info

# 1. Query Depth Protection
# Strawberry has a built-in MaxDepthValidationRule, we will apply it when mounting the route.

class AuthenticatedUser:
    def __init__(self, id: str, role: str = "authenticated"):
        self.id = id
        self.role = role

class CustomContext(BaseContext):
    def __init__(self, request: Optional[Request] = None, websocket: Optional[WebSocket] = None):
        super().__init__()
        self.request = request
        self.websocket = websocket
        
    @property
    def current_user(self) -> Optional[AuthenticatedUser]:
        # Extract JWT from Authorization header
        auth_header = None
        if self.request:
            auth_header = self.request.headers.get("Authorization")
        elif self.websocket:
            # WebSockets usually pass tokens via subprotocols or query params in standard GraphQL ws
            auth_header = self.websocket.headers.get("Authorization")
            
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
            
        token = auth_header.split(" ")[1]
        # In a real app, verify JWT here using PyJWT + Supabase JWT Secret.
        # For this implementation, we simulate decoding:
        try:
            import jwt
            from core.config import settings
            # We mock the validation for demonstration if SUPABASE_JWT_SECRET is missing
            # In production: jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
            # For testing without a real auth flow, we mock it:
            if token == "mock_valid_token":
                return AuthenticatedUser(id="mock_user_uuid")
            return None
        except Exception:
            return None

def get_context(request: Request = None, websocket: WebSocket = None) -> CustomContext:
    return CustomContext(request, websocket)

def require_auth(info: Info) -> str:
    """Returns user_id or raises exception"""
    user = info.context.current_user
    if not user:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")
    return user.id
