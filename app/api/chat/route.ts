import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api";
import { logServer } from "@/lib/logger";
import { ChatRequestSchema } from "@/lib/chat/types";
import {
  buildUserContent,
  processAttachments,
} from "@/lib/chat/attachments";
import {
  deleteMessage,
  getMessages,
  getSessionOrThrow,
  insertMessage,
  updateMessage,
  updateSession,
} from "@/lib/chat/repository";
import { streamChat } from "@/lib/chat/stream";
import { estimateTokens } from "@/lib/chat/tokens";
import { isCloudOnlyDeploy } from "@/lib/env";
import { loadAppSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function titleFromFirstMessage(text: string) {
  const t = text.trim();
  return t.length > 40 ? t.slice(0, 40) + "…" : t;
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, ChatRequestSchema);
  if ("error" in parsed) return parsed.error;

  const {
    sessionId,
    message,
    attachments,
    regenerate,
    continue: shouldContinue,
    editLastUser,
  } = parsed.data;

  try {
    const session = getSessionOrThrow(sessionId);

    if (isCloudOnlyDeploy() && !regenerate && !shouldContinue && editLastUser === undefined) {
      return apiError(
        "Chat on helix.vercel.app cannot reach local models on your machine. Run Helix locally (npm run dev) with Ollama or LM Studio, or add OPENAI_API_KEY in Vercel project settings for cloud chat.",
        503,
        "CLOUD_NO_BACKEND",
      );
    }

    let history = getMessages(sessionId);
    const isFirstExchange = history.length === 0;

    if (regenerate) {
      const lastAssistant = [...history]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant) deleteMessage(lastAssistant.id);
      history = getMessages(sessionId);
    }

    if (editLastUser !== undefined) {
      const lastUserIdx = history.reduce(
        (acc, m, i) => (m.role === "user" ? i : acc),
        -1,
      );
      if (lastUserIdx < 0) {
        return apiError("no user message to edit", 400, "NO_USER_MESSAGE");
      }
      for (const m of history.slice(lastUserIdx)) {
        deleteMessage(m.id);
      }
      history = getMessages(sessionId);

      const processed = attachments?.length
        ? await processAttachments(attachments)
        : [];
      const content = buildUserContent(editLastUser, processed);
      if (!content.trim()) {
        return apiError("empty message", 400, "EMPTY_MESSAGE");
      }
      insertMessage({
        sessionId,
        role: "user",
        content,
        attachmentsJson: processed.length
          ? JSON.stringify(processed.map((p) => p.stored))
          : null,
        tokensIn: estimateTokens(content),
      });
      history = getMessages(sessionId);
    } else if (!shouldContinue && !regenerate) {
      const hasPayload =
        (message !== undefined && message.trim().length > 0) ||
        (attachments !== undefined && attachments.length > 0);
      if (!hasPayload) {
        return apiError("empty message", 400, "EMPTY_MESSAGE");
      }

      const processed = attachments?.length
        ? await processAttachments(attachments)
        : [];
      const content = buildUserContent(message ?? "", processed);
      insertMessage({
        sessionId,
        role: "user",
        content,
        attachmentsJson: processed.length
          ? JSON.stringify(processed.map((p) => p.stored))
          : null,
        tokensIn: estimateTokens(content),
      });

      if (isFirstExchange) {
        updateSession(sessionId, { title: titleFromFirstMessage(content) });
      }
      history = getMessages(sessionId);
    } else if (shouldContinue) {
      const lastAssistant = [...history]
        .reverse()
        .find((m) => m.role === "assistant");
      if (!lastAssistant) {
        return apiError("nothing to continue", 400, "NO_ASSISTANT");
      }
    }

    const coreMessages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    if (coreMessages.length === 0) {
      return apiError("no messages to respond to", 400, "NO_MESSAGES");
    }

    let assistantId: string;
    let prefix = "";

    if (shouldContinue) {
      const lastAssistant = [...history]
        .reverse()
        .find((m) => m.role === "assistant")!;
      assistantId = lastAssistant.id;
      prefix = lastAssistant.content;
    } else {
      assistantId = insertMessage({
        sessionId,
        role: "assistant",
        content: "",
        tokensOut: 0,
      });
    }

    const settings = loadAppSettings();
    const { result, backend, model } = await streamChat({
      backendId: settings.defaultChatModel,
      model: session.model,
      system: session.systemPrompt,
      messages: coreMessages,
    });

    if (!session.model) {
      updateSession(sessionId, { model });
    }

    const encoder = new TextEncoder();
    let acc = prefix;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "meta", assistantId, backend: backend.id, model })}\n\n`,
          ),
        );

        try {
          for await (const chunk of result.textStream) {
            acc += chunk;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "delta", text: chunk })}\n\n`,
              ),
            );
          }
          const tokensOut = estimateTokens(acc);
          updateMessage(assistantId, { content: acc, tokensOut });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", tokensOut })}\n\n`,
            ),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "stream failed";
          updateMessage(assistantId, {
            content: acc || `_Error: ${msg}_`,
            tokensOut: estimateTokens(acc),
          });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    logServer("error", "chat stream failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError(
      err instanceof Error ? err.message : "chat failed",
      502,
      "CHAT_FAILED",
    );
  }
}
