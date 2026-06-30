// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

export default function SEOPage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobLoading) return
    const stepOut = getStepOutput(4)
    if (stepOut && (stepOut.youtubeTitle || stepOut.hashtags)) {
      setData(stepOut); setLoading(false); return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/seo', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ topic:'Luxury Lifestyle', niche:'Luxury Lifestyle + Nostalgie + Motivation' }) })
        if (!res.ok) throw new Error(`API ${res.status}`)
        setData(await res.json())
      } catch(e) { setData({ error: String(e) }) }
      finally { setLoading(false) }
    })()
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl animate-pulse mb-3">🔍</div>
      <p className="text-sm text-muted">SEO-Daten werden geladen…</p>
    </div>
  )
  if (data?.error) return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🔍 SEO Optimizer</h1>
        <span className="text-xs text-muted">{job ? `Job ${job.id.slice(0,8)}… · Step 4` : 'Direkt'}</span>
      </div>
      {data?.youtubeTitle && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-1">▶️ YOUTUBE TITEL</div>
          <p className="text-sm font-semibold text-white">{data.youtubeTitle}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data?.tiktokCaption && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted mb-2">📱 TIKTOK CAPTION</div>
            <p className="text-xs text-slate-300">{data.tiktokCaption}</p>
          </div>
        )}
        {data?.instagramCaption && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted mb-2">📸 INSTAGRAM CAPTION</div>
            <p className="text-xs text-slate-300">{data.instagramCaption}</p>
          </div>
        )}
      </div>
      {data?.hashtags?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-2"># HASHTAGS</div>
          <div className="flex flex-wrap gap-1.5">
            {(data?.hashtags || []).map((h, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-indigo-400">{h}</span>
            ))}
          </div>
        </div>
      )}
      {data?.keywords?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-2">🔑 KEYWORDS</div>
          <div className="flex flex-wrap gap-1.5">
            {(data?.keywords || []).map((k, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-green-400">{typeof k === 'string' ? k : k.keyword || JSON.stringify(k)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
