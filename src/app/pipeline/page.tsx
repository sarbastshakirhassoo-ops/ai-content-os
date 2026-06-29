// @ts-nocheck
'use client'
import { useLatestJob } from '@/hooks/useLatestJob'
import Link from 'next/link'

const STEPS = [
  { i:0,  name:'Trend Scout',       icon:'📡', href:'/trends',     desc:'Erkennt Nischen-Trends' },
  { i:1,  name:'Competitor Analyst',icon:'🕵️', href:'/competitor', desc:'Analysiert 8 Creator' },
  { i:2,  name:'Knowledge Base',    icon:'🧠', href:'/knowledge',  desc:'Duplicate-Check + Insights' },
  { i:3,  name:'Script Writer',     icon:'✍️', href:'/script',     desc:'Hook + Vollscript + CTA' },
  { i:4,  name:'SEO Optimizer',     icon:'🔍', href:'/seo',        desc:'Titel, Captions, Hashtags' },
  { i:5,  name:'Brand Consistency', icon:'🎨', href:'/brand',      desc:'Forbidden Phrases Check' },
  { i:6,  name:'Asset Manager',     icon:'🎬', href:'/assets',     desc:'Pexels -> Pixabay -> Mixkit' },
  { i:7,  name:'InVideo AI',        icon:'🎥', href:'/video',      desc:'Video-Generierung' },
  { i:8,  name:'QC Inspector',      icon:'🔬', href:'/qc',         desc:'10 Qualitaetsdimensionen' },
  { i:9,  name:'Content Calendar',  icon:'📅', href:'/calendar',   desc:'Optimaler Post-Zeitpunkt' },
  { i:10, name:'Upload Bot',        icon:'🚀', href:'/upload',     desc:'IG + TikTok + YouTube' },
  { i:11, name:'Analytics Brain',   icon:'📊', href:'/analytics',  desc:'Performance-Metriken' },
  { i:12, name:'Engagement',        icon:'💬', href:'/engagement', desc:'Content-Ideen aus Kommentaren' },
  { i:13, name:'Learning Agent',    icon:'🤖', href:'/learning',   desc:'Nische kontinuierlich verbessern' },
]

const STATUS_STYLE = {
  pending:   { bg:'bg-surface', border:'border-border', dot:'bg-slate-600', text:'text-muted' },
  running:   { bg:'bg-indigo-500/5', border:'border-indigo-500/50', dot:'bg-indigo-400 animate-pulse', text:'text-indigo-300' },
  retrying:  { bg:'bg-yellow-500/5', border:'border-yellow-500/50', dot:'bg-yellow-400 animate-bounce', text:'text-yellow-300' },
  completed: { bg:'bg-green-500/5', border:'border-green-500/30', dot:'bg-green-400', text:'text-green-300' },
  failed:    { bg:'bg-red-500/5', border:'border-red-500/30', dot:'bg-red-400', text:'text-red-300' },
  blocked:   { bg:'bg-orange-500/5', border:'border-orange-500/30', dot:'bg-orange-400', text:'text-orange-300' },
}

export default function PipelinePage() {
  const { job, loading } = useLatestJob(2000)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline — 14 Agents verbunden</h1>
          <p className="text-xs text-muted mt-0.5">Jeder Agent gibt Output automatisch an den naechsten weiter</p>
        </div>
        {job && (
          <div className="text-right">
            <div className="text-xs text-muted">{job.topic || 'Kein Topic'}</div>
            <div className={`text-xs font-medium mt-0.5 ${
              job.status==='completed'?'text-green-400':
              job.status==='running'?'text-indigo-400':
              job.status==='failed'?'text-red-400':'text-muted'
            }`}>
              {job.status === 'running' ? 'Laeuft...' :
               job.status === 'completed' ? 'Abgeschlossen' :
               job.status === 'failed' ? 'Fehlgeschlagen' : 'In Warteschlange'}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {STEPS.map((step, idx) => {
          const jobStep = job?.steps?.[step.i]
          const status  = jobStep?.status || 'pending'
          const s       = STATUS_STYLE[status] || STATUS_STYLE.pending
          const ms      = jobStep?.durationMs
          return (
            <div key={step.i}>
              <Link href={step.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:opacity-80 cursor-pointer ${s.bg} ${s.border}`}>
                  <div className="flex items-center gap-2 w-14 shrink-0">
                    <span className="text-xs text-muted w-4">{step.i + 1}</span>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`}/>
                  </div>
                  <span className="text-base w-6 shrink-0">{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{step.name}</div>
                    <div className="text-xs text-muted truncate">{step.desc}</div>
                  </div>
                  <div className={`text-xs font-medium shrink-0 ${s.text}`}>
                    {status === 'completed' && ms ? ms + 'ms' :
                     status === 'running'   ? 'Laeuft' :
                     status === 'failed'    ? 'Fehler' :
                     status === 'blocked'   ? 'Blockiert' :
                     status === 'retrying'  ? 'Retry' : '-'}
                  </div>
                  <span className="text-muted text-xs">›</span>
                </div>
              </Link>
              {idx < STEPS.length - 1 && (
                <div className="flex items-center pl-16">
                  <div className={`w-px h-1.5 ${jobStep?.status === 'completed' ? 'bg-green-500/50' : 'bg-border'}`}/>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!loading && !job && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted">Noch kein Job gestartet.</p>
          <Link href="/" className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300">Dashboard oeffnen und Pipeline starten</Link>
        </div>
      )}

      {job && job.status === 'completed' && (
        <div className="rounded-xl p-4 flex items-center justify-between" style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div>
            <div className="text-sm font-medium text-green-400">Pipeline abgeschlossen</div>
            <div className="text-xs text-muted mt-0.5">QC Score: {job.qcScore ?? '-'}/100</div>
          </div>
          <div className="text-xs text-muted">14/14 Steps</div>
        </div>
      )}
    </div>
  )
}
