import { NextResponse } from 'next/server'
import { TrendAgent } from '@/agents/trend-agent'
import type { AgentInput } from '@/agents/base'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agent = new TrendAgent()
  const result = await agent.run({} as AgentInput)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result.data)
}
