import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { getHuggingFaceApiKey } from "@/lib/env";
import { applyStylePreset } from "@/lib/presets/image-styles";
import { saveImageBuffer } from "@/lib/services/comfyui/client";
import { logServer } from "@/lib/logger";
import { ASPECT_RATIOS, type GenerateImageInput } from "@/lib/images/types";
import { streamHuggingFace } from "@/src/services/ai/huggingface";
import { DEFAULT_HF_MODEL } from "@/src/services/ai/types";

const execFileAsync = promisify(execFile);

const HTML_SYSTEM = `You are an HTML/CSS visual artist. The user describes an image or graphic.

Output ONE complete HTML document that renders that scene using only HTML, inline CSS, and inline SVG.
Rules:
- Include a root element <div class="canvas">...</div> as the main artwork
- The .canvas must fill the viewport exactly (width and height given in the user message)
- No external URLs, no JavaScript, no markdown fences, no explanation — HTML only
- Use gradients, shapes, typography, shadows, and SVG for rich visuals
- body { margin: 0; padding: 0; overflow: hidden; }`;

function repoRoot(): string {
  return join(process.cwd());
}

function htmlRenderDir(): string {
  const dir = join(repoRoot(), ".helix", "html-render");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** HTML Canvas always uses HF Qwen — works even when AI_LOCAL_ONLY is set. */
export function hasHfForHtmlCanvas(): boolean {
  return Boolean(getHuggingFaceApiKey());
}

export function getHtmlCanvasModel(): string {
  return (
    process.env.HF_HTML_MODEL?.trim() ||
    process.env.HF_MODEL?.trim() ||
    DEFAULT_HF_MODEL
  );
}

async function isPlaywrightReady(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("python3", [
      join(repoRoot(), "scripts/html_to_image.py"),
      "--check",
    ]);
    return stdout.trim() === "ok";
  } catch {
    return false;
  }
}

export async function isHtmlRenderReady(): Promise<boolean> {
  return hasHfForHtmlCanvas() && (await isPlaywrightReady());
}

function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? raw).trim();
  if (/<html[\s>]/i.test(body) || /<!doctype/i.test(body)) {
    return body;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>body{margin:0;padding:0;overflow:hidden;background:#111;}</style>
</head>
<body>
${body}
</body>
</html>`;
}

async function promptToHtml(
  prompt: string,
  width: number,
  height: number,
  onProgress?: (value: number) => void,
): Promise<string> {
  onProgress?.(10);
  const userMessage = `Canvas size: ${width}px × ${height}px.

Create this image:
${prompt}`;

  if (!hasHfForHtmlCanvas()) {
    throw new Error(
      "HTML Canvas requires HF_API_KEY — Qwen generates the HTML via Hugging Face Inference.",
    );
  }

  const model = getHtmlCanvasModel();
  logServer("info", "html canvas llm start", { model });

  const { result } = await streamHuggingFace({
    model,
    system: HTML_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  let raw = "";
  for await (const chunk of result.textStream) {
    raw += chunk;
    onProgress?.(10 + Math.min(30, Math.floor(raw.length / 200)));
  }

  onProgress?.(45);
  return extractHtml(raw);
}

async function renderHtmlToPng(
  html: string,
  width: number,
  height: number,
  onProgress?: (value: number) => void,
): Promise<Buffer> {
  const id = `render-${Date.now()}`;
  const dir = htmlRenderDir();
  const htmlPath = join(dir, `${id}.html`);
  const pngPath = join(dir, `${id}.png`);

  writeFileSync(htmlPath, html, "utf8");
  onProgress?.(55);

  try {
    await execFileAsync(
      "python3",
      [
        join(repoRoot(), "scripts/html_to_image.py"),
        htmlPath,
        pngPath,
        "--width",
        String(width),
        "--height",
        String(height),
      ],
      { timeout: 120_000 },
    );
    onProgress?.(90);
    return readFileSync(pngPath);
  } finally {
    try {
      unlinkSync(htmlPath);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(pngPath);
    } catch {
      /* ignore */
    }
  }
}

export async function generateHtmlCanvasImage(
  input: GenerateImageInput,
  onProgress?: (event: { type: "progress"; value: number; max: number }) => void,
): Promise<{ buffer: Buffer; html: string }> {
  if (!hasHfForHtmlCanvas()) {
    throw new Error(
      "Set HF_API_KEY for Qwen (Hugging Face Inference). HTML Canvas uses HF Qwen to write HTML.",
    );
  }

  const playwrightReady = await isPlaywrightReady();
  if (!playwrightReady) {
    throw new Error(
      "HTML render not installed. Run: npm run install:html-render",
    );
  }

  const aspect =
    ASPECT_RATIOS.find((a) => a.id === input.aspectRatio) ?? ASPECT_RATIOS[0];
  const styled = applyStylePreset(
    input.prompt,
    input.negativePrompt ?? "",
    input.stylePreset,
  );

  const report = (value: number) =>
    onProgress?.({ type: "progress", value, max: 100 });

  report(5);
  const html = await promptToHtml(
    styled.prompt,
    aspect.width,
    aspect.height,
    report,
  );

  logServer("info", "html canvas generated", {
    bytes: html.length,
    aspect: input.aspectRatio,
    model: getHtmlCanvasModel(),
  });

  const buffer = await renderHtmlToPng(
    html,
    aspect.width,
    aspect.height,
    report,
  );

  report(100);
  return { buffer, html };
}

export { saveImageBuffer };
