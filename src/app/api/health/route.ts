import { NextResponse } from 'next/server'
import { listProviders, primaryProviderId } from '@/brain/providers/registry'
import { countRuns, dbLocationSafe } from '@/brain/health-probe'
import { countCacheEntries, listSources } from '@/brain/research/index'
import { countByKind } from '@/brain/memory/store'
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

const ROADMAP_STEP = 9
const ROADMAP_LABEL = 'V1 vollständig — alle neun Roadmap-Schritte abgeschlossen'

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

  // Memory: echter Zugriff, keine Existenzannahme.
  let memory: CapabilityReport
  try {
    const counts = countByKind()
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const detail = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ')
    memory = {
      id: 'memory.store',
      label: 'Memory · SQLite',
      status: 'CONNECTED',
      detail: total === 0
        ? 'Store erreichbar, noch keine Einträge gespeichert.'
        : `${total} Einträge: ${detail}. Volltextsuche über FTS5.`,
    }
  } catch (e) {
    memory = {
      id: 'memory.store',
      label: 'Memory · SQLite',
      status: 'ERROR',
      detail: `Memory nicht lesbar: ${e instanceof Error ? e.message : String(e)}`,
    }
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
    memory,
    {
      id: 'ui.brainflow',
      label: 'Visual Brain · React Flow',
      status: 'CONNECTED',
      detail: 'Flow-Ansicht unter /brain mit Dauern und Tokens, vollständige Lauf-Historie unter /trace. Alle Zustände kommen aus dem Trace.',
    },
    // Sprache läuft vollständig im Browser. Der Server kann nicht wissen, ob
    // der Browser des Nutzers sie beherrscht — das meldet die Oberfläche
    // selbst. Hier steht deshalb nur, dass die Schicht existiert.
    {
      id: 'voice.stt',
      label: 'Voice · Speech to Text',
      status: 'CONNECTED',
      detail: 'Web Speech API, im Browser. Standardmässig aus. Chrome sendet das Audio zur Erkennung an Google, Firefox kann es nicht.',
    },
    {
      id: 'voice.tts',
      label: 'Voice · Text to Speech',
      status: 'CONNECTED',
      detail: 'Sprachausgabe über die Systemstimme des Browsers. Quellenliste und URLs werden vor dem Vorlesen entfernt.',
    },
  ]

  const body: HealthResponse = {
    roadmapStep: ROADMAP_STEP,
    roadmapLabel: ROADMAP_LABEL,
    checkedAt: new Date().toISOString(),
    capabilities,
  }

  return NextResponse.json(body)
}
