"""Service-level error type shared across the AI services."""


class ServiceError(Exception):
    """Raised inside service layer code; converted to a consistent HTTP envelope.

    Response body: {"success": false, "error": {"code": ..., "message": ...}}
    """

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(f"[{code}] {message}")