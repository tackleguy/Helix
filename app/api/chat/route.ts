import type { NextRequest } from "next/server";
import type { Message } from "@/lib/types";
import { THINK_OPEN, THINK_CLOSE } from "@/lib/protocol";
import { getApiKey, getModel, type ModelDef } from "@/lib/models";

export const runtime = "edge";
export const maxDuration = 60;

const LLAMA_TEMPERATURE_DEFAULT = Number(process.env.LLAMA_TEMPERATURE ?? "0.7");
const LLAMA_MAX_TOKENS_DEFAULT = Number(process.env.LLAMA_MAX_TOKENS ?? "800");
const LLAMA_CONNECT_TIMEOUT_MS = Number(
  process.env.LLAMA_CONNECT_TIMEOUT_MS ?? "5000",
);

const SYSTEM_PROMPT_DEFAULT =
  process.env.HELIX_SYSTEM_PROMPT ??
  "You are Helix, a precise and concise assistant. Use Markdown freely (lists, **bold**, fenced code with language tags). Skip filler. When unsure, say so.";

interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
  modelId?: string;
  system?: string | null;
  temperature?: number;
  max_tokens?: number;
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

  const model = getModel(body.modelId);

  if (model.backend.apiKeyEnv && !getApiKey(model)) {
    return mockNotice(
      `Model **${model.label}** needs \`${model.backend.apiKeyEnv}\` set in your environment to work. Pick another model from the picker, or set the key and restart.`,
    );
  }

  if (model.backend.location === "local") {
    const loaded = await probeLocalAlias(model.backend.baseUrl);
    if (loaded === null) {
      return mockNotice(
        `Couldn't reach local llama-server at \`${model.backend.baseUrl}\`. Start it with:\n\n\`\`\`bash\n./serve.sh ${model.backend.upstreamModel}\n\`\`\`\n\nOr pick a cloud model from the picker.`,
      );
    }
    if (loaded !== model.backend.upstreamModel) {
      return mockNotice(
        `llama-server is currently serving **${loaded}**, but you picked **${model.id}**. Switch with:\n\n\`\`\`bash\n./serve.sh ${model.backend.upstreamModel}\n\`\`\`\n\n(llama-server only loads one model at a time.)`,
      );
    }
  }

  const upstream = await tryUpstream(model, body, req.signal).catch(() => null);
  if (upstream) return upstream;

  return mockNotice(
    `Upstream **${model.label}** didn't respond. Try another model from the picker.`,
  );
}

async function probeLocalAlias(baseUrl: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 700);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    return json.data?.[0]?.id ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function tryUpstream(
  model: ModelDef,
  body: ChatRequest,
  clientSignal: AbortSignal,
): Promise<Response | null> {
  const baseUrl = model.backend.baseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;
  const apiKey = getApiKey(model);

  const systemPrompt =
    typeof body.system === "string" && body.system.trim()
      ? body.system.trim()
      : SYSTEM_PROMPT_DEFAULT;
  const temperature = clamp(body.temperature ?? LLAMA_TEMPERATURE_DEFAULT, 0, 2);
  const maxTokens = clampInt(
    body.max_tokens ?? LLAMA_MAX_TOKENS_DEFAULT,
    16,
    8192,
  );

  const messages = [
    { role: "system", content: systemPrompt },
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
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.backend.upstreamModel,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
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
      "X-Helix-Model": model.id,
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

function chunkText(text: string): string[] {
  return text.match(/(\s+|[^\s]+)/g) ?? [text];
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.round(clamp(v, lo, hi));
}

function mockNotice(markdown: string): Response {
  const chunks = chunkText(markdown);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 10));
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
