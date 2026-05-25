"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Check,
  Pencil,
  Trash2,
  X,
  Save,
  Library,
} from "lucide-react";
import { useChat } from "@/lib/chat-store";
import {
  BUILTIN_PROMPTS,
  loadUserPrompts,
  saveUserPrompts,
  type PromptDef,
} from "@/lib/prompts";
import { DockNav } from "@/components/nav/DockNav";
import { cn, uid } from "@/lib/utils";

export function PromptsLibrary() {
  const { state, setPrompt } = useChat();
  const [userPrompts, setUserPrompts] = useState<PromptDef[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PromptDef | null>(null);

  useEffect(() => {
    setUserPrompts(loadUserPrompts());
  }, []);

  const persistUsers = (next: PromptDef[]) => {
    setUserPrompts(next);
    saveUserPrompts(next);
  };

  const upsert = (p: PromptDef) => {
    const next = userPrompts.some((u) => u.id === p.id)
      ? userPrompts.map((u) => (u.id === p.id ? p : u))
      : [...userPrompts, p];
    persistUsers(next);
  };

  const remove = (id: string) => {
    persistUsers(userPrompts.filter((u) => u.id !== id));
  };

  const all = useMemo(
    () => [...BUILTIN_PROMPTS, ...userPrompts],
    [userPrompts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q),
    );
  }, [all, query]);

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-bg text-fg">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-aurora" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.25]"
      />

      <DockNav active="prompts" />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        <header className="flex h-12 items-center gap-3 border-b border-line-subtle bg-bg/60 px-4 backdrop-blur-xl">
          <Library className="h-4 w-4 text-fg-subtle" />
          <span className="text-sm font-medium">Prompt library</span>
          <span className="ml-auto text-[11px] text-fg-subtle">
            Active in chat:{" "}
            <span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-fg">
              {state.selectedPromptId}
            </span>
          </span>
        </header>

        <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
              <p className="text-sm text-fg-muted">
                System prompts applied at the top of every conversation.
                Switch any time — affects the next message only.
              </p>
            </div>
            <button
              onClick={() =>
                setEditing({
                  id: uid(),
                  label: "Untitled prompt",
                  description: "",
                  body: "",
                  builtin: false,
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" /> New prompt
            </button>
          </div>

          <div className="mb-5 flex items-center gap-2 rounded-xl border border-line-subtle bg-bg-panel/60 px-3 py-2">
            <Search className="h-4 w-4 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts…"
              className="flex-1 bg-transparent text-sm placeholder:text-fg-subtle focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                active={p.id === state.selectedPromptId}
                onApply={() => setPrompt(p.id)}
                onEdit={() => setEditing(p)}
                onDelete={() => remove(p.id)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-8 rounded-xl border border-line-subtle bg-bg-panel/40 p-8 text-center text-sm text-fg-subtle">
              No prompts match.
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/chat"
              className="text-[12px] text-fg-subtle hover:text-fg"
            >
              ← Back to chat
            </Link>
          </div>
        </div>
      </main>

      {editing && (
        <PromptEditor
          prompt={editing}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            upsert(next);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  active,
  onApply,
  onEdit,
  onDelete,
}: {
  prompt: PromptDef;
  active: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-2xl border bg-bg-panel/60 p-4 transition",
        active
          ? "border-accent shadow-glow-soft"
          : "border-line-subtle hover:border-line",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-fg">{prompt.label}</h3>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-fg-muted">
            {prompt.description || "—"}
          </p>
        </div>
        {prompt.builtin ? (
          <span className="rounded-full bg-bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
            Built-in
          </span>
        ) : (
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
            User
          </span>
        )}
      </div>

      <p className="line-clamp-4 rounded-lg bg-bg-elevated/40 p-2.5 font-mono text-[11px] leading-relaxed text-fg-subtle">
        {prompt.body}
      </p>

      <div className="mt-auto flex items-center gap-1.5">
        <button
          onClick={onApply}
          disabled={active}
          className={cn(
            "flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
            active
              ? "cursor-default bg-accent/15 text-accent"
              : "bg-bg-elevated text-fg-muted hover:bg-accent hover:text-white",
          )}
        >
          {active ? (
            <span className="flex items-center justify-center gap-1">
              <Check className="h-3 w-3" /> Active
            </span>
          ) : (
            "Use this"
          )}
        </button>
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
          aria-label="Edit"
          title={prompt.builtin ? "Duplicate & edit" : "Edit"}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {!prompt.builtin && (
          <button
            onClick={() => {
              if (confirm(`Delete "${prompt.label}"?`)) onDelete();
            }}
            className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-red-400"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function PromptEditor({
  prompt,
  onCancel,
  onSave,
}: {
  prompt: PromptDef;
  onCancel: () => void;
  onSave: (next: PromptDef) => void;
}) {
  const [label, setLabel] = useState(prompt.label);
  const [description, setDescription] = useState(prompt.description);
  const [body, setBody] = useState(prompt.body);

  // Editing a built-in clones it under a new id so the original is preserved.
  const isCloneOfBuiltin = prompt.builtin === true;

  const save = () => {
    if (!label.trim() || !body.trim()) return;
    onSave({
      id: isCloneOfBuiltin ? uid() : prompt.id,
      label: label.trim(),
      description: description.trim(),
      body: body.trim(),
      builtin: false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.14 }}
        className="glass w-full max-w-xl overflow-hidden rounded-2xl shadow-elevated"
      >
        <header className="flex items-center justify-between border-b border-line-subtle px-5 py-3">
          <h2 className="text-sm font-semibold">
            {isCloneOfBuiltin
              ? `Duplicate "${prompt.label}" as a new prompt`
              : prompt.label === "Untitled prompt"
                ? "New prompt"
                : `Edit ${prompt.label}`}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-fg-subtle">
              Name
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-line-subtle bg-bg-panel px-3 py-2 text-sm focus:border-line focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-fg-subtle">
              Description (optional)
            </span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this prompt does"
              className="w-full rounded-lg border border-line-subtle bg-bg-panel px-3 py-2 text-sm focus:border-line focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-fg-subtle">
              System prompt
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="You are…"
              className="w-full resize-none rounded-lg border border-line-subtle bg-bg-panel px-3 py-2 font-mono text-[12px] leading-relaxed focus:border-line focus:outline-none scrollbar-thin"
            />
          </label>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line-subtle px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition hover:bg-bg-elevated hover:text-fg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!label.trim() || !body.trim()}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-glow transition hover:bg-accent/90 disabled:bg-bg-elevated disabled:text-fg-subtle disabled:shadow-none"
          >
            <Save className="h-3.5 w-3.5" /> Save prompt
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
