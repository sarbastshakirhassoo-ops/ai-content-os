// ─────────────────────────────────────────────────────────────────────────────
// Wissenschaftliche Quellen: arXiv, OpenAlex, Crossref, PubMed.
//
// arXiv und PubMed führen zu Originalarbeiten und gelten deshalb als PRIMARY.
// OpenAlex und Crossref sind Metadaten-Indizes über fremde Arbeiten, also
// SECONDARY.
// ─────────────────────────────────────────────────────────────────────────────

import { clean, fetchJson, fetchText, isoDate, userAgent } from '../http.ts'
import { parseFeed } from '../rss.ts'
import type { ResearchDocument, SourceDefinition, SourceQuery } from '../types.ts'

const now = () => new Date().toISOString()

/** Mehrere dieser APIs bitten um eine Kontaktadresse für höhere Limits. */
function contact(): string {
  return process.env.RESEARCH_CONTACT?.trim() || ''
}

// ── arXiv ────────────────────────────────────────────────────────────────────

export const arxiv: SourceDefinition = {
  id: 'arxiv',
  name: 'arXiv',
  tier: 'PRIMARY',
  baseUrl: 'https://export.arxiv.org',
  domains: ['science', 'technology'],
  serves: ['CURRENT', 'SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Preprint-Server für Physik, Mathematik und Informatik. Führt zur Originalarbeit.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const url =
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q.query)}` +
      `&max_results=${q.limit}&sortBy=submittedDate&sortOrder=descending`
    const xml = await fetchText(url, { signal: q.signal, accept: 'application/atom+xml' })

    return parseFeed(xml, q.limit).map((it) => ({
      title: clean(it.title, 250),
      sourceId: 'arxiv',
      sourceName: 'arXiv',
      sourceTier: 'PRIMARY' as const,
      url: it.link,
      publishedAt: it.publishedAt,
      retrievedAt: now(),
      excerpt: clean(it.description, 700),
      query: q.query,
      fullTextFetched: false,
    }))
  },
}

// ── OpenAlex ─────────────────────────────────────────────────────────────────

interface OpenAlexWork {
  id?: string
  doi?: string
  title?: string
  display_name?: string
  publication_date?: string
  cited_by_count?: number
  primary_location?: { source?: { display_name?: string }; landing_page_url?: string }
  abstract_inverted_index?: Record<string, number[]>
}

/** OpenAlex speichert Abstracts als invertierten Index. Zurückbauen, nicht raten. */
function rebuildAbstract(idx: Record<string, number[]> | undefined): string {
  if (!idx) return ''
  const words: string[] = []
  for (const [word, positions] of Object.entries(idx)) {
    for (const p of positions) words[p] = word
  }
  return words.filter(Boolean).join(' ')
}

export const openAlex: SourceDefinition = {
  id: 'openalex',
  name: 'OpenAlex',
  tier: 'SECONDARY',
  baseUrl: 'https://api.openalex.org',
  domains: ['science', 'medicine', 'technology', 'economics'],
  serves: ['CURRENT', 'SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Offener Index wissenschaftlicher Arbeiten mit Abstracts und Zitationszahlen.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const mail = contact() ? `&mailto=${encodeURIComponent(contact())}` : ''
    const url =
      `https://api.openalex.org/works?search=${encodeURIComponent(q.query)}` +
      `&per-page=${q.limit}&sort=relevance_score:desc${mail}`
    const j = await fetchJson<{ results?: OpenAlexWork[] }>(url, { signal: q.signal })

    return (j.results ?? []).slice(0, q.limit).map((w) => ({
      title: clean(w.title ?? w.display_name, 250),
      sourceId: 'openalex',
      sourceName: `OpenAlex${w.primary_location?.source?.display_name ? ` · ${w.primary_location.source.display_name}` : ''}`,
      sourceTier: 'SECONDARY' as const,
      url: w.primary_location?.landing_page_url ?? (w.doi ? `https://doi.org/${w.doi.replace(/^https?:\/\/doi\.org\//, '')}` : w.id ?? ''),
      publishedAt: isoDate(w.publication_date),
      retrievedAt: now(),
      excerpt: clean(rebuildAbstract(w.abstract_inverted_index), 700) ||
        `Arbeit "${clean(w.title ?? w.display_name, 200)}"${w.cited_by_count !== undefined ? `, ${w.cited_by_count} Zitationen` : ''}.`,
      query: q.query,
      fullTextFetched: false,
    })).filter((d) => d.url)
  },
}

// ── Crossref ─────────────────────────────────────────────────────────────────

interface CrossrefItem {
  title?: string[]
  URL?: string
  DOI?: string
  abstract?: string
  'container-title'?: string[]
  created?: { 'date-time'?: string }
  issued?: { 'date-parts'?: number[][] }
}

export const crossref: SourceDefinition = {
  id: 'crossref',
  name: 'Crossref',
  tier: 'SECONDARY',
  baseUrl: 'https://api.crossref.org',
  domains: ['science', 'medicine', 'economics'],
  serves: ['CURRENT', 'SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'DOI-Register für wissenschaftliche Publikationen.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const mail = contact() ? `&mailto=${encodeURIComponent(contact())}` : ''
    const url =
      `https://api.crossref.org/works?query=${encodeURIComponent(q.query)}` +
      `&rows=${q.limit}&select=title,URL,DOI,abstract,container-title,created,issued${mail}`
    const j = await fetchJson<{ message?: { items?: CrossrefItem[] } }>(url, {
      signal: q.signal,
      headers: { 'user-agent': userAgent() },
    })

    return (j.message?.items ?? []).slice(0, q.limit).map((it) => {
      const parts = it.issued?.['date-parts']?.[0]
      const issued = parts && parts.length > 0
        ? `${parts[0]}-${String(parts[1] ?? 1).padStart(2, '0')}-${String(parts[2] ?? 1).padStart(2, '0')}`
        : it.created?.['date-time']
      return {
        title: clean(it.title?.[0], 250),
        sourceId: 'crossref',
        sourceName: `Crossref${it['container-title']?.[0] ? ` · ${it['container-title'][0]}` : ''}`,
        sourceTier: 'SECONDARY' as const,
        url: it.URL ?? (it.DOI ? `https://doi.org/${it.DOI}` : ''),
        publishedAt: isoDate(issued),
        retrievedAt: now(),
        excerpt: clean(it.abstract, 700) || clean(it.title?.[0], 250),
        query: q.query,
        fullTextFetched: false,
      }
    }).filter((d) => d.url && d.title)
  },
}

// ── PubMed ───────────────────────────────────────────────────────────────────

interface PubmedSummary {
  result?: Record<string, { uid?: string; title?: string; pubdate?: string; source?: string; sorttitle?: string }>
}

export const pubmed: SourceDefinition = {
  id: 'pubmed',
  name: 'PubMed',
  tier: 'PRIMARY',
  baseUrl: 'https://eutils.ncbi.nlm.nih.gov',
  domains: ['medicine', 'science'],
  serves: ['CURRENT', 'SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Medizinische Literaturdatenbank der US-Gesundheitsbehörde.',
  // NCBI erlaubt ohne Key nur wenige Anfragen je Sekunde, und jede Suche
  // besteht hier aus zwei Aufrufen (esearch und esummary).
  minIntervalMs: 1_500,
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
    const search = await fetchJson<{ esearchresult?: { idlist?: string[] } }>(
      `${base}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q.query)}&retmode=json&retmax=${q.limit}&sort=date`,
      { signal: q.signal },
    )
    const ids = search.esearchresult?.idlist ?? []
    if (ids.length === 0) return []

    const summary = await fetchJson<PubmedSummary>(
      `${base}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`,
      { signal: q.signal },
    )

    return ids
      .map((id) => summary.result?.[id])
      .filter((r): r is NonNullable<typeof r> => Boolean(r?.title))
      .map((r) => ({
        title: clean(r.title, 250),
        sourceId: 'pubmed',
        sourceName: `PubMed${r.source ? ` · ${r.source}` : ''}`,
        sourceTier: 'PRIMARY' as const,
        url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
        publishedAt: isoDate(r.pubdate),
        retrievedAt: now(),
        excerpt: `${clean(r.title, 250)}${r.source ? ` — erschienen in ${r.source}` : ''}${r.pubdate ? `, ${r.pubdate}` : ''}.`,
        query: q.query,
        fullTextFetched: false,
      }))
  },
}
