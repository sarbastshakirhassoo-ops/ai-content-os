import { DEMO_KPI } from '@/lib/demo-data'
import { formatNumber } from '@/lib/utils'

const KPI_CONFIG = [
  { key: 'videosToday', label: 'Videos Today', icon: '🎬', color: 'text-accent', format: (v: number) => v.toString() },
  { key: 'totalViews', label: 'Total Views', icon: '👁', color: 'text-info', format: (v: number) => formatNumber(v) },
  { key: 'successfulUploads', label: 'Successful Uploads', icon: '✅', color: 'text-success', format: (v: number) => v.toString() },
  { key: 'avgWatchtime', label: 'Avg Watchtime', icon: '⏱', color: 'text-warning', format: (v: number) => `${v}s` },
  { key: 'bestPlatform', label: 'Best Platform', icon: '🏆', color: 'text-accent-hover', format: (v: unknown) => String(v) },
  { key: 'activeAgents', label: 'Active Agents', icon: '⚡', color: 'text-success', format: (v: number) => `${v} / 12` },
] as const

export default function KPICards() {
  return (
    <div className="grid grid-cols-3 gap-4 xl:grid-cols-6">
      {KPI_CONFIG.map((kpi) => {
        const value = DEMO_KPI[kpi.key as keyof typeof DEMO_KPI]
        return (
          <div key={kpi.key} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${kpi.color} mb-1`}>
              {kpi.format(value as number)}
            </div>
            <div className="text-xs text-muted">{kpi.label}</div>
          </div>
        )
      })}
    </div>
  )
}
