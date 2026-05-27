"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  streaming?: boolean;
}

const MAX_HEIGHT = 160;

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  placeholder = "Message Helix…",
  disabled = false,
  streaming = false,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled && !streaming;

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <div className="glass rounded-xl border border-white/[0.06] px-3 py-2 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] transition focus-within:border-white/[0.12]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          disabled={disabled || streaming}
          className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-white/90 placeholder:text-white/30 focus:outline-none scrollbar-thin"
          style={{ maxHeight: MAX_HEIGHT }}
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="mb-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/15"
            aria-label="Stop generating"
          >
            <Square className="h-3 w-3" fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            className={cn(
              "mb-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg transition duration-200",
              canSend
                ? "bg-helix text-ink-900 shadow-helix-glow hover:bg-helix/90"
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
