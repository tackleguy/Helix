import { insertImage } from "@/lib/images/repository";
import type { GenerateImageInput, ImageDto } from "@/lib/images/types";
import {
  isComfyUiOnline,
  queueComfyGeneration,
  saveImageBuffer,
} from "@/lib/services/comfyui/client";
import { generateWithReplicate } from "@/lib/services/replicate";
import { uid } from "@/lib/utils";
import { logServer } from "@/lib/logger";

export type ProgressCallback = (event: {
  type: "progress";
  value: number;
  max: number;
}) => void;

export async function generateImage(
  input: GenerateImageInput,
  onProgress?: ProgressCallback,
): Promise<ImageDto> {
  const id = uid();
  let buffer: Buffer;
  let backend = "comfyui";

  const comfyOnline = await isComfyUiOnline();

  if (comfyOnline) {
    const result = await queueComfyGeneration(input, (p) => {
      onProgress?.({ type: "progress", value: p.value, max: p.max });
    });
    buffer = result.buffer;
  } else {
    backend = "replicate";
    buffer = await generateWithReplicate(input, (v) => {
      onProgress?.({ type: "progress", value: v, max: 100 });
    });
  }

  const url = saveImageBuffer(id, buffer);
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
