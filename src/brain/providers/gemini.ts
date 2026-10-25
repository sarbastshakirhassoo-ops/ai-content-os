// ─────────────────────────────────────────────────────────────────────────────
// Gemini Provider — Google AI Studio, kostenloser Tier
//
// Der API-Key wird ausschliesslich aus process.env gelesen, per Header
// gesendet (nie als Query-Parameter, damit er nicht in URLs oder Logs landet)
// und aus jeder Fehlermeldung entfernt.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LLMError,
  fetchWithTimeout,
  redact,
  type ChatMessage,
  type CompletionRequest,
  type CompletionResult,
  type LLMProvider,
  type ProviderHealth,
} from './types.ts'

const DEFAULT_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Überschreibbar über GEMINI_API_BASE. Zweck: Tests gegen einen lokalen
 * Nachbau der API und spätere Proxys. Ohne die Variable geht jeder Aufruf
 * an Google. Der Nachbau lebt in scripts/mock-gemini.mjs und ist nie Teil
 * der Anwendung.
 */
function apiBase(): string {
  return (process.env.GEMINI_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/+$/, '')
}
// Explizites Modell, kein Alias.
//
// Gemessen am 2026-09-10: Alias-Namen wie gemini-flash-latest bekommen im
// Free Tier ein EIGENES, getrenntes Kontingent von 20 Anfragen. Es war
// erschöpft, während derselbe Aufruf über den expliziten Namen desselben
// Modells (gemini-3.8-flash) weiterhin durchging. Ein Alias ist deshalb als
// Default ungeeignet.
//
// Gegen das Veralten schützt nicht der Alias, sondern der Health-Check: er
// erkennt ein gesperrtes Modell und nennt die verfügbaren Alternativen.
const DEFAULT_MODEL = 'gemini-3.6-flash'
const TIMEOUT_MS = 60_000
const HEALTH_TIMEOUT_MS = 8_000

// Google liefert bei Lastspitzen HTTP 503 "high demand". Das ist vorübergehend
// und war in der Praxis nach wenigen Sekunden vorbei. Ein kurzer Retry
// verhindert, dass eine einzelne Lastspitze die ganze Anfrage scheitern lässt.
const OVERLOAD_RETRIES = 2
const OVERLOAD_BACKOFF_MS = [1_500, 4_000]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Kurzer Cache für health(). Der Probe-Aufruf zählt gegen dasselbe
 * Free-Tier-Kontingent wie echte Anfragen (gemessen: rund 20 Anfragen je
 * Kurzzeitfenster). Bei einer Minute Cache hat allein das Neuladen der
 * Statusseite spürbar Kontingent verbraucht.
 */
let healthCache: { at: number; key: string; model: string; result: ProviderHealth } | null = null
const HEALTH_CACHE_MS = 10 * 60_000

interface GeminiPart { text?: string }
interface GeminiCandidate {
  content?: { parts?: GeminiPart[] }
  finishReason?: string
}
interface GeminiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  error?: { message?: string; status?: string; code?: number }
}
interface GeminiModelList {
  models?: { name?: string; supportedGenerationMethods?: string[] }[]
  error?: { message?: string }
}

/** Gemini kennt kein "system" in contents — das geht in systemInstruction. */
function splitMessages(messages: ChatMessage[]) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  return { system, contents }
}

export class GeminiProvider implements LLMProvider {
  readonly id = 'gemini'
  readonly label = 'Gemini (Google AI Studio)'
  readonly kind = 'cloud' as const

  private get apiKey(): string | undefined {
    const k = process.env.GEMINI_API_KEY?.trim()
    return k && k.length > 0 ? k : undefined
  }

  get model(): string {
    return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  }

  isConfigured(): boolean {
    return this.apiKey !== undefined
  }

  async health(): Promise<ProviderHealth> {
    const key = this.apiKey
    if (key && healthCache && healthCache.key === key && healthCache.model === this.model
        && Date.now() - healthCache.at < HEALTH_CACHE_MS) {
      return healthCache.result
    }
    const result = await this.probeHealth(key)
    if (key) healthCache = { at: Date.now(), key, model: this.model, result }
    return result
  }

  private async probeHealth(key: string | undefined): Promise<ProviderHealth> {
    if (!key) {
      return {
        status: 'NOT_CONFIGURED',
        detail: 'GEMINI_API_KEY ist nicht gesetzt. Kostenlos unter aistudio.google.com/apikey, dann in .env.local eintragen.',
      }
    }

    // Echter Netzwerk-Check: Modell-Liste abrufen und prüfen, ob das
    // konfigurierte Modell wirklich existiert. Kein Raten.
    try {
      const res = await fetchWithTimeout(
        `${apiBase()}/models`,
        { headers: { 'x-goog-api-key': key } },
        HEALTH_TIMEOUT_MS,
      )
      const body = (await res.json().catch(() => ({}))) as GeminiModelList

      if (!res.ok) {
        const msg = redact(body.error?.message || `HTTP ${res.status}`, key)
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          return { status: 'NOT_CONFIGURED', detail: `Key wurde abgelehnt: ${msg}` }
        }
        if (res.status === 429) {
          return { status: 'ERROR', detail: `Rate-Limit erreicht: ${msg}`, model: this.model }
        }
        return { status: 'ERROR', detail: msg, model: this.model }
      }

      const usable = (body.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => (m.name ?? '').replace(/^models\//, ''))

      if (usable.length > 0 && !usable.includes(this.model)) {
        return {
          status: 'ERROR',
          detail: `Modell "${this.model}" kennt dieser Key nicht. Verfügbar unter anderem: ${usable.slice(0, 6).join(', ')}. Über GEMINI_MODEL setzen.`,
          model: this.model,
        }
      }

      // In der Liste zu stehen heisst NICHT, dass das Modell nutzbar ist:
      // Google listet Modelle weiter, die für neue Nutzer bereits gesperrt
      // sind. Nur ein echter Aufruf beweist es.
      const probe = await fetchWithTimeout(
        `${apiBase()}/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        },
        HEALTH_TIMEOUT_MS,
      )

      if (!probe.ok) {
        const pb = (await probe.json().catch(() => ({}))) as GeminiResponse
        const msg = redact(pb.error?.message || `HTTP ${probe.status}`, key)
        if (probe.status === 429) {
          return { status: 'ERROR', detail: `Rate-Limit erreicht: ${msg}`, model: this.model }
        }
        return {
          status: 'ERROR',
          detail: `Modell "${this.model}" ist gelistet, aber nicht nutzbar: ${msg}`,
          model: this.model,
        }
      }

      return {
        status: 'CONNECTED',
        detail: `Erreichbar und nutzbar, ${usable.length} Modelle gelistet.`,
        model: this.model,
      }
    } catch (e) {
      const msg = e instanceof Error && e.name === 'AbortError'
        ? `Zeitüberschreitung nach ${HEALTH_TIMEOUT_MS / 1000}s`
        : redact(String(e), key)
      return { status: 'DISCONNECTED', detail: msg, model: this.model }
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const key = this.apiKey
    if (!key) {
      throw new LLMError('NOT_CONFIGURED', 'GEMINI_API_KEY ist nicht gesetzt.', this.id)
    }

    const started = Date.now()
    const { system, contents } = splitMessages(req.messages)

    const generationConfig: Record<string, unknown> = {}
    if (req.temperature !== undefined) generationConfig.temperature = req.temperature
    if (req.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = req.maxOutputTokens
    if (req.jsonSchema) {
      generationConfig.responseMimeType = 'application/json'
      generationConfig.responseSchema = req.jsonSchema
    }

    const payload: Record<string, unknown> = { contents }
    if (system) payload.systemInstruction = { parts: [{ text: system }] }
    if (Object.keys(generationConfig).length > 0) payload.generationConfig = generationConfig

    let res: Response
    let body: GeminiResponse = {}

    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetchWithTimeout(
          `${apiBase()}/models/${encodeURIComponent(this.model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(payload),
          },
          TIMEOUT_MS,
          req.signal,
        )
      } catch (e) {
        const msg = e instanceof Error && e.name === 'AbortError'
          ? `Zeitüberschreitung nach ${TIMEOUT_MS / 1000}s`
          : redact(String(e), key)
        throw new LLMError('DISCONNECTED', msg, this.id)
      }

      body = (await res.json().catch(() => ({}))) as GeminiResponse
      if (res.ok) break

      const msg = redact(body.error?.message || `HTTP ${res.status}`, key)

      // Vorübergehende Überlastung: kurz warten und erneut versuchen.
      if (res.status === 503 && attempt < OVERLOAD_RETRIES && !req.signal?.aborted) {
        await sleep(OVERLOAD_BACKOFF_MS[attempt] ?? 4_000)
        continue
      }

      if (res.status === 429) throw new LLMError('RATE_LIMITED', msg, this.id)
      if (res.status === 401 || res.status === 403) throw new LLMError('NOT_CONFIGURED', msg, this.id)
      if (res.status === 404) {
        throw new LLMError(
          'ERROR',
          `Modell "${this.model}" ist nicht mehr verfügbar. Über GEMINI_MODEL umstellen; /api/health nennt die verfügbaren Modelle. Google meldet: ${msg}`,
          this.id,
        )
      }
      if (res.status === 503) {
        throw new LLMError('DISCONNECTED', `Nach ${OVERLOAD_RETRIES + 1} Versuchen weiterhin überlastet: ${msg}`, this.id)
      }
      throw new LLMError('ERROR', msg, this.id)
    }

    const candidate = body.candidates?.[0]
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? '').join('')

    if (!text) {
      const reason = candidate?.finishReason ?? 'unbekannt'
      throw new LLMError('ERROR', `Leere Antwort erhalten (finishReason: ${reason}).`, this.id)
    }

    return {
      text,
      providerId: this.id,
      model: this.model,
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount,
        outputTokens: body.usageMetadata?.candidatesTokenCount,
      },
      durationMs: Date.now() - started,
    }
  }
}
