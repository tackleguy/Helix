"""Health + system info routes."""

from __future__ import annotations

import platform
import time

import httpx
from fastapi import APIRouter

from ..settings import get_settings

router = APIRouter(tags=["health"])

_started = time.time()


@router.get("/health")
async def health() -> dict[str, str | float]:
    return {"status": "ok", "uptime_s": round(time.time() - _started, 2)}


@router.get("/info")
async def info() -> dict:
    s = get_settings()
    return {
        "env": s.env,
        "python": platform.python_version(),
        "platform": platform.platform(),
        "services": {
            "comfyui": _flag(s.comfyui_url),
            "whisper": _flag(s.whisper_binary and s.whisper_model),
        },
    }


@router.get("/health/deep")
async def health_deep() -> dict:
    """Probes optional upstreams. Always 200; per-service status is in the body."""
    s = get_settings()
    out: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=2.0) as c:
        if s.comfyui_url:
            out["comfyui"] = await _probe(c, f"{s.comfyui_url.rstrip('/')}/system_stats")
        else:
            out["comfyui"] = {"configured": False}
    return {"status": "ok", "upstreams": out}


def _flag(v: object) -> str:
    return "configured" if v else "unconfigured"


async def _probe(c: httpx.AsyncClient, url: str) -> dict:
    try:
        r = await c.get(url)
        return {"configured": True, "reachable": r.status_code < 500, "code": r.status_code}
    except httpx.HTTPError as e:
        return {"configured": True, "reachable": False, "error": type(e).__name__}
