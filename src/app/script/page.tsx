// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'

type ScriptResult = {
  topic?: string
  hook?: string
  fullScript?: string
  videoPrompt?: string
  musicStyle?: string
  hashtags?: string[]
  sceneKeywords?: string[]
  isDuplicate?: boolean
  scamDetected?: boolean
  error?: string
}

export default function ScriptPage() {
  const [script, setScript]     = useState<ScriptResult | null>(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setScript(null)
    try {
      // 1. Trend Scout holen
      const trendRes = await fetch('/api/trends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ niche: 'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic' }) })
      const trendData = await trendRes.json()
      const topTrend = trendData?.trends?.[0]?.title || trendData?.topTrend || 'Luxury Lifestyle Mindset'

      // 2. Script generieren
      const scriptRes = await fetch('/api/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topTrend, niche: 'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic', platform: 'TikTok / YouTube Shorts' }) })
      const scriptData = await scriptRes.json()
      setScript(scriptData?.script || scriptData)
    } catch (e) {
      setScript({ error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { generate() }, [])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">✍️ Script Agent</h1>
          <p className="text-xs text-muted mt-0.5">Automatisch aus aktuellem Trend generiert</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? '⏳ Generiere…' : '🔄 Neu generieren'}
        </button>
      </div>

      {loading && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="text-3xl mb-3 animate-pulse">✍️</div>
          <p className="text-sm text-muted">Trend Scout → Script Writer läuft…</p>
        </div>
      )}

      {!loading && script?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          Fehler: {script.error}
        </div>
      )}

      {!loading && script && !script.error && (
        <div className="space-y-4">
          {/* Topic & Hook */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div>
              <div className="text-xs text-muted mb-1">TOPIC</div>
              <div className="text-white font-semibold">{script.topic || '—'}</div>
            </div>
            {script.hook && (
              <div>
                <div className="text-xs text-muted mb-1">HOOK</div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-indigo-300 font-medium text-sm leading-relaxed">"{script.hook}"</div>
                  <button onClick={() => copy(script.hook, 'hook')} className="shrink-0 text-xs text-muted hover:text-white px-2 py-1 rounded hover:bg-surface transition-colors">
                    {copied === 'hook' ? '✓' : 'Kopieren'}
                  </button>
                </div>
              </div>
            )}
            {script.musicStyle && (
              <div>
                <div className="text-xs text-muted mb-1">MUSIK</div>
                <div className="text-amber-300 text-sm">🎵 {script.musicStyle}</div>
              </div>
            )}
          </div>

          {/* Full Script */}
          {script.fullScript && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-muted">VOLLSTÄNDIGES SKRIPT</div>
                <button onClick={() => copy(script.fullScript, 'script')} className="text-xs text-muted hover:text-white px-2 py-1 rounded hover:bg-surface transition-colors">
                  {copied === 'script' ? '✓ Kopiert' : 'Alles kopieren'}
                </button>
              </div>
              <pre className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{script.fullScript}</pre>
            </div>
          )}

          {/* InVideo Prompt */}
          {script.videoPrompt && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-indigo-400 font-medium">🎬 INVIDEO AI PROMPT</div>
                <button onClick={() => copy(script.videoPrompt, 'prompt')} className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors">
                  {copied === 'prompt' ? '✓ Kopiert' : 'In Clipboard'}
                </button>
              </div>
              <pre className="text-xs text-indigo-200/80 leading-relaxed whitespace-pre-wrap font-sans">{script.videoPrompt}</pre>
            </div>
          )}

          {/* Scene Keywords + Hashtags */}
          <div className="grid grid-cols-2 gap-4">
            {script.sceneKeywords?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted mb-2">ASSET KEYWORDS</div>
                <div className="flex flex-wrap gap-1.5">
                  {script.sceneKeywords.map((k, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-slate-300">{k}</span>
                  ))}
                </div>
              </div>
            )}
            {script.hashtags?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted mb-2">HASHTAGS</div>
                <div className="flex flex-wrap gap-1.5">
                  {script.hashtags.slice(0, 12).map((h, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-indigo-400">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Warnungen */}
          {script.isDuplicate && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-400">
              ⚠️ Topic wurde bereits verwendet — Neu generieren für ein anderes Thema
            </div>
          )}
          {script.scamDetected && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              🚨 Scam-Sprache erkannt — Script wurde automatisch bereinigt
            </div>
          )}
        </div>
      )}
    </div>
  )
}
