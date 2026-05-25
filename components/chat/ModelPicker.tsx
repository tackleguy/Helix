"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Sparkles,
  Cpu,
  Cloud,
  Check,
  AlertCircle,
  Loader2,
  Brain,
} from "lucide-react";
import type { ModelInfo } from "@/lib/models";
import { useChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

interface ModelsResponse {
  models: ModelInfo[];
  defaultId: string;
  localServer: { reachable: boolean; loadedAlias: string | null };
}

export function ModelPicker() {
  const { state, setModel } = useChat();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const res = await fetch("/api/models", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as ModelsResponse);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected =
    data?.models.find((m) => m.id === state.selectedModelId) ??
    data?.models.find((m) => m.id === data.defaultId);

  const local = data?.models.filter((m) => m.location === "local") ?? [];
  const cloud = data?.models.filter((m) => m.location === "cloud") ?? [];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-line-subtle bg-bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted transition hover:border-line hover:text-fg"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin text-fg-subtle" />
        ) : (
          <Sparkles className="h-3 w-3 text-accent" />
        )}
        <span className="text-fg">{selected?.label ?? "Loading…"}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-fg-subtle transition",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && data && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="glass absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl p-1 shadow-panel"
          >
            <Section
              icon={Cpu}
              title="Local"
              hint={
                data.localServer.reachable
                  ? `llama-server: ${data.localServer.loadedAlias ?? "—"}`
                  : "llama-server not running"
              }
              warn={!data.localServer.reachable}
            />
            {local.map((m) => (
              <ModelRow
                key={m.id}
                model={m}
                selected={m.id === state.selectedModelId}
                onPick={() => {
                  setModel(m.id);
                  setOpen(false);
                }}
              />
            ))}

            <div className="my-1 border-t border-line-subtle" />

            <Section icon={Cloud} title="Cloud" />
            {cloud.map((m) => (
              <ModelRow
                key={m.id}
                model={m}
                selected={m.id === state.selectedModelId}
                onPick={() => {
                  setModel(m.id);
                  setOpen(false);
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  warn,
}: {
  icon: typeof Cpu;
  title: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
      <Icon className="h-3 w-3" />
      <span>{title}</span>
      {hint && (
        <span
          className={cn(
            "ml-auto font-mono text-[10px] normal-case tracking-normal",
            warn ? "text-amber-400/80" : "text-fg-subtle",
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

function ModelRow({
  model,
  selected,
  onPick,
}: {
  model: ModelInfo;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className={cn(
        "group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition",
        "hover:bg-bg-elevated",
        selected && "bg-bg-elevated",
      )}
    >
      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
        {selected ? (
          <Check className="h-3.5 w-3.5 text-accent" />
        ) : !model.available ? (
          <AlertCircle className="h-3.5 w-3.5 text-amber-400/70" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm font-medium",
              model.available ? "text-fg" : "text-fg-muted",
            )}
          >
            {model.label}
          </span>
          {model.reasoning && (
            <Brain className="h-3 w-3 flex-shrink-0 text-accent/80" />
          )}
        </div>
        <span className="truncate text-[11px] text-fg-subtle">
          {model.description}
        </span>
      </div>
    </button>
  );
}
