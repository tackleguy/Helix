"use client";

/**
 * Browser SpeechSynthesis wrapper. Works in all evergreen browsers.
 * Strips markdown so the model's bullets/code blocks don't get spoken.
 */

const isBrowser = typeof window !== "undefined" && "speechSynthesis" in window;

export function isTtsSupported(): boolean {
  return isBrowser;
}

/** Strip markdown bits that shouldn't be spoken. */
export function plainifyMarkdown(md: string): string {
  return md
    // Remove fenced code blocks entirely
    .replace(/```[\s\S]*?```/g, " [code block] ")
    // Inline code: keep contents
    .replace(/`([^`]+)`/g, "$1")
    // Links: keep label only
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Bold / italic / strike
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    // Headings & quote markers at line start
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    // Bullets / numbered lists
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Horizontal rules
    .replace(/^-{3,}$/gm, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export interface TtsHandle {
  stop: () => void;
}

export function speak(
  text: string,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
  } = {},
): TtsHandle | null {
  if (!isBrowser) return null;
  const synth = window.speechSynthesis;
  // Cancel anything in-flight; we only support one utterance at a time.
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(plainifyMarkdown(text));
  utter.lang = navigator.language || "en-US";
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.onstart = () => options.onStart?.();
  utter.onend = () => options.onEnd?.();
  utter.onerror = (ev) => options.onError?.(ev.error || "speech error");

  synth.speak(utter);

  return {
    stop: () => synth.cancel(),
  };
}

export function stopSpeaking(): void {
  if (isBrowser) window.speechSynthesis.cancel();
}
