import type { AttachmentInput, StoredAttachment } from "./types";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_BYTES = 512 * 1024;

export interface ProcessedAttachment {
  stored: StoredAttachment;
  textAppend: string;
}

export async function processAttachments(
  attachments: AttachmentInput[],
): Promise<ProcessedAttachment[]> {
  const out: ProcessedAttachment[] = [];

  for (const att of attachments) {
    if (att.type === "text") {
      const buf = Buffer.from(att.data, "base64");
      if (buf.byteLength > MAX_TEXT_BYTES) {
        throw new Error(`File too large: ${att.name}`);
      }
      const text = buf.toString("utf8");
      out.push({
        stored: { type: "text", name: att.name, mime: att.mime, excerpt: text.slice(0, 200) },
        textAppend: `\n\n--- ${att.name} ---\n${text}`,
      });
      continue;
    }

    if (att.type === "image") {
      const mime = att.mime ?? "image/png";
      const dataUrl = `data:${mime};base64,${att.data}`;
      out.push({
        stored: { type: "image", name: att.name, mime, dataUrl },
        textAppend: `\n\n[Image attached: ${att.name}]`,
      });
      continue;
    }

    if (att.type === "pdf") {
      const buf = Buffer.from(att.data, "base64");
      if (buf.byteLength > MAX_PDF_BYTES) {
        throw new Error(`PDF too large: ${att.name}`);
      }
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();
      await parser.destroy();
      const text = parsed.text?.trim() ?? "";
      out.push({
        stored: {
          type: "pdf",
          name: att.name,
          mime: "application/pdf",
          excerpt: text.slice(0, 200),
        },
        textAppend: text
          ? `\n\n--- PDF: ${att.name} ---\n${text}`
          : `\n\n[PDF attached: ${att.name} — no extractable text]`,
      });
    }
  }

  return out;
}

export function buildUserContent(
  base: string,
  processed: ProcessedAttachment[],
): string {
  const extra = processed.map((p) => p.textAppend).join("");
  return (base + extra).trim();
}
