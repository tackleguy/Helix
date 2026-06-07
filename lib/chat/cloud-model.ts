import {
  hasHuggingFaceChat,
  hasOpenAIChat,
  isVercelDeploy,
} from "@/lib/env";
import { getHuggingFaceModel } from "@/src/services/ai/huggingface";

const LOCAL_MODEL_ALIASES = new Set([
  "llama-3b",
  "qwen-7b",
  "qwen-14b",
  "deepseek-r1",
  "study-helix",
  "default",
]);

/** Map session/local aliases to a cloud model id on Vercel or when using HF/OpenAI. */
export function resolveCloudModelId(sessionModel?: string | null): string | undefined {
  if (!sessionModel?.trim()) {
    if (hasHuggingFaceChat()) return getHuggingFaceModel();
    if (hasOpenAIChat()) {
      return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    }
    return undefined;
  }

  const id = sessionModel.trim();
  if (id.includes("/")) return id;

  if (isVercelDeploy() || hasHuggingFaceChat() || hasOpenAIChat()) {
    if (LOCAL_MODEL_ALIASES.has(id)) {
      if (hasHuggingFaceChat()) return getHuggingFaceModel();
      if (hasOpenAIChat()) {
        return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
      }
    }
  }

  return id;
}

export function defaultCloudModelForNewSession(): string | null {
  if (hasHuggingFaceChat()) return getHuggingFaceModel();
  if (hasOpenAIChat()) {
    return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  }
  return null;
}
