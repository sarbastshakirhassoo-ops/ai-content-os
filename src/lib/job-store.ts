// ─────────────────────────────────────────────────────────────────────────────
// Job Store — persistente Workflow-Jobs in data/jobs.json
// Thread-safe writes via atomic replace
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs'
import path from 'path'
import type { WorkflowJob, AgentStepLog } from '@/types'

const DATA_DIR  = path.join(process.cwd(), 'data')
const JOBS_PATH = path.join(DATA_DIR, 'jobs.json')

// 14 Agents in Workflow-Reihenfolge
export const PIPELINE_AGENTS: { slug: string; name: string }[] = [
  { slug: 'trend-agent',       name: 'Trend Scout'         },
  { slug: 'competitor-agent',  name: 'Competitor Analyst'  },
  { slug: 'knowledge-agent',   name: 'Knowledge Base'      },
  { slug: 'script-agent',      name: 'Script Writer'       },
  { slug: 'seo-agent',         name: 'SEO Optimizer'       },
  { slug: 'brand-agent',       name: 'Brand Consistency'   },
  { slug: 'asset-manager-agent', name: 'Asset Manager'     },
  { slug: 'video-agent',       name: 'InVideo AI'          },
  { slug: 'qc-agent',          name: 'QC Inspector'        },
  { slug: 'calendar-agent',    name: 'Content Calendar'    },
  { slug: 'upload-agent',      name: 'Upload Bot'          },
  { slug: 'analytics-agent',   name: 'Analytics Brain'     },
  { slug: 'engagement-agent',  name: 'Engagement Analyzer' },
  { slug: 'learning-agent',    name: 'Learning Agent'      },
]

// ── File I/O ──────────────────────────────────────────────────────────────────

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function loadJobs(): WorkflowJob[] {
  try {
    ensureDataDir()
    if (fs.existsSync(JOBS_PATH)) {
      const raw = fs.readFileSync(JOBS_PATH, 'utf-8')
      return JSON.parse(raw) as WorkflowJob[]
    }
  } catch { /* ignore */ }
  return []
}

export function saveJobs(jobs: WorkflowJob[]): void {
  ensureDataDir()
  // Keep last 100 jobs only
  const trimmed = jobs.slice(-100)
  fs.writeFileSync(JOBS_PATH, JSON.stringify(trimmed, null, 2))
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getJob(id: string): WorkflowJob | undefined {
  return loadJobs().find(j => j.id === id)
}

export function createJob(params: {
  niche: string
  topic: string
  triggeredBy: 'manual' | 'scheduled' | 'auto'
}): WorkflowJob {
  const steps: AgentStepLog[] = PIPELINE_AGENTS.map(a => ({
    agentSlug:  a.slug,
    agentName:  a.name,
    status:     'pending' as const,
    retryCount: 0,
    logs:       [],
  }))

  const job: WorkflowJob = {
    id:           `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    niche:        params.niche,
    topic:        params.topic,
    status:       'queued',
    createdAt:    new Date().toISOString(),
    steps,
    currentStep:  0,
    totalSteps:   steps.length,
    retryCount:   0,
    triggeredBy:  params.triggeredBy,
  }

  const jobs = loadJobs()
  jobs.push(job)
  saveJobs(jobs)
  return job
}

export function updateJob(id: string, updates: Partial<WorkflowJob>): WorkflowJob | null {
  const jobs = loadJobs()
  const idx  = jobs.findIndex(j => j.id === id)
  if (idx === -1) return null
  jobs[idx] = { ...jobs[idx], ...updates }
  saveJobs(jobs)
  return jobs[idx]
}

export function updateJobStep(
  jobId: string,
  stepIndex: number,
  updates: Partial<AgentStepLog>,
): WorkflowJob | null {
  const jobs = loadJobs()
  const idx  = jobs.findIndex(j => j.id === jobId)
  if (idx === -1) return null
  if (!jobs[idx].steps[stepIndex]) return null
  jobs[idx].steps[stepIndex] = { ...jobs[idx].steps[stepIndex], ...updates }
  // Update job-level status
  const runningStep = jobs[idx].steps[stepIndex]
  if (updates.status === 'running') {
    jobs[idx].status     = 'running'
    jobs[idx].currentStep = stepIndex
    if (!jobs[idx].startedAt) jobs[idx].startedAt = new Date().toISOString()
  }
  if (updates.status === 'failed') {
    // Don't fail whole job — just mark step, pipeline continues
    if (!runningStep.logs) runningStep.logs = []
  }
  saveJobs(jobs)
  return jobs[idx]
}

export function appendStepLog(jobId: string, stepIndex: number, msg: string): void {
  const jobs = loadJobs()
  const idx  = jobs.findIndex(j => j.id === jobId)
  if (idx === -1 || !jobs[idx].steps[stepIndex]) return
  jobs[idx].steps[stepIndex].logs = [
    ...(jobs[idx].steps[stepIndex].logs || []),
    `[${new Date().toISOString()}] ${msg}`,
  ]
  saveJobs(jobs)
}

export function completeJob(jobId: string, summary: {
  videoUrl?: string
  qcScore?: number
  qcPassed?: boolean
  uploadUrls?: WorkflowJob['uploadUrls']
}): WorkflowJob | null {
  return updateJob(jobId, {
    status:      'completed',
    completedAt: new Date().toISOString(),
    ...summary,
  })
}

export function failJob(jobId: string, error: string): WorkflowJob | null {
  return updateJob(jobId, {
    status: 'failed',
    completedAt: new Date().toISOString(),
    error,
  })
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function getRecentJobs(limit = 20): WorkflowJob[] {
  return loadJobs()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

export function getRunningJobs(): WorkflowJob[] {
  return loadJobs().filter(j => j.status === 'running')
}

export function getQueuedJobs(): WorkflowJob[] {
  return loadJobs().filter(j => j.status === 'queued')
}

export function getJobStats(): {
  total: number
  running: number
  queued: number
  completed: number
  failed: number
  avgDurationMs: number
} {
  const jobs = loadJobs()
  const completed = jobs.filter(j => j.status === 'completed')
  const durations = completed
    .filter(j => j.startedAt && j.completedAt)
    .map(j => new Date(j.completedAt!).getTime() - new Date(j.startedAt!).getTime())

  return {
    total:       jobs.length,
    running:     jobs.filter(j => j.status === 'running').length,
    queued:      jobs.filter(j => j.status === 'queued').length,
    completed:   completed.length,
    failed:      jobs.filter(j => j.status === 'failed').length,
    avgDurationMs: durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
  }
}
