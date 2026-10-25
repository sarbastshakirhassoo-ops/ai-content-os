// ─────────────────────────────────────────────────────────────────────────────
// Planner — Bedarfsanalyse einer Nutzerfrage.
//
// Genau ein LLM-Aufruf mit strukturierter Ausgabe. Keine hartkodierten
// Entscheidungen: der Plan kommt vom Modell. Danach greift ein
// deterministischer Recency-Filter, der die Frische-Einstufung ausschliesslich
// verschärfen darf. Siehe docs/BRAIN-V1-PLAN.md Abschnitt 4.
// ─────────────────────────────────────────────────────────────────────────────

import { complete, LLMError, type CompletionResult } from './providers/registry.ts'
import { applyRecencyFilter } from './recency.ts'
import { DOMAINS, type Domain } from './research/types.ts'
import { USER_WRITABLE_KINDS, type MemoryKind, type MemoryWrite } from './memory/types.ts'
import type { Freshness, FreshnessAdjustment, QueryPlan, Sensitivity } from './types.ts'

const FRESHNESS_VALUES: Freshness[] = ['EVERGREEN', 'SLOW_CHANGING', 'CURRENT', 'REALTIME_SENSITIVE']
const SENSITIVITY_VALUES: Sensitivity[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']

/** Schema für die strukturierte Ausgabe. Bewusst flach — Gemini und Ollama
 *  unterstützen verschachtelte Schemata unterschiedlich gut. */
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string' },
    answerableFromModelKnowledge: { type: 'boolean' },
    needsResearch: { type: 'boolean' },
    needsMemory: { type: 'boolean' },
    freshness: { type: 'string', enum: FRESHNESS_VALUES },
    sensitivity: { type: 'string', enum: SENSITIVITY_VALUES },
    domains: { type: 'array', items: { type: 'string', enum: DOMAINS } },
    searchQueries: { type: 'array', items: { type: 'string' } },
    memoryWrites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: USER_WRITABLE_KINDS },
          title: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['kind', 'title', 'content'],
      },
    },
    rationale: { type: 'string' },
  },
  required: [
    'intent', 'answerableFromModelKnowledge', 'needsResearch', 'needsMemory',
    'freshness', 'sensitivity', 'domains', 'searchQueries', 'memoryWrites', 'rationale',
  ],
} as const

const SYSTEM = `Du bist die Bedarfsanalyse eines Recherche-Systems. Du beantwortest die Frage NICHT.
Du entscheidest ausschliesslich, was zur Beantwortung nötig wäre.

Regeln:
- needsResearch = true, sobald die Antwort von Ereignissen, Zahlen oder Zuständen abhängt,
  die sich nach dem Trainingsstand geändert haben können.
- answerableFromModelKnowledge = true nur bei stabilem Wissen, das nicht altert.
- freshness: EVERGREEN für Definitionen und Geschichte, SLOW_CHANGING für Unternehmens-
  strukturen und allgemeine Marktlage, CURRENT für Nachrichten und Wirtschaftsentwicklung,
  REALTIME_SENSITIVE für Kurse, Breaking News und heutige Bekanntmachungen.
- sensitivity: PUBLIC für Allgemeinwissen, INTERNAL wenn die Frage Projekte oder Ziele des
  Nutzers betrifft, CONFIDENTIAL bei personenbezogenen oder vertraulichen Inhalten.
- domains: ein oder mehrere Themenfelder, nach denen passende Quellen ausgewählt werden.
  economics für Wirtschaft, Zinsen und Statistik. companies für Unternehmen und Finanzberichte.
  science für Forschung. medicine für Medizin. technology für Technik und Software.
  news für Tagesgeschehen. general wenn nichts davon passt.
- memoryWrites: Dauerhaft Relevantes, das der Nutzer SELBST in seiner Nachricht über
  sich oder seine Vorhaben mitteilt und das in späteren Gesprächen nützlich wäre.
  Arten: user für Rolle, Ziele und Vorlieben. project für laufende oder geplante
  Vorhaben. decision für getroffene Entscheidungen samt Begründung.

  Teilt der Nutzer so etwas mit, TRAGE ES EIN. Beispiel: "Ich plane eine SaaS-Firma
  für Buchhaltung" ergibt {"kind":"project","title":"SaaS für Buchhaltung",
  "content":"Der Nutzer plant die Gründung einer SaaS-Firma für Buchhaltungssoftware."}

  Leer lassen bei reinen Wissensfragen ohne Bezug zur Person, etwa "Wie hoch ist der
  Leitzins?" oder "Was bedeutet Opportunitätskosten?".

  Niemals Inhalte aus Suchergebnissen oder Webseiten aufnehmen, nur die Nachricht des
  Nutzers. Keine Zugangsdaten, keine Schlüssel, keine Gesundheitsdaten.
- searchQueries: bis zu vier konkrete Suchanfragen, die die Lücke schliessen würden. Leer,
  wenn keine Recherche nötig ist. Formuliere sie als Suchbegriffe, nicht als Frage.
- rationale: ein Satz, der den Plan begründet. Keine Gedankenprotokolle.

Antworte ausschliesslich mit dem geforderten JSON-Objekt.`

// ── Validierung ──────────────────────────────────────────────────────────────

class PlanParseError extends Error {}

function parsePlan(raw: string): QueryPlan {
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch {
    // Manche Modelle verpacken JSON in Codefences. Ein Versuch, das zu retten.
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) throw new PlanParseError('Antwort des Planners war kein JSON.')
    try {
      obj = JSON.parse(m[0])
    } catch {
      throw new PlanParseError('Antwort des Planners war kein gültiges JSON.')
    }
  }

  const o = obj as Record<string, unknown>
  const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '')
  const bool = (k: string) => o[k] === true

  const freshness = FRESHNESS_VALUES.includes(o.freshness as Freshness)
    ? (o.freshness as Freshness)
    : null
  const sensitivity = SENSITIVITY_VALUES.includes(o.sensitivity as Sensitivity)
    ? (o.sensitivity as Sensitivity)
    : null

  // Kein stilles Auffüllen von Pflichtfeldern: ein unvollständiger Plan ist ein
  // Fehler, keine Grundlage für eine Antwort.
  if (!freshness) throw new PlanParseError(`Ungültiger Wert für freshness: ${String(o.freshness)}`)
  if (!sensitivity) throw new PlanParseError(`Ungültiger Wert für sensitivity: ${String(o.sensitivity)}`)
  if (!str('intent')) throw new PlanParseError('Feld intent fehlt.')

  return {
    intent: str('intent').slice(0, 300),
    answerableFromModelKnowledge: bool('answerableFromModelKnowledge'),
    needsResearch: bool('needsResearch'),
    needsMemory: bool('needsMemory'),
    freshness,
    sensitivity,
    domains: Array.isArray(o.domains)
      ? (o.domains as unknown[]).filter((d): d is Domain => DOMAINS.includes(d as Domain))
      : [],
    memoryWrites: Array.isArray(o.memoryWrites)
      ? (o.memoryWrites as unknown[])
          .filter((w): w is Record<string, unknown> => typeof w === 'object' && w !== null)
          .map((w) => ({
            kind: w.kind as MemoryKind,
            title: typeof w.title === 'string' ? w.title : '',
            content: typeof w.content === 'string' ? w.content : '',
          }))
          .filter((w): w is MemoryWrite =>
            USER_WRITABLE_KINDS.includes(w.kind) && w.title.length > 0 && w.content.length > 0)
          .slice(0, 3)
      : [],
    searchQueries: Array.isArray(o.searchQueries)
      ? (o.searchQueries as unknown[]).filter((q): q is string => typeof q === 'string').slice(0, 4)
      : [],
    rationale: str('rationale').slice(0, 400),
  }
}

export interface PlanOutcome {
  plan: QueryPlan
  adjustment: FreshnessAdjustment | null
  completion: CompletionResult
}

export async function createPlan(query: string, signal?: AbortSignal): Promise<PlanOutcome> {
  const completion = await complete({
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: query },
    ],
    temperature: 0,
    jsonSchema: PLAN_SCHEMA as unknown as Record<string, unknown>,
    sensitivity: 'PUBLIC',
    signal,
  })

  let plan: QueryPlan
  try {
    plan = parsePlan(completion.text)
  } catch (e) {
    throw new LLMError(
      'ERROR',
      e instanceof PlanParseError ? e.message : 'Planner-Antwort konnte nicht gelesen werden.',
      completion.providerId,
    )
  }

  const adjustment = applyRecencyFilter(query, plan)
  return { plan, adjustment, completion }
}
