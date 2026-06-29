// @ts-nocheck
'use client'

import { useState } from 'react'
import type { SEOAgentOutput, SEOKeyword } from '@/agents/seo-agent'

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors ml-2"
    >
      {copied ? '✓ Kopiert' : 'Kopieren'}
    </button>
  )
}

const VOLUME_STYLE: Record<string, string> = {
  high:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-yellow-400  bg-yellow-500/10  border-yellow-500/20',
  low:    'text-slate-400   bg-slate-500/10   border-slate-500/20',
}

const TREND_ICON: Record<string, string> = { rising: '📈', stable: '➡️', declining: '📉' }

const NICHES = ['KI / Tech', 'Business / Finance', 'Fitness / Health', 'Food', 'Travel / Lifestyle', 'Beauty / Fashion', 'Gaming', 'Motivation / Mindset', 'Allgemein']

// ── SEO Page ──────────────────────────────────────────────────────────────────

export default function SEOPage() {
  const [data, setData]       = useState<SEOAgentOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [topic, setTopic]     = useState('')
  const [hook, setHook]       = useState('')
  const [niche, setNiche]     = useState('KI / Tech')
  const [tab, setTab]         = useState<'youtube' | 'tiktok' | 'instagram' | 'keywords' | 'hooks'>('youtube')

  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res  = await fetch('/api/seo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ topic, hook, niche }),
      })
      setData(await res.json() as SEOAgentOutput)
    } finally {
      setLoading(false)
    }
  }

  const score = data?.seoScore ?? 0
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🔎 SEO Agent</h1>
          <p className="text-slate-400 text-sm mt-1">Maximale Auffindbarkeit auf allen Plattformen — automatisch optimiert</p>
        </div>
        {data && (
          <div className="text-right">
            <div className={`text-3xl font-bold ${scoreColor}`}>{score}</div>
            <div className="text-xs text-slate-500">SEO Score /100</div>
          </div>
        )}
      </div>

      {/* Input form */}
      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Video-Thema…"
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
        <div className="flex gap-3">
          <input
            value={hook}
            onChange={e => setHook(e.target.value)}
            placeholder="Hook (optional — für Hook-Varianten)"
            className="flex-1 bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => void generate()}
            disabled={loading || !topic.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Optimiere…' : 'SEO generieren'}
          </button>
        </div>

        {/* Score breakdown */}
        {data && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-[#1e1e2e]">
            {Object.entries(data.scoreBreakdown).map(([key, val]) => (
              <div key={key} className="text-center">
                <div className="text-sm font-bold text-indigo-400">{val}</div>
                <div className="text-[10px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!data && !loading && (
        <div className="text-center text-slate-500 py-20">
          <p className="text-4xl mb-3">🔎</p>
          <p>Thema eingeben und SEO generieren lassen</p>
        </div>
      )}

      {data && (
        <>
          {/* Primary keyword */}
          <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-3">
            <span className="text-indigo-400 font-semibold text-sm">Primäres Keyword:</span>
            <span className="text-white font-bold">{data.primaryKeyword}</span>
            <span className="text-slate-500 text-sm">• {data.secondaryKeywords.slice(0, 3).join(' · ')}</span>
          </div>

          {/* Improvements */}
          {data.improvements.length > 0 && (
            <div className="bg-[#16161f] border border-yellow-500/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Verbesserungen</h3>
              {data.improvements.map((imp, i) => <p key={i} className="text-sm text-slate-300">• {imp}</p>)}
            </div>
          )}

          {/* Platform tabs */}
          <div className="flex gap-1 border-b border-[#1e1e2e] pb-px">
            {(['youtube', 'tiktok', 'instagram', 'keywords', 'hooks'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {{ youtube: '▶ YouTube', tiktok: '🎵 TikTok', instagram: '📸 Instagram', keywords: '🔑 Keywords', hooks: '🪝 Hook-Varianten' }[t]}
              </button>
            ))}
          </div>

          {/* YouTube */}
          {tab === 'youtube' && (
            <div className="space-y-4">
              {[
                { label: 'Titel', content: data.platform.youtube.title },
                { label: 'Beschreibung', content: data.platform.youtube.description },
                { label: 'Tags', content: data.platform.youtube.tags.join(', ') },
                { label: 'Thumbnail-Konzept', content: data.platform.youtube.thumbnail },
              ].map(item => (
                <div key={item.label} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{item.label}</span>
                    <CopyBtn text={item.content} />
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                </div>
              ))}
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Chapters</span>
                <div className="mt-2 space-y-1">
                  {data.platform.youtube.chapters.map((c, i) => <p key={i} className="text-sm text-slate-300 font-mono">{c}</p>)}
                </div>
              </div>
            </div>
          )}

          {/* TikTok */}
          {tab === 'tiktok' && (
            <div className="space-y-4">
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Caption</span>
                  <CopyBtn text={data.platform.tiktok.caption} />
                </div>
                <p className="text-sm text-slate-200">{data.platform.tiktok.caption}</p>
              </div>
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Hashtags</span>
                <div className="flex flex-wrap gap-2">
                  {data.platform.tiktok.hashtags.map((h, i) => <span key={i} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded text-xs">{h}</span>)}
                </div>
              </div>
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Sound-Empfehlung</span>
                <p className="text-sm text-slate-300">{data.platform.tiktok.soundSuggestion}</p>
              </div>
            </div>
          )}

          {/* Instagram */}
          {tab === 'instagram' && (
            <div className="space-y-4">
              {[
                { label: 'Caption', content: data.platform.instagram.caption },
                { label: 'Alt-Text (SEO)', content: data.platform.instagram.altText },
                { label: 'Reel Cover Text', content: data.platform.instagram.reelCoverText },
              ].map(item => (
                <div key={item.label} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{item.label}</span>
                    <CopyBtn text={item.content} />
                  </div>
                  <p className="text-sm text-slate-200">{item.content}</p>
                </div>
              ))}
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Hashtags ({data.platform.instagram.hashtags.length})</span>
                  <CopyBtn text={data.platform.instagram.hashtags.join(' ')} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.platform.instagram.hashtags.map((h, i) => <span key={i} className="px-2 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-300 rounded text-xs">{h}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* Keywords */}
          {tab === 'keywords' && (
            <div className="space-y-3">
              {data.keywords.map((kw: SEOKeyword, i) => (
                <div key={i} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-white">{kw.keyword}</span>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded border ${VOLUME_STYLE[kw.volume]}`}>Vol: {kw.volume}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${VOLUME_STYLE[kw.competition]}`}>Komp: {kw.competition}</span>
                      <span className="text-xs text-slate-500">{TREND_ICON[kw.trend]} {kw.trend}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-400">{kw.relevance}</div>
                    <div className="text-xs text-slate-500">Relevanz</div>
                  </div>
                </div>
              ))}
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Suchbegriffe</span>
                <div className="space-y-1">
                  {data.searchTerms.map((t, i) => <p key={i} className="text-sm text-slate-300">• {t}</p>)}
                </div>
              </div>
            </div>
          )}

          {/* Hook variants */}
          {tab === 'hooks' && (
            <div className="space-y-3">
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-3">Alternative Titel</span>
                {data.altTitles.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b border-[#1e1e2e] last:border-0">
                    <span className="text-xs text-slate-500 mt-0.5">#{i + 1}</span>
                    <span className="text-sm text-slate-200 flex-1">{t}</span>
                    <CopyBtn text={t} />
                  </div>
                ))}
              </div>
              <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-3">Hook-Varianten</span>
                {data.hookVariants.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b border-[#1e1e2e] last:border-0">
                    <span className="text-xs text-indigo-400 mt-0.5">#{i + 1}</span>
                    <span className="text-sm text-slate-200 flex-1">&ldquo;{h}&rdquo;</span>
                    <CopyBtn text={h} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
