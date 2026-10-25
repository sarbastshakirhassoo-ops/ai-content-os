// ─────────────────────────────────────────────────────────────────────────────
// Unternehmensquellen: SEC EDGAR und Wikipedia.
//
// SEC EDGAR ist die Volltextsuche über Pflichtveröffentlichungen
// US-börsennotierter Unternehmen — eine echte Primärquelle.
// Wikipedia ist Hintergrund und Einordnung, also SECONDARY.
//
// Bekannte Lücke: für deutsche und europäische Unternehmensabschlüsse gibt es
// keine vergleichbar zugängliche kostenlose Volltextsuche. Siehe
// docs/BRAIN-V1-PLAN.md, Abschnitt Einschränkungen.
// ─────────────────────────────────────────────────────────────────────────────

import { clean, fetchJson, isoDate, userAgent } from '../http.ts'
import type { ResearchDocument, SourceDefinition, SourceQuery } from '../types.ts'

const now = () => new Date().toISOString()

// ── SEC EDGAR ────────────────────────────────────────────────────────────────

interface EdgarHit {
  _id?: string
  _source?: {
    display_names?: string[]
    file_type?: string
    file_date?: string
    root_forms?: string[]
    ciks?: string[]
  }
}

export const secEdgar: SourceDefinition = {
  id: 'sec-edgar',
  name: 'SEC EDGAR',
  tier: 'PRIMARY',
  baseUrl: 'https://efts.sec.gov',
  domains: ['companies', 'economics'],
  serves: ['CURRENT', 'SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Volltextsuche über Pflichtveröffentlichungen US-börsennotierter Unternehmen.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${q.query}"`)}`
    // Die SEC verlangt einen identifizierenden User-Agent und sperrt sonst.
    const j = await fetchJson<{ hits?: { hits?: EdgarHit[] } }>(url, {
      signal: q.signal,
      headers: { 'user-agent': userAgent() },
    })

    return (j.hits?.hits ?? [])
      .slice(0, q.limit)
      .map((h) => {
        const s = h._source ?? {}
        const company = s.display_names?.[0] ?? 'Unbekanntes Unternehmen'
        const form = s.root_forms?.[0] ?? s.file_type ?? 'Einreichung'
        // _id hat die Form "<accession>:<datei>"; daraus wird die Dokument-URL.
        const [accession, file] = (h._id ?? '').split(':')
        const cik = (s.ciks?.[0] ?? '').replace(/^0+/, '')
        const url_ =
          accession && file && cik
            ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${file}`
            : 'https://www.sec.gov/edgar/search/'
        return {
          title: `${company} — ${form}${s.file_date ? ` vom ${s.file_date}` : ''}`,
          sourceId: 'sec-edgar',
          sourceName: 'SEC EDGAR',
          sourceTier: 'PRIMARY' as const,
          url: url_,
          publishedAt: isoDate(s.file_date),
          retrievedAt: now(),
          excerpt: `Pflichtveröffentlichung vom Typ ${form}, eingereicht von ${company}${s.file_date ? ` am ${s.file_date}` : ''}. Der Suchbegriff "${q.query}" kommt in diesem Dokument vor.`,
          query: q.query,
          fullTextFetched: false,
        }
      })
  },
}

// ── Wikipedia ────────────────────────────────────────────────────────────────

interface WikiSearch {
  query?: { search?: { title?: string; snippet?: string; timestamp?: string }[] }
}

export const wikipedia: SourceDefinition = {
  id: 'wikipedia',
  name: 'Wikipedia',
  tier: 'SECONDARY',
  baseUrl: 'https://de.wikipedia.org',
  domains: ['general', 'science', 'economics', 'companies', 'technology', 'medicine'],
  serves: ['SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Hintergrund und Einordnung. Nicht für tagesaktuelle Zahlen.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const lang = process.env.RESEARCH_WIKI_LANG?.trim() || 'de'
    const j = await fetchJson<WikiSearch>(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search` +
        `&srsearch=${encodeURIComponent(q.query)}&format=json&srlimit=${q.limit}`,
      { signal: q.signal },
    )

    return (j.query?.search ?? [])
      .filter((r) => r.title)
      .slice(0, q.limit)
      .map((r) => ({
        title: clean(r.title, 250),
        sourceId: 'wikipedia',
        sourceName: `Wikipedia (${lang})`,
        sourceTier: 'SECONDARY' as const,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent((r.title ?? '').replace(/ /g, '_'))}`,
        publishedAt: isoDate(r.timestamp),
        retrievedAt: now(),
        excerpt: clean(r.snippet, 500),
        query: q.query,
        fullTextFetched: false,
      }))
  },
}
