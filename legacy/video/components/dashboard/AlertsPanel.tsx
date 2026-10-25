'use client'

import { useEffect, useState } from 'react'

interface Alert {
  id: number
  level: string
  message: string
  time: string
}

const dotColor: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.alerts)) setAlerts(data.alerts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-white">Alerts & Events</h2>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center">
          <span className="w-4 h-4 inline-block border border-t-white/40 border-white/10 rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-muted">Keine Alerts — System bereit</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface/50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor[alert.level] || 'bg-muted'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-snug">{alert.message}</p>
              </div>
              <span className="text-xs text-muted flex-shrink-0">{alert.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
