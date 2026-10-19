from typing import Optional

from fastapi import HTTPException, Request
from starlette.websockets import WebSocket
from strawberry.fastapi import BaseContext
from strawberry.types import Info

from core.auth import authenticated_user


class AuthenticatedUser:
    def __init__(self, user_id: str):
        self.id = user_id
        self.role = "authenticated"


class CustomContext(BaseContext):
    def __init__(self, request: Optional[Request] = None, websocket: Optional[WebSocket] = None,
                 current_user: Optional[AuthenticatedUser] = None):
        super().__init__()
        self.request = request
        self.websocket = websocket
        self.current_user = current_user


async def get_context(request: Optional[Request] = None, websocket: Optional[WebSocket] = None) -> CustomContext:
    headers = request.headers if request else websocket.headers if websocket else {}
    user = await authenticated_user(headers.get("Authorization"))
    return CustomContext(request, websocket, AuthenticatedUser(user["id"]) if user else None)


def require_auth(info: Info) -> str:
    user = info.context.current_user
    if not user:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")
    return user.id
