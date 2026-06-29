'use client'

import { useState, useEffect } from 'react'
import type { KnowledgeAgentOutput, KnowledgeEntry } from '@/agents/knowledge-agent'

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 100, color = 'bg-indigo-500' }: { score: number; max?: number; color?: string }) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{score}</span>
    </div>
  )
}

const QUALITY_STYLE = {
  good:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  average: 'text-yellow-400  bg-yellow-500/10  border-yellow-500/20',
  bad:     'text-red-400     bg-red-500/10     border-red-500/20',
}
const QUALITY_LABEL = { good: '✅ Gut', average: '~ Mittel', bad: '❌ Schlecht' }

// ── Knowledge Page ────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [data, setData]       = useState<KnowledgeAgentOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [topic, setTopic]     = useState('')
  const [niche, setNiche]     = useState('Allgemein')
  const [tab, setTab]         = useState<'overview' | 'hooks' | 'formats' | 'hashtags' | 'similar'>('overview')

  const NICHES = ['Allgemein', 'KI / Tech', 'Business / Finance', 'Fitness / Health', 'Food', 'Travel / Lifestyle', 'Beauty / Fashion', 'Gaming']

  async function query() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/knowledge?topic=${encodeURIComponent(topic)}&niche=${encodeURIComponent(niche)}`)
      const json = await res.json() as KnowledgeAgentOutput
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void query() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const ins = data?.insights

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🧠 Knowledge Base</h1>
          <p className="text-slate-400 text-sm mt-1">Internes Gedächtnis des Systems — verhindert Duplikate, lernt aus vergangenen Videos</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-400">{data?.totalEntries ?? '—'}</div>
          <div className="text-xs text-slate-500">Einträge gespeichert</div>
        </div>
      </div>

      {/* Topic checker */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Thema prüfen — Duplikat-Check</h2>
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void query()}
            placeholder="Thema eingeben…"
            className="flex-1 bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={niche}
            onChange={e => setNiche(e.target.value)}
            className="bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            onClick={() => void query()}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Prüfe…' : 'Prüfen'}
          </button>
        </div>

        {/* Duplicate result */}
        {data?.duplicateCheck && (
          <div className={`mt-4 rounded-lg border px-4 py-3 ${data.duplicateCheck.isDuplicate ? 'border-red-500/30 bg-red-500/5' : data.duplicateCheck.similarity >= 40 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{data.duplicateCheck.isDuplicate ? '⚠️' : data.duplicateCheck.similarity >= 40 ? '🔸' : '✅'}</span>
              <span className="text-sm font-semibold text-white">
                {data.duplicateCheck.isDuplicate ? 'Duplikat erkannt' : data.duplicateCheck.similarity >= 40 ? 'Ähnliches Thema' : 'Thema ist frisch'}
                <span className="ml-2 text-xs font-normal text-slate-400">({data.duplicateCheck.similarity}% Übereinstimmung)</span>
              </span>
            </div>
            <p className="text-sm text-slate-400">{data.duplicateCheck.suggestion}</p>
            {data.duplicateCheck.matchedEntry && (
              <p className="text-xs text-slate-500 mt-1">Ähnlichstes Video: &ldquo;{data.duplicateCheck.matchedEntry.topic}&rdquo;</p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e1e2e] pb-px">
        {(['overview', 'hooks', 'formats', 'hashtags', 'similar'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {{ overview: '📊 Übersicht', hooks: '🪝 Hooks', formats: '🎬 Formate', hashtags: '#️⃣ Hashtags', similar: '🔍 Ähnliche Themen' }[t]}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && ins && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Ø Retention', value: `${ins.avgRetention}%`, color: ins.avgRetention >= 65 ? 'text-emerald-400' : ins.avgRetention >= 50 ? 'text-yellow-400' : 'text-red-400', icon: '📈' },
            { label: 'Ø Views',     value: ins.avgViews >= 1000 ? `${(ins.avgViews / 1000).toFixed(1)}K` : ins.avgViews.toString(), color: 'text-indigo-400', icon: '👁️' },
            { label: 'Beste Hooks', value: `${ins.bestHooks.length} gespeichert`, color: 'text-emerald-400', icon: '🪝' },
            { label: 'Top Hashtags', value: `${ins.topHashtags.length} aktiv`, color: 'text-blue-400', icon: '#️⃣' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}

          {/* Recommendations */}
          <div className="col-span-2 md:col-span-4 bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">💡 System-Empfehlungen</h3>
            <div className="space-y-2">
              {ins.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-indigo-400 mt-0.5">→</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak posting times */}
          <div className="col-span-2 md:col-span-4 bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">⏰ Beste Posting-Zeiten</h3>
            <div className="flex flex-wrap gap-2">
              {ins.peakPostingTimes.map((t, i) => (
                <span key={i} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-sm">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Hooks */}
      {tab === 'hooks' && ins && (
        <div className="space-y-4">
          <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">✅ Erfolgreiche Hooks (höchste Retention)</h3>
            <div className="space-y-2">
              {ins.bestHooks.length > 0
                ? ins.bestHooks.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                      <span className="text-emerald-400 text-xs font-bold mt-0.5">#{i + 1}</span>
                      <span className="text-sm text-slate-200">&ldquo;{h}&rdquo;</span>
                    </div>
                  ))
                : <p className="text-sm text-slate-500">Noch keine erfolgreichen Hooks — Daten werden mit jedem Video ergänzt</p>
              }
            </div>
          </div>

          {ins.worstHooks.length > 0 && (
            <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-red-400 mb-3">❌ Hooks vermeiden (schlechteste Performance)</h3>
              <div className="space-y-2">
                {ins.worstHooks.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                    <span className="text-red-400 text-xs font-bold mt-0.5">✗</span>
                    <span className="text-sm text-slate-400 line-through">&ldquo;{h}&rdquo;</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Formats */}
      {tab === 'formats' && ins && (
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">🏆 Erfolgreichste Video-Formate</h3>
          {ins.successfulFormats.length > 0
            ? <div className="space-y-3">
                {ins.successfulFormats.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/3 border border-[#2a2a3e] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-400/20 text-slate-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-white font-medium">{f}</span>
                    </div>
                    <ScoreBar score={Math.max(40, 100 - i * 20)} color={i === 0 ? 'bg-yellow-500' : 'bg-indigo-500'} />
                  </div>
                ))}
              </div>
            : <p className="text-sm text-slate-500">Noch keine Format-Daten — werden automatisch gesammelt</p>
          }
        </div>
      )}

      {/* Tab: Hashtags */}
      {tab === 'hashtags' && ins && (
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">#️⃣ Top-Hashtags in dieser Nische</h3>
          <div className="flex flex-wrap gap-2">
            {ins.topHashtags.map((h, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium ${i < 3 ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-300'}`}
              >
                {h}
              </span>
            ))}
          </div>
          {ins.topHashtags.length === 0 && <p className="text-sm text-slate-500">Noch keine Hashtag-Daten gespeichert</p>}
        </div>
      )}

      {/* Tab: Similar Topics */}
      {tab === 'similar' && (
        <div className="space-y-3">
          {data?.similarTopics && data.similarTopics.length > 0
            ? data.similarTopics.map((t, i) => (
                <div key={i} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{t.topic}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-slate-500">{t.views >= 1000 ? `${(t.views / 1000).toFixed(0)}K Views` : `${t.views} Views`}</span>
                      <span className="text-xs text-slate-500">{t.retention}% Retention</span>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${t.retention >= 65 ? 'bg-emerald-400' : t.retention >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                </div>
              ))
            : <div className="text-center text-slate-500 py-12">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm">Kein Thema eingegeben — gib oben ein Thema ein um ähnliche Videos zu finden</p>
              </div>
          }
        </div>
      )}
    </div>
  )
}
