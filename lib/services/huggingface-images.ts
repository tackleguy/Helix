import { InferenceClient } from "@huggingface/inference";
import { getHuggingFaceApiKey, isLocalOnlyMode } from "@/lib/env";
import { logServer } from "@/lib/logger";
import { applyStylePreset } from "@/lib/presets/image-styles";
import type { GenerateImageInput } from "@/lib/images/types";
import { ASPECT_RATIOS } from "@/lib/images/types";
import { withRetry } from "@/src/services/ai/huggingface";

export const DEFAULT_HF_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell";

const HF_IMAGE_MODELS: Record<string, string> = {
  "flux-schnell": "black-forest-labs/FLUX.1-schnell",
  "flux-dev": "black-forest-labs/FLUX.1-dev",
  "sdxl-lightning": "black-forest-labs/FLUX.1-schnell",
};

export function getHuggingFaceImageModel(helixModel?: string): string {
  if (helixModel && HF_IMAGE_MODELS[helixModel]) {
    return HF_IMAGE_MODELS[helixModel];
  }
  return process.env.HF_IMAGE_MODEL?.trim() || DEFAULT_HF_IMAGE_MODEL;
}

export function hasHuggingFaceImages(): boolean {
  if (isLocalOnlyMode()) return false;
  return Boolean(getHuggingFaceApiKey());
}

export async function generateWithHuggingFace(
  input: GenerateImageInput,
  onProgress?: (value: number) => void,
): Promise<Buffer> {
  const apiKey = getHuggingFaceApiKey();
  if (!apiKey) {
    throw new Error(
      "HF_API_KEY is not set. Add a Hugging Face token with Inference Providers permission.",
    );
  }

  const model = getHuggingFaceImageModel(input.model);
  const aspect =
    ASPECT_RATIOS.find((a) => a.id === input.aspectRatio) ?? ASPECT_RATIOS[0];
  const styled = applyStylePreset(
    input.prompt,
    input.negativePrompt ?? "",
    input.stylePreset,
  );

  onProgress?.(10);
  logServer("info", "huggingface image start", { model });

  const blob = await withRetry("huggingface.image", async (): Promise<Blob> => {
    const client = new InferenceClient(apiKey);
    return client.textToImage(
      {
        provider: "auto",
        model,
        inputs: styled.prompt,
        parameters: {
          negative_prompt: styled.negative || undefined,
          width: aspect.width,
          height: aspect.height,
          num_inference_steps: input.steps ?? (input.model === "flux-dev" ? 20 : 4),
          guidance_scale: input.cfg ?? (input.model === "flux-dev" ? 3.5 : 0),
          seed: input.seed,
        },
      },
      { outputType: "blob" },
    );
  });

  onProgress?.(90);
  const buffer = Buffer.from(await blob.arrayBuffer());
  logServer("info", "huggingface image generated", { model, bytes: buffer.length });
  onProgress?.(100);
  return buffer;
}
