import { NextRequest, NextResponse } from 'next/server'
import { EngagementAgent } from '@/agents/engagement-agent'
import type { AgentInput } from '@/agents/base'

// GET /api/engagement  → run engagement analysis with demo data
export async function GET() {
  try {
    const agent = new EngagementAgent()
    const result = await agent.run({})
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[GET] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/engagement  → run with real comments + analytics data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AgentInput
    const agent = new EngagementAgent()
    const result = await agent.run(body)
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[POST] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
