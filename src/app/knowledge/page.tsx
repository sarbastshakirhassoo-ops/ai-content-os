// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'

export default function KnowledgePage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const run = async () => {
    setLoading(true); setData(null)
    try {
      const res = await fetch('/api/knowledge', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
      setData(await res.json())
    } catch(e) { setData({ error: String(e) }) }
    finally { setLoading(false) }
  }
  useEffect(() => { run() }, [])

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white">🧠 Knowledge Base</h1><p className="text-xs text-muted mt-0.5">Systemgedächtnis — beste Hooks, Hashtags, Learnings</p></div>
        <button onClick={run} disabled={loading} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg">{loading?'⏳…':'🔄 Aktualisieren'}</button>
      </div>
      {loading && <div className="bg-card border border-border rounded-xl p-8 text-center"><div className="text-3xl mb-2 animate-pulse">🧠</div><p className="text-sm text-muted">Knowledge Base lädt…</p></div>}
      {!loading && data && !data.error && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 col-span-2">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold text-indigo-400">{data.totalTopics ?? 0}</div><div className="text-xs text-muted mt-1">Topics verwendet</div></div>
              <div><div className="text-2xl font-bold text-green-400">{data.totalHooks ?? 0}</div><div className="text-xs text-muted mt-1">Hooks gespeichert</div></div>
              <div><div className="text-2xl font-bold text-amber-400">{data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString('de') : '—'}</div><div className="text-xs text-muted mt-1">Zuletzt aktualisiert</div></div>
            </div>
          </div>
          {data.topHooks?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 col-span-2">
              <div className="text-xs text-muted mb-3">🔥 TOP HOOKS</div>
              {data.topHooks.map((h,i)=><p key={i} className="text-sm text-slate-200 py-1.5 border-b border-border/50 last:border-0">"{h}"</p>)}
            </div>
          )}
          {data.topHashtags?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted mb-2"># TOP HASHTAGS</div>
              <div className="flex flex-wrap gap-1.5">{data.topHashtags.map((h,i)=><span key={i} className="text-xs px-2 py-1 bg-surface rounded text-indigo-400">{h}</span>)}</div>
            </div>
          )}
          {data.topLearnings?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted mb-2">📚 LEARNINGS</div>
              {data.topLearnings.map((l,i)=><p key={i} className="text-xs text-slate-300 py-1">• {l}</p>)}
            </div>
          )}
          {data.totalTopics === 0 && (
            <div className="col-span-2 bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-muted text-sm">Noch leer — Knowledge Base füllt sich nach dem ersten vollständigen Pipeline-Durchlauf.</p>
            </div>
          )}
        </div>
      )}
      {!loading && data?.error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>}
    </div>
  )
}
