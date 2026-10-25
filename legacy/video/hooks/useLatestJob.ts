'use client'
import { useState, useEffect, useCallback } from 'react'

export type JobStep = {
  name: string
  status: 'pending'|'running'|'completed'|'failed'|'blocked'|'retrying'
  output?: Record<string, unknown>
  error?: string
  durationMs?: number
}

export type Job = {
  id: string
  niche: string
  topic: string
  status: 'queued'|'running'|'completed'|'failed'
  steps: JobStep[]
  qcScore?: number
  qcPassed?: boolean
  createdAt: string
  completedAt?: string
}

export function useLatestJob(pollMs = 3000) {
  const [job, setJob]         = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs')
      if (!res.ok) return
      const { jobs } = await res.json() as { jobs: Job[] }
      if (jobs?.length) setJob(jobs[0])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchJob()
    const t = setInterval(fetchJob, pollMs)
    return () => clearInterval(t)
  }, [fetchJob, pollMs])

  const getStep = (index: number): JobStep | null => job?.steps?.[index] ?? null
  const getStepOutput = (index: number): Record<string, unknown> => getStep(index)?.output ?? {}

  return { job, loading, getStep, getStepOutput }
}
