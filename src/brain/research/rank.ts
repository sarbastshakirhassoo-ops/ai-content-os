// ─────────────────────────────────────────────────────────────────────────────
// Deduplizierung und Rangfolge.
//
// Die Cluster-Idee stammt aus legacy/video/agents/trend-agent.ts
// (clusterSources): gleiche Meldung aus mehreren Quellen wird zu einem
// Eintrag mit mehreren Belegen. Die dortige Bewertung mit Math.random ist
// NICHT übernommen — hier wird ausschliesslich mit nachvollziehbaren
// Merkmalen gerechnet.
// ─────────────────────────────────────────────────────────────────────────────

import { TIER_WEIGHT, type ResearchDocument } from './types.ts'

const STOPWORDS = new Set([
  'der','die','das','und','oder','ist','sind','was','wie','wer','wann','für','von','mit','auf','ein','eine','einer','eines','dem','den','des','im','in','zu','zur','zum','bei','nach','über','aus','the','a','an','and','or','of','to','in','for','on','is','are','what','how',
])

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

/** Anteil gemeinsamer Wörter an der Vereinigung. */
function overlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const sa = new Set(a)
  const sb = new Set(b)
  let shared = 0
  for (const w of sa) if (sb.has(w)) shared++
  return shared / new Set([...sa, ...sb]).size
}

/**
 * Fasst Dokumente zusammen, die offensichtlich dieselbe Sache beschreiben.
 * Behalten wird das Dokument der höchsten Vertrauensstufe; die übrigen
 * URLs zählen als zusätzliche Belege.
 */
export function dedupe(docs: ResearchDocument[]): ResearchDocument[] {
  const kept: { doc: ResearchDocument; tok: string[] }[] = []

  for (const doc of docs) {
    // Exakt gleiche URL ist immer ein Duplikat.
    if (kept.some((k) => k.doc.url === doc.url)) continue

    const tok = tokens(doc.title)
    const twin = kept.find((k) => overlap(k.tok, tok) >= 0.6)
    if (!twin) {
      kept.push({ doc, tok })
      continue
    }
    // Höhere Vertrauensstufe verdrängt die niedrigere.
    if (TIER_WEIGHT[doc.sourceTier] > TIER_WEIGHT[twin.doc.sourceTier]) {
      twin.doc = doc
      twin.tok = tok
    }
  }
  return kept.map((k) => k.doc)
}

function ageDays(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) ? ms / 86_400_000 : null
}

/**
 * Bewertet ein Dokument. Drei nachvollziehbare Faktoren, keine Zufallszahlen:
 * Vertrauensstufe, Aktualität und Wortüberschneidung mit der Frage.
 */
function score(doc: ResearchDocument, questionTokens: string[]): number {
  const tier = TIER_WEIGHT[doc.sourceTier] * 3

  const days = ageDays(doc.publishedAt)
  // Ohne Datum weder belohnen noch bestrafen.
  const recency = days === null ? 1.5 : days < 2 ? 4 : days < 7 ? 3 : days < 30 ? 2 : days < 365 ? 1 : 0

  const relevance = overlap(questionTokens, tokens(`${doc.title} ${doc.excerpt}`)) * 10

  return tier + recency + relevance
}

export function rank(docs: ResearchDocument[], question: string, limit: number): ResearchDocument[] {
  const qt = tokens(question)
  return [...docs]
    .map((d) => ({ d, s: score(d, qt) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.d)
}
