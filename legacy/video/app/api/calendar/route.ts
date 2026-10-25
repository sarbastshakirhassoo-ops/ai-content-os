import { NextRequest, NextResponse } from 'next/server'
import { CalendarAgent } from '@/agents/calendar-agent'
import type { AgentInput } from '@/agents/base'

// GET /api/calendar  → get upcoming 4-week calendar (generic)
export async function GET() {
  try {
    const agent = new CalendarAgent()
    const result = await agent.run({ title: 'Nächstes Video', niche: 'Allgemein' })
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[GET] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/calendar  → create publication plan for specific content
// Body: { title, niche, contentId, platforms[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AgentInput
    const agent = new CalendarAgent()
    const result = await agent.run(body)
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[POST] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
