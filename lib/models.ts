export type Family =
  | "llama"
  | "qwen"
  | "deepseek"
  | "gpt-oss"
  | "openai"
  | "claude"
  | "other";

export type Location = "local" | "cloud";

export interface BackendConfig {
  baseUrl: string;
  upstreamModel: string;
  apiKeyEnv?: string;
  location: Location;
}

export interface ModelDef {
  id: string;
  label: string;
  family: Family;
  size?: string;
  description: string;
  reasoning?: boolean;
  backend: BackendConfig;
}

export interface ModelInfo extends Omit<ModelDef, "backend"> {
  location: Location;
  requiresKey: boolean;
  available: boolean;
}

export const MODELS: ModelDef[] = [
  // --- Local llama.cpp (served by ../llama-bin/serve.sh) ---
  {
    id: "llama-3b",
    label: "Llama 3.2 3B",
    family: "llama",
    size: "3B",
    description: "Local · Fastest, smallest, lower quality",
    backend: {
      baseUrl: "http://127.0.0.1:8080/v1",
      upstreamModel: "llama-3b",
      location: "local",
    },
  },
  {
    id: "qwen-7b",
    label: "Qwen 2.5 7B",
    family: "qwen",
    size: "7B",
    description: "Local · Daily-driver quality",
    backend: {
      baseUrl: "http://127.0.0.1:8080/v1",
      upstreamModel: "qwen-7b",
      location: "local",
    },
  },
  {
    id: "qwen-14b",
    label: "Qwen 2.5 14B",
    family: "qwen",
    size: "14B",
    description: "Local · Stronger, half the speed",
    backend: {
      baseUrl: "http://127.0.0.1:8080/v1",
      upstreamModel: "qwen-14b",
      location: "local",
    },
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1 7B",
    family: "deepseek",
    size: "7B",
    description: "Local · Reasoning model",
    reasoning: true,
    backend: {
      baseUrl: "http://127.0.0.1:8080/v1",
      upstreamModel: "deepseek-r1",
      location: "local",
    },
  },

  // --- Cloud ---
  {
    id: "pollinations",
    label: "GPT-OSS 20B",
    family: "gpt-oss",
    size: "20B",
    description: "Cloud · Free, no key, reasoning",
    reasoning: true,
    backend: {
      baseUrl: "https://text.pollinations.ai/openai",
      upstreamModel: "openai",
      location: "cloud",
    },
  },
  {
    id: "groq-llama-70b",
    label: "Llama 3.3 70B (Groq)",
    family: "llama",
    size: "70B",
    description: "Cloud · Fast, needs GROQ_API_KEY",
    backend: {
      baseUrl: "https://api.groq.com/openai/v1",
      upstreamModel: "llama-3.3-70b-versatile",
      apiKeyEnv: "GROQ_API_KEY",
      location: "cloud",
    },
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek V3",
    family: "deepseek",
    size: "671B",
    description: "Cloud · Strong + cheap, needs DEEPSEEK_API_KEY",
    backend: {
      baseUrl: "https://api.deepseek.com/v1",
      upstreamModel: "deepseek-chat",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      location: "cloud",
    },
  },
];

export const DEFAULT_MODEL_ID =
  process.env.HELIX_DEFAULT_MODEL ?? "pollinations";

export function getModel(id: string | null | undefined): ModelDef {
  if (id) {
    const found = MODELS.find((m) => m.id === id);
    if (found) return found;
  }
  return (
    MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ??
    MODELS.find((m) => m.id === "pollinations")!
  );
}

export function getApiKey(model: ModelDef): string | undefined {
  if (!model.backend.apiKeyEnv) return undefined;
  return process.env[model.backend.apiKeyEnv];
}

/** Public-facing summary; never includes secrets. */
export function toInfo(model: ModelDef, available: boolean): ModelInfo {
  const { backend, ...rest } = model;
  return {
    ...rest,
    location: backend.location,
    requiresKey: Boolean(backend.apiKeyEnv),
    available,
  };
}
