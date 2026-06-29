'use client'

import { useState } from 'react'
import type { VideoScript } from '@/agents/script-agent'

const DEMO_SCRIPT: VideoScript = {
  topic: 'Diese 3 Side Hustles bringen dir 1000€ im Monat',
  niche: 'Side Hustle',
  platform: 'TikTok / YouTube Shorts',
  duration: '55–60 Sek.',
  hook: 'Diese 3 Side Hustles bringen dir 1000€ im Monat — ohne Startkapital',
  sections: [
    {
      label: 'Problem',
      duration: '10 Sek.',
      text: 'Die meisten Menschen denken, sie brauchen viel Geld um Geld zu verdienen. Das ist falsch. Diese 3 Methoden kosten dich nichts.',
      visualNote: '',
    },
    {
      label: 'Lösung',
      duration: '30 Sek.',
      text: 'Nummer 1: Freelancing auf Fiverr. Du verkaufst Fähigkeiten die du bereits hast. Nummer 2: Digitale Produkte auf Gumroad. Einmal erstellen, immer wieder verkaufen. Nummer 3: KI-gestützter Content. Dein Handy plus KI Tools reichen aus.',
      visualNote: '',
    },
    {
      label: 'CTA',
      duration: '10 Sek.',
      text: 'Folge mir für mehr Side Hustle Tipps die wirklich funktionieren.',
      visualNote: '',
    },
  ],
  cta: 'Folge mir für mehr Side Hustle Tipps!',
  hashtags: ['#SideHustle', '#OnlineGeldVerdienen'],
  thumbnailIdea: '',
  postingTime: '',
  wordCount: 80,
}

export default function VideoPage() {
  const [script, setScript] = useState<VideoScript | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')

  const loadDemoScript = () => setScript(DEMO_SCRIPT)

  const generate = async () => {
    if (!script) return
    setLoading(true)
    setError(null)
    setVideoUrl(null)
    setProgress('Lade Stock-Videos von Pexels…')

    const progressMessages = [
      'Lade Stock-Videos von Pexels…',
      'Erstelle KI-Voiceover…',
      'Füge Text-Overlays hinzu…',
      'Kombiniere alle Clips…',
      'Finales Video wird exportiert…',
    ]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % progressMessages.length
      setProgress(progressMessages[i])
    }, 8000)

    try {
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      })
      const data = await res.json()
      clearInterval(interval)

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unbekannter Fehler')
      }

      setVideoUrl(data.videoUrl)
      setDuration(data.duration)
      setProgress('')
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Fehler bei der Video-Erstellung')
      setProgress('')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-[900px]">
      <div>
        <h1 className="text-xl font-bold text-white">Video Agent</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Automatische Video-Erstellung · Stock-Footage + KI-Stimme + Text-Overlays
        </p>
      </div>

      {/* Workflow */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {['Trend Agent', 'Script Agent', 'Video Agent ⬅', 'YouTube Upload'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2">
            <span className={step.includes('⬅') ? 'text-indigo-400 font-semibold' : ''}>{step}</span>
            {i < arr.length - 1 && <span className="text-slate-700">→</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Script laden */}
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">1. Skript laden</h2>
          <p className="text-xs text-slate-500">
            Skript vom Script Agent übernehmen oder Demo-Skript nutzen.
          </p>
          <button
            onClick={loadDemoScript}
            className="w-full py-2 bg-[#111118] border border-[#1e1e2e] hover:border-indigo-500/40 text-slate-300 text-sm rounded-lg transition-colors"
          >
            📋 Demo-Skript laden
          </button>

          {script && (
            <div className="bg-[#111118] border border-emerald-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-400 text-xs">✓ Skript geladen</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{script.hook}</p>
              <p className="text-xs text-slate-600 mt-1">{script.sections.length} Abschnitte · {script.wordCount} Wörter</p>
            </div>
          )}
        </div>

        {/* Video erstellen */}
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">2. Video erstellen</h2>
          <div className="space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Stock-Videos von Pexels
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> KI-Stimme (Deutsch)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Fette Text-Overlays
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> 9:16 Format (Shorts/TikTok)
            </div>
          </div>
          <button
            onClick={generate}
            disabled={!script || loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Video wird erstellt…' : '🎬 Video erstellen'}
          </button>
        </div>
      </div>

      {/* Progress */}
      {loading && progress && (
        <div className="bg-[#16161f] border border-indigo-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">{progress}</p>
              <p className="text-xs text-slate-500 mt-0.5">Das dauert 2–4 Minuten — bitte warten</p>
            </div>
          </div>
          <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          <p className="font-medium mb-1">Fehler bei der Video-Erstellung:</p>
          <p className="text-xs opacity-80">{error}</p>
          <p className="text-xs mt-2 text-slate-500">
            Stelle sicher dass Python-Pakete installiert sind: <code className="bg-black/30 px-1 rounded">pip3 install moviepy gtts Pillow requests numpy --break-system-packages</code>
          </p>
        </div>
      )}

      {/* Ergebnis */}
      {videoUrl && (
        <div className="bg-[#16161f] border border-emerald-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">✅ Video fertig!</h2>
              {duration && (
                <p className="text-xs text-slate-500 mt-0.5">{Math.round(duration)} Sekunden · 9:16 Format</p>
              )}
            </div>
            <a
              href={videoUrl}
              download
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ⬇ Herunterladen
            </a>
          </div>

          <video
            src={videoUrl}
            controls
            className="w-full max-w-[320px] mx-auto rounded-xl border border-[#1e1e2e]"
            style={{ aspectRatio: '9/16' }}
          />

          <div className="flex gap-2">
            <a
              href="/upload"
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg text-center transition-colors"
            >
              ▶ Auf YouTube hochladen
            </a>
            <button
              onClick={generate}
              className="px-4 py-2 bg-[#111118] border border-[#1e1e2e] text-slate-400 hover:text-white text-sm rounded-lg transition-colors"
            >
              🔄 Neu erstellen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
