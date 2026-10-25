// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

function Bar({ value, max, color='#6366f1' }) {
  const pct = Math.round((value/Math.max(max,1))*100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:color}}/>
      </div>
      <span className="text-xs text-muted w-8 text-right">{value}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobLoading) return
    const stepOut = getStepOutput(11)
    if (stepOut && (stepOut.metrics || stepOut.alerts || stepOut.recommendations)) {
      setData(stepOut); setLoading(false); return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/analytics', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
        if (!res.ok) throw new Error(`API ${res.status}`)
        setData(await res.json())
      } catch(e) { setData({ error: String(e) }) }
      finally { setLoading(false) }
    })()
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl animate-pulse mb-3">📊</div>
      <p className="text-sm text-muted">Analytics werden geladen…</p>
    </div>
  )
  if (data?.error) return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>

  const metrics = data?.metrics || {}
  const recs = data?.recommendations || []
  const alerts = data?.alerts || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">📊 Analytics Brain</h1>
        <span className="text-xs text-muted">{job ? `Job ${job.id.slice(0,8)}… · Step 11` : 'Direkt'}</span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Views', value: metrics.views || 0, color:'#6366f1' },
          { label:'Likes', value: metrics.likes || 0, color:'#ec4899' },
          { label:'Shares', value: metrics.shares || 0, color:'#10b981' },
          { label:'Comments', value: metrics.comments || 0, color:'#f59e0b' },
          { label:'Saves', value: metrics.saves || 0, color:'#06b6d4' },
          { label:'Retention', value: `${metrics.retention || 0}%`, color:'#8b5cf6' },
        ].map((m,i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-lg font-bold" style={{color:m.color}}>{m.value}</div>
            <div className="text-xs text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="text-xs text-yellow-400 font-medium mb-2">⚠️ ALERTS</div>
          {alerts.map((a,i) => <div key={i} className="text-xs text-yellow-300 py-0.5">• {typeof a==='string'?a:a.message||JSON.stringify(a)}</div>)}
        </div>
      )}
      {recs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-3">💡 EMPFEHLUNGEN</div>
          {recs.map((r,i) => <div key={i} className="text-xs text-slate-300 py-1 border-b border-border/40 last:border-0">• {typeof r==='string'?r:r.text||JSON.stringify(r)}</div>)}
        </div>
      )}
    </div>
  )
}
