"""Generates a deterministic placeholder image with the prompt rendered onto it.

Used when COMFYUI_URL is not configured so the image-gen UI is wire-complete
without requiring a GPU + 24GB model download. Real ComfyUI integration
swaps this out via services/comfyui.py (TODO when infra is available).
"""

from __future__ import annotations

import hashlib
import io
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def _color_from_prompt(prompt: str) -> tuple[int, int, int]:
    h = hashlib.sha256(prompt.encode("utf-8")).digest()
    return (h[0], h[1], h[2])


def _ink_color(bg: tuple[int, int, int]) -> tuple[int, int, int]:
    # luminance heuristic — black ink on light bg, white on dark
    lum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]
    return (12, 14, 20) if lum > 140 else (240, 242, 248)


def render_placeholder(prompt: str, width: int = 1024, height: int = 1024) -> bytes:
    bg = _color_from_prompt(prompt)
    ink = _ink_color(bg)

    img = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(img)

    # gradient overlay for depth
    for y in range(height):
        a = int(60 * (y / height))
        draw.line([(0, y), (width, y)], fill=(0, 0, 0, a))

    # try a clean system font; fall back to PIL default
    font = None
    for candidate in (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if Path(candidate).exists():
            try:
                font = ImageFont.truetype(candidate, 38)
                break
            except OSError:
                continue
    if font is None:
        font = ImageFont.load_default()

    label = "HELIX · placeholder"
    draw.text((40, 36), label, fill=ink, font=font)

    body_font = font.font_variant(size=28) if hasattr(font, "font_variant") else font
    wrapped = textwrap.fill(prompt, width=40)
    draw.multiline_text((40, 120), wrapped, fill=ink, font=body_font, spacing=8)

    foot = "ComfyUI not configured — set HELIX_COMFYUI_URL to swap in real generation."
    foot_font = font.font_variant(size=18) if hasattr(font, "font_variant") else font
    draw.text((40, height - 60), foot, fill=ink, font=foot_font)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
