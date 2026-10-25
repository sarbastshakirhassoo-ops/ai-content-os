// ─────────────────────────────────────────────────────────────────────────────
// Nachrichtenquellen: Google News RSS und GDELT.
//
// Beide sind Aggregatoren, also SECONDARY. Sie liefern Überschriften, Links
// und Datum — nicht den Volltext. Der wird bei Bedarf von extract.ts geholt.
// ─────────────────────────────────────────────────────────────────────────────

import { clean, fetchText, isThrottleError, isoDate, ThrottledError } from '../http.ts'
import { parseFeed } from '../rss.ts'
import type { ResearchDocument, SourceDefinition, SourceQuery } from '../types.ts'

const now = () => new Date().toISOString()

// ── Google News RSS ──────────────────────────────────────────────────────────
//
// Geerntet aus legacy/video/agents/trend-agent.ts (fetchGoogleNews), dort auf
// feste Nischen-Keywords verdrahtet. Hier nimmt der Adapter die Suchanfrage
// des Planners entgegen.

export const googleNews: SourceDefinition = {
  id: 'google-news',
  name: 'Google News',
  tier: 'SECONDARY',
  baseUrl: 'https://news.google.com',
  domains: ['news', 'economics', 'companies', 'technology', 'general'],
  serves: ['REALTIME_SENSITIVE', 'CURRENT'],
  requiresKey: false,
  description: 'Nachrichtenaggregator über RSS. Liefert Überschrift, Link, Quelle und Datum.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const lang = process.env.RESEARCH_NEWS_LOCALE?.trim() || 'de:DE'
    const [hl, gl] = lang.split(':')
    const url =
      `https://news.google.com/rss/search?q=${encodeURIComponent(q.query)}` +
      `&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`

    const xml = await fetchText(url, { signal: q.signal, accept: 'application/rss+xml' })
    return parseFeed(xml, q.limit * 2)
      .slice(0, q.limit)
      .map((it) => ({
        title: clean(it.title, 250),
        sourceId: 'google-news',
        sourceName: 'Google News',
        sourceTier: 'SECONDARY' as const,
        url: it.link,
        publishedAt: it.publishedAt,
        retrievedAt: now(),
        excerpt: clean(it.description, 400) || clean(it.title, 250),
        query: q.query,
        fullTextFetched: false,
      }))
  },
}

// ── GDELT ────────────────────────────────────────────────────────────────────

interface GdeltArticle {
  url?: string
  title?: string
  seendate?: string
  domain?: string
  sourcecountry?: string
}

/** GDELT liefert Zeitstempel als YYYYMMDDTHHMMSSZ. */
function gdeltDate(v: string | undefined): string | null {
  if (!v || v.length < 15) return null
  const iso = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(9, 11)}:${v.slice(11, 13)}:${v.slice(13, 15)}Z`
  return isoDate(iso)
}

export const gdelt: SourceDefinition = {
  id: 'gdelt',
  name: 'GDELT',
  tier: 'SECONDARY',
  baseUrl: 'https://api.gdeltproject.org',
  domains: ['news', 'economics', 'companies', 'general'],
  serves: ['REALTIME_SENSITIVE', 'CURRENT'],
  requiresKey: false,
  description: 'Weltweiter Nachrichtenindex. Gut für internationale Abdeckung, kein Key nötig.',
  // Gemessen 2026-09-11: GDELT antwortet bei schnelleren Folgeaufrufen mit
  // "Please limit requests to one every 5 seconds" oder lässt die Verbindung
  // in einen Connect-Timeout laufen.
  minIntervalMs: 5_500,
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const url =
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q.query)}` +
      `&mode=artlist&maxrecords=${q.limit}&format=json&timespan=7d&sort=datedesc`

    let raw: string
    try {
      raw = await fetchText(url, { signal: q.signal })
    } catch (e) {
      // GDELT drosselt streng und lässt Verbindungen bei Überschreitung
      // auflaufen. Der Unterschied zu "Dienst kaputt" gehört in den Trace.
      if (isThrottleError(e)) throw new ThrottledError('GDELT', 5, e)
      throw e
    }

    let articles: GdeltArticle[] = []
    try {
      articles = (JSON.parse(raw) as { articles?: GdeltArticle[] }).articles ?? []
    } catch {
      throw new Error('GDELT hat kein JSON geliefert (vermutlich Lastbegrenzung).')
    }

    return articles
      .filter((a) => a.url && a.title)
      .slice(0, q.limit)
      .map((a) => ({
        title: clean(a.title, 250),
        sourceId: 'gdelt',
        sourceName: `GDELT${a.domain ? ` · ${a.domain}` : ''}`,
        sourceTier: 'SECONDARY' as const,
        url: a.url as string,
        publishedAt: gdeltDate(a.seendate),
        retrievedAt: now(),
        excerpt: clean(a.title, 250),
        query: q.query,
        fullTextFetched: false,
      }))
  },
}
