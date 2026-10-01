import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");
export const DEFAULT_DB_FILE = path.join(process.cwd(), "data", "majung.db");

export function openDb(file: string = process.env.DATABASE_FILE ?? DEFAULT_DB_FILE) {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

export type Db = ReturnType<typeof openDb>;

let shared: Db | undefined;

// 앱(서버)에서 쓰는 공용 연결
export function getDb(): Db {
  shared ??= openDb();
  return shared;
}
