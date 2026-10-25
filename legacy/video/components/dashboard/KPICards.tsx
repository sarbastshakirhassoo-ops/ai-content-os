'use client'
import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import type { KPIData } from '@/types'

const EMPTY: KPIData = {
  videosToday:0, successfulUploads:0, failedUploads:0,
  avgWatchtime:0, bestPlatform:'—', activeAgents:0, totalViews:0,
  totalJobs:0, runningJobs:0, queuedJobs:0, avgQcScore:0,
}

const CARDS = [
  { key:'totalJobs',       label:'Jobs Gesamt',       icon:'⚙️', color:'text-slate-300',  fmt:(v:number)=>v.toString() },
  { key:'runningJobs',     label:'Aktive Jobs',       icon:'🔄', color:'text-yellow-400', fmt:(v:number)=>v.toString() },
  { key:'successfulUploads', label:'Uploads',         icon:'🚀', color:'text-green-400',  fmt:(v:number)=>v.toString() },
  { key:'avgQcScore',      label:'Ø QC Score',        icon:'✅', color:'text-blue-400',   fmt:(v:number)=>v>0?`${v}/100`:'—' },
  { key:'totalViews',      label:'Total Views',       icon:'👁',  color:'text-purple-400', fmt:(v:number)=>formatNumber(v) },
  { key:'bestPlatform',    label:'Best Platform',     icon:'🏆', color:'text-amber-400',  fmt:(v:unknown)=>String(v) },
] as const

export default function KPICards() {
  const [kpi, setKpi]       = useState<KPIData>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/dashboard').then(r=>r.json())
        .then(d => { if(d.kpi) setKpi(d.kpi) })
        .catch(()=>{})
        .finally(()=>setLoading(false))
    load()
    const id = setInterval(load, 10_000) // poll every 10s
    return () => clearInterval(id)
  }, [])

  return (
    <div className="grid grid-cols-3 gap-3 xl:grid-cols-6">
      {CARDS.map(c => {
        const val = kpi[c.key as keyof KPIData]
        return (
          <div key={c.key} className={`bg-card border border-border rounded-xl p-4 transition-opacity ${loading?'opacity-40':''}`}>
            <div className="text-lg mb-2">{c.icon}</div>
            <div className={`text-2xl font-bold ${c.color} mb-1`}>
              {loading ? <span className="text-muted text-base">…</span> : c.fmt(val as number)}
            </div>
            <div className="text-xs text-muted">{c.label}</div>
          </div>
        )
      })}
    </div>
  )
}
