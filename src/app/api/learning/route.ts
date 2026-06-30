import { NextRequest, NextResponse } from 'next/server'
import { LearningAgent } from '@/agents/learning-agent'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const agent = new LearningAgent()
    const result = await agent.run({ niche: 'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic' })
    return NextResponse.json(result.data || {})
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const agent = new LearningAgent()
    const result = await agent.run(body)
    return NextResponse.json(result.data || {})
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
