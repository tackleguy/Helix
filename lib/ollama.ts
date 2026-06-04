/** Ollama Cloud API key (local Ollama ignores auth). */
export function getOllamaApiKey(): string | undefined {
  const key = process.env.OLLAMA_API_KEY?.trim();
  return key || undefined;
}

/** Default Ollama host: cloud when a key is set, else local daemon. */
export function getDefaultOllamaUrl(): string {
  return getOllamaApiKey() ? "https://ollama.com" : "http://127.0.0.1:11434";
}

export function ollamaRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const key = getOllamaApiKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

/** API key passed to the OpenAI SDK (required by the client library). */
export function ollamaOpenAiApiKey(): string {
  return getOllamaApiKey() ?? "helix-local";
}
