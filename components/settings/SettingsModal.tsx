"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ModelsApi {
  models: Array<{
    id: string;
    label: string;
    location: "local" | "cloud";
    requiresKey: boolean;
    available: boolean;
  }>;
  localServer: { reachable: boolean; loadedAlias: string | null };
}

export function SettingsModal({ open, onClose }: Props) {
  const { state, clearAll, setModel } = useChat();
  const [info, setInfo] = useState<ModelsApi | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/models", { cache: "no-store" });
      if (r.ok) setInfo((await r.json()) as ModelsApi);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const totalChats = state.conversations.length;
  const totalMessages = state.conversations.reduce(
    (sum, c) => sum + c.messages.length,
    0,
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: 10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="glass w-full max-w-2xl overflow-hidden rounded-2xl shadow-panel"
          >
            <header className="flex items-center justify-between border-b border-line-subtle px-5 py-3">
              <div>
                <h2 className="text-base font-semibold">Settings</h2>
                <p className="text-[11px] text-fg-subtle">
                  Helix · v0.2 · local-first
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 scrollbar-thin">
              <Section title="Current model">
                <div className="flex items-center justify-between rounded-lg border border-line-subtle bg-bg-panel px-3 py-2">
                  <span className="text-sm">
                    {info?.models.find((m) => m.id === state.selectedModelId)
                      ?.label ?? state.selectedModelId}
                  </span>
                  <button
                    onClick={refresh}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
                  >
                    <RefreshCw
                      className={cn("h-3 w-3", loading && "animate-spin")}
                    />
                    Refresh
                  </button>
                </div>
              </Section>

              <Section title="Local server">
                {info ? (
                  <div className="space-y-1 rounded-lg border border-line-subtle bg-bg-panel p-3 text-sm">
                    <Row
                      label="Reachable"
                      value={info.localServer.reachable ? "yes" : "no"}
                      ok={info.localServer.reachable}
                    />
                    <Row
                      label="Loaded alias"
                      value={info.localServer.loadedAlias ?? "—"}
                      ok={Boolean(info.localServer.loadedAlias)}
                    />
                    <p className="pt-2 text-[11px] text-fg-subtle">
                      To swap models, run from your terminal:{" "}
                      <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-[10px]">
                        ./scripts/serve-llama.sh qwen-7b
                      </code>
                    </p>
                  </div>
                ) : (
                  <Empty>Loading…</Empty>
                )}
              </Section>

              <Section title="Available models">
                {info ? (
                  <div className="overflow-hidden rounded-lg border border-line-subtle bg-bg-panel">
                    {info.models.map((m, i) => (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition",
                          i > 0 && "border-t border-line-subtle",
                          m.id === state.selectedModelId
                            ? "bg-bg-elevated"
                            : "hover:bg-bg-elevated/60",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {m.available ? (
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-fg-subtle" />
                          )}
                          <span
                            className={cn(
                              "truncate",
                              m.available ? "text-fg" : "text-fg-muted",
                            )}
                          >
                            {m.label}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                          {m.location}
                          {m.requiresKey && " · key"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty>Loading…</Empty>
                )}
              </Section>

              <Section title="Local data">
                <div className="rounded-lg border border-line-subtle bg-bg-panel p-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Conversations" value={totalChats} />
                    <Stat label="Messages" value={totalMessages} />
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Delete all conversations? This cannot be undone.",
                        )
                      ) {
                        clearAll();
                      }
                    }}
                    className="mt-3 flex items-center gap-1.5 rounded-md border border-line-subtle px-2.5 py-1.5 text-xs text-fg-muted transition hover:border-red-400/40 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear all data
                  </button>
                </div>
              </Section>

              <Section title="Keyboard">
                <div className="rounded-lg border border-line-subtle bg-bg-panel p-3 text-sm">
                  <KbdRow keys="⌘K" label="Command palette" />
                  <KbdRow keys="Enter" label="Send message" />
                  <KbdRow keys="Shift + Enter" label="Newline in input" />
                  <KbdRow keys="Esc" label="Close dialogs" />
                </div>
              </Section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-fg-muted">{label}</span>
      <span
        className={cn(
          "font-mono text-[12px]",
          ok ? "text-emerald-400" : "text-fg-subtle",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className="text-xl font-semibold text-fg">{value}</div>
    </div>
  );
}

function KbdRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-fg-muted">{label}</span>
      <kbd className="rounded border border-line-subtle bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
        {keys}
      </kbd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line-subtle bg-bg-panel p-3 text-sm text-fg-subtle">
      {children}
    </div>
  );
}
