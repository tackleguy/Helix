"""Centralised configuration. All values read from environment with sensible defaults."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="HELIX_", extra="ignore")

    env: str = Field(default="dev", description="dev | prod")
    log_level: str = Field(default="info")

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # Upstream AI services. Empty string == not configured; route returns a
    # documented stub instead of failing.
    comfyui_url: str = Field(default="", description="e.g. http://comfyui:8188")
    whisper_binary: str = Field(default="", description="path to whisper-cli binary")
    whisper_model: str = Field(default="", description="path to whisper ggml model")

    image_output_dir: str = Field(default="/tmp/helix-images")
    audio_upload_max_mb: int = Field(default=25)


@lru_cache
def get_settings() -> Settings:
    return Settings()
