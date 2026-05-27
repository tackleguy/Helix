"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  children: ReactNode;
}

export function CodeBlock({ code, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="group/code relative my-2.5 overflow-hidden rounded-lg border border-white/[0.06] bg-ink-900">
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md bg-ink-850/90 text-white/40 opacity-0 backdrop-blur-sm transition duration-200 hover:text-white/80 group-hover/code:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-helix" strokeWidth={1.75} />
        ) : (
          <Copy className="h-3 w-3" strokeWidth={1.75} />
        )}
      </button>
      <pre className="overflow-x-auto p-3.5 text-[12px] leading-relaxed scrollbar-thin">
        {children}
      </pre>
    </div>
  );
}
