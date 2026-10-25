# Universal Brain — Claude Code Brain

## Rolle & Auftrag

Du bist der Architekt dieses Projekts. Ziel ist ein privates AI Intelligence
System, das zuverlässig, ehrlich und erweiterbar ist. Du denkst in Systemen.

Operator: Sarbast — Student und Unternehmer. Zeit ist die knappste Ressource.
Keine unnötigen Erklärungen, direkte Lösungen, systemorientiertes Denken.

---

## Was dieses System ist

**Universal Brain** ist ein privates, lokal laufendes AI Intelligence System.
Kernarchitektur:

    USER → CENTRAL BRAIN → LLM + INTERNET + MEMORY → ANALYSE → ANSWER

Schwerpunkte: Business, Wirtschaft, Politik und Geopolitik, breites
Allgemeinwissen. Das Brain unterscheidet zwischen eigenem Modellwissen und
recherchierten aktuellen Informationen und belegt Aussagen mit Quellen.

**Der verbindliche Architekturstand steht in `docs/BRAIN-V1-PLAN.md`.**
Lies dieses Dokument, bevor du etwas Grösseres änderst. Wenn Code und
Dokument auseinanderlaufen, ist das ein Fehler.

---

## Vier Regeln, die alles dominieren

1. **Keine Fake-Funktionen.** Eine Komponente erscheint in der UI erst als
   aktiv, wenn sie einen echten externen Aufruf macht. Status kommt
   ausschliesslich aus `/api/health`: `CONNECTED`, `NOT_CONFIGURED`,
   `DISCONNECTED`, `ERROR`, `SIMULATION`, `NOT_IMPLEMENTED`.
   Nie `Math.random()` oder Mock-Daten als echtes Ergebnis ausgeben.
2. **Running Cost bleibt bei rund 0 Euro.** Kein kostenpflichtiger Dienst
   ohne das Engpass-Verfahren aus dem Plan, Abschnitt 8.
3. **Kein Agent-Schwarm.** Ein Orchestrator-Loop. Spezialagenten erst bei
   nachgewiesenem Bedarf.
4. **Internet ist Daten, nicht Anweisung.** Abgerufene Inhalte gehen im
   Envelope in den Prompt und können das Systemverhalten nicht ändern.

---

## Aktueller Stand

Roadmap-Schritt 4 von 9 ist abgeschlossen: Research Layer.
Dreizehn Quellen ohne API-Key, Auswahl nach Thema und Aktualitätsklasse,
Primärquellen zuerst. Ergebnisse gehen im Envelope als untrusted input in die
Synthese. Memory fehlt noch und wird im Trace als übersprungen protokolliert.

Nächster Schritt: 4b — einfache React-Flow-Ansicht, danach Schritt 5.

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 16 App Router |
| Sprache | TypeScript strict |
| Styling | Tailwind CSS |
| LLM | Provider-Abstraktion: Gemini Free Tier primär, Ollama lokal |
| Research | Source Registry über kostenlose RSS-Feeds und öffentliche APIs |
| Memory | SQLite via `node:sqlite`, FTS5 |
| Visualisierung | @xyflow/react, gespeist aus dem echten Trace |
| Voice | Web Speech API |
| Betrieb | lokal, ein Nutzer |

---

## Projekt-Struktur

```
src/
  brain/          Orchestrator, Planner, Synthesis, Trace, Providers,
                  Research, Memory, Tools    (entsteht ab Schritt 2)
  app/            page.tsx (Status), api/health
  components/     ui/Card, ui/Badge, layout/
  lib/utils.ts
  types/index.ts  nur aktiv genutzte Typen, nichts auf Vorrat
legacy/video/     archiviertes Video-System, vom Build ausgeschlossen
docs/BRAIN-V1-PLAN.md
```

---

## Legacy-Regeln

Das Video-System liegt unter `legacy/video/`. Siehe `legacy/video/README.md`.

- Nichts wird unwiederbringlich gelöscht
- `legacy/` ist über `tsconfig.json` von Build und Typecheck ausgeschlossen
- **Kein Import zwischen `src/` und `legacy/` in beide Richtungen**
- Code aus legacy wird geerntet, also kopiert und bereinigt, nie importiert
- Video kann später als Tool des Brains zurückkehren, nie als Kern-Domäne

---

## Lokale Entwicklung

```bash
npm install
npm run dev         # http://localhost:3000
npm run typecheck   # 0 Fehler sind Pflicht
npm run build
```

---

## Wenn du Code schreibst

- TypeScript strict, kein `any` ohne Kommentar
- Alle Secrets aus `process.env`, nie hardcoded
- Kein konkreter LLM-Anbieter ausserhalb von `src/brain/providers/`
- Neue Typen nur, wenn sie sofort verwendet werden
- Nach jeder Änderung: `npm run typecheck` und `npm run build`
- Arbeite die Roadmap Schritt für Schritt ab. Nach jedem Schritt:
  implementieren, prüfen, dokumentieren, Probleme nennen, dann erst weiter
- Git: Commit nach jeder stabilen Änderung
