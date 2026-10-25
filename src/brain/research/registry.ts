// ─────────────────────────────────────────────────────────────────────────────
// Source Registry — die einzige Stelle, an der Quellen definiert sind.
//
// Kein Adapter wird irgendwo sonst importiert oder direkt aufgerufen. Neue
// Quellen kommen ausschliesslich hier dazu.
// ─────────────────────────────────────────────────────────────────────────────

import { ecb, eurostat, worldBank } from './sources/economics.ts'
import { gdelt, googleNews } from './sources/news.ts'
import { hackerNews, reddit } from './sources/community.ts'
import { arxiv, crossref, openAlex, pubmed } from './sources/science.ts'
import { secEdgar, wikipedia } from './sources/companies.ts'
import { TIER_WEIGHT, type Domain, type SourceDefinition } from './types.ts'
import type { Freshness } from '../types.ts'

/** Reihenfolge hier ist bedeutungslos — sortiert wird nach Tier. */
const ALL: SourceDefinition[] = [
  ecb, eurostat, worldBank,
  secEdgar, wikipedia,
  arxiv, openAlex, crossref, pubmed,
  googleNews, gdelt,
  hackerNews, reddit,
]

/** Höchstzahl gleichzeitig befragter Quellen. Begrenzt Laufzeit und Last. */
const MAX_SOURCES = Number(process.env.RESEARCH_MAX_SOURCES ?? 5)

export function listSources(): SourceDefinition[] {
  return [...ALL]
}

export function getSource(id: string): SourceDefinition | undefined {
  return ALL.find((s) => s.id === id)
}

/**
 * Testhaken für Test D der Roadmap: RESEARCH_FAIL_SOURCES=ecb,gdelt lässt
 * genau diese Adapter scheitern. Damit lässt sich der Ausfall einer Quelle
 * prüfen, ohne auf einen echten Ausfall zu warten. Ohne die Variable
 * verhält sich nichts anders.
 */
export function shouldFailForTest(id: string): boolean {
  const list = process.env.RESEARCH_FAIL_SOURCES?.trim()
  if (!list) return false
  return list.split(',').map((s) => s.trim().toLowerCase()).includes(id)
}

/**
 * Wählt die Quellen für eine konkrete Anfrage.
 *
 * Nicht jede Quelle wird für jede Frage befragt: gefiltert wird nach
 * Themenfeld und danach, ob die Quelle die geforderte Aktualitätsklasse
 * überhaupt bedienen kann. Primärquellen stehen vorn.
 */
export function selectSources(domains: Domain[], freshness: Freshness): SourceDefinition[] {
  // Ohne Themenzuordnung des Planners bleibt nur die allgemeine Abdeckung.
  const wanted: Domain[] = domains.length > 0 ? domains : ['news', 'general']

  return ALL.filter((s) => s.status() === 'AVAILABLE')
    .filter((s) => s.domains.some((d) => wanted.includes(d)))
    .filter((s) => s.serves.includes(freshness))
    .sort((a, b) => {
      const byTier = TIER_WEIGHT[b.tier] - TIER_WEIGHT[a.tier]
      if (byTier !== 0) return byTier
      return a.id.localeCompare(b.id)
    })
    .slice(0, MAX_SOURCES)
}
