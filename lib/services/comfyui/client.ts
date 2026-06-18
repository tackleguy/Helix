import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HELIX_IMAGES_DIR } from "@/lib/paths";
import { logServer } from "@/lib/logger";
import { loadServiceUrls } from "@/lib/services/registry";
import { getServiceHealth } from "@/lib/services/registry";
import {
  buildComfyPrompt,
  WORKFLOW_DEFS,
} from "@/lib/services/comfyui/workflows";
import type { DiffusionImageModelId, GenerateImageInput } from "@/lib/images/types";
import { ASPECT_RATIOS } from "@/lib/images/types";
import { applyStylePreset } from "@/lib/presets/image-styles";

export interface ComfyProgress {
  value: number;
  max: number;
}

export async function isComfyUiOnline(): Promise<boolean> {
  const health = await getServiceHealth("comfyui");
  return health.online;
}

export async function queueComfyGeneration(
  input: GenerateImageInput,
  onProgress?: (p: ComfyProgress) => void,
): Promise<{ buffer: Buffer; filename: string }> {
  if (input.model === "html-canvas") {
    throw new Error("html-canvas uses the HTML render pipeline, not ComfyUI");
  }
  const model = input.model as DiffusionImageModelId;
  const urls = await loadServiceUrls();
  const base = urls.comfyui.replace(/\/$/, "");
  const def = WORKFLOW_DEFS[model];
  const aspect =
    ASPECT_RATIOS.find((a) => a.id === input.aspectRatio) ?? ASPECT_RATIOS[0];
  const styled = applyStylePreset(
    input.prompt,
    input.negativePrompt ?? "",
    input.stylePreset,
  );
  const seed = input.seed ?? Math.floor(Math.random() * 2 ** 31);
  const workflow = buildComfyPrompt(model, {
    prompt: styled.prompt,
    negativePrompt: styled.negative,
    seed,
    width: aspect.width,
    height: aspect.height,
    steps: input.steps ?? def.defaultSteps,
    cfg: input.cfg ?? def.defaultCfg,
  });

  const queueRes = await fetch(`${base}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!queueRes.ok) {
    throw new Error(`ComfyUI queue failed: HTTP ${queueRes.status}`);
  }
  const { prompt_id: promptId } = (await queueRes.json()) as {
    prompt_id: string;
  };

  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    const histRes = await fetch(`${base}/history/${promptId}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!histRes.ok) {
      await sleep(1000);
      continue;
    }
    const history = (await histRes.json()) as Record<
      string,
      {
        outputs?: Record<
          string,
          { images?: Array<{ filename: string; subfolder: string; type: string }> }
        >;
        status?: { status_str?: string };
      }
    >;
    const entry = history[promptId];
    if (!entry) {
      onProgress?.({ value: 0, max: 100 });
      await sleep(800);
      continue;
    }

    const outputs = entry.outputs ?? {};
    for (const out of Object.values(outputs)) {
      const img = out.images?.[0];
      if (img) {
        const viewUrl = new URL(`${base}/view`);
        viewUrl.searchParams.set("filename", img.filename);
        viewUrl.searchParams.set("subfolder", img.subfolder);
        viewUrl.searchParams.set("type", img.type);
        const imgRes = await fetch(viewUrl, { signal: AbortSignal.timeout(60_000) });
        if (!imgRes.ok) throw new Error("ComfyUI image download failed");
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        onProgress?.({ value: 100, max: 100 });
        return { buffer, filename: img.filename };
      }
    }

    onProgress?.({ value: 50, max: 100 });
    await sleep(1000);
  }

  throw new Error("ComfyUI generation timed out");
}

export function saveImageBuffer(id: string, buffer: Buffer): string {
  mkdirSync(HELIX_IMAGES_DIR, { recursive: true });
  const filePath = join(HELIX_IMAGES_DIR, `${id}.png`);
  writeFileSync(filePath, buffer);
  logServer("info", "image saved", { id, path: filePath });
  return `/api/images/file/${id}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
