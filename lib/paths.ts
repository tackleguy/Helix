import { homedir } from "node:os";
import { join } from "node:path";

export const HELIX_HOME = join(homedir(), ".helix");
export const HELIX_DB_PATH = join(HELIX_HOME, "helix.db");
export const HELIX_LOG_PATH = join(HELIX_HOME, "logs", "server.log");
export const HELIX_MIGRATIONS_DIR = join(process.cwd(), "lib", "db", "migrations");
