// ─────────────────────────────────────────────────────────────────────────────
// Central Brain — Kerntypen
//
// Regel wie überall: keine Typen auf Vorrat. Felder stehen hier nur, wenn sie
// tatsächlich befüllt und gespeichert werden.
// ─────────────────────────────────────────────────────────────────────────────

import type { Domain, ResearchDocument } from './research/types.ts'
export type { Domain }

/**
 * Wie schnell die angefragte Information altert. Bestimmt, ob ein
 * gespeichertes Ergebnis verwendet werden darf. Die Lebensdauern je Klasse
 * stehen in research/cache.ts, wo sie ausgewertet werden. Die Rangfolge steht
 * in recency.ts, wo der Filter sie braucht.
 * Siehe docs/BRAIN-V1-PLAN.md Abschnitt 4.
 */
export type Freshness = 'EVERGREEN' | 'SLOW_CHANGING' | 'CURRENT' | 'REALTIME_SENSITIVE'

export type Sensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'

/** Ergebnis der Bedarfsanalyse. Wird vom Modell als strukturiertes JSON geliefert. */
export interface QueryPlan {
  /** Worum es in der Anfrage geht, in einem Satz. */
  intent: string
  /** Reicht das Trainingswissen des Modells? */
  answerableFromModelKnowledge: boolean
  /** Werden aktuelle Informationen aus dem Internet gebraucht? */
  needsResearch: boolean
  /** Wäre gespeichertes Wissen über Nutzer oder Projekte relevant? */
  needsMemory: boolean
  freshness: Freshness
  sensitivity: Sensitivity
  /** Themenfelder, nach denen die Research-Schicht ihre Quellen auswählt. */
  domains: Domain[]
  /** Konkrete Suchanfragen für die Research-Schicht. */
  searchQueries: string[]
  /**
   * Kurze, vom Modell selbst formulierte Begründung des Plans.
   * Bewusst kein interner Gedankengang, sondern eine deklarierte Aussage,
   * die dem Nutzer gezeigt werden darf.
   */
  rationale: string
}

/** Vom Recency-Filter angewandte Verschärfung, für den Trace festgehalten. */
export interface FreshnessAdjustment {
  from: Freshness
  to: Freshness
  trigger: string
}

// ── Trace ────────────────────────────────────────────────────────────────────

export type RunStatus = 'running' | 'completed' | 'failed'
export type StepStatus = 'running' | 'completed' | 'failed' | 'skipped'

/** Namen sind fest, damit die spätere Flow-Ansicht darauf abbilden kann. */
export type StepName = 'plan' | 'research' | 'memory' | 'synthesis'

export interface TraceStep {
  seq: number
  name: StepName
  status: StepStatus
  /** Welche Komponente gearbeitet hat, z.B. "llm.gemini" oder "orchestrator". */
  component: string | null
  model: string | null
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  /** Kurze, menschenlesbare Notiz. Nie ein Prompt, nie ein Secret. */
  detail: string | null
  error: string | null
  /** Strukturierte Zusatzdaten des Schritts, z.B. Quellenaufrufe. */
  meta: Record<string, unknown> | null
}

export interface TraceRun {
  id: string
  query: string
  status: RunStatus
  createdAt: string
  completedAt: string | null
  durationMs: number | null
  answer: string | null
  error: string | null
  errorKind: string | null
  plan: QueryPlan | null
  steps: TraceStep[]
}

// ── Streaming-Ereignisse von /api/brain/query ────────────────────────────────

export type BrainEvent =
  | { type: 'run'; runId: string }
  | { type: 'step'; step: TraceStep }
  | { type: 'plan'; plan: QueryPlan; adjustment: FreshnessAdjustment | null }
  | { type: 'sources'; documents: ResearchDocument[] }
  | { type: 'answer'; text: string }
  | { type: 'error'; message: string; kind: string }
  | { type: 'done'; runId: string; durationMs: number }
