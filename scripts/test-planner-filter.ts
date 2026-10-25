// Deterministischer Test des Recency-Filters. Kein LLM, keine Netzwerkaufrufe.
// Prüft beide Richtungen: dass Aktualitätswörter verschärfen UND dass
// Fachbegriffe wie "Preistheorie" oder "Diskurs" es NICHT tun.

import { applyRecencyFilter } from '../src/brain/recency.ts'
import type { Freshness, QueryPlan } from '../src/brain/types.ts'

function planWith(freshness: Freshness): QueryPlan {
  return {
    intent: 'test', answerableFromModelKnowledge: true, needsResearch: false,
    needsMemory: false, freshness, sensitivity: 'PUBLIC', domains: [], searchQueries: [], memoryWrites: [], rationale: '',
  }
}

const cases: { q: string; from: Freshness; expect: Freshness; why: string }[] = [
  { q: 'Was ist heute an den Märkten passiert?', from: 'EVERGREEN', expect: 'REALTIME_SENSITIVE', why: 'heute' },
  { q: 'Wie ist der aktuelle Kurs von Öl?', from: 'SLOW_CHANGING', expect: 'REALTIME_SENSITIVE', why: 'aktueller Kurs' },
  { q: 'Welche neuen KI-Firmen wurden diese Woche finanziert?', from: 'EVERGREEN', expect: 'CURRENT', why: 'diese Woche' },
  { q: 'Wie hoch ist aktuell der EZB-Leitzins?', from: 'EVERGREEN', expect: 'CURRENT', why: 'aktuell' },
  // Verschärfung darf nie abschwächen
  { q: 'Was ist aktuell der Ölpreis?', from: 'REALTIME_SENSITIVE', expect: 'REALTIME_SENSITIVE', why: 'bereits streng genug' },
  // Falsch-Positive: Fachbegriffe, die Teilwörter enthalten
  { q: 'Erkläre die Preiselastizität der Nachfrage', from: 'EVERGREEN', expect: 'EVERGREEN', why: 'Preis- als Teilwort' },
  { q: 'Was versteht man unter Preistheorie?', from: 'EVERGREEN', expect: 'EVERGREEN', why: 'Preis- als Teilwort' },
  { q: 'Was bedeutet Diskurs in der Soziologie?', from: 'EVERGREEN', expect: 'EVERGREEN', why: 'Kurs als Teilwort' },
  { q: 'Wer war Albert Einstein?', from: 'EVERGREEN', expect: 'EVERGREEN', why: 'kein Zeitbezug' },
]

let pass = 0, fail = 0
for (const c of cases) {
  const plan = planWith(c.from)
  const adj = applyRecencyFilter(c.q, plan)
  const ok = plan.freshness === c.expect
  if (ok) { pass++; console.log(`  ✓ ${c.from} -> ${plan.freshness}  (${c.why})`) }
  else { fail++; console.log(`  ✗ ${c.from} -> ${plan.freshness}, erwartet ${c.expect}  (${c.why}) — "${c.q}"`) }
  // Verschärfung muss needsResearch setzen
  if (adj && !plan.needsResearch) { fail++; console.log('  ✗ Verschärfung hat needsResearch nicht gesetzt') }
}
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`)
if (cases.length === 0) { console.error('TEST KAPUTT — keine Fälle'); process.exit(2) }
process.exit(fail === 0 ? 0 : 1)
