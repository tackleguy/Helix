import type { NextRequest } from "next/server";
import type { Message } from "@/lib/types";

export const runtime = "edge";

const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL ?? "http://127.0.0.1:8080";
const LLAMA_MODEL = process.env.LLAMA_MODEL ?? "helix-local";
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;
const LLAMA_TEMPERATURE = Number(process.env.LLAMA_TEMPERATURE ?? "0.7");
const LLAMA_MAX_TOKENS = Number(process.env.LLAMA_MAX_TOKENS ?? "1024");
const LLAMA_CONNECT_TIMEOUT_MS = Number(
  process.env.LLAMA_CONNECT_TIMEOUT_MS ?? "2000",
);

interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
}

const CANNED = [
  "I'm Helix running in **mock mode** — the route tried to reach llama.cpp at `" +
    LLAMA_BASE_URL +
    "` and didn't get a response.\n\nStart a llama.cpp server and I'll proxy through automatically:\n\n```bash\nllama-server -m models/qwen2.5-7b-instruct-q4_k_m.gguf --host 127.0.0.1 --port 8080\n```\n\nNo restart of Helix needed — next message will route through.",
  "Here's the streaming contract Helix consumes:\n\n```ts\nconst res = await fetch('/api/chat', {\n  method: 'POST',\n  body: JSON.stringify({ messages }),\n});\nconst reader = res.body!.getReader();\nconst decoder = new TextDecoder();\nwhile (true) {\n  const { value, done } = await reader.read();\n  if (done) break;\n  appendToAssistant(decoder.decode(value));\n}\n```\n\nThe server emits plain UTF-8 text chunks. When llama.cpp is reachable, its SSE deltas are unwrapped server-side into the same plain-text stream — the client stays identical.",
  "Drop-in alternatives that speak the same OpenAI-compatible chat-completions protocol:\n\n1. **llama.cpp** (`llama-server`) — default, set `LLAMA_BASE_URL=http://127.0.0.1:8080`\n2. **Ollama** — set `LLAMA_BASE_URL=http://127.0.0.1:11434/v1` and `LLAMA_MODEL=qwen2.5:7b`\n3. **vLLM** — point at `http://your-host:8000`\n4. **TGI** — same shape\n\nAuth: set `LLAMA_API_KEY` for a Bearer token. Tuning: `LLAMA_TEMPERATURE`, `LLAMA_MAX_TOKENS`.",
];

function pickResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("code") || p.includes("example") || p.includes("```"))
    return CANNED[1];
  if (
    p.includes("model") ||
    p.includes("ollama") ||
    p.includes("vllm") ||
    p.includes("alternative")
  )
    return CANNED[2];
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

  const llama = await tryLlama(body, req.signal).catch(() => null);
  if (llama) return llama;
  return mockStream(body);
}

async function tryLlama(
  body: ChatRequest,
  clientSignal: AbortSignal,
): Promise<Response | null> {
  const url = `${LLAMA_BASE_URL.replace(/\/+$/, "")}/v1/chat/completions`;

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
        messages: body.messages,
        stream: true,
        temperature: LLAMA_TEMPERATURE,
        max_tokens: LLAMA_MAX_TOKENS,
      }),
      signal: connectAbort.signal,
    });
  } finally {
    clearTimeout(connectTimer);
    clientSignal.removeEventListener("abort", onClientAbort);
  }

  if (!upstream.ok || !upstream.body) {
    return null;
  }

  const stream = sseToTextStream(upstream.body, clientSignal);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Helix-Backend": "llama.cpp",
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
              if (payload === "[DONE]") {
                controller.close();
                clientSignal.removeEventListener("abort", onAbort);
                return;
              }
              try {
                const json = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const token = json.choices?.[0]?.delta?.content;
                if (token) controller.enqueue(encoder.encode(token));
              } catch {
                /* malformed chunk — skip */
              }
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        clientSignal.removeEventListener("abort", onAbort);
      }
    },
  });
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
