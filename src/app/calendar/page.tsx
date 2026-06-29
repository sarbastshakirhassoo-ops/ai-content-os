// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import type { CalendarAgentOutput, PlatformSlot, PublicationPlan } from '@/agents/calendar-agent'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_STYLE: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  tiktok:         { bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    text: 'text-pink-300',    icon: '🎵' },
  instagram:      { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-300',  icon: '📸' },
  youtube_shorts: { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-300',     icon: '▶' },
  youtube:        { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-300',    icon: '📺' },
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString()
}

function SlotCard({ slot }: { slot: PlatformSlot }) {
  const style = PLATFORM_STYLE[slot.platform] ?? PLATFORM_STYLE.youtube
  return (
    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{style.icon}</span>
          <span className={`text-sm font-semibold ${style.text}`}>{slot.displayName}</span>
          <span className="text-xs text-slate-500">Priorität #{slot.priority}</span>
        </div>
        <span className="text-xs font-bold text-emerald-400">~{fmt(slot.expectedReach)} Views</span>
      </div>
      <p className="text-xs text-slate-300 font-medium mb-1">{slot.localTime}</p>
      <p className="text-xs text-slate-500 mb-2">{slot.rationale}</p>
      <div className="border-t border-white/5 pt-2">
        <p className="text-xs text-slate-500 mb-1">Anpassungen:</p>
        {slot.adaptations.map((a, i) => <p key={i} className={`text-xs ${style.text} opacity-80`}>• {a}</p>)}
      </div>
    </div>
  )
}

const NICHES = ['KI / Tech', 'Business / Finance', 'Fitness / Health', 'Food', 'Travel / Lifestyle', 'Beauty / Fashion', 'Gaming', 'Allgemein']
const PLATFORMS_LIST = ['tiktok', 'instagram', 'youtube_shorts', 'youtube'] as const
const PLATFORM_LABELS: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube_shorts: 'YouTube Shorts', youtube: 'YouTube' }

// ── Calendar Page ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [data, setData]         = useState<CalendarAgentOutput | null>(null)
  const [loading, setLoading]   = useState(false)
  const [title, setTitle]       = useState('')
  const [niche, setNiche]       = useState('KI / Tech')
  const [platforms, setPlatforms] = useState<string[]>(['tiktok', 'instagram', 'youtube_shorts'])
  const [tab, setTab]           = useState<'plan' | 'calendar' | 'insights'>('plan')

  async function plan() {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title || 'Nächstes Video', niche, platforms }),
      })
      setData(await res.json() as CalendarAgentOutput)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void plan() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📅 Content Calendar</h1>
          <p className="text-slate-400 text-sm mt-1">Automatischer Veröffentlichungsplan — optimale Zeit, Plattform und Reihenfolge</p>
        </div>
        {data && (
          <div className="text-right">
            <div className="text-xl font-bold text-indigo-400">{fmt(data.plan.totalEstimatedReach)}</div>
            <div className="text-xs text-slate-500">Geschätzte Gesamtreichweite</div>
            <div className="text-xs text-slate-500 mt-0.5">KW {data.plan.calendarWeek}</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Video-Titel (optional)…"
            className="md:col-span-2 bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={niche}
            onChange={e => setNiche(e.target.value)}
            className="bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-400">Plattformen:</span>
          {PLATFORMS_LIST.map(p => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                platforms.includes(p)
                  ? `${PLATFORM_STYLE[p].bg} ${PLATFORM_STYLE[p].border} ${PLATFORM_STYLE[p].text}`
                  : 'border-[#2a2a3e] text-slate-500 bg-transparent'
              }`}
            >
              {PLATFORM_STYLE[p].icon} {PLATFORM_LABELS[p]}
            </button>
          ))}
          <button
            onClick={() => void plan()}
            disabled={loading}
            className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Plane…' : 'Plan erstellen'}
          </button>
        </div>

        {/* Next slot highlight */}
        {data && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#1e1e2e]">
            <span className="text-xs text-slate-500">Nächster optimaler Slot:</span>
            <span className="text-xs font-semibold text-emerald-400">{data.nextOptimalSlot}</span>
            <span className="text-xs text-slate-500">• Empf. {data.weeklyCapacity} Videos/Woche</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e1e2e] pb-px">
        {(['plan', 'calendar', 'insights'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {{ plan: '📋 Veröffentlichungsplan', calendar: '🗓️ Kalender (4 Wochen)', insights: '💡 Plattform-Insights' }[t]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-slate-500 py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Optimaler Veröffentlichungsplan wird berechnet…</p>
        </div>
      )}

      {/* Tab: Plan */}
      {!loading && tab === 'plan' && data && (
        <div className="space-y-4">
          <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{data.plan.contentTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.plan.niche} • {data.plan.publishWindow} •
                  Primär: <span className="text-indigo-400">{PLATFORM_LABELS[data.plan.primaryPlatform] ?? data.plan.primaryPlatform}</span>
                </p>
              </div>
              <span className="text-xs text-slate-500">KW {data.plan.calendarWeek}</span>
            </div>
            <div className="mt-3 space-y-1">
              {data.plan.notes.map((n, i) => <p key={i} className="text-xs text-slate-400">• {n}</p>)}
            </div>
          </div>

          {/* Slots in priority order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.plan.slots
              .sort((a, b) => a.priority - b.priority)
              .map((slot: PlatformSlot, i) => <SlotCard key={i} slot={slot} />)
            }
          </div>
        </div>
      )}

      {/* Tab: 4-Week Calendar */}
      {!loading && tab === 'calendar' && data && (
        <div className="space-y-4">
          {data.calendar.map(week => (
            <div key={week.id} className={`bg-[#16161f] border rounded-xl p-5 ${week.status === 'ready' ? 'border-indigo-500/30' : 'border-[#1e1e2e]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs text-slate-500">Kalenderwoche {week.week}</span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">{week.title}</h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded border ${
                  week.status === 'published'     ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  week.status === 'ready'         ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'   :
                  week.status === 'in_production' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'   :
                  'text-slate-400 bg-slate-500/10 border-slate-500/20'
                }`}>
                  {{ planned: '📋 Geplant', in_production: '🎬 In Produktion', ready: '✅ Bereit', published: '🚀 Veröffentlicht' }[week.status]}
                </span>
              </div>
              {week.platforms.length > 0
                ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {week.platforms.slice(0, 2).map((slot, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${PLATFORM_STYLE[slot.platform].bg} ${PLATFORM_STYLE[slot.platform].border} border`}>
                        <span className="text-sm">{PLATFORM_STYLE[slot.platform].icon}</span>
                        <div>
                          <p className={`text-xs font-medium ${PLATFORM_STYLE[slot.platform].text}`}>{slot.displayName}</p>
                          <p className="text-xs text-slate-500">{slot.dayOfWeek} • ~{fmt(slot.expectedReach)} Views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                : <p className="text-xs text-slate-600 italic">Noch kein Content geplant — wird automatisch befüllt</p>
              }
            </div>
          ))}
        </div>
      )}

      {/* Tab: Platform Insights */}
      {!loading && tab === 'insights' && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(data.platformInsights) as [string, string][]).map(([platform, insight]) => {
            const style = PLATFORM_STYLE[platform] ?? PLATFORM_STYLE.youtube
            return (
              <div key={platform} className={`rounded-xl border p-5 ${style.bg} ${style.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{style.icon}</span>
                  <span className={`text-sm font-bold ${style.text}`}>{PLATFORM_LABELS[platform] ?? platform}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
