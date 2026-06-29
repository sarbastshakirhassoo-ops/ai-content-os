import { NextRequest, NextResponse } from 'next/server'
import { ScriptAgent } from '@/agents/script-agent'
import type { CompetitorContext } from '@/agents/script-agent'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { topic, hook, niche, platform, competitorContext } = body

  const finalTopic = topic || 'Luxury Lifestyle Mindset'

  const agent = new ScriptAgent()
  const result = await agent.run({
    topic: finalTopic,
    hook,
    niche: niche || 'Luxury Lifestyle + Nostalgie + Motivation',
    platform: platform || 'TikTok / YouTube Shorts',
    competitorContext: competitorContext as CompetitorContext | undefined,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result.data)
}
