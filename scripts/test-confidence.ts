// Deterministischer Test der Belegstärke. Kein LLM, kein Netzwerk.
//
// Prüft beide Richtungen: dass gute Beleglage HIGH ergibt UND dass schwache
// Beleglage nicht versehentlich hochgestuft wird.

import { assessEvidence } from '../src/brain/research/confidence.ts'
import type { ResearchDocument } from '../src/brain/research/types.ts'
import type { Freshness } from '../src/brain/types.ts'

let pass = 0, fail = 0
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`) }
const bad = (m: string, d = '') => { fail++; console.log(`  ✗ ${m}`); if (d) console.log(`      ${d}`) }

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

function doc(over: Partial<ResearchDocument> = {}): ResearchDocument {
  return {
    title: 'Titel', sourceId: 'x', sourceName: 'X', sourceTier: 'SECONDARY',
    url: 'https://example.com/a', publishedAt: hoursAgo(2), retrievedAt: new Date().toISOString(),
    excerpt: 'Inhalt', query: 'q', fullTextFetched: false, ...over,
  }
}

function check(name: string, docs: ResearchDocument[], f: Freshness, expect: string) {
  const a = assessEvidence(docs, f)
  a.level === expect
    ? ok(`${name}: ${a.level}`)
    : bad(`${name}: erwartet ${expect}, erhalten ${a.level}`, a.reasons.join(' | '))
  return a
}

console.log('Test 1 — Einstufung')
check('keine Quellen', [], 'CURRENT', 'NONE')

check('EZB frisch plus zwei Medien', [
  doc({ sourceId: 'ecb', sourceName: 'EZB', sourceTier: 'PRIMARY', publishedAt: hoursAgo(3) }),
  doc({ sourceId: 'google-news', publishedAt: hoursAgo(5) }),
  doc({ sourceId: 'gdelt', publishedAt: hoursAgo(9) }),
], 'REALTIME_SENSITIVE', 'HIGH')

check('nur Community', [
  doc({ sourceId: 'reddit', sourceTier: 'COMMUNITY' }),
  doc({ sourceId: 'hackernews', sourceTier: 'COMMUNITY' }),
], 'CURRENT', 'LOW')

check('Primärquelle, aber zu alt für Echtzeit', [
  doc({ sourceId: 'ecb', sourceTier: 'PRIMARY', publishedAt: hoursAgo(24 * 30) }),
  doc({ sourceId: 'google-news', publishedAt: hoursAgo(24 * 29) }),
], 'REALTIME_SENSITIVE', 'LOW')

check('dieselbe alte Quelle ist für Evergreen in Ordnung', [
  doc({ sourceId: 'wikipedia', sourceTier: 'SECONDARY', publishedAt: hoursAgo(24 * 300) }),
  doc({ sourceId: 'crossref', sourceTier: 'SECONDARY', publishedAt: hoursAgo(24 * 900) }),
], 'EVERGREEN', 'MEDIUM')

check('nur eine Quelle, keine Bestätigung', [
  doc({ sourceId: 'ecb', sourceTier: 'PRIMARY', publishedAt: hoursAgo(1) }),
], 'CURRENT', 'LOW')

check('zwei Sekundärquellen ohne Primärquelle', [
  doc({ sourceId: 'google-news' }), doc({ sourceId: 'gdelt' }),
], 'CURRENT', 'MEDIUM')

check('alle ohne Datum', [
  doc({ sourceId: 'ecb', sourceTier: 'PRIMARY', publishedAt: null }),
  doc({ sourceId: 'google-news', publishedAt: null }),
], 'CURRENT', 'LOW')

console.log('Test 2 — Begründungen sind konkret und nachprüfbar')
{
  const a = assessEvidence([
    doc({ sourceId: 'ecb', sourceName: 'Europäische Zentralbank', sourceTier: 'PRIMARY', publishedAt: hoursAgo(3) }),
    doc({ sourceId: 'google-news', publishedAt: null }),
  ], 'CURRENT')
  a.reasons.some((r) => r.includes('Europäische Zentralbank'))
    ? ok('Primärquelle wird namentlich genannt') : bad('Quellenname fehlt', a.reasons.join(' | '))
  a.reasons.some((r) => r.includes('ohne Datum'))
    ? ok('Quelle ohne Datum wird benannt') : bad('fehlendes Datum nicht erwähnt', a.reasons.join(' | '))
  a.undatedCount === 1 ? ok('undatedCount stimmt') : bad(`undatedCount ${a.undatedCount}`)
  a.primaryCount === 1 && a.secondaryCount === 1 ? ok('Zählung je Stufe stimmt') : bad('Zählung falsch')
  a.reasons.every((r) => !/vermutlich|wahrscheinlich|sicher/i.test(r))
    ? ok('keine Wertungen in den Begründungen') : bad('Begründung enthält eine Wertung')
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`)
process.exit(fail === 0 ? 0 : 1)
