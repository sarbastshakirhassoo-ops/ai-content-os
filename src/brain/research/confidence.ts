// ─────────────────────────────────────────────────────────────────────────────
// Belegstärke — wie gut ist die Antwort durch Quellen gedeckt?
//
// Bewusst deterministisch und ohne LLM. Begründung: eine Confidence, die das
// Modell selbst vergibt, ist eine Behauptung über die eigene Sicherheit und
// damit genau die Art Selbsteinschätzung, der man nicht trauen kann. Was hier
// gerechnet wird, ist nachprüfbar: wie viele Quellen welcher Stufe, wie alt,
// wie viele ohne Datum.
//
// WICHTIG zur Benennung: das Ergebnis sagt etwas über die BELEGLAGE aus, nicht
// über die Wahrheit der Antwort. Eine gut belegte Aussage kann falsch sein,
// eine schlecht belegte richtig. Die Oberfläche beschriftet das deshalb als
// "Belegstärke" und nicht als Sicherheit.
//
// Siehe docs/BRAIN-V1-PLAN.md, Abschnitt Uncertainty.
// ─────────────────────────────────────────────────────────────────────────────

import type { Freshness } from '../types.ts'
import type { ResearchDocument } from './types.ts'

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface EvidenceAssessment {
  level: ConfidenceLevel
  /** Konkrete, nachprüfbare Beobachtungen. Keine Wertungen. */
  reasons: string[]
  primaryCount: number
  secondaryCount: number
  communityCount: number
  /** Alter der jüngsten datierten Quelle in Stunden. */
  newestAgeHours: number | null
  /** Quellen, die kein Veröffentlichungsdatum mitliefern. */
  undatedCount: number
  /** Ist mindestens eine Quelle jung genug für die geforderte Klasse? */
  freshEnough: boolean
  /** Wie viele verschiedene Quellen-Adapter beigetragen haben. */
  distinctSources: number
}

/**
 * Wie frisch eine Quelle höchstens sein darf, damit sie die Frage der
 * jeweiligen Klasse noch beantworten kann. Grosszügiger als die
 * Cache-Lebensdauer: ein drei Tage alter Artikel kann eine CURRENT-Frage
 * durchaus beantworten, er darf nur nicht als tagesaktuell verkauft werden.
 */
const MAX_AGE_HOURS: Record<Freshness, number> = {
  EVERGREEN: Number.POSITIVE_INFINITY,
  SLOW_CHANGING: 365 * 24,
  CURRENT: 14 * 24,
  REALTIME_SENSITIVE: 48,
}

function ageHours(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) ? ms / 3_600_000 : null
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function assessEvidence(
  documents: ResearchDocument[],
  freshness: Freshness,
): EvidenceAssessment {
  const primary = documents.filter((d) => d.sourceTier === 'PRIMARY')
  const secondary = documents.filter((d) => d.sourceTier === 'SECONDARY')
  const community = documents.filter((d) => d.sourceTier === 'COMMUNITY')
  const distinctSources = new Set(documents.map((d) => d.sourceId)).size

  const ages = documents
    .map((d) => ageHours(d.publishedAt))
    .filter((a): a is number => a !== null)
  const newestAgeHours = ages.length > 0 ? Math.min(...ages) : null
  const undatedCount = documents.length - ages.length

  const limit = MAX_AGE_HOURS[freshness]
  const freshEnough = newestAgeHours !== null && newestAgeHours <= limit

  const base = {
    primaryCount: primary.length,
    secondaryCount: secondary.length,
    communityCount: community.length,
    newestAgeHours,
    undatedCount,
    freshEnough,
    distinctSources,
  }

  if (documents.length === 0) {
    return {
      ...base,
      level: 'NONE',
      reasons: ['Es wurde keine einzige Quelle gefunden.'],
    }
  }

  const reasons: string[] = []

  // ── Beleglage beschreiben ─────────────────────────────────────────────────
  if (primary.length > 0) {
    const names = [...new Set(primary.map((d) => d.sourceName))].slice(0, 3).join(', ')
    reasons.push(`${plural(primary.length, 'Primärquelle', 'Primärquellen')} (${names}).`)
  } else {
    reasons.push('Keine Primärquelle dabei, nur Aggregatoren oder Community.')
  }

  if (secondary.length > 0) reasons.push(`${plural(secondary.length, 'Sekundärquelle', 'Sekundärquellen')}.`)
  if (community.length > 0 && primary.length === 0 && secondary.length === 0) {
    reasons.push('Ausschliesslich Community-Quellen. Taugt für Stimmung, nicht für Fakten.')
  }

  // ── Aktualität gegen die Anforderung halten ───────────────────────────────
  if (newestAgeHours === null) {
    reasons.push('Keine einzige Quelle nennt ein Veröffentlichungsdatum.')
  } else {
    const h = Math.round(newestAgeHours)
    const age = h < 48 ? `${h} Stunden` : `${Math.round(h / 24)} Tage`
    if (freshEnough) {
      reasons.push(`Jüngste Quelle ist ${age} alt, das genügt für die Einstufung ${freshness}.`)
    } else {
      reasons.push(`Jüngste Quelle ist ${age} alt. Für die Einstufung ${freshness} ist das zu alt.`)
    }
  }

  if (undatedCount > 0 && newestAgeHours !== null) {
    reasons.push(`${plural(undatedCount, 'Quelle', 'Quellen')} ohne Datum, Aktualität dort nicht prüfbar.`)
  }

  if (distinctSources === 1) {
    reasons.push('Alle Treffer stammen aus derselben Quelle, keine unabhängige Bestätigung.')
  }

  // ── Einstufung ────────────────────────────────────────────────────────────
  //
  // HIGH verlangt dreierlei zugleich: eine Primärquelle, ausreichende
  // Aktualität und mindestens zwei unabhängige Quellen. Fällt eines davon
  // weg, ist es höchstens MEDIUM.
  let level: ConfidenceLevel
  if (primary.length === 0 && secondary.length === 0) {
    level = 'LOW'
  } else if (!freshEnough) {
    level = 'LOW'
  } else if (distinctSources === 1) {
    level = 'LOW'
  } else if (primary.length > 0 && distinctSources >= 2) {
    level = 'HIGH'
  } else {
    level = 'MEDIUM'
  }

  return { ...base, level, reasons }
}

/** Formuliert die Einstufung für die Systemanweisung der Synthese. */
export function describeForPrompt(a: EvidenceAssessment): string {
  const head: Record<ConfidenceLevel, string> = {
    HIGH: 'Die Beleglage ist gut (HIGH).',
    MEDIUM: 'Die Beleglage ist mittel (MEDIUM).',
    LOW: 'Die Beleglage ist schwach (LOW).',
    NONE: 'Es gibt keine Beleglage (NONE).',
  }
  return [
    head[a.level],
    ...a.reasons.map((r) => `- ${r}`),
    '',
    `Schliesse deine Antwort mit einer Zeile "Belegstärke: ${a.level}" ab und nenne in`,
    'höchstens zwei Sätzen, warum. Stütze dich dabei auf die oben genannten Beobachtungen,',
    'erfinde keine zusätzlichen. Die Einstufung beschreibt die Quellenlage, nicht die',
    'Wahrheit deiner Aussage. Stelle das nicht anders dar.',
  ].join('\n')
}
