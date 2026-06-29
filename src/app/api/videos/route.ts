import { NextResponse } from 'next/server'
import { DEMO_VIDEOS } from '@/lib/demo-data'

export async function GET() {
  return NextResponse.json({ videos: DEMO_VIDEOS })
}
