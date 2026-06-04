import { streamWithProvider } from "@/src/services/ai/provider";
import type { AIStreamInput } from "@/src/services/ai/types";

export type StreamChatInput = AIStreamInput;

export async function streamChat(input: StreamChatInput) {
  return streamWithProvider(input);
}
