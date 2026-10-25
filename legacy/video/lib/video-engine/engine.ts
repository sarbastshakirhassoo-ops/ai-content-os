// ── Video Generation Engine — Orchestrator ────────────────────────────────────
// Wählt automatisch den besten verfügbaren Generator (Priorität 1→999).
// Neue Generatoren können jederzeit via registerGenerator() hinzugefügt werden.

import {
  VideoGenerator,
  VideoGenerationParams,
  VideoGenerationResult,
  EngineStatus,
  GeneratorStatus,
} from './types'
import { FFmpegGenerator } from './generators/ffmpeg-generator'
import { ShotstackGenerator } from './generators/shotstack-generator'
import { ManifestGenerator } from './generators/manifest-generator'

export class VideoGenerationEngine {
  private generators: VideoGenerator[]

  constructor() {
    // Standard-Generatoren nach Priorität — niedriger = wird zuerst versucht
    this.generators = [
      new FFmpegGenerator(),     // Priority 1: Lokal, kostenlos, beste Qualität
      new ShotstackGenerator(),  // Priority 2: API, freemium (25 renders/Monat gratis)
      new ManifestGenerator(),   // Priority 999: Immer verfügbar, JSON-Rezept
    ]
    this.sortGenerators()
  }

  // ── Alle Generatoren prüfen + aktiven zurückgeben ─────────────────────────
  async getStatus(): Promise<EngineStatus> {
    const allStatuses = await Promise.all(
      this.generators.map(g => g.checkAvailability())
    )
    const activeGenerator = allStatuses.find(s => s.available) ?? null
    return { activeGenerator, allGenerators: allStatuses }
  }

  // ── Video generieren — versucht Generatoren in Prioritätsreihenfolge ──────
  async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const ordered = [...this.generators].sort((a, b) => a.priority - b.priority)

    for (const generator of ordered) {
      const status = await generator.checkAvailability()
      if (!status.available) {
        console.log(`[VideoEngine] Überspringe ${generator.name}: ${status.reason}`)
        continue
      }

      console.log(`[VideoEngine] Versuche Generator: ${generator.name} (Priority ${generator.priority})`)

      try {
        const result = await generator.generate(params)
        if (result.success) {
          console.log(`[VideoEngine] Erfolg mit ${generator.name} in ${result.renderTimeMs}ms`)
          return result
        }
        console.warn(`[VideoEngine] ${generator.name} fehlgeschlagen: ${result.error} — nächster...`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[VideoEngine] ${generator.name} Exception: ${msg} — nächster...`)
      }
    }

    return {
      success: false,
      generatorId: 'none',
      generatorName: 'No Generator Available',
      error: 'Alle verfügbaren Generatoren sind fehlgeschlagen — kein Output produziert',
    }
  }

  // ── Plugin-System: neuen Generator hinzufügen ─────────────────────────────
  registerGenerator(generator: VideoGenerator): void {
    const existing = this.generators.findIndex(g => g.id === generator.id)
    if (existing >= 0) {
      this.generators[existing] = generator
      console.log(`[VideoEngine] Generator überschrieben: ${generator.id}`)
    } else {
      this.generators.push(generator)
      console.log(`[VideoEngine] Neuer Generator registriert: ${generator.id}`)
    }
    this.sortGenerators()
  }

  // ── Generator entfernen ───────────────────────────────────────────────────
  unregisterGenerator(id: string): boolean {
    const idx = this.generators.findIndex(g => g.id === id)
    if (idx >= 0) {
      this.generators.splice(idx, 1)
      return true
    }
    return false
  }

  // ── Verfügbare Generator-IDs ──────────────────────────────────────────────
  getGeneratorIds(): string[] {
    return this.generators.map(g => g.id)
  }

  private sortGenerators(): void {
    this.generators.sort((a, b) => a.priority - b.priority)
  }
}

// ── Singleton Instanz (per-process) ──────────────────────────────────────────
let _engineInstance: VideoGenerationEngine | null = null

export function getVideoEngine(): VideoGenerationEngine {
  if (!_engineInstance) {
    _engineInstance = new VideoGenerationEngine()
  }
  return _engineInstance
}

// ── Hilfsfunktion: Standard-Params aus Script-Output bauen ───────────────────
export function buildVideoParams(
  jobId: string,
  scriptData: Record<string, unknown>,
  assets: VideoGenerationParams['assets'] = []
): VideoGenerationParams {
  const sections = (scriptData.sections as Array<{ text: string; label: string; visualNote?: string }>) || []
  const hook = (scriptData.hook as string) || ''
  const topic = (scriptData.topic as string) || ''

  const scenes = sections.map((s, i) => ({
    id: `scene-${i}`,
    index: i,
    text: s.text,
    duration: 8,
    keywords: s.visualNote
      ? s.visualNote.split(/[,.\s]+/).filter(w => w.length > 3).slice(0, 4)
      : [topic],
    cameraMove: (i % 2 === 0 ? 'zoom-in' : 'zoom-out') as 'zoom-in' | 'zoom-out',
    textOverlay: i === 0 ? hook : undefined,
  }))

  const words = (scriptData.script as string || '').split(' ')
  const subtitles = words.reduce((acc, word, i) => {
    if (i % 5 === 0) {
      const chunk = words.slice(i, i + 5).join(' ')
      acc.push({ start: i * 0.5, end: i * 0.5 + 2.5, text: chunk })
    }
    return acc
  }, [] as VideoGenerationParams['subtitles'])

  return {
    jobId,
    title: topic,
    script: (scriptData.script as string) || sections.map(s => s.text).join(' '),
    hook,
    scenes,
    assets,
    musicStyle: 'cinematic',
    colorLook: 'cinematic-dark',
    subtitles,
    transitions: 'crossfade',
    effects: ['filmGrain', 'vignette'],
    format: '9:16',
    platform: 'instagram-reels',
    hashtags: (scriptData.hashtags as string[]) || [],
    targetDuration: 30,
  }
}
