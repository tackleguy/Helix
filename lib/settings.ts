import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export const AppSettingsSchema = z.object({
  theme: z.enum(["dark", "graphite", "porcelain", "vapor"]).default("dark"),
  language: z.string().default("en"),
  defaultChatModel: z.string().default("llama-server"),
  defaultImageModel: z.string().default("flux-schnell"),
  defaultVoice: z.string().default("coqui"),
  accentColor: z.string().default("#5eead4"),
  replicateApiToken: z.string().nullable().optional(),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

const SETTINGS_KEY = "app_settings";

export const DEFAULT_APP_SETTINGS: AppSettings = AppSettingsSchema.parse({});

export function loadAppSettings(): AppSettings {
  try {
    const db = getDb();
    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .get();
    if (!row) return DEFAULT_APP_SETTINGS;
    return AppSettingsSchema.parse(JSON.parse(row.valueJson));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(partial: Partial<AppSettings>): AppSettings {
  const db = getDb();
  const current = loadAppSettings();
  const merged = AppSettingsSchema.parse({ ...current, ...partial });
  db.insert(settings)
    .values({ key: SETTINGS_KEY, valueJson: JSON.stringify(merged) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { valueJson: JSON.stringify(merged) },
    })
    .run();
  return merged;
}
