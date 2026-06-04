import type { streamText } from "ai";

export type AIProviderId =
  | "huggingface"
  | "openai"
  | "local"
  | "runpod";

export const DEFAULT_HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";

export const DEFAULT_HELIX_SYSTEM_PROMPT = `You are Helix.

Your purpose is maximizing focus, productivity, and execution.

Keep responses concise.

Avoid unnecessary explanations.

Help users identify the next action.

Encourage progress over perfection.

Break large goals into manageable steps.

Minimize distractions.

Act like an elite productivity coach.`;

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIStreamInput {
  backendId?: string | null;
  model?: string | null;
  system?: string | null;
  messages: AIChatMessage[];
}

export interface AIResolvedBackend {
  id: AIProviderId | "openai";
  baseUrl: string;
  model: string;
}

export interface AIStreamOutput {
  result: Awaited<ReturnType<typeof streamText>>;
  backend: AIResolvedBackend;
  model: string;
}

export interface HuggingFaceConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface AIProvider {
  id: AIProviderId;
  stream(input: AIStreamInput): Promise<AIStreamOutput>;
}
