import { DEMO_KPI, AGENT_DEFINITIONS } from '@/lib/demo-data'

export default function StatusBar() {
  const activeAgents = AGENT_DEFINITIONS.filter(a => a.status === 'running' || a.status === 'waiting').length
  const errors = AGENT_DEFINITIONS.filter(a => a.status === 'error').length

  return (
    <header className="fixed top-0 left-56 right-0 h-10 bg-surface border-b border-border flex items-center px-4 gap-6 z-40">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
        <span className="text-xs text-success font-medium">System Online</span>
      </div>

      <div className="h-4 w-px bg-border"></div>

      <div className="flex items-center gap-4 text-xs text-muted">
        <span>
          <span className="text-white font-medium">{activeAgents}</span> Active Agents
        </span>
        <span>
          <span className="text-white font-medium">{DEMO_KPI.videosToday}</span> Videos Today
        </span>
        <span>
          <span className="text-success font-medium">{DEMO_KPI.successfulUploads}</span> Uploads
        </span>
        {errors > 0 && (
          <span>
            <span className="text-danger font-medium">{errors}</span> Errors
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/20 rounded px-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
          <span className="text-xs text-warning font-medium">Demo Mode</span>
        </div>
      </div>
    </header>
  )
}
