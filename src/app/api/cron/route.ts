// ─────────────────────────────────────────────────────────────────────────────
// /api/cron — Geschützter Endpunkt für automatische Pipeline-Trigger
//
// Wird aufgerufen von:
//   - scripts/scheduler.js (lokal, Bearer Token)
//   - Railway Cron (HTTP GET, Bearer Token)
//   - Extern via curl:
//     curl -X POST http://localhost:3000/api/cron \
//       -H "Authorization: Bearer DEIN_CRON_SECRET" \
//       -H "Content-Type: application/json" \
//       -d '{"topic":"Disziplin Mindset"}'
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { NICHE }                     from '@/lib/niche-config'

export const dynamic     = 'force-dynamic'
export const maxDuration = 30

// Themen-Pool für automatische Rotation
const DEFAULT_TOPICS = [
  'Disziplin Mindset — Was erfolgreiche Menschen täglich tun',
  'Luxury Morning Routine — Die ersten 2 Stunden entscheiden',
  'Silent Discipline — Wenn niemand zusieht',
  'Nostalgie und Ehrgeiz — Was dich antreibt',
  'Das Geheimnis hinter Erfolg im Luxus-Lifestyle',
  'Ferrari Mindset — Wie die Reichsten denken',
  'Warum die meisten scheitern — und wie du es nicht tust',
  'Cinematic Erfolg — Das Leben das du aufbaust',
  'Luxury vs. Disziplin — Zwei Seiten derselben Münze',
  'Was 5:00 Uhr morgens mit deinem Leben macht',
]

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // Kein Secret → offen (nur lokal)

  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}` || auth === secret
}

function getNextTopic(): string {
  const pool = (process.env.SCHEDULER_TOPICS || DEFAULT_TOPICS.join(',')).split(',').map(t => t.trim())
  const seed = new Date().getDay() * 24 + new Date().getHours()
  return pool[seed % pool.length]
}

async function startPipeline(topic: string, niche: string, triggeredBy: string): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`

  try {
    const res  = await fetch(`${appUrl}/api/workflow/run`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ topic, niche, triggeredBy }),
    })
    const data = await res.json() as Record<string, unknown>
    return {
      ok:    Boolean(data.ok),
      jobId: data.jobId as string | undefined,
      error: data.error as string | undefined,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// POST /api/cron — Startet Pipeline, gibt jobId zurück
export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body        = await req.json().catch(() => ({}))
  const topic       = (body.topic as string) || getNextTopic()
  const niche       = (body.niche as string) || NICHE
  const triggeredBy = 'scheduled'

  const result = await startPipeline(topic, niche, triggeredBy)

  if (!result.ok || !result.jobId) {
    console.error('[cron] Pipeline-Fehler:', result.error)
    return NextResponse.json({ ok: false, error: result.error || 'Pipeline failed' }, { status: 500 })
  }

  console.log(`[cron] 🚀 Pipeline gestartet: "${topic}" — Job ID: ${result.jobId}`)

  return NextResponse.json({
    ok:          true,
    jobId:       result.jobId,
    message:     'Pipeline gestartet',
    topic,
    niche,
    triggeredBy,
    startedAt:   new Date().toISOString(),
    pollUrl:     `/api/jobs/${result.jobId}`,
  })
}

// GET /api/cron — Für Railway Cron
export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const topic  = getNextTopic()
  const niche  = NICHE
  const result = await startPipeline(topic, niche, 'scheduled')

  if (!result.ok || !result.jobId) {
    return NextResponse.json({ ok: false, error: result.error || 'Pipeline failed' }, { status: 500 })
  }

  console.log(`[cron] 🚀 Pipeline gestartet (GET): "${topic}" — Job ID: ${result.jobId}`)

  return NextResponse.json({
    ok:        true,
    jobId:     result.jobId,
    message:   'Pipeline gestartet',
    topic,
    startedAt: new Date().toISOString(),
    pollUrl:   `/api/jobs/${result.jobId}`,
  })
}
