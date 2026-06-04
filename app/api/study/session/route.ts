import { apiError } from "@/lib/api";
import { createSession } from "@/lib/chat/repository";
import { STUDY_MODEL_ID, STUDY_SYSTEM_PROMPT } from "@/lib/study/constants";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates a chat session locked to Study Helix (study-only model + system prompt). */
export async function POST() {
  try {
    const row = createSession({
      title: "Study session",
      model: STUDY_MODEL_ID,
      systemPrompt: STUDY_SYSTEM_PROMPT,
    });
    return Response.json({ session: row }, { status: 201 });
  } catch (err) {
    logServer("error", "study session POST failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to create study session", 500);
  }
}
