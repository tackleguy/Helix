import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { HELIX_DB_PATH, HELIX_MIGRATIONS_DIR } from "@/lib/paths";
import { logServer } from "@/lib/logger";
import * as schema from "@/lib/db/schema";

let db: BetterSQLite3Database<typeof schema> | null = null;

function runMigrations(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __helix_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);

  const applied = new Set(
    (
      sqlite
        .prepare("SELECT name FROM __helix_migrations")
        .all() as Array<{ name: string }>
    ).map((r) => r.name),
  );

  const migrationFile = join(HELIX_MIGRATIONS_DIR, "0000_initial.sql");
  const name = "0000_initial";

  if (!applied.has(name)) {
    const sql = readFileSync(migrationFile, "utf8");
    sqlite.exec(sql);
    sqlite
      .prepare("INSERT INTO __helix_migrations (name) VALUES (?)")
      .run(name);
    logServer("info", "applied migration", { name });
  }
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (db) return db;

  try {
    mkdirSync(dirname(HELIX_DB_PATH), { recursive: true });
    const sqlite = new Database(HELIX_DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    runMigrations(sqlite);
    db = drizzle(sqlite, { schema });
    logServer("info", "database ready", { path: HELIX_DB_PATH });
  } catch (err) {
    logServer("error", "database init failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  return db;
}

export { schema };
