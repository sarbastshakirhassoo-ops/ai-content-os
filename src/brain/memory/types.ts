// ─────────────────────────────────────────────────────────────────────────────
// Memory — Typen
//
// Fünf Arten, bewusst getrennt, weil sie unterschiedlich entstehen, altern und
// gelöscht werden:
//
//   user         Dauerhaft Relevantes über den Nutzer: Ziele, Rolle, Vorlieben
//   project      Laufende Vorhaben
//   decision     Getroffene Entscheidungen samt Begründung
//   knowledge    Rechercheergebnisse mit Quellen und Abrufdatum
//   conversation Gesprächskontext, der über eine einzelne Anfrage hinaus zählt
//
// Schreibregel, siehe docs/BRAIN-V1-PLAN.md: es wird NICHT alles gespeichert.
// user, project, decision und conversation entstehen ausschliesslich aus dem,
// was der Nutzer selbst geschrieben hat. Niemals aus Internetinhalten — die
// sind untrusted input und hätten sonst einen Weg ins Langzeitgedächtnis.
// ─────────────────────────────────────────────────────────────────────────────

import type { Freshness } from '../types.ts'

export type MemoryKind = 'user' | 'project' | 'decision' | 'knowledge' | 'conversation'

export const MEMORY_KINDS: MemoryKind[] = [
  'user', 'project', 'decision', 'knowledge', 'conversation',
]

/** Arten, die der Planner aus der Nutzernachricht vorschlagen darf. */
export const USER_WRITABLE_KINDS: MemoryKind[] = ['user', 'project', 'decision']

export interface MemoryEntry {
  id: string
  kind: MemoryKind
  title: string
  content: string
  /** Wie schnell dieser Eintrag altert. Steuert, ob er noch als Fakt gilt. */
  freshness: Freshness
  createdAt: string
  updatedAt: string
  /** Lauf, aus dem der Eintrag stammt. null, wenn direkt vom Nutzer angelegt. */
  sourceRunId: string | null
  /** Nur bei knowledge: die URLs, auf denen der Eintrag beruht. */
  sourceUrls: string[]
}

/** Vom Planner vorgeschlagener Eintrag. Noch nicht gespeichert. */
export interface MemoryWrite {
  kind: MemoryKind
  title: string
  content: string
}

export interface RecallHit {
  entry: MemoryEntry
  /** Relevanz aus der Volltextsuche. Kleiner ist besser (bm25). */
  score: number
  /** Ist der Eintrag für seine Klasse noch aktuell genug? */
  stale: boolean
}
