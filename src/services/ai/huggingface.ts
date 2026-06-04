import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getHuggingFaceApiKey as getHfKeyFromEnv } from "@/lib/env";
import { logServer } from "@/lib/logger";
import {
  DEFAULT_HF_MODEL,
  type AIStreamInput,
  type AIStreamOutput,
  type HuggingFaceConfig,
  type RetryOptions,
} from "./types";

export const HF_ROUTER_BASE_URL = "https://router.huggingface.co/v1";

export function getHuggingFaceApiKey(): string | undefined {
  return getHfKeyFromEnv();
}

export function getHuggingFaceModel(override?: string | null): string {
  return (
    override?.trim() ||
    process.env.HF_MODEL?.trim() ||
    DEFAULT_HF_MODEL
  );
}

export function getHuggingFaceConfig(
  modelOverride?: string | null,
): HuggingFaceConfig {
  const apiKey = getHuggingFaceApiKey();
  if (!apiKey) {
    throw new Error(
      "HF_API_KEY is not set. Add a Hugging Face token with Inference Providers permission.",
    );
  }
  return {
    apiKey,
    model: getHuggingFaceModel(modelOverride),
    baseUrl: process.env.HF_BASE_URL?.trim() || HF_ROUTER_BASE_URL,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 8_000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /429|503|502|504|timeout|ECONNRESET|fetch failed|rate limit/i.test(
          msg,
        );

      if (!retryable || attempt === maxAttempts) {
        logServer("error", `${label} failed`, {
          attempt,
          maxAttempts,
          error: msg,
        });
        throw err;
      }

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      logServer("warn", `${label} retry`, { attempt, delayMs: delay, error: msg });
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function streamHuggingFace(
  input: AIStreamInput,
): Promise<AIStreamOutput> {
  const config = getHuggingFaceConfig(input.model);
  const modelId = config.model;

  logServer("info", "huggingface stream start", {
    model: modelId,
    messageCount: input.messages.length,
    hasSystem: Boolean(input.system?.trim()),
  });

  return withRetry("huggingface.stream", async () => {
    const provider = createOpenAI({
      baseURL: config.baseUrl.replace(/\/$/, ""),
      apiKey: config.apiKey,
    });

    const result = streamText({
      model: provider.chat(modelId),
      system: input.system ?? undefined,
      messages: input.messages,
    });

    return {
      result,
      backend: {
        id: "huggingface" as const,
        baseUrl: config.baseUrl,
        model: modelId,
      },
      model: modelId,
    };
  });
}
