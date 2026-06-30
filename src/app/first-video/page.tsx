// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'

const PACKAGES = ['001','002','003']
const DAY_COLOR = { 'Dienstag':'#6366f1','Donnerstag':'#10b981','Samstag':'#f59e0b' }

export default function FirstVideoPage() {
  const [packages, setPackages] = useState({})
  const [selected, setSelected] = useState('001')
  const [copied, setCopied]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all(
      PACKAGES.map(id =>
        fetch('/api/video-package?id=' + id)
          .then(r => r.ok ? r.json() : null)
          .then(d => [id, d])
      )
    ).then(results => {
      const map = {}
      results.forEach(([id, d]) => { if (d) map[id] = d })
      setPackages(map)
      setLoading(false)
    })
  }, [])

  const copy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const pkg = packages[selected]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">🎬 Erste 3 Videos — Fertig zur Produktion</h1>
        <p className="text-xs text-muted mt-0.5">Wochenplan automatisch generiert · InVideo AI Prompts bereit</p>
      </div>

      {/* Wochenplan Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {PACKAGES.map(id => {
          const p = packages[id]
          const days = { '001':'Di', '002':'Do', '003':'Sa' }
          const colors = { '001':'#6366f1', '002':'#10b981', '003':'#f59e0b' }
          return (
            <button key={id} onClick={() => setSelected(id)}
              className="text-left rounded-xl p-3 border transition-all"
              style={{
                background: selected===id ? 'rgba(99,102,241,0.08)' : '#0f0f1a',
                borderColor: selected===id ? colors[id] : '#1e1e3a'
              }}>
              <div className="text-xs font-bold mb-1" style={{color: colors[id]}}>
                {days[id] === 'Di' ? 'Dienstag' : days[id] === 'Do' ? 'Donnerstag' : 'Samstag'}
              </div>
              <div className="text-xs text-white font-medium leading-snug line-clamp-2">
                {p?.topic || (loading ? 'Lädt…' : '—')}
              </div>
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <div className="text-3xl animate-pulse mb-3">🎬</div>
          <p className="text-sm text-muted">Video-Pakete werden geladen…</p>
        </div>
      )}

      {pkg && (
        <>
          {/* Hook */}
          <div className="rounded-xl p-4" style={{background:'#0f0f1a',border:'1px solid rgba(251,146,60,0.3)'}}>
            <div className="text-xs font-medium mb-2" style={{color:'#fb923c'}}>🔥 HOOK (erste 2 Sekunden)</div>
            <p className="text-sm font-semibold text-white">"{pkg.hook}"</p>
            <button onClick={() => copy(pkg.hook, 'hook')} className="mt-2 text-xs text-muted hover:text-white">
              {copied==='hook' ? '✅ Kopiert!' : '📋 Kopieren'}
            </button>
          </div>

          {/* InVideo Prompt */}
          <div className="rounded-xl p-4" style={{background:'#0f0f1a',border:'1px solid rgba(99,102,241,0.4)'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-indigo-400">🎥 INVIDEO AI PROMPT</div>
              <button onClick={() => copy(pkg.invideoPrompt, 'prompt')}
                className="text-xs px-3 py-1.5 text-white rounded-lg font-medium" style={{background:'#4f46e5'}}>
                {copied==='prompt' ? '✅ Kopiert!' : '📋 Kopieren'}
              </button>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed max-h-44 overflow-y-auto" style={{color:'#cbd5e1'}}>
              {pkg.invideoPrompt}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Script */}
            <div className="rounded-xl p-4" style={{background:'#0f0f1a',border:'1px solid #1e1e3a'}}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted font-medium">📜 SCRIPT</div>
                <button onClick={() => copy(pkg.fullScript, 'script')} className="text-xs text-muted hover:text-white">
                  {copied==='script' ? '✅' : '📋'}
                </button>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto" style={{color:'#cbd5e1'}}>
                {pkg.fullScript}
              </pre>
            </div>

            <div className="space-y-3">
              {/* SEO */}
              <div className="rounded-xl p-4" style={{background:'#0f0f1a',border:'1px solid #1e1e3a'}}>
                <div className="text-xs text-muted mb-1">▶️ YOUTUBE TITEL</div>
                <div className="text-xs font-medium text-white">{pkg.seo?.youtubeTitle}</div>
                <button onClick={() => copy(pkg.seo?.youtubeTitle||'', 'title')} className="mt-1.5 text-xs text-muted hover:text-white">
                  {copied==='title' ? '✅' : '📋 Kopieren'}
                </button>
              </div>

              {/* Captions */}
              <div className="rounded-xl p-4" style={{background:'#0f0f1a',border:'1px solid #1e1e3a'}}>
                <div className="text-xs text-muted mb-2">📱 TIKTOK CAPTION</div>
                <p className="text-xs leading-relaxed" style={{color:'#cbd5e1'}}>{pkg.seo?.tiktokCaption}</p>
                <button onClick={() => copy(pkg.seo?.tiktokCaption||'', 'tiktok')} className="mt-2 text-xs text-muted hover:text-white">
                  {copied==='tiktok' ? '✅' : '📋'}
                </button>
              </div>

              {/* Hashtags */}
              <div className="rounded-xl p-4" style={{background:'#0f0f1a',border:'1px solid #1e1e3a'}}>
                <div className="text-xs text-muted mb-2"># HASHTAGS</div>
                <div className="flex flex-wrap gap-1">
                  {(pkg.seo?.hashtags||[]).map((h,i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 rounded text-indigo-400" style={{background:'#1e1e2e'}}>{h}</span>
                  ))}
                </div>
                <button onClick={() => copy((pkg.seo?.hashtags||[]).join(' '), 'tags')} className="mt-2 text-xs text-muted hover:text-white">
                  {copied==='tags' ? '✅ Kopiert!' : '📋 Alle kopieren'}
                </button>
              </div>

              {/* Posting */}
              <div className="rounded-xl p-4" style={{background:'#0f0f1a',border:'1px solid #1e1e3a'}}>
                <div className="text-xs text-muted mb-2">📅 POSTING-ZEIT</div>
                {Object.entries(pkg.platforms||{}).map(([p,info]) => (
                  <div key={p} className="flex justify-between py-1 border-b last:border-0" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                    <span className="text-xs capitalize" style={{color:'#cbd5e1'}}>{p}</span>
                    <span className="text-xs text-indigo-400">{info.bestTime} · {info.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl p-4 flex items-center justify-between" style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)'}}>
            <div>
              <div className="text-sm font-medium text-green-400">Bereit? Jetzt produzieren.</div>
              <div className="text-xs text-muted mt-0.5">Prompt kopieren → InVideo öffnen → Einfügen → Generieren</div>
            </div>
            <a href="https://invideo.io/ai" target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 text-white text-xs font-medium rounded-lg shrink-0" style={{background:'#4f46e5'}}>
              InVideo AI öffnen →
            </a>
          </div>
        </>
      )}
    </div>
  )
}
