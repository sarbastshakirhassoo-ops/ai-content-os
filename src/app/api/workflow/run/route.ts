import { NextRequest, NextResponse } from 'next/server'
import { TrendAgent } from '@/agents/trend-agent'
import { TopicAgent } from '@/agents/topic-agent'
import { ScriptAgent } from '@/agents/script-agent'
import { PromptAgent } from '@/agents/prompt-agent'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const topic = body.topic || 'AI trends'

  const log: string[] = []
  const results: Record<string, unknown> = {}

  const agents = [
    new TrendAgent(),
    new TopicAgent(),
    new ScriptAgent(),
    new PromptAgent(),
  ]

  for (const agent of agents) {
    log.push(`[${agent.name}] Starting…`)
    try {
      const output = await agent.run({ topic })
      results[agent.slug] = output
      log.push(`[${agent.name}] ✅ Done in ${output.durationMs}ms`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log.push(`[${agent.name}] ❌ Error: ${msg}`)
    }
  }

  return NextResponse.json({ ok: true, log, results })
}
