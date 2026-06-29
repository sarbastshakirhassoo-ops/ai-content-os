// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'

export default function SEOPage() {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(null)

  const run = async () => {
    setLoading(true); setData(null)
    try {
      const tRes  = await fetch('/api/trends', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
      const tData = await tRes.json()
      const topic = tData?.trends?.[0]?.title || 'Luxury Lifestyle'
      const sRes  = await fetch('/api/seo', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ topic, niche:'Luxury Lifestyle + Nostalgie + Motivation', platforms:['instagram','tiktok','youtube'] }) })
      setData(await sRes.json())
    } catch(e) { setData({ error: String(e) }) }
    finally { setLoading(false) }
  }
  useEffect(() => { run() }, [])

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1500) }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white">🔍 SEO Optimizer</h1><p className="text-xs text-muted mt-0.5">Automatisch aus aktuellem Trend</p></div>
        <button onClick={run} disabled={loading} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg">{loading ? '⏳…' : '🔄 Neu'}</button>
      </div>
      {loading && <div className="bg-card border border-border rounded-xl p-8 text-center"><div className="text-3xl mb-2 animate-pulse">🔍</div><p className="text-sm text-muted">SEO Optimizer läuft…</p></div>}
      {!loading && data && !data.error && (
        <div className="space-y-4">
          {[
            { key:'youtubeTitle',     label:'YouTube Titel',      icon:'▶️' },
            { key:'tiktokCaption',    label:'TikTok Caption',     icon:'🎵' },
            { key:'instagramCaption', label:'Instagram Caption',  icon:'📸' },
            { key:'description',      label:'Beschreibung',       icon:'📝' },
          ].map(({key, label, icon}) => data[key] && (
            <div key={key} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted">{icon} {label.toUpperCase()}</div>
                <button onClick={()=>copy(data[key], key)} className="text-xs text-muted hover:text-white px-2 py-1 rounded hover:bg-surface">{copied===key?'✓':'Kopieren'}</button>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{data[key]}</p>
            </div>
          ))}
          {data.hashtags?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted"># HASHTAGS</div>
                <button onClick={()=>copy(data.hashtags.join(' '), 'tags')} className="text-xs text-muted hover:text-white px-2 py-1 rounded hover:bg-surface">{copied==='tags'?'✓':'Alle kopieren'}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">{data.hashtags.map((h,i)=><span key={i} className="text-xs px-2 py-1 bg-surface rounded text-indigo-400">{h}</span>)}</div>
            </div>
          )}
        </div>
      )}
      {!loading && data?.error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>}
    </div>
  )
}
