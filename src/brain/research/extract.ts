// ─────────────────────────────────────────────────────────────────────────────
// Volltext-Extraktion.
//
// Die meisten Quellen liefern nur Überschrift und Anriss. Für die besten
// Treffer wird die Seite selbst geholt und der Lesetext extrahiert.
//
// Fehlschläge sind normal und kein Fehler des Laufs: Paywalls, Bot-Sperren,
// Zeitüberschreitungen. Das Dokument behält dann seinen Anriss und
// fullTextFetched bleibt false.
// ─────────────────────────────────────────────────────────────────────────────

import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import { clean, fetchText } from './http.ts'
import type { ResearchDocument } from './types.ts'

const TIMEOUT_MS = 8_000
const MAX_EXCERPT = 1_800

/** Hosts, bei denen sich der Versuch erfahrungsgemäss nicht lohnt. */
const SKIP_HOSTS = [
  'news.google.com', // Weiterleitungsseite ohne Inhalt
  'news.ycombinator.com', // Diskussionsseite, der Anriss ist bereits aussagekräftig
]

function extractReadable(html: string, url: string): string {
  const { document } = parseHTML(html)
  // Readability braucht eine Basis-URL für relative Links.
  try {
    const article = new Readability(document as unknown as Document).parse()
    if (article?.textContent && article.textContent.trim().length > 200) {
      return clean(article.textContent, MAX_EXCERPT)
    }
  } catch {
    // Readability wirft bei ungewöhnlichem Markup — dann greift der Fallback.
  }
  // Fallback: sichtbarer Text ohne Skripte und Stile.
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
  void url
  return clean(body, MAX_EXCERPT)
}

/**
 * Holt für die übergebenen Dokumente den Volltext, so weit es geht.
 * Verändert Kopien, nicht die Eingabe. Gibt zusätzlich zurück, wie oft es
 * geklappt hat — die Zahl gehört in den Trace.
 */
export async function enrichWithFullText(
  docs: ResearchDocument[],
  opts: { max: number; signal?: AbortSignal },
): Promise<{ documents: ResearchDocument[]; fetched: number; failed: number }> {
  const targets = docs.slice(0, opts.max)
  let fetched = 0
  let failed = 0

  const enriched = await Promise.all(
    targets.map(async (doc) => {
      let host = ''
      try {
        host = new URL(doc.url).host
      } catch {
        return doc
      }
      if (SKIP_HOSTS.some((h) => host.endsWith(h))) return doc

      try {
        const html = await fetchText(doc.url, {
          signal: opts.signal,
          timeoutMs: TIMEOUT_MS,
          accept: 'text/html,application/xhtml+xml',
        })
        const text = extractReadable(html, doc.url)
        if (text.length < 200) {
          failed++
          return doc
        }
        fetched++
        return { ...doc, excerpt: text, fullTextFetched: true }
      } catch {
        failed++
        return doc
      }
    }),
  )

  return { documents: [...enriched, ...docs.slice(opts.max)], fetched, failed }
}
