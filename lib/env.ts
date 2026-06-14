/** True when running on Vercel serverless (not local `vercel dev` unless VERCEL=1). */
export function isVercelDeploy(): boolean {
  return process.env.VERCEL === "1";
}

export function getHuggingFaceApiKey(): string | undefined {
  const key =
    process.env.HF_API_KEY?.trim() ||
    process.env.HF_TOKEN?.trim() ||
    process.env.HUGGINGFACE_API_KEY?.trim();
  return key || undefined;
}

/**
 * Local dev: use only llama-server / Ollama / LM Studio + ComfyUI.
 * Ignored on Vercel. Enable with AI_LOCAL_ONLY=true or AI_PROVIDER=local.
 */
export function isLocalOnlyMode(): boolean {
  if (isVercelDeploy()) return false;
  if (process.env.AI_LOCAL_ONLY?.trim().toLowerCase() === "true") {
    return true;
  }
  return resolveAIProvider() === "local";
}

/** Cloud chat via Hugging Face Inference Providers. */
export function hasHuggingFaceChat(): boolean {
  if (isLocalOnlyMode()) return false;
  return Boolean(getHuggingFaceApiKey());
}

/** Cloud chat via OpenAI when deployed and key is configured. */
export function hasOpenAIChat(): boolean {
  if (isLocalOnlyMode()) return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Any hosted model API (HF or OpenAI). */
export function hasCloudChat(): boolean {
  return hasHuggingFaceChat() || hasOpenAIChat();
}

export type AIProviderName = "huggingface" | "openai" | "local" | "runpod";

/** Force a provider via AI_PROVIDER; unset uses automatic selection. */
export function resolveAIProvider(): AIProviderName | null {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "auto") return null;
  if (
    raw === "huggingface" ||
    raw === "hf" ||
    raw === "hugging_face"
  ) {
    return "huggingface";
  }
  if (raw === "openai") return "openai";
  if (raw === "local") return "local";
  if (raw === "runpod" || raw === "vllm") return "runpod";
  return null;
}

export function isCloudOnlyDeploy(): boolean {
  return isVercelDeploy() && !hasCloudChat();
}

/** Vercel serverless: use in-memory sessions (SQLite /tmp is unreliable). */
export function useVercelMemoryStore(): boolean {
  return isVercelDeploy();
}
