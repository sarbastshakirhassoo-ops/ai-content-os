import { NextResponse } from 'next/server'
import { listProviders, primaryProviderId } from '@/brain/providers/registry'
import { countRuns, dbLocationSafe } from '@/brain/health-probe'
import { countCacheEntries, listSources } from '@/brain/research/index'
import type { CapabilityReport, HealthResponse } from '@/types'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// Capability Report — die einzige Wahrheitsquelle für Integrations-Status.
//
// REGEL: Eine Komponente darf hier erst einen anderen Status als
// NOT_IMPLEMENTED bekommen, wenn sie tatsächlich Code besitzt, der einen
// echten externen Aufruf macht. Provider-Status kommt aus einem echten
// Netzwerk-Check, nicht aus der Anwesenheit einer Umgebungsvariable.
// ─────────────────────────────────────────────────────────────────────────────

const ROADMAP_STEP = 4
const ROADMAP_LABEL = 'Visual Brain in einfacher Form aktiv — Quellenvertrauen folgt in Schritt 5'

function notImplemented(id: string, label: string, step: number, detail: string): CapabilityReport {
  return { id, label, status: 'NOT_IMPLEMENTED', detail, plannedInStep: step }
}

export async function GET() {
  const primary = primaryProviderId()

  // Echte Health-Checks, parallel und mit eigenem Timeout je Provider.
  const providerReports: CapabilityReport[] = await Promise.all(
    listProviders().map(async (p): Promise<CapabilityReport> => {
      const h = await p.health()
      const role = p.id === primary ? 'primär' : 'Fallback'
      return {
        id: `llm.${p.id}`,
        label: `LLM · ${p.label} (${role})`,
        status: h.status,
        detail: h.model ? `${h.detail} Modell: ${h.model}.` : h.detail,
      }
    }),
  )

  // Der Orchestrator kann ohne einsatzbereites Modell nichts tun. Sein Status
  // ergibt sich deshalb aus dem der Provider, nicht daraus, dass die Datei existiert.
  const anyProviderUp = providerReports.some((p) => p.status === 'CONNECTED')
  const orchestrator: CapabilityReport = anyProviderUp
    ? {
        id: 'brain.orchestrator',
        label: 'Central Brain · Orchestrator',
        status: 'CONNECTED',
        detail: 'Planner, Research und Synthesis laufen. Memory fehlt noch und wird im Trace als übersprungen vermerkt.',
      }
    : {
        id: 'brain.orchestrator',
        label: 'Central Brain · Orchestrator',
        status: 'NOT_CONFIGURED',
        detail: 'Implementiert, aber kein LLM-Provider einsatzbereit. Ohne Modell kann nicht geplant werden.',
      }

  // Trace: echter Zugriff auf die Datenbank, keine Existenzannahme.
  const traceProbe = countRuns()
  const trace: CapabilityReport = traceProbe.ok
    ? {
        id: 'brain.trace',
        label: 'Central Brain · Trace',
        status: 'CONNECTED',
        detail: `SQLite unter ${dbLocationSafe()} erreichbar, ${traceProbe.count} Läufe gespeichert.`,
      }
    : {
        id: 'brain.trace',
        label: 'Central Brain · Trace',
        status: 'ERROR',
        detail: `Trace-Datenbank nicht lesbar: ${traceProbe.error}`,
      }

  // Quellen-Registry: echte Zahlen aus der Registry, kein fester Text.
  const sources = listSources()
  const available = sources.filter((x) => x.status() === 'AVAILABLE')
  const tiers = ['PRIMARY', 'SECONDARY', 'COMMUNITY'] as const
  const byTier = tiers.map((t) => `${available.filter((x) => x.tier === t).length} ${t}`).join(', ')
  let cacheNote = ''
  try {
    cacheNote = ` Cache: ${countCacheEntries()} Einträge.`
  } catch {
    cacheNote = ''
  }
  const researchRegistry: CapabilityReport = available.length > 0
    ? {
        id: 'research.sources',
        label: 'Internet · Source Registry',
        status: 'CONNECTED',
        detail: `${available.length} von ${sources.length} Quellen verfügbar (${byTier}), alle ohne Key.${cacheNote}`,
      }
    : {
        id: 'research.sources',
        label: 'Internet · Source Registry',
        status: 'ERROR',
        detail: 'Keine Quelle verfügbar.',
      }

  const capabilities: CapabilityReport[] = [
    ...providerReports,
    orchestrator,
    trace,
    researchRegistry,
    {
      id: 'research.extract',
      label: 'Internet · Volltext-Extraktion',
      status: 'CONNECTED',
      detail: 'Readability holt für die bestbewerteten Treffer den Lesetext. Paywalls und Bot-Sperren bleiben zu.',
    },
    notImplemented('memory.store', 'Memory · SQLite', 6,
      'Kein Memory-Store vorhanden. Es wird derzeit nichts gespeichert.'),
    {
      id: 'ui.brainflow',
      label: 'Visual Brain · React Flow',
      status: 'CONNECTED',
      detail: 'Einfache Ansicht unter /brain. Die Knoten spiegeln ausschliesslich den echten Trace; der Ausbau folgt in Schritt 7.',
    },
    notImplemented('voice.stt', 'Voice · Speech to Text', 8,
      'Web Speech API noch nicht angebunden.'),
    notImplemented('voice.tts', 'Voice · Text to Speech', 8,
      'Web Speech API noch nicht angebunden.'),
  ]

  const body: HealthResponse = {
    roadmapStep: ROADMAP_STEP,
    roadmapLabel: ROADMAP_LABEL,
    checkedAt: new Date().toISOString(),
    capabilities,
  }

  return NextResponse.json(body)
}
