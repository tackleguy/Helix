import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { hasCloudChat, isVercelDeploy } from "@/lib/env";
import { resolveChatBackend } from "./backends";

export interface StreamChatInput {
  backendId?: string | null;
  model?: string | null;
  system?: string | null;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function streamChat(input: StreamChatInput) {
  if (isVercelDeploy() && hasCloudChat()) {
    const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const modelId = input.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const result = streamText({
      model: provider.chat(modelId),
      system: input.system ?? undefined,
      messages: input.messages,
    });
    return {
      result,
      backend: { id: "openai" as const, baseUrl: "https://api.openai.com", model: modelId },
      model: modelId,
    };
  }

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
