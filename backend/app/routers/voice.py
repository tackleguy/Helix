"""Voice routes — speech-to-text via whisper.cpp when configured."""

from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..settings import get_settings

router = APIRouter()
log = logging.getLogger("helix.voice")


class TranscribeResponse(BaseModel):
    text: str
    backend: str
    duration_ms: int | None = None


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...)) -> TranscribeResponse:
    s = get_settings()

    raw = await audio.read()
    if len(raw) > s.audio_upload_max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"audio over {s.audio_upload_max_mb} MB")
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="empty audio")

    if not (s.whisper_binary and s.whisper_model):
        return TranscribeResponse(
            text="[whisper not configured — set HELIX_WHISPER_BINARY and HELIX_WHISPER_MODEL to enable transcription]",
            backend="unconfigured",
        )

    binary = Path(s.whisper_binary)
    model = Path(s.whisper_model)
    if not binary.exists() or not model.exists():
        raise HTTPException(status_code=500, detail="whisper binary or model file missing on disk")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(raw)
        wav_path = Path(f.name)

    try:
        import time
        started = time.time()
        proc = await asyncio.create_subprocess_exec(
            str(binary),
            "-m", str(model),
            "-f", str(wav_path),
            "--no-prints",
            "--output-txt",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        duration_ms = int((time.time() - started) * 1000)
        if proc.returncode != 0:
            log.error("whisper failed: %s", stderr.decode("utf-8", errors="replace"))
            raise HTTPException(status_code=500, detail="whisper transcription failed")
        text = stdout.decode("utf-8", errors="replace").strip()
        return TranscribeResponse(text=text, backend="whisper.cpp", duration_ms=duration_ms)
    finally:
        try:
            wav_path.unlink()
        except OSError:
            pass


@router.get("/status")
async def status() -> dict[str, str | bool]:
    s = get_settings()
    has_bin = bool(s.whisper_binary) and Path(s.whisper_binary).exists() if s.whisper_binary else False
    has_model = bool(s.whisper_model) and Path(s.whisper_model).exists() if s.whisper_model else False
    return {
        "backend": "whisper.cpp" if (has_bin and has_model) else "unconfigured",
        "binary_present": has_bin,
        "model_present": has_model,
    }


# silence unused-import warnings on systems missing shutil usage paths
_ = shutil
