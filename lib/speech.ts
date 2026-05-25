"use client";

/**
 * Thin wrapper around the browser's SpeechRecognition API. Works in
 * Chromium-family browsers (Chrome, Edge, Arc, Brave) and Safari 14.1+.
 * Firefox doesn't ship it.
 *
 * Returns interim and final transcripts. Callers should treat the final
 * transcript as the canonical value and use interim for live UI feedback.
 */

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string; confidence: number };
  }>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface BrowserGlobals {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const g = window as unknown as BrowserGlobals;
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

export interface SpeechSession {
  stop: () => void;
}

export interface SpeechCallbacks {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

export function startSpeech(callbacks: SpeechCallbacks): SpeechSession | null {
  const Ctor = getSpeechRecognition();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || "en-US";

  rec.onresult = (ev) => {
    let interim = "";
    let final = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const result = ev.results[i];
      const piece = result[0].transcript;
      if (result.isFinal) final += piece;
      else interim += piece;
    }
    if (interim) callbacks.onInterim?.(interim);
    if (final) callbacks.onFinal?.(final);
  };

  rec.onerror = (ev) => {
    callbacks.onError?.(ev.error || "speech error");
  };

  rec.onend = () => {
    callbacks.onEnd?.();
  };

  try {
    rec.start();
  } catch (err) {
    callbacks.onError?.(err instanceof Error ? err.message : "could not start mic");
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
