// ─────────────────────────────────────────────────────────────────────────────
// Recency-Filter — rein deterministisch, ohne LLM und ohne Netzwerk.
//
// Bewusst von plan.ts getrennt: dadurch ist er ohne API-Key testbar, und die
// Regel bleibt nachvollziehbar statt in einem Modellaufruf zu verschwinden.
// Siehe docs/BRAIN-V1-PLAN.md Abschnitt 4.
// ─────────────────────────────────────────────────────────────────────────────

import type { Freshness, FreshnessAdjustment, QueryPlan } from './types.ts'

/** Aufsteigende Strenge — der Filter darf nur nach oben korrigieren. */
export const FRESHNESS_RANK: Record<Freshness, number> = {
  EVERGREEN: 0,
  SLOW_CHANGING: 1,
  CURRENT: 2,
  REALTIME_SENSITIVE: 3,
}

// Bewusste Abweichung vom Plandokument: die dort genannten Einzelwörter "kurs"
// und "preis" sind als Teilwörter zu unscharf. "Diskurs", "Preiselastizität"
// und "Preistheorie" sind Evergreen-Themen und dürfen keine Recherche
// erzwingen. Sie stehen deshalb als Wortgruppen in der Liste.
const TRIGGERS: { re: RegExp; to: Freshness; label: string }[] = [
  {
    re: /\b(heute|jetzt|gerade eben|soeben|breaking|in diesem moment)\b/i,
    to: 'REALTIME_SENSITIVE',
    label: 'Bezug auf den heutigen Tag',
  },
  {
    re: /\b(aktuelle[rns]?|momentane[rns]?|derzeitige[rns]?)\s+(kurs|kurse|preis|preise|stand|zinssatz|zinsen|wert)\b/i,
    to: 'REALTIME_SENSITIVE',
    label: 'aktueller Kurs, Preis oder Zinssatz',
  },
  {
    re: /\b(aktuell|aktuelle[rns]?|derzeit|derzeitige[rns]?|momentan|neueste[rns]?|latest|jüngste[rns]?)\b/i,
    to: 'CURRENT',
    label: 'Formulierung verlangt Aktualität',
  },
  {
    re: /\b(diese woche|diesen monat|dieses jahr|letzte woche|zuletzt)\b/i,
    to: 'CURRENT',
    label: 'enger Zeitbezug',
  },
]

/**
 * Verschärft die Frische-Einstufung, wenn die Formulierung Aktualität verlangt.
 * Asymmetrisch: der Filter kann Frische erzwingen, aber das Modell kann das
 * System nie dazu bewegen, ältere Daten zu akzeptieren.
 *
 * Verändert `plan` an Ort und Stelle und gibt die Anpassung zurück, damit sie
 * im Trace sichtbar wird.
 */
export function applyRecencyFilter(query: string, plan: QueryPlan): FreshnessAdjustment | null {
  let best: { to: Freshness; label: string } | null = null
  for (const t of TRIGGERS) {
    if (!t.re.test(query)) continue
    if (!best || FRESHNESS_RANK[t.to] > FRESHNESS_RANK[best.to]) best = { to: t.to, label: t.label }
  }
  if (!best) return null
  if (FRESHNESS_RANK[best.to] <= FRESHNESS_RANK[plan.freshness]) return null

  const from = plan.freshness
  plan.freshness = best.to
  // Wer frische Daten braucht, braucht Recherche.
  plan.needsResearch = true
  return { from, to: best.to, trigger: best.label }
}
