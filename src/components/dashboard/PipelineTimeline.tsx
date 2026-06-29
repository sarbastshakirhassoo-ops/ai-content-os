import { AGENT_DEFINITIONS } from '@/lib/demo-data'
import { StatusBadge } from '@/components/ui/Badge'

const statusDotColor: Record<string, string> = {
  idle: 'bg-muted',
  running: 'bg-info animate-pulse',
  success: 'bg-success',
  error: 'bg-danger',
  waiting: 'bg-warning',
}

export default function PipelineTimeline() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Agent Pipeline</h2>
        <span className="text-xs text-muted">12 agents</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-0 min-w-max">
          {AGENT_DEFINITIONS.map((agent, idx) => (
            <div key={agent.id} className="flex items-center">
              <div className="flex flex-col items-center w-24">
                <div
                  className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-xl mb-1.5 relative"
                  style={{ backgroundColor: agent.color + '18', borderColor: agent.color + '40' }}
                >
                  {agent.icon}
                  <div
                    className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-card ${statusDotColor[agent.status]}`}
                  ></div>
                </div>
                <span className="text-xs text-center text-muted leading-tight px-1">{agent.name}</span>
                <div className="mt-1">
                  <StatusBadge status={agent.status} />
                </div>
              </div>
              {idx < AGENT_DEFINITIONS.length - 1 && (
                <div className="w-6 h-px bg-border mx-1 flex-shrink-0"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
