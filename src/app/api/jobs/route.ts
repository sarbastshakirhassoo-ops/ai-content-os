import { NextRequest, NextResponse } from 'next/server'
import { getRecentJobs, getJobStats, createJob } from '@/lib/job-store'
import { NICHE } from '@/lib/niche-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const jobs  = getRecentJobs(50)
  const stats = getJobStats()
  return NextResponse.json({ jobs, stats })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const job  = createJob({
    niche:       (body.niche as string) || NICHE,
    topic:       (body.topic as string) || '',
    triggeredBy: 'manual',
  })
  return NextResponse.json({ job })
}
