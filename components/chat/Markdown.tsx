"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { CodeBlock } from "./CodeBlock";
import type { ComponentPropsWithoutRef } from "react";

interface Props {
  content: string;
}

export function Markdown({ content }: Props) {
  return (
    <div className="prose-helix">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="marker:text-fg-subtle">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 text-xl font-semibold tracking-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-lg font-semibold tracking-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-base font-semibold tracking-tight">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-line pl-3 text-fg-muted">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-line-subtle" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-fg">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-fg-muted">{children}</em>,
          code: CodeRenderer,
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-md border border-line-subtle">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-line-subtle bg-bg-panel px-3 py-1.5 text-left text-xs font-medium text-fg-muted">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line-subtle px-3 py-1.5 text-fg">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

type CodeProps = ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
};

function CodeRenderer({ inline, className, children, ...rest }: CodeProps) {
  const text = String(children ?? "").replace(/\n$/, "");
  const isBlock = !inline && (className?.includes("language-") || text.includes("\n"));

  if (!isBlock) {
    return (
      <code
        className="rounded bg-bg-panel px-1.5 py-0.5 font-mono text-[0.85em] text-fg"
        {...rest}
      >
        {children}
      </code>
    );
  }

  const lang = className?.replace("language-", "") ?? "";
  return (
    <CodeBlock language={lang} code={text}>
      <code className={className} {...rest}>
        {children}
      </code>
    </CodeBlock>
  );
}
