"""Image generation routes.

When HELIX_COMFYUI_URL is set, proxies to a ComfyUI server.
Otherwise returns a deterministic placeholder so the UI is wire-complete.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ..services.image_placeholder import render_placeholder
from ..settings import get_settings

router = APIRouter()
log = logging.getLogger("helix.image")


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    negative_prompt: str | None = Field(default=None, max_length=2000)
    width: int = Field(default=1024, ge=64, le=2048)
    height: int = Field(default=1024, ge=64, le=2048)
    seed: int | None = None


class GenerateResponse(BaseModel):
    id: str
    url: str
    backend: str
    prompt: str
    width: int
    height: int
    duration_ms: int


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    s = get_settings()
    started = time.time()

    if s.comfyui_url:
        raise HTTPException(
            status_code=501,
            detail="ComfyUI backend wiring not implemented yet — placeholder fallback active.",
        )

    # Simulate a bit of work so the UI streaming/loading feels real.
    await asyncio.sleep(0.4)

    image_id = _make_id(req.prompt, req.seed or 0)
    png = render_placeholder(req.prompt, width=req.width, height=req.height)
    out_path = Path(s.image_output_dir) / f"{image_id}.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(png)
    log.info("generated placeholder %s (%d bytes) for prompt=%r", image_id, len(png), req.prompt[:60])

    return GenerateResponse(
        id=image_id,
        url=f"/image/{image_id}.png",
        backend="placeholder",
        prompt=req.prompt,
        width=req.width,
        height=req.height,
        duration_ms=int((time.time() - started) * 1000),
    )


@router.get("/{image_id}")
async def fetch(image_id: str) -> FileResponse:
    if "/" in image_id or "\\" in image_id or ".." in image_id:
        raise HTTPException(status_code=400, detail="invalid image id")
    s = get_settings()
    path = Path(s.image_output_dir) / image_id
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="image not found")
    if path.resolve().parent != Path(s.image_output_dir).resolve():
        raise HTTPException(status_code=400, detail="path traversal")
    return FileResponse(path, media_type="image/png")


def _make_id(prompt: str, seed: int) -> str:
    h = hashlib.sha256(f"{prompt}|{seed}|{os.urandom(8).hex()}".encode()).hexdigest()
    return h[:16]
