// ─────────────────────────────────────────────────────────────────────────────
// SQLite-Verbindung des Brains.
//
// Verwendet `node:sqlite` aus der Node-Standardbibliothek — keine zusätzliche
// Abhängigkeit, kein nativer Build. Der Plan nannte better-sqlite3; das ist
// seit Node 22 nicht mehr nötig. Bekannte Einschränkung: node:sqlite ist jung,
// die API kann sich in künftigen Node-Versionen noch ändern.
//
// Ab Schritt 6 nutzt der Memory-Store dieselbe Datei.
// ─────────────────────────────────────────────────────────────────────────────

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

let db: DatabaseSync | null = null

function dbPath(): string {
  return resolve(process.cwd(), process.env.BRAIN_DB_PATH?.trim() || './data/brain.db')
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id            TEXT PRIMARY KEY,
  query         TEXT NOT NULL,
  status        TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  completed_at  TEXT,
  duration_ms   INTEGER,
  answer        TEXT,
  error         TEXT,
  error_kind    TEXT,
  plan_json     TEXT
);

CREATE TABLE IF NOT EXISTS steps (
  run_id        TEXT NOT NULL,
  seq           INTEGER NOT NULL,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL,
  component     TEXT,
  model         TEXT,
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  duration_ms   INTEGER,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  detail        TEXT,
  error         TEXT,
  PRIMARY KEY (run_id, seq),
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_cache (
  key        TEXT PRIMARY KEY,
  freshness  TEXT NOT NULL,
  stored_at  TEXT NOT NULL,
  docs_json  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  freshness     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  source_run_id TEXT,
  source_urls   TEXT
);

-- Volltextsuche. Eigene Tabelle statt External-Content: bei dieser Datenmenge
-- ist die Verdopplung des Textes bedeutungslos, der Code dafür nachvollziehbar.
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  mem_id UNINDEXED,
  title,
  content
);

CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_stored ON research_cache(stored_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_kind_title ON memory(kind, title);
CREATE INDEX IF NOT EXISTS idx_memory_updated ON memory(updated_at DESC);
`

/**
 * Spalten, die nach der ersten Version dazugekommen sind. CREATE TABLE IF NOT
 * EXISTS ergänzt keine Spalten in einer bestehenden Datei, deshalb hier
 * einzeln und idempotent.
 */
const ADDED_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: 'steps', column: 'meta_json', ddl: 'ALTER TABLE steps ADD COLUMN meta_json TEXT' },
]

function applyColumnMigrations(handle: DatabaseSync): void {
  for (const m of ADDED_COLUMNS) {
    const cols = handle.prepare(`PRAGMA table_info(${m.table})`).all() as unknown as { name: string }[]
    if (!cols.some((c) => c.name === m.column)) handle.exec(m.ddl)
  }
}

/** Öffnet die Datenbank beim ersten Zugriff und legt das Schema an. */
export function getDb(): DatabaseSync {
  if (db) return db
  const path = dbPath()
  mkdirSync(dirname(path), { recursive: true })
  const handle = new DatabaseSync(path)
  handle.exec('PRAGMA journal_mode = WAL')
  handle.exec('PRAGMA foreign_keys = ON')
  handle.exec(SCHEMA)
  applyColumnMigrations(handle)
  db = handle
  return db
}

/** Nur für Tests: erzwingt beim nächsten Zugriff eine neue Verbindung. */
export function closeDb(): void {
  db?.close()
  db = null
}

export function dbLocation(): string {
  return dbPath()
}
