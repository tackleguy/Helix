import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { HELIX_LOG_PATH } from "@/lib/paths";

function ensureLogDir() {
  mkdirSync(dirname(HELIX_LOG_PATH), { recursive: true });
}

export function logServer(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
  try {
    ensureLogDir();
    appendFileSync(HELIX_LOG_PATH, line + "\n", "utf8");
  } catch {
    /* disk full or permissions — stderr fallback */
    console.error(`[helix:${level}]`, message, meta ?? "");
  }
}
