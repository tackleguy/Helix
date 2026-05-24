import type { NextRequest } from "next/server";
import type { Message } from "@/lib/types";

export const runtime = "edge";
export const maxDuration = 60;

const DEFAULT_BASE_URL = "https://text.pollinations.ai/openai";
const DEFAULT_MODEL = "openai";

const LLAMA_BASE_URL = (process.env.LLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(
  /\/+$/,
  "",
);
const LLAMA_MODEL = process.env.LLAMA_MODEL ?? DEFAULT_MODEL;
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;
const LLAMA_TEMPERATURE = Number(process.env.LLAMA_TEMPERATURE ?? "0.7");
const LLAMA_MAX_TOKENS = Number(process.env.LLAMA_MAX_TOKENS ?? "800");
const LLAMA_CONNECT_TIMEOUT_MS = Number(
  process.env.LLAMA_CONNECT_TIMEOUT_MS ?? "5000",
);

const SYSTEM_PROMPT =
  process.env.HELIX_SYSTEM_PROMPT ??
  "You are Helix, a precise and concise assistant. Use Markdown freely (lists, **bold**, fenced code with language tags). Skip filler. When unsure, say so.";

import { THINK_OPEN, THINK_CLOSE } from "@/lib/protocol";

interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
}

interface SseDelta {
  content?: string;
  reasoning?: string;
  reasoning_content?: string;
}

interface SseChunk {
  choices?: Array<{ delta?: SseDelta }>;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const upstream = await tryUpstream(body, req.signal).catch(() => null);
  if (upstream) return upstream;
  return mockStream(body);
}

async function tryUpstream(
  body: ChatRequest,
  clientSignal: AbortSignal,
): Promise<Response | null> {
  const url = `${LLAMA_BASE_URL}/chat/completions`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...body.messages,
  ];

  const connectAbort = new AbortController();
  const connectTimer = setTimeout(
    () => connectAbort.abort(),
    LLAMA_CONNECT_TIMEOUT_MS,
  );
  const onClientAbort = () => connectAbort.abort();
  clientSignal.addEventListener("abort", onClientAbort);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(LLAMA_API_KEY ? { Authorization: `Bearer ${LLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: LLAMA_MODEL,
        messages,
        stream: true,
        temperature: LLAMA_TEMPERATURE,
        max_tokens: LLAMA_MAX_TOKENS,
      }),
      signal: connectAbort.signal,
    });
  } catch {
    clearTimeout(connectTimer);
    clientSignal.removeEventListener("abort", onClientAbort);
    return null;
  }
  clearTimeout(connectTimer);
  clientSignal.removeEventListener("abort", onClientAbort);

  if (!upstream.ok || !upstream.body) return null;

  const stream = sseToTextStream(upstream.body, clientSignal);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Helix-Backend": new URL(url).host,
      "X-Helix-Model": LLAMA_MODEL,
    },
  });
}

function sseToTextStream(
  upstream: ReadableStream<Uint8Array>,
  clientSignal: AbortSignal,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      const onAbort = () => reader.cancel().catch(() => undefined);
      clientSignal.addEventListener("abort", onAbort);

      let buffer = "";
      let inThink = false;
      let sawContent = false;

      const closeThink = () => {
        if (inThink) {
          controller.enqueue(encoder.encode(THINK_CLOSE));
          inThink = false;
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const event = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);

            for (const rawLine of event.split("\n")) {
              const line = rawLine.trimEnd();
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              if (payload === "[DONE]") {
                closeThink();
                controller.close();
                clientSignal.removeEventListener("abort", onAbort);
                return;
              }
              let json: SseChunk;
              try {
                json = JSON.parse(payload) as SseChunk;
              } catch {
                continue;
              }
              const delta = json.choices?.[0]?.delta;
              if (!delta) continue;

              const reasoning = delta.reasoning ?? delta.reasoning_content;
              if (reasoning && !sawContent) {
                if (!inThink) {
                  controller.enqueue(encoder.encode(THINK_OPEN));
                  inThink = true;
                }
                controller.enqueue(encoder.encode(reasoning));
              }

              if (delta.content) {
                closeThink();
                sawContent = true;
                controller.enqueue(encoder.encode(delta.content));
              }
            }
          }
        }
        closeThink();
        controller.close();
      } catch (err) {
        closeThink();
        controller.error(err);
      } finally {
        clientSignal.removeEventListener("abort", onAbort);
      }
    },
  });
}

const CANNED = [
  "I'm Helix in **fallback mode** — the upstream model at `" +
    LLAMA_BASE_URL +
    "` didn't respond.\n\n**Default backend:** Pollinations (no key required). If it's down, set `LLAMA_BASE_URL` + `LLAMA_API_KEY` to any OpenAI-compatible endpoint.",
  "Streaming contract Helix consumes:\n\n```ts\nconst res = await fetch('/api/chat', {\n  method: 'POST',\n  body: JSON.stringify({ messages }),\n});\nconst reader = res.body!.getReader();\nconst decoder = new TextDecoder();\nwhile (true) {\n  const { value, done } = await reader.read();\n  if (done) break;\n  appendToAssistant(decoder.decode(value));\n}\n```\n\nServer unwraps upstream SSE into plain UTF-8 chunks.",
  "Drop-in OpenAI-compatible backends:\n\n1. **Pollinations** *(default, no key)* — `https://text.pollinations.ai/openai`, model `openai`\n2. **Groq** — `https://api.groq.com/openai/v1`, model `llama-3.3-70b-versatile`, needs `LLAMA_API_KEY`\n3. **llama.cpp local** — `http://127.0.0.1:8080/v1`, run `llama-server -m ...gguf`\n4. **Ollama** — `http://127.0.0.1:11434/v1`, model `qwen2.5:7b`\n5. **DeepSeek** — `https://api.deepseek.com/v1`, model `deepseek-chat`",
];

function pickResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("code") || p.includes("example") || p.includes("```"))
    return CANNED[1];
  if (
    p.includes("model") ||
    p.includes("groq") ||
    p.includes("ollama") ||
    p.includes("deepseek") ||
    p.includes("backend")
  )
    return CANNED[2];
  return CANNED[0];
}

function chunkText(text: string): string[] {
  return text.match(/(\s+|[^\s]+)/g) ?? [text];
}

function mockStream(body: ChatRequest): Response {
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
      "X-Helix-Backend": "mock",
    },
  });
}
