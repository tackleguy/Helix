"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dices, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { TopBar } from "@/components/workspace/topbar";
import { Button, FieldLabel, Input, Select } from "@/components/shared/ui";
import { IMAGE_STYLE_PRESETS } from "@/lib/presets/image-styles";
import { listCloudImages, saveCloudImage } from "@/lib/images/cloud-client-store";
import { useCloudMode } from "@/lib/chat/cloud-mode-context";
import type { ImageDto } from "@/lib/images/types";
import { ImageLibrary } from "./image-library";
import { ImageLightbox } from "./image-lightbox";

interface QueueItem {
  id: string;
  prompt: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  error?: string;
  image?: ImageDto;
}

interface LivePreview {
  status: "generating" | "done" | "error";
  prompt: string;
  progress: number;
  image?: ImageDto;
  error?: string;
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = url;
  });
}

export function ImageStudio() {
  const { onCloud, ready: cloudReady } = useCloudMode();
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [model, setModel] = useState("flux-schnell");
  const [aspect, setAspect] = useState("1:1");
  const [steps, setSteps] = useState(4);
  const [cfg, setCfg] = useState(1);
  const [seed, setSeed] = useState<number | "">("");
  const [style, setStyle] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [library, setLibrary] = useState<ImageDto[]>([]);
  const [lightbox, setLightbox] = useState<ImageDto | null>(null);
  const [comfyOnline, setComfyOnline] = useState<boolean | null>(null);
  const [hfImages, setHfImages] = useState<boolean | null>(null);
  const [localOnly, setLocalOnly] = useState(false);
  const [livePreview, setLivePreview] = useState<LivePreview | null>(null);
  const [eagerIds, setEagerIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadLibrary = useCallback(async () => {
    if (onCloud) {
      setLibrary(listCloudImages());
      return;
    }
    const res = await fetch("/api/images/library", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { images: ImageDto[] };
      setLibrary(data.images);
    }
  }, [onCloud]);

  useEffect(() => {
    if (!cloudReady) return;
    void loadLibrary();
    fetch("/api/cloud-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setHfImages(Boolean(d?.cloudImages));
        setLocalOnly(Boolean(d?.localOnly));
      })
      .catch(() => {
        setHfImages(false);
        setLocalOnly(false);
      });

    fetch("/api/services/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const comfy = d?.services?.find(
          (s: { id: string }) => s.id === "comfyui",
        );
        setComfyOnline(Boolean(comfy?.online));
      })
      .catch(() => setComfyOnline(false));
  }, [loadLibrary, cloudReady]);

  const rollSeed = () => setSeed(Math.floor(Math.random() * 2 ** 31));

  const onReferenceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setReference(reader.result as string);
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    const jobId = crypto.randomUUID();
    const trimmedPrompt = prompt.trim();
    setLivePreview({
      status: "generating",
      prompt: trimmedPrompt,
      progress: 0,
    });
    setQueue((q) => [
      { id: jobId, prompt: trimmedPrompt, status: "running", progress: 0 },
      ...q,
    ]);
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negative || undefined,
          model,
          aspectRatio: aspect,
          steps,
          cfg,
          seed: seed === "" ? undefined : seed,
          stylePreset: style || undefined,
          referenceImageDataUrl: reference ?? undefined,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let image: ImageDto | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6)) as {
            type: string;
            value?: number;
            max?: number;
            image?: ImageDto;
            error?: string;
          };

          if (payload.type === "progress" && payload.value != null) {
            const pct = payload.max
              ? Math.round((payload.value / payload.max) * 100)
              : payload.value;
            setLivePreview((p) =>
              p?.status === "generating" ? { ...p, progress: pct } : p,
            );
            setQueue((q) =>
              q.map((j) =>
                j.id === jobId ? { ...j, progress: pct } : j,
              ),
            );
          }
          if (payload.type === "done" && payload.image) {
            image = payload.image;
          }
          if (payload.type === "error") {
            throw new Error(payload.error ?? "generation failed");
          }
        }
      }

      if (!image) throw new Error("no image returned");

      try {
        await preloadImage(image.url);
      } catch {
        /* still show — file route may lag slightly */
      }

      setEagerIds((ids) => [image!.id, ...ids.filter((id) => id !== image!.id)]);
      if (onCloud) saveCloudImage(image);
      setLibrary((lib) => [image!, ...lib.filter((i) => i.id !== image!.id)]);
      setLivePreview({
        status: "done",
        prompt: trimmedPrompt,
        progress: 100,
        image,
      });
      setQueue((q) =>
        q.map((j) =>
          j.id === jobId
            ? { ...j, status: "done", progress: 100, image }
            : j,
        ),
      );
      requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed";
      setLivePreview({
        status: "error",
        prompt: trimmedPrompt,
        progress: 0,
        error: msg,
      });
      setQueue((q) =>
        q.map((j) =>
          j.id === jobId ? { ...j, status: "error", error: msg } : j,
        ),
      );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="Images" />

      {localOnly && (
        <div className="border-b border-helix/15 bg-helix/5 px-4 py-2 text-xs text-white/70">
          Local-only mode — chat uses llama-server/Ollama/LM Studio; images need
          ComfyUI on <span className="font-mono">:8188</span>. Set{" "}
          <span className="font-mono">AI_LOCAL_ONLY=false</span> to use HF again.
        </div>
      )}

      {!localOnly && comfyOnline === false && hfImages && (
        <div className="border-b border-helix/15 bg-helix/5 px-4 py-2 text-xs text-white/70">
          ComfyUI offline — generating with{" "}
          <span className="font-mono text-helix">FLUX</span> via Hugging Face
          Inference Providers (<span className="font-mono">HF_API_KEY</span>).
        </div>
      )}
      {!localOnly && comfyOnline === false && hfImages === false && (
        <div className="border-b border-amber-400/15 bg-amber-400/5 px-4 py-2 text-xs text-amber-100/80">
          No image backend available. Start ComfyUI on :8188 or set{" "}
          <span className="font-mono">HF_API_KEY</span> for FLUX generation.
        </div>
      )}
      {localOnly && comfyOnline === false && (
        <div className="border-b border-amber-400/15 bg-amber-400/5 px-4 py-2 text-xs text-amber-100/80">
          ComfyUI offline — start ComfyUI on :8188 to generate images locally.
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex w-full max-w-md flex-shrink-0 flex-col border-r border-white/[0.06] p-4">
          <div
            className="flex flex-1 flex-col gap-3 overflow-y-auto scrollbar-thin"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onReferenceDrop}
          >
            {reference && (
              <div className="relative overflow-hidden rounded-lg border border-white/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reference}
                  alt="Reference"
                  className="max-h-32 w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/80"
                  onClick={() => setReference(null)}
                >
                  Remove
                </button>
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div>
                <FieldLabel>Positive prompt</FieldLabel>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="What to include in the image…"
                  className="mt-1.5 w-full resize-none rounded-lg border border-white/[0.06] bg-ink-900 px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-helix/30 focus:outline-none"
                />
              </div>
              <div>
                <FieldLabel>Negative prompt</FieldLabel>
                <textarea
                  value={negative}
                  onChange={(e) => setNegative(e.target.value)}
                  rows={4}
                  placeholder="What to avoid — blur, text, watermark…"
                  className="mt-1.5 w-full resize-none rounded-lg border border-white/[0.06] bg-ink-900 px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/[0.12] focus:outline-none"
                />
              </div>
            </div>

            <FieldLabel>Style preset</FieldLabel>
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="">None</option>
              {IMAGE_STYLE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>

            <FieldLabel>Model</FieldLabel>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="flux-schnell">FLUX Schnell</option>
              <option value="flux-dev">FLUX Dev</option>
              <option value="sdxl-lightning">SDXL Lightning</option>
            </Select>

            <FieldLabel>Aspect ratio</FieldLabel>
            <Select value={aspect} onChange={(e) => setAspect(e.target.value)}>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </Select>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FieldLabel>Seed</FieldLabel>
                <Input
                  type="number"
                  value={seed}
                  onChange={(e) =>
                    setSeed(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Random"
                />
              </div>
              <button
                type="button"
                onClick={rollSeed}
                className="mb-0.5 grid h-9 w-9 place-items-center rounded-lg border border-white/[0.06] text-white/50 hover:text-white/80"
                aria-label="Random seed"
              >
                <Dices className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <button
              type="button"
              className="text-left text-xs text-white/40 hover:text-white/65"
              onClick={() => setAdvanced((v) => !v)}
            >
              {advanced ? "▼" : "▶"} Advanced
            </button>
            {advanced && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Steps</FieldLabel>
                  <Input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                  />
                </div>
                <div>
                  <FieldLabel>CFG</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    value={cfg}
                    onChange={(e) => setCfg(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setReference(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <Button type="button" onClick={() => fileRef.current?.click()}>
              Reference
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => void generate()}
              disabled={!prompt.trim()}
            >
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
              Generate
            </Button>
          </div>

          {queue.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30">
                Queue
              </p>
              {queue.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
                >
                  <p className="truncate text-xs text-white/60">{job.prompt}</p>
                  {job.status === "running" && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full bg-helix transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                  {job.status === "error" && (
                    <p className="mt-1 text-[11px] text-red-300/80">{job.error}</p>
                  )}
                  {job.status === "done" && job.image && (
                    <button
                      type="button"
                      className="mt-2 block w-full overflow-hidden rounded-md border border-white/[0.06]"
                      onClick={() => setLightbox(job.image!)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={job.image.url}
                        alt={job.prompt}
                        className="max-h-24 w-full object-cover"
                        loading="eager"
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="mb-3 flex items-center gap-2 text-sm text-white/50">
            <ImageIcon className="h-4 w-4" strokeWidth={1.75} />
            Library
          </div>

          {livePreview && (
            <div
              ref={previewRef}
              className="mb-4 overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900"
            >
              {livePreview.status === "generating" && (
                <div className="flex aspect-square max-h-[min(70vh,520px)] w-full flex-col items-center justify-center gap-3 bg-white/[0.02] p-6">
                  <Loader2
                    className="h-8 w-8 animate-spin text-helix"
                    strokeWidth={1.75}
                  />
                  <p className="text-sm text-white/55">Generating…</p>
                  <p className="line-clamp-2 max-w-md text-center text-xs text-white/35">
                    {livePreview.prompt}
                  </p>
                  <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full bg-helix transition-all duration-300"
                      style={{ width: `${livePreview.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {livePreview.status === "done" && livePreview.image && (
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setLightbox(livePreview.image!)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={livePreview.image.url}
                    alt={livePreview.image.prompt}
                    className="max-h-[min(70vh,520px)] w-full object-contain"
                    loading="eager"
                    decoding="sync"
                  />
                  <div className="border-t border-white/[0.06] px-3 py-2">
                    <p className="line-clamp-2 text-xs text-white/70">
                      {livePreview.image.prompt}
                    </p>
                  </div>
                </button>
              )}
              {livePreview.status === "error" && (
                <div className="px-4 py-6 text-sm text-red-300/85">
                  {livePreview.error}
                </div>
              )}
            </div>
          )}

          {library.length === 0 && !livePreview ? (
            <p className="text-sm text-white/30">
              Generated images appear here. Drag a reference image onto the prompt
              panel for img2img workflows (ComfyUI).
            </p>
          ) : library.length > 0 ? (
            <ImageLibrary
              images={
                livePreview?.status === "done" && livePreview.image
                  ? library.filter((i) => i.id !== livePreview.image!.id)
                  : library
              }
              eagerIds={eagerIds}
              onSelect={setLightbox}
              onRemix={(img) => {
                setPrompt(img.prompt);
                setNegative(img.negativePrompt ?? "");
                try {
                  const params = JSON.parse(img.paramsJson ?? "{}") as {
                    model?: string;
                  };
                  if (params.model) setModel(params.model);
                } catch {
                  /* ignore */
                }
              }}
            />
          ) : null}
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          image={lightbox}
          onClose={() => setLightbox(null)}
          onRemix={() => {
            setPrompt(lightbox.prompt);
            setNegative(lightbox.negativePrompt ?? "");
            setLightbox(null);
          }}
        />
      )}
    </div>
  );
}
