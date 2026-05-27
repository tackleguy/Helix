"use client";

import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";
import type { ServiceHealth } from "@/lib/services/types";

const SERVICE_DOTS: Array<{ id: ServiceHealth["id"]; title: string }> = [
  { id: "llama-server", title: "llama-server" },
  { id: "lmstudio", title: "LM Studio" },
  { id: "ollama", title: "Ollama" },
  { id: "comfyui", title: "ComfyUI" },
  { id: "whisper", title: "Whisper" },
  { id: "coqui", title: "Coqui TTS" },
  { id: "chroma", title: "ChromaDB" },
];

export function TopBar({ title }: { title?: string }) {
  const { sidebarOpen, toggleSidebar } = useWorkspace();
  const [services, setServices] = useState<ServiceHealth[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/services/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d?.services) {
            setServices(d.services as ServiceHealth[]);
          }
        })
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const byId = new Map(services.map((s) => [s.id, s]));

  return (
    <header className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-white/[0.06] px-3">
      {!sidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="grid h-7 w-7 place-items-center rounded-md text-white/40 transition hover:bg-white/[0.04] hover:text-white/70"
          aria-label="Open sidebar"
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
      )}

      {title && (
        <h1 className="truncate text-sm font-medium text-white/80">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div
          className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-ink-900/60 px-2 py-1"
          title="Local service status"
        >
          {SERVICE_DOTS.map(({ id, title: dotTitle }) => {
            const s = byId.get(id);
            const online = s?.online ?? false;
            return (
              <span
                key={id}
                title={`${dotTitle}: ${online ? "online" : "offline"}${s?.detail ? ` (${s.detail})` : ""}`}
                className={cn(
                  "h-2 w-2 rounded-full transition duration-200",
                  online
                    ? "bg-helix shadow-[0_0_6px_rgba(94,234,212,0.5)]"
                    : "bg-white/15",
                )}
              />
            );
          })}
        </div>
        <kbd className="hidden rounded border border-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/25 sm:inline">
          ⌘K
        </kbd>
      </div>
    </header>
  );
}
