// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

export default function QCPage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobLoading) return
    const stepOut = getStepOutput(8)
    if (stepOut && (stepOut.report || stepOut.overallScore !== undefined)) {
      setData(stepOut); setLoading(false); return
    }
    setData({ info: 'QC laeuft nach der Video-Generierung (Step 8 der Pipeline).' })
    setLoading(false)
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl animate-pulse mb-3">🔬</div>
      <p className="text-sm text-muted">QC-Daten werden geladen</p>
    </div>
  )

  const report = data?.report || data
  const score  = report?.overallScore ?? 0
  const passed = report?.passed ?? score >= 60
  const checks = report?.checks || []
  const blockers = report?.blockers || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🔬 QC Inspector</h1>
        <span className="text-xs text-muted">{job ? 'Job ' + job.id.slice(0,8) + '... - Step 8' : '-'}</span>
      </div>

      {data?.info ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm text-muted">{data.info}</p>
          <p className="text-xs text-muted mt-2">Starte eine Pipeline vom Dashboard um QC-Daten zu sehen.</p>
        </div>
      ) : (
        <>
          <div className="bg-card border rounded-xl p-5 flex items-center gap-5" style={{borderColor: passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}}>
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#1e1e2e" strokeWidth="3"/>
                <circle cx="18" cy="18" r="15" fill="none" stroke={passed ? '#10b981' : '#ef4444'} strokeWidth="3"
                  strokeDasharray={score * 0.942 + ' 94.2'} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-base font-bold text-white">{score}</div>
            </div>
            <div>
              <div className="text-lg font-bold" style={{color: passed ? '#10b981' : '#ef4444'}}>{passed ? '✅ QC BESTANDEN' : '❌ NICHT BESTANDEN'}</div>
              <div className="text-xs text-muted mt-0.5">Mindest-Score: 60 - Aktuell: {score}/100</div>
            </div>
          </div>

          {blockers.length > 0 && (
            <div className="rounded-xl p-4" style={{background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)'}}>
              <div className="text-xs font-medium mb-2" style={{color:'#f87171'}}>🚫 BLOCKER - Upload gesperrt</div>
              {blockers.map((b,i) => <div key={i} className="text-xs py-0.5" style={{color:'#fca5a5'}}>- {b}</div>)}
            </div>
          )}

          {checks.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted mb-3">QC DIMENSIONEN</div>
              <div className="space-y-2">
                {checks.map((c,i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs">{c.passed ? '✅' : '❌'}</span>
                    <span className="text-xs flex-1" style={{color:'#cbd5e1'}}>{c.label || c.name || c.check}</span>
                    <div className="w-20 rounded-full h-1.5 overflow-hidden" style={{background:'#1e1e2e'}}>
                      <div className="h-full rounded-full" style={{width: (c.score||0) + '%', backgroundColor: c.passed ? '#10b981' : '#ef4444'}}/>
                    </div>
                    <span className="text-xs text-muted w-8 text-right">{c.score||0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
