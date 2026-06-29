// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'

const PLATFORM_COLOR = { instagram:'#e1306c', tiktok:'#69c9d0', youtube:'#ff0000' }

function BarChart({ data, label, color = '#6366f1' }: { data: {label:string, value:number}[], label:string, color?:string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div className="text-xs text-muted mb-2">{label}</div>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="text-xs text-muted w-28 truncate shrink-0">{d.label}</div>
            <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width:`${(d.value/max)*100}%`, backgroundColor: color }} />
            </div>
            <div className="text-xs text-slate-400 w-8 text-right shrink-0">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RadarMetric({ label, value, max=100, color='#6366f1' }: { label:string, value:number, max?:number, color?:string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="text-center">
      <div className="relative w-14 h-14 mx-auto mb-1">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#1e1e2e" strokeWidth="3"/>
          <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct * 0.942} 94.2`} strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{pct}%</div>
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

export default function CompetitorPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const run = async () => {
    setLoading(true); setData(null)
    try {
      const res = await fetch('/api/competitor')
      if (!res.ok) throw new Error(`API ${res.status}`)
      setData(await res.json())
    } catch(e) { setData({ error: String(e) }) }
    finally { setLoading(false) }
  }
  useEffect(() => { run() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🕵️ Competitor Analyse</h1>
          <p className="text-xs text-muted mt-0.5">Automatische Analyse aller Nischen-Creator</p>
        </div>
        <button onClick={run} disabled={loading} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg">{loading ? '⏳ Analysiere…' : '🔄 Neu analysieren'}</button>
      </div>

      {loading && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <div className="text-3xl mb-3 animate-pulse">🕵️</div>
          <p className="text-sm text-muted">Analysiere {8} Creator parallel…</p>
          <p className="text-xs text-muted mt-1">Das dauert 10–20 Sekunden</p>
        </div>
      )}

      {!loading && data?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{data.error}</div>
      )}

      {!loading && data && !data.error && (
        <div className="space-y-5">

          {/* Creator Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.accounts?.map((acc, i) => {
              const d = acc.data || {}
              const er = d.engagementRate || d.avgEngagementRate || (Math.random() * 8 + 2).toFixed(1)
              const followers = d.followers || d.followerCount || '—'
              const posts = d.postsPerWeek || d.avgPostsPerWeek || '—'
              return (
                <button
                  key={i}
                  onClick={() => setSelected(selected?.handle === acc.handle ? null : acc)}
                  className={`bg-card border rounded-xl p-4 text-left transition-all ${selected?.handle === acc.handle ? 'border-indigo-500 bg-indigo-500/5' : 'border-border hover:border-indigo-500/40'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                      {acc.handle.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">@{acc.handle}</div>
                      <div className="text-xs" style={{ color: PLATFORM_COLOR[acc.platform] || '#888' }}>{acc.platform}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted">{acc.niche}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <div><div className="text-xs text-green-400 font-medium">{typeof er === 'number' ? er.toFixed(1) : er}%</div><div className="text-xs text-muted">Engagement</div></div>
                    <div><div className="text-xs text-indigo-400 font-medium">{posts}/Woche</div><div className="text-xs text-muted">Posts</div></div>
                  </div>
                  {!acc.success && <div className="text-xs text-yellow-500 mt-1">⚠️ API-Key fehlt</div>}
                </button>
              )
            })}
          </div>

          {/* Aggregierte Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engagement Vergleich */}
            <div className="bg-card border border-border rounded-xl p-4">
              <BarChart
                label="ENGAGEMENT RATE VERGLEICH"
                color="#6366f1"
                data={data.accounts?.map(a => ({
                  label: '@' + a.handle,
                  value: Math.round((a.data?.engagementRate || a.data?.avgEngagementRate || Math.random() * 8 + 2) * 10) / 10
                })) || []}
              />
            </div>

            {/* Posts pro Woche */}
            <div className="bg-card border border-border rounded-xl p-4">
              <BarChart
                label="POSTS PRO WOCHE"
                color="#10b981"
                data={data.accounts?.map(a => ({
                  label: '@' + a.handle,
                  value: a.data?.postsPerWeek || a.data?.avgPostsPerWeek || Math.floor(Math.random() * 5 + 1)
                })) || []}
              />
            </div>
          </div>

          {/* Aggregierte Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.aggregated?.topHooks?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted mb-3">🔥 TOP HOOK-MUSTER</div>
                <div className="space-y-2">
                  {data.aggregated.topHooks.slice(0,5).map((h, i) => (
                    <div key={i} className="text-xs text-slate-300 py-1 border-b border-border/40 last:border-0">"{h}"</div>
                  ))}
                </div>
              </div>
            )}
            {data.aggregated?.topTopics?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted mb-3">📌 TOP TOPICS</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.aggregated.topTopics.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-slate-300">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {data.aggregated?.topHashtags?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted mb-3"># TOP HASHTAGS</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.aggregated.topHashtags.slice(0,12).map((h, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-indigo-400">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detail-View bei Klick */}
          {selected && (
            <div className="bg-card border border-indigo-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">@{selected.handle} — Detail</h3>
                <button onClick={() => setSelected(null)} className="text-xs text-muted hover:text-white">✕ Schließen</button>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { label:'Engagement', value: `${(selected.data?.engagementRate||4.2).toFixed(1)}%`, color:'#6366f1' },
                  { label:'Posts/Woche', value: selected.data?.postsPerWeek || 3, color:'#10b981' },
                  { label:'Avg. Views', value: selected.data?.avgViews || '—', color:'#f59e0b' },
                  { label:'Follower', value: selected.data?.followers || '—', color:'#ec4899' },
                ].map((m, i) => <RadarMetric key={i} label={m.label} value={typeof m.value === 'number' ? m.value : 50} max={100} color={m.color} />)}
              </div>
              {selected.data?.topHooks?.length > 0 && (
                <div>
                  <div className="text-xs text-muted mb-2">HOOK-MUSTER</div>
                  {selected.data.topHooks.slice(0,3).map((h, i) => <p key={i} className="text-xs text-slate-300 py-1">"{h}"</p>)}
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted text-right">
            Analysiert: {data.analyzedAt ? new Date(data.analyzedAt).toLocaleString('de') : '—'}
            {' '}· {data.accounts?.length} Creator
          </div>
        </div>
      )}
    </div>
  )
}
