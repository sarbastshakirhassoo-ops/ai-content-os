// ─────────────────────────────────────────────────────────────────────────────
// Research Layer — Typen
//
// Grundregel: Was hier ankommt, ist untrusted input. Inhalte aus dem Internet
// sind Daten, niemals Anweisungen. Siehe envelope.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Freshness } from '../types.ts'

/**
 * Vertrauensstufe. Bestimmt die Gewichtung beim Ranking und ob eine Aussage
 * als Faktenbeleg taugt.
 *
 * PRIMARY   — Behörden, Zentralbanken, Statistikämter, Originaldokumente
 * SECONDARY — seriöse Medien, Fachdatenbanken, Aggregatoren
 * COMMUNITY — Foren und Social Media; Stimmung und Hinweise, nie harte Fakten
 */
export type SourceTier = 'PRIMARY' | 'SECONDARY' | 'COMMUNITY'

export const TIER_WEIGHT: Record<SourceTier, number> = {
  PRIMARY: 3,
  SECONDARY: 2,
  COMMUNITY: 1,
}

/** Themenfelder. Der Planner ordnet jede Frage einem oder mehreren zu. */
export type Domain =
  | 'economics'
  | 'companies'
  | 'science'
  | 'medicine'
  | 'technology'
  | 'news'
  | 'general'

export const DOMAINS: Domain[] = [
  'economics', 'companies', 'science', 'medicine', 'technology', 'news', 'general',
]

/** Ehrlicher Zustand einer Quelle, analog zu den Komponenten in /api/health. */
export type SourceStatus = 'AVAILABLE' | 'NOT_CONFIGURED' | 'UNAVAILABLE'

export interface SourceQuery {
  /** Konkrete Suchanfrage, vom Planner formuliert. */
  query: string
  /** Ursprüngliche Nutzerfrage, für Quellen die keinen Suchbegriff brauchen. */
  originalQuestion: string
  freshness: Freshness
  signal?: AbortSignal
  /** Obergrenze der Ergebnisse je Quelle und Anfrage. */
  limit: number
}

/** Ein einzelnes Rechercheergebnis. Jedes Feld stammt aus der Quelle selbst. */
export interface ResearchDocument {
  title: string
  sourceId: string
  sourceName: string
  sourceTier: SourceTier
  url: string
  /** Veröffentlichungs- oder Aktualisierungsdatum, wenn die Quelle es liefert. */
  publishedAt: string | null
  /** Wann dieses System es abgerufen hat. */
  retrievedAt: string
  /** Textauszug. Bei Volltext-Extraktion länger, sonst der Anriss der Quelle. */
  excerpt: string
  /** Suchanfrage, über die es gefunden wurde. */
  query: string
  /** Wurde der Volltext der Seite geholt? */
  fullTextFetched: boolean
}

export interface SourceDefinition {
  id: string
  name: string
  tier: SourceTier
  /** Basis-URL, ausschliesslich zur Dokumentation und Anzeige. */
  baseUrl: string
  domains: Domain[]
  /** Aktualitätsklassen, die diese Quelle sinnvoll bedienen kann. */
  serves: Freshness[]
  requiresKey: boolean
  /** Name der Umgebungsvariablen, falls ein Key nötig ist. */
  envKey?: string
  /** Kurzbeschreibung für Health-Anzeige und Dokumentation. */
  description: string
  /**
   * Mindestabstand zwischen zwei Aufrufen DIESER Quelle, in Millisekunden.
   * GDELT etwa verlangt fünf Sekunden und antwortet sonst mit 429 oder
   * lässt die Verbindung auflaufen. Ohne Angabe wird nicht gedrosselt.
   */
  minIntervalMs?: number
  status(): SourceStatus
  fetch(q: SourceQuery): Promise<ResearchDocument[]>
}

/** Was bei einem Quellenaufruf tatsächlich passiert ist — für den Trace. */
export interface SourceAttempt {
  sourceId: string
  query: string
  status: 'ok' | 'empty' | 'failed' | 'skipped'
  count: number
  durationMs: number
  error?: string
}

export type CacheState = 'hit' | 'miss' | 'bypass'

export interface ResearchOutcome {
  documents: ResearchDocument[]
  /** Deterministische Einschätzung der Beleglage. Siehe confidence.ts. */
  evidence: import('./confidence.ts').EvidenceAssessment
  attempts: SourceAttempt[]
  cache: CacheState
  durationMs: number
  /** Quellen, die für diese Frage ausgewählt wurden. */
  selectedSources: string[]
  queries: string[]
}
