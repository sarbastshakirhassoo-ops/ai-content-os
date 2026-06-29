import { NextRequest, NextResponse } from 'next/server'
import { analyzeCompetitor } from '@/agents/competitor-agent'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { url, platform } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL fehlt' }, { status: 400 })

  // Debug: API Key vorhanden?
  const hasKey = !!process.env.RAPIDAPI_KEY
  console.log('[Competitor] RAPIDAPI_KEY vorhanden:', hasKey, '| Key Anfang:', process.env.RAPIDAPI_KEY?.slice(0, 8))

  try {
    const report = await analyzeCompetitor(url, platform || 'auto')
    return NextResponse.json({ success: true, report, debug: { hasKey } })
  } catch (err: unknown) {
    const e = err as Error
    console.error('[Competitor] Fehler:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
