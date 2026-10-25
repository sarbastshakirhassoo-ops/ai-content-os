'use client'
// ─────────────────────────────────────────────────────────────────────────────
// Trace — jeder Lauf vollständig nachvollziehbar.
//
// Zeigt ausschliesslich, was in der Datenbank steht. Kein Feld wird berechnet,
// geschönt oder ergänzt. Fehlgeschlagene Läufe stehen gleichberechtigt neben
// erfolgreichen.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import type { TraceRun } from '@/brain/types'

type RunSummary = {
  id: string; query: string; status: string
  createdAt: string; durationMs: number | null; stepCount: number
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-success/15 text-success border-success/25',
  failed:    'bg-danger/15 text-danger border-danger/25',
  running:   'bg-info/15 text-info border-info/25',
  skipped:   'bg-warning/15 text-warning border-warning/25',
}

const STEP_LABEL: Record<string, string> = {
  plan: 'Bedarfsanalyse', research: 'Recherche', memory: 'Gedächtnis', synthesis: 'Synthese',
}

function secs(ms: number | null): string {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`
}

export default function TracePage() {
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [selected, setSelected] = useState<TraceRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRuns = useCallback(() => {
    setLoading(true)
    fetch('/api/brain/runs?limit=50')
      .then((r) => r.json())
      .then((d) => setRuns(d.runs))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(loadRuns, [loadRuns])

  const open = async (id: string) => {
    setSelected(null)
    const d = await fetch(`/api/brain/runs/${id}`).then((r) => r.json())
    setSelected(d.run ?? null)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Trace</h1>
          <p className="text-xs text-muted mt-1">
            Jeder Lauf mit allen Schritten, Quellenaufrufen, Dauern und Fehlern.
            Gezeigt wird ausschliesslich, was gespeichert wurde.
          </p>
        </div>
        <button onClick={loadRuns} className="shrink-0 text-xs px-2 py-1 rounded-lg border border-border text-muted hover:text-white">
          neu laden
        </button>
      </div>

      {error && <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Liste */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Läufe</h2>
            <span className="text-xs text-muted">{runs.length}</span>
          </div>
          <div className="divide-y divide-border/40 max-h-[32rem] overflow-y-auto">
            {loading && <div className="px-4 py-6 text-xs text-muted">Lade…</div>}
            {!loading && runs.length === 0 && (
              <div className="px-4 py-6 text-xs text-muted">Noch keine Läufe.</div>
            )}
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => open(r.id)}
                className={`w-full text-left px-4 py-2.5 hover:bg-surface transition-colors ${selected?.id === r.id ? 'bg-surface' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-xs border ${STATUS_STYLE[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                  <span className="text-xs text-muted shrink-0">{secs(r.durationMs)}</span>
                  <span className="text-xs text-muted shrink-0">{r.stepCount} Schritte</span>
                </div>
                <div className="text-sm text-slate-200 mt-1 line-clamp-2">{r.query}</div>
                <div className="text-xs text-muted mt-0.5">{r.createdAt.slice(0, 16).replace('T', ' ')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 space-y-4">
          {!selected && (
            <div className="bg-card border border-border rounded-xl px-4 py-6 text-xs text-muted">
              Links einen Lauf auswählen.
            </div>
          )}

          {selected && (
            <>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-sm text-white">{selected.query}</div>
                <div className="text-xs text-muted mt-1 font-mono">
                  {selected.id} · {selected.status} · {secs(selected.durationMs)} · {selected.createdAt.slice(0, 16).replace('T', ' ')}
                </div>
                {selected.error && (
                  <div className="mt-2 text-xs text-danger">
                    {selected.errorKind}: {selected.error}
                  </div>
                )}
              </div>

              {selected.plan && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">Plan</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-muted">Absicht</div><div className="text-slate-200">{selected.plan.intent}</div>
                    <div className="text-muted">Recherche nötig</div><div className="text-slate-200">{selected.plan.needsResearch ? 'ja' : 'nein'}</div>
                    <div className="text-muted">Frische</div><div className="text-slate-200">{selected.plan.freshness}</div>
                    <div className="text-muted">Sensitivität</div><div className="text-slate-200">{selected.plan.sensitivity}</div>
                    <div className="text-muted">Themenfelder</div><div className="text-slate-200">{selected.plan.domains.join(', ') || '—'}</div>
                    {selected.plan.searchQueries.length > 0 && (
                      <>
                        <div className="text-muted">Suchanfragen</div>
                        <div className="text-slate-200">{selected.plan.searchQueries.join(' · ')}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-white">Schritte</h3>
                </div>
                <div className="divide-y divide-border/40">
                  {selected.steps.map((s) => {
                    const meta = s.meta as Record<string, unknown> | null
                    const attempts = (meta?.attempts ?? []) as { sourceId: string; status: string; count: number; durationMs: number; error?: string }[]
                    const docs = (meta?.documentsUsed ?? []) as { title: string; url: string; tier: string; publishedAt: string | null }[]
                    const evidence = meta?.evidence as { level: string; reasons: string[] } | undefined
                    return (
                      <div key={s.seq} className="px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-muted font-mono w-4">{s.seq}</span>
                          <span className="text-sm text-white flex-1 min-w-0">{STEP_LABEL[s.name] ?? s.name}</span>
                          {s.model && <span className="text-xs text-muted">{s.component} · {s.model}</span>}
                          {s.inputTokens !== null && (
                            <span className="text-xs text-muted">{s.inputTokens} in / {s.outputTokens} out</span>
                          )}
                          <span className="text-xs text-muted">{secs(s.durationMs)}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${STATUS_STYLE[s.status] ?? ''}`}>{s.status}</span>
                        </div>
                        {s.detail && <p className="text-xs text-muted mt-1.5 ml-7 leading-relaxed">{s.detail}</p>}
                        {s.error && <p className="text-xs text-danger mt-1.5 ml-7">{s.error}</p>}

                        {evidence && (
                          <div className="ml-7 mt-2 text-xs">
                            <span className="text-muted">Belegstärke </span>
                            <span className="text-slate-200 font-medium">{evidence.level}</span>
                            <ul className="text-muted mt-1 space-y-0.5">
                              {evidence.reasons.map((r, i) => <li key={i}>· {r}</li>)}
                            </ul>
                          </div>
                        )}

                        {attempts.length > 0 && (
                          <div className="ml-7 mt-2">
                            <div className="text-xs text-muted mb-1">Quellenaufrufe</div>
                            <div className="space-y-0.5">
                              {attempts.map((a, i) => (
                                <div key={i} className="text-xs flex gap-2">
                                  <span className="text-slate-300 w-24 shrink-0">{a.sourceId}</span>
                                  <span className={a.status === 'failed' ? 'text-danger w-14 shrink-0' : 'text-muted w-14 shrink-0'}>{a.status}</span>
                                  <span className="text-muted w-16 shrink-0">{a.count} Treffer</span>
                                  <span className="text-muted w-16 shrink-0">{a.durationMs}ms</span>
                                  {a.error && <span className="text-danger/80 flex-1 min-w-0 truncate">{a.error}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {docs.length > 0 && (
                          <div className="ml-7 mt-2">
                            <div className="text-xs text-muted mb-1">Verwendete Quellen</div>
                            <div className="space-y-0.5">
                              {docs.map((d, i) => (
                                <div key={i} className="text-xs flex gap-2">
                                  <span className="text-muted w-5 shrink-0">[{i + 1}]</span>
                                  <span className="text-muted w-20 shrink-0">{d.tier}</span>
                                  <span className="text-muted w-20 shrink-0">{d.publishedAt?.slice(0, 10) ?? '—'}</span>
                                  <a href={d.url} target="_blank" rel="noreferrer noopener" className="text-indigo-300 hover:text-indigo-200 flex-1 min-w-0 truncate">
                                    {d.title}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {selected.answer && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-white">Antwort</h3>
                  </div>
                  <div className="px-4 py-3 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {selected.answer}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
