'use client'

import { useEffect, useState, Suspense } from 'react'
import type {
  TrendResult, PredictedTrend, TrendNotification, CreatorProfile, TrendAgentOutput
} from '@/agents/trend-agent'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n > 0 ? n.toString() : '—'
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct   = Math.round((score / max) * 100)
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 65 ? 'bg-blue-500' : 'bg-yellow-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold font-mono w-7 text-right ${color.replace('bg-', 'text-')}`}>{score}</span>
    </div>
  )
}

const COMP_STYLE = {
  low:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10  border-yellow-500/20',
  high:   'text-red-400    bg-red-500/10     border-red-500/20',
}
const COMP_LABEL = { low: '✓ Niedrig', medium: '~ Mittel', high: '✗ Hoch' }
const MON_LABEL  = { low: '€', medium: '€€', high: '€€€' }
const MON_COLOR  = { low: 'text-slate-400', medium: 'text-blue-400', high: 'text-emerald-400' }
const STATUS_STYLE = {
  emerging:  'text-sky-400    bg-sky-500/10    border-sky-500/20',
  growing:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  peak:      'text-orange-400  bg-orange-500/10  border-orange-500/20',
  declining: 'text-slate-400   bg-slate-500/10   border-slate-500/20',
}
const STATUS_LABEL = { emerging: '🌱 Emerging', growing: '📈 Wächst', peak: '🔥 Peak', declining: '📉 Rückgang' }

// ── Trend Card ────────────────────────────────────────────────────────────────

function TrendCard({ trend, onCreateScript }: { trend: TrendResult; onCreateScript: (t: TrendResult) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [hookCopied, setHookCopied] = useState(false)

  const copyHook = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(trend.hook)
    setHookCopied(true)
    setTimeout(() => setHookCopied(false), 1500)
  }

  return (
    <div className={`bg-[#16161f] border rounded-xl transition-all ${expanded ? 'border-indigo-500/40' : 'border-[#1e1e2e] hover:border-indigo-500/20'}`}>
      {/* Main Row */}
      <div className="flex items-start gap-4 p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {/* Score */}
        <div className="flex-shrink-0 w-12 text-center">
          <div className={`text-xl font-bold font-mono ${trend.opportunityScore >= 85 ? 'text-emerald-400' : trend.opportunityScore >= 65 ? 'text-blue-400' : 'text-yellow-400'}`}>
            {trend.opportunityScore}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">Score</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs px-2 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded font-medium">
              {trend.category}
            </span>
            <span className={`text-xs px-2 py-0.5 border rounded font-medium ${STATUS_STYLE[trend.trendStatus]}`}>
              {STATUS_LABEL[trend.trendStatus]}
            </span>
            <span className={`text-xs px-2 py-0.5 border rounded ${COMP_STYLE[trend.competition]}`}>
              {COMP_LABEL[trend.competition]}
            </span>
            <span className={`text-xs font-bold ${MON_COLOR[trend.monetization]}`}>
              {MON_LABEL[trend.monetization]}
            </span>
          </div>
          <p className="text-sm font-semibold text-white leading-snug mb-1">{trend.topic}</p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>📍 {trend.platforms.slice(0, 3).join(', ')}</span>
            <span>📊 {trend.sources.length} Quellen</span>
            {trend.topCreators.length > 0 && <span>👑 {trend.topCreators.length} Creator</span>}
          </div>
        </div>

        {/* Score bars */}
        <div className="w-28 flex-shrink-0 space-y-1.5">
          <div><div className="text-[10px] text-slate-500 mb-0.5">Opportunity</div><ScoreBar score={trend.opportunityScore} /></div>
          <div><div className="text-[10px] text-slate-500 mb-0.5">Velocity</div><ScoreBar score={trend.velocityScore} max={30} /></div>
        </div>

        <span className="text-slate-600 text-xs self-center">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#1e1e2e] pt-4">
          {/* Hook */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">🎣 Viral Hook</p>
              <button onClick={copyHook} className="text-xs text-slate-500 hover:text-indigo-400 px-2 py-0.5 rounded transition-colors">
                {hookCopied ? '✓ Kopiert' : 'Kopieren'}
              </button>
            </div>
            <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/5 border border-indigo-500/20 rounded-lg px-4 py-3">
              <p className="text-sm text-white italic">„{trend.hook}"</p>
            </div>
          </div>

          {/* Content Ideas */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">💡 Content-Ideen</p>
            <div className="space-y-1">
              {trend.contentIdeas.map((idea, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-indigo-400 mt-0.5">→</span>
                  <span>{idea}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2"># Hashtags</p>
            <div className="flex flex-wrap gap-1.5">
              {trend.hashtags.map(h => (
                <span key={h} className="text-xs bg-[#111118] border border-[#1e1e2e] text-slate-300 px-2 py-0.5 rounded">{h}</span>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">📍 Quellen</p>
            <div className="space-y-1">
              {trend.sources.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-600 w-4 shrink-0 mt-0.5">·</span>
                  <span className="text-slate-500 shrink-0">{s.platform}:</span>
                  {s.url
                    ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-indigo-400 truncate transition-colors">{s.title.slice(0, 70)}</a>
                    : <span className="text-slate-300 truncate">{s.title.slice(0, 70)}</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Top Creators (if any) */}
          {trend.topCreators.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">👑 Top Creator in dieser Nische</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {trend.topCreators.slice(0, 4).map((c, i) => (
                  <CreatorMiniCard key={i} creator={c} />
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onCreateScript(trend) }}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors"
          >
            ✍️ Skript für diesen Trend erstellen
          </button>
        </div>
      )}
    </div>
  )
}

// ── Creator Mini Card ─────────────────────────────────────────────────────────

function CreatorMiniCard({ creator }: { creator: CreatorProfile }) {
  const icon = creator.platform === 'tiktok' ? '🎵' : creator.platform === 'youtube' ? '▶️' : '📷'
  return (
    <a
      href={creator.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-[#111118] border border-[#1e1e2e] hover:border-indigo-500/30 rounded-lg p-3 transition-colors block"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-semibold text-white">@{creator.username.slice(0, 20)}</span>
        </div>
        <span className="text-xs text-indigo-400">↗</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        <div><div className="text-xs font-bold text-white">{fmt(creator.followers)}</div><div className="text-[10px] text-slate-500">Follower</div></div>
        <div><div className="text-xs font-bold text-white">{fmt(creator.avgViews)}</div><div className="text-[10px] text-slate-500">Ø Views</div></div>
        <div><div className="text-xs font-bold text-white">{creator.engagementRate > 0 ? `${creator.engagementRate}%` : '—'}</div><div className="text-[10px] text-slate-500">Engage</div></div>
      </div>
      <div className="mt-2 text-[10px] text-slate-400 leading-relaxed line-clamp-2">{creator.whyItWorks}</div>
    </a>
  )
}

// ── Creator Full Card ─────────────────────────────────────────────────────────

function CreatorFullCard({ creator }: { creator: CreatorProfile }) {
  const icon = creator.platform === 'tiktok' ? '🎵 TikTok' : creator.platform === 'youtube' ? '▶️ YouTube' : '📷 Instagram'
  const platformColor = creator.platform === 'tiktok'
    ? 'text-pink-400 bg-pink-500/10 border-pink-500/20'
    : creator.platform === 'instagram'
    ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20'

  return (
    <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className={`text-xs px-2 py-0.5 border rounded font-medium ${platformColor}`}>{icon}</span>
          <h3 className="text-white font-bold text-base mt-1">@{creator.username}</h3>
          {creator.displayName !== creator.username && <p className="text-slate-500 text-xs">{creator.displayName}</p>}
        </div>
        <a href={creator.profileUrl} target="_blank" rel="noopener noreferrer"
           className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors">
          Profil →
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Follower',    value: fmt(creator.followers) },
          { label: 'Ø Views',     value: fmt(creator.avgViews) },
          { label: 'Ø Likes',     value: fmt(creator.avgLikes) },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-2.5 text-center">
            <div className="text-sm font-bold text-white">{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Engagement', value: creator.engagementRate > 0 ? `${creator.engagementRate}%` : '—' },
          { label: 'Posting',    value: creator.postingFrequency },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-2.5 text-center">
            <div className="text-sm font-bold text-white">{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Analysis */}
      <div className="space-y-2">
        {[
          { label: '✅ Warum funktioniert es?', value: creator.whyItWorks },
          { label: '🎣 Hook-Stil',              value: creator.hookStyle },
          { label: '⏱️ Videolänge',            value: creator.videoLength },
        ].map(r => (
          <div key={r.label} className="bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 font-semibold mb-0.5">{r.label}</p>
            <p className="text-xs text-slate-300">{r.value}</p>
          </div>
        ))}
      </div>

      {/* Hashtags */}
      {creator.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {creator.hashtags.map(h => (
            <span key={h} className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">{h}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Prediction Card ───────────────────────────────────────────────────────────

function PredictionCard({ pred }: { pred: PredictedTrend }) {
  const urgent = pred.daysUntil >= 0 && pred.daysUntil <= 14
  const past   = pred.daysUntil < 0

  return (
    <div className={`bg-[#16161f] border rounded-xl p-5 space-y-4 ${urgent ? 'border-orange-500/30' : past ? 'border-slate-700/30 opacity-60' : 'border-[#1e1e2e]'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">{pred.category}</span>
            {urgent && <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">⚡ Bald!</span>}
            {past   && <span className="text-xs px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded">Vergangen</span>}
          </div>
          <h3 className="text-base font-bold text-white">{pred.event}</h3>
          <p className="text-xs text-slate-500 mt-0.5">📅 {pred.date}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold font-mono ${pred.daysUntil >= 0 ? 'text-white' : 'text-slate-500'}`}>
            {pred.daysUntil >= 0 ? `${pred.daysUntil}d` : `${Math.abs(pred.daysUntil)}d ago`}
          </div>
          <div className="text-[10px] text-slate-500">bis Event</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Opportunity Score', value: pred.opportunityScore, color: 'text-indigo-400' },
          { label: 'Viral-Potenzial',   value: pred.viralPotential,   color: 'text-emerald-400' },
          { label: 'Dauer',             value: pred.estimatedDuration, color: 'text-slate-300', isText: true },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-2.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.isText ? s.value : s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3 space-y-1.5">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">📅 Timeline</p>
        {[
          { label: '🎬 Produktion starten', value: pred.recommendedProductionDate, highlight: true },
          { label: '📈 Hype startet',       value: pred.expectedHypeStart },
          { label: '🔥 Höhepunkt',          value: pred.expectedPeak },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{r.label}</span>
            <span className={r.highlight ? 'text-indigo-400 font-semibold' : 'text-slate-300'}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Content Angles */}
      <div>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">💡 Content-Winkel</p>
        <div className="space-y-1">
          {pred.contentAngles.map((angle, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-indigo-400 mt-0.5">→</span>
              <span className="text-slate-300">{angle}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div className="flex gap-2 flex-wrap">
        {pred.platforms.map(p => (
          <span key={p} className="text-[10px] bg-[#111118] border border-[#1e1e2e] text-slate-400 px-2 py-0.5 rounded">{p}</span>
        ))}
      </div>
    </div>
  )
}

// ── Notification Item ─────────────────────────────────────────────────────────

function NotificationItem({ n }: { n: TrendNotification }) {
  const urgencyStyle = n.urgency === 'high' ? 'border-orange-500/30 bg-orange-500/5' : n.urgency === 'medium' ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-[#1e1e2e]'
  return (
    <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${urgencyStyle}`}>
      <span className="text-xl flex-shrink-0">{n.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{n.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
        <p className="text-[10px] text-slate-600 mt-1">{new Date(n.timestamp).toLocaleTimeString('de-DE')}</p>
      </div>
      {n.urgency === 'high' && <span className="text-orange-400 text-xs font-bold flex-shrink-0">DRINGEND</span>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'trends' | 'predictions' | 'creators' | 'notifications'

function TrendsPageInner() {
  const [data, setData]         = useState<TrendAgentOutput | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [tab, setTab]           = useState<Tab>('trends')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [lastFetch, setLastFetch] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/trends')
      if (!res.ok) throw new Error('Fetch fehlgeschlagen')
      const json = await res.json() as TrendAgentOutput
      setData(json)
      setLastFetch(new Date().toLocaleTimeString('de-DE'))
    } catch {
      setError('Fehler beim Laden. Bitte neu versuchen.')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const trends       = data?.trends        || []
  const predictions  = data?.predictions   || []
  const notifications = data?.notifications || []

  // Dedupliziert nach platform:username — kein Creator doppelt im Tab
  const allCreators: CreatorProfile[] = (() => {
    const seen = new Set<string>()
    return trends.flatMap(t => t.topCreators || []).filter(c => {
      const key = `${c.platform}:${c.username}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()
  const categories   = ['all', ...Array.from(new Set(trends.map(t => t.category)))]
  const filtered     = catFilter === 'all' ? trends : trends.filter(t => t.category === catFilter)

  const goCreateScript = (trend: TrendResult) => {
    const params = new URLSearchParams({
      niche:    trend.category,
      hooks:    trend.hook,
      hashtags: trend.hashtags.slice(0, 6).join(','),
    })
    window.location.href = `/script?${params.toString()}`
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'trends',        label: '🔥 Trends',          count: trends.length },
    { id: 'predictions',   label: '🔮 Prognosen',        count: predictions.length },
    { id: 'creators',      label: '👑 Creator',          count: allCreators.length },
    { id: 'notifications', label: '🔔 Benachrichtigungen', count: notifications.length },
  ]

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Trend Intelligence Engine</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Autonome Marktüberwachung · Reddit · HackerNews · Google News · YouTube · TikTok
          </p>
          {data?.meta && (
            <p className="text-xs text-slate-600 mt-0.5">
              {data.meta.sourcesScanned.join(' · ')}
              {lastFetch && <span className="ml-2">· Aktualisiert: {lastFetch}</span>}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
        >
          {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Scannt Markt…' : '🔄 Neu scannen'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Stats Bar */}
      {data?.meta && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Trends erkannt',    value: data.meta.totalTrends },
            { label: 'Top Kategorie',     value: data.meta.topCategory, small: true },
            { label: 'Upcoming Events',   value: predictions.filter(p => p.daysUntil >= 0).length },
            { label: 'Creator entdeckt',  value: allCreators.length },
          ].map(s => (
            <div key={s.label} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-3 text-center">
              <div className={`font-bold text-white ${s.small ? 'text-sm' : 'text-xl'}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111118] border border-[#1e1e2e] rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-white/5'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Tab: Trends */}
      {!loading && tab === 'trends' && (
        <div className="space-y-4">
          {/* Category Filter */}
          {trends.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    catFilter === c
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-[#16161f] border-[#1e1e2e] text-slate-400 hover:text-white'
                  }`}
                >
                  {c === 'all' ? `Alle (${trends.length})` : c}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="text-center text-slate-500 py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p>Noch keine Trends geladen. Klicke "Neu scannen".</p>
            </div>
          )}

          {filtered.map(trend => (
            <TrendCard key={trend.id} trend={trend} onCreateScript={goCreateScript} />
          ))}
        </div>
      )}

      {/* Tab: Predictions */}
      {!loading && tab === 'predictions' && (
        <div className="space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3">
            <p className="text-sm text-indigo-300 font-medium">🔮 Trend Prediction Engine</p>
            <p className="text-xs text-slate-400 mt-1">
              Produziéré Content BEVOR Events ihren Höhepunkt erreichen. Der empfohlene Produktionsstart ist jeweils hervorgehoben.
            </p>
          </div>
          {predictions.length === 0
            ? <div className="text-center text-slate-500 py-16">Keine Prognosen verfügbar</div>
            : predictions.map(p => <PredictionCard key={p.id} pred={p} />)
          }
        </div>
      )}

      {/* Tab: Creators */}
      {!loading && tab === 'creators' && (
        <div className="space-y-4">
          <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl px-4 py-3">
            <p className="text-sm text-white font-medium">👑 Creator Discovery</p>
            <p className="text-xs text-slate-400 mt-1">
              Für die Top-Trends automatisch gefundene Creator. Nutze ihre Muster als Inspiration — nicht als Kopiervorlage.
            </p>
          </div>
          {allCreators.length === 0
            ? <div className="text-center text-slate-500 py-16">
                <p className="text-4xl mb-3">👑</p>
                <p>Lade zuerst Trends — Creator werden für die Top-Trends automatisch gefunden.</p>
              </div>
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allCreators.filter(c => Boolean(c.username)).map((c, i) => (
                  <CreatorFullCard key={`${c.platform}-${c.username}-${i}`} creator={c} />
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* Tab: Notifications */}
      {!loading && tab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0
            ? <div className="text-center text-slate-500 py-16">
                <p className="text-4xl mb-3">🔔</p>
                <p>Keine Benachrichtigungen. Lade Trends um Alerts zu generieren.</p>
              </div>
            : notifications.map(n => <NotificationItem key={n.id} n={n} />)
          }
        </div>
      )}
    </div>
  )
}

export default function TrendsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <TrendsPageInner />
    </Suspense>
  )
}
