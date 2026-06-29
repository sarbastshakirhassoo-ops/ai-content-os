// @ts-nocheck
'use client'
import { useEffect, useState, useRef } from 'react'
import { useLatestJob } from '@/hooks/useLatestJob'

const NODES = [
  // Row 0 — top
  { id:0,  name:'Trend Scout',       icon:'📡', x:400, y:40,   color:'#6366f1' },
  // Row 1
  { id:1,  name:'Competitor',        icon:'🕵️', x:180, y:160,  color:'#8b5cf6' },
  { id:2,  name:'Knowledge',         icon:'🧠', x:620, y:160,  color:'#8b5cf6' },
  // Row 2
  { id:3,  name:'Script Writer',     icon:'✍️', x:400, y:280,  color:'#06b6d4' },
  // Row 3
  { id:4,  name:'SEO Optimizer',     icon:'🔍', x:180, y:400,  color:'#10b981' },
  { id:5,  name:'Brand Check',       icon:'🎨', x:620, y:400,  color:'#10b981' },
  // Row 4
  { id:6,  name:'Asset Manager',     icon:'🎬', x:180, y:520,  color:'#f59e0b' },
  { id:7,  name:'InVideo AI',        icon:'🎥', x:620, y:520,  color:'#f59e0b' },
  // Row 5 — QC Gate
  { id:8,  name:'QC Inspector',      icon:'🔬', x:400, y:640,  color:'#ef4444' },
  // Row 6
  { id:9,  name:'Calendar',          icon:'📅', x:180, y:760,  color:'#ec4899' },
  { id:10, name:'Upload Bot',        icon:'🚀', x:620, y:760,  color:'#ec4899' },
  // Row 7
  { id:11, name:'Analytics',         icon:'📊', x:180, y:880,  color:'#a78bfa' },
  { id:12, name:'Engagement',        icon:'💬', x:620, y:880,  color:'#a78bfa' },
  // Row 8
  { id:13, name:'Learning Agent',    icon:'🤖', x:400, y:1000, color:'#6366f1' },
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
  pending:   '#374151',
  running:   '#6366f1',
  retrying:  '#f59e0b',
  completed: '#10b981',
  failed:    '#ef4444',
  blocked:   '#f97316',
}

function getNodeStatus(job, nodeId) {
  if (!job?.steps) return 'pending'
  return job.steps[nodeId]?.status || 'pending'
}

export default function WorkflowCanvas() {
  const { job, loading } = useLatestJob(1500)
  const svgRef   = useRef(null)
  const [tick, setTick] = useState(0)
  const [pan, setPan]   = useState({ x: 0, y: 0, scale: 0.75 })
  const [dragging, setDragging] = useState(null)

  // Animate data-flow particles
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60)
    return () => clearInterval(t)
  }, [])

  // Pan/Zoom
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setPan(p => ({ ...p, scale: Math.max(0.3, Math.min(1.5, p.scale * delta)) }))
  }
  const handleMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect') {
      setDragging({ startX: e.clientX - pan.x, startY: e.clientY - pan.y })
    }
  }
  const handleMouseMove = (e) => {
    if (!dragging) return
    setPan(p => ({ ...p, x: e.clientX - dragging.startX, y: e.clientY - dragging.startY }))
  }
  const handleMouseUp = () => setDragging(null)

  const NODE_W = 140
  const NODE_H = 64

  // Compute edge paths
  const edgePaths = EDGES.map(([from, to]) => {
    const a = NODES[from]
    const b = NODES[to]
    const ax = a.x + NODE_W / 2
    const ay = a.y + NODE_H
    const bx = b.x + NODE_W / 2
    const by = b.y
    const cy = (ay + by) / 2
    return { from, to, ax, ay, bx, by, cy,
      d: `M ${ax} ${ay} C ${ax} ${cy}, ${bx} ${cy}, ${bx} ${by}` }
  })

  const runningSteps = job?.steps?.filter(s => s.status === 'running').map((s,i) => i) || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <h1 className="text-base font-bold text-white">⛓️ Workflow Canvas</h1>
          <p className="text-xs text-muted mt-0.5">Live-Pipeline · {NODES.length} Agents · Scroll zum Zoomen</p>
        </div>
        <div className="flex items-center gap-3">
          {job && (
            <div className="text-right">
              <div className="text-xs text-white font-medium">{job.topic || 'Kein Topic'}</div>
              <div className={`text-xs mt-0.5 ${
                job.status==='running'?'text-indigo-400':
                job.status==='completed'?'text-green-400':
                job.status==='failed'?'text-red-400':'text-muted'
              }`}>
                {job.status==='running'?'⚡ Läuft...':
                 job.status==='completed'?'✅ Fertig':
                 job.status==='failed'?'❌ Fehler':'⏳ Wartend'}
              </div>
            </div>
          )}
          <button onClick={() => setPan({x:0,y:0,scale:0.75})}
            className="text-xs text-muted hover:text-white px-2 py-1 bg-surface rounded">Reset</button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-hidden relative bg-background cursor-grab active:cursor-grabbing"
        style={{background:'#0a0a14'}}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid dots background */}
        <svg className="absolute inset-0 w-full h-full" style={{opacity:0.15}}>
          <defs>
            <pattern id="grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#6366f1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>

        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          style={{overflow:'visible'}}
        >
          <g transform={`translate(${pan.x + 80},${pan.y + 30}) scale(${pan.scale})`}>

            {/* Glow definitions */}
            <defs>
              {NODES.map(n => (
                <filter key={n.id} id={`glow${n.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              ))}
              <filter id="glowEdge" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Edges */}
            {edgePaths.map(({ from, to, d, ax, ay, bx, by }, i) => {
              const fromStatus = getNodeStatus(job, from)
              const toStatus   = getNodeStatus(job, to)
              const isActive   = fromStatus === 'completed' || fromStatus === 'running'
              const color      = isActive ? '#6366f1' : '#1e1e3a'
              const opacity    = isActive ? 0.8 : 0.3

              // Particle position along cubic bezier
              const t = ((tick * 0.012) % 1)
              const tt = 1 - t
              const px = tt*tt*tt*ax + 3*tt*tt*t*ax + 3*tt*t*t*bx + t*t*t*bx
              const cy = (ay + by) / 2
              const py = tt*tt*tt*ay + 3*tt*tt*t*cy + 3*tt*t*t*cy + t*t*t*by

              return (
                <g key={i}>
                  {/* Base edge */}
                  <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity={opacity}/>
                  {/* Glow edge when active */}
                  {isActive && <path d={d} fill="none" stroke={color} strokeWidth="3" opacity="0.2" filter="url(#glowEdge)"/>}
                  {/* Moving particle */}
                  {isActive && fromStatus === 'running' && (
                    <circle cx={px} cy={py} r="4" fill={color} opacity="0.9" filter="url(#glowEdge)"/>
                  )}
                  {isActive && fromStatus === 'completed' && (
                    <circle cx={px} cy={py} r="3" fill="#10b981" opacity="0.7"/>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {NODES.map((node) => {
              const status = getNodeStatus(job, node.id)
              const sColor = STATUS_COLOR[status] || '#374151'
              const isRunning   = status === 'running'
              const isCompleted = status === 'completed'
              const isFailed    = status === 'failed'
              const isBlocked   = status === 'blocked'
              const ms = job?.steps?.[node.id]?.durationMs

              const borderColor = isRunning ? node.color :
                                  isCompleted ? '#10b981' :
                                  isFailed ? '#ef4444' :
                                  isBlocked ? '#f97316' : '#1e1e3a'

              return (
                <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                  {/* Outer glow ring when running */}
                  {isRunning && (
                    <rect x="-6" y="-6" width={NODE_W+12} height={NODE_H+12}
                      rx="18" fill="none" stroke={node.color}
                      strokeWidth="1" opacity={0.3 + 0.3 * Math.sin(tick * 0.08)}
                      filter={`url(#glow${node.id})`}/>
                  )}
                  {/* Card background */}
                  <rect x="0" y="0" width={NODE_W} height={NODE_H}
                    rx="12" fill="#0f0f1a" stroke={borderColor} strokeWidth={isRunning||isCompleted?1.5:1}
                    opacity={status==='pending'?0.5:1}/>
                  {/* Subtle top gradient bar */}
                  <rect x="0" y="0" width={NODE_W} height="3" rx="12" fill={borderColor} opacity="0.6"/>

                  {/* Icon */}
                  <text x="14" y="40" fontSize="20" dominantBaseline="middle">{node.icon}</text>

                  {/* Name */}
                  <text x="44" y="26" fontSize="11" fontWeight="600" fill="white" dominantBaseline="middle">
                    {node.name}
                  </text>

                  {/* Status line */}
                  <text x="44" y="46" fontSize="9" fill={sColor} dominantBaseline="middle">
                    {isRunning ? '⚡ Läuft...' :
                     isCompleted ? (ms ? '✓ ' + ms + 'ms' : '✓ OK') :
                     isFailed ? '✗ Fehler' :
                     isBlocked ? '⊘ Blockiert' :
                     '◦ Wartet'}
                  </text>

                  {/* Step number badge */}
                  <circle cx={NODE_W - 12} cy="12" r="9" fill="#0f0f1a" stroke={borderColor} strokeWidth="1"/>
                  <text x={NODE_W - 12} y="12" fontSize="8" fill={borderColor} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
                    {node.id + 1}
                  </text>
                </g>
              )
            })}

            {/* QC Gate label */}
            <g transform="translate(330, 630)">
              <rect x="0" y="0" width="68" height="18" rx="9" fill="#ef444420" stroke="#ef444440" strokeWidth="1"/>
              <text x="34" y="9" fontSize="8" fill="#ef4444" textAnchor="middle" dominantBaseline="middle" fontWeight="600">QC GATE</text>
            </g>
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur rounded-xl p-3 border border-white/10">
          <div className="text-xs text-muted mb-2 font-medium">STATUS</div>
          {[
            { color:'#374151', label:'Wartend' },
            { color:'#6366f1', label:'Läuft' },
            { color:'#f59e0b', label:'Retry' },
            { color:'#10b981', label:'Fertig' },
            { color:'#ef4444', label:'Fehler' },
            { color:'#f97316', label:'Blockiert' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:color}}/>
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>

        {/* Job info overlay */}
        {job && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur rounded-xl p-3 border border-white/10 max-w-[200px]">
            <div className="text-xs text-muted mb-1">AKTIVER JOB</div>
            <div className="text-xs text-white font-medium truncate">{job.topic || 'Unbekannt'}</div>
            <div className="text-xs text-muted mt-1">
              {job.steps?.filter(s=>s.status==='completed').length || 0}/14 Steps
            </div>
            {job.qcScore !== undefined && (
              <div className="text-xs mt-1" style={{color: job.qcPassed?'#10b981':'#ef4444'}}>
                QC: {job.qcScore}/100
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
