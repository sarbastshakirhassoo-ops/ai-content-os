// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

export default function EngagementPage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobLoading) return
    const stepOut = getStepOutput(12)
    if (stepOut && (stepOut.contentIdeas || stepOut.communityMood)) {
      setData(stepOut); setLoading(false); return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/engagement', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
        if (!res.ok) throw new Error(`API ${res.status}`)
        setData(await res.json())
      } catch(e) { setData({ error: String(e) }) }
      finally { setLoading(false) }
    })()
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl animate-pulse mb-3">💬</div>
      <p className="text-sm text-muted">Engagement-Daten werden geladen…</p>
    </div>
  )
  if (data?.error) return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>

  const ideas = data?.contentIdeas || []
  const series = data?.seriesOpportunities || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">💬 Engagement Analyzer</h1>
        <span className="text-xs text-muted">{job ? `Job ${job.id.slice(0,8)}… · Step 12` : 'Direkt'}</span>
      </div>
      {data?.communityMood && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-1">COMMUNITY MOOD</div>
          <p className="text-sm text-white">{data.communityMood}</p>
        </div>
      )}
      {ideas.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-3">💡 CONTENT IDEEN</div>
          <div className="space-y-2">
            {ideas.slice(0,6).map((idea, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-indigo-400 shrink-0">{i+1}.</span>
                <span>{typeof idea === 'string' ? idea : idea.idea || idea.title || JSON.stringify(idea)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {series.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-3">📺 SERIEN-CHANCEN</div>
          <div className="flex flex-wrap gap-2">
            {series.map((s, i) => (
              <span key={i} className="text-xs px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                {typeof s === 'string' ? s : s.title || s.name || JSON.stringify(s)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
