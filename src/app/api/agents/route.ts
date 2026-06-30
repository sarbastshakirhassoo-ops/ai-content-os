import { NextResponse } from 'next/server'
import { AGENT_DEFINITIONS } from '@/lib/demo-data'

export async function GET() {
  try {
    return NextResponse.json({ agents: AGENT_DEFINITIONS })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[GET] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
