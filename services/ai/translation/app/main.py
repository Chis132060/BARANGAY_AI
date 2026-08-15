"""Barangay AI Translation — FastAPI app entrypoint (Lingvanex / CTranslate2)."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from .config import settings
from .errors import ServiceError
from .logging_config import setup_logging
from .routes import translate

setup_logging()
logger = logging.getLogger("translation")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Barangay AI · Translation",
        description="Self-hosted machine translation powered by Lingvanex models (CTranslate2).",
        version=settings.APP_VERSION,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(translate.router, prefix="/api/v1")

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        details = jsonable_encoder(exc.errors())
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request validation failed.",
                    "details": details,
                },
            },
        )

    @app.exception_handler(ServiceError)
    async def service_error_handler(request: Request, exc: ServiceError):
        logger.warning("service_error code=%s path=%s", exc.code, request.url.path)
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        logger.exception("unhandled error path=%s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}},
        )

    @app.get("/health")
    async def health():
        return {"success": True, "status": "healthy", "service": settings.APP_NAME}

    @app.get("/")
    async def root():
        return {"success": True, "service": settings.APP_NAME, "version": settings.APP_VERSION}

    return app


app = create_app()