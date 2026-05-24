/**
 * Markers the chat route emits inline to delimit reasoning-model thinking.
 * Use rare control chars (U+241E SYMBOL FOR RECORD SEPARATOR) so they're
 * vanishingly unlikely to appear in legitimate model output.
 */
export const THINK_OPEN = "␞THINK␞";
export const THINK_CLOSE = "␞/THINK␞";

export interface ParsedMessage {
  thinking: string;
  thinkingOpen: boolean;
  content: string;
}

/**
 * Pull the thinking block out of an in-progress stream. Returns the
 * thinking text, whether the block is still open (no close marker yet),
 * and the remaining visible content.
 */
export function parseStream(raw: string): ParsedMessage {
  const openIdx = raw.indexOf(THINK_OPEN);
  if (openIdx === -1) {
    return { thinking: "", thinkingOpen: false, content: raw };
  }
  const afterOpen = openIdx + THINK_OPEN.length;
  const closeIdx = raw.indexOf(THINK_CLOSE, afterOpen);

  if (closeIdx === -1) {
    return {
      thinking: raw.slice(afterOpen),
      thinkingOpen: true,
      content: raw.slice(0, openIdx),
    };
  }

  const thinking = raw.slice(afterOpen, closeIdx);
  const content =
    raw.slice(0, openIdx) + raw.slice(closeIdx + THINK_CLOSE.length);
  return { thinking, thinkingOpen: false, content };
}
