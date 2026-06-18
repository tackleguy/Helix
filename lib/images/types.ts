import { z } from "zod";

export const IMAGE_MODEL_IDS = [
  "flux-schnell",
  "flux-dev",
  "sdxl-lightning",
  "html-canvas",
] as const;

export type ImageModelId = (typeof IMAGE_MODEL_IDS)[number];

/** Diffusion models served by ComfyUI / HF — not HTML Canvas. */
export type DiffusionImageModelId = Exclude<ImageModelId, "html-canvas">;

export const ASPECT_RATIOS = [
  { id: "1:1", width: 1024, height: 1024 },
  { id: "16:9", width: 1344, height: 768 },
  { id: "9:16", width: 768, height: 1344 },
  { id: "4:3", width: 1152, height: 896 },
  { id: "3:4", width: 896, height: 1152 },
] as const;

export const GenerateImageSchema = z.object({
  prompt: z.string().min(1).max(4000),
  negativePrompt: z.string().max(2000).optional(),
  model: z.enum(IMAGE_MODEL_IDS).default("flux-schnell"),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
  steps: z.number().int().min(1).max(50).optional(),
  cfg: z.number().min(0).max(20).optional(),
  seed: z.number().int().optional(),
  stylePreset: z.string().optional(),
  sessionId: z.string().optional(),
  referenceImageDataUrl: z.string().optional(),
});

export type GenerateImageInput = z.infer<typeof GenerateImageSchema>;

export interface ImageDto {
  id: string;
  prompt: string;
  negativePrompt: string | null;
  model: string | null;
  paramsJson: string | null;
  url: string;
  thumbnailUrl: string | null;
  sessionId: string | null;
  createdAt: number;
}

export interface GenerationProgress {
  type: "meta" | "progress" | "done" | "error";
  jobId?: string;
  value?: number;
  max?: number;
  image?: ImageDto;
  error?: string;
}
