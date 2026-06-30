#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// AI Content OS — Auto-Scheduler
// Läuft als Hintergrundprozess und triggert die Pipeline automatisch
//
// Start:  node scripts/scheduler.js
// Stop:   Ctrl+C oder SIGTERM
//
// Konfiguration in .env.local:
//   SCHEDULER_TOPICS=Disziplin Mindset,Luxury Morning Routine,Erfolg
//   SCHEDULER_DAYS=2,4,6       (Di=2, Do=4, Sa=6 — ISO-Wochentage)
//   SCHEDULER_HOUR=19          (19 Uhr)
//   SCHEDULER_MINUTE=0
//   APP_URL=http://localhost:3001
//   CRON_SECRET=dein-geheimer-token
// ─────────────────────────────────────────────────────────────────────────────

// Lese .env ohne externe Abhängigkeiten
const _fs = require('fs'), _path = require('path')
for (const _f of ['.env.local', '.env']) {
  const _fp = _path.resolve(process.cwd(), _f)
  if (!_fs.existsSync(_fp)) continue
  _fs.readFileSync(_fp, 'utf8').split('\n').forEach(_line => {
    const _m = _line.match(/^([A-Z_][A-Z0-9_]*)="?([^"#\n]*)"?\s*$/)
    if (_m && !process.env[_m[1]]) process.env[_m[1]] = _m[2].trim()
  })
}


const APP_URL  = process.env.APP_URL       || 'http://localhost:3001'
const SECRET   = process.env.CRON_SECRET   || ''
const NICHE    = process.env.NICHE         || 'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic'

// Themen-Pool: reihum durchgehen
const TOPICS_RAW = process.env.SCHEDULER_TOPICS || [
  'Disziplin Mindset — Was erfolgreiche Menschen täglich tun',
  'Luxury Morning Routine — Die ersten 2 Stunden entscheiden',
  'Silent Discipline — Wenn niemand zusieht',
  'Nostalgie und Ehrgeiz — Was dich antreibt',
  'Das Geheimnis hinter Erfolg im Luxus-Lifestyle',
  'Ferrari Mindset — Wie die Reichsten denken',
  'Warum die meisten scheitern — und wie du es nicht tust',
].join(',')

const TOPICS = TOPICS_RAW.split(',').map(t => t.trim()).filter(Boolean)

// Posting-Tage: Di=2, Do=4, Sa=6 (ISO: Mo=1 … So=7)
const DAYS_RAW = (process.env.SCHEDULER_DAYS || '2,4,6').split(',').map(Number)
const HOUR     = parseInt(process.env.SCHEDULER_HOUR   || '19', 10)
const MINUTE   = parseInt(process.env.SCHEDULER_MINUTE || '0',  10)

// ── State ─────────────────────────────────────────────────────────────────────

let topicIndex   = 0
let isRunning    = false
let runCount     = 0
let lastRunAt    = null
let nextRunAt    = null

// ── Logging ───────────────────────────────────────────────────────────────────

function log(msg, level = 'INFO') {
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0]
  const emoji = level === 'ERROR' ? '❌' : level === 'SUCCESS' ? '✅' : level === 'WARN' ? '⚠️ ' : '📋'
  console.log(`[${ts}] ${emoji} ${msg}`)
}

// ── Nächste Run-Zeit berechnen ────────────────────────────────────────────────

function getNextRunTime() {
  const now     = new Date()
  const checked = new Date(now)

  // Suche nächsten gültigen Tag+Zeit in den kommenden 7 Tagen
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(checked)
    candidate.setDate(checked.getDate() + i)
    candidate.setHours(HOUR, MINUTE, 0, 0)

    const dayOfWeek = candidate.getDay() || 7 // So=0 → 7 (ISO)

    if (DAYS_RAW.includes(dayOfWeek) && candidate > now) {
      return candidate
    }
  }

  // Fallback: morgen zur gleichen Zeit
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  tomorrow.setHours(HOUR, MINUTE, 0, 0)
  return tomorrow
}

// ── Pipeline triggern ─────────────────────────────────────────────────────────

async function triggerPipeline(topic) {
  if (isRunning) {
    log('Pipeline läuft bereits — Skip', 'WARN')
    return
  }

  isRunning = true
  lastRunAt = new Date().toISOString()
  runCount++

  log(`🚀 Pipeline Start #${runCount}: "${topic}"`)
  log(`   Nische: ${NICHE}`)
  log(`   API: POST ${APP_URL}/api/cron`)

  try {
    const res = await fetch(`${APP_URL}/api/cron`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify({
        topic,
        niche:       NICHE,
        triggeredBy: 'scheduled',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      log(`Pipeline HTTP ${res.status}: ${errText.slice(0, 200)}`, 'ERROR')
      return
    }

    const data = await res.json()

    if (data.ok) {
      log(`Pipeline gestartet — Job ID: ${data.jobId}`, 'SUCCESS')
      log(`Warte auf Fertigstellung (max 10 Min)…`)

      // Auf Job-Abschluss warten (Polling)
      const jobId  = data.jobId
      const maxWait = 10 * 60 * 1000 // 10 Minuten
      const poll   = 15 * 1000       // alle 15s

      let waited = 0
      while (waited < maxWait) {
        await new Promise(r => setTimeout(r, poll))
        waited += poll

        try {
          // Korrekter Endpoint: /api/jobs/:id (nicht ?id=)
          const statusRes = await fetch(`${APP_URL}/api/jobs/${jobId}`)
          if (statusRes.ok) {
            const body = await statusRes.json()
            // Response-Struktur: { job: { status, qcScore, uploadUrls, error } }
            const job = body.job || body
            if (job.status === 'completed') {
              log(`✅ Job ${jobId} abgeschlossen — QC: ${job.qcScore}/100`, 'SUCCESS')
              if (job.uploadUrls?.youtube) {
                log(`   YouTube: ${job.uploadUrls.youtube}`, 'SUCCESS')
              }
              break
            } else if (job.status === 'failed') {
              log(`❌ Job ${jobId} fehlgeschlagen: ${job.error}`, 'ERROR')
              break
            } else {
              const step = job.currentStep !== undefined ? ` | Step ${job.currentStep}/13` : ''
              log(`   Job ${jobId}: ${job.status}${step} (${Math.round(waited / 1000)}s)`)
            }
          }
        } catch (pollErr) {
          log(`Polling Fehler: ${pollErr.message}`, 'WARN')
        }
      }

      if (waited >= maxWait) {
        log(`⚠️  Job Timeout nach 10 Minuten — möglicherweise noch aktiv`, 'WARN')
      }
    } else {
      log(`Pipeline Start fehlgeschlagen: ${data.error}`, 'ERROR')
    }
  } catch (e) {
    log(`Netzwerk-Fehler: ${e.message}`, 'ERROR')
    log(`Ist die App gestartet? (${APP_URL})`, 'WARN')
  } finally {
    isRunning  = false
    topicIndex = (topicIndex + 1) % TOPICS.length
    nextRunAt  = getNextRunTime()
    log(`Nächster Run: ${nextRunAt.toLocaleString('de-DE')}`)
  }
}

// ── Tick: jede Minute prüfen ob es Zeit ist ────────────────────────────────────

function tick() {
  const now = new Date()

  if (!nextRunAt) {
    nextRunAt = getNextRunTime()
    log(`Scheduler gestartet`)
    log(`Posting-Tage: ${DAYS_RAW.map(d => ['','Mo','Di','Mi','Do','Fr','Sa','So'][d]).join(', ')}`)
    log(`Uhrzeit: ${String(HOUR).padStart(2,'0')}:${String(MINUTE).padStart(2,'0')} Uhr`)
    log(`Nächster Run: ${nextRunAt.toLocaleString('de-DE')}`)
    log(`Topics im Pool: ${TOPICS.length}`)
    log(`App URL: ${APP_URL}`)
    log('')
  }

  if (now >= nextRunAt && !isRunning) {
    const topic = TOPICS[topicIndex]
    triggerPipeline(topic).catch(e => log(`Unerwarteter Fehler: ${e.message}`, 'ERROR'))
  }
}

// ── Sofort-Modus: --now Flag ──────────────────────────────────────────────────

if (process.argv.includes('--now')) {
  const topicFlagIdx = process.argv.indexOf('--topic')
  const topic = (topicFlagIdx >= 0 && process.argv[topicFlagIdx + 1]) ? process.argv[topicFlagIdx + 1] : TOPICS[0]
  log(`🔥 Sofort-Modus: "${topic}"`)
  triggerPipeline(topic).then(() => {
    log('Sofort-Run abgeschlossen')
    process.exit(0)
  }).catch(e => {
    log(`Fehler: ${e.message}`, 'ERROR')
    process.exit(1)
  })
} else {
  // Normaler Scheduler-Modus
  tick() // Sofort beim Start prüfen
  setInterval(tick, 60 * 1000) // Jede Minute prüfen

  // Graceful Shutdown
  process.on('SIGTERM', () => {
    log('SIGTERM empfangen — Scheduler wird beendet')
    process.exit(0)
  })
  process.on('SIGINT', () => {
    log('Ctrl+C — Scheduler wird beendet')
    process.exit(0)
  })
}
