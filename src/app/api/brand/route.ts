import { NextRequest, NextResponse } from 'next/server'
import { BrandAgent } from '@/agents/brand-agent'
import type { AgentInput } from '@/agents/base'

// POST /api/brand  → check brand consistency for script + SEO output
export async function POST(req: NextRequest) {
  const body = await req.json() as AgentInput
  const agent = new BrandAgent()
  const result = await agent.run(body)
  return NextResponse.json(result.data)
}
