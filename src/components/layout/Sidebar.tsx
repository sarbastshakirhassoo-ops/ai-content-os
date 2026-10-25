'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { HealthResponse } from '@/types'

// Navigation wächst mit der Roadmap. Ein Eintrag wird erst hinzugefügt,
// wenn die Route tatsächlich existiert und funktioniert.
type NavItem = { href: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: '/brain', label: 'Central Brain', icon: '◈' },
  { href: '/memory', label: 'Gedächtnis', icon: '◍' },
  { href: '/trace', label: 'Trace', icon: '◇' },
  { href: '/', label: 'System Status', icon: '◉' },
]

export default function Sidebar() {
  // Der Fortschritt wird aus /api/health gelesen, nie hartkodiert.
  const [health, setHealth] = useState<HealthResponse | null>(null)
  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => setHealth(null))
  }, [])

  const active = health?.capabilities.filter((c) => c.status === 'CONNECTED').length ?? 0

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-surface border-r border-border flex-col z-50">
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-white">UB</div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Universal Brain</div>
            <div className="text-xs text-muted leading-tight">V1 · lokal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-card transition-colors group"
          >
            <span className="text-base opacity-70 group-hover:opacity-100">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <div className="bg-card rounded-lg px-3 py-2 border border-border">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${active > 0 ? 'bg-success' : 'bg-warning'}`}></div>
            <span className={`text-xs font-medium ${active > 0 ? 'text-success' : 'text-warning'}`}>
              {health ? `Schritt ${health.roadmapStep} von 9` : '…'}
            </span>
          </div>
          <p className="text-xs text-muted mt-1 leading-snug">
            {health ? `${active} von ${health.capabilities.length} Komponenten aktiv` : 'Lade Status…'}
          </p>
        </div>
      </div>
    </aside>
  )
}
