import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import {
  hasOnlineLocalChatBackend,
  resolveChatBackend,
} from "@/lib/chat/backends";
import {
  hasCloudChat,
  hasHuggingFaceChat,
  isVercelDeploy,
  resolveAIProvider,
} from "@/lib/env";
import { logServer } from "@/lib/logger";
import { ollamaOpenAiApiKey } from "@/lib/ollama";
import { streamHuggingFace } from "./huggingface";
import {
  DEFAULT_HELIX_SYSTEM_PROMPT,
  type AIProvider,
  type AIProviderId,
  type AIStreamInput,
  type AIStreamOutput,
} from "./types";

function withSystemPrompt(input: AIStreamInput): AIStreamInput {
  const system =
    input.system?.trim() ||
    process.env.HELIX_SYSTEM_PROMPT?.trim() ||
    DEFAULT_HELIX_SYSTEM_PROMPT;
  return { ...input, system };
}

async function streamOpenAI(input: AIStreamInput): Promise<AIStreamOutput> {
  const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const modelId = input.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  logServer("info", "openai stream start", { model: modelId });

  const result = streamText({
    model: provider.chat(modelId),
    system: input.system ?? undefined,
    messages: input.messages,
  });

  return {
    result,
    backend: {
      id: "openai",
      baseUrl: "https://api.openai.com",
      model: modelId,
    },
    model: modelId,
  };
}

async function streamLocal(input: AIStreamInput): Promise<AIStreamOutput> {
  const backend = await resolveChatBackend(input.backendId, input.model);
  const apiKey =
    backend.id === "ollama" ? ollamaOpenAiApiKey() : "helix-local";
  const provider = createOpenAI({
    baseURL: backend.baseUrl.replace(/\/$/, "") + "/v1",
    apiKey,
  });

  logServer("info", "local stream start", {
    backend: backend.id,
    model: backend.model,
  });

  const result = streamText({
    model: provider.chat(backend.model),
    system: input.system ?? undefined,
    messages: input.messages,
  });

  return {
    result,
    backend: {
      id: "local",
      baseUrl: backend.baseUrl,
      model: backend.model,
    },
    model: backend.model,
  };
}

/** Placeholder for RunPod / vLLM — swap implementation without touching the frontend. */
async function streamRunPod(_input: AIStreamInput): Promise<AIStreamOutput> {
  throw new Error(
    "RunPod provider is not configured. Set RUNPOD_BASE_URL and RUNPOD_API_KEY, or use AI_PROVIDER=huggingface.",
  );
}

const providers: Record<AIProviderId, AIProvider> = {
  huggingface: { id: "huggingface", stream: streamHuggingFace },
  openai: { id: "openai", stream: streamOpenAI },
  local: { id: "local", stream: streamLocal },
  runpod: { id: "runpod", stream: streamRunPod },
};

export function getProvider(id: AIProviderId): AIProvider {
  return providers[id];
}

export function resolveProviderForRequest(): AIProviderId {
  const explicit = resolveAIProvider();
  if (explicit && !(isVercelDeploy() && explicit === "local")) {
    return explicit;
  }

  if (isVercelDeploy()) {
    if (hasHuggingFaceChat()) return "huggingface";
    if (hasCloudChat()) return "openai";
    throw new Error(
      "No cloud AI provider configured. Set HF_API_KEY or OPENAI_API_KEY in Vercel environment variables.",
    );
  }

  if (hasHuggingFaceChat() && process.env.AI_PREFER_LOCAL !== "true") {
    return "huggingface";
  }

  return "local";
}

/**
 * Single entry for /api/chat — selects backend from env and streams a response.
 */
export async function streamWithProvider(
  input: AIStreamInput,
): Promise<AIStreamOutput> {
  const enriched = withSystemPrompt(input);
  let providerId = resolveProviderForRequest();

  if (providerId === "local" && hasHuggingFaceChat()) {
    const anyLocal = await hasOnlineLocalChatBackend();
    if (!anyLocal) {
      logServer("info", "no local backend online, using huggingface", {});
      providerId = "huggingface";
    }
  }

  if (providerId === "local") {
    try {
      return await providers.local.stream(enriched);
    } catch (err) {
      if (hasHuggingFaceChat()) {
        logServer("warn", "local backend unavailable, falling back to huggingface", {
          error: err instanceof Error ? err.message : String(err),
        });
        providerId = "huggingface";
      } else if (hasCloudChat()) {
        logServer("warn", "local backend unavailable, falling back to openai", {
          error: err instanceof Error ? err.message : String(err),
        });
        providerId = "openai";
      } else {
        throw err;
      }
    }
  }

  logServer("info", "ai provider selected", { provider: providerId });
  return getProvider(providerId).stream(enriched);
}
