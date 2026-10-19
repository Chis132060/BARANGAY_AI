from typing import Optional

from fastapi import HTTPException
from starlette.requests import HTTPConnection
from strawberry.fastapi import BaseContext
from strawberry.types import Info

from core.auth import authenticated_user


class AuthenticatedUser:
    def __init__(self, user_id: str):
        self.id = user_id
        self.role = "authenticated"


class CustomContext(BaseContext):
    def __init__(self, connection: HTTPConnection,
                 current_user: Optional[AuthenticatedUser] = None):
        super().__init__()
        # HTTPConnection is the common base for HTTP requests and WebSockets.
        # Preserve Strawberry's request/websocket context attributes.
        from starlette.requests import Request
        from starlette.websockets import WebSocket
        self.request = connection if isinstance(connection, Request) else None
        self.websocket = connection if isinstance(connection, WebSocket) else None
        self.current_user = current_user


async def get_context(connection: HTTPConnection) -> CustomContext:
    user = await authenticated_user(connection.headers.get("Authorization"))
    return CustomContext(
        connection,
        AuthenticatedUser(user["id"]) if user else None,
    )


def require_auth(info: Info) -> str:
    user = info.context.current_user
    if not user:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")
    return user.id
