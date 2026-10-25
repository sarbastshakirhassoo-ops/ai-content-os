// RSS- und Atom-Parser ohne Abhängigkeit.
//
// Geerntet aus legacy/video/agents/trend-agent.ts (parseRSS) und erweitert:
// zusätzlich Atom-Einträge, Veröffentlichungsdatum und Beschreibung, die das
// Original verworfen hat. Die dortige Scoring-Logik mit Math.random ist
// bewusst NICHT übernommen worden.

export interface FeedItem {
  title: string
  link: string
  publishedAt: string | null
  description: string
}

function tag(block: string, name: string): string {
  const m =
    block.match(new RegExp(`<${name}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${name}>`, 'i')) ??
    block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1].trim() : ''
}

function atomLink(block: string): string {
  const m = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
  return m ? m[1] : ''
}

export function parseFeed(xml: string, limit = 20): FeedItem[] {
  const blocks = [
    ...(xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []),
  ]

  const items: FeedItem[] = []
  for (const b of blocks.slice(0, limit)) {
    const title = tag(b, 'title')
    const link = tag(b, 'link') || atomLink(b)
    if (!title || !link) continue
    const raw = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')
    const d = raw ? new Date(raw) : null
    items.push({
      title,
      link,
      publishedAt: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null,
      description: tag(b, 'description') || tag(b, 'summary') || tag(b, 'content'),
    })
  }
  return items
}
