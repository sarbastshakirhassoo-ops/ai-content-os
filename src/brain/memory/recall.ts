// ─────────────────────────────────────────────────────────────────────────────
// Memory Recall — Volltextsuche mit Frische-Prüfung.
//
// Kernregel aus docs/BRAIN-V1-PLAN.md Abschnitt 4, hier zum zweiten Mal
// angewandt: ein Treffer darf nur dann als gültige Information gelten, wenn
// sein Alter unter der Lebensdauer SEINER Klasse liegt. REALTIME_SENSITIVE hat
// die Lebensdauer null und ist damit sofort veraltet — gespeichertes Wissen
// kann eine Echtzeitfrage grundsätzlich nicht beantworten.
//
// Veraltete Treffer werden nicht weggeworfen, sondern als `stale` markiert.
// Sie taugen weiterhin als Kontext ("darüber haben wir gesprochen"), nur nicht
// mehr als Beleg.
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from '../db.ts'
import { FRESHNESS_TTL_MS } from '../research/cache.ts'
import type { Freshness } from '../types.ts'
import type { MemoryEntry, MemoryKind, RecallHit } from './types.ts'

/**
 * FTS5 interpretiert viele Zeichen als Operatoren. Eine Nutzerfrage darf die
 * Suche nicht zum Absturz bringen, deshalb wird jedes Wort als Literal
 * behandelt und mit OR verknüpft.
 */
function toMatchQuery(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 12)
  if (words.length === 0) return ''
  return words.map((w) => `"${w}"`).join(' OR ')
}

export function isStale(entry: MemoryEntry): boolean {
  const ttl = FRESHNESS_TTL_MS[entry.freshness as Freshness]
  if (ttl <= 0) return true
  const age = Date.now() - new Date(entry.updatedAt).getTime()
  return !Number.isFinite(age) || age > ttl
}

interface HitRow {
  id: string; kind: string; title: string; content: string; freshness: string
  created_at: string; updated_at: string; source_run_id: string | null
  source_urls: string | null; score: number
}

/** Arten, die den Nutzer und seine Vorhaben beschreiben. Immer relevant. */
const PROFILE_KINDS: MemoryKind[] = ['user', 'project', 'decision']

/** Obergrenze, damit ein volles Profil den Prompt nicht sprengt. */
const PROFILE_LIMIT = 8

export interface RecallOptions {
  limit?: number
  kinds?: MemoryKind[]
  /** Auch veraltete Treffer liefern. Default true — sie sind als stale markiert. */
  includeStale?: boolean
}

/**
 * Ruft Passendes aus dem Gedächtnis ab.
 *
 * Zwei Wege, bewusst kombiniert:
 *
 * 1. `user`, `project` und `decision` werden IMMER mitgeliefert, neueste
 *    zuerst. Sie definieren, wer der Nutzer ist und woran er arbeitet. Es
 *    gibt wenige davon, und sie sind fast immer relevant.
 *
 * 2. `knowledge` und `conversation` kommen über die Volltextsuche, weil es
 *    davon viele werden können.
 *
 * Grund für Weg 1: reine Stichwortsuche scheitert im Deutschen an Komposita
 * und Beugung. Gemessen am 2026-10-25: die Frage "Welche rechtlichen Punkte
 * muss ich bei meinem geplanten Unternehmen beachten?" fand den Eintrag
 * "SaaS-Gründung Buchhaltungssoftware für deutsche Kleinunternehmen" NICHT,
 * weil FTS5 "Unternehmen" und "Kleinunternehmen" als verschiedene Wörter
 * behandelt und "geplanten" nicht auf "plant" zurückführt. Semantische Suche
 * löst das, braucht aber Embeddings und ist laut Plan erst V3.
 */
export function recall(question: string, opts: RecallOptions = {}): RecallHit[] {
  const limit = opts.limit ?? 6
  const db = getDb()
  const byId = new Map<string, RecallHit>()

  const add = (r: HitRow, score: number) => {
    if (byId.has(r.id)) return
    let urls: string[] = []
    try {
      urls = r.source_urls ? (JSON.parse(r.source_urls) as string[]) : []
    } catch {
      urls = []
    }
    const entry: MemoryEntry = {
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
    byId.set(r.id, { entry, score, stale: isStale(entry) })
  }

  // ── Weg 1: Profilwissen immer mitgeben ──────────────────────────────────
  const profileKinds = opts.kinds
    ? PROFILE_KINDS.filter((k) => opts.kinds!.includes(k))
    : PROFILE_KINDS
  if (profileKinds.length > 0) {
    const placeholders = profileKinds.map(() => '?').join(',')
    const rows = db
      .prepare(
        `SELECT *, 0 AS score FROM memory
         WHERE kind IN (${placeholders})
         ORDER BY updated_at DESC LIMIT ?`,
      )
      .all(...profileKinds, PROFILE_LIMIT) as unknown as HitRow[]
    for (const r of rows) add(r, 0)
  }

  // ── Weg 2: Volltextsuche über den Rest ──────────────────────────────────
  const match = toMatchQuery(question)
  if (match) {
    try {
      const rows = db
        .prepare(
          `SELECT m.*, bm25(memory_fts) AS score
           FROM memory_fts
           JOIN memory m ON m.id = memory_fts.mem_id
           WHERE memory_fts MATCH ?
           ORDER BY score
           LIMIT ?`,
        )
        .all(match, limit * 3) as unknown as HitRow[]
      for (const r of rows) add(r, r.score)
    } catch {
      // Eine kaputte Suchanfrage ist kein Grund, den ganzen Lauf abzubrechen.
    }
  }

  let hits = [...byId.values()]
  if (opts.kinds) hits = hits.filter((h) => opts.kinds!.includes(h.entry.kind))
  if (opts.includeStale === false) hits = hits.filter((h) => !h.stale)

  // Profilwissen zuerst, dann nach Relevanz.
  hits.sort((a, b) => {
    const pa = PROFILE_KINDS.includes(a.entry.kind) ? 0 : 1
    const pb = PROFILE_KINDS.includes(b.entry.kind) ? 0 : 1
    return pa !== pb ? pa - pb : a.score - b.score
  })

  return hits.slice(0, limit)
}

/**
 * Baut den Memory-Block für die Systemanweisung der Synthese.
 *
 * Eigener Block, getrennt vom Quellen-Envelope: Memory stammt vom Nutzer und
 * aus eigener Recherche, Internetinhalte stammen von Fremden. Die beiden
 * dürfen im Prompt nicht verschwimmen.
 */
export function buildMemoryBlock(hits: RecallHit[]): string {
  if (hits.length === 0) return ''

  const lines = hits.map((h, i) => {
    const age = h.stale ? ' — VERALTET, nur als Kontext, nicht als Fakt verwenden' : ''
    return [
      `(M${i + 1}) [${h.entry.kind}] ${h.entry.title}`,
      `     Gespeichert: ${h.entry.updatedAt.slice(0, 10)}${age}`,
      `     ${h.entry.content}`,
    ].join('\n')
  })

  return [
    '<<<GEDÄCHTNIS',
    ...lines,
    'GEDÄCHTNIS>>>',
    '',
    'Das Gedächtnis enthält, was in früheren Gesprächen festgehalten wurde.',
    'Nutze es, um den Nutzer und seine Vorhaben einzuordnen. Als VERALTET',
    'markierte Einträge sind Kontext, kein Beleg für den heutigen Stand.',
    'Erfinde keine Gedächtnisinhalte, die oben nicht stehen.',
  ].join('\n')
}
