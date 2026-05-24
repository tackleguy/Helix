import type { NextRequest } from "next/server";
import type { Message } from "@/lib/types";

export const runtime = "edge";

interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
  model?: string;
}

const CANNED = [
  "I'm Helix, a local-first AI workspace. The streaming you're seeing is a mock — there's no model wired in yet, just the token transport plumbing.\n\nWhat's already in place:\n\n- **Edge route** at `/api/chat` returning a `ReadableStream`\n- **Client reader** consuming chunks and reducing into message state\n- **Markdown + code** rendering with syntax highlighting\n\nWhen you swap in a real backend (llama.cpp, vLLM, an OpenAI-compatible proxy), only this route changes. The UI stays.",
  "Here's a quick example of how the streaming contract works:\n\n```ts\nconst res = await fetch('/api/chat', {\n  method: 'POST',\n  body: JSON.stringify({ messages }),\n});\nconst reader = res.body!.getReader();\nconst decoder = new TextDecoder();\nwhile (true) {\n  const { value, done } = await reader.read();\n  if (done) break;\n  appendToAssistant(decoder.decode(value));\n}\n```\n\nPlain text chunks over HTTP — no SSE framing, no JSON-per-line. Swap to SSE later if you need event types.",
  "A few things to try once you're ready to plug in a real model:\n\n1. **llama.cpp server** — point this route at `http://localhost:8080/v1/chat/completions` with `stream: true`\n2. **Ollama** — same shape, port 11434\n3. **vLLM / TGI** — same OpenAI-compatible contract\n\nThe UI doesn't care which one. It just reads bytes.",
];

function pickResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("code") || p.includes("example") || p.includes("```")) return CANNED[1];
  if (p.includes("model") || p.includes("llama") || p.includes("local")) return CANNED[2];
  return CANNED[0];
}

function chunkText(text: string): string[] {
  return text.match(/(\s+|[^\s]+)/g) ?? [text];
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const last = body.messages?.findLast?.((m) => m.role === "user")?.content ?? "";
  const response = pickResponse(last);
  const chunks = chunkText(response);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 18 + Math.random() * 32));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
