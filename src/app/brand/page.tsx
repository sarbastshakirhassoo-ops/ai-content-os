'use client'

import { useState } from 'react'
import type { BrandAgentOutput, BrandCheck } from '@/agents/brand-agent'

// ── Brand Check Card ──────────────────────────────────────────────────────────

function CheckCard({ check }: { check: BrandCheck }) {
  const pct = check.score
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className={`bg-[#16161f] border rounded-xl p-4 ${check.passed ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{check.passed ? '✅' : '❌'}</span>
          <span className="text-sm font-semibold text-white">{check.dimension}</span>
        </div>
        <span className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}/100</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full mb-3">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400">{check.finding}</p>
      {check.suggestion && (
        <p className="text-xs text-indigo-400 mt-1.5 border-t border-indigo-500/10 pt-1.5">→ {check.suggestion}</p>
      )}
    </div>
  )
}

// ── Brand Page ────────────────────────────────────────────────────────────────

export default function BrandPage() {
  const [data, setData]       = useState<BrandAgentOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [topic, setTopic]     = useState('')
  const [hook, setHook]       = useState('')
  const [cta, setCta]         = useState('')
  const [tab, setTab]         = useState<'check' | 'guide' | 'report'>('check')

  async function run() {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/brand', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: {
            topic, hook, cta,
            niche: 'Allgemein',
            sections: [{ label: 'Intro', duration: '0:15', text: hook, visualNote: '' }],
            wordCount: hook.split(' ').length + cta.split(' ').length,
            hashtags: [],
            platform: 'TikTok / YouTube Shorts',
            duration: '60s',
            thumbnailIdea: '',
            postingTime: '',
          },
        }),
      })
      setData(await res.json() as BrandAgentOutput)
    } finally {
      setLoading(false)
    }
  }

  const overallScore = data?.overallScore ?? 0
  const scoreColor   = overallScore >= 80 ? 'text-emerald-400' : overallScore >= 65 ? 'text-yellow-400' : 'text-red-400'

  const BRAND_GUIDE = [
    { label: 'Stimme',         value: 'Autoritativ — direkt, selbstbewusst, lösungsorientiert', icon: '🎙️' },
    { label: 'Ton',            value: 'Direkt · Klar · Präzise · Motivierend · Lösungsorientiert', icon: '🎯' },
    { label: 'Primärfarben',   value: '#6366f1 (Indigo) · #1e1e2e (Dark) · #ffffff (Weiß)', icon: '🎨' },
    { label: 'Schriftarten',   value: 'Inter Bold (Headlines) · Inter Regular (Body)', icon: '✏️' },
    { label: 'Intro-Stil',     value: 'Direkt ins Thema — kein langer Abspann. Max. 3 Sek. Branding.', icon: '▶️' },
    { label: 'Outro-Stil',     value: 'Klarer CTA + Abo-Reminder. Max. 5 Sekunden.', icon: '⏹️' },
    { label: 'Logo-Position',  value: 'Obere rechte Ecke · Max. 8% Breite · Halbtransparent', icon: '🏷️' },
    { label: 'Untertitel',     value: 'Weiß · Inter Bold · 32px · Zentriert · Schlüsselwörter in #6366f1', icon: '💬' },
    { label: 'Voice-over',     value: 'Klar · Selbstbewusst · Kein Zögern · Mittleres Tempo', icon: '🔊' },
    { label: 'CTA-Formel',     value: 'Konkrete Handlung + klarer Nutzen für den Zuschauer', icon: '📣' },
  ]

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🎨 Brand Consistency</h1>
          <p className="text-slate-400 text-sm mt-1">Jedes Video sofort als Teil derselben Marke erkennbar</p>
        </div>
        {data && (
          <div className="text-center">
            <div className={`text-3xl font-bold ${scoreColor}`}>{overallScore}</div>
            <div className="text-xs text-slate-500">Brand Score /100</div>
            <div className={`mt-1 text-xs font-semibold px-2 py-0.5 rounded ${data.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {data.passed ? '✅ Freigegeben' : '⚠️ Überarbeitung nötig'}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e1e2e] pb-px">
        {(['check', 'guide', 'report'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {{ check: '🔍 Brand-Check', guide: '📖 Brand Guide', report: '📋 Report' }[t]}
          </button>
        ))}
      </div>

      {/* Tab: Check */}
      {tab === 'check' && (
        <div className="space-y-4">
          <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
            <p className="text-xs text-slate-400">Skript-Elemente eingeben für Brand-Check:</p>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Video-Thema…"
              className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              value={hook}
              onChange={e => setHook(e.target.value)}
              placeholder="Hook (erste 3 Sekunden)…"
              rows={2}
              className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <textarea
              value={cta}
              onChange={e => setCta(e.target.value)}
              placeholder="CTA / Outro-Text…"
              rows={2}
              className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <button
              onClick={() => void run()}
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Prüfe Brand-Konformität…' : 'Brand-Check durchführen'}
            </button>
          </div>

          {data && (
            <>
              {/* Auto-fixed CTA */}
              {data.revisedCTA && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                  <p className="text-xs text-indigo-400 font-semibold mb-1">🔧 Auto-korrigierter CTA:</p>
                  <p className="text-sm text-white">&ldquo;{data.revisedCTA}&rdquo;</p>
                </div>
              )}

              {/* Critical issues */}
              {data.criticalIssues.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-400 mb-2">⚠️ Kritische Probleme</p>
                  {data.criticalIssues.map((issue, i) => <p key={i} className="text-sm text-red-300">• {issue}</p>)}
                </div>
              )}

              {/* Check grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.checks.map((check, i) => <CheckCard key={i} check={check} />)}
              </div>
            </>
          )}

          {!data && !loading && (
            <div className="text-center text-slate-500 py-12">
              <p className="text-3xl mb-2">🎨</p>
              <p className="text-sm">Skript-Elemente eingeben und Brand-Check starten</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Brand Guide */}
      {tab === 'guide' && (
        <div className="space-y-3">
          <div className="bg-[#16161f] border border-indigo-500/20 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">Content OS Brand</h2>
            <p className="text-xs text-slate-500">Interne Markenidentität — wird für alle Checks verwendet</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BRAND_GUIDE.map(item => (
              <div key={item.label} className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{item.icon}</span>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{item.label}</span>
                </div>
                <p className="text-sm text-slate-200">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#16161f] border border-red-500/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-400 mb-2">⛔ Verbotene Phrasen</p>
            <div className="flex flex-wrap gap-2">
              {['guys', "what's up", 'vielleicht', 'könnte sein', 'mal sehen', 'irgendwie', 'ich weiß nicht'].map(p => (
                <span key={p} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-300 rounded text-xs line-through">{p}</span>
              ))}
            </div>
          </div>
          <div className="bg-[#16161f] border border-emerald-500/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-400 mb-2">✅ Pflicht-Elemente in jedem Video</p>
            {['Hook in ersten 3 Sekunden', 'Konkreter CTA mit klarem Nutzen', 'Klare Hauptaussage / Kernbotschaft'].map((m, i) => (
              <p key={i} className="text-sm text-slate-300">✓ {m}</p>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Report */}
      {tab === 'report' && (
        <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5">
          {data
            ? <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{data.brandReport}</pre>
            : <div className="text-center text-slate-500 py-12">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm">Führe zuerst einen Brand-Check durch um den Report zu sehen</p>
              </div>
          }
        </div>
      )}
    </div>
  )
}
