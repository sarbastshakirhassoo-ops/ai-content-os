'use client'
// ─────────────────────────────────────────────────────────────────────────────
// Visual Brain — einfache Ansicht (Roadmap-Schritt 4b)
//
// Die Knoten spiegeln ausschliesslich den echten Trace. Es gibt keine
// Animation, die läuft, weil es gut aussieht: ein Knoten leuchtet nur, wenn
// der zugehörige Schritt wirklich passiert ist.
//
//        USER
//          │
//    CENTRAL BRAIN
//     ┌────┼────┐
//    LLM INTERNET MEMORY
//     └────┼────┘
//        ANSWER
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { ReactFlow, Background, Position, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { TraceStep } from '@/brain/types'

/**
 * Zustand eines Knotens. `not_implemented` ist bewusst ein eigener Wert und
 * nicht einfach `idle`: der Unterschied zwischen "war diesmal nicht nötig"
 * und "gibt es noch gar nicht" ist für den Nutzer wesentlich.
 */
type NodeState = 'idle' | 'running' | 'done' | 'failed' | 'skipped' | 'not_implemented'

const STATE_COLOR: Record<NodeState, { border: string; bg: string; text: string }> = {
  idle:            { border: '#2a2a35', bg: '#16161f', text: '#6b7280' },
  running:         { border: '#6366f1', bg: '#1e1b4b', text: '#c7d2fe' },
  done:            { border: '#10b981', bg: '#064e3b', text: '#a7f3d0' },
  failed:          { border: '#ef4444', bg: '#450a0a', text: '#fecaca' },
  skipped:         { border: '#f59e0b', bg: '#451a03', text: '#fde68a' },
  not_implemented: { border: '#2a2a35', bg: '#111118', text: '#4b5563' },
}

const STATE_LABEL: Record<NodeState, string> = {
  idle: 'bereit',
  running: 'arbeitet',
  done: 'fertig',
  failed: 'fehlgeschlagen',
  skipped: 'übersprungen',
  not_implemented: 'nicht gebaut',
}

export interface BrainFlowProps {
  steps: TraceStep[]
  /** Läuft gerade eine Anfrage? */
  busy: boolean
  /** Ist bereits eine Antwort eingetroffen? */
  hasAnswer: boolean
  /** Anzahl tatsächlich verwendeter Quellen. */
  sourceCount: number
  /** Anzahl Treffer aus dem Gedächtnis. */
  memoryHitCount: number
}

/** Gesamtdauer der Schritte, die dieser Knoten repräsentiert. */
function durationOf(steps: TraceStep[], names: TraceStep['name'][]): string {
  const ms = steps
    .filter((s) => names.includes(s.name) && s.durationMs !== null)
    .reduce((a, s) => a + (s.durationMs ?? 0), 0)
  return ms > 0 ? `${(ms / 1000).toFixed(1)}s` : ''
}

/** Ausgabe-Tokens der Schritte, die dieser Knoten repräsentiert. */
function tokensOf(steps: TraceStep[], names: TraceStep['name'][]): string {
  const n = steps
    .filter((s) => names.includes(s.name))
    .reduce((a, s) => a + (s.outputTokens ?? 0), 0)
  return n > 0 ? `${n} Tokens` : ''
}

function stateOf(steps: TraceStep[], name: TraceStep['name']): NodeState {
  const step = steps.find((s) => s.name === name)
  if (!step) return 'idle'
  if (step.status === 'running') return 'running'
  if (step.status === 'completed') return 'done'
  if (step.status === 'failed') return 'failed'
  return 'skipped'
}

export default function BrainFlow({ steps, busy, hasAnswer, sourceCount, memoryHitCount }: BrainFlowProps) {
  const { nodes, edges } = useMemo(() => {
    // LLM arbeitet in zwei Schritten: Bedarfsanalyse und Synthese.
    const planState = stateOf(steps, 'plan')
    const synthState = stateOf(steps, 'synthesis')
    const llmState: NodeState =
      planState === 'running' || synthState === 'running' ? 'running'
      : planState === 'failed' || synthState === 'failed' ? 'failed'
      : synthState === 'done' || planState === 'done' ? 'done'
      : 'idle'

    const researchState = stateOf(steps, 'research')
    const memoryState = stateOf(steps, 'memory')

    const userState: NodeState = steps.length > 0 || busy ? 'done' : 'idle'
    const brainState: NodeState =
      busy ? 'running'
      : steps.some((s) => s.status === 'failed') ? 'failed'
      : hasAnswer ? 'done'
      : 'idle'
    const answerState: NodeState =
      hasAnswer ? 'done'
      : steps.some((s) => s.name === 'synthesis' && s.status === 'failed') ? 'failed'
      : busy ? 'running'
      : 'idle'

    const mk = (
      id: string, label: string, sub: string, state: NodeState,
      x: number, y: number, foot = '',
    ): Node => {
      const c = STATE_COLOR[state]
      return {
        id,
        position: { x, y },
        data: {
          label: (
            <div style={{ lineHeight: 1.35 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: c.text }}>{label}</div>
              <div style={{ fontSize: 10, opacity: 0.8, color: c.text }}>{sub}</div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: 0.65, color: c.text }}>
                {STATE_LABEL[state]}{foot ? ` · ${foot}` : ''}
              </div>
            </div>
          ),
        },
        style: {
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          padding: '8px 10px',
          width: 160,
          color: c.text,
          // Nur ein echt laufender Schritt bekommt Leuchten.
          boxShadow: state === 'running' ? `0 0 0 3px ${c.border}33` : 'none',
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      }
    }

    const researchSub =
      researchState === 'done' ? `${sourceCount} Quellen verwendet`
      : researchState === 'failed' ? 'keine Quellen gefunden'
      : researchState === 'running' ? 'ruft Quellen ab'
      : 'nicht nötig'

    const nodes: Node[] = [
      mk('user', 'USER', 'Frage', userState, 190, 0),
      mk('brain', 'CENTRAL BRAIN', 'Orchestrator', brainState, 190, 100,
         `${steps.length} ${steps.length === 1 ? 'Schritt' : 'Schritte'}`),
      mk('llm', 'LLM', 'Analyse + Synthese', llmState, 0, 210,
         [durationOf(steps, ['plan', 'synthesis']), tokensOf(steps, ['plan', 'synthesis'])].filter(Boolean).join(' · ')),
      mk('internet', 'INTERNET', researchSub, researchState, 190, 210, durationOf(steps, ['research'])),
      mk('memory', 'MEMORY', memoryHitCount > 0 ? `${memoryHitCount} Treffer` : 'kein Treffer', memoryState, 380, 210),
      mk('answer', 'ANSWER', hasAnswer ? 'mit Belegen' : 'noch nichts', answerState, 190, 320),
    ]

    const line = (state: NodeState) => ({
      stroke: STATE_COLOR[state].border,
      strokeWidth: state === 'idle' || state === 'not_implemented' ? 1 : 1.8,
    })

    const edges: Edge[] = [
      { id: 'u-b', source: 'user', target: 'brain', style: line(brainState), animated: brainState === 'running' },
      { id: 'b-l', source: 'brain', target: 'llm', style: line(llmState), animated: llmState === 'running' },
      { id: 'b-i', source: 'brain', target: 'internet', style: line(researchState), animated: researchState === 'running' },
      { id: 'b-m', source: 'brain', target: 'memory', style: line(memoryState) },
      { id: 'l-a', source: 'llm', target: 'answer', style: line(answerState) },
      { id: 'i-a', source: 'internet', target: 'answer', style: line(researchState) },
      { id: 'm-a', source: 'memory', target: 'answer', style: line(memoryState) },
    ]

    return { nodes, edges }
  }, [steps, busy, hasAnswer, sourceCount, memoryHitCount])

  return (
    <div style={{ height: 440 }} className="bg-surface rounded-lg border border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a2a35" gap={18} size={1} />
      </ReactFlow>
    </div>
  )
}
