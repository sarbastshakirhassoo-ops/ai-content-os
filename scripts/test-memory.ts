// Deterministischer Test des Gedächtnisses. Kein LLM, kein Netzwerk.
//
// Wichtigster Punkt: die Frische-Regel. Ein gespeicherter Eintrag darf eine
// Echtzeitfrage NIE als Fakt beantworten, egal wie gut er zur Frage passt.

import { getDb } from '../src/brain/db.ts'
import { count, forget, list, remember } from '../src/brain/memory/store.ts'
import { buildMemoryBlock, isStale, recall } from '../src/brain/memory/recall.ts'

let pass = 0, fail = 0
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`) }
const bad = (m: string, d = '') => { fail++; console.log(`  ✗ ${m}`); if (d) console.log(`      ${d}`) }

const TAG = 'ZZTEST' + Date.now()
const cleanup = () => {
  const db = getDb()
  for (const e of list()) {
    if (e.title.includes(TAG) || e.content.includes(TAG)) {
      db.prepare('DELETE FROM memory_fts WHERE mem_id = ?').run(e.id)
      db.prepare('DELETE FROM memory WHERE id = ?').run(e.id)
    }
  }
}
cleanup()

console.log('Test 1 — Schreiben und Wiederfinden')
{
  const before = count()
  const e = remember({
    kind: 'project', title: `${TAG} Gründung Softwarefirma`,
    content: `Der Nutzer plant eine Softwarefirma für Buchhaltung ${TAG}.`,
    freshness: 'SLOW_CHANGING',
  })
  count() === before + 1 ? ok('Eintrag angelegt') : bad('Anzahl stimmt nicht')
  e.id.length > 10 ? ok('Eintrag hat eine ID') : bad('keine ID')

  const hits = recall(`Was weisst du über meine Pläne mit ${TAG} Buchhaltung?`)
  hits.some((h) => h.entry.id === e.id)
    ? ok('Volltextsuche findet den Eintrag')
    : bad('nicht gefunden', hits.map((h) => h.entry.title).join(' | '))
}

console.log('Test 2 — gleicher Titel aktualisiert, statt zu duplizieren')
{
  const before = count()
  remember({ kind: 'project', title: `${TAG} Gründung Softwarefirma`,
    content: `Neuer Stand ${TAG}: Fokus auf Kleinunternehmen.`, freshness: 'SLOW_CHANGING' })
  count() === before ? ok('kein Duplikat entstanden') : bad(`Anzahl stieg von ${before} auf ${count()}`)
  const hit = list('project').find((x) => x.title.includes(TAG))
  hit?.content.includes('Kleinunternehmen') ? ok('Inhalt wurde aktualisiert') : bad('Inhalt nicht aktualisiert')
}

console.log('Test 3 — Frische entscheidet, ob ein Treffer als Fakt gilt')
{
  const rt = remember({ kind: 'knowledge', title: `${TAG} Leitzins`,
    content: `Leitzins lag bei 2,5 Prozent ${TAG}.`, freshness: 'REALTIME_SENSITIVE' })
  isStale(rt) ? ok('REALTIME_SENSITIVE ist sofort veraltet') : bad('Echtzeit-Eintrag gilt als frisch')

  const ever = remember({ kind: 'user', title: `${TAG} Rolle`,
    content: `Der Nutzer ist Student und Unternehmer ${TAG}.`, freshness: 'EVERGREEN' })
  !isStale(ever) ? ok('EVERGREEN ist frisch') : bad('Evergreen fälschlich veraltet')

  // Künstlich altern lassen
  const cur = remember({ kind: 'knowledge', title: `${TAG} Marktlage`,
    content: `Marktlage ${TAG}.`, freshness: 'CURRENT' })
  getDb().prepare('UPDATE memory SET updated_at = ? WHERE id = ?')
    .run(new Date(Date.now() - 7 * 3_600_000).toISOString(), cur.id)
  const aged = list('knowledge').find((x) => x.id === cur.id)!
  isStale(aged) ? ok('CURRENT nach 7 Stunden veraltet') : bad('zu alter CURRENT-Eintrag gilt als frisch')

  getDb().prepare('UPDATE memory SET updated_at = ? WHERE id = ?')
    .run(new Date(Date.now() - 2 * 3_600_000).toISOString(), cur.id)
  const young = list('knowledge').find((x) => x.id === cur.id)!
  !isStale(young) ? ok('CURRENT nach 2 Stunden noch frisch') : bad('frischer Eintrag fälschlich veraltet')
}

console.log('Test 4 — veraltete Treffer werden markiert, nicht verschwiegen')
{
  const hits = recall(`${TAG} Leitzins`)
  const rt = hits.find((h) => h.entry.title.includes('Leitzins'))
  rt ? ok('veralteter Treffer wird geliefert') : bad('veralteter Treffer fehlt ganz')
  rt?.stale === true ? ok('und ist als veraltet markiert') : bad('Markierung fehlt')

  const only = recall(`${TAG} Leitzins`, { includeStale: false })
  !only.some((h) => h.entry.title.includes('Leitzins'))
    ? ok('includeStale false filtert ihn heraus') : bad('Filter greift nicht')

  const block = buildMemoryBlock(hits)
  block.includes('VERALTET') ? ok('Prompt-Block warnt vor veralteten Einträgen') : bad('Warnung fehlt im Block')
  block.includes('GEDÄCHTNIS') ? ok('Block ist klar abgegrenzt') : bad('Abgrenzung fehlt')
}

console.log('Test 5 — Suche ist gegen Sonderzeichen robust')
{
  const tricky = ['Was ist "AND" OR NOT * ?', 'a', '', '((()))', `${TAG} -- DROP TABLE memory`]
  let crashed = false
  for (const q of tricky) {
    try { recall(q) } catch { crashed = true }
  }
  !crashed ? ok('keine Suchanfrage bringt den Recall zum Absturz') : bad('Recall ist abgestürzt')
}

console.log('Test 6 — Löschen')
{
  const e = list().find((x) => x.title.includes(TAG))!
  forget(e.id) ? ok('Eintrag gelöscht') : bad('Löschen meldete false')
  !recall(e.title).some((h) => h.entry.id === e.id)
    ? ok('gelöschter Eintrag wird nicht mehr gefunden') : bad('Volltextindex nicht aufgeräumt')
}

cleanup()
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`)
process.exit(fail === 0 ? 0 : 1)
