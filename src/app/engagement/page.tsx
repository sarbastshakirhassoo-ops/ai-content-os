// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'

export default function EngagementPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const run = async () => {
    setLoading(true); setData(null)
    try {
      const res = await fetch('/api/engagement', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ niche:'Luxury Lifestyle + Nostalgie + Motivation', platform:'all' }) })
      setData(await res.json())
    } catch(e) { setData({ error: String(e) }) }
    finally { setLoading(false) }
  }
  useEffect(() => { run() }, [])

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white">💬 Engagement Analyzer</h1><p className="text-xs text-muted mt-0.5">Community-Insights & Content-Ideen</p></div>
        <button onClick={run} disabled={loading} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg">{loading?'⏳…':'🔄 Neu'}</button>
      </div>
      {loading && <div className="bg-card border border-border rounded-xl p-8 text-center"><div className="text-3xl mb-2 animate-pulse">💬</div><p className="text-sm text-muted">Engagement Analyzer läuft…</p></div>}
      {!loading && data && !data.error && (
        <div className="space-y-4">
          {data.contentIdeas?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted mb-3">💡 CONTENT-IDEEN</div>
              {data.contentIdeas.map((idea,i)=>(
                <div key={i} className="flex items-start gap-2 py-2 border-b border-border/40 last:border-0">
                  <span className="text-indigo-400 text-xs mt-0.5">→</span>
                  <p className="text-sm text-slate-200">{idea}</p>
                </div>
              ))}
            </div>
          )}
          {data.winningTopics?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted mb-2">🏆 WINNING TOPICS</div>
              <div className="flex flex-wrap gap-2">{data.winningTopics.map((t,i)=><span key={i} className="text-xs px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300">{t}</span>)}</div>
            </div>
          )}
          {data.seriesOpportunities?.length > 0 && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
              <div className="text-xs text-indigo-400 mb-2">📺 SERIEN-CHANCEN</div>
              {data.seriesOpportunities.map((s,i)=><p key={i} className="text-sm text-indigo-200 py-1">• {s}</p>)}
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted mb-1">COMMUNITY STIMMUNG</div>
            <div className="text-sm text-slate-200 capitalize">{data.communityMood || '—'}</div>
          </div>
        </div>
      )}
      {!loading && data?.error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>}
    </div>
  )
}
