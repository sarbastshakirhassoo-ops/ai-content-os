// ─────────────────────────────────────────────────────────────────────────────
// Synthesis — formuliert die endgültige Antwort aus dem, was tatsächlich
// vorliegt.
//
// Zwei Fälle, streng getrennt:
//  - Es gibt Rechercheergebnisse: sie gehen im Envelope in den Prompt, die
//    Antwort belegt Aussagen mit Quellennummern und darf keine Quelle
//    erfinden.
//  - Es gibt keine: die Antwort muss selbst sagen, dass sie ausschliesslich
//    auf Trainingswissen beruht, und darf sich nicht als recherchiert ausgeben.
// ─────────────────────────────────────────────────────────────────────────────

import { complete, type CompletionResult } from './providers/registry'
import { describeForPrompt } from './research/confidence.ts'
import type { EvidenceAssessment } from './research/confidence.ts'
import { buildEnvelope, ENVELOPE_RULES } from './research/envelope.ts'
import type { ResearchDocument } from './research/types.ts'
import type { QueryPlan } from './types'

const BASE_RULES = `Du formulierst die Endantwort eines Recherche-Systems.

Feste Regeln:
- Trenne klar zwischen Fakt, Interpretation und Prognose.
- Nenne offen, worauf deine Aussage beruht.
- Erfinde niemals Quellen, Zahlen, Daten oder Links.
- Wenn du etwas nicht zuverlässig weisst, sage das, statt zu schätzen.
- Keine Gedankenprotokolle, nur das Ergebnis.
- Antworte auf Deutsch.`

export interface SynthesisInput {
  plan: QueryPlan
  documents: ResearchDocument[]
  /** Hat die Research-Schicht überhaupt gelaufen? Unterscheidet "nichts
   *  gefunden" von "gar nicht gesucht" — für den Nutzer ein Unterschied. */
  researchRan: boolean
  /** Deterministisch berechnete Beleglage. Nur vorhanden, wenn recherchiert wurde. */
  evidence?: EvidenceAssessment
}

export function buildSystemPrompt(input: SynthesisInput): string {
  const { plan, documents, researchRan, evidence } = input
  const parts = [BASE_RULES]

  if (documents.length > 0) {
    parts.push(ENVELOPE_RULES)
    parts.push(
      `Stütze deine Antwort auf die Quellen. Wo dein eigenes Wissen über die Quellen
hinausgeht, kennzeichne das ausdrücklich als nicht belegt.
Nenne am Ende unter der Überschrift "Quellen" nur die Nummern, die du tatsächlich
verwendet hast, jeweils mit Titel, Datum und URL. Hänge nicht alle Quellen an.`,
    )
    // Die Einstufung der Beleglage wird gerechnet, nicht vom Modell geschätzt.
    // Das Modell darf sie begründen, aber nicht neu vergeben.
    if (evidence) parts.push(describeForPrompt(evidence))

    if (plan.freshness === 'REALTIME_SENSITIVE' || plan.freshness === 'CURRENT') {
      parts.push(
        `Die Frage ist zeitkritisch (Einstufung ${plan.freshness}). Nenne bei jeder Zahl
das Datum der Quelle. Ist die jüngste Quelle älter, als die Frage es verlangt, sage
das ausdrücklich.`,
      )
    }
  } else if (researchRan) {
    parts.push(
      `WICHTIG: Es wurde recherchiert, aber KEINE belastbare Quelle gefunden.
Sage das klar und deutlich. Gib auf keinen Fall Trainingswissen als aktuellen Fakt aus.
Nenne stattdessen, welche Quelle die Antwort liefern würde und wo sie zu finden ist.
Schliesse mit der Zeile "Belegstärke: NONE".`,
    )
  } else {
    parts.push(
      `WICHTIG: Für diese Antwort stand keine Internet-Recherche zur Verfügung.
Du antwortest ausschliesslich aus deinem Trainingswissen.
Sage das zu Beginn deiner Antwort in einem kurzen Satz.
Schliesse mit der Zeile "Belegstärke: NONE" und einem Satz, dass keine Quellen
abgerufen wurden. Das bewertet die Quellenlage, nicht die Richtigkeit deiner Antwort.`,
    )
    if (plan.needsResearch) {
      parts.push(
        `Die Bedarfsanalyse hat ergeben, dass diese Frage aktuelle Informationen benötigt
(Einstufung ${plan.freshness}). Weise ausdrücklich darauf hin, dass deine Angaben veraltet
sein können, und nenne die Quelle, die den aktuellen Stand liefern würde.`,
      )
    }
  }

  if (plan.needsMemory) {
    parts.push(
      `Die Bedarfsanalyse hat gespeichertes Wissen über den Nutzer für relevant gehalten.
Ein Memory-Speicher existiert noch nicht, es liegen also keine solchen Informationen vor.
Frage nach, statt etwas über den Nutzer anzunehmen.`,
    )
  }

  return parts.join('\n\n')
}

export interface SynthesisOutcome {
  text: string
  completion: CompletionResult
}

export async function synthesize(
  query: string,
  input: SynthesisInput,
  opts: { signal?: AbortSignal } = {},
): Promise<SynthesisOutcome> {
  const envelope = buildEnvelope(input.documents)
  const userContent = envelope ? `${envelope}\n\nFrage des Nutzers:\n${query}` : query

  const completion = await complete({
    messages: [
      { role: 'system', content: buildSystemPrompt(input) },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    sensitivity: input.plan.sensitivity,
    signal: opts.signal,
  })
  return { text: completion.text, completion }
}
