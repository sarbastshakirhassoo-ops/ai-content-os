import { formatNumber } from '@/lib/utils'

const PLATFORM_STATS = [
  { platform: 'TikTok', views: 284000, likes: 18200, comments: 3400, shares: 2100, retention: 67, color: '#3b82f6' },
  { platform: 'YouTube', views: 156000, likes: 12400, comments: 8900, shares: 1800, retention: 71, color: '#ef4444' },
  { platform: 'Instagram', views: 98000, likes: 7200, comments: 1200, shares: 890, retention: 58, color: '#8b5cf6' },
]

const HOOK_STATS = [
  { hook: '"Before you X, watch this"', retention: 74, uses: 3 },
  { hook: '"In 90 days, X will happen"', retention: 68, uses: 2 },
  { hook: '"I made $X using only Y"', retention: 65, uses: 2 },
  { hook: '"The hidden cost of X"', retention: 61, uses: 1 },
  { hook: '"Nobody is talking about X"', retention: 58, uses: 1 },
]

const STATS = [
  { label: 'Total Views (7d)', value: formatNumber(538000), color: 'text-white' },
  { label: 'Avg Retention', value: '65.3%', color: 'text-success' },
  { label: 'Best Platform', value: 'YouTube', color: 'text-danger' },
  { label: 'Best Post Time', value: '7–9 PM EST', color: 'text-accent-hover' },
  { label: 'Total Likes', value: formatNumber(37800), color: 'text-info' },
  { label: 'Total Shares', value: formatNumber(4790), color: 'text-warning' },
]

export default function AnalyticsPage() {
  const maxRetention = Math.max(...HOOK_STATS.map(h => h.retention))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-muted mt-0.5">Cross-platform performance data — last 7 days</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-xs text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-white">Platform Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Platform', 'Views', 'Likes', 'Comments', 'Retention'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLATFORM_STATS.map((p) => (
                  <tr key={p.platform} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <span className="text-xs text-white font-medium">{p.platform}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white font-medium">{formatNumber(p.views)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{formatNumber(p.likes)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{formatNumber(p.comments)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-success" style={{ width: `${p.retention}%` }}></div>
                        </div>
                        <span className="text-xs text-success font-medium">{p.retention}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Hook Performance (Avg Retention)</h2>
          <div className="space-y-3">
            {HOOK_STATS.map((h) => (
              <div key={h.hook}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 italic truncate max-w-[220px]">{h.hook}</span>
                  <span className="text-xs text-success font-bold ml-2 flex-shrink-0">{h.retention}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${(h.retention / maxRetention) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted mt-0.5">{h.uses} video{h.uses !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
