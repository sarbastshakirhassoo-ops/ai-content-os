// Prüft, dass die Volltext-Extraktion auf echten Seiten wirklich Text liefert.
// Ohne diesen Test wäre research.extract eine Funktion, die im Alltag nie greift.

import { enrichWithFullText } from '../src/brain/research/extract.ts'
import type { ResearchDocument } from '../src/brain/research/types.ts'

const mk = (url: string, title: string): ResearchDocument => ({
  title, sourceId: 'x', sourceName: 'X', sourceTier: 'SECONDARY', url,
  publishedAt: null, retrievedAt: new Date().toISOString(),
  excerpt: 'kurzer Anriss', query: 'q', fullTextFetched: false,
})

const cases = [
  { doc: mk('https://de.wikipedia.org/wiki/Leitzins', 'Wikipedia Leitzins'), mustSucceed: true },
  { doc: mk('https://www.ecb.europa.eu/press/pr/date/2026/html/index.en.html', 'EZB Pressemitteilungen'), mustSucceed: false },
]

let pass = 0, fail = 0
const r = await enrichWithFullText(cases.map((c) => c.doc), { max: cases.length })

console.log(`Extraktion: ${r.fetched} geholt, ${r.failed} fehlgeschlagen`)
for (let i = 0; i < cases.length; i++) {
  const d = r.documents[i]
  const label = `${cases[i].doc.title}: ${d.fullTextFetched ? `${d.excerpt.length} Zeichen` : 'kein Volltext'}`
  if (cases[i].mustSucceed && !d.fullTextFetched) {
    fail++; console.log(`  ✗ ${label} — hier wurde Volltext erwartet`)
  } else if (d.fullTextFetched && d.excerpt.length < 200) {
    fail++; console.log(`  ✗ ${label} — zu kurz für echten Volltext`)
  } else {
    pass++; console.log(`  ✓ ${label}`)
  }
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`)
process.exit(fail === 0 ? 0 : 1)
