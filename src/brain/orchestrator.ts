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

import { createPlan } from './plan'
import { LLMError } from './providers/registry'
import { research } from './research/index.ts'
import { synthesize } from './synthesis'
import {
  finishRun,
  finishStep,
  recordSkippedStep,
  savePlan,
  startRun,
  startStep,
} from './trace'
import type { BrainEvent, QueryPlan } from './types'
import type { ResearchDocument } from './research/types.ts'

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
            `Ergebnisse nach Deduplizierung und Ranking: ${documents.length}.` +
            (failed.length > 0
              ? ` Fehlgeschlagen: ${failed.map((f) => `${f.sourceId} (${f.error ?? 'unbekannt'})`).join('; ')}`
              : ''),
          error: documents.length === 0 ? 'Keine belastbaren Quellen gefunden.' : null,
          meta: {
            cache: out.cache,
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
      emit({ type: 'sources', documents })
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

  if (plan.needsMemory) {
    emit({
      type: 'step',
      step: recordSkippedStep(
        runId,
        ++seq,
        'memory',
        'Der Plan hält gespeichertes Wissen für relevant, der Memory-Store ist noch nicht gebaut (Roadmap-Schritt 6).',
      ),
    })
  }

  // ── Schritt: Synthese ──────────────────────────────────────────────────────
  const synthStep = startStep(runId, ++seq, 'synthesis', 'synthesis')
  try {
    const outcome = await synthesize(query, { plan, documents, researchRan }, { signal: opts.signal })

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
