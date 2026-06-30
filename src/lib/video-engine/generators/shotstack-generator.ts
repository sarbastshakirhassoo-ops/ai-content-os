// ── Generator 2: Shotstack API (Priority 2) ───────────────────────────────────
// Freemium: 25 Render/Monat kostenlos. Kein Download nötig.
// API Key: https://shotstack.io (kostenloser Account)
// Env: SHOTSTACK_API_KEY
// Docs: https://shotstack.io/docs/api/

import {
  VideoGenerator,
  VideoGenerationParams,
  VideoGenerationResult,
  GeneratorStatus,
} from '../types'

const SHOTSTACK_API = 'https://api.shotstack.io/v1'
const SHOTSTACK_STAGE_API = 'https://api.shotstack.io/stage/v1' // für Sandbox/Testing

// Mixkit kostenlose Musik (kein API Key nötig)
const MUSIC_TRACKS: Record<string, string> = {
  cinematic:    'https://cdn.mixkit.co/music/preview/mixkit-life-is-a-dream-837-short.mp3',
  motivational: 'https://cdn.mixkit.co/music/preview/mixkit-running-motivation-37-short.mp3',
  ambient:      'https://cdn.mixkit.co/music/preview/mixkit-dreaming-big-31-short.mp3',
  luxury:       'https://cdn.mixkit.co/music/preview/mixkit-cinematic-mystery-61-short.mp3',
  default:      'https://cdn.mixkit.co/music/preview/mixkit-tech-house-vibes-130-short.mp3',
}

export class ShotstackGenerator implements VideoGenerator {
  readonly id = 'shotstack'
  readonly name = 'Shotstack API'
  readonly description = 'Cloud Video Renderer — 25 Renders/Monat kostenlos. API Key auf shotstack.io erstellen.'
  readonly type = 'api' as const
  readonly priority = 2
  readonly cost = 'freemium' as const

  async checkAvailability(): Promise<GeneratorStatus> {
    const apiKey = process.env.SHOTSTACK_API_KEY
    if (!apiKey) {
      return {
        id: this.id,
        name: this.name,
        available: false,
        type: this.type,
        priority: this.priority,
        cost: this.cost,
        reason: 'SHOTSTACK_API_KEY nicht gesetzt — kostenloser Account: shotstack.io',
        requiresApiKey: true,
        apiKeyEnvVar: 'SHOTSTACK_API_KEY',
      }
    }

    // Optional: API erreichbar?
    try {
      const res = await fetch(`${this.getApiUrl()}/render`, {
        method: 'HEAD',
        headers: { 'x-api-key': apiKey },
      })
      // 405 Method Not Allowed = API erreichbar (HEAD nicht erlaubt, aber Route existiert)
      const reachable = res.status < 500 || res.status === 405
      return {
        id: this.id,
        name: this.name,
        available: reachable,
        type: this.type,
        priority: this.priority,
        cost: this.cost,
        reason: reachable ? 'API Key gültig und erreichbar' : `API nicht erreichbar: HTTP ${res.status}`,
        requiresApiKey: true,
        apiKeyEnvVar: 'SHOTSTACK_API_KEY',
      }
    } catch {
      return {
        id: this.id,
        name: this.name,
        available: true, // Key ist da, also versuchen wir es
        type: this.type,
        priority: this.priority,
        cost: this.cost,
        reason: 'SHOTSTACK_API_KEY gesetzt — bereit',
        requiresApiKey: true,
        apiKeyEnvVar: 'SHOTSTACK_API_KEY',
      }
    }
  }

  async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const start = Date.now()
    const apiKey = process.env.SHOTSTACK_API_KEY!

    try {
      const format = params.format === '9:16'
        ? { w: 1080, h: 1920 }
        : params.format === '1:1'
          ? { w: 1080, h: 1080 }
          : { w: 1920, h: 1080 }

      const timeline = this.buildTimeline(params, format)

      // ── Render Job einreichen ───────────────────────────────────────────────
      const submitRes = await fetch(`${this.getApiUrl()}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          timeline,
          output: {
            format: 'mp4',
            size: { width: format.w, height: format.h },
            fps: 30,
            quality: 'high',
            mute: false,
          },
        }),
      })

      if (!submitRes.ok) {
        const errText = await submitRes.text()
        throw new Error(`Shotstack Submit fehlgeschlagen (${submitRes.status}): ${errText}`)
      }

      const submitData = await submitRes.json()
      const renderId: string = submitData.response?.id
      if (!renderId) {
        throw new Error('Keine Render-ID von Shotstack erhalten')
      }

      console.log(`[ShotstackGenerator] Render gestartet: ${renderId}`)

      // ── Polling bis fertig (max 5 Minuten) ─────────────────────────────────
      const maxWaitMs = 300_000
      const pollIntervalMs = 5_000
      const deadline = Date.now() + maxWaitMs

      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, pollIntervalMs))

        const statusRes = await fetch(`${this.getApiUrl()}/render/${renderId}`, {
          headers: { 'x-api-key': apiKey },
        })

        if (!statusRes.ok) continue

        const { response } = await statusRes.json()

        console.log(`[ShotstackGenerator] Status: ${response.status}`)

        if (response.status === 'done') {
          return {
            success: true,
            generatorId: this.id,
            generatorName: this.name,
            outputUrl: response.url,
            previewUrl: response.poster,
            duration: params.targetDuration,
            renderTimeMs: Date.now() - start,
            assetsUsed: params.assets.length,
            metadata: {
              renderId,
              shotstackUrl: response.url,
              format: params.format,
              resolution: `${format.w}x${format.h}`,
            },
          }
        }

        if (response.status === 'failed') {
          throw new Error(`Shotstack Render fehlgeschlagen: ${response.error || 'Unbekannter Fehler'}`)
        }
      }

      throw new Error('Shotstack Render Timeout (5 Minuten überschritten)')

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[ShotstackGenerator] Fehler:', msg)
      return {
        success: false,
        generatorId: this.id,
        generatorName: this.name,
        error: msg,
        renderTimeMs: Date.now() - start,
      }
    }
  }

  // ── Shotstack Timeline JSON aufbauen ─────────────────────────────────────
  private buildTimeline(params: VideoGenerationParams, format: { w: number; h: number }) {
    const visualAssets = [
      ...params.assets.filter(a => a.type === 'video'),
      ...params.assets.filter(a => a.type === 'image'),
    ].slice(0, 8)

    const sceneLen = params.targetDuration / Math.max(visualAssets.length, 1)

    // Shotstack Ken Burns Effects
    const kbEffects = ['zoomIn', 'zoomOut', 'slideLeft', 'slideRight', 'slideUp', 'slideDown']

    // Video/Image Clips
    const videoClips = visualAssets.map((asset, i) => ({
      asset: asset.type === 'video'
        ? { type: 'video', src: asset.url, trim: 0, volume: 0 }
        : { type: 'image', src: asset.url },
      start: parseFloat((i * sceneLen).toFixed(2)),
      length: parseFloat((sceneLen + 0.3).toFixed(2)),
      fit: 'cover',
      effect: kbEffects[i % kbEffects.length],
      transition: i > 0 ? { in: 'fade', out: 'fade' } : undefined,
    }))

    // Hook Text Overlay
    const textClips: Record<string, unknown>[] = []
    if (params.hook) {
      textClips.push({
        asset: {
          type: 'html',
          html: `<p style="color:#fff;font-family:Arial,sans-serif;font-size:${
            Math.floor(format.w * 0.045)
          }px;font-weight:800;text-align:center;line-height:1.2;text-shadow:2px 2px 10px rgba(0,0,0,0.9);padding:20px;max-width:${
            Math.floor(format.w * 0.88)
          }px;margin:0 auto">${params.hook}</p>`,
          width: format.w,
          height: Math.floor(format.h * 0.2),
          background: 'rgba(0,0,0,0)',
        },
        start: 0.5,
        length: 3.5,
        position: 'bottomCenter',
        offset: { y: params.format === '9:16' ? -0.1 : -0.05 },
        transition: { in: 'fadeIn', out: 'fadeOut' },
      })
    }

    // Untertitel
    const subtitleClips: Record<string, unknown>[] = params.subtitles.slice(0, 10).map(sub => ({
      asset: {
        type: 'html',
        html: `<p style="color:#fff;font-family:Arial,sans-serif;font-size:${
          Math.floor(format.w * 0.032)
        }px;font-weight:600;text-align:center;background:rgba(0,0,0,0.6);padding:8px 16px;border-radius:6px">${sub.text}</p>`,
        width: format.w,
        height: 100,
        background: 'rgba(0,0,0,0)',
      },
      start: sub.start,
      length: sub.end - sub.start,
      position: 'bottomCenter',
      offset: { y: params.format === '9:16' ? -0.05 : -0.02 },
    }))

    const musicStyle = params.musicStyle.toLowerCase()
    const musicUrl = MUSIC_TRACKS[musicStyle] || MUSIC_TRACKS.default

    return {
      soundtrack: {
        src: musicUrl,
        effect: 'fadeInFadeOut',
        volume: 0.35,
      },
      tracks: [
        { clips: textClips.concat(subtitleClips) }, // Text oben (rendered last = in front)
        { clips: videoClips },
      ],
    }
  }

  private getApiUrl(): string {
    // Sandbox für Testing, Production für echte Renders
    return process.env.SHOTSTACK_ENV === 'sandbox' ? SHOTSTACK_STAGE_API : SHOTSTACK_API
  }
}
