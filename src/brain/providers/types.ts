// ─────────────────────────────────────────────────────────────────────────────
// LLM Provider — Vertrag
//
// REGEL: Ausserhalb von src/brain/providers/ darf kein Modul einen konkreten
// Anbieter importieren. Brain-Code kennt ausschliesslich dieses Interface und
// holt Instanzen über registry.ts. Durchgesetzt von scripts/check-boundaries.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentStatus } from '@/types'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

/**
 * Vertraulichkeit einer Anfrage. In Schritt 2 wird das Feld gesetzt und
 * durchgereicht; durchgesetzt wird es, sobald ein lokaler Provider bereitsteht.
 * Siehe docs/BRAIN-V1-PLAN.md Abschnitt 3.
 */
export type Sensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'

export interface CompletionRequest {
  messages: ChatMessage[]
  temperature?: number
  maxOutputTokens?: number
  /**
   * JSON-Schema für strukturierte Ausgabe. Wird ab Schritt 3 vom Planner
   * gebraucht. Provider, die das nicht können, müssen es sauber ablehnen
   * statt still Freitext zu liefern.
   */
  jsonSchema?: Record<string, unknown>
  sensitivity?: Sensitivity
  signal?: AbortSignal
}

export interface CompletionResult {
  text: string
  providerId: string
  model: string
  usage?: { inputTokens?: number; outputTokens?: number }
  durationMs: number
}

export interface ProviderHealth {
  status: ComponentStatus
  detail: string
  /** Modell, das tatsächlich verwendet würde — nur wenn bekannt */
  model?: string
}

/** Fehlerarten, auf die Aufrufer reagieren können, ohne Strings zu parsen. */
export type LLMErrorKind =
  | 'NOT_CONFIGURED'
  | 'DISCONNECTED'
  | 'RATE_LIMITED'
  | 'UNSUPPORTED'
  | 'ERROR'

export class LLMError extends Error {
  constructor(
    readonly kind: LLMErrorKind,
    message: string,
    readonly providerId?: string,
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export interface LLMProvider {
  readonly id: string
  readonly label: string
  readonly kind: 'cloud' | 'local'
  /** Ist der Provider grundsätzlich einsatzbereit (Key/URL gesetzt)? Kein Netzwerk. */
  isConfigured(): boolean
  /** Echter Zustand inklusive Netzwerkprüfung. Wirft nie, meldet stattdessen. */
  health(): Promise<ProviderHealth>
  complete(req: CompletionRequest): Promise<CompletionResult>
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

/**
 * Entfernt Secrets aus Text, bevor er in Logs oder API-Antworten landet.
 * Wird auf jede Fehlermeldung angewendet, die aus einer Provider-Antwort stammt.
 */
export function redact(text: string, ...secrets: (string | undefined)[]): string {
  let out = text
  for (const s of secrets) {
    if (s && s.length >= 8) out = out.split(s).join('[REDACTED]')
  }
  // Generische Key-Muster, falls ein Secret aus anderer Quelle durchrutscht
  return out
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/(key|token|secret)=[^&\s]+/gi, '$1=[REDACTED]')
}

/** fetch mit Timeout, das den übergebenen AbortSignal respektiert. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
