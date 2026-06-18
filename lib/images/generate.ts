import { insertImage } from "@/lib/images/repository";
import type { GenerateImageInput, ImageDto } from "@/lib/images/types";
import {
  generateHtmlCanvasImage,
} from "@/lib/images/html-canvas";
import {
  isComfyUiOnline,
  queueComfyGeneration,
  saveImageBuffer,
} from "@/lib/services/comfyui/client";
import { generateWithHuggingFace, hasHuggingFaceImages } from "@/lib/services/huggingface-images";
import { isLocalOnlyMode, isVercelDeploy } from "@/lib/env";
import { uid } from "@/lib/utils";
import { logServer } from "@/lib/logger";

export type ProgressCallback = (event: {
  type: "progress";
  value: number;
  max: number;
}) => void;

async function resolveImageBackend(): Promise<"comfyui" | "huggingface"> {
  if (!isVercelDeploy()) {
    const comfyOnline = await isComfyUiOnline();
    if (comfyOnline) return "comfyui";
    if (isLocalOnlyMode()) {
      throw new Error(
        "ComfyUI is offline. Start ComfyUI on :8188 (local-only mode — HF fallback disabled).",
      );
    }
  }
  if (hasHuggingFaceImages()) return "huggingface";
  throw new Error(
    "No image backend available. Start ComfyUI on :8188 or set HF_API_KEY for FLUX via Hugging Face.",
  );
}

export async function generateImage(
  input: GenerateImageInput,
  onProgress?: ProgressCallback,
): Promise<ImageDto> {
  const id = uid();

  if (input.model === "html-canvas") {
    const { buffer, html } = await generateHtmlCanvasImage(input, onProgress);
    const url = isVercelDeploy()
      ? `data:image/png;base64,${buffer.toString("base64")}`
      : saveImageBuffer(id, buffer);

    const params = {
      aspectRatio: input.aspectRatio,
      stylePreset: input.stylePreset,
      backend: "html-canvas" as const,
      htmlLength: html.length,
    };

    if (isVercelDeploy()) {
      const image: ImageDto = {
        id,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt ?? null,
        model: input.model,
        paramsJson: JSON.stringify(params),
        url,
        thumbnailUrl: url,
        sessionId: input.sessionId ?? null,
        createdAt: Date.now(),
      };
      logServer("info", "html canvas image complete", { id, vercel: true });
      return image;
    }

    const image = insertImage({
      id,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt ?? null,
      model: input.model,
      paramsJson: JSON.stringify(params),
      url,
      thumbnailUrl: url,
      sessionId: input.sessionId ?? null,
    });
    logServer("info", "html canvas image complete", { id });
    return image;
  }

  const backend = await resolveImageBackend();
  let buffer: Buffer;

  if (backend === "comfyui") {
    const result = await queueComfyGeneration(input, (p) => {
      onProgress?.({ type: "progress", value: p.value, max: p.max });
    });
    buffer = result.buffer;
  } else {
    buffer = await generateWithHuggingFace(input, (v) => {
      onProgress?.({ type: "progress", value: v, max: 100 });
    });
  }

  const url = isVercelDeploy()
    ? `data:image/png;base64,${buffer.toString("base64")}`
    : saveImageBuffer(id, buffer);

  if (isVercelDeploy()) {
    const image: ImageDto = {
      id,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt ?? null,
      model: input.model,
      paramsJson: JSON.stringify({
        aspectRatio: input.aspectRatio,
        steps: input.steps,
        cfg: input.cfg,
        seed: input.seed,
        stylePreset: input.stylePreset,
        backend,
      }),
      url,
      thumbnailUrl: url,
      sessionId: input.sessionId ?? null,
      createdAt: Date.now(),
    };
    logServer("info", "image generation complete", { id, backend, vercel: true });
    return image;
  }

  const image = insertImage({
    id,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt ?? null,
    model: input.model,
    paramsJson: JSON.stringify({
      aspectRatio: input.aspectRatio,
      steps: input.steps,
      cfg: input.cfg,
      seed: input.seed,
      stylePreset: input.stylePreset,
      backend,
    }),
    url,
    thumbnailUrl: url,
    sessionId: input.sessionId ?? null,
  });

  logServer("info", "image generation complete", { id, backend });
  return image;
}
