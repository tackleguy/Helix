import { logServer } from "@/lib/logger";
import { loadAppSettings } from "@/lib/settings";
import { applyStylePreset } from "@/lib/presets/image-styles";
import type { GenerateImageInput } from "@/lib/images/types";
import { ASPECT_RATIOS } from "@/lib/images/types";

const REPLICATE_MODELS: Record<string, string> = {
  "flux-schnell": "black-forest-labs/flux-schnell",
  "flux-dev": "black-forest-labs/flux-dev",
  "sdxl-lightning": "bytedance/sdxl-lightning-4step",
};

export function getReplicateToken(): string | undefined {
  const fromEnv = process.env.REPLICATE_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const settings = loadAppSettings();
  const fromSettings = settings.replicateApiToken?.trim();
  return fromSettings || undefined;
}

export async function generateWithReplicate(
  input: GenerateImageInput,
  onProgress?: (value: number) => void,
): Promise<Buffer> {
  const token = getReplicateToken();
  if (!token) {
    throw new Error(
      "Replicate token not set. Add REPLICATE_API_TOKEN in .env.local or Settings → Services.",
    );
  }

  const model = REPLICATE_MODELS[input.model] ?? REPLICATE_MODELS["flux-schnell"];
  const aspect =
    ASPECT_RATIOS.find((a) => a.id === input.aspectRatio) ?? ASPECT_RATIOS[0];
  const styled = applyStylePreset(
    input.prompt,
    input.negativePrompt ?? "",
    input.stylePreset,
  );

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      model,
      input: {
        prompt: styled.prompt,
        ...(styled.negative ? { negative_prompt: styled.negative } : {}),
        width: aspect.width,
        height: aspect.height,
        num_inference_steps: input.steps ?? 4,
        seed: input.seed,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate failed: ${createRes.status} ${err.slice(0, 200)}`);
  }

  onProgress?.(50);
  const prediction = (await createRes.json()) as {
    status: string;
    output?: string | string[];
    error?: string;
  };

  if (prediction.status === "failed") {
    throw new Error(prediction.error ?? "Replicate prediction failed");
  }

  const output = prediction.output;
  const url = Array.isArray(output) ? output[0] : output;
  if (!url || typeof url !== "string") {
    throw new Error("Replicate returned no image URL");
  }

  onProgress?.(80);
  const imgRes = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!imgRes.ok) throw new Error("Failed to download Replicate image");

  logServer("info", "replicate image generated", { model });
  onProgress?.(100);
  return Buffer.from(await imgRes.arrayBuffer());
}
