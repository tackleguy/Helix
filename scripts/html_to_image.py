#!/usr/bin/env python3
"""Render a local HTML file to PNG/JPEG using headless Chromium (Playwright)."""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

from playwright.async_api import async_playwright


async def html_to_image(
    html_file_path: str,
    output_image_path: str,
    *,
    width: int = 1024,
    height: int = 1024,
    is_jpeg: bool = False,
) -> None:
    absolute_path = os.path.abspath(html_file_path)
    if not os.path.isfile(absolute_path):
        raise FileNotFoundError(f"HTML file not found: {absolute_path}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_viewport_size({"width": width, "height": height})
        await page.goto(f"file://{absolute_path}", wait_until="networkidle")

        element = await page.query_selector(".canvas")
        image_type = "jpeg" if is_jpeg else "png"

        if element:
            await element.screenshot(path=output_image_path, type=image_type)
        else:
            await page.screenshot(path=output_image_path, type=image_type, full_page=False)

        await browser.close()


async def check_playwright() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        await browser.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Render HTML to PNG via Playwright")
    parser.add_argument("html_file", nargs="?", help="Path to HTML file")
    parser.add_argument("output_image", nargs="?", help="Output image path")
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--jpeg", action="store_true")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify Playwright + Chromium are installed",
    )
    args = parser.parse_args()

    if args.check:
        try:
            asyncio.run(check_playwright())
            print("ok")
            return 0
        except Exception as exc:  # noqa: BLE001
            print(f"error: {exc}", file=sys.stderr)
            return 1

    if not args.html_file or not args.output_image:
        parser.error("html_file and output_image are required unless using --check")

    try:
        asyncio.run(
            html_to_image(
                args.html_file,
                args.output_image,
                width=args.width,
                height=args.height,
                is_jpeg=args.jpeg,
            )
        )
        print(f"Success! Image saved to {args.output_image}")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
