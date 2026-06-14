export interface ImageStylePreset {
  id: string;
  label: string;
  promptSuffix: string;
  negativeSuffix: string;
}

export const IMAGE_STYLE_PRESETS: ImageStylePreset[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    promptSuffix: ", cinematic lighting, shallow depth of field, 35mm film grain, dramatic composition",
    negativeSuffix: ", flat lighting, amateur, oversaturated",
  },
  {
    id: "editorial",
    label: "Editorial",
    promptSuffix: ", editorial photography, clean composition, natural light, magazine quality",
    negativeSuffix: ", cluttered, low quality, watermark",
  },
  {
    id: "product",
    label: "Product",
    promptSuffix: ", product photography, studio lighting, crisp details, neutral background",
    negativeSuffix: ", messy background, blurry, distorted",
  },
  {
    id: "painterly",
    label: "Painterly",
    promptSuffix: ", painterly brush strokes, fine art, textured canvas, expressive color",
    negativeSuffix: ", photorealistic, plastic, sterile",
  },
  {
    id: "brutalist",
    label: "Brutalist",
    promptSuffix: ", brutalist architecture, concrete textures, stark geometry, high contrast",
    negativeSuffix: ", ornate, soft, decorative",
  },
  {
    id: "anime",
    label: "Anime",
    promptSuffix: ", anime illustration, clean linework, vibrant cel shading, detailed eyes",
    negativeSuffix: ", photorealistic, 3d render, blurry",
  },
];

export function applyStylePreset(
  prompt: string,
  negative: string,
  presetId?: string,
): { prompt: string; negative: string } {
  const preset = IMAGE_STYLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return { prompt, negative };
  return {
    prompt: prompt + preset.promptSuffix,
    negative: (negative || "") + preset.negativeSuffix,
  };
}
