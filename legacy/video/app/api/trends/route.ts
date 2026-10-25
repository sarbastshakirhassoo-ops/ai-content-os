import { NextResponse } from 'next/server'
import { TrendAgent } from '@/agents/trend-agent'
import type { AgentInput } from '@/agents/base'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const agent = new TrendAgent()
    const result = await agent.run({} as AgentInput)
  
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[GET] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
