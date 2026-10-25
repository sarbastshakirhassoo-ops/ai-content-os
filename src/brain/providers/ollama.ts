// ─────────────────────────────────────────────────────────────────────────────
// Ollama Provider — lokal, kostenlos, keine Cloud
//
// Status in Schritt 2: implementiert, aber auf diesem Rechner nicht installiert.
// health() meldet das ehrlich als NOT_CONFIGURED bzw. DISCONNECTED und
// blockiert V1 nicht. Wird der primäre Provider für CONFIDENTIAL-Anfragen,
// sobald Ollama läuft (siehe docs/BRAIN-V1-PLAN.md Abschnitt 3).
// ─────────────────────────────────────────────────────────────────────────────

import {
  LLMError,
  fetchWithTimeout,
  type CompletionRequest,
  type CompletionResult,
  type LLMProvider,
  type ProviderHealth,
} from './types.ts'

const DEFAULT_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.1:8b'
const TIMEOUT_MS = 180_000 // lokale Modelle sind langsamer
const HEALTH_TIMEOUT_MS = 3_000

interface OllamaChatResponse {
  message?: { content?: string }
  prompt_eval_count?: number
  eval_count?: number
  error?: string
}
interface OllamaTags {
  models?: { name?: string }[]
}

export class OllamaProvider implements LLMProvider {
  readonly id = 'ollama'
  readonly label = 'Ollama (lokal)'
  readonly kind = 'local' as const

  get baseUrl(): string {
    return (process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  }

  get model(): string {
    return process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL
  }

  /**
   * Ollama braucht keinen Key. "Konfiguriert" heisst hier nur, dass eine
   * Basis-URL existiert. Ob der Dienst läuft, klärt health().
   */
  isConfigured(): boolean {
    return this.baseUrl.length > 0
  }

  async health(): Promise<ProviderHealth> {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {}, HEALTH_TIMEOUT_MS)
      if (!res.ok) {
        return { status: 'ERROR', detail: `HTTP ${res.status} von ${this.baseUrl}`, model: this.model }
      }
      const body = (await res.json().catch(() => ({}))) as OllamaTags
      const installed = (body.models ?? []).map((m) => m.name ?? '')

      if (installed.length === 0) {
        return {
          status: 'NOT_CONFIGURED',
          detail: `Ollama läuft, aber kein Modell installiert. Holen mit: ollama pull ${this.model}`,
          model: this.model,
        }
      }
      if (!installed.includes(this.model)) {
        return {
          status: 'NOT_CONFIGURED',
          detail: `Modell "${this.model}" fehlt. Installiert: ${installed.slice(0, 5).join(', ')}. Holen mit: ollama pull ${this.model}`,
          model: this.model,
        }
      }
      return { status: 'CONNECTED', detail: `Läuft auf ${this.baseUrl}.`, model: this.model }
    } catch {
      return {
        status: 'NOT_CONFIGURED',
        detail: `Ollama ist unter ${this.baseUrl} nicht erreichbar. Installation: ollama.com, danach: ollama pull ${this.model}`,
        model: this.model,
      }
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const started = Date.now()

    const payload: Record<string, unknown> = {
      model: this.model,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        ...(req.maxOutputTokens !== undefined ? { num_predict: req.maxOutputTokens } : {}),
      },
    }
    // Ollama nimmt ein JSON-Schema direkt als `format` entgegen.
    if (req.jsonSchema) payload.format = req.jsonSchema

    let res: Response
    try {
      res = await fetchWithTimeout(
        `${this.baseUrl}/api/chat`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
        TIMEOUT_MS,
        req.signal,
      )
    } catch (e) {
      const msg = e instanceof Error && e.name === 'AbortError'
        ? `Zeitüberschreitung nach ${TIMEOUT_MS / 1000}s`
        : `Ollama unter ${this.baseUrl} nicht erreichbar.`
      throw new LLMError('DISCONNECTED', msg, this.id)
    }

    const body = (await res.json().catch(() => ({}))) as OllamaChatResponse

    if (!res.ok || body.error) {
      throw new LLMError('ERROR', body.error || `HTTP ${res.status}`, this.id)
    }

    const text = body.message?.content ?? ''
    if (!text) throw new LLMError('ERROR', 'Leere Antwort von Ollama.', this.id)

    return {
      text,
      providerId: this.id,
      model: this.model,
      usage: { inputTokens: body.prompt_eval_count, outputTokens: body.eval_count },
      durationMs: Date.now() - started,
    }
  }
}
