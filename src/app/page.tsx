'use client'
import { useCallback, useEffect, useState } from 'react'
import type { HealthResponse, ComponentStatus } from '@/types'

const STATUS_STYLE: Record<ComponentStatus, string> = {
  CONNECTED:       'bg-success/15 text-success border-success/25',
  NOT_CONFIGURED:  'bg-warning/15 text-warning border-warning/25',
  DISCONNECTED:    'bg-warning/15 text-warning border-warning/25',
  ERROR:           'bg-danger/15 text-danger border-danger/25',
  SIMULATION:      'bg-danger/15 text-danger border-danger/25',
  NOT_IMPLEMENTED: 'bg-muted/15 text-muted border-muted/25',
}

type LlmResult = {
  text: string
  providerId: string
  model: string
  durationMs: number
  usage?: { inputTokens?: number; outputTokens?: number }
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState('Antworte in genau einem Satz: Was ist der Unterschied zwischen Umsatz und Gewinn?')
  const [provider, setProvider] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<LlmResult | null>(null)
  const [llmError, setLlmError] = useState<{ error: string; kind?: string } | null>(null)

  const loadHealth = useCallback(() => {
    setHealthError(null)
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealthError(String(e)))
  }, [])

  useEffect(loadHealth, [loadHealth])

  const run = async () => {
    if (busy || !prompt.trim()) return
    setBusy(true)
    setResult(null)
    setLlmError(null)
    try {
      const r = await fetch('/api/llm/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, providerId: provider || undefined }),
      })
      const d = await r.json()
      if (r.ok) setResult(d as LlmResult)
      else setLlmError(d as { error: string; kind?: string })
    } catch (e) {
      setLlmError({ error: String(e), kind: 'ERROR' })
    } finally {
      setBusy(false)
    }
  }

  const llmProviders = health?.capabilities.filter((c) => c.id.startsWith('llm.')) ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white">Universal Brain — System Status</h1>
        <p className="text-xs text-muted mt-1">
          Diese Seite zeigt ausschliesslich real vorhandene Funktionen. Was nicht gebaut ist,
          steht als <span className="text-muted font-medium">NOT_IMPLEMENTED</span> da.
        </p>
      </div>

      {healthError && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">
          Health-Endpoint nicht erreichbar: {healthError}
        </div>
      )}

      {health && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-indigo-300 flex items-center justify-between gap-4">
          <span>Roadmap-Schritt <span className="font-semibold">{health.roadmapStep} von 9</span> — {health.roadmapLabel}</span>
          <button onClick={loadHealth} className="text-xs px-2 py-1 rounded-lg border border-indigo-500/40 hover:bg-indigo-500/20 shrink-0">
            neu prüfen
          </button>
        </div>
      )}

      {/* ── LLM-Test ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">LLM direkt testen</h2>
          <span className="text-xs text-muted">ohne Recherche, ohne Memory — nur Modellwissen</span>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white placeholder-muted outline-none focus:border-indigo-500 resize-y"
            placeholder="Frage an das Modell…"
          />
          <div className="flex items-center gap-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="">Automatisch (mit Fallback)</option>
              {llmProviders.map((p) => (
                <option key={p.id} value={p.id.replace('llm.', '')}>
                  {p.label} · {p.status}
                </option>
              ))}
            </select>
            <button
              onClick={run}
              disabled={busy || !prompt.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {busy ? 'Läuft…' : 'Senden'}
            </button>
          </div>

          {llmError && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-sm text-danger">
              {llmError.kind && <span className="font-semibold">{llmError.kind}: </span>}
              {llmError.error}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-slate-200 whitespace-pre-wrap">
                {result.text}
              </div>
              <div className="text-xs text-muted">
                {result.providerId} · {result.model} · {(result.durationMs / 1000).toFixed(1)}s
                {result.usage?.outputTokens !== undefined && ` · ${result.usage.outputTokens} Output-Tokens`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Komponenten ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-white">Komponenten</h2>
        </div>
        <div className="divide-y divide-border/40">
          {!health && !healthError && <div className="px-4 py-6 text-xs text-muted">Lade…</div>}
          {health?.capabilities.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{c.label}</div>
                <div className="text-xs text-muted mt-0.5">{c.detail}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.plannedInStep && <span className="text-xs text-muted">Schritt {c.plannedInStep}</span>}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_STYLE[c.status]}`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted leading-relaxed">
        <div className="text-sm font-semibold text-white mb-2">Was aktuell im Repository steht</div>
        Das Video-System ist vollständig unter <code className="text-slate-300">legacy/video/</code> archiviert
        und aus dem Build ausgeschlossen. Es wurde nichts unwiederbringlich gelöscht.
        Der Architekturplan liegt unter <code className="text-slate-300">docs/BRAIN-V1-PLAN.md</code>.
      </div>
    </div>
  )
}
