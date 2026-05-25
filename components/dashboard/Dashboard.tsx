"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare,
  ImageIcon,
  Sparkles,
  ArrowRight,
  Cpu,
  Cloud,
  CircleDot,
  Brain,
  Library,
  Activity,
  Hexagon,
} from "lucide-react";
import { useChat } from "@/lib/chat-store";
import { loadHistory, type GenerationRecord } from "@/lib/image-history";
import type { ModelInfo } from "@/lib/models";
import { DockNav } from "@/components/nav/DockNav";
import { cn, formatTime } from "@/lib/utils";

interface ModelsApi {
  models: ModelInfo[];
  localServer: { reachable: boolean; loadedAlias: string | null };
}

interface LibreStatus {
  configured: boolean;
  reachable: boolean;
  baseUrl: string | null;
}

export function Dashboard() {
  const { state, newChat } = useChat();
  const [models, setModels] = useState<ModelsApi | null>(null);
  const [librechat, setLibrechat] = useState<LibreStatus | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    const tick = () => {
      fetch("/api/models", { cache: "no-store" })
        .then((r) => r.ok && r.json())
        .then((d) => d && setModels(d as ModelsApi))
        .catch(() => undefined);
      fetch("/api/librechat/status", { cache: "no-store" })
        .then((r) => r.ok && r.json())
        .then((d) => d && setLibrechat(d as LibreStatus))
        .catch(() => undefined);
    };
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  const recentChats = useMemo(
    () =>
      [...state.conversations]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5),
    [state.conversations],
  );

  const totalMessages = state.conversations.reduce(
    (s, c) => s + c.messages.length,
    0,
  );

  const liveLocalModels =
    models?.models.filter((m) => m.location === "local" && m.available)
      .length ?? 0;
  const liveCloudModels =
    models?.models.filter((m) => m.location === "cloud" && m.available)
      .length ?? 0;

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-aurora"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.25]"
      />

      <DockNav active="dashboard" />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-6xl px-8 pb-16 pt-10">
          <Hero
            user="Local"
            modelLabel={
              models?.models.find((m) => m.id === state.selectedModelId)
                ?.label ?? "—"
            }
          />

          <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={MessageSquare}
              label="Conversations"
              value={state.conversations.length}
              hint={`${totalMessages} messages`}
            />
            <StatCard
              icon={ImageIcon}
              label="Generations"
              value={history.length}
              hint={history[0]?.prompt.slice(0, 28)}
            />
            <StatCard
              icon={Cpu}
              label="Local models live"
              value={liveLocalModels}
              hint={models?.localServer.loadedAlias ?? "server offline"}
              accent={liveLocalModels > 0}
            />
            <StatCard
              icon={Cloud}
              label="Cloud models live"
              value={liveCloudModels}
              hint={`${(models?.models.filter((m) => m.location === "cloud").length ?? 0)} configured`}
            />
          </section>

          <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <QuickActionCard
              href="/chat"
              onClick={() => newChat()}
              icon={MessageSquare}
              title="New conversation"
              description="Stream from local llama, Pollinations, Groq, or any OpenAI-compat backend."
            />
            <QuickActionCard
              href="/images"
              icon={ImageIcon}
              title="Generate an image"
              description="Studio with prompt, negative, aspect. Placeholder model until ComfyUI is wired."
            />
            <QuickActionCard
              href="/prompts"
              icon={Library}
              title="Prompt library"
              description="Saved system prompts. Pick one per conversation, switch on the fly."
            />
          </section>

          <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Panel
                title="Recent conversations"
                action={
                  <Link
                    href="/chat"
                    className="flex items-center gap-1 text-[11px] text-fg-subtle transition hover:text-fg"
                  >
                    Open chat
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              >
                {recentChats.length === 0 ? (
                  <Empty>No chats yet. Start one in the workspace.</Empty>
                ) : (
                  <ul className="divide-y divide-line-subtle">
                    {recentChats.map((c) => (
                      <li key={c.id}>
                        <Link
                          href="/chat"
                          className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-bg-elevated/50"
                        >
                          <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md bg-bg-elevated">
                            <MessageSquare className="h-3.5 w-3.5 text-fg-subtle" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm text-fg">
                              {c.title || "Untitled"}
                            </span>
                            <span className="text-[11px] text-fg-subtle">
                              {c.messages.length} messages · {formatTime(c.updatedAt)}
                            </span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <div className="mt-6">
                <Panel
                  title="Recent generations"
                  action={
                    <Link
                      href="/images"
                      className="flex items-center gap-1 text-[11px] text-fg-subtle transition hover:text-fg"
                    >
                      Open studio
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  }
                >
                  {history.length === 0 ? (
                    <Empty>No generations yet.</Empty>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4">
                      {history.slice(0, 8).map((g) => (
                        <Link
                          key={g.id}
                          href="/images"
                          className="group relative aspect-square overflow-hidden rounded-lg border border-line-subtle"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={g.url}
                            alt={g.prompt}
                            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                            {g.prompt}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <Panel title="System pulse">
                <div className="space-y-2 p-3 text-sm">
                  <PulseRow
                    icon={Cpu}
                    label="Local llama-server"
                    ok={Boolean(models?.localServer.reachable)}
                    detail={
                      models?.localServer.reachable
                        ? `serving ${models.localServer.loadedAlias ?? "—"}`
                        : "offline"
                    }
                  />
                  <PulseRow
                    icon={Brain}
                    label="Active model"
                    ok={Boolean(state.selectedModelId)}
                    detail={state.selectedModelId}
                  />
                  <PulseRow
                    icon={Cloud}
                    label="LibreChat backend"
                    ok={Boolean(librechat?.reachable)}
                    detail={
                      librechat?.configured
                        ? librechat.reachable
                          ? "online"
                          : "unreachable"
                        : "unconfigured"
                    }
                  />
                  <PulseRow
                    icon={Activity}
                    label="Image backend"
                    ok={true}
                    detail="FastAPI · placeholder"
                  />
                </div>
              </Panel>

              <Panel title="Models">
                <ul className="divide-y divide-line-subtle">
                  {(models?.models ?? []).slice(0, 6).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <CircleDot
                        className={cn(
                          "h-3 w-3 flex-shrink-0",
                          m.available
                            ? "text-positive"
                            : "text-fg-subtle/40",
                        )}
                      />
                      <span
                        className={cn(
                          "flex-1 truncate",
                          m.available ? "text-fg" : "text-fg-muted",
                        )}
                      >
                        {m.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {m.location}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Hero({
  user,
  modelLabel,
}: {
  user: string;
  modelLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-1.5"
      >
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-fg-subtle">
          <Hexagon className="h-3 w-3 text-accent" />
          Helix AI Operating System
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back, {user}
        </h1>
        <p className="text-sm text-fg-muted">
          Connected via{" "}
          <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-fg">
            {modelLabel}
          </span>
          . Everything below runs from your laptop.
        </p>
      </motion.div>
      <Link
        href="/chat"
        className="hidden items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-accent/90 sm:flex"
      >
        <Sparkles className="h-4 w-4" /> Start chatting
      </Link>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-fg-subtle">
        <Icon className={cn("h-3.5 w-3.5", accent ? "text-accent" : "")} />
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && (
        <div className="mt-1 truncate text-[11px] text-fg-subtle">{hint}</div>
      )}
    </motion.div>
  );
}

function QuickActionCard({
  href,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  onClick?: () => void;
  icon: typeof MessageSquare;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-line-subtle bg-bg-panel/60 p-5 transition hover:border-line hover:bg-bg-elevated/60"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/0 to-accent/0 transition group-hover:from-accent/10 group-hover:to-transparent"
      />
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-bg-elevated text-accent transition group-hover:bg-accent/15">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-fg">{title}</h3>
            <ArrowRight className="h-3.5 w-3.5 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line-subtle bg-bg-panel/60 shadow-card backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-line-subtle px-3 py-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          {title}
        </h3>
        {action}
      </header>
      {children}
    </div>
  );
}

function PulseRow({
  icon: Icon,
  label,
  ok,
  detail,
}: {
  icon: typeof Cpu;
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-fg-subtle" />
      <span className="flex-1 text-sm text-fg">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
          ok ? "bg-positive/15 text-positive" : "bg-bg-elevated text-fg-subtle",
        )}
      >
        {detail}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 text-center text-sm text-fg-subtle">{children}</div>
  );
}
