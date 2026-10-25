// ─────────────────────────────────────────────────────────────────────────────
// POST /api/brain/query — Anfrage an das Central Brain.
//
// Antwortet als Server-Sent-Events, damit die Oberfläche jeden Schritt sieht,
// sobald er passiert, statt am Ende einen fertigen Block zu bekommen.
// ─────────────────────────────────────────────────────────────────────────────

import { runQuery } from '@/brain/orchestrator'
import type { BrainEvent } from '@/brain/types'

export const dynamic = 'force-dynamic'

const MAX_QUERY_CHARS = 4_000

export async function POST(request: Request) {
  let body: { query?: unknown }
  try {
    body = (await request.json()) as { query?: unknown }
  } catch {
    return Response.json({ error: 'Ungültiges JSON im Request-Body.' }, { status: 400 })
  }

  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) return Response.json({ error: 'Feld "query" fehlt oder ist leer.' }, { status: 400 })
  if (query.length > MAX_QUERY_CHARS) {
    return Response.json(
      { error: `Anfrage zu lang (${query.length} Zeichen, erlaubt sind ${MAX_QUERY_CHARS}).` },
      { status: 413 },
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: BrainEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))
        } catch {
          // Verbindung vom Client geschlossen — der Lauf wird trotzdem
          // zu Ende geführt und im Trace abgeschlossen.
        }
      }
      try {
        await runQuery(query, { onEvent: send, signal: request.signal })
      } catch {
        // runQuery hat den Fehler bereits als Ereignis gesendet und im Trace
        // als failed vermerkt. Hier nichts erneut melden.
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}
