// Kleine, fehlertolerante Hülle um den Trace-Store für den Health-Check.
// Ein kaputter Trace darf /api/health nicht zum Absturz bringen, muss aber
// als ERROR sichtbar werden statt still zu verschwinden.

import { dbLocation as rawDbLocation } from './db'
import { countRuns as rawCountRuns } from './trace'

export function countRuns(): { ok: true; count: number } | { ok: false; error: string } {
  try {
    return { ok: true, count: rawCountRuns() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Pfad relativ zum Projekt, damit keine Verzeichnisstruktur des Rechners nach aussen geht. */
export function dbLocationSafe(): string {
  try {
    const abs = rawDbLocation()
    const cwd = process.cwd()
    return abs.startsWith(cwd) ? '.' + abs.slice(cwd.length) : 'externem Pfad'
  } catch {
    return 'unbekanntem Pfad'
  }
}
