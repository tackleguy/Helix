"""FastAPI entrypoint."""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers import health, image, voice
from .settings import get_settings

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)
log = logging.getLogger("helix")

os.makedirs(settings.image_output_dir, exist_ok=True)

app = FastAPI(
    title="Helix Backend",
    version="0.1.0",
    description="Helix AI backend — generation, transcription, vector search, orchestration.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request, exc: Exception):
    log.exception("unhandled error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "detail": str(exc)},
    )


app.include_router(health.router)
app.include_router(image.router, prefix="/image", tags=["image"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": "helix-backend",
        "version": app.version,
        "docs": "/docs",
    }
