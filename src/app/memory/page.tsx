'use client'
// Gedächtnis ansehen und löschen. Kontrolle über das, was das System über
// den Nutzer gespeichert hat, gehört zur Funktion dazu und nicht in ein
// späteres Ausbaustadium.

import { useCallback, useEffect, useState } from 'react'
import type { MemoryEntry, MemoryKind } from '@/brain/memory/types'

type Entry = MemoryEntry & { stale: boolean }

const KIND_LABEL: Record<MemoryKind, string> = {
  user: 'Über dich',
  project: 'Projekte',
  decision: 'Entscheidungen',
  knowledge: 'Recherchewissen',
  conversation: 'Gesprächskontext',
}

const KIND_STYLE: Record<MemoryKind, string> = {
  user:         'bg-accent/15 text-accent-hover border-accent/25',
  project:      'bg-info/15 text-info border-info/25',
  decision:     'bg-success/15 text-success border-success/25',
  knowledge:    'bg-warning/15 text-warning border-warning/25',
  conversation: 'bg-muted/15 text-muted border-muted/25',
}

export default function MemoryPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MemoryKind | ''>('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/memory${filter ? `?kind=${filter}` : ''}`)
      .then((r) => r.json())
      .then((d) => { setEntries(d.entries); setCounts(d.counts) })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(load, [load])

  const remove = async (id: string) => {
    await fetch(`/api/memory/${id}`, { method: 'DELETE' })
    load()
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white">Gedächtnis</h1>
        <p className="text-xs text-muted mt-1">
          Alles, was das System dauerhaft über dich gespeichert hat. Einträge über dich,
          deine Projekte und deine Entscheidungen entstehen ausschliesslich aus deinen
          eigenen Nachrichten, niemals aus Internetinhalten. Jeder Eintrag lässt sich löschen.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1 rounded-lg text-xs border ${filter === '' ? 'bg-card text-white border-indigo-500/50' : 'text-muted border-border hover:text-white'}`}
        >
          Alle ({total})
        </button>
        {(Object.keys(KIND_LABEL) as MemoryKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-lg text-xs border ${filter === k ? 'bg-card text-white border-indigo-500/50' : 'text-muted border-border hover:text-white'}`}
          >
            {KIND_LABEL[k]} ({counts[k] ?? 0})
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading && <div className="px-4 py-6 text-xs text-muted">Lade…</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-6 text-xs text-muted">
            Noch nichts gespeichert. Einträge entstehen, wenn du dem Brain etwas über dich
            oder deine Vorhaben erzählst.
          </div>
        )}
        <div className="divide-y divide-border/40">
          {entries.map((e) => (
            <div key={e.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <span className={`shrink-0 inline-flex px-2 py-0.5 rounded text-xs font-medium border ${KIND_STYLE[e.kind]}`}>
                  {KIND_LABEL[e.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">{e.title}</div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{e.content}</p>
                  <div className="text-xs text-muted mt-1">
                    {e.updatedAt.slice(0, 10)} · {e.freshness}
                    {e.stale && <span className="text-warning"> · veraltet, gilt nur noch als Kontext</span>}
                    {e.sourceUrls.length > 0 && ` · ${e.sourceUrls.length} Quellen`}
                  </div>
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="shrink-0 px-2 py-1 text-xs text-danger border border-danger/30 rounded hover:bg-danger/10"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
