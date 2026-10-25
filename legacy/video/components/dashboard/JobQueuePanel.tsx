'use client'
import { useEffect, useState, useCallback } from 'react'
import type { WorkflowJob } from '@/types'

const STATUS_STYLE: Record<string, string> = {
  queued:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  running:   'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse',
  completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  failed:    'bg-red-500/10 text-red-400 border-red-500/30',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  paused:    'bg-orange-500/10 text-orange-400 border-orange-500/30',
}

function stepBar(job: WorkflowJob) {
  const done    = job.steps.filter(s=>s.status==='completed').length
  const failed  = job.steps.filter(s=>s.status==='failed').length
  const running = job.steps.filter(s=>s.status==='running'||s.status==='retrying').length
  const pct     = Math.round((done / job.totalSteps) * 100)
  return { done, failed, running, pct }
}

export default function JobQueuePanel() {
  const [jobs, setJobs]     = useState<WorkflowJob[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)

  const load = useCallback(() =>
    fetch('/api/jobs').then(r=>r.json())
      .then(d => { if(Array.isArray(d.jobs)) setJobs(d.jobs) })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  , [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5_000)
    return () => clearInterval(id)
  }, [load])

  const retry = async (jobId: string) => {
    await fetch(`/api/jobs/${jobId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'retry'}) })
    load()
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">⚙️ Job Queue</h2>
        <span className="text-xs text-muted">{loading ? '…' : `${jobs.length} Jobs`}</span>
      </div>

      {jobs.length === 0 && !loading ? (
        <div className="px-4 py-10 text-center">
          <p className="text-2xl mb-2">🚀</p>
          <p className="text-sm text-muted">Noch keine Jobs — Workflow starten</p>
          <a href="/workflow" className="inline-block mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg">Workflow starten →</a>
        </div>
      ) : (
        <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
          {jobs.slice(0,20).map(job => {
            const { done, failed, running, pct } = stepBar(job)
            const isExp = expanded === job.id
            return (
              <div key={job.id}>
                <div
                  className="px-4 py-3 hover:bg-surface/50 cursor-pointer"
                  onClick={()=>setExpanded(isExp ? null : job.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white font-medium truncate max-w-[180px]">{job.topic || job.niche.slice(0,30)}</span>
                    <span className={`text-xs px-2 py-0.5 border rounded ${STATUS_STYLE[job.status]||'text-muted'}`}>{job.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all" style={{width:`${pct}%`}} />
                    </div>
                    <span className="text-xs text-muted shrink-0">{done}/{job.totalSteps}</span>
                    {failed > 0 && <span className="text-xs text-red-400">{failed} ❌</span>}
                    {running > 0 && <span className="text-xs text-blue-400 animate-pulse">{running} 🔄</span>}
                  </div>
                  {job.qcScore !== undefined && (
                    <div className="text-xs text-muted mt-1">QC: <span className={job.qcPassed?'text-green-400':'text-red-400'}>{job.qcScore}/100 {job.qcPassed?'✅':'❌'}</span></div>
                  )}
                </div>
                {isExp && (
                  <div className="px-4 pb-3 bg-surface/30">
                    <div className="text-xs text-muted mb-2">Agent-Steps:</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {job.steps.map((s,i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-center">
                            {s.status==='completed'?'✅':s.status==='failed'?'❌':s.status==='running'||s.status==='retrying'?'🔄':s.status==='blocked'?'🚫':'⏳'}
                          </span>
                          <span className={s.status==='completed'?'text-slate-300':s.status==='failed'?'text-red-400':s.status==='blocked'?'text-orange-400':'text-muted'}>{s.agentName}</span>
                          {s.durationMs && <span className="text-muted ml-auto">{s.durationMs}ms</span>}
                        </div>
                      ))}
                    </div>
                    {job.status === 'failed' && (
                      <button onClick={()=>retry(job.id)} className="mt-2 text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white">Retry</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
