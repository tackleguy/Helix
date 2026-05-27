import { z } from "zod";

export const CHAT_BACKEND_IDS = ["llama-server", "ollama", "lmstudio"] as const;
export type ChatBackendId = (typeof CHAT_BACKEND_IDS)[number];

export const AttachmentSchema = z.object({
  type: z.enum(["pdf", "image", "text"]),
  name: z.string().min(1).max(256),
  data: z.string().min(1),
  mime: z.string().optional(),
});

export type AttachmentInput = z.infer<typeof AttachmentSchema>;

export const ChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  regenerate: z.boolean().optional(),
  continue: z.boolean().optional(),
  editLastUser: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface StoredAttachment {
  type: "pdf" | "image" | "text";
  name: string;
  mime?: string;
  excerpt?: string;
  dataUrl?: string;
}

export interface ChatMessageDto {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: StoredAttachment[];
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: number;
}

export interface SessionDto {
  id: string;
  title: string;
  model: string | null;
  systemPrompt: string | null;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}
