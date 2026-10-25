// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

export default function KnowledgePage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobLoading) return
    const stepOut = getStepOutput(2)
    if (stepOut && (stepOut.entries || stepOut.insights || stepOut.totalEntries !== undefined)) {
      setData(stepOut); setLoading(false); return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/knowledge', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ topic:'Luxury', niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
        if (!res.ok) throw new Error(`API ${res.status}`)
        setData(await res.json())
      } catch(e) { setData({ error: String(e) }) }
      finally { setLoading(false) }
    })()
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl animate-pulse mb-3">🧠</div>
      <p className="text-sm text-muted">Knowledge Base wird geladen…</p>
    </div>
  )
  if (data?.error) return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>

  const entries = data?.entries || data?.insights || []
  const tags = data?.topTags || data?.tags || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🧠 Knowledge Base</h1>
          <p className="text-xs text-muted mt-0.5">{data?.totalEntries ?? entries.length} Einträge gespeichert</p>
        </div>
        <span className="text-xs text-muted">{job ? `Job ${job.id.slice(0,8)}… · Step 2` : 'Direkt'}</span>
      </div>
      {data?.isDuplicate && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-400">
          ⚠️ Duplikat erkannt: Ähnlicher Content existiert bereits
        </div>
      )}
      {tags.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-2">🏷 TOP TAGS</div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-indigo-400">{t}</span>)}
          </div>
        </div>
      )}
      {entries.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="text-xs text-muted">LETZTE EINTRÄGE</div>
          {entries.slice(0,5).map((e, i) => (
            <div key={i} className="border-b border-border/40 pb-2 last:border-0">
              <div className="text-xs font-medium text-white">{e.topic || e.title || JSON.stringify(e).slice(0,80)}</div>
              {e.tags && <div className="flex gap-1 mt-1">{(e.tags||[]).slice(0,4).map((t,j) => <span key={j} className="text-xs text-muted bg-surface px-1.5 rounded">{t}</span>)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
