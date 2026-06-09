import { apiError, parseJsonBody } from "@/lib/api";
import { logServer } from "@/lib/logger";
import { ChatRequestSchema, type ChatRequest } from "@/lib/chat/types";
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
import { resolveCloudModelId } from "@/lib/chat/cloud-model";
import { hasCloudChat, isVercelDeploy } from "@/lib/env";
import { loadAppSettings } from "@/lib/settings";
import { resolveSystemPrompt } from "@/lib/study/resolve-system";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function titleFromFirstMessage(text: string) {
  const t = text.trim();
  return t.length > 40 ? t.slice(0, 40) + "…" : t;
}

function sseStream(
  assistantId: string,
  backend: { id: string; model: string },
  model: string,
  result: Awaited<ReturnType<typeof streamChat>>["result"],
  prefix = "",
  onDone?: (content: string) => void,
) {
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
        onDone?.(acc);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", tokensOut: estimateTokens(acc) })}\n\n`,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream failed";
        onDone?.(acc || `_Error: ${msg}_`);
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
}

async function handleVercelChat(data: ChatRequest) {
  const {
    message,
    attachments,
    history = [],
    model: modelOverride,
    systemPrompt,
    continue: shouldContinue,
  } = data;

  let coreMessages = [...history];

  if (shouldContinue) {
    const last = coreMessages.at(-1);
    if (!last || last.role !== "assistant") {
      return apiError("nothing to continue", 400, "NO_ASSISTANT");
    }
  } else {
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
    coreMessages = [...coreMessages, { role: "user" as const, content }];
  }

  if (coreMessages.length === 0) {
    return apiError("no messages to respond to", 400, "NO_MESSAGES");
  }

  const assistantId = uid();
  const prefix =
    shouldContinue && coreMessages.at(-1)?.role === "assistant"
      ? coreMessages.at(-1)!.content
      : "";

  const system =
    systemPrompt?.trim() ||
    resolveSystemPrompt({
      sessionModel: modelOverride,
      sessionSystemPrompt: systemPrompt,
    });

  const { result, backend, model } = await streamChat({
    model: resolveCloudModelId(modelOverride),
    system,
    messages: coreMessages,
  });

  return sseStream(assistantId, backend, model, result, prefix);
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

  if (isVercelDeploy() && !hasCloudChat()) {
    return apiError(
      "Helix on Vercel cannot reach local Ollama or LM Studio. Add HF_API_KEY (recommended) or OPENAI_API_KEY in Vercel → Project → Settings → Environment Variables, or run `npm run dev` locally for local models.",
      503,
      "CLOUD_NO_BACKEND",
    );
  }

  if (isVercelDeploy()) {
    try {
      return await handleVercelChat(parsed.data);
    } catch (err) {
      logServer("error", "vercel chat stream failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return apiError(
        err instanceof Error ? err.message : "chat failed",
        502,
        "CHAT_FAILED",
      );
    }
  }

  try {
    const session = getSessionOrThrow(sessionId);

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
    const system = resolveSystemPrompt({
      sessionModel: session.model,
      sessionSystemPrompt: session.systemPrompt,
      sessionTitle: session.title,
    });
    const { result, backend, model } = await streamChat({
      backendId: settings.defaultChatModel,
      model: resolveCloudModelId(session.model),
      system,
      messages: coreMessages,
    });

    if (!session.model) {
      updateSession(sessionId, { model });
    }

    return sseStream(assistantId, backend, model, result, prefix, (acc) => {
      updateMessage(assistantId, {
        content: acc,
        tokensOut: estimateTokens(acc),
      });
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
