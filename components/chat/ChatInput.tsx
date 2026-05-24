"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  streaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}

const MAX_HEIGHT = 200;

export function ChatInput({ streaming, onSend, onStop }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const submit = () => {
    if (streaming) return;
    const v = value.trim();
    if (!v) return;
    onSend(v);
    setValue("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0 && !streaming;

  return (
    <div
      className={cn(
        "glass relative flex items-end gap-2 rounded-2xl px-3 py-2.5 shadow-panel transition focus-within:border-line",
      )}
    >
      <button
        type="button"
        className="mb-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-fg-subtle transition hover:bg-bg-elevated hover:text-fg-muted"
        aria-label="Attach file"
        title="Attach (coming soon)"
        disabled
      >
        <Paperclip className="h-4 w-4" />
      </button>

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        placeholder="Message Helix…"
        className="flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-fg placeholder:text-fg-subtle focus:outline-none scrollbar-thin"
        style={{ maxHeight: MAX_HEIGHT }}
      />

      {streaming ? (
        <button
          onClick={onStop}
          className="mb-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-fg text-bg transition hover:bg-fg/90"
          aria-label="Stop generating"
        >
          <Square className="h-3.5 w-3.5" fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={submit}
          disabled={!canSend}
          className={cn(
            "mb-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg transition",
            canSend
              ? "bg-accent text-white shadow-glow hover:bg-accent/90"
              : "bg-bg-elevated text-fg-subtle",
          )}
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
