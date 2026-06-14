import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { uid } from "@/lib/utils";
import type { ImageDto } from "./types";

function toDto(row: typeof images.$inferSelect): ImageDto {
  return {
    id: row.id,
    prompt: row.prompt,
    negativePrompt: row.negativePrompt,
    model: row.model,
    paramsJson: row.paramsJson,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    sessionId: row.sessionId,
    createdAt: row.createdAt.getTime(),
  };
}

export function listImages(limit = 48, before?: number): ImageDto[] {
  const db = getDb();
  const rows = db
    .select()
    .from(images)
    .orderBy(desc(images.createdAt))
    .limit(limit)
    .all()
    .filter((r) => (before ? r.createdAt.getTime() < before : true));
  return rows.map(toDto);
}

export function getImage(id: string): ImageDto | null {
  const db = getDb();
  const row = db.select().from(images).where(eq(images.id, id)).get();
  return row ? toDto(row) : null;
}

export function insertImage(input: {
  id?: string;
  prompt: string;
  negativePrompt?: string | null;
  model?: string | null;
  paramsJson?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  sessionId?: string | null;
}): ImageDto {
  const db = getDb();
  const id = input.id ?? uid();
  const now = new Date();
  const row = {
    id,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt ?? null,
    model: input.model ?? null,
    paramsJson: input.paramsJson ?? null,
    url: input.url,
    thumbnailUrl: input.thumbnailUrl ?? input.url,
    sessionId: input.sessionId ?? null,
    createdAt: now,
  };
  db.insert(images).values(row).run();
  return toDto(row);
}

export function deleteImage(id: string) {
  const db = getDb();
  db.delete(images).where(eq(images.id, id)).run();
}

export { toDto as toImageDto };
