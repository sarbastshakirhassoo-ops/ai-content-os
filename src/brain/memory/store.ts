// ─────────────────────────────────────────────────────────────────────────────
// Memory Store — Schreiben, Lesen, Löschen.
//
// Liegt in derselben SQLite-Datei wie Trace und Research-Cache. Die
// Volltextsuche ist eine eigene FTS5-Tabelle, die beim Schreiben mitgepflegt
// wird. Bewusst ohne Trigger und ohne External-Content-Tabelle: der
// Mehraufwand ist bei dieser Datenmenge bedeutungslos, und der Code bleibt
// nachvollziehbar.
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from '../db.ts'
import { scrubSecrets } from '../trace.ts'
import type { Freshness } from '../types.ts'
import {
  MEMORY_KINDS,
  type MemoryEntry,
  type MemoryKind,
  type MemoryWrite,
} from './types.ts'

const MAX_TITLE = 160
const MAX_CONTENT = 4_000

interface MemoryRow {
  id: string; kind: string; title: string; content: string; freshness: string
  created_at: string; updated_at: string; source_run_id: string | null
  source_urls: string | null
}

function toEntry(r: MemoryRow): MemoryEntry {
  let urls: string[] = []
  try {
    urls = r.source_urls ? (JSON.parse(r.source_urls) as string[]) : []
  } catch {
    urls = []
  }
  return {
    id: r.id,
    kind: r.kind as MemoryKind,
    title: r.title,
    content: r.content,
    freshness: r.freshness as Freshness,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    sourceRunId: r.source_run_id,
    sourceUrls: urls,
  }
}

export interface RememberInput extends MemoryWrite {
  freshness: Freshness
  sourceRunId?: string | null
  sourceUrls?: string[]
}

/**
 * Legt einen Eintrag an oder aktualisiert einen bestehenden gleicher Art und
 * gleichen Titels. Das Zusammenfassen ist Absicht: sonst sammeln sich bei
 * wiederholten Anfragen Dutzende fast identischer Einträge an.
 */
export function remember(input: RememberInput): MemoryEntry {
  const title = (input.title ?? '').trim().slice(0, MAX_TITLE)
  const content = (input.content ?? '').trim().slice(0, MAX_CONTENT)
  if (!title || !content) throw new Error('Memory-Eintrag braucht Titel und Inhalt.')
  if (!MEMORY_KINDS.includes(input.kind)) throw new Error(`Unbekannte Memory-Art: ${input.kind}`)

  const db = getDb()
  const now = new Date().toISOString()
  // Secrets dürfen auch hier nicht hineingeraten, zweite Verteidigungslinie.
  const safeTitle = scrubSecrets(title) ?? title
  const safeContent = scrubSecrets(content) ?? content

  const existing = db
    .prepare('SELECT * FROM memory WHERE kind = ? AND title = ?')
    .get(input.kind, safeTitle) as unknown as MemoryRow | undefined

  const urls = JSON.stringify(input.sourceUrls ?? [])

  if (existing) {
    db.prepare(
      `UPDATE memory SET content = ?, freshness = ?, updated_at = ?, source_run_id = ?, source_urls = ?
       WHERE id = ?`,
    ).run(safeContent, input.freshness, now, input.sourceRunId ?? null, urls, existing.id)
    db.prepare('UPDATE memory_fts SET title = ?, content = ? WHERE mem_id = ?')
      .run(safeTitle, safeContent, existing.id)
    return get(existing.id) as MemoryEntry
  }

  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO memory (id, kind, title, content, freshness, created_at, updated_at, source_run_id, source_urls)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.kind, safeTitle, safeContent, input.freshness, now, now, input.sourceRunId ?? null, urls)
  db.prepare('INSERT INTO memory_fts (mem_id, title, content) VALUES (?, ?, ?)')
    .run(id, safeTitle, safeContent)
  return get(id) as MemoryEntry
}

export function get(id: string): MemoryEntry | null {
  const r = getDb().prepare('SELECT * FROM memory WHERE id = ?').get(id) as unknown as MemoryRow | undefined
  return r ? toEntry(r) : null
}

export function list(kind?: MemoryKind, limit = 100): MemoryEntry[] {
  const db = getDb()
  const rows = kind
    ? db.prepare('SELECT * FROM memory WHERE kind = ? ORDER BY updated_at DESC LIMIT ?').all(kind, limit)
    : db.prepare('SELECT * FROM memory ORDER BY updated_at DESC LIMIT ?').all(limit)
  return (rows as unknown as MemoryRow[]).map(toEntry)
}

export function forget(id: string): boolean {
  const db = getDb()
  const before = count()
  db.prepare('DELETE FROM memory_fts WHERE mem_id = ?').run(id)
  db.prepare('DELETE FROM memory WHERE id = ?').run(id)
  return count() < before
}

export function count(kind?: MemoryKind): number {
  const db = getDb()
  const r = kind
    ? db.prepare('SELECT COUNT(*) AS n FROM memory WHERE kind = ?').get(kind)
    : db.prepare('SELECT COUNT(*) AS n FROM memory').get()
  return (r as unknown as { n: number }).n
}

export function countByKind(): Record<MemoryKind, number> {
  const out = {} as Record<MemoryKind, number>
  for (const k of MEMORY_KINDS) out[k] = count(k)
  return out
}
