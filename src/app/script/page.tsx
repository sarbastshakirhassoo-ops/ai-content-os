// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { VideoScript, ScriptSection, CompetitorContext } from '@/agents/script-agent'
import { AVAILABLE_NICHES } from '@/agents/script-agent'

// ── Section Card ───────────────────────────────────────────────────────────────

function SectionCard({ section, index }: { section: ScriptSection; index: number }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(section.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-white">{section.label}</span>
          <span className="text-xs text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded">{section.duration}</span>
        </div>
        <button
          onClick={copy}
          className="text-xs text-slate-500 hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-500/10"
        >
          {copied ? '✓ Kopiert' : 'Kopieren'}
        </button>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{section.text}</p>
      <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
        <span className="text-amber-400 text-xs mt-0.5 flex-shrink-0">🎬</span>
        <p className="text-xs text-amber-300/80 leading-relaxed">{section.visualNote}</p>
      </div>
    </div>
  )
}

// ── Main Page (inner) ──────────────────────────────────────────────────────────

function ScriptPageInner() {
  const searchParams = useSearchParams()

  // Read competitor context from URL params
  const competitorSource  = searchParams.get('source') || ''
  const competitorNiche   = searchParams.get('niche') || ''
  const competitorHooks   = searchParams.get('hooks') ? searchParams.get('hooks')!.split('|||') : []
  const competitorTags    = searchParams.get('hashtags') ? searchParams.get('hashtags')!.split(',') : []
  const competitorTitles  = searchParams.get('titles') ? searchParams.get('titles')!.split('|||') : []
  const hasCompetitorCtx  = Boolean(competitorSource || competitorNiche)

  const [topic, setTopic]     = useState('')
  const [niche, setNiche]     = useState(competitorNiche || '')
  const [platform, setPlatform] = useState('TikTok / YouTube Shorts')
  const [customHook, setCustomHook] = useState('')
  const [loading, setLoading] = useState(false)
  const [script, setScript]   = useState<VideoScript | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  // Pre-fill niche from competitor when params change
  useEffect(() => {
    if (competitorNiche && !niche) setNiche(competitorNiche)
    if (competitorHooks[0] && !customHook) setCustomHook(competitorHooks[0])
  }, [competitorNiche]) // eslint-disable-line

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const competitorContext: CompetitorContext | undefined = hasCompetitorCtx
        ? {
            source: competitorSource,
            niche: competitorNiche,
            hookPatterns: competitorHooks,
            hashtags: competitorTags,
            topVideoTitles: competitorTitles,
            platform,
          }
        : undefined

      const res = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, hook: customHook || undefined, niche, platform, competitorContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setScript(data.script)
    } catch (e) {
      setError('Skript konnte nicht generiert werden.')
    }
    setLoading(false)
  }

  const copyAll = () => {
    if (!script) return
    const txt = script.sections.map(s => `## ${s.label}\n${s.text}`).join('\n\n')
    navigator.clipboard.writeText(txt)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">✍️ Skript Generator</h1>
          <p className="text-sm text-slate-400 mt-1">Generiert professionelle Video-Skripte für jede Nische</p>
        </div>

        {/* Competitor Context Banner */}
        {hasCompetitorCtx && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">🔗</span>
            <div>
              <p className="text-sm font-semibold text-indigo-300">
                Basierend auf Competitor-Analyse
                {competitorSource && <span className="ml-2 text-indigo-400 font-mono">{competitorSource}</span>}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Nische: <span className="text-slate-200">{competitorNiche || 'Erkannt'}</span>
                {competitorHooks.length > 0 && (
                  <span className="ml-3">• {competitorHooks.length} Hook-Muster übernommen</span>
                )}
                {competitorTags.length > 0 && (
                  <span className="ml-3">• {competitorTags.length} Hashtags</span>
                )}
              </p>
              {competitorHooks.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500">Competitor Hooks (werden als Inspiration genutzt):</p>
                  {competitorHooks.slice(0, 2).map((h, i) => (
                    <p key={i} className="text-xs text-slate-300 italic truncate">„{h}"</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-[#0f0f1a] border border-[#1e1e2e] rounded-2xl p-6 space-y-5">

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              🎯 Video-Thema *
            </label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={
                hasCompetitorCtx
                  ? `z.B. "${competitorTitles[0]?.slice(0, 50) || 'Dein Thema hier'}"...`
                  : 'z.B. "Wie ich in 30 Tagen 1.000€ online verdient habe"'
              }
              className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-white
                         placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1
                         focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          {/* Niche + Platform row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                🏷️ Nische
              </label>
              <select
                value={niche}
                onChange={e => setNiche(e.target.value)}
                className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-white
                           focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                <option value="">Automatisch erkennen</option>
                {AVAILABLE_NICHES.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value="Allgemein">Allgemein / Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                📱 Plattform
              </label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-white
                           focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                <option value="TikTok / YouTube Shorts">TikTok / YouTube Shorts</option>
                <option value="YouTube Long-Form">YouTube (Lang, 5–10 Min.)</option>
                <option value="Instagram Reel">Instagram Reel</option>
              </select>
            </div>
          </div>

          {/* Custom Hook */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              🎣 Eigener Hook <span className="text-slate-600 font-normal">(optional — wird sonst automatisch generiert)</span>
            </label>
            <input
              value={customHook}
              onChange={e => setCustomHook(e.target.value)}
              placeholder="Dein eigener Einstiegssatz der direkt Aufmerksamkeit schafft..."
              className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-white
                         placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1
                         focus:ring-indigo-500/20 transition-colors"
            />
            {competitorHooks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-slate-500">Vom Competitor übernehmen:</span>
                {competitorHooks.slice(0, 3).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setCustomHook(h)}
                    className="text-xs text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/20 truncate max-w-xs transition-colors"
                  >
                    {h.slice(0, 45)}…
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-200
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generiere Skript…
              </>
            ) : (
              '✍️ Skript generieren'
            )}
          </button>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </div>

        {/* Script Output */}
        {script && (
          <div className="space-y-5">
            {/* Meta */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{script.topic}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">{script.niche}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">{script.platform}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">{script.duration}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">~{script.wordCount} Wörter</span>
                  {script.competitorSource && (
                    <>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-indigo-400">Von {script.competitorSource}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={copyAll}
                className="text-xs text-slate-400 hover:text-white bg-[#111118] border border-[#1e1e2e]
                           hover:border-slate-600 px-3 py-2 rounded-lg transition-colors"
              >
                {copiedAll ? '✓ Alles kopiert' : '📋 Alles kopieren'}
              </button>
            </div>

            {/* Hook Highlight */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/5 border border-indigo-500/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">🎣 Hook</p>
              <p className="text-sm font-medium text-white italic">„{script.hook}"</p>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {script.sections.map((s, i) => (
                <SectionCard key={i} section={s} index={i} />
              ))}
            </div>

            {/* Bottom Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hashtags */}
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide"># Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {script.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[#1e1e2e] text-slate-300 px-2 py-1 rounded cursor-pointer
                                 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                      onClick={() => navigator.clipboard.writeText(script.hashtags.join(' '))}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Thumbnail + Posting */}
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">🖼️ Thumbnail-Idee</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{script.thumbnailIdea}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">⏰ Bestes Posting</p>
                  <p className="text-xs text-slate-300">{script.postingTime}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Export with Suspense ───────────────────────────────────────────────────────
export default function ScriptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <ScriptPageInner />
    </Suspense>
  )
}
