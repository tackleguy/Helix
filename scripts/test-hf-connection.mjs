import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const apiKey = process.env.HF_API_KEY?.trim();
const model =
  process.env.HF_MODEL?.trim() || "Qwen/Qwen2.5-7B-Instruct";
const baseUrl =
  process.env.HF_BASE_URL?.trim() || "https://router.huggingface.co/v1";

if (!apiKey) {
  console.error("HF_API_KEY missing in .env.local");
  process.exit(1);
}

const provider = createOpenAI({
  baseURL: baseUrl.replace(/\/$/, ""),
  apiKey,
});

const result = streamText({
  model: provider.chat(model),
  messages: [{ role: "user", content: "Reply with exactly: HF_OK" }],
});

let text = "";
for await (const chunk of result.textStream) text += chunk;

console.log("model:", model);
console.log("response:", text.trim());
if (!/HF_OK|ok/i.test(text)) process.exit(1);
console.log("HF connection OK");
