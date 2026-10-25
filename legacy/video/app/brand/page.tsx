// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

export default function BrandPage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobLoading) return
    const stepOut = getStepOutput(5)
    if (stepOut && (stepOut.brandScore !== undefined || stepOut.checks)) {
      setData(stepOut); setLoading(false); return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/brand', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ topic:'Luxury Lifestyle', niche:'Luxury Lifestyle + Nostalgie + Motivation', script:'' }) })
        if (!res.ok) throw new Error(`API ${res.status}`)
        setData(await res.json())
      } catch(e) { setData({ error: String(e) }) }
      finally { setLoading(false) }
    })()
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl animate-pulse mb-3">🎨</div>
      <p className="text-sm text-muted">Brand-Check läuft…</p>
    </div>
  )
  if (data?.error) return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>

  const score = data?.brandScore ?? data?.score ?? 0
  const passed = data?.passed ?? score >= 70
  const checks = data?.checks || []
  const forbidden = data?.forbiddenFound || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🎨 Brand Consistency</h1>
        <span className="text-xs text-muted">{job ? `Job ${job.id.slice(0,8)}… · Step 5` : 'Direkt'}</span>
      </div>

      {/* Score */}
      <div className={`bg-card border rounded-xl p-5 flex items-center gap-5 ${passed ? 'border-green-500/30' : 'border-red-500/30'}`}>
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#1e1e2e" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke={passed?'#10b981':'#ef4444'} strokeWidth="3"
              strokeDasharray={`${score * 0.942} 94.2`} strokeLinecap="round"/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-base font-bold text-white">{score}</div>
        </div>
        <div>
          <div className={`text-lg font-bold ${passed?'text-green-400':'text-red-400'}`}>{passed?'✅ BRAND OK':'❌ ÜBERARBEITUNG'}</div>
          <div className="text-xs text-muted mt-0.5">Brand Score: {score}/100</div>
        </div>
      </div>

      {checks.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-3">BRAND CHECKS</div>
          <div className="space-y-2">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span>{c.passed?'✅':'❌'}</span>
                <span className="text-slate-300">{c.label || c.check || JSON.stringify(c)}</span>
                {c.score !== undefined && <span className="ml-auto text-muted">{c.score}/100</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {forbidden.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="text-xs text-red-400 font-medium mb-2">⛔ VERBOTENE PHRASEN GEFUNDEN</div>
          {forbidden.map((f, i) => <div key={i} className="text-xs text-red-300">• {f}</div>)}
        </div>
      )}
    </div>
  )
}
