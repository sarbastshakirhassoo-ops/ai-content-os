// ─────────────────────────────────────────────────────────────────────────────
// Universal Brain — Core Types
// Regel: Hier stehen nur Typen, die aktiv verwendet werden.
// Keine Typen "auf Vorrat" für noch nicht gebaute Schritte.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ehrlicher Status einer Integration. Wird von /api/health geliefert und
 * von der UI unverändert angezeigt. Die UI erfindet niemals einen Status.
 *
 * CONNECTED       — implementiert, konfiguriert, letzter Aufruf erfolgreich
 * NOT_CONFIGURED  — implementiert, aber Key/Setup fehlt
 * DISCONNECTED    — implementiert und konfiguriert, aber gerade nicht erreichbar
 * ERROR           — letzter Aufruf ist fehlgeschlagen
 * SIMULATION      — liefert absichtlich Testdaten, niemals als echt ausgeben
 * NOT_IMPLEMENTED — noch nicht gebaut (Roadmap-Schritt steht in `plannedInStep`)
 */
export type ComponentStatus =
  | 'CONNECTED'
  | 'NOT_CONFIGURED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'SIMULATION'
  | 'NOT_IMPLEMENTED'

export interface CapabilityReport {
  /** Stabile ID, z.B. "llm.gemini" */
  id: string
  label: string
  status: ComponentStatus
  /** Kurze Begründung des Status, für Menschen lesbar */
  detail: string
  /** Roadmap-Schritt, der diese Komponente baut — nur bei NOT_IMPLEMENTED */
  plannedInStep?: number
}

export interface HealthResponse {
  /** Wie weit die Roadmap tatsächlich umgesetzt ist */
  roadmapStep: number
  roadmapLabel: string
  checkedAt: string
  capabilities: CapabilityReport[]
}
