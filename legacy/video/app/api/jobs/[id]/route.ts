import { NextRequest, NextResponse } from 'next/server'
import { getJob, updateJob, loadJobs, saveJobs } from '@/lib/job-store'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const job = getJob(params.id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({ job })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const job  = updateJob(params.id, body)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({ job })
}

// Retry: setzt fehlgeschlagene Steps zurück und triggert Neustart
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body   = await req.json().catch(() => ({}))
  const action = body.action as string

  if (action === 'retry') {
    const jobs = loadJobs()
    const idx  = jobs.findIndex(j => j.id === params.id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Nur fehlgeschlagene Steps zurücksetzen
    jobs[idx].steps = jobs[idx].steps.map(s =>
      s.status === 'failed' ? { ...s, status: 'pending' as const, error: undefined, retryCount: 0 } : s
    )
    jobs[idx].status     = 'queued'
    jobs[idx].error      = undefined
    jobs[idx].retryCount = (jobs[idx].retryCount || 0) + 1
    saveJobs(jobs)
    return NextResponse.json({ ok: true, job: jobs[idx] })
  }

  if (action === 'cancel') {
    const job = updateJob(params.id, { status: 'cancelled' })
    return NextResponse.json({ ok: true, job })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
