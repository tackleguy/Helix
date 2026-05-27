/** Rough token estimate (~4 chars per token). Good enough for local UI counters. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function sumMessageTokens(
  messages: Array<{ content: string; tokensIn?: number | null; tokensOut?: number | null }>,
): { in: number; out: number } {
  let tokensIn = 0;
  let tokensOut = 0;
  for (const m of messages) {
    tokensIn += m.tokensIn ?? estimateTokens(m.content);
    tokensOut += m.tokensOut ?? 0;
  }
  return { in: tokensIn, out: tokensOut };
}
