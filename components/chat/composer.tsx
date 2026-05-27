"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Square, Paperclip, Slash } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  matchSlash,
  parseSlashArg,
  SLASH_COMMANDS,
} from "@/lib/chat/slash-commands";
import type { AttachmentInput } from "@/lib/chat/types";

export interface ComposerAttachment extends AttachmentInput {
  id: string;
}

interface ComposerProps {
  disabled?: boolean;
  streaming?: boolean;
  onSend: (payload: {
    message: string;
    attachments: ComposerAttachment[];
  }) => void;
  onStop?: () => void;
  draft?: string;
  onDraftChange?: (v: string) => void;
}

const MAX_H = 160;

export function Composer({
  disabled,
  streaming,
  onSend,
  onStop,
  draft,
  onDraftChange,
}: ComposerProps) {
  const router = useRouter();
  const [internal, setInternal] = useState("");
  const value = draft ?? internal;
  const setValue = onDraftChange ?? setInternal;
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [slashIdx, setSlashIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slashMatches = matchSlash(value);
  const slashOpen = slashMatches.length > 0 && value.startsWith("/");

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_H)}px`;
  }, [value]);

  useEffect(() => {
    if (slashIdx >= slashMatches.length) setSlashIdx(0);
  }, [slashMatches.length, slashIdx]);

  const submit = () => {
    if (streaming || disabled) return;
    const v = value.trim();
    if (!v && attachments.length === 0) return;

    if (v.startsWith("/")) {
      const cmd = SLASH_COMMANDS.find((c) => v === `/${c.name}` || v.startsWith(`/${c.name} `));
      if (cmd) {
        const arg = parseSlashArg(v);
        const href = arg
          ? `${cmd.href}?prompt=${encodeURIComponent(arg)}`
          : cmd.href;
        router.push(href);
        setValue("");
        return;
      }
    }

    onSend({ message: v, attachments });
    setValue("");
    setAttachments([]);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIdx((i) => Math.min(i + 1, slashMatches.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey && !value.includes(" "))) {
        e.preventDefault();
        setValue(`/${slashMatches[slashIdx].name} `);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setValue("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: ComposerAttachment[] = [];
    for (const file of Array.from(files)) {
      let type: AttachmentInput["type"] = "text";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type === "application/pdf") type = "pdf";
      else if (!file.name.match(/\.(txt|md)$/i)) continue;

      const data = await fileToBase64(file);
      next.push({
        id: `${file.name}-${Date.now()}`,
        type,
        name: file.name,
        data,
        mime: file.type || undefined,
      });
    }
    setAttachments((a) => [...a, ...next]);
  };

  const canSend =
    (value.trim().length > 0 || attachments.length > 0) && !streaming && !disabled;

  return (
    <div className="space-y-2">
      {slashOpen && (
        <div className="glass overflow-hidden rounded-xl border border-white/[0.06] p-1">
          {slashMatches.map((cmd, i) => (
            <button
              key={cmd.name}
              type="button"
              onMouseEnter={() => setSlashIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                setValue(`/${cmd.name} `);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm",
                i === slashIdx
                  ? "bg-white/[0.06] text-white"
                  : "text-white/55 hover:bg-white/[0.03]",
              )}
            >
              <Slash className="h-3.5 w-3.5 text-helix" strokeWidth={1.75} />
              <span className="font-mono text-[13px]">/{cmd.name}</span>
              <span className="ml-auto truncate text-[11px] text-white/35">
                {cmd.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-ink-900 px-2 py-0.5 text-[11px] text-white/50"
            >
              {a.name}
              <button
                type="button"
                className="text-white/30 hover:text-white/60"
                onClick={() =>
                  setAttachments((xs) => xs.filter((x) => x.id !== a.id))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="glass flex items-end gap-2 rounded-xl border border-white/[0.06] px-3 py-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={streaming || disabled}
          className="mb-0.5 grid h-7 w-7 place-items-center rounded-lg text-white/35 hover:bg-white/[0.04] hover:text-white/60"
          aria-label="Attach files"
        >
          <Paperclip className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,image/*"
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          disabled={streaming || disabled}
          placeholder="Message Helix… (/ for commands)"
          className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-white/90 placeholder:text-white/30 focus:outline-none scrollbar-thin"
          style={{ maxHeight: MAX_H }}
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="mb-0.5 grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white/80"
            aria-label="Stop"
          >
            <Square className="h-3 w-3" fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className={cn(
              "mb-0.5 grid h-7 w-7 place-items-center rounded-lg transition duration-200",
              canSend
                ? "bg-helix text-ink-900 shadow-helix-glow"
                : "bg-white/[0.06] text-white/25",
            )}
            aria-label="Send"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

void SLASH_COMMANDS;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("read failed"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
