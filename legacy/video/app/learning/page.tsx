// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

export default function LearningPage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobLoading) return
    const stepOut = getStepOutput(13)
    if (stepOut && (stepOut.insights || stepOut.improvements || stepOut.score !== undefined)) {
      setData(stepOut); setLoading(false); return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/learning', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ niche:'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic' }) })
        if (!res.ok) throw new Error('API ' + res.status)
        setData(await res.json())
      } catch(e) { setData({ error: String(e) }) }
      finally { setLoading(false) }
    })()
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl animate-pulse mb-3">🤖</div>
      <p className="text-sm text-muted">Learning Agent analysiert…</p>
    </div>
  )
  if (data?.error) return (
    <div className="rounded-xl p-4 text-sm" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5'}}>{data.error}</div>
  )

  const insights     = data?.insights     || data?.learnings     || []
  const improvements = data?.improvements || data?.suggestions   || []
  const score        = data?.score        ?? data?.overallScore  ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🤖 Learning Agent</h1>
          <p className="text-xs text-muted mt-0.5">Optimiert die Nische kontinuierlich aus jedem Job</p>
        </div>
        <span className="text-xs text-muted">{job ? 'Job ' + job.id.slice(0,8) + '… · Step 13' : 'Direkt'}</span>
      </div>

      {score !== null && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1e1e2e" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={score * 0.942 + ' 94.2'} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{score}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Nischen-Fitness Score</div>
            <div className="text-xs text-muted mt-0.5">Basierend auf letztem Pipeline-Durchlauf</div>
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-3">💡 ERKENNTNISSE</div>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex gap-2 text-xs" style={{color:'#cbd5e1'}}>
                <span className="text-indigo-400 shrink-0">{i+1}.</span>
                <span>{typeof ins === 'string' ? ins : ins.text || ins.insight || JSON.stringify(ins)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {improvements.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-3">🔧 VERBESSERUNGEN FUER NAECHSTEN JOB</div>
          <div className="space-y-2">
            {improvements.map((imp, i) => (
              <div key={i} className="flex gap-2 text-xs py-1 border-b border-border/40 last:border-0" style={{color:'#cbd5e1'}}>
                <span className="text-green-400 shrink-0">→</span>
                <span>{typeof imp === 'string' ? imp : imp.text || imp.suggestion || JSON.stringify(imp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!insights.length && !improvements.length && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted">Starte eine Pipeline um Learning-Daten zu sehen.</p>
        </div>
      )}
    </div>
  )
}
