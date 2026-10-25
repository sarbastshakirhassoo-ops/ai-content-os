// ─────────────────────────────────────────────────────────────────────────────
// Research Layer — Einstiegspunkt.
//
// Der Orchestrator recherchiert nicht selbst. Er übergibt hierher, was der
// Planner ermittelt hat, und bekommt strukturierte Ergebnisse zurück.
//
// Ablauf:
//   Cache prüfen (klassenabhängig)
//   -> Quellen auswählen
//   -> parallel abrufen, Fehler je Quelle gekapselt
//   -> normalisieren, deduplizieren, bewerten
//   -> Volltext der besten Treffer
//   -> Cache schreiben
// ─────────────────────────────────────────────────────────────────────────────

import { cacheKey, readCache, writeCache } from './cache.ts'
import { assessEvidence, type EvidenceAssessment } from './confidence.ts'
import { enrichWithFullText } from './extract.ts'
import { rank, dedupe } from './rank.ts'
import { selectSources, shouldFailForTest } from './registry.ts'
import type {
  Domain,
  ResearchDocument,
  ResearchOutcome,
  SourceAttempt,
  SourceDefinition,
} from './types.ts'
import type { Freshness } from '../types.ts'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const PER_SOURCE_LIMIT = 6
const FINAL_LIMIT = 10
const FULLTEXT_LIMIT = 4

export interface ResearchRequest {
  originalQuestion: string
  searchQueries: string[]
  freshness: Freshness
  domains: Domain[]
  signal?: AbortSignal
}

async function runSource(
  source: SourceDefinition,
  query: string,
  req: ResearchRequest,
): Promise<{ attempt: SourceAttempt; docs: ResearchDocument[] }> {
  const started = Date.now()
  try {
    if (shouldFailForTest(source.id)) {
      throw new Error(`Testausfall erzwungen über RESEARCH_FAIL_SOURCES für "${source.id}".`)
    }
    const docs = await source.fetch({
      query,
      originalQuestion: req.originalQuestion,
      freshness: req.freshness,
      signal: req.signal,
      limit: PER_SOURCE_LIMIT,
    })
    return {
      attempt: {
        sourceId: source.id,
        query,
        status: docs.length > 0 ? 'ok' : 'empty',
        count: docs.length,
        durationMs: Date.now() - started,
      },
      docs,
    }
  } catch (e) {
    // Der Ausfall einer Quelle bricht den Lauf nicht ab. Er wird protokolliert.
    return {
      attempt: {
        sourceId: source.id,
        query,
        status: 'failed',
        count: 0,
        durationMs: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
      },
      docs: [],
    }
  }
}

export async function research(req: ResearchRequest): Promise<ResearchOutcome> {
  const started = Date.now()

  // Ohne Suchanfragen des Planners wird die Nutzerfrage selbst verwendet.
  const queries = req.searchQueries.length > 0
    ? req.searchQueries.slice(0, 3)
    : [req.originalQuestion]

  const sources = selectSources(req.domains, req.freshness)
  const selectedSources = sources.map((s) => s.id)

  // ── Cache ──────────────────────────────────────────────────────────────────
  const key = cacheKey(req.originalQuestion, req.freshness)
  const cached = readCache(key, req.freshness)
  if (cached.state === 'hit') {
    return {
      documents: cached.documents,
      attempts: [],
      cache: 'hit',
      durationMs: Date.now() - started,
      selectedSources,
      queries,
      evidence: assessEvidence(cached.documents, req.freshness),
    }
  }

  if (sources.length === 0) {
    return {
      documents: [],
      attempts: [],
      cache: cached.state,
      durationMs: Date.now() - started,
      selectedSources,
      queries,
      evidence: assessEvidence([], req.freshness),
    }
  }

  // ── Abruf ──────────────────────────────────────────────────────────────────
  //
  // Quellen laufen parallel, die Anfragen INNERHALB einer Quelle seriell.
  // Nur so lässt sich ein quellenspezifisches Ratenlimit einhalten, ohne alle
  // anderen Quellen auszubremsen.
  const perSource = await Promise.all(
    sources.map(async (source) => {
      const out: { attempt: SourceAttempt; docs: ResearchDocument[] }[] = []
      for (let i = 0; i < queries.length; i++) {
        if (i > 0 && source.minIntervalMs) await sleep(source.minIntervalMs)
        out.push(await runSource(source, queries[i], req))
      }
      return out
    }),
  )
  const results = perSource.flat()

  const attempts = results.map((r) => r.attempt)
  const raw = results.flatMap((r) => r.docs)

  // ── Aufbereiten ────────────────────────────────────────────────────────────
  const unique = dedupe(raw)
  const ranked = rank(unique, req.originalQuestion, FINAL_LIMIT)

  const { documents } = await enrichWithFullText(ranked, {
    max: FULLTEXT_LIMIT,
    signal: req.signal,
  })

  writeCache(key, req.freshness, documents)

  return {
    documents,
    attempts,
    cache: cached.state,
    durationMs: Date.now() - started,
    selectedSources,
    queries,
    evidence: assessEvidence(documents, req.freshness),
  }
}

export { listSources, getSource } from './registry.ts'
export { countCacheEntries } from './cache.ts'
export { buildEnvelope, ENVELOPE_RULES } from './envelope.ts'
export { assessEvidence, describeForPrompt } from './confidence.ts'
export type { EvidenceAssessment, ConfidenceLevel } from './confidence.ts'
export type { ResearchOutcome, ResearchDocument, SourceAttempt, Domain } from './types.ts'
