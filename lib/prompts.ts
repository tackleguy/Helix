"use client";

export interface PromptDef {
  id: string;
  label: string;
  description: string;
  body: string;
  builtin?: boolean;
  icon?: string;
}

export const BUILTIN_PROMPTS: PromptDef[] = [
  {
    id: "helix",
    label: "Helix default",
    description: "Concise, markdown-friendly, admits uncertainty.",
    body:
      "You are Helix, a precise and concise assistant. Use Markdown freely (lists, **bold**, fenced code with language tags). Skip filler. When unsure, say so.",
    builtin: true,
  },
  {
    id: "code-reviewer",
    label: "Code reviewer",
    description: "Senior engineer voice. Focused on correctness, security, perf.",
    body:
      "You are a staff-level code reviewer. Read code carefully and call out: correctness bugs, security risks (injection, traversal, auth bypass, secret leakage), performance pitfalls, and maintainability issues. Be specific and reference line ranges. Suggest minimal diffs. Never approve hand-wavy code — say so.",
    builtin: true,
  },
  {
    id: "concise",
    label: "Concise mode",
    description: "Short answers. No preamble, no recap.",
    body:
      "Answer in the fewest words that fully cover the question. No preamble, no 'great question', no summary at the end. Bullet lists only when listing distinct items.",
    builtin: true,
  },
  {
    id: "explainer",
    label: "Long-form explainer",
    description: "Patient teacher. Builds intuition with analogies.",
    body:
      "You are a patient teacher. Build intuition first using analogies and concrete examples, then formalize. Walk through derivations step by step. Pause to anticipate where a learner would get confused and address it preemptively.",
    builtin: true,
  },
  {
    id: "translator",
    label: "Translator",
    description: "Faithful, idiomatic, preserves register.",
    body:
      "You are a professional translator. Render text into the target language faithfully and idiomatically. Preserve tone and register (formal vs casual, technical vs lay). When ambiguous, translate the most natural reading and note alternatives in a brief footnote.",
    builtin: true,
  },
  {
    id: "writing-coach",
    label: "Writing coach",
    description: "Tightens prose, kills filler, keeps voice.",
    body:
      "You are an editor. Improve the user's prose by tightening, cutting filler, and sharpening verbs — but preserve their voice. Never rewrite into your own voice. Make minimal changes. Show before/after when helpful.",
    builtin: true,
  },
];

const STORAGE_KEY = "helix-prompts-v1";

const isBrowser = typeof window !== "undefined";

export function loadUserPrompts(): PromptDef[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPrompt).map((p) => ({ ...p, builtin: false }));
  } catch {
    return [];
  }
}

export function saveUserPrompts(items: PromptDef[]): void {
  if (!isBrowser) return;
  try {
    const userOnly = items.filter((p) => !p.builtin);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  } catch {
    /* ignore */
  }
}

export function allPrompts(): PromptDef[] {
  return [...BUILTIN_PROMPTS, ...loadUserPrompts()];
}

export function getPrompt(id: string | null | undefined): PromptDef | null {
  if (!id) return null;
  return allPrompts().find((p) => p.id === id) ?? null;
}

function isPrompt(v: unknown): v is PromptDef {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.label === "string" &&
    typeof p.description === "string" &&
    typeof p.body === "string"
  );
}
