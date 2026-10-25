'use client'
import { useRef, useState } from 'react'
import type { BrainEvent, FreshnessAdjustment, QueryPlan, TraceStep } from '@/brain/types'
import type { ResearchDocument } from '@/brain/research/types'
import type { EvidenceAssessment } from '@/brain/research/confidence'
import type { RecallHit } from '@/brain/memory/types'
import BrainFlow from '@/components/brain/BrainFlow'

const STEP_STYLE: Record<string, string> = {
  running:   'bg-info/15 text-info border-info/25',
  completed: 'bg-success/15 text-success border-success/25',
  failed:    'bg-danger/15 text-danger border-danger/25',
  skipped:   'bg-warning/15 text-warning border-warning/25',
}

const LEVEL_STYLE: Record<string, string> = {
  HIGH:   'bg-success/15 text-success border-success/25',
  MEDIUM: 'bg-warning/15 text-warning border-warning/25',
  LOW:    'bg-danger/15 text-danger border-danger/25',
  NONE:   'bg-muted/15 text-muted border-muted/25',
}

const TIER_STYLE: Record<string, string> = {
  PRIMARY:   'bg-success/15 text-success border-success/25',
  SECONDARY: 'bg-info/15 text-info border-info/25',
  COMMUNITY: 'bg-warning/15 text-warning border-warning/25',
}

const STEP_LABEL: Record<string, string> = {
  plan: 'Bedarfsanalyse',
  research: 'Recherche',
  memory: 'Memory',
  synthesis: 'Synthese',
}

export default function BrainPage() {
  const [query, setQuery] = useState('Was ist der Unterschied zwischen einem Geschäftsmodell und einer Geschäftsstrategie?')
  const [busy, setBusy] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [steps, setSteps] = useState<TraceStep[]>([])
  const [plan, setPlan] = useState<QueryPlan | null>(null)
  const [adjustment, setAdjustment] = useState<FreshnessAdjustment | null>(null)
  const [sources, setSources] = useState<ResearchDocument[]>([])
  const [evidence, setEvidence] = useState<EvidenceAssessment | null>(null)
  const [memoryHits, setMemoryHits] = useState<RecallHit[]>([])
  const [memoryWritten, setMemoryWritten] = useState<string[]>([])
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; kind: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ask = async () => {
    if (busy || !query.trim()) return
    setBusy(true)
    setRunId(null); setSteps([]); setPlan(null); setAdjustment(null)
    setSources([]); setEvidence(null); setMemoryHits([]); setMemoryWritten([])
    setAnswer(null); setError(null)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/brain/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setError({ message: d.error ?? `HTTP ${res.status}`, kind: 'ERROR' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''
        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          const e = JSON.parse(line.slice(6)) as BrainEvent
          if (e.type === 'run') setRunId(e.runId)
          if (e.type === 'step') setSteps((prev) => [...prev.filter((s) => s.seq !== e.step.seq), e.step].sort((a, b) => a.seq - b.seq))
          if (e.type === 'plan') { setPlan(e.plan); setAdjustment(e.adjustment) }
          if (e.type === 'sources') { setSources(e.documents); setEvidence(e.evidence) }
          if (e.type === 'memory') setMemoryHits(e.hits)
          if (e.type === 'memoryWritten') setMemoryWritten(e.titles)
          if (e.type === 'answer') setAnswer(e.text)
          if (e.type === 'error') setError({ message: e.message, kind: e.kind })
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError({ message: String(e), kind: 'ERROR' })
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white">Central Brain</h1>
        <p className="text-xs text-muted mt-1">
          Bedarfsanalyse und Synthese über die Provider-Schicht. Recherche und Memory
          existieren noch nicht, übersprungene Schritte werden als solche protokolliert.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white placeholder-muted outline-none focus:border-indigo-500 resize-y"
          placeholder="Frage an das Brain…"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={ask}
            disabled={busy || !query.trim()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {busy ? 'Läuft…' : 'Fragen'}
          </button>
          {busy && (
            <button onClick={() => abortRef.current?.abort()} className="px-3 py-1.5 text-sm text-muted hover:text-white border border-border rounded-lg">
              Abbrechen
            </button>
          )}
          {runId && <span className="text-xs text-muted font-mono">Lauf {runId.slice(0, 8)}</span>}
        </div>
      </div>

      {(steps.length > 0 || busy) && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Brain</h2>
            <span className="text-xs text-muted">zeigt den echten Trace, keine Animation ohne Grundlage</span>
          </div>
          <div className="p-3">
            <BrainFlow steps={steps} busy={busy} hasAnswer={answer !== null} sourceCount={sources.length} memoryHitCount={memoryHits.length} />
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-white">Ablauf</h2>
          </div>
          <div className="divide-y divide-border/40">
            {steps.map((s) => (
              <div key={s.seq} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted font-mono w-4">{s.seq}</span>
                  <span className="text-sm text-white flex-1">{STEP_LABEL[s.name] ?? s.name}</span>
                  {s.model && <span className="text-xs text-muted">{s.component} · {s.model}</span>}
                  {s.durationMs !== null && <span className="text-xs text-muted">{(s.durationMs / 1000).toFixed(1)}s</span>}
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STEP_STYLE[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                {s.detail && <p className="text-xs text-muted mt-1.5 ml-7 leading-relaxed">{s.detail}</p>}
                {s.error && <p className="text-xs text-danger mt-1.5 ml-7">{s.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {plan && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-2">Plan</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div className="text-muted">Absicht</div><div className="text-slate-200">{plan.intent}</div>
            <div className="text-muted">Aus Modellwissen beantwortbar</div><div className="text-slate-200">{plan.answerableFromModelKnowledge ? 'ja' : 'nein'}</div>
            <div className="text-muted">Recherche nötig</div><div className="text-slate-200">{plan.needsResearch ? 'ja' : 'nein'}</div>
            <div className="text-muted">Memory nötig</div><div className="text-slate-200">{plan.needsMemory ? 'ja' : 'nein'}</div>
            <div className="text-muted">Frische</div>
            <div className="text-slate-200">
              {plan.freshness}
              {adjustment && <span className="text-warning"> (verschärft von {adjustment.from}: {adjustment.trigger})</span>}
            </div>
            <div className="text-muted">Sensitivität</div><div className="text-slate-200">{plan.sensitivity}</div>
            {plan.searchQueries.length > 0 && (
              <>
                <div className="text-muted">Vorbereitete Suchanfragen</div>
                <div className="text-slate-200">{plan.searchQueries.join(' · ')}</div>
              </>
            )}
            <div className="text-muted">Begründung</div><div className="text-slate-200">{plan.rationale}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">
          <span className="font-semibold">{error.kind}: </span>{error.message}
        </div>
      )}

      {(memoryHits.length > 0 || memoryWritten.length > 0) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-2">Gedächtnis</h2>
          {memoryHits.length > 0 && (
            <>
              <div className="text-xs text-muted mb-1.5">Verwendet:</div>
              <ul className="text-xs text-slate-300 space-y-1 mb-3">
                {memoryHits.map((h) => (
                  <li key={h.entry.id} className="flex gap-2">
                    <span className="text-muted shrink-0">[{h.entry.kind}]</span>
                    <span className="flex-1">{h.entry.title}</span>
                    {h.stale && <span className="text-warning shrink-0">veraltet</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {memoryWritten.length > 0 && (
            <>
              <div className="text-xs text-muted mb-1.5">Neu gespeichert:</div>
              <ul className="text-xs text-slate-300 space-y-1">
                {memoryWritten.map((t, i) => <li key={i}>· {t}</li>)}
              </ul>
            </>
          )}
          <a href="/memory" className="inline-block mt-3 text-xs text-indigo-300 hover:text-indigo-200">
            Gedächtnis ansehen und verwalten
          </a>
        </div>
      )}

      {evidence && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white">Belegstärke</h2>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${LEVEL_STYLE[evidence.level]}`}>
              {evidence.level}
            </span>
          </div>
          <p className="text-xs text-muted mb-2">
            Gerechnet aus der Quellenlage, nicht vom Modell geschätzt. Sagt etwas über
            die Belege aus, nicht über die Wahrheit der Antwort.
          </p>
          <ul className="text-xs text-slate-300 space-y-1">
            {evidence.reasons.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="text-muted">·</span>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Abgerufene Quellen</h2>
            <span className="text-xs text-muted">{sources.length} nach Deduplizierung und Ranking</span>
          </div>
          <div className="divide-y divide-border/40">
            {sources.map((d, i) => (
              <div key={d.url + i} className="px-4 py-2.5 flex items-start gap-3">
                <span className="text-xs text-muted font-mono w-5 shrink-0">[{i + 1}]</span>
                <div className="flex-1 min-w-0">
                  <a href={d.url} target="_blank" rel="noreferrer noopener"
                     className="text-sm text-indigo-300 hover:text-indigo-200 break-words">
                    {d.title}
                  </a>
                  <div className="text-xs text-muted mt-0.5">
                    {d.sourceName}
                    {d.publishedAt ? ` · ${d.publishedAt.slice(0, 10)}` : ' · kein Datum'}
                    {d.fullTextFetched ? ' · Volltext geladen' : ''}
                  </div>
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TIER_STYLE[d.sourceTier]}`}>
                  {d.sourceTier}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {answer && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-white">Antwort</h2>
          </div>
          <div className="px-4 py-3 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{answer}</div>
        </div>
      )}
    </div>
  )
}
