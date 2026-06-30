import { NextRequest, NextResponse } from 'next/server'
import { BrandAgent } from '@/agents/brand-agent'
import type { AgentInput } from '@/agents/base'

// POST /api/brand  → check brand consistency for script + SEO output
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AgentInput
    const agent = new BrandAgent()
    const result = await agent.run(body)
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[POST] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
