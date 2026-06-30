import { NextRequest, NextResponse } from 'next/server'
import { KnowledgeAgent } from '@/agents/knowledge-agent'
import type { AgentInput } from '@/agents/base'

// GET /api/knowledge?topic=...&niche=...  → query the knowledge base
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const topic = searchParams.get('topic') || ''
    const niche = searchParams.get('niche') || 'Allgemein'
  
    const agent = new KnowledgeAgent()
    const input: AgentInput = { topic, niche, mode: 'query' }
    const result = await agent.run(input)
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[GET] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/knowledge  → store a new entry or query with more context
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AgentInput
    const agent = new KnowledgeAgent()
    const result = await agent.run(body)
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[POST] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
