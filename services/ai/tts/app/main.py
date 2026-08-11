"""Barangay AI TTS — FastAPI app entrypoint (F5-TTS)."""

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .cleanup import _cleanup_once
from .config import settings
from .errors import ServiceError
from .logging_config import setup_logging
from .routes import speech

setup_logging()
logger = logging.getLogger("tts")


@asynccontextmanager
async def lifespan(app: FastAPI):
    output_dir = Path(settings.TTS_OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    _cleanup_once()
    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()


async def _cleanup_loop() -> None:
    try:
        while True:
            await asyncio.sleep(3600)
            _cleanup_once()
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    app = FastAPI(
        title="Barangay AI · Text-to-Speech",
        description="Self-hosted speech synthesis powered by F5-TTS.",
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(speech.router, prefix="/api/v1")

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request validation failed.",
                    "details": exc.errors(),
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