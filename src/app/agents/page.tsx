import { AGENT_DEFINITIONS } from '@/lib/demo-data'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDuration, timeAgo } from '@/lib/utils'

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Agents</h1>
        <p className="text-sm text-muted mt-0.5">12 specialized AI agents in the content pipeline</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AGENT_DEFINITIONS.map((agent, idx) => (
          <div
            key={agent.id}
            className="bg-card border border-border rounded-xl p-5 hover:border-accent/40 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border"
                  style={{ backgroundColor: agent.color + '18', borderColor: agent.color + '40' }}
                >
                  {agent.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono">#{idx + 1}</span>
                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed mb-4">{agent.description}</p>

            <div className="space-y-2 mb-4">
              <div className="bg-surface rounded-lg px-3 py-2">
                <div className="text-xs text-muted mb-0.5 uppercase tracking-wide font-medium">Input</div>
                <div className="text-xs text-slate-300">{agent.input}</div>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2">
                <div className="text-xs text-muted mb-0.5 uppercase tracking-wide font-medium">Output</div>
                <div className="text-xs text-slate-300">{agent.output}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-3">
              <div className="flex items-center gap-3">
                <span>Last: {agent.lastRunMs ? formatDuration(agent.lastRunMs) : '—'}</span>
                {agent.errorCount > 0 && (
                  <span className="text-danger">{agent.errorCount} error{agent.errorCount !== 1 ? 's' : ''}</span>
                )}
              </div>
              <span>{agent.lastRun ? timeAgo(agent.lastRun) : 'Never'}</span>
            </div>

            {agent.lastError && (
              <div className="mt-3 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                <p className="text-xs text-danger/80 leading-snug">{agent.lastError}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
