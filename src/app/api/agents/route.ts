import { NextResponse } from 'next/server'
import { AGENT_DEFINITIONS } from '@/lib/demo-data'

export async function GET() {
  return NextResponse.json({ agents: AGENT_DEFINITIONS })
}
