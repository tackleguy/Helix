"use client";

import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  const isPending = message.pending && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] text-sm leading-relaxed",
          isUser
            ? "rounded-xl bg-ink-850 px-3.5 py-2 text-white/90"
            : "text-white/80",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : isPending ? (
          <ThinkingDots />
        ) : (
          <AssistantMarkdown content={message.content} />
        )}
      </div>
    </motion.div>
  );
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-helix">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={{
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0">{children}</p>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-helix underline decoration-helix/30 underline-offset-2 hover:decoration-helix"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-2.5 list-disc space-y-0.5 pl-4 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2.5 list-decimal space-y-0.5 pl-4 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="marker:text-white/30">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-3 text-lg font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-3 text-base font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-2.5 text-sm font-semibold">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-white/[0.12] pl-3 text-white/50">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-white/[0.06]" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          code: CodeRenderer,
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-2.5 overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/[0.06] bg-ink-900 px-2.5 py-1.5 text-left font-medium text-white/50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/[0.06] px-2.5 py-1.5">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

type CodeProps = ComponentPropsWithoutRef<"code"> & { inline?: boolean };

function CodeRenderer({ inline, className, children, ...rest }: CodeProps) {
  const text = String(children ?? "").replace(/\n$/, "");
  const isBlock =
    !inline && (className?.includes("language-") || text.includes("\n"));

  if (!isBlock) {
    return (
      <code
        className="rounded bg-ink-900 px-1 py-0.5 font-mono text-[0.85em] text-helix/90"
        {...rest}
      >
        {children}
      </code>
    );
  }

  return (
    <CodeBlock code={text}>
      <code className={className} {...rest}>
        {children}
      </code>
    </CodeBlock>
  );
}

function CodeBlock({ code, children }: { code: string; children: ReactNode }) {
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
        className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md bg-ink-850/80 text-white/40 opacity-0 backdrop-blur-sm transition duration-200 hover:text-white/80 group-hover/code:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-helix" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
      <pre className="overflow-x-auto p-3.5 text-[12px] leading-relaxed scrollbar-thin">
        {children}
      </pre>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
