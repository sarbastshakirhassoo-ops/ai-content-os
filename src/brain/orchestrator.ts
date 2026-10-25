// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator — zentrale Steuerung einer Anfrage.
//
// Er entscheidet und koordiniert. Er beantwortet nichts selbst, simuliert kein
// Fachwissen und recherchiert nicht selbst — dafür ist research/ zuständig.
// Jeder Schritt, den er ausführt oder bewusst überspringt, landet im Trace.
//
// Ablauf in Schritt 4:
//   plan -> research (echt) -> [memory: übersprungen] -> synthesis
// ─────────────────────────────────────────────────────────────────────────────

import { createPlan } from './plan.ts'
import { LLMError } from './providers/registry.ts'
import { research } from './research/index.ts'
import { synthesize } from './synthesis.ts'
import {
  finishRun,
  finishStep,
  savePlan,
  startRun,
  startStep,
} from './trace.ts'
import type { BrainEvent, QueryPlan } from './types.ts'
import type { ResearchDocument } from './research/types.ts'
import type { EvidenceAssessment } from './research/confidence.ts'
import { buildMemoryBlock, recall } from './memory/recall.ts'
import { remember } from './memory/store.ts'
import type { RecallHit } from './memory/types.ts'

export interface RunOptions {
  signal?: AbortSignal
  /** Wird für jedes Ereignis aufgerufen, sobald es eintritt. */
  onEvent?: (e: BrainEvent) => void
}

function errorInfo(e: unknown): { message: string; kind: string } {
  if (e instanceof LLMError) return { message: e.message, kind: e.kind }
  if (e instanceof Error) return { message: e.message, kind: 'ERROR' }
  return { message: String(e), kind: 'ERROR' }
}

export async function runQuery(query: string, opts: RunOptions = {}): Promise<string> {
  const emit = opts.onEvent ?? (() => {})
  const startedMs = Date.now()

  const runId = startRun(query)
  emit({ type: 'run', runId })

  let seq = 0
  let plan: QueryPlan

  // ── Schritt: Bedarfsanalyse ────────────────────────────────────────────────
  const planStep = startStep(runId, ++seq, 'plan', 'planner')
  try {
    const outcome = await createPlan(query, opts.signal)
    plan = outcome.plan
    savePlan(runId, plan)

    const adjNote = outcome.adjustment
      ? ` Frische verschärft von ${outcome.adjustment.from} auf ${outcome.adjustment.to} (${outcome.adjustment.trigger}).`
      : ''

    emit({
      type: 'step',
      step: finishStep(planStep, {
        status: 'completed',
        component: `llm.${outcome.completion.providerId}`,
        model: outcome.completion.model,
        inputTokens: outcome.completion.usage?.inputTokens ?? null,
        outputTokens: outcome.completion.usage?.outputTokens ?? null,
        detail:
          `Recherche nötig: ${plan.needsResearch ? 'ja' : 'nein'}. ` +
          `Memory nötig: ${plan.needsMemory ? 'ja' : 'nein'}. ` +
          `Frische: ${plan.freshness}. Sensitivität: ${plan.sensitivity}. ` +
          `Themenfelder: ${plan.domains.join(', ') || 'keine'}.` + adjNote,
        meta: {
          freshness: plan.freshness,
          domains: plan.domains,
          searchQueries: plan.searchQueries,
          adjustment: outcome.adjustment,
        },
      }),
    })
    emit({ type: 'plan', plan, adjustment: outcome.adjustment })
  } catch (e) {
    // Ohne belastbaren Plan wird nicht weitergearbeitet. Ein erfundener
    // Ersatzplan wäre genau die Art stiller Falschentscheidung, die
    // ausgeschlossen ist.
    const info = errorInfo(e)
    emit({ type: 'step', step: finishStep(planStep, { status: 'failed', error: info.message }) })
    finishRun(runId, 'failed', { error: info.message, errorKind: info.kind })
    emit({ type: 'error', message: info.message, kind: info.kind })
    throw e
  }

  // ── Schritt: Recherche ─────────────────────────────────────────────────────
  let documents: ResearchDocument[] = []
  let evidence: EvidenceAssessment | undefined
  let researchRan = false

  if (plan.needsResearch) {
    researchRan = true
    const researchStep = startStep(runId, ++seq, 'research', 'research')
    try {
      const out = await research({
        originalQuestion: query,
        searchQueries: plan.searchQueries,
        freshness: plan.freshness,
        domains: plan.domains,
        signal: opts.signal,
      })
      documents = out.documents
      evidence = out.evidence

      const ok = out.attempts.filter((a) => a.status === 'ok')
      const failed = out.attempts.filter((a) => a.status === 'failed')
      const empty = out.attempts.filter((a) => a.status === 'empty')

      // Der Ausfall einzelner Quellen ist kein Fehlschlag des Schritts, solange
      // andere geliefert haben. Der Trace zeigt beides.
      emit({
        type: 'step',
        step: finishStep(researchStep, {
          status: documents.length > 0 ? 'completed' : 'failed',
          detail:
            `Cache: ${out.cache}. Quellen ausgewählt: ${out.selectedSources.join(', ') || 'keine'}. ` +
            `Suchanfragen: ${out.queries.length}. Aufrufe: ${out.attempts.length} ` +
            `(${ok.length} mit Treffern, ${empty.length} ohne, ${failed.length} fehlgeschlagen). ` +
            `Ergebnisse nach Deduplizierung und Ranking: ${documents.length}. ` +
            `Beleglage: ${out.evidence.level}.` +
            (failed.length > 0
              ? ` Fehlgeschlagen: ${failed.map((f) => `${f.sourceId} (${f.error ?? 'unbekannt'})`).join('; ')}`
              : ''),
          error: documents.length === 0 ? 'Keine belastbaren Quellen gefunden.' : null,
          meta: {
            cache: out.cache,
            evidence: out.evidence,
            queries: out.queries,
            selectedSources: out.selectedSources,
            attempts: out.attempts,
            documentsUsed: documents.map((d) => ({
              title: d.title,
              url: d.url,
              sourceId: d.sourceId,
              tier: d.sourceTier,
              publishedAt: d.publishedAt,
              fullTextFetched: d.fullTextFetched,
            })),
          },
        }),
      })
      emit({ type: 'sources', documents, evidence: out.evidence })
    } catch (e) {
      // Ein unerwarteter Fehler der ganzen Schicht bricht den Lauf nicht ab.
      // Die Synthese läuft weiter und muss die Lücke benennen.
      const info = errorInfo(e)
      emit({
        type: 'step',
        step: finishStep(researchStep, { status: 'failed', error: info.message }),
      })
    }
  }

  // ── Schritt: Memory ────────────────────────────────────────────────────────
  //
  // Wird immer durchsucht, nicht nur wenn der Planner es verlangt: ob etwas
  // Gespeichertes passt, weiss die Suche besser als die Vorab-Einschätzung.
  // Ein Lauf ohne Treffer kostet eine Millisekunde.
  let memoryHits: RecallHit[] = []
  const memoryStep = startStep(runId, ++seq, 'memory', 'memory')
  try {
    memoryHits = recall(query, { limit: 6 })
    const fresh = memoryHits.filter((h) => !h.stale).length
    const stale = memoryHits.length - fresh

    emit({
      type: 'step',
      step: finishStep(memoryStep, {
        status: memoryHits.length > 0 ? 'completed' : 'skipped',
        detail:
          memoryHits.length === 0
            ? 'Keine passenden Einträge im Gedächtnis.'
            : `${memoryHits.length} Treffer (${fresh} aktuell, ${stale} veraltet): ` +
              memoryHits.map((h) => `${h.entry.kind}/${h.entry.title}`).join('; '),
        meta: {
          hits: memoryHits.map((h) => ({
            id: h.entry.id,
            kind: h.entry.kind,
            title: h.entry.title,
            updatedAt: h.entry.updatedAt,
            stale: h.stale,
          })),
        },
      }),
    })
    if (memoryHits.length > 0) emit({ type: 'memory', hits: memoryHits })
  } catch (e) {
    // Ein defektes Gedächtnis darf die Antwort nicht verhindern.
    const info = errorInfo(e)
    emit({ type: 'step', step: finishStep(memoryStep, { status: 'failed', error: info.message }) })
  }

  // ── Schritt: Synthese ──────────────────────────────────────────────────────
  const synthStep = startStep(runId, ++seq, 'synthesis', 'synthesis')
  try {
    const outcome = await synthesize(query, { plan, documents, researchRan, evidence, memoryHits }, { signal: opts.signal })

    emit({
      type: 'step',
      step: finishStep(synthStep, {
        status: 'completed',
        component: `llm.${outcome.completion.providerId}`,
        model: outcome.completion.model,
        inputTokens: outcome.completion.usage?.inputTokens ?? null,
        outputTokens: outcome.completion.usage?.outputTokens ?? null,
        detail: `Antwort erzeugt, ${outcome.text.length} Zeichen. Quellen im Prompt: ${documents.length}.`,
      }),
    })

    // ── Gedächtnis schreiben ────────────────────────────────────────────────
    //
    // Erst nach einer erfolgreichen Antwort, und nur das, was der Planner aus
    // der NUTZERNACHRICHT vorgeschlagen hat. Rechercheergebnisse kommen
    // zusätzlich als knowledge dazu, aber nur bei brauchbarer Beleglage:
    // schlecht belegte Treffer ins Langzeitgedächtnis zu schreiben wäre ein
    // Weg, wie sich Falsches festsetzt.
    const written: string[] = []
    for (const w of plan.memoryWrites) {
      try {
        const e = remember({ ...w, freshness: 'SLOW_CHANGING', sourceRunId: runId })
        written.push(`${e.kind}/${e.title}`)
      } catch { /* ein unbrauchbarer Vorschlag kippt den Lauf nicht */ }
    }
    if (documents.length > 0 && evidence && (evidence.level === 'HIGH' || evidence.level === 'MEDIUM')) {
      try {
        const e = remember({
          kind: 'knowledge',
          title: plan.intent.slice(0, 160),
          content:
            `Recherche am ${new Date().toISOString().slice(0, 10)}, Beleglage ${evidence.level}. ` +
            documents.slice(0, 5).map((d, i) => `[${i + 1}] ${d.title}`).join(' '),
          freshness: plan.freshness,
          sourceRunId: runId,
          sourceUrls: documents.slice(0, 5).map((d) => d.url),
        })
        written.push(`${e.kind}/${e.title}`)
      } catch { /* dito */ }
    }
    if (written.length > 0) emit({ type: 'memoryWritten', titles: written })

    finishRun(runId, 'completed', { answer: outcome.text })
    emit({ type: 'answer', text: outcome.text })
    emit({ type: 'done', runId, durationMs: Date.now() - startedMs })
    return runId
  } catch (e) {
    const info = errorInfo(e)
    emit({ type: 'step', step: finishStep(synthStep, { status: 'failed', error: info.message }) })
    finishRun(runId, 'failed', { error: info.message, errorKind: info.kind })
    emit({ type: 'error', message: info.message, kind: info.kind })
    throw e
  }
}
