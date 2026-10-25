// ─────────────────────────────────────────────────────────────────────────────
// Provider Registry — die einzige Stelle, die konkrete Anbieter kennt.
//
// Brain-Code importiert ausschliesslich von hier und aus ./types.
// Ein Provider-Wechsel ist eine Änderung an BRAIN_LLM_PROVIDER, kein Codeumbau.
// ─────────────────────────────────────────────────────────────────────────────

import { GeminiProvider } from './gemini'
import { OllamaProvider } from './ollama'
import {
  LLMError,
  type CompletionRequest,
  type CompletionResult,
  type LLMErrorKind,
  type LLMProvider,
  type ProviderHealth,
} from './types'

const PROVIDERS: LLMProvider[] = [new GeminiProvider(), new OllamaProvider()]

/** Reihenfolge, in der Provider probiert werden: primärer zuerst, dann Rest. */
function orderedProviders(): LLMProvider[] {
  const preferred = process.env.BRAIN_LLM_PROVIDER?.trim().toLowerCase()
  if (!preferred) return PROVIDERS
  const primary = PROVIDERS.filter((p) => p.id === preferred)
  const rest = PROVIDERS.filter((p) => p.id !== preferred)
  return [...primary, ...rest]
}

export function listProviders(): LLMProvider[] {
  return [...PROVIDERS]
}

export function getProvider(id: string): LLMProvider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

/** Der konfigurierte primäre Provider — auch wenn er gerade nicht bereit ist. */
export function primaryProviderId(): string {
  return orderedProviders()[0].id
}

export async function providerHealth(): Promise<Record<string, ProviderHealth>> {
  const entries = await Promise.all(
    PROVIDERS.map(async (p) => [p.id, await p.health()] as const),
  )
  return Object.fromEntries(entries)
}

export interface CompleteOptions extends CompletionRequest {
  /** Erzwingt einen bestimmten Provider. Ohne Angabe greift die Reihenfolge. */
  providerId?: string
  /** Bei true wird kein Fallback probiert. Default: false. */
  noFallback?: boolean
}

/**
 * Führt eine Completion aus. Sucht den ersten konfigurierten Provider in der
 * Reihenfolge und fällt bei Netzwerk- oder Konfigurationsproblemen auf den
 * nächsten zurück. Ein Rate-Limit ist kein Fallback-Grund für denselben
 * Provider, wohl aber ein Grund, den nächsten zu probieren.
 *
 * Ist kein Provider einsatzbereit, wird NOT_CONFIGURED geworfen — nie eine
 * erfundene Antwort zurückgegeben.
 */
export async function complete(opts: CompleteOptions): Promise<CompletionResult> {
  const { providerId, noFallback, ...req } = opts

  const candidates = providerId
    ? [getProvider(providerId)].filter((p): p is LLMProvider => p !== undefined)
    : orderedProviders()

  if (candidates.length === 0) {
    throw new LLMError('NOT_CONFIGURED', `Unbekannter Provider: ${providerId}`)
  }

  const attempts = noFallback || providerId ? candidates.slice(0, 1) : candidates
  const failures: { id: string; kind: LLMErrorKind; message: string }[] = []

  for (const p of attempts) {
    // Nicht konfigurierte Provider werden nicht still übersprungen. Ihr Grund
    // gehört in die Fehlermeldung, sonst sieht der Nutzer nur den Folgefehler
    // des nächsten Providers. health() macht in genau diesem Fall kein Netzwerk.
    if (!p.isConfigured()) {
      const h = await p.health()
      failures.push({ id: p.id, kind: 'NOT_CONFIGURED', message: h.detail })
      continue
    }
    try {
      return await p.complete(req)
    } catch (e) {
      const err = e instanceof LLMError ? e : new LLMError('ERROR', String(e), p.id)
      failures.push({ id: p.id, kind: err.kind, message: err.message })
      // Ein Abbruch durch den Aufrufer wird nicht weggefallbackt.
      if (req.signal?.aborted) throw err
    }
  }

  // Die Fehlerart darf nicht verloren gehen. Ein Rate-Limit und ein fehlender
  // Key verlangen vom Nutzer völlig verschiedene Reaktionen, und ein reines
  // Konfigurationsproblem ist kein Laufzeitfehler.
  const setupOnly = failures.every(
    (f) => f.kind === 'NOT_CONFIGURED' || f.kind === 'DISCONNECTED',
  )
  const detail = failures.map((f) => `${f.id}: ${f.message}`).join(' | ')

  if (setupOnly) {
    throw new LLMError('NOT_CONFIGURED', `Kein LLM-Provider einsatzbereit — ${detail}`)
  }
  if (failures.some((f) => f.kind === 'RATE_LIMITED')) {
    throw new LLMError('RATE_LIMITED', `Rate-Limit — ${detail}`)
  }
  throw new LLMError('ERROR', `Alle Provider fehlgeschlagen — ${detail}`)
}

export { LLMError }
export type { LLMProvider, ProviderHealth, CompletionResult, CompletionRequest }
