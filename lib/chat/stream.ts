import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { resolveChatBackend } from "./backends";

export interface StreamChatInput {
  backendId?: string | null;
  model?: string | null;
  system?: string | null;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function streamChat(input: StreamChatInput) {
  const backend = await resolveChatBackend(input.backendId, input.model);
  const provider = createOpenAI({
    baseURL: backend.baseUrl.replace(/\/$/, "") + "/v1",
    apiKey: "helix-local",
  });

  const result = streamText({
    model: provider.chat(backend.model),
    system: input.system ?? undefined,
    messages: input.messages,
  });

  return { result, backend, model: backend.model };
}
