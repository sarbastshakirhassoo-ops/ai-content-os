// ─────────────────────────────────────────────────────────────────────────────
// /api/cron — Geschützter Endpunkt für automatische Pipeline-Trigger
//
// Wird aufgerufen von:
//   - scripts/scheduler.js (lokal, Bearer Token)
//   - Railway Cron (HTTP GET, Bearer Token)
//   - Vercel Cron (Authorization Header)
//   - Extern via curl:
//     curl -X POST http://localhost:3001/api/cron \
//       -H "Authorization: Bearer DEIN_CRON_SECRET" \
//       -H "Content-Type: application/json" \
//       -d '{"topic":"Disziplin Mindset"}'
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { NICHE }                     from '@/lib/niche-config'

export const dynamic     = 'force-dynamic'
export const maxDuration = 30 // Kurz — Pipeline läuft asynchron

// Themen-Pool für automatischen Rotation
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
  if (!secret) return true // Kein Secret gesetzt → offen (nur lokal)

  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}` || auth === secret
}

function getNextTopic(): string {
  const pool = (process.env.SCHEDULER_TOPICS || DEFAULT_TOPICS.join(',')).split(',').map(t => t.trim())
  // Simpele Rotation basierend auf Wochentag + Stunde
  const seed = new Date().getDay() * 24 + new Date().getHours()
  return pool[seed % pool.length]
}

// POST /api/cron — Startet Pipeline (vom scheduler.js aufgerufen)
export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body        = await req.json().catch(() => ({}))
  const topic       = (body.topic       as string) || getNextTopic()
  const niche       = (body.niche       as string) || NICHE
  const triggeredBy = 'scheduled' as const

  // Pipeline asynchron starten — nicht auf Ergebnis warten (würde Timeout verursachen)
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`

  // Fire-and-forget: Pipeline POST
  fetch(`${appUrl}/api/workflow/run`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ topic, niche, triggeredBy }),
  }).catch(e => console.error('[cron] Pipeline-Start Fehler:', e.message))

  console.log(`[cron] 🚀 Pipeline gestartet: "${topic}" (${triggeredBy})`)

  return NextResponse.json({
    ok:          true,
    message:     'Pipeline gestartet',
    topic,
    niche,
    triggeredBy,
    startedAt:   new Date().toISOString(),
  })
}

// GET /api/cron — Für Railway Cron (sendet GET-Requests)
export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const topic  = getNextTopic()
  const niche  = NICHE
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`

  fetch(`${appUrl}/api/workflow/run`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ topic, niche, triggeredBy: 'scheduled' }),
  }).catch(e => console.error('[cron] Pipeline-Start Fehler:', e.message))

  console.log(`[cron] 🚀 Pipeline gestartet (GET): "${topic}"`)

  return NextResponse.json({
    ok:        true,
    message:   'Pipeline gestartet',
    topic,
    startedAt: new Date().toISOString(),
  })
}
