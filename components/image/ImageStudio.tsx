"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Download,
  AlertCircle,
  Trash2,
  X,
  Copy,
  RotateCcw,
  Check,
} from "lucide-react";
import { DockNav } from "@/components/nav/DockNav";
import {
  clearHistory,
  loadHistory,
  saveHistory,
  type GenerationRecord,
} from "@/lib/image-history";
import { cn } from "@/lib/utils";

const SIZES = [
  { label: "Square", w: 1024, h: 1024 },
  { label: "Portrait", w: 768, h: 1152 },
  { label: "Landscape", w: 1152, h: 768 },
];

export function ImageStudio() {
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
        <Suspense fallback={null}>
          <Studio />
        </Suspense>
      </main>
    </div>
  );
}

function Studio() {
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [size, setSize] = useState(SIZES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [lightbox, setLightbox] = useState<GenerationRecord | null>(null);
  const hydratedRef = useRef(false);

  // hydrate from localStorage + prefill prompt from query string
  useEffect(() => {
    setHistory(loadHistory());
    hydratedRef.current = true;
    const q = searchParams.get("prompt");
    if (q) setPrompt(q);
  }, [searchParams]);

  // persist history when it changes (post-hydration)
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveHistory(history);
  }, [history]);

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
      const data = (await res.json()) as Omit<GenerationRecord, "createdAt">;
      const record: GenerationRecord = { ...data, createdAt: Date.now() };
      setHistory((h) => [record, ...h].slice(0, 48));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const onClearHistory = () => {
    if (history.length === 0) return;
    if (confirm("Clear all generated images from history?")) {
      setHistory([]);
      clearHistory();
    }
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr] gap-0">
      <aside className="flex flex-col gap-4 overflow-y-auto border-r border-line-subtle bg-bg-subtle/40 p-4 scrollbar-thin">
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

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="mt-auto flex items-center justify-center gap-1.5 rounded-md border border-line-subtle px-2.5 py-1.5 text-xs text-fg-subtle transition hover:border-red-400/40 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
            Clear history ({history.length})
          </button>
        )}
      </aside>

      <section className="overflow-y-auto p-6 scrollbar-thin">
        {history.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-fg-subtle">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent/40 shadow-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="text-sm">
              Generations land here. Type a prompt and hit Generate.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {history.map((g) => (
              <GalleryCard
                key={g.id}
                gen={g}
                onOpen={() => setLightbox(g)}
                onReuse={() => {
                  setPrompt(g.prompt);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <Lightbox gen={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function GalleryCard({
  gen,
  onOpen,
  onReuse,
}: {
  gen: GenerationRecord;
  onOpen: () => void;
  onReuse: () => void;
}) {
  return (
    <motion.figure
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-2xl border border-line-subtle bg-bg-panel shadow-card"
    >
      <button
        onClick={onOpen}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-bg-elevated"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gen.url}
          alt={gen.prompt}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-90" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
        <p className="line-clamp-2 text-[13px] leading-snug text-white drop-shadow">
          {gen.prompt}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/60">
          {gen.width}×{gen.height} · {gen.backend} · {gen.duration_ms}ms
        </p>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <IconBtn label="Reuse prompt" onClick={onReuse}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconBtn>
        <a
          href={gen.url}
          download={`helix-${gen.id}.png`}
          aria-label="Download"
          className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.figure>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
    >
      {children}
    </button>
  );
}

function Lightbox({
  gen,
  onClose,
}: {
  gen: GenerationRecord;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(gen.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.16 }}
        className="relative flex max-h-[90vh] max-w-[92vw] flex-col overflow-hidden rounded-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gen.url}
          alt={gen.prompt}
          className="max-h-[80vh] max-w-[92vw] object-contain"
        />

        <div className="glass px-5 py-3">
          <div className="flex items-start gap-3">
            <p className="flex-1 text-sm leading-relaxed text-fg">{gen.prompt}</p>
            <button
              onClick={copyPrompt}
              className="flex items-center gap-1 rounded-md border border-line-subtle px-2 py-1 text-[11px] text-fg-muted transition hover:border-line hover:text-fg"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy prompt
                </>
              )}
            </button>
            <a
              href={gen.url}
              download={`helix-${gen.id}.png`}
              className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white shadow-glow transition hover:bg-accent/90"
            >
              <Download className="h-3 w-3" /> Download
            </a>
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {gen.width}×{gen.height} · {gen.backend} · {gen.duration_ms}ms
          </p>
        </div>
      </motion.div>
    </div>
  );
}
