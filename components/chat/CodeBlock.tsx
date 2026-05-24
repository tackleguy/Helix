"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

interface Props {
  language: string;
  code: string;
  children: ReactNode;
}

export function CodeBlock({ language, code, children }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group my-3 overflow-hidden rounded-lg border border-line-subtle bg-bg-subtle">
      <div className="flex items-center justify-between border-b border-line-subtle bg-bg-panel/60 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {language || "text"}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-muted transition hover:bg-bg-elevated hover:text-fg"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed scrollbar-thin">
        {children}
      </pre>
    </div>
  );
}
