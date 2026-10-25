'use client'
import { useEffect, useState } from 'react'
import type { HealthResponse } from '@/types'

// Zeigt ausschliesslich, was /api/health tatsächlich meldet.
// Solange nichts geladen ist, wird "…" angezeigt — niemals ein erfundener Wert.
export default function StatusBar() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setFailed(true))
  }, [])

  const live = health?.capabilities.filter((c) => c.status === 'CONNECTED').length
  const total = health?.capabilities.length

  return (
    <header className="fixed top-0 left-0 md:left-56 right-0 h-10 bg-surface border-b border-border flex items-center px-4 gap-4 z-40">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <div className={`w-1.5 h-1.5 rounded-full ${failed ? 'bg-danger' : 'bg-warning'}`}></div>
        <span className={`text-xs font-medium truncate ${failed ? 'text-danger' : 'text-warning'}`}>
          {failed ? 'Health-Check nicht erreichbar' : health ? health.roadmapLabel : 'Lade Status…'}
        </span>
      </div>

      <div className="h-4 w-px bg-border"></div>

      <div className="text-xs text-muted shrink-0 whitespace-nowrap">
        <span className="text-white font-medium">{live ?? '…'}</span> von{' '}
        <span className="text-white font-medium">{total ?? '…'}</span> Komponenten aktiv
      </div>
    </header>
  )
}
