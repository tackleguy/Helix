"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { Composer } from "@/components/composer";
import { cn } from "@/lib/utils";

type AspectRatio = "1:1" | "16:9" | "9:16";

const RATIOS: { label: string; value: AspectRatio }[] = [
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
];

function ratioToSize(ratio: AspectRatio) {
  switch (ratio) {
    case "16:9":
      return { width: 1152, height: 648 };
    case "9:16":
      return { width: 648, height: 1152 };
    default:
      return { width: 1024, height: 1024 };
  }
}

export function ImageView() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<AspectRatio>("1:1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const generate = async () => {
    const p = prompt.trim();
    if (!p || loading) return;
    setLoading(true);
    setError(null);
    const { width, height } = ratioToSize(ratio);
    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          aspect_ratio: ratio,
          width,
          height,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { url: string };
      setImageUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6 scrollbar-thin">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 text-white/40"
          >
            <Loader2 className="h-6 w-6 animate-spin text-helix" />
            <span className="text-sm">Generating…</span>
          </motion.div>
        ) : imageUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-h-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={prompt}
              className="h-auto max-h-[60vh] w-full object-contain"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center"
          >
            <h2 className="wordmark text-3xl text-white/80">Images</h2>
            <p className="mt-2 text-sm text-white/35">
              Describe what you want to generate.
            </p>
          </motion.div>
        )}
      </div>

      <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
        <div className="mx-auto w-full max-w-2xl space-y-2.5">
          <div className="flex items-center gap-1.5">
            {RATIOS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRatio(r.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs transition duration-200",
                  ratio === r.value
                    ? "bg-helix/15 text-helix shadow-helix-glow ring-1 ring-helix/30"
                    : "border border-white/[0.06] text-white/40 hover:border-white/[0.12] hover:text-white/65",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300/90">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <Composer
            value={prompt}
            onChange={setPrompt}
            onSubmit={generate}
            disabled={loading}
            placeholder="Describe an image…"
          />
        </div>
      </div>
    </div>
  );
}
