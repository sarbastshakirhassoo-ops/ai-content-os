'use client'

import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AGENT_DEFINITIONS } from '@/lib/demo-data'
import type { AgentDef } from '@/types'

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  idle:    '#475569',
  running: '#6366f1',
  success: '#10b981',
  error:   '#ef4444',
  waiting: '#f59e0b',
}

const STATUS_BG: Record<string, string> = {
  idle:    '#47556915',
  running: '#6366f118',
  success: '#10b98118',
  error:   '#ef444418',
  waiting: '#f59e0b18',
}

const STATUS_LABEL: Record<string, string> = {
  idle:    'Bereit',
  running: 'Aktiv',
  success: 'Fertig',
  error:   'Fehler',
  waiting: 'Wartet',
}

// ── n8n-style Agent Node ───────────────────────────────────────────────────────

function AgentNode({ data, selected }: NodeProps) {
  const agent = data as unknown as AgentDef
  const sc    = STATUS_COLOR[agent.status] ?? '#475569'

  return (
    <div className="relative" style={{ width: 210 }}>
      {/* LEFT handle — data input */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 12, height: 12,
          border: `2px solid ${sc}`,
          backgroundColor: '#0d0d14',
          borderRadius: '50%',
          left: -6,
        }}
      />

      {/* Card */}
      <div
        className="rounded-xl overflow-hidden transition-all duration-200"
        style={{
          border:     `1.5px solid ${selected ? sc : sc + '55'}`,
          background: '#16161f',
          boxShadow:  selected
            ? `0 0 0 1px ${sc}55, 0 0 24px ${sc}35, 0 4px 20px #00000060`
            : `0 0 10px ${sc}18, 0 2px 8px #00000040`,
        }}
      >
        {/* Accent top bar */}
        <div style={{ height: 3, background: agent.color }} />

        {/* Body */}
        <div className="px-3.5 py-3 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: agent.color + '22' }}
          >
            {agent.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white leading-tight">{agent.name}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate" style={{ maxWidth: 130 }}>
              {agent.slug}
            </div>
          </div>
        </div>

        {/* Status footer */}
        <div
          className="px-3.5 py-1.5 flex items-center gap-2 border-t border-white/5"
          style={{ background: STATUS_BG[agent.status] }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${agent.status === 'running' ? 'animate-pulse' : ''}`}
            style={{ background: sc }}
          />
          <span className="text-[10px] font-semibold" style={{ color: sc }}>
            {STATUS_LABEL[agent.status]}
          </span>
          {agent.lastRunMs && (
            <span className="text-[10px] text-slate-600 ml-auto">
              {(agent.lastRunMs / 1000).toFixed(1)}s
            </span>
          )}
          {agent.errorCount > 0 && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-px rounded ml-auto">
              {agent.errorCount} err
            </span>
          )}
        </div>
      </div>

      {/* RIGHT handle — data output */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 12, height: 12,
          border: `2px solid ${sc}`,
          backgroundColor: '#0d0d14',
          borderRadius: '50%',
          right: -6,
        }}
      />
    </div>
  )
}

// ── Section label node ─────────────────────────────────────────────────────────

function SectionLabelNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; icon: string }
  return (
    <div className="pointer-events-none select-none" style={{ width: 740 }}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="text-base">{d.icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{d.label}</span>
        <div className="flex-1 h-px bg-slate-700/50 ml-1" />
      </div>
    </div>
  )
}

const nodeTypes = {
  agentNode:    AgentNode,
  sectionLabel: SectionLabelNode,
}

// ── Layout constants ───────────────────────────────────────────────────────────

const COL_GAP  = 260   // horizontal gap between nodes
const ROW_GAP  = 200   // vertical gap between rows
const START_X  = 80
const START_Y  = 90
const LABEL_Y_OFFSET = -38  // label sits above the row

const SECTIONS = [
  { label: 'RECHERCHE & INTEL',    icon: '🔍', row: 0 },
  { label: 'CONTENT CREATION',     icon: '✍️', row: 1 },
  { label: 'PRODUKTION',           icon: '🎬', row: 2 },
  { label: 'PUBLISHING',           icon: '🚀', row: 3 },
  { label: 'LEARNING LOOP',        icon: '⚡', row: 4 },
]

function buildNodes(): Node[] {
  const nodes: Node[] = []

  // Section label nodes
  SECTIONS.forEach(s => {
    nodes.push({
      id:          `section-${s.row}`,
      type:        'sectionLabel',
      position:    { x: START_X, y: START_Y + s.row * ROW_GAP + LABEL_Y_OFFSET },
      data:        { label: s.label, icon: s.icon } as unknown as Record<string, unknown>,
      selectable:  false,
      draggable:   false,
      connectable: false,
    })
  })

  // Agent nodes — 3 per row
  AGENT_DEFINITIONS.forEach((agent, idx) => {
    const row = Math.floor(idx / 3)
    const col = idx % 3
    nodes.push({
      id:       agent.id,
      type:     'agentNode',
      position: { x: START_X + col * COL_GAP, y: START_Y + row * ROW_GAP },
      data:     agent as unknown as Record<string, unknown>,
    })
  })

  return nodes
}

function buildEdges(): Edge[] {
  return AGENT_DEFINITIONS.slice(0, -1).map((agent, idx) => {
    const next      = AGENT_DEFINITIONS[idx + 1]
    const sc        = STATUS_COLOR[agent.status] ?? '#475569'
    const isCrossRow = (idx + 1) % 3 === 0   // edge that crosses to next row
    const isActive  = agent.status === 'running' || next.status === 'running'

    return {
      id:        `e${idx}`,
      source:    agent.id,
      target:    next.id,
      type:      isCrossRow ? 'smoothstep' : 'smoothstep',
      animated:  isActive,
      style: {
        stroke:      isActive ? sc : sc + '80',
        strokeWidth: isActive ? 2.5 : 1.5,
        strokeDasharray: agent.status === 'waiting' ? '5,4' : undefined,
      },
      markerEnd: {
        type:  MarkerType.ArrowClosed,
        color: isActive ? sc : sc + '80',
        width: 14,
        height: 14,
      },
      label: isCrossRow
        ? (idx === 2 ? 'Script →' : idx === 5 ? 'Assets →' : idx === 8 ? 'Kalender →' : idx === 11 ? 'Analytics →' : undefined)
        : undefined,
      labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 600 },
      labelBgStyle: { fill: '#16161f', fillOpacity: 0.9 },
      labelBgPadding: [4, 3],
      labelBgBorderRadius: 4,
    }
  })
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes())
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges())
  const [selected, setSelected]         = useState<AgentDef | null>(null)
  const [running, setRunning]           = useState(false)
  const [runLog, setRunLog]             = useState<string[]>([])

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === 'sectionLabel') return
    setSelected(node.data as unknown as AgentDef)
  }, [])

  const onPaneClick = useCallback(() => setSelected(null), [])

  const runWorkflow = async () => {
    setRunning(true)
    setRunLog([])
    try {
      const res  = await fetch('/api/workflow/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ topic: 'AI replacing jobs' }),
      })
      const data = await res.json() as { log?: string[] }
      setRunLog(data.log ?? [])
    } catch {
      setRunLog(['Fehler beim Ausführen des Workflows'])
    }
    setRunning(false)
  }

  const reset = () => {
    setNodes(buildNodes())
    setEdges(buildEdges())
    setRunLog([])
    setSelected(null)
  }

  // pipeline index for the selected agent
  const selectedIdx = selected
    ? AGENT_DEFINITIONS.findIndex(a => a.id === selected.id)
    : -1
  const prevAgent = selectedIdx > 0 ? AGENT_DEFINITIONS[selectedIdx - 1] : null
  const nextAgent = selectedIdx >= 0 && selectedIdx < AGENT_DEFINITIONS.length - 1
    ? AGENT_DEFINITIONS[selectedIdx + 1]
    : null

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1e1e2e] bg-[#0d0d14] flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-white">Workflow Canvas</h1>
          <p className="text-xs text-slate-500">14-Agenten Pipeline — klicke auf einen Agent für Details</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-3 mr-4">
            {Object.entries(STATUS_COLOR).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="text-[10px] text-slate-500 capitalize">{STATUS_LABEL[s]}</span>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs border border-[#1e1e2e] text-slate-400 hover:text-white hover:border-indigo-500/40 rounded-lg transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => void runWorkflow()}
            disabled={running}
            className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {running
              ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Läuft…</>
              : '▶ Workflow starten'
            }
          </button>
        </div>
      </div>

      {/* ── Canvas + Panel ── */}
      <div className="flex flex-1 min-h-0">

        {/* ReactFlow canvas */}
        <div className="flex-1 bg-[#0a0a10]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            {/* Dot grid background — like n8n */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.2}
              color="#1e1e2e"
            />
            <Controls
              style={{ bottom: 16, left: 16 }}
              className="[&>button]:!bg-[#16161f] [&>button]:!border-[#2a2a3e] [&>button]:!text-slate-400 [&>button:hover]:!bg-[#1e1e2e]"
            />
            <MiniMap
              nodeColor={(n) => {
                const a = n.data as unknown as AgentDef
                return a?.status ? STATUS_COLOR[a.status] : '#475569'
              }}
              nodeStrokeWidth={0}
              style={{
                backgroundColor: '#0d0d14',
                border: '1px solid #1e1e2e',
                borderRadius: 8,
                bottom: 16,
                right: 16,
              }}
            />
          </ReactFlow>
        </div>

        {/* ── Detail Panel ── */}
        <div
          className="border-l border-[#1e1e2e] bg-[#0d0d14] flex-shrink-0 overflow-y-auto transition-all duration-200"
          style={{ width: selected ? 288 : 0, opacity: selected ? 1 : 0 }}
        >
          {selected && (
            <div className="p-4 space-y-4">
              {/* Agent header */}
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: selected.color + '22' }}
                >
                  {selected.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">{selected.name}</h3>
                  <span
                    className="text-[10px] font-mono px-1.5 py-px rounded mt-0.5 inline-block"
                    style={{ background: STATUS_COLOR[selected.status] + '20', color: STATUS_COLOR[selected.status] }}
                  >
                    {STATUS_LABEL[selected.status]}
                    {selected.lastRunMs ? ` · ${(selected.lastRunMs / 1000).toFixed(1)}s` : ''}
                  </span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="ml-auto text-slate-600 hover:text-white text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{selected.description}</p>

              {/* Pipeline position */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Pipeline</p>

                {prevAgent && (
                  <div className="flex items-center gap-2 p-2 bg-[#16161f] rounded-lg border border-[#1e1e2e]">
                    <span className="text-sm">{prevAgent.icon}</span>
                    <div>
                      <p className="text-[10px] text-slate-600">Eingang von</p>
                      <p className="text-xs text-slate-300 font-medium">{prevAgent.name}</p>
                    </div>
                    <span className="ml-auto text-slate-600 text-xs">↑</span>
                  </div>
                )}

                <div
                  className="flex items-center gap-2 p-2 rounded-lg border"
                  style={{
                    background: STATUS_COLOR[selected.status] + '12',
                    borderColor: STATUS_COLOR[selected.status] + '40',
                  }}
                >
                  <span className="text-sm">{selected.icon}</span>
                  <p className="text-xs font-bold text-white">{selected.name}</p>
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-px rounded"
                    style={{ background: STATUS_COLOR[selected.status] + '25', color: STATUS_COLOR[selected.status] }}>
                    #{selectedIdx + 1}
                  </span>
                </div>

                {nextAgent && (
                  <div className="flex items-center gap-2 p-2 bg-[#16161f] rounded-lg border border-[#1e1e2e]">
                    <span className="text-sm">{nextAgent.icon}</span>
                    <div>
                      <p className="text-[10px] text-slate-600">Ausgang zu</p>
                      <p className="text-xs text-slate-300 font-medium">{nextAgent.name}</p>
                    </div>
                    <span className="ml-auto text-slate-600 text-xs">↓</span>
                  </div>
                )}
              </div>

              {/* Input / Output */}
              <div className="space-y-2">
                <div className="bg-[#16161f] border border-[#1e1e2e] rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Input</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{selected.input}</p>
                </div>
                <div className="bg-[#16161f] border border-[#1e1e2e] rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Output</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{selected.output}</p>
                </div>
              </div>

              {/* Error */}
              {selected.errorCount > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-red-400 mb-1">{selected.errorCount} Fehler registriert</p>
                  {selected.lastError && <p className="text-xs text-red-300/70">{selected.lastError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Run Log ── */}
      {runLog.length > 0 && (
        <div className="border-t border-[#1e1e2e] bg-[#0d0d14] px-6 py-3 flex-shrink-0 max-h-36 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Run Log</p>
          <div className="space-y-0.5">
            {runLog.map((line, i) => (
              <p key={i} className="text-xs text-slate-400 font-mono">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
