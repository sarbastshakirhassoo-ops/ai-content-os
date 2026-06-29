'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import type { KPIData } from '@/types'

const EMPTY_KPI: KPIData = {
  videosToday: 0,
  successfulUploads: 0,
  failedUploads: 0,
  avgWatchtime: 0,
  bestPlatform: '—',
  activeAgents: 0,
  totalViews: 0,
}

const KPI_CONFIG = [
  { key: 'videosToday',        label: 'Videos Today',        icon: '🎬', color: 'text-accent',       format: (v: number) => v.toString() },
  { key: 'totalViews',         label: 'Total Views',         icon: '👁',  color: 'text-info',         format: (v: number) => formatNumber(v) },
  { key: 'successfulUploads',  label: 'Successful Uploads',  icon: '✅', color: 'text-success',      format: (v: number) => v.toString() },
  { key: 'avgWatchtime',       label: 'Avg Watchtime',       icon: '⏱',  color: 'text-warning',      format: (v: number) => v > 0 ? `${v}s` : '—' },
  { key: 'bestPlatform',       label: 'Best Platform',       icon: '🏆', color: 'text-accent-hover', format: (v: unknown) => String(v) },
  { key: 'activeAgents',       label: 'Active Agents',       icon: '⚡', color: 'text-success',      format: (v: number) => `${v} / 12` },
] as const

export default function KPICards() {
  const [kpi, setKpi] = useState<KPIData>(EMPTY_KPI)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => { if (data.kpi) setKpi(data.kpi) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="grid grid-cols-3 gap-4 xl:grid-cols-6">
      {KPI_CONFIG.map((cfg) => {
        const value = kpi[cfg.key as keyof KPIData]
        return (
          <div
            key={cfg.key}
            className={`bg-card border border-border rounded-xl p-4 transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{cfg.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${cfg.color} mb-1`}>
              {loading ? <span className="text-muted text-base">…</span> : cfg.format(value as number)}
            </div>
            <div className="text-xs text-muted">{cfg.label}</div>
          </div>
        )
      })}
    </div>
  )
}
