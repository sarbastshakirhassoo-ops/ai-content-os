// ── API Route: /api/video ─────────────────────────────────────────────────────
// POST /api/video  → Video generieren via Engine
// GET  /api/video  → Engine Status + verfügbare Generatoren

import { NextRequest, NextResponse } from 'next/server'
import { getVideoEngine, buildVideoParams } from '@/lib/video-engine/engine'
import { VideoAsset } from '@/lib/video-engine/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── GET: Engine Status ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const engine = getVideoEngine()
    const status = await engine.getStatus()
    return NextResponse.json({ success: true, ...status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST: Video generieren ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { script, assets, jobId, options } = body

    if (!script && !body.topic) {
      return NextResponse.json(
        { error: 'Script oder Topic erforderlich' },
        { status: 400 }
      )
    }

    const engine = getVideoEngine()

    // Params aufbauen
    const rawAssets: VideoAsset[] = (assets || []).map((a: Record<string, unknown>) => ({
      type: a.type || 'image',
      url: a.url || a.src,
      source: a.source || 'pexels',
      license: a.license || 'free',
      duration: a.duration,
      width: a.width,
      height: a.height,
    }))

    const scriptData = {
      topic: body.topic || script?.topic || '',
      hook: body.hook || script?.hook || '',
      script: body.scriptText || script?.sections?.map((s: { text: string }) => s.text).join(' ') || '',
      sections: script?.sections || [],
      hashtags: script?.hashtags || [],
      ...options,
    }

    const params = buildVideoParams(
      jobId || `api-${Date.now()}`,
      scriptData,
      rawAssets
    )

    // Engine-Optionen überschreiben
    if (options?.colorLook) params.colorLook = options.colorLook
    if (options?.musicStyle) params.musicStyle = options.musicStyle
    if (options?.format) params.format = options.format
    if (options?.platform) params.platform = options.platform
    if (options?.effects) params.effects = options.effects
    if (options?.transitions) params.transitions = options.transitions
    if (options?.duration) params.targetDuration = options.duration

    // Render starten
    const result = await engine.generate(params)
    const status = await engine.getStatus()

    return NextResponse.json({
      success: result.success,
      videoUrl: result.outputUrl,
      outputPath: result.outputPath,
      duration: result.duration,
      generatedBy: result.generatorName,
      generatorId: result.generatorId,
      renderTimeMs: result.renderTimeMs,
      assetsUsed: result.assetsUsed,
      metadata: result.metadata,
      error: result.error,
      engineStatus: status,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/video] Fehler:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
