// ─────────────────────────────────────────────────────────────────────────────
// Trace — protokolliert jeden tatsächlich ausgeführten Verarbeitungsschritt.
//
// Zwei Regeln:
// 1. Es wird nur festgehalten, was wirklich passiert ist. Ein Schritt, der
//    nicht lief, existiert nicht oder steht als `skipped` mit Begründung.
// 2. Nichts Vertrauliches. Keine Prompts, keine API-Keys, keine internen
//    Gedankengänge des Modells. Jeder Text läuft durch scrubSecrets().
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from './db.ts'
import type {
  QueryPlan,
  RunStatus,
  StepName,
  StepStatus,
  TraceRun,
  TraceStep,
} from './types.ts'

/**
 * Zweite Verteidigungslinie. Die Provider redigieren ihre Fehlermeldungen
 * bereits; hier wird zusätzlich alles entfernt, was nach einem Secret aussieht,
 * bevor es die Datenbank erreicht.
 */
export function scrubSecrets(text: string | null | undefined): string | null {
  if (!text) return null
  let out = text
  for (const name of ['GEMINI_API_KEY', 'FRED_API_KEY', 'DESTATIS_PASSWORD']) {
    const v = process.env[name]
    if (v && v.length >= 8) out = out.split(v).join('[REDACTED]')
  }
  return out
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/\bAQ\.[A-Za-z0-9._-]{20,}/g, '[REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/(api[_-]?key|token|secret|password)["'\s:=]+[^\s"',}]{8,}/gi, '$1=[REDACTED]')
}

function nowIso(): string {
  return new Date().toISOString()
}

// ── Schreiben ────────────────────────────────────────────────────────────────

export function startRun(query: string): string {
  const id = crypto.randomUUID()
  getDb()
    .prepare('INSERT INTO runs (id, query, status, created_at) VALUES (?, ?, ?, ?)')
    .run(id, query, 'running' satisfies RunStatus, nowIso())
  return id
}

export interface StepHandle {
  runId: string
  seq: number
  name: StepName
  startedAt: string
  startedMs: number
}

export function startStep(runId: string, seq: number, name: StepName, component: string): StepHandle {
  const startedAt = nowIso()
  getDb()
    .prepare(
      `INSERT INTO steps (run_id, seq, name, status, component, started_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(runId, seq, name, 'running' satisfies StepStatus, component, startedAt)
  return { runId, seq, name, startedAt, startedMs: Date.now() }
}

export interface StepFinish {
  status: StepStatus
  component?: string
  model?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  detail?: string | null
  error?: string | null
  /** Strukturierte Zusatzdaten, z.B. Quellenaufrufe der Research-Schicht. */
  meta?: Record<string, unknown> | null
}

export function finishStep(h: StepHandle, f: StepFinish): TraceStep {
  const durationMs = Date.now() - h.startedMs
  const completedAt = nowIso()
  getDb()
    .prepare(
      `UPDATE steps SET status = ?, component = COALESCE(?, component), model = ?,
              completed_at = ?, duration_ms = ?, input_tokens = ?, output_tokens = ?,
              detail = ?, error = ?, meta_json = ?
       WHERE run_id = ? AND seq = ?`,
    )
    .run(
      f.status,
      f.component ?? null,
      f.model ?? null,
      completedAt,
      durationMs,
      f.inputTokens ?? null,
      f.outputTokens ?? null,
      scrubSecrets(f.detail),
      scrubSecrets(f.error),
      f.meta ? scrubSecrets(JSON.stringify(f.meta)) : null,
      h.runId,
      h.seq,
    )
  return readStep(h.runId, h.seq)
}

/** Ein Schritt, der bewusst nicht ausgeführt wurde. Immer mit Begründung. */
export function recordSkippedStep(
  runId: string,
  seq: number,
  name: StepName,
  reason: string,
): TraceStep {
  const at = nowIso()
  getDb()
    .prepare(
      `INSERT INTO steps (run_id, seq, name, status, component, started_at, completed_at, duration_ms, detail)
       VALUES (?, ?, ?, 'skipped', 'orchestrator', ?, ?, 0, ?)`,
    )
    .run(runId, seq, name, at, at, scrubSecrets(reason))
  return readStep(runId, seq)
}

export function savePlan(runId: string, plan: QueryPlan): void {
  getDb().prepare('UPDATE runs SET plan_json = ? WHERE id = ?').run(JSON.stringify(plan), runId)
}

export function finishRun(
  runId: string,
  status: RunStatus,
  data: { answer?: string | null; error?: string | null; errorKind?: string | null },
): void {
  const row = getDb().prepare('SELECT created_at FROM runs WHERE id = ?').get(runId) as unknown as { created_at: string } | undefined
  const durationMs = row ? Date.now() - new Date(row.created_at).getTime() : null
  getDb()
    .prepare(
      `UPDATE runs SET status = ?, completed_at = ?, duration_ms = ?, answer = ?, error = ?, error_kind = ?
       WHERE id = ?`,
    )
    .run(
      status,
      nowIso(),
      durationMs,
      data.answer ?? null,
      scrubSecrets(data.error),
      data.errorKind ?? null,
      runId,
    )
}

// ── Lesen ────────────────────────────────────────────────────────────────────

interface StepRow {
  seq: number; name: string; status: string; component: string | null; model: string | null
  started_at: string; completed_at: string | null; duration_ms: number | null
  input_tokens: number | null; output_tokens: number | null
  detail: string | null; error: string | null; meta_json: string | null
}

function parseMeta(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try { return JSON.parse(raw) as Record<string, unknown> } catch { return null }
}

function toStep(r: StepRow): TraceStep {
  return {
    seq: r.seq,
    name: r.name as StepName,
    status: r.status as StepStatus,
    component: r.component,
    model: r.model,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    durationMs: r.duration_ms,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    detail: r.detail,
    error: r.error,
    meta: parseMeta(r.meta_json),
  }
}

function readStep(runId: string, seq: number): TraceStep {
  const r = getDb()
    .prepare('SELECT * FROM steps WHERE run_id = ? AND seq = ?')
    .get(runId, seq) as unknown as StepRow
  return toStep(r)
}

interface RunRow {
  id: string; query: string; status: string; created_at: string; completed_at: string | null
  duration_ms: number | null; answer: string | null; error: string | null
  error_kind: string | null; plan_json: string | null
}

export function getRun(runId: string): TraceRun | null {
  const r = getDb().prepare('SELECT * FROM runs WHERE id = ?').get(runId) as unknown as RunRow | undefined
  if (!r) return null
  const steps = getDb()
    .prepare('SELECT * FROM steps WHERE run_id = ? ORDER BY seq')
    .all(runId) as unknown as StepRow[]
  return {
    id: r.id,
    query: r.query,
    status: r.status as RunStatus,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    durationMs: r.duration_ms,
    answer: r.answer,
    error: r.error,
    errorKind: r.error_kind,
    plan: r.plan_json ? (JSON.parse(r.plan_json) as QueryPlan) : null,
    steps: steps.map(toStep),
  }
}

export interface RunSummary {
  id: string; query: string; status: RunStatus; createdAt: string
  durationMs: number | null; stepCount: number
}

export function listRuns(limit = 20): RunSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT r.id, r.query, r.status, r.created_at, r.duration_ms,
              (SELECT COUNT(*) FROM steps s WHERE s.run_id = r.id) AS step_count
       FROM runs r ORDER BY r.created_at DESC LIMIT ?`,
    )
    .all(limit) as unknown as (RunRow & { step_count: number })[]
  return rows.map((r) => ({
    id: r.id,
    query: r.query,
    status: r.status as RunStatus,
    createdAt: r.created_at,
    durationMs: r.duration_ms,
    stepCount: r.step_count,
  }))
}

export function countRuns(): number {
  const r = getDb().prepare('SELECT COUNT(*) AS n FROM runs').get() as unknown as { n: number }
  return r.n
}
