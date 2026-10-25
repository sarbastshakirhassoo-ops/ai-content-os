// ─────────────────────────────────────────────────────────────────────────────
// Freshness-bewusster Research-Cache in derselben SQLite-Datei wie der Trace.
//
// Kernregel aus docs/BRAIN-V1-PLAN.md Abschnitt 4: ein Treffer wird nur
// verwendet, wenn sein Alter unter der Lebensdauer SEINER Klasse liegt.
// REALTIME_SENSITIVE hat die Lebensdauer null und umgeht den Cache immer.
// Ein Cache-Treffer darf niemals eine Aktualitätsfrage beantworten.
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from '../db.ts'
import type { Freshness } from '../types.ts'
import type { CacheState, ResearchDocument } from './types.ts'

/** Lebensdauer je Aktualitätsklasse. Erste tatsächliche Verwendung der Tabelle. */
export const FRESHNESS_TTL_MS: Record<Freshness, number> = {
  EVERGREEN: 90 * 24 * 60 * 60 * 1000,
  SLOW_CHANGING: 14 * 24 * 60 * 60 * 1000,
  CURRENT: 6 * 60 * 60 * 1000,
  REALTIME_SENSITIVE: 0,
}

/**
 * Schlüssel aus der NUTZERFRAGE und der Aktualitätsklasse.
 *
 * Zuerst waren es die vom Planner erzeugten Suchbegriffe. Das war falsch: das
 * Modell formuliert bei derselben Frage jedes Mal andere Begriffe, der Cache
 * traf deshalb praktisch nie (gemessen 2026-09-11: zwei identische Fragen
 * hintereinander, beide Male "miss"). Die Frage ist stabil, die Begriffe sind
 * es nicht.
 *
 * Die Klasse gehört in den Schlüssel: dieselbe Frage unter strengerer Klasse
 * darf keinen älteren Eintrag treffen.
 */
export function cacheKey(question: string, freshness: Freshness): string {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, ' ')
  return `${freshness}::${normalized}`
}

interface CacheRow { docs_json: string; stored_at: string; freshness: string }

export function readCache(key: string, freshness: Freshness):
  { state: CacheState; documents: ResearchDocument[]; storedAt?: string } {
  const ttl = FRESHNESS_TTL_MS[freshness]
  if (ttl <= 0) return { state: 'bypass', documents: [] }

  const row = getDb()
    .prepare('SELECT docs_json, stored_at, freshness FROM research_cache WHERE key = ?')
    .get(key) as unknown as CacheRow | undefined
  if (!row) return { state: 'miss', documents: [] }

  const age = Date.now() - new Date(row.stored_at).getTime()
  if (!Number.isFinite(age) || age > ttl) return { state: 'miss', documents: [] }

  try {
    return {
      state: 'hit',
      documents: JSON.parse(row.docs_json) as ResearchDocument[],
      storedAt: row.stored_at,
    }
  } catch {
    // Kaputter Eintrag ist ein Miss, kein Fehler.
    return { state: 'miss', documents: [] }
  }
}

export function writeCache(key: string, freshness: Freshness, documents: ResearchDocument[]): void {
  if (FRESHNESS_TTL_MS[freshness] <= 0 || documents.length === 0) return
  getDb()
    .prepare(
      `INSERT INTO research_cache (key, freshness, stored_at, docs_json)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET stored_at = excluded.stored_at, docs_json = excluded.docs_json`,
    )
    .run(key, freshness, new Date().toISOString(), JSON.stringify(documents))
}

export function countCacheEntries(): number {
  const r = getDb().prepare('SELECT COUNT(*) AS n FROM research_cache').get() as unknown as { n: number }
  return r.n
}
