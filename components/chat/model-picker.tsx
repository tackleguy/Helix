"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCloudMode } from "@/lib/chat/cloud-mode-context";

interface BackendModels {
  backend: string;
  online: boolean;
  models: Array<{ id: string }>;
  error?: string;
}

interface ModelPickerProps {
  value: string | null;
  onChange: (modelId: string) => void;
  className?: string;
}

export function ModelPicker({ value, onChange, className }: ModelPickerProps) {
  const { onCloud, cloudChat, defaultModel } = useCloudMode();
  const [open, setOpen] = useState(false);
  const [backends, setBackends] = useState<BackendModels[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/models", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { backends: BackendModels[] };
        setBackends(data.backends ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const onlineModels = backends.flatMap((b) =>
    b.online ? b.models.map((m) => ({ ...m, backend: b.backend })) : [],
  );

  const fallbackModel =
    onCloud && cloudChat && defaultModel ? defaultModel : null;
  const effectiveModels =
    onlineModels.length > 0
      ? onlineModels
      : fallbackModel
        ? [{ id: fallbackModel, backend: "huggingface" }]
        : [];

  useEffect(() => {
    const pick = effectiveModels[0]?.id;
    if (!value && pick) {
      onChange(pick);
    }
  }, [value, effectiveModels, onChange]);

  const label =
    value ??
    (effectiveModels[0]?.id
      ? effectiveModels[0].id
      : loading
        ? "Loading…"
        : "No model");

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={effectiveModels.length === 0}
        className={cn(
          "flex max-w-[180px] items-center gap-1 rounded-full border border-white/[0.06] px-2 py-0.5 font-mono text-[11px] transition",
          effectiveModels.length > 0
            ? "text-white/55 hover:border-white/[0.12] hover:text-white/80"
            : "cursor-not-allowed text-white/25",
        )}
        title={
          effectiveModels.length === 0
            ? onCloud
              ? "Add HF_API_KEY in Vercel env settings and redeploy"
              : "No models available — start Ollama, LM Studio, or llama-server"
            : "Select model"
        }
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-60" />
      </button>

      {open && effectiveModels.length > 0 && (
        <>
          <button
            type="button"
            aria-label="Close model picker"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-lg border border-white/[0.08] bg-ink-900 py-1 shadow-xl scrollbar-thin">
            {backends.map((b) => (
              <div key={b.backend}>
                <p className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/25">
                  {b.backend}
                  {!b.online && " · offline"}
                </p>
                {b.online ? (
                  b.models.length > 0 ? (
                    b.models.map((m) => (
                      <button
                        key={`${b.backend}-${m.id}`}
                        type="button"
                        onClick={() => {
                          onChange(m.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "block w-full truncate px-2.5 py-1.5 text-left font-mono text-[11px] transition hover:bg-white/[0.04]",
                          value === m.id
                            ? "text-helix"
                            : "text-white/60 hover:text-white/85",
                        )}
                      >
                        {m.id}
                      </button>
                    ))
                  ) : (
                    <p className="px-2.5 py-1 text-[11px] text-white/30">
                      No models listed
                    </p>
                  )
                ) : (
                  <p className="px-2.5 py-1 text-[11px] text-white/30">
                    {b.error ?? "Offline"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
