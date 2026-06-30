// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'

type GeneratorStatus = {
  id: string
  name: string
  available: boolean
  reason: string
  type: 'local' | 'api' | 'fallback'
  priority: number
  cost: 'free' | 'paid' | 'freemium'
  requiresApiKey?: boolean
  apiKeyEnvVar?: string
}

type EngineStatus = {
  activeGenerator: GeneratorStatus | null
  allGenerators: GeneratorStatus[]
}

type RenderResult = {
  success: boolean
  videoUrl?: string
  generatedBy?: string
  generatorId?: string
  renderTimeMs?: number
  assetsUsed?: number
  metadata?: Record<string, unknown>
  error?: string
  engineStatus?: EngineStatus
}

const COST_BADGE: Record<string, string> = {
  free: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  freemium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  paid: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const TYPE_ICON: Record<string, string> = {
  local: '💻',
  api: '☁️',
  fallback: '📋',
}

export default function VideoEnginePage() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RenderResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progressStep, setProgressStep] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)

  // Options
  const [colorLook, setColorLook] = useState('cinematic-dark')
  const [musicStyle, setMusicStyle] = useState('cinematic')
  const [platform, setPlatform] = useState('instagram-reels')
  const [effects, setEffects] = useState(['filmGrain', 'vignette'])
  const [customHook, setCustomHook] = useState('')

  // Lade Engine-Status beim Mount
  useEffect(() => {
    loadEngineStatus()
  }, [])

  async function loadEngineStatus() {
    try {
      const res = await fetch('/api/video')
      if (res.ok) {
        const data = await res.json()
        setEngineStatus({ activeGenerator: data.activeGenerator, allGenerators: data.allGenerators })
      }
    } catch {}
  }

  async function startRender() {
    setLoading(true)
    setError(null)
    setResult(null)
    setElapsedMs(0)

    const steps = [
      'Engine wird initialisiert…',
      'Verfügbaren Generator prüfen…',
      'Assets werden geladen…',
      'Szenen werden aufgebaut…',
      'Video wird gerendert…',
      'Ausgabe wird finalisiert…',
    ]
    let stepIdx = 0
    setProgressStep(steps[0])

    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1)
      setProgressStep(steps[stepIdx])
    }, 12000)

    const elapsedInterval = setInterval(() => {
      setElapsedMs(prev => prev + 100)
    }, 100)

    try {
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Die Leute die wenig reden bauen am meisten auf',
          hook: customHook || 'Die Leute die am wenigsten reden — bauen am meisten auf.',
          scriptText: 'Kein Drama. Keine Ausreden. Nur Fokus. Nur Bewegung. Jeden Tag. Ohne Publikum. Build different.',
          options: { colorLook, musicStyle, platform, effects, format: '9:16', duration: 30 },
        }),
      })

      const data = await res.json()
      clearInterval(stepInterval)
      clearInterval(elapsedInterval)

      if (data.engineStatus) {
        setEngineStatus(data.engineStatus)
      }

      setResult(data)

      if (!data.success && data.error) {
        setError(data.error)
      }
    } catch (e) {
      clearInterval(stepInterval)
      clearInterval(elapsedInterval)
      setError(e instanceof Error ? e.message : 'Netzwerkfehler')
    }
    setLoading(false)
  }

  const toggleEffect = (e: string) => {
    setEffects(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  const activeGen = engineStatus?.activeGenerator
  const isManifest = result?.generatorId === 'manifest'

  return (
    <div className="space-y-5 max-w-[960px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm">
            🎬
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Video Generation Engine</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Modulares Plugin-System · FFmpeg → Shotstack → Manifest Fallback
            </p>
          </div>
        </div>
      </div>

      {/* Generator Status Panel */}
      {engineStatus && (
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Verfügbare Generatoren</h2>
            <button
              onClick={loadEngineStatus}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ↻ Aktualisieren
            </button>
          </div>

          <div className="space-y-2">
            {(engineStatus.allGenerators || []).map((gen, i) => (
              <div
                key={gen.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  gen.available && gen.id === activeGen?.id
                    ? 'bg-indigo-500/10 border-indigo-500/40'
                    : gen.available
                      ? 'bg-[#111118] border-[#1e1e2e]'
                      : 'bg-[#0d0d14] border-[#1a1a26] opacity-60'
                }`}
              >
                {/* Status Dot */}
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  gen.available ? 'bg-emerald-400' : 'bg-slate-600'
                } ${gen.available && gen.id === activeGen?.id ? 'animate-pulse' : ''}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">
                      {TYPE_ICON[gen.type]} {gen.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${COST_BADGE[gen.cost]}`}>
                      {gen.cost}
                    </span>
                    {gen.available && gen.id === activeGen?.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        AKTIV
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 ml-auto">P{gen.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{gen.reason}</p>
                  {!gen.available && gen.apiKeyEnvVar && (
                    <p className="text-xs text-amber-500/70 mt-1">
                      → .env: <code className="bg-black/30 px-1 rounded">{gen.apiKeyEnvVar}</code>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!activeGen && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-400">
                ⚠ Kein Generator aktiv. Installiere FFmpeg: <code className="bg-black/30 px-1 rounded">brew install ffmpeg</code>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Options + Render */}
      <div className="grid grid-cols-2 gap-4">
        {/* Optionen */}
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-white">Video-Einstellungen</h2>

          {/* Hook */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Hook (optional — aus Script Agent)</label>
            <input
              type="text"
              value={customHook}
              onChange={e => setCustomHook(e.target.value)}
              placeholder="Die Leute die wenig reden…"
              className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Color Look */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Color Look</label>
            <select
              value={colorLook}
              onChange={e => setColorLook(e.target.value)}
              className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="cinematic-dark">🎬 Cinematic Dark</option>
              <option value="warm-golden">✨ Warm Golden</option>
              <option value="cool-blue">❄️ Cool Blue</option>
              <option value="vintage">📷 Vintage</option>
              <option value="clean">⚡ Clean</option>
            </select>
          </div>

          {/* Musik */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Musikstil</label>
            <select
              value={musicStyle}
              onChange={e => setMusicStyle(e.target.value)}
              className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="cinematic">🎵 Cinematic</option>
              <option value="motivational">💪 Motivational</option>
              <option value="ambient">🌊 Ambient</option>
              <option value="luxury">💎 Luxury</option>
            </select>
          </div>

          {/* Plattform */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Plattform</label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="instagram-reels">📸 Instagram Reels</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="youtube-shorts">▶️ YouTube Shorts</option>
            </select>
          </div>

          {/* Effekte */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Effekte</label>
            <div className="flex flex-wrap gap-2">
              {['filmGrain', 'vignette', 'motionBlur', 'colorPop'].map(eff => (
                <button
                  key={eff}
                  onClick={() => toggleEffect(eff)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    effects.includes(eff)
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                      : 'bg-[#111118] text-slate-500 border-[#1e1e2e] hover:border-slate-600'
                  }`}
                >
                  {eff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Render Panel */}
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-white">Render starten</h2>

          {/* Aktiver Generator Info */}
          {activeGen && (
            <div className="p-3 bg-[#111118] border border-[#1e1e2e] rounded-lg space-y-1">
              <p className="text-xs text-slate-500">Aktiver Generator</p>
              <p className="text-sm font-medium text-white">{TYPE_ICON[activeGen.type]} {activeGen.name}</p>
              <p className="text-xs text-slate-600">{activeGen.reason}</p>
            </div>
          )}

          {/* Pipeline Info */}
          <div className="space-y-1 text-xs text-slate-500">
            {[
              { icon: '✓', text: 'Script Agent Output wird gelesen' },
              { icon: '✓', text: 'Assets vom Asset Manager' },
              { icon: '✓', text: `Format: 9:16 · 30fps · H.264` },
              { icon: '✓', text: `Color: ${colorLook} · Musik: ${musicStyle}` },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-emerald-400">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          <button
            onClick={startRender}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Video wird erstellt…' : '🎬 Video erstellen'}
          </button>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin flex-shrink-0" />
                <p className="text-xs text-slate-400">{progressStep}</p>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((elapsedMs / 60000) * 100, 90)}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 text-right">
                {(elapsedMs / 1000).toFixed(0)}s vergangen
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fehler */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm font-medium text-red-400 mb-1">Fehler</p>
          <p className="text-xs text-red-400/80">{error}</p>
        </div>
      )}

      {/* Ergebnis */}
      {result && result.success && (
        <div className="bg-[#16161f] border border-emerald-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">
                {isManifest ? '📋 Video-Rezept erstellt' : '✅ Video fertig!'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {result.generatedBy} ·{' '}
                {result.renderTimeMs ? `${(result.renderTimeMs / 1000).toFixed(1)}s Renderzeit` : ''} ·{' '}
                {result.assetsUsed || 0} Assets verwendet
              </p>
            </div>
            {result.videoUrl && (
              <a
                href={result.videoUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                ⬇ {isManifest ? 'JSON laden' : 'Video laden'}
              </a>
            )}
          </div>

          {/* Render Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Generator', value: result.generatorId || '—' },
              { label: 'Renderzeit', value: result.renderTimeMs ? `${(result.renderTimeMs / 1000).toFixed(1)}s` : '—' },
              { label: 'Assets', value: String(result.assetsUsed || 0) },
            ].map(stat => (
              <div key={stat.label} className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-sm font-bold text-white mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Manifest Hinweis */}
          {isManifest && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-400 font-medium mb-1">Video-Rezept (JSON) erstellt</p>
              <p className="text-xs text-amber-400/70 leading-relaxed">
                Das JSON enthält alle Szenen, Assets, Color Grade und einen vollständigen FFmpeg-Befehl.
                Für automatisches Rendering: <code className="bg-black/30 px-1 rounded">brew install ffmpeg</code>
              </p>
            </div>
          )}

          {/* Video Player (nur für echte Videos) */}
          {!isManifest && result.videoUrl && (
            <div className="flex justify-center">
              <video
                src={result.videoUrl}
                controls
                className="rounded-xl border border-[#1e1e2e] max-h-[400px]"
                style={{ aspectRatio: '9/16', maxWidth: '220px' }}
              />
            </div>
          )}

          {/* Metadata */}
          {result.metadata && (
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Render-Details</p>
              <div className="space-y-1">
                {Object.entries(result.metadata).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 w-24 flex-shrink-0">{key}</span>
                    <span className="text-slate-400">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="flex gap-2">
            <a
              href="/qc"
              className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium rounded-lg text-center transition-colors border border-purple-500/30"
            >
              🔍 QC Inspector
            </a>
            <a
              href="/upload"
              className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg text-center transition-colors border border-red-500/30"
            >
              ▶ Upload Bot
            </a>
            <button
              onClick={startRender}
              className="px-4 py-2 bg-[#111118] border border-[#1e1e2e] text-slate-400 hover:text-white text-sm rounded-lg transition-colors"
            >
              🔄 Neu
            </button>
          </div>
        </div>
      )}

      {/* FFmpeg Install Hint (wenn nicht verfügbar) */}
      {engineStatus && !engineStatus.activeGenerator && (
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">FFmpeg installieren (empfohlen)</h3>
          <p className="text-xs text-slate-500">
            FFmpeg ist kostenlos und ermöglicht lokales Video-Rendering ohne API.
          </p>
          <div className="bg-[#111118] rounded-lg p-3 font-mono text-xs text-emerald-400">
            <p className="text-slate-500 mb-1"># macOS</p>
            <p>brew install ffmpeg</p>
            <p className="text-slate-500 mt-2 mb-1"># Ubuntu/Debian</p>
            <p>sudo apt install ffmpeg</p>
          </div>
          <p className="text-xs text-slate-600">
            Danach Seite neu laden → FFmpeg wird automatisch erkannt.
          </p>
        </div>
      )}
    </div>
  )
}
