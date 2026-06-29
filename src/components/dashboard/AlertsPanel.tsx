import { ALERTS } from '@/lib/demo-data'

const dotColor: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

const textColor: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

export default function AlertsPanel() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-white">Alerts & Events</h2>
      </div>
      <div className="divide-y divide-border/50">
        {ALERTS.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface/50 transition-colors">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor[alert.level]}`}></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 leading-snug">{alert.message}</p>
            </div>
            <span className="text-xs text-muted flex-shrink-0">{alert.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
