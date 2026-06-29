// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'

export default function BrandPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const run = async () => {
    setLoading(true); setData(null)
    try {
      const sRes  = await fetch('/api/script', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ topic:'Luxury Mindset', niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
      const sData = await sRes.json()
      const script = sData?.script?.fullScript || sData?.fullScript || ''
      const hook   = sData?.script?.hook || sData?.hook || ''
      const res    = await fetch('/api/brand', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ script, hook, niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
      setData(await res.json())
    } catch(e) { setData({ error: String(e) }) }
    finally { setLoading(false) }
  }
  useEffect(() => { run() }, [])

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white">🎨 Brand Check</h1><p className="text-xs text-muted mt-0.5">Prüft Script automatisch auf Brand-Konsistenz</p></div>
        <button onClick={run} disabled={loading} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg">{loading?'⏳…':'🔄 Neu'}</button>
      </div>
      {loading && <div className="bg-card border border-border rounded-xl p-8 text-center"><div className="text-3xl mb-2 animate-pulse">🎨</div><p className="text-sm text-muted">Brand Check läuft…</p></div>}
      {!loading && data && !data.error && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={`text-4xl font-bold ${(data.brandScore||0)>=60?'text-green-400':'text-red-400'}`}>{data.brandScore ?? '—'}</div>
            <div>
              <div className="text-sm font-medium text-white">{data.passed ? '✅ Brand-Check bestanden' : '❌ Brand-Probleme gefunden'}</div>
              <div className="text-xs text-muted mt-0.5">{data.summary}</div>
            </div>
          </div>
          {data.matchedValues?.length > 0 && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <div className="text-xs text-green-400 mb-2">✅ BRAND-WERTE ERKANNT</div>
              <div className="flex flex-wrap gap-1.5">{data.matchedValues.map((v,i)=><span key={i} className="text-xs px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-300">{v}</span>)}</div>
            </div>
          )}
          {data.forbiddenFound?.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="text-xs text-red-400 mb-2">🚨 VERBOTENE PHRASEN</div>
              <div className="flex flex-wrap gap-1.5">{data.forbiddenFound.map((v,i)=><span key={i} className="text-xs px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-300">{v}</span>)}</div>
            </div>
          )}
          {data.suggestions?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted mb-2">💡 VERBESSERUNGEN</div>
              {data.suggestions.map((s,i)=><p key={i} className="text-sm text-slate-300">• {s}</p>)}
            </div>
          )}
        </div>
      )}
      {!loading && data?.error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>}
    </div>
  )
}
