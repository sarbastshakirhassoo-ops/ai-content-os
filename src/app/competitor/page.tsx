'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CompetitorReport, ChannelProfile } from '@/agents/competitor-agent'
// ChannelProfile has dataSource: 'live' | 'mock' field

function buildScriptUrl(report: CompetitorReport): string {
  const profile = report.profiles[0]
  const analysis = profile?.analysis
  const params = new URLSearchParams()

  if (profile?.username) params.set('source', `@${profile.username}`)
  if (analysis?.niche) params.set('niche', analysis.niche)

  if (analysis?.hookPatterns?.length) {
    params.set('hooks', analysis.hookPatterns.join('|||'))
  }

  const hashtags = report.topHashtagsAcrossPlatforms?.slice(0, 8)
  if (hashtags?.length) {
    params.set('hashtags', hashtags.join(','))
  }

  const titles = profile?.topVideos?.slice(0, 3).map(v => v.title || '').filter(Boolean)
  if (titles?.length) {
    params.set('titles', titles.join('|||'))
  }

  return `/script?${params.toString()}`
}

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵',
  youtube: '▶️',
  instagram: '📷',
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  youtube: 'text-red-400 border-red-500/30 bg-red-500/10',
  instagram: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function ProfileCard({ p }: { p: ChannelProfile }) {
  const color = PLATFORM_COLORS[p.platform]
  const icon = PLATFORM_ICONS[p.platform]

  return (
    <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
              {icon} {p.platform.toUpperCase()}
            </span>
            {p.verified && <span className="text-xs text-blue-400">✓ Verified</span>}
            {p.dataSource === 'live'
              ? <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">✅ Live-Daten</span>
              : <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">⚠️ Demo</span>
            }
          </div>
          <h3 className="text-white font-bold text-lg mt-1">@{p.username}</h3>
          {p.displayName !== p.username && (
            <p className="text-slate-500 text-xs">{p.displayName}</p>
          )}
          {p.bio && <p className="text-slate-400 text-xs mt-1 max-w-sm">{p.bio}</p>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{p.nicheScore}</div>
          <div className="text-xs text-slate-500">Nischen-Score</div>
        </div>
      </div>

      {/* Stats Row 1: Follower / Likes / Videos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Follower', value: fmt(p.followers) },
          { label: 'Gesamt-Likes', value: fmt(p.totalLikes || 0) },
          { label: 'Videos', value: fmt(p.totalVideos) },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] rounded-lg p-2.5 text-center border border-[#1e1e2e]">
            <div className="text-white font-bold text-sm">{s.value}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      {/* Stats Row 2: Ø Views / Engagement */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Ø Views', value: fmt(p.avgViews) },
          { label: 'Engagement', value: `${p.engagementRate}%` },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] rounded-lg p-2.5 text-center border border-[#1e1e2e]">
            <div className="text-white font-bold text-sm">{s.value}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top Videos */}
      {p.topVideos.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">🔥 Top Videos</h4>
          <div className="space-y-1.5">
            {p.topVideos.slice(0, 5).map((v, i) => (
              <a
                key={v.id}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 bg-[#111118] rounded-lg p-2.5 border border-[#1e1e2e] hover:border-indigo-500/30 transition-colors block"
              >
                <span className="text-slate-600 text-xs mt-0.5 w-4 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs leading-snug truncate">{v.title || '(kein Titel)'}</p>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500">
                    <span>👁 {fmt(v.views)}</span>
                    <span>❤️ {fmt(v.likes)}</span>
                    <span>💬 {fmt(v.comments)}</span>
                    {v.shares !== undefined && v.shares > 0 && <span>🔄 {fmt(v.shares)}</span>}
                  </div>
                </div>
                <span className="text-slate-600 text-xs">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Posting Frequency */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>📅</span>
        <span>Posting-Frequenz: <span className="text-white">{p.postingFrequency}</span></span>
      </div>
    </div>
  )
}

function AnalysisCard({ report }: { report: CompetitorReport }) {
  const analysis = report.profiles[0]?.analysis
  if (!analysis) return null

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Nische & Strategie */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">🎯 Nischen-Analyse</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Nische</span>
            <span className="text-indigo-400 font-medium">{analysis.niche}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Content-Stil</span>
            <span className="text-slate-300 text-right max-w-[60%]">{analysis.contentStyle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Konkurrenz</span>
            <span className={analysis.competitionLevel === 'low' ? 'text-emerald-400' : analysis.competitionLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'}>
              {analysis.competitionLevel === 'low' ? '✅ Niedrig' : analysis.competitionLevel === 'medium' ? '⚠️ Mittel' : '🔴 Hoch'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Wachstum</span>
            <span className={analysis.growthPotential === 'high' ? 'text-emerald-400' : 'text-yellow-400'}>
              {analysis.growthPotential === 'high' ? '🚀 Hoch' : '📈 Mittel'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Monetarisierung</span>
            <span className="text-emerald-400">{analysis.monetizationPotential}</span>
          </div>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5">
          <p className="text-xs text-indigo-300 leading-relaxed">{analysis.recommendation}</p>
        </div>
      </div>

      {/* Copy-Strategie */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">📋 Copy-Strategie</h3>
        <div className="space-y-1.5">
          {analysis.copyStrategy.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-indigo-400 mt-0.5">→</span>
              <span className="text-slate-300">{s}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-[#1e1e2e]">
          <p className="text-xs text-slate-500 font-medium mb-2">🎣 Viral Hook-Muster</p>
          <div className="space-y-1">
            {analysis.hookPatterns.map((h, i) => (
              <div key={i} className="text-xs bg-[#111118] border border-[#1e1e2e] rounded px-2 py-1.5 text-slate-300">
                {h}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hashtags */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white"># Top Hashtags</h3>
        <div className="flex flex-wrap gap-1.5">
          {report.topHashtagsAcrossPlatforms.slice(0, 15).map(h => (
            <span key={h} className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
              {h.startsWith('#') ? h : `#${h}`}
            </span>
          ))}
        </div>
      </div>

      {/* Content-Kalender */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">📅 7-Tage Content-Plan</h3>
        <div className="space-y-1">
          {report.contentCalendar.map((day, i) => (
            <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
              <span className="text-slate-600 w-3 shrink-0">{i + 1}.</span>
              <span>{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CompetitorPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState<'auto' | 'tiktok' | 'youtube' | 'instagram'>('auto')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<CompetitorReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), platform }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Fehler')
      setReport(data.report)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-[960px]">
      <div>
        <h1 className="text-xl font-bold text-white">Competitor Analyzer</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          TikTok · YouTube · Instagram — Kanäle analysieren & Strategie kopieren
        </p>
      </div>

      {/* Input */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Kanal eingeben</h2>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="@username oder https://tiktok.com/@username"
            className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value as typeof platform)}
            className="bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="auto">Auto-Detect</option>
            <option value="tiktok">🎵 TikTok</option>
            <option value="youtube">▶️ YouTube</option>
            <option value="instagram">📷 Instagram</option>
          </select>
          <button
            onClick={analyze}
            disabled={loading || !url.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Analysiere…' : '🔍 Analysieren'}
          </button>
        </div>

        <div className="flex gap-2 text-xs text-slate-500">
          {['@initiber97q', 'https://tiktok.com/@mrbeast', '@mkbhd', 'https://youtube.com/@veritasium'].map(ex => (
            <button
              key={ex}
              onClick={() => setUrl(ex)}
              className="bg-[#111118] border border-[#1e1e2e] px-2 py-1 rounded hover:border-indigo-500/30 hover:text-slate-300 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}


      {report && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-300">
            {report.summary}
          </div>

          {/* Profile Cards */}
          <div className="space-y-4">
            {report.profiles.map(p => (
              <ProfileCard key={`${p.platform}-${p.username}`} p={p} />
            ))}
          </div>

          {/* Analyse */}
          <AnalysisCard report={report} />

          {/* Web Trends */}
          {report.webTrends.length > 0 && (
            <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">🌐 Web-Trends für diese Nische</h3>
              <div className="space-y-2">
                {report.webTrends.slice(0, 3).map((t, i) => (
                  <div key={i} className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300 font-medium truncate">{t.keyword}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.trend === 'rising' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {t.trend === 'rising' ? '📈 Steigend' : '➡️ Stabil'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.contentIdeas.map((idea, j) => (
                        <span key={j} className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded">
                          💡 {idea}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push(buildScriptUrl(report))}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg text-center transition-colors"
            >
              ✍️ Skript basierend auf diesem Competitor erstellen
            </button>
            <button
              onClick={() => {
                const niche = report.profiles[0]?.analysis?.niche || ''
                router.push(`/trends${niche ? `?niche=${encodeURIComponent(niche)}` : ''}`)
              }}
              className="flex-1 py-2.5 bg-[#16161f] border border-[#1e1e2e] hover:border-indigo-500/30 text-slate-300 text-sm font-medium rounded-lg text-center transition-colors"
            >
              🔍 Trends in dieser Nische
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

