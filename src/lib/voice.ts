// ─────────────────────────────────────────────────────────────────────────────
// Sprache — Ein- und Ausgabe über die Web Speech API des Browsers.
//
// Kostenlos, kein Schlüssel, keine Serverkomponente. Bewusst als austauschbare
// Schicht gebaut: der Rest der Anwendung spricht nur mit diesen Funktionen,
// nicht mit der Browser-API. Ein späterer Wechsel auf Whisper oder Deepgram
// berührt nur diese Datei.
//
// Zwei ehrliche Einschränkungen, die die Oberfläche auch benennt:
//  - Spracherkennung gibt es nur in Chrome und Safari. Firefox kann es nicht.
//  - Chrome schickt das Audio zur Erkennung an Google. Wer das nicht will,
//    tippt. Deshalb ist Sprache abschaltbar und standardmässig aus.
// ─────────────────────────────────────────────────────────────────────────────

// Die Web Speech API ist nicht in den Standard-Typen von TypeScript enthalten.
// Deshalb hier nur das Minimum, das wirklich verwendet wird.
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  readonly length: number
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionResultListLike {
  readonly length: number
  [index: number]: SpeechRecognitionResultLike
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface VoiceSupport {
  stt: boolean
  tts: boolean
  /** Warum etwas fehlt, für die Anzeige. */
  note: string
}

export function voiceSupport(): VoiceSupport {
  if (typeof window === 'undefined') return { stt: false, tts: false, note: 'Nur im Browser verfügbar.' }
  const stt = recognitionCtor() !== null
  const tts = typeof window.speechSynthesis !== 'undefined'
  const notes: string[] = []
  if (!stt) notes.push('Spracherkennung fehlt in diesem Browser. Chrome oder Safari nutzen.')
  if (!tts) notes.push('Sprachausgabe fehlt in diesem Browser.')
  return { stt, tts, note: notes.join(' ') }
}

// ── Eingabe ──────────────────────────────────────────────────────────────────

export interface DictationHandlers {
  /** Zwischenstand, während gesprochen wird. */
  onPartial?: (text: string) => void
  /** Endgültig erkannter Text. */
  onFinal: (text: string) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

export interface Dictation {
  stop: () => void
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'Zugriff auf das Mikrofon wurde abgelehnt.',
  'service-not-allowed': 'Die Spracherkennung ist in diesem Browser gesperrt.',
  'no-speech': 'Nichts gehört.',
  'audio-capture': 'Kein Mikrofon gefunden.',
  network: 'Die Spracherkennung konnte den Dienst nicht erreichen.',
  aborted: 'Aufnahme abgebrochen.',
}

/**
 * Startet die Diktierfunktion. Gibt null zurück, wenn der Browser sie nicht
 * kann — der Aufrufer muss das behandeln, statt ein totes Mikrofon anzuzeigen.
 */
export function startDictation(handlers: DictationHandlers, lang = 'de-DE'): Dictation | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null

  const rec = new Ctor()
  rec.lang = lang
  rec.continuous = false
  rec.interimResults = true

  rec.onresult = (e) => {
    let partial = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      const text = r[0]?.transcript ?? ''
      if (r.isFinal) handlers.onFinal(text.trim())
      else partial += text
    }
    if (partial) handlers.onPartial?.(partial.trim())
  }
  rec.onerror = (e) => handlers.onError?.(ERROR_TEXT[e.error] ?? `Fehler der Spracherkennung: ${e.error}`)
  rec.onend = () => handlers.onEnd?.()

  try {
    rec.start()
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : String(e))
    return null
  }
  return { stop: () => rec.stop() }
}

// ── Ausgabe ──────────────────────────────────────────────────────────────────

/**
 * Entfernt Markup, Quellenblöcke und URLs, bevor vorgelesen wird.
 * Ohne das liest die Stimme Sternchen, eckige Klammern und ganze URLs vor.
 */
export function speakableText(answer: string): string {
  return answer
    // Quellenliste am Ende weglassen, die ist zum Lesen, nicht zum Hören.
    // Der Zeilenanfang ist optional: eine Antwort kann auch mit der Liste beginnen.
    .replace(/(^|\n)\s*Quellen:[\s\S]*$/i, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#`>]/g, '')
    .replace(/\[(\d+(?:,\s*\d+)*)\]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function speak(text: string, lang = 'de-DE'): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  const clean = speakableText(text)
  if (!clean) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = lang
  u.rate = 1.05
  window.speechSynthesis.speak(u)
  return true
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
}

export function isSpeaking(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis?.speaking
}
