// ── Video Generation Agent (Engine-basiert) ───────────────────────────────────
// Delegiert an VideoGenerationEngine — kein InVideo AI mehr.
// Die Engine wählt automatisch: FFmpeg → Shotstack → Manifest Fallback.

import { BaseAgent, AgentInput, AgentOutput } from './base'
import { getVideoEngine, buildVideoParams } from '@/lib/video-engine/engine'
import { VideoAsset } from '@/lib/video-engine/types'

export class VideoAgent extends BaseAgent {
  slug = 'video-agent'
  name = 'Video Generation Engine'

  validateInput(_input: AgentInput): boolean {
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()

    try {
      const engine = getVideoEngine()

      // ── Assets aus Asset-Manager-Output extrahieren ───────────────────────
      const rawAssets = (input.assets as VideoAsset[] | undefined) || []

      // ── Params aufbauen ───────────────────────────────────────────────────
      const params = buildVideoParams(
        (input.jobId as string) || `job-${Date.now()}`,
        input,
        rawAssets
      )

      // ── Overrides aus Input ───────────────────────────────────────────────
      if (input.colorLook) params.colorLook = input.colorLook as typeof params.colorLook
      if (input.musicStyle) params.musicStyle = input.musicStyle as string
      if (input.format) params.format = input.format as typeof params.format
      if (input.platform) params.platform = input.platform as typeof params.platform
      if (input.effects) params.effects = input.effects as string[]
      if (input.transitions) params.transitions = input.transitions as typeof params.transitions

      // ── Generieren ────────────────────────────────────────────────────────
      const result = await engine.generate(params)
      const engineStatus = await engine.getStatus()

      if (result.success) {
        return this.generateOutput({
          videoUrl: result.outputUrl,
          outputPath: result.outputPath,
          duration: result.duration,
          generatedBy: result.generatorName,
          generatorId: result.generatorId,
          renderTimeMs: result.renderTimeMs,
          assetsUsed: result.assetsUsed,
          metadata: result.metadata,
          format: params.format,
          platform: params.platform,
          colorLook: params.colorLook,
          activeGenerator: engineStatus.activeGenerator?.name,
          allGenerators: engineStatus.allGenerators,
          isManifest: result.generatorId === 'manifest',
          note: result.generatorId === 'manifest'
            ? 'Video-Rezept (JSON) erstellt — FFmpeg-Befehl enthalten. Installiere ffmpeg für automatisches Rendering: brew install ffmpeg'
            : undefined,
        }, start)
      }

      // Auch bei Fehler: Status zurückgeben
      return this.generateOutput({
        error: result.error,
        generatedBy: result.generatorName,
        allGenerators: engineStatus.allGenerators,
        note: 'Alle Generatoren fehlgeschlagen — prüfe Asset Manager und API Keys',
      }, start)

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[VideoAgent] Fehler:', msg)
      return this.generateOutput({ error: msg }, start)
    }
  }
}
