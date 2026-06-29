// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

export default function ScriptPage() {
  const { job, loading: jobLoading, getStepOutput } = useLatestJob()
  const [script, setScript]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource]   = useState('job')

  useEffect(() => {
    if (jobLoading) return

    // 1. Versuche aus Job Step 3 (Script Writer) zu lesen
    const stepOut = getStepOutput(3)
    if (stepOut && (stepOut.hook || stepOut.script || stepOut.fullScript)) {
      setScript(stepOut)
      setSource('job')
      setLoading(false)
      return
    }

    // 2. Fallback: direkt API aufrufen
    ;(async () => {
      try {
        let topic = 'Luxury Lifestyle Mindset'
        try {
          const tRes = await fetch('/api/trends')
          if (tRes.ok) {
            const tData = await tRes.json()
            topic = tData?.trends?.[0]?.title || topic
          }
        } catch (_) {}

        const scriptRes = await fetch('/api/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, niche: 'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic' }),
        })
        if (!scriptRes.ok) throw new Error(`API ${scriptRes.status}`)
        setScript(await scriptRes.json())
        setSource('direct')
      } catch (e) {
        setScript({ error: String(e) })
      } finally {
        setLoading(false)
      }
    })()
  }, [jobLoading, job?.id])

  if (loading || jobLoading) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <div className="text-3xl mb-3 animate-pulse">✍️</div>
      <p className="text-sm text-muted">Script wird generiert…</p>
    </div>
  )

  if (script?.error) return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{script.error}</div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">✍️ Script Writer</h1>
          <p className="text-xs text-muted mt-0.5">
            {source === 'job' && job ? `📡 Job: ${job.id.slice(0,8)}… · Step 3` : '🔄 Direkt generiert'}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); setScript(null) }}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg"
        >🔄 Neu</button>
      </div>

      {script?.topic && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-1">TOPIC</div>
          <div className="text-base font-semibold text-white">{script.topic}</div>
        </div>
      )}

      {script?.hook && (
        <div className="bg-card border border-indigo-500/30 rounded-xl p-4">
          <div className="text-xs text-muted mb-2">🔥 HOOK (erste 3 Sekunden)</div>
          <p className="text-sm text-white font-medium">"{script.hook}"</p>
        </div>
      )}

      {(script?.script || script?.fullScript) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-2">📜 SCRIPT</div>
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
            {script.fullScript || script.script}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {script?.cta && (
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-muted mb-1">CTA</div>
            <p className="text-xs text-white">{script.cta}</p>
          </div>
        )}
        {script?.musicStyle && (
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-muted mb-1">🎵 MUSIK</div>
            <p className="text-xs text-white">{script.musicStyle}</p>
          </div>
        )}
        {script?.duration && (
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-muted mb-1">⏱ DAUER</div>
            <p className="text-xs text-white">{script.duration}</p>
          </div>
        )}
        {script?.emotion && (
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-muted mb-1">💭 EMOTION</div>
            <p className="text-xs text-white">{script.emotion}</p>
          </div>
        )}
      </div>
    </div>
  )
}
