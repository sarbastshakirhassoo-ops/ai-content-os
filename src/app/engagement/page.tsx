'use client'

import { useState, useEffect } from 'react'
import type { EngagementAgentOutput, ContentIdea, FAQ, CommunityTrend } from '@/agents/engagement-agent'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENTIMENT_COLOR = { positive: 'text-emerald-400', negative: 'text-red-400', neutral: 'text-slate-400' }
const SENTIMENT_BG    = { positive: 'bg-emerald-500/10 border-emerald-500/20', negative: 'bg-red-500/10 border-red-500/20', neutral: 'bg-slate-500/10 border-slate-500/20' }
const POTENTIAL_STYLE = { high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', low: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
const MOMENTUM_ICON   = { rising: '🚀', stable: '➡️', declining: '📉' }
const PLATFORM_COLOR  = { youtube: 'bg-red-500/20 text-red-300', tiktok: 'bg-pink-500/20 text-pink-300', instagram: 'bg-purple-500/20 text-purple-300' }

// ── Engagement Page ───────────────────────────────────────────────────────────

export default function EngagementPage() {
  const [data, setData]       = useState<EngagementAgentOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab]         = useState<'ideas' | 'faq' | 'trends' | 'replies' | 'series'>('ideas')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/engagement')
      setData(await res.json() as EngagementAgentOutput)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const sent = data?.sentimentBreakdown
  const total = (sent?.positive ?? 0) + (sent?.negative ?? 0) + (sent?.neutral ?? 0) || 1

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💬 Engagement Agent</h1>
          <p className="text-slate-400 text-sm mt-1">Community-Reaktionen analysieren — Content-Ideen aus echtem Feedback generieren</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Analysiere…' : '🔄 Aktualisieren'}
        </button>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Kommentare',      value: data.totalComments,                     icon: '💬', color: 'text-white' },
            { label: 'Positiv',         value: `${Math.round((sent!.positive / total) * 100)}%`, icon: '😊', color: 'text-emerald-400' },
            { label: 'Content-Ideen',   value: data.topContentIdeas.length,            icon: '💡', color: 'text-indigo-400' },
            { label: 'FAQs erkannt',    value: data.faqs.length,                       icon: '❓', color: 'text-yellow-400' },
            { label: 'Community-Trends',value: data.communityTrends.length,            icon: '📈', color: 'text-blue-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 text-center">
              <div className="text-xl">{stat.icon}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sentiment bar */}
      {sent && (
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-3">Community-Stimmung</p>
          <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
            <div className="bg-emerald-500 transition-all" style={{ width: `${(sent.positive / total) * 100}%` }} />
            <div className="bg-red-500 transition-all"     style={{ width: `${(sent.negative / total) * 100}%` }} />
            <div className="bg-slate-600 transition-all"   style={{ width: `${(sent.neutral / total) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-emerald-400">✓ {sent.positive} Positiv</span>
            <span className="text-red-400">✗ {sent.negative} Negativ</span>
            <span className="text-slate-400">~ {sent.neutral} Neutral</span>
          </div>
          {data?.engagementInsights && (
            <div className="mt-3 pt-3 border-t border-[#1e1e2e] space-y-1">
              {data.engagementInsights.map((ins, i) => <p key={i} className="text-xs text-slate-400">→ {ins}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e1e2e] pb-px flex-wrap">
        {(['ideas', 'faq', 'trends', 'replies', 'series'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {{ ideas: '💡 Content-Ideen', faq: '❓ FAQs', trends: '📈 Trends', replies: '💬 Antworten', series: '🎬 Serien' }[t]}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-slate-500 py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Analysiere Community-Reaktionen…</p>
        </div>
      )}

      {/* Tab: Content Ideas */}
      {!loading && tab === 'ideas' && data && (
        <div className="space-y-4">
          {data.topContentIdeas.map((idea: ContentIdea, i) => (
            <div key={i} className="bg-[#16161f] border border-[#1e1e2e] hover:border-indigo-500/30 rounded-xl p-5 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {i + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">{idea.format}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">{idea.estimatedInterest}%</div>
                  <div className="text-xs text-slate-500">Interesse</div>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{idea.title}</h3>
              <p className="text-xs text-indigo-300 mb-2">&ldquo;{idea.hook}&rdquo;</p>
              <p className="text-xs text-slate-500">{idea.rationale} • {idea.sourceComments} Community-Kommentare</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e1e2e]">
                <span className="text-xs text-slate-500">{idea.platform}</span>
                <button
                  onClick={() => window.open(`/script?topic=${encodeURIComponent(idea.title)}&hook=${encodeURIComponent(idea.hook)}`, '_blank')}
                  className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
                >
                  Skript erstellen →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: FAQs */}
      {!loading && tab === 'faq' && data && (
        <div className="space-y-3">
          {data.faqs.map((faq: FAQ, i) => (
            <div key={i} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm text-white font-medium flex-1 mr-4">&ldquo;{faq.question}&rdquo;</p>
                <span className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${POTENTIAL_STYLE[faq.contentPotential]}`}>
                  {faq.contentPotential === 'high' ? '🔥 Hoch' : faq.contentPotential === 'medium' ? '📊 Mittel' : '📉 Gering'} Potenzial
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{faq.suggestedAnswer}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{faq.frequency}× gefragt</span>
                <button
                  onClick={() => window.open(`/script?topic=${encodeURIComponent(faq.question.replace('?', ''))}`, '_blank')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  → Video erstellen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Community Trends */}
      {!loading && tab === 'trends' && data && (
        <div className="space-y-3">
          {data.communityTrends.map((trend: CommunityTrend, i) => (
            <div key={i} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{MOMENTUM_ICON[trend.momentum]}</span>
                <div>
                  <p className="text-sm font-medium text-white">{trend.topic}</p>
                  <p className="text-xs text-slate-500">{trend.mentionCount} Erwähnungen • {trend.platforms.join(', ')}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded border ${trend.momentum === 'rising' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                  {trend.momentum === 'rising' ? '📈 Steigt' : trend.momentum === 'stable' ? '➡️ Stabil' : '📉 Fällt'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Reply Suggestions */}
      {!loading && tab === 'replies' && data && (
        <div className="space-y-4">
          {data.replySuggestions.map((reply, i) => (
            <div key={i} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded ${(PLATFORM_COLOR as Record<string, string>)[reply.platform] || 'bg-slate-500/20 text-slate-300'}`}>
                  {reply.platform}
                </span>
                <span className="text-xs text-slate-500">{reply.tone}</span>
              </div>
              <p className="text-xs text-slate-400 mb-2 italic">&ldquo;{reply.commentSnippet}…&rdquo;</p>
              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                <p className="text-sm text-slate-200">{reply.suggestion}</p>
              </div>
              <button
                onClick={() => { void navigator.clipboard.writeText(reply.suggestion) }}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Kopieren
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Series */}
      {!loading && tab === 'series' && data && (
        <div className="space-y-3">
          {data.seriesOpportunities.map((series, i) => (
            <div key={i} className="bg-[#16161f] border border-indigo-500/20 rounded-xl p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-slate-200">{series}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
