import { homedir } from "node:os";
import { join } from "node:path";

/** Writable data dir: ~/.helix locally, /tmp/helix on Vercel serverless. */
export const HELIX_HOME =
  process.env.HELIX_HOME ??
  (process.env.VERCEL === "1"
    ? join("/tmp", "helix")
    : join(homedir(), ".helix"));

export const HELIX_DB_PATH =
  process.env.HELIX_DB_PATH ?? join(HELIX_HOME, "helix.db");
export const HELIX_LOG_PATH = join(HELIX_HOME, "logs", "server.log");
export const HELIX_IMAGES_DIR = join(HELIX_HOME, "images");
export const HELIX_MIGRATIONS_DIR = join(process.cwd(), "lib", "db", "migrations");
