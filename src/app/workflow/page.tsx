// @ts-nocheck
'use client'
import { useEffect, useState, useRef } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

const NODES = [
  { id:0,  name:'Trend Scout',     icon:'📡', x:400, y:40,   color:'#6366f1', href:'/trends' },
  { id:1,  name:'Competitor',      icon:'🔍', x:160, y:160,  color:'#8b5cf6', href:'/competitor' },
  { id:2,  name:'Knowledge',       icon:'🧠', x:640, y:160,  color:'#8b5cf6', href:'/knowledge' },
  { id:3,  name:'Script Writer',   icon:'✍️', x:400, y:280,  color:'#06b6d4', href:'/script' },
  { id:4,  name:'SEO Optimizer',   icon:'🔎', x:160, y:400,  color:'#10b981', href:'/seo' },
  { id:5,  name:'Brand Check',     icon:'🎨', x:640, y:400,  color:'#10b981', href:'/brand' },
  { id:6,  name:'Asset Manager',   icon:'🎬', x:160, y:520,  color:'#f59e0b', href:'/assets' },
  { id:7,  name:'InVideo AI',      icon:'🎥', x:640, y:520,  color:'#f59e0b', href:'/video' },
  { id:8,  name:'QC Inspector',    icon:'🔬', x:400, y:640,  color:'#ef4444', href:'/qc' },
  { id:9,  name:'Calendar',        icon:'📅', x:160, y:760,  color:'#ec4899', href:'/calendar' },
  { id:10, name:'Upload Bot',      icon:'🚀', x:640, y:760,  color:'#ec4899', href:'/upload' },
  { id:11, name:'Analytics',       icon:'📊', x:160, y:880,  color:'#a78bfa', href:'/analytics' },
  { id:12, name:'Engagement',      icon:'💬', x:640, y:880,  color:'#a78bfa', href:'/engagement' },
  { id:13, name:'Learning Agent',  icon:'🤖', x:400, y:1000, color:'#6366f1', href:'/learning' },
]

const EDGES = [
  [0,1],[0,2],
  [1,3],[2,3],
  [3,4],[3,5],
  [4,6],[5,7],
  [6,8],[7,8],
  [8,9],[8,10],
  [9,11],[10,12],
  [11,13],[12,13],
]

const STATUS_COLOR = {
  pending:   '#2d2d44',
  running:   '#6366f1',
  retrying:  '#f59e0b',
  completed: '#10b981',
  failed:    '#ef4444',
  blocked:   '#f97316',
}

const STATUS_LABEL = {
  pending:   '◦ Wartet',
  running:   '⚡ Läuft',
  retrying:  '↻ Retry',
  completed: '✓ Fertig',
  failed:    '✗ Fehler',
  blocked:   '⊘ Blockiert',
}

const NODE_W = 148
const NODE_H = 62

export default function WorkflowCanvas() {
  const { job } = useLatestJob(1500)
  const containerRef = useRef(null)
  const [tick, setTick] = useState(0)
  const [view, setView] = useState({ x: 60, y: 20, scale: 0.72 })
  const drag = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setTick(n => (n + 1) % 1000), 50)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      setView(v => ({ ...v, scale: Math.max(0.3, Math.min(1.6, v.scale * delta)) }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onMouseDown = (e) => {
    if (e.button !== 0) return
    drag.current = { sx: e.clientX - view.x, sy: e.clientY - view.y }
  }
  const onMouseMove = (e) => {
    if (!drag.current) return
    setView(v => ({ ...v, x: e.clientX - drag.current.sx, y: e.clientY - drag.current.sy }))
  }
  const onMouseUp = () => { drag.current = null }

  const getStatus = (id) => job?.steps?.[id]?.status || 'pending'
  const getMs = (id) => job?.steps?.[id]?.durationMs

  const edgePaths = EDGES.map(([from, to]) => {
    const a = NODES[from]
    const b = NODES[to]
    const ax = a.x + NODE_W / 2
    const ay = a.y + NODE_H
    const bx = b.x + NODE_W / 2
    const by = b.y
    const cy = (ay + by) / 2
    return { from, to,
      d: `M ${ax} ${ay} C ${ax} ${cy}, ${bx} ${cy}, ${bx} ${by}`,
      ax, ay, bx, by, cy }
  })

  const completedCount = job?.steps?.filter(s => s.status === 'completed').length || 0

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-bold text-white">Workflow Canvas — 14 Agents</h1>
          <p className="text-xs text-muted">Scroll = Zoom · Drag = Pan · Klick auf Node = Detail</p>
        </div>
        <div className="flex items-center gap-3">
          {job ? (
            <div className="text-right">
              <div className="text-xs text-white font-medium truncate max-w-[140px]">{job.topic || 'Kein Topic'}</div>
              <div className="text-xs text-muted">{completedCount}/14 Steps</div>
            </div>
          ) : <div className="text-xs text-muted">Kein aktiver Job</div>}
          <button
            onClick={() => setView({ x: 60, y: 20, scale: 0.72 })}
            className="text-xs text-muted hover:text-white px-2 py-1 rounded"
            style={{ background: '#1e1e2e', border: '1px solid #2d2d44' }}
          >Reset</button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{ background: '#07070f', cursor: drag.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Dot grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.12 }}>
          <defs>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#6366f1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowS">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g transform={`translate(${view.x}, ${view.y}) scale(${view.scale})`}>

            {/* Edges */}
            {edgePaths.map(({ from, to, d, ax, ay, bx, by, cy }, i) => {
              const fromStatus = getStatus(from)
              const active = fromStatus === 'completed' || fromStatus === 'running'
              const color = fromStatus === 'completed' ? '#10b981'
                          : fromStatus === 'running' ? '#6366f1'
                          : '#1e1e3a'

              // Particle along cubic bezier
              const t = ((tick * 0.015) % 1)
              const t2 = 1 - t
              const px = t2*t2*t2*ax + 3*t2*t2*t*ax + 3*t2*t*t*bx + t*t*t*bx
              const py = t2*t2*t2*ay + 3*t2*t2*t*cy + 3*t2*t*t*cy + t*t*t*by

              return (
                <g key={i}>
                  <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity={active ? 0.7 : 0.2} />
                  {active && (
                    <path d={d} fill="none" stroke={color} strokeWidth="4" opacity="0.15" filter="url(#glow)" />
                  )}
                  {fromStatus === 'running' && (
                    <circle cx={px} cy={py} r="4" fill="#818cf8" filter="url(#glowS)" />
                  )}
                  {fromStatus === 'completed' && (
                    <circle cx={px} cy={py} r="3" fill="#34d399" opacity="0.8" />
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {NODES.map((node) => {
              const status = getStatus(node.id)
              const sColor = STATUS_COLOR[status]
              const ms = getMs(node.id)
              const isRunning = status === 'running'
              const borderColor = isRunning ? node.color
                                : status === 'completed' ? '#10b981'
                                : status === 'failed' ? '#ef4444'
                                : status === 'blocked' ? '#f97316'
                                : '#1e1e3a'
              const pulse = Math.sin(tick * 0.1) * 0.4 + 0.6

              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => window.location.href = node.href}>

                  {/* Glow halo when running */}
                  {isRunning && (
                    <rect x="-8" y="-8" width={NODE_W + 16} height={NODE_H + 16}
                      rx="20" fill="none"
                      stroke={node.color}
                      strokeWidth="1.5"
                      opacity={pulse * 0.5}
                      filter="url(#glow)" />
                  )}

                  {/* Card */}
                  <rect x="0" y="0" width={NODE_W} height={NODE_H} rx="12"
                    fill="#0d0d1a"
                    stroke={borderColor}
                    strokeWidth={isRunning || status === 'completed' ? 1.5 : 1}
                    opacity={status === 'pending' ? 0.55 : 1} />

                  {/* Color top bar */}
                  <rect x="1" y="1" width={NODE_W - 2} height="3" rx="11"
                    fill={borderColor} opacity="0.7" />

                  {/* Icon */}
                  <text x="14" y={NODE_H / 2 + 2} fontSize="18" dominantBaseline="middle"
                    style={{ userSelect: 'none' }}>
                    {node.icon}
                  </text>

                  {/* Name */}
                  <text x="42" y="24" fontSize="11" fontWeight="600" fill="white"
                    dominantBaseline="middle" style={{ userSelect: 'none' }}>
                    {node.name}
                  </text>

                  {/* Status + ms */}
                  <text x="42" y="44" fontSize="9" fill={sColor}
                    dominantBaseline="middle" style={{ userSelect: 'none' }}>
                    {STATUS_LABEL[status]}{ms ? '  ' + ms + 'ms' : ''}
                  </text>

                  {/* Step badge */}
                  <circle cx={NODE_W - 13} cy="13" r="10" fill="#0d0d1a"
                    stroke={borderColor} strokeWidth="1" />
                  <text x={NODE_W - 13} y="13" fontSize="8" fill={borderColor}
                    textAnchor="middle" dominantBaseline="middle" fontWeight="700"
                    style={{ userSelect: 'none' }}>
                    {node.id + 1}
                  </text>
                </g>
              )
            })}

            {/* QC Gate badge */}
            <g transform={`translate(${400 + NODE_W/2 - 34}, ${640 - 20})`}>
              <rect x="0" y="0" width="68" height="16" rx="8"
                fill="#ef444415" stroke="#ef444440" strokeWidth="1" />
              <text x="34" y="8" fontSize="8" fill="#ef4444"
                textAnchor="middle" dominantBaseline="middle" fontWeight="600">
                QC GATE
              </text>
            </g>

          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 rounded-xl p-3"
          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #1e1e3a', backdropFilter: 'blur(8px)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: '#6b7280' }}>STATUS</div>
          {Object.entries(STATUS_COLOR).map(([k, c]) => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-xs" style={{ color: '#9ca3af' }}>
                {k === 'pending' ? 'Wartet' : k === 'running' ? 'Läuft' :
                 k === 'retrying' ? 'Retry' : k === 'completed' ? 'Fertig' :
                 k === 'failed' ? 'Fehler' : 'Blockiert'}
              </span>
            </div>
          ))}
        </div>

        {/* Job overlay */}
        {job && (
          <div className="absolute top-3 right-3 rounded-xl p-3 max-w-48"
            style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid #1e1e3a', backdropFilter: 'blur(8px)' }}>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>AKTIVER JOB</div>
            <div className="text-xs font-medium text-white truncate">{job.topic || 'Unbekannt'}</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{completedCount}/14 Steps</div>
            {job.qcScore !== undefined && (
              <div className="text-xs mt-1" style={{ color: job.qcPassed ? '#10b981' : '#ef4444' }}>
                QC {job.qcScore}/100
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
