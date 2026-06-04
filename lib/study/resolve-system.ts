import {
  STUDY_SYSTEM_PROMPT,
  isStudyModel,
  isStudySession,
} from "./constants";

export function resolveSystemPrompt(input: {
  sessionModel?: string | null;
  activeModel?: string | null;
  sessionSystemPrompt?: string | null;
  sessionTitle?: string | null;
}): string | undefined {
  const study =
    isStudyModel(input.sessionModel ?? input.activeModel) ||
    isStudySession({
      model: input.sessionModel,
      systemPrompt: input.sessionSystemPrompt,
      title: input.sessionTitle,
    });

  if (study) return STUDY_SYSTEM_PROMPT;
  const custom = input.sessionSystemPrompt?.trim();
  return custom || undefined;
}
