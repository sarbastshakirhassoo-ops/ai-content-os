// ─────────────────────────────────────────────────────────────────────────────
// POST /api/llm/complete
//
// Minimaler echter LLM-Aufruf. Beweist Schritt 2 der Roadmap:
// USER -> Provider Layer -> echtes Modell -> echte Antwort.
//
// Diese Route kennt keinen konkreten Anbieter. Sie spricht ausschliesslich
// mit der Registry.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { complete, LLMError, listProviders } from '@/brain/providers/registry'

export const dynamic = 'force-dynamic'

const MAX_PROMPT_CHARS = 8_000

interface Body {
  prompt?: unknown
  providerId?: unknown
  temperature?: unknown
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON im Request-Body.' }, { status: 400 })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return NextResponse.json({ error: 'Feld "prompt" fehlt oder ist leer.' }, { status: 400 })
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `Prompt zu lang (${prompt.length} Zeichen, erlaubt sind ${MAX_PROMPT_CHARS}).` },
      { status: 413 },
    )
  }

  const providerId =
    typeof body.providerId === 'string' && body.providerId.length > 0 ? body.providerId : undefined
  if (providerId && !listProviders().some((p) => p.id === providerId)) {
    return NextResponse.json({ error: `Unbekannter Provider: ${providerId}` }, { status: 400 })
  }

  const temperature = typeof body.temperature === 'number' ? body.temperature : undefined

  try {
    const result = await complete({
      messages: [{ role: 'user', content: prompt }],
      temperature,
      providerId,
      sensitivity: 'PUBLIC',
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof LLMError) {
      const status =
        e.kind === 'NOT_CONFIGURED' ? 503 :
        e.kind === 'RATE_LIMITED'   ? 429 :
        e.kind === 'DISCONNECTED'   ? 502 : 500
      // e.message ist bereits durch die Provider von Secrets bereinigt.
      return NextResponse.json({ error: e.message, kind: e.kind, providerId: e.providerId }, { status })
    }
    return NextResponse.json({ error: 'Unerwarteter Fehler.', kind: 'ERROR' }, { status: 500 })
  }
}
