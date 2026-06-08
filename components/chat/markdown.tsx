"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import type { ComponentPropsWithoutRef } from "react";
import { CodeBlock } from "./code-block";

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose-helix text-sm leading-relaxed text-white/85">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeShiki,
            {
              theme: "github-dark",
            },
          ],
        ]}
        components={{
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-helix underline decoration-helix/30 underline-offset-2"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-2.5 list-disc space-y-0.5 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2.5 list-decimal space-y-0.5 pl-4">
              {children}
            </ol>
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
