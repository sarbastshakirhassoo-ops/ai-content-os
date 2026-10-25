// ─────────────────────────────────────────────────────────────────────────────
// Community-Quellen: Hacker News und Reddit.
//
// Tier COMMUNITY. Nützlich für Trends, Stimmung, Produktfeedback und frühe
// Hinweise. NIE als Beleg für harte Fakten — das erzwingt die Systemanweisung
// der Synthese, nicht die Höflichkeit des Modells.
// ─────────────────────────────────────────────────────────────────────────────

import { clean, fetchJson, fetchText, isThrottleError, isoDate, ThrottledError } from '../http.ts'
import { parseFeed } from '../rss.ts'
import type { ResearchDocument, SourceDefinition, SourceQuery } from '../types.ts'

const now = () => new Date().toISOString()

// ── Hacker News ──────────────────────────────────────────────────────────────
//
// Geerntet aus legacy/video/agents/trend-agent.ts (fetchHackerNews), dort fest
// auf die Frontpage verdrahtet. Hier mit echter Suchanfrage.

interface HnHit {
  objectID?: string
  title?: string
  story_title?: string
  url?: string
  story_url?: string
  points?: number
  num_comments?: number
  created_at?: string
}

export const hackerNews: SourceDefinition = {
  id: 'hackernews',
  name: 'Hacker News',
  tier: 'COMMUNITY',
  baseUrl: 'https://hn.algolia.com',
  domains: ['technology', 'companies', 'news'],
  serves: ['REALTIME_SENSITIVE', 'CURRENT'],
  requiresKey: false,
  description: 'Tech- und Startup-Community. Gut für frühe Hinweise, nie als Faktenbeleg.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const url =
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q.query)}` +
      `&tags=story&hitsPerPage=${q.limit}`
    const j = await fetchJson<{ hits?: HnHit[] }>(url, { signal: q.signal })

    return (j.hits ?? [])
      .filter((h) => (h.title ?? h.story_title) && h.objectID)
      .slice(0, q.limit)
      .map((h) => ({
        title: clean(h.title ?? h.story_title, 250),
        sourceId: 'hackernews',
        sourceName: 'Hacker News',
        sourceTier: 'COMMUNITY' as const,
        // Bewusst der Diskussionslink: er ist stabil und zeigt den Kontext.
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        publishedAt: isoDate(h.created_at),
        retrievedAt: now(),
        excerpt:
          `Diskussion auf Hacker News: "${clean(h.title ?? h.story_title, 200)}"` +
          `${h.points !== undefined ? `, ${h.points} Punkte` : ''}` +
          `${h.num_comments !== undefined ? `, ${h.num_comments} Kommentare` : ''}` +
          `${h.url ?? h.story_url ? `. Verlinkter Artikel: ${h.url ?? h.story_url}` : ''}`,
        query: q.query,
        fullTextFetched: false,
      }))
  },
}

// ── Reddit ───────────────────────────────────────────────────────────────────
//
// Der JSON-Endpunkt antwortet inzwischen mit 403 (gemessen 2026-09-11), auch
// mit Browser-User-Agent. Der RSS-Endpunkt funktioniert weiterhin ohne Key
// und wird deshalb verwendet. Geerntet aus trend-agent.ts (fetchReddit), dort
// noch über den heute blockierten JSON-Pfad.

export const reddit: SourceDefinition = {
  id: 'reddit',
  name: 'Reddit',
  tier: 'COMMUNITY',
  baseUrl: 'https://www.reddit.com',
  domains: ['technology', 'companies', 'general', 'news'],
  serves: ['REALTIME_SENSITIVE', 'CURRENT'],
  requiresKey: false,
  description: 'Meinungen und Nutzerprobleme über den RSS-Endpunkt. Nie als Faktenbeleg.',
  // Gemessen 2026-09-11: der zweite Aufruf innerhalb weniger hundert
  // Millisekunden endet in HTTP 429.
  minIntervalMs: 3_000,
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const url =
      `https://www.reddit.com/search.rss?q=${encodeURIComponent(q.query)}` +
      `&sort=new&limit=${q.limit}`
    let xml: string
    try {
      xml = await fetchText(url, { signal: q.signal, accept: 'application/atom+xml' })
    } catch (e) {
      if (isThrottleError(e)) throw new ThrottledError('Reddit', 3, e)
      throw e
    }

    return parseFeed(xml, q.limit * 2)
      .slice(0, q.limit)
      .map((it) => ({
        title: clean(it.title, 250),
        sourceId: 'reddit',
        sourceName: 'Reddit',
        sourceTier: 'COMMUNITY' as const,
        url: it.link,
        publishedAt: it.publishedAt,
        retrievedAt: now(),
        excerpt: clean(it.description, 400) || clean(it.title, 250),
        query: q.query,
        fullTextFetched: false,
      }))
  },
}
