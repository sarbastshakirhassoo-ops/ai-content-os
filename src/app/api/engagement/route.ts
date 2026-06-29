import { NextRequest, NextResponse } from 'next/server'
import { EngagementAgent } from '@/agents/engagement-agent'
import type { AgentInput } from '@/agents/base'

// GET /api/engagement  → run engagement analysis with demo data
export async function GET() {
  const agent = new EngagementAgent()
  const result = await agent.run({})
  return NextResponse.json(result.data)
}

// POST /api/engagement  → run with real comments + analytics data
export async function POST(req: NextRequest) {
  const body = await req.json() as AgentInput
  const agent = new EngagementAgent()
  const result = await agent.run(body)
  return NextResponse.json(result.data)
}
