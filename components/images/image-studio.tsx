"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dices, ImageIcon, Sparkles } from "lucide-react";
import { TopBar } from "@/components/workspace/topbar";
import { Button, FieldLabel, Input, Select } from "@/components/shared/ui";
import { IMAGE_STYLE_PRESETS } from "@/lib/presets/image-styles";
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

export function ImageStudio() {
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
  const fileRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async () => {
    const res = await fetch("/api/images/library", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { images: ImageDto[] };
      setLibrary(data.images);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
    fetch("/api/cloud-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHfImages(Boolean(d?.cloudImages)))
      .catch(() => setHfImages(false));

    fetch("/api/services/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const comfy = d?.services?.find(
          (s: { id: string }) => s.id === "comfyui",
        );
        setComfyOnline(Boolean(comfy?.online));
      })
      .catch(() => setComfyOnline(false));
  }, [loadLibrary]);

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
    setQueue((q) => [
      { id: jobId, prompt: prompt.trim(), status: "running", progress: 0 },
      ...q,
    ]);

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

      setQueue((q) =>
        q.map((j) =>
          j.id === jobId
            ? { ...j, status: "done", progress: 100, image }
            : j,
        ),
      );
      setLibrary((lib) => [image!, ...lib]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed";
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

      {comfyOnline === false && hfImages && (
        <div className="border-b border-helix/15 bg-helix/5 px-4 py-2 text-xs text-white/70">
          ComfyUI offline — generating with{" "}
          <span className="font-mono text-helix">FLUX</span> via Hugging Face
          Inference Providers (<span className="font-mono">HF_API_KEY</span>).
        </div>
      )}
      {comfyOnline === false && hfImages === false && (
        <div className="border-b border-amber-400/15 bg-amber-400/5 px-4 py-2 text-xs text-amber-100/80">
          No image backend available. Start ComfyUI on :8188 or set{" "}
          <span className="font-mono">HF_API_KEY</span> for FLUX generation.
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

            <FieldLabel>Prompt</FieldLabel>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="Describe your image…"
              className="w-full resize-none rounded-lg border border-white/[0.06] bg-ink-900 px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/[0.12] focus:outline-none"
            />

            <FieldLabel>Negative prompt</FieldLabel>
            <Input
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
              placeholder="Optional"
            />

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
                      className="mt-1 text-[11px] text-helix hover:underline"
                      onClick={() => setLightbox(job.image!)}
                    >
                      View result
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
          {library.length === 0 ? (
            <p className="text-sm text-white/30">
              Generated images appear here. Drag a reference image onto the prompt
              panel for img2img workflows (ComfyUI).
            </p>
          ) : (
            <ImageLibrary
              images={library}
              onSelect={setLightbox}
              onRemix={(img) => {
                setPrompt(img.prompt);
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
          )}
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          image={lightbox}
          onClose={() => setLightbox(null)}
          onRemix={() => {
            setPrompt(lightbox.prompt);
            setLightbox(null);
          }}
        />
      )}
    </div>
  );
}
