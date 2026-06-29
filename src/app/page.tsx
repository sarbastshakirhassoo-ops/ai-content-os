'use client'
import { useState } from 'react'
import KPICards from '@/components/dashboard/KPICards'
import JobQueuePanel from '@/components/dashboard/JobQueuePanel'
import { AGENT_DEFINITIONS } from '@/lib/demo-data'

export default function DashboardPage() {
  const [launching, setLaunching] = useState(false)
  const [lastJob, setLastJob]     = useState<string|null>(null)
  const [topic, setTopic]         = useState('')

  const startJob = async () => {
    if (launching) return
    setLaunching(true)
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic',
          topic: topic || 'Luxury Lifestyle',
          triggeredBy: 'manual',
        }),
      })
      const d = await r.json()
      if (d.jobId) {
        setLastJob(d.jobId)
        // Start pipeline in background
        fetch('/api/workflow/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: d.jobId }),
        })
      }
    } catch(e) { console.error(e) }
    finally { setLaunching(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🎬 AI Content Factory</h1>
          <p className="text-xs text-muted mt-0.5">Luxury Lifestyle · Nostalgie · Motivation · @killa_wp</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Topic (optional)"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-white placeholder-muted outline-none focus:border-indigo-500 w-48"
          />
          <button
            onClick={startJob}
            disabled={launching}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {launching ? '⏳ Starting…' : '🚀 Start Pipeline'}
          </button>
        </div>
      </div>

      {lastJob && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-indigo-300">
          ✅ Job gestartet: <code className="text-xs opacity-70">{lastJob}</code>
          {' '}— Pipeline läuft im Hintergrund. Queue wird live aktualisiert.
        </div>
      )}

      {/* KPI Row */}
      <KPICards />

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Job Queue — 2/3 width */}
        <div className="xl:col-span-2">
          <JobQueuePanel />
        </div>

        {/* Agent Status — 1/3 width */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-white">🤖 14 Agents</h2>
          </div>
          <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
            {AGENT_DEFINITIONS.map(a => (
              <div key={a.slug} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-base w-6 text-center">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{a.name}</div>
                  <div className="text-xs text-muted truncate">{a.input.slice(0,40)}</div>
                </div>
                <div className="h-2 w-2 rounded-full bg-slate-600 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">🔄 14-Step Pipeline</h2>
        <div className="flex flex-wrap gap-2">
          {AGENT_DEFINITIONS.map((a, i) => (
            <div key={a.slug} className="flex items-center gap-1">
              <div className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: a.color + '20', color: a.color, border: `1px solid ${a.color}40` }}>
                {i+1}. {a.icon} {a.name}
              </div>
              {i < AGENT_DEFINITIONS.length - 1 && <span className="text-muted text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/workflow',   icon: '⚙️', label: 'Workflow',   desc: 'Pipeline manuell' },
          { href: '/trends',     icon: '🔥', label: 'Trends',     desc: 'Creator Discovery' },
          { href: '/scripts',    icon: '✍️',  label: 'Scripts',    desc: 'Script Writer' },
          { href: '/analytics',  icon: '📊', label: 'Analytics',  desc: 'Performance' },
        ].map(l => (
          <a key={l.href} href={l.href} className="bg-card border border-border hover:border-indigo-500/50 rounded-xl p-4 transition-colors group">
            <div className="text-xl mb-1">{l.icon}</div>
            <div className="text-sm font-medium text-white group-hover:text-indigo-300">{l.label}</div>
            <div className="text-xs text-muted">{l.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
