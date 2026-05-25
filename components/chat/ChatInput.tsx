"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Square, Paperclip, Mic, MicOff, SlashSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-store";
import { getSpeechRecognition, startSpeech, type SpeechSession } from "@/lib/speech";
import {
  matchSlash,
  parseSlash,
  SLASH_COMMANDS,
  type SlashContext,
} from "@/lib/slash-commands";

interface Props {
  streaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}

const MAX_HEIGHT = 200;

export function ChatInput({ streaming, onSend, onStop }: Props) {
  const router = useRouter();
  const { newChat, clearAll, setModel } = useChat();
  const [value, setValue] = useState("");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<SpeechSession | null>(null);

  const slashCtx: SlashContext = useMemo(
    () => ({
      newChat,
      clearAll,
      setModel,
      router: { push: (href: string) => router.push(href) },
    }),
    [newChat, clearAll, setModel, router],
  );

  const slashMatches = useMemo(() => matchSlash(value), [value]);
  const slashOpen = slashMatches.length > 0;

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value, interim]);

  useEffect(() => () => sessionRef.current?.stop(), []);

  useEffect(() => {
    if (slashIndex >= slashMatches.length) setSlashIndex(0);
  }, [slashMatches.length, slashIndex]);

  const stopRecording = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setRecording(false);
    setInterim("");
  };

  const startRecording = () => {
    setVoiceError(null);
    setInterim("");
    const session = startSpeech({
      onInterim: (t) => setInterim(t),
      onFinal: (t) => {
        setValue((v) => (v ? `${v.trimEnd()} ${t}` : t).trimStart());
        setInterim("");
      },
      onError: (e) => {
        setVoiceError(e);
        setRecording(false);
      },
      onEnd: () => {
        setRecording(false);
        setInterim("");
      },
    });
    if (!session) {
      setVoiceError("speech recognition unavailable in this browser");
      return;
    }
    sessionRef.current = session;
    setRecording(true);
  };

  const toggleMic = () => {
    if (streaming) return;
    if (recording) stopRecording();
    else startRecording();
  };

  const completeSlash = (name: string) => {
    setValue(`/${name} `);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submit = () => {
    if (streaming) return;
    stopRecording();
    const v = value.trim();
    if (!v) return;

    const slash = parseSlash(v);
    if (slash) {
      const result = slash.command.execute(slash.args, slashCtx);
      setValue("");
      if (typeof result === "string" && result.length > 0) {
        onSend(result);
      }
      return;
    }
    onSend(v);
    setValue("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, slashMatches.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        completeSlash(slashMatches[slashIndex].name);
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
      // If popup is open and value is just a partial command name, complete it
      // instead of submitting. If value is "/cmd " or "/cmd arg", submit.
      if (slashOpen && !value.includes(" ")) {
        completeSlash(slashMatches[slashIndex].name);
        return;
      }
      submit();
    }
  };

  const display = interim ? `${value}${value ? " " : ""}${interim}` : value;
  const canSend = value.trim().length > 0 && !streaming;

  return (
    <div className="space-y-1.5">
      {slashOpen && (
        <div className="glass overflow-hidden rounded-xl p-1 shadow-panel">
          {slashMatches.map((cmd, i) => {
            const active = i === slashIndex;
            return (
              <button
                key={cmd.name}
                onMouseEnter={() => setSlashIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  completeSlash(cmd.name);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition",
                  active
                    ? "bg-bg-elevated text-fg"
                    : "text-fg-muted hover:bg-bg-elevated/60",
                )}
              >
                <SlashSquare className="h-3.5 w-3.5 text-accent" />
                <span className="font-mono text-[13px] text-fg">/{cmd.name}</span>
                {cmd.argHint && (
                  <span className="font-mono text-[11px] text-fg-subtle">
                    {cmd.argHint}
                  </span>
                )}
                <span className="ml-auto truncate text-[11px] text-fg-subtle">
                  {cmd.description}
                </span>
              </button>
            );
          })}
          <div className="border-t border-line-subtle px-2.5 py-1 text-[10px] text-fg-subtle">
            <kbd className="font-mono">↑↓</kbd> navigate · <kbd className="font-mono">Tab</kbd> / <kbd className="font-mono">Enter</kbd> complete · <kbd className="font-mono">Esc</kbd> cancel
          </div>
        </div>
      )}

      <div
        className={cn(
          "glass relative flex items-end gap-2 rounded-2xl px-3 py-2.5 shadow-panel transition focus-within:border-line",
          recording && "ring-1 ring-accent/40",
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
          value={display}
          onChange={(e) => {
            if (interim && e.target.value.endsWith(interim)) {
              setValue(e.target.value.slice(0, -interim.length).trimEnd());
            } else {
              setInterim("");
              setValue(e.target.value);
            }
          }}
          onKeyDown={onKey}
          placeholder={
            recording ? "Listening… speak now" : "Message Helix… (try / for commands)"
          }
          className="flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-fg placeholder:text-fg-subtle focus:outline-none scrollbar-thin"
          style={{ maxHeight: MAX_HEIGHT }}
        />

        {voiceSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={streaming}
            className={cn(
              "mb-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg transition",
              recording
                ? "bg-accent text-white shadow-glow"
                : "text-fg-subtle hover:bg-bg-elevated hover:text-fg",
              streaming && "cursor-not-allowed opacity-50",
            )}
            aria-label={recording ? "Stop recording" : "Start voice input"}
            title={recording ? "Stop recording" : "Voice input"}
          >
            {recording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        )}

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

      {voiceError && (
        <p className="px-1 text-[11px] text-amber-400/80">{voiceError}</p>
      )}
      {recording && !voiceError && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-fg-subtle">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          Listening — Enter or click ⬆ to send, mic to stop.
        </p>
      )}
    </div>
  );
}

// Tree-shake guard so the SLASH_COMMANDS import isn't dropped by build pruning.
void SLASH_COMMANDS;
