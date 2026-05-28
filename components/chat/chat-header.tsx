"use client";

import { Settings2 } from "lucide-react";
import type { ChatMessageDto } from "@/lib/chat/types";
import { sumMessageTokens } from "@/lib/chat/tokens";
import { ModelPicker } from "./model-picker";

interface ChatHeaderProps {
  title: string;
  model: string | null;
  backend: string | null;
  messages: ChatMessageDto[];
  onOpenSystemPrompt: () => void;
  onModelChange: (modelId: string) => void;
}

export function ChatHeader({
  title,
  model,
  backend,
  messages,
  onOpenSystemPrompt,
  onModelChange,
}: ChatHeaderProps) {
  const { in: tokensIn, out: tokensOut } = sumMessageTokens(messages);

  return (
    <header className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-white/[0.06] px-3">
      <h1 className="truncate text-sm font-medium text-white/80">{title}</h1>
      <div className="ml-auto flex items-center gap-2 text-[11px] text-white/35">
        <span className="hidden font-mono sm:inline">
          {tokensIn + tokensOut} tok
        </span>
        <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-helix/80">
          local · free
        </span>
        <ModelPicker value={model} onChange={onModelChange} />
        {backend && (
          <span className="hidden max-w-[80px] truncate font-mono text-white/25 md:inline">
            {backend}
          </span>
        )}
        <button
          type="button"
          onClick={onOpenSystemPrompt}
          className="grid h-7 w-7 place-items-center rounded-md text-white/40 transition hover:bg-white/[0.04] hover:text-white/70"
          aria-label="System prompt"
          title="System prompt"
        >
          <Settings2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
