import { NextRequest, NextResponse } from 'next/server'
import { KnowledgeAgent } from '@/agents/knowledge-agent'
import type { AgentInput } from '@/agents/base'

// GET /api/knowledge?topic=...&niche=...  → query the knowledge base
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const topic = searchParams.get('topic') || ''
  const niche = searchParams.get('niche') || 'Allgemein'

  const agent = new KnowledgeAgent()
  const input: AgentInput = { topic, niche, mode: 'query' }
  const result = await agent.run(input)
  return NextResponse.json(result.data)
}

// POST /api/knowledge  → store a new entry or query with more context
export async function POST(req: NextRequest) {
  const body = await req.json() as AgentInput
  const agent = new KnowledgeAgent()
  const result = await agent.run(body)
  return NextResponse.json(result.data)
}
