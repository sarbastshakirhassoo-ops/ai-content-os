#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Test-Fixture: bildet die Gemini-API nach, um den Produktionspfad des
// GeminiProvider ohne echten API-Key zu prüfen.
//
// NICHT Teil der Anwendung. Wird ausschliesslich von
// scripts/test-provider.sh gestartet und danach beendet.
// Die Anwendung selbst simuliert niemals eine Modellantwort.
// ─────────────────────────────────────────────────────────────────────────────

import { createServer } from 'node:http'

const PORT = Number(process.env.MOCK_PORT || 4610)
const VALID_KEY = 'test-key-not-a-real-secret'

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const key = req.headers['x-goog-api-key']

  const json = (code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json' })
    res.end(JSON.stringify(obj))
  }

  // Prüfung 1: Der Key darf NIE im Query-String stehen.
  if (url.searchParams.has('key')) {
    return json(500, { error: { message: 'FIXTURE-FEHLER: Key stand im Query-String' } })
  }

  // Prüfung 2: Falscher Key -> 401. Die Fehlermeldung enthält absichtlich
  // den Key, um zu beweisen, dass der Provider ihn herausredigiert.
  if (key !== VALID_KEY) {
    return json(401, { error: { message: `API key not valid: ${key}`, status: 'UNAUTHENTICATED' } })
  }

  if (url.pathname.endsWith('/models')) {
    return json(200, {
      models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
      ],
    })
  }

  if (url.pathname.includes(':generateContent')) {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      const body = JSON.parse(raw || '{}')
      const userText = body.contents?.[0]?.parts?.[0]?.text ?? ''

      if (userText === 'TRIGGER_RATE_LIMIT') {
        return json(429, { error: { message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } })
      }

      // Echo, damit der Test beweisen kann, dass Request und Response
      // korrekt durch die ganze Kette laufen.
      return json(200, {
        candidates: [{ content: { parts: [{ text: `FIXTURE-ANTWORT auf: ${userText}` }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7 },
      })
    })
    return
  }

  json(404, { error: { message: `Unbekannter Pfad: ${url.pathname}` } })
})

server.listen(PORT, () => console.log(`mock-gemini läuft auf http://localhost:${PORT}`))
