// Gemeinsame HTTP-Hilfen für alle Quellen-Adapter.
// Ein Adapter macht niemals einen nackten fetch: hier sitzen Timeout,
// User-Agent und die Grössenbegrenzung an einer Stelle.

const DEFAULT_TIMEOUT_MS = 12_000
const MAX_BYTES = 4_000_000

/**
 * Mehrere Quellen (SEC, Crossref, OpenAlex) verlangen oder belohnen einen
 * identifizierenden User-Agent. Die Adresse ist konfigurierbar, damit keine
 * private Mailadresse fest im Code steht.
 */
export function userAgent(): string {
  const contact = process.env.RESEARCH_CONTACT?.trim() || 'universal-brain@localhost'
  return `universal-brain/0.1 (${contact})`
}

export interface FetchOptions {
  signal?: AbortSignal
  timeoutMs?: number
  headers?: Record<string, string>
  accept?: string
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  opts.signal?.addEventListener('abort', onAbort)

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': userAgent(),
        ...(opts.accept ? { accept: opts.accept } : {}),
        ...opts.headers,
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} von ${new URL(url).host}`)

    const len = Number(res.headers.get('content-length') ?? 0)
    if (len > MAX_BYTES) throw new Error(`Antwort zu gross (${len} Bytes)`)

    const text = await res.text()
    if (text.length > MAX_BYTES) throw new Error(`Antwort zu gross (${text.length} Zeichen)`)
    return text
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onAbort)
  }
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, { accept: 'application/json', ...opts })
  return JSON.parse(text) as T
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g

/** Entfernt Markup und Steuerzeichen, kürzt auf eine für Prompts sinnvolle Länge. */
export function clean(text: string | undefined | null, maxChars = 600): string {
  if (!text) return ''
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars)
}

/**
 * Erkennt, ob ein Fehler von einer Drosselung stammt.
 *
 * Gedrosselte Dienste antworten unterschiedlich: GDELT lässt Verbindungen
 * auflaufen oder schickt 429, Reddit schickt 429, andere brechen die
 * Verbindung ab. Für den Trace ist der Unterschied zwischen "gedrosselt" und
 * "kaputt" entscheidend, deshalb wird er hier einmal zentral gezogen.
 */
export function isThrottleError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /HTTP 429|Connect Timeout|fetch failed|operation was aborted|Zeitüberschreitung/i.test(msg)
}

export class ThrottledError extends Error {
  constructor(source: string, intervalSeconds: number, cause: unknown) {
    super(
      `${source} drosselt: eine Anfrage je ${intervalSeconds} Sekunden. ` +
      `Ursprüngliche Meldung: ${cause instanceof Error ? cause.message : String(cause)}`,
    )
    this.name = 'ThrottledError'
  }
}

/** Normalisiert ein Datum auf ISO oder null. Nie raten. */
export function isoDate(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
