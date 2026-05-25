"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Download, AlertCircle } from "lucide-react";
import { DockNav } from "@/components/nav/DockNav";
import { cn } from "@/lib/utils";

interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  width: number;
  height: number;
  backend: string;
  duration_ms: number;
}

const SIZES = [
  { label: "Square", w: 1024, h: 1024 },
  { label: "Portrait", w: 768, h: 1152 },
  { label: "Landscape", w: 1152, h: 768 },
];

export function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [size, setSize] = useState(SIZES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);

  const submit = async () => {
    const p = prompt.trim();
    if (!p || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          negative_prompt: negative.trim() || null,
          width: size.w,
          height: size.h,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as GenerationResult;
      setHistory((h) => [data, ...h].slice(0, 24));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />

      <DockNav active="images" />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b border-line-subtle bg-bg/60 px-4 backdrop-blur-xl">
          <span className="text-sm font-medium">Image studio</span>
          <span className="ml-auto text-[11px] text-fg-subtle">
            Backend: FastAPI · placeholder model (ComfyUI ready)
          </span>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr] gap-0">
          {/* Controls */}
          <aside className="flex flex-col gap-4 border-r border-line-subtle bg-bg-subtle/40 p-4 overflow-y-auto scrollbar-thin">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="a cinematic photograph of…"
                className="w-full resize-none rounded-lg border border-line-subtle bg-bg-panel px-3 py-2 text-sm placeholder:text-fg-subtle focus:border-line focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                Negative prompt
              </label>
              <textarea
                value={negative}
                onChange={(e) => setNegative(e.target.value)}
                rows={2}
                placeholder="blurry, low quality, watermark"
                className="w-full resize-none rounded-lg border border-line-subtle bg-bg-panel px-3 py-2 text-sm placeholder:text-fg-subtle focus:border-line focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                Aspect
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {SIZES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setSize(s)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs transition",
                      size === s
                        ? "border-accent bg-accent/15 text-fg"
                        : "border-line-subtle bg-bg-panel text-fg-muted hover:border-line hover:text-fg",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-1 text-[10px] text-fg-subtle">
                {size.w} × {size.h}
              </div>
            </div>

            <button
              onClick={submit}
              disabled={!prompt.trim() || loading}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                loading
                  ? "bg-bg-elevated text-fg-muted"
                  : prompt.trim()
                    ? "bg-accent text-white shadow-glow hover:bg-accent/90"
                    : "bg-bg-elevated text-fg-subtle",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate
                </>
              )}
            </button>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2.5 text-[12px] text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}
          </aside>

          {/* Gallery */}
          <section className="overflow-y-auto p-6 scrollbar-thin">
            {history.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-fg-subtle">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent/40 shadow-glow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="text-sm">
                  Generations land here. Type a prompt and hit Generate.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {history.map((g) => (
                  <motion.figure
                    key={g.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="group overflow-hidden rounded-xl border border-line-subtle bg-bg-panel"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-bg-elevated">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.url}
                        alt={g.prompt}
                        className="h-full w-full object-cover"
                      />
                      <a
                        href={g.url}
                        download={`helix-${g.id}.png`}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-black/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <figcaption className="space-y-1 p-3">
                      <p className="line-clamp-2 text-xs text-fg-muted">
                        {g.prompt}
                      </p>
                      <p className="font-mono text-[10px] text-fg-subtle">
                        {g.width}×{g.height} · {g.backend} · {g.duration_ms}ms
                      </p>
                    </figcaption>
                  </motion.figure>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
