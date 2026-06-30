// ── Generator 3: Asset Manifest Composer (Priority 999 — Fallback) ────────────
// Immer verfügbar. Erstellt eine detaillierte JSON-Datei ("Video Rezept")
// die von jedem Renderer (FFmpeg, Premiere, DaVinci, CapCut) genutzt werden kann.
// Enthält auch einen vollständigen FFmpeg-Befehl als Referenz.

import path from 'path'
import fs from 'fs'
import {
  VideoGenerator,
  VideoGenerationParams,
  VideoGenerationResult,
  GeneratorStatus,
  ColorLook,
} from '../types'

// ── Farbkorrektur-Werte je Look ───────────────────────────────────────────────
const COLOR_GRADES: Record<ColorLook, object> = {
  'cinematic-dark': {
    brightness: -0.08, contrast: 1.25, saturation: 0.75,
    shadows: -0.15, vignette: 0.35, filmGrain: 0.4,
    rgb: { r: 0.95, g: 0.95, b: 1.0 },
  },
  'warm-golden': {
    brightness: 0.05, contrast: 1.1, saturation: 1.3,
    warmth: 0.25, vignette: 0.2, filmGrain: 0.2,
    rgb: { r: 1.1, g: 1.0, b: 0.85 },
  },
  'cool-blue': {
    brightness: 0, contrast: 1.15, saturation: 0.85,
    coolness: 0.2, vignette: 0.25, filmGrain: 0.15,
    rgb: { r: 0.9, g: 0.95, b: 1.1 },
  },
  'vintage': {
    brightness: -0.05, contrast: 0.9, saturation: 0.6,
    faded: 0.3, vignette: 0.45, filmGrain: 0.5, halation: 0.2,
    rgb: { r: 1.05, g: 0.95, b: 0.85 },
  },
  'clean': {
    brightness: 0.05, contrast: 1.05, saturation: 1.15,
    vignette: 0.1, filmGrain: 0,
    rgb: { r: 1.0, g: 1.0, b: 1.0 },
  },
}

// ── Musik Empfehlungen (Mixkit CDN — kostenlos) ───────────────────────────────
const MUSIC_RECOMMENDATIONS: Record<string, { title: string; url: string; bpm: number }> = {
  cinematic:    { title: 'Mixkit - Life Is A Dream', url: 'https://cdn.mixkit.co/music/preview/mixkit-life-is-a-dream-837-short.mp3', bpm: 85 },
  motivational: { title: 'Mixkit - Running Motivation', url: 'https://cdn.mixkit.co/music/preview/mixkit-running-motivation-37-short.mp3', bpm: 120 },
  ambient:      { title: 'Mixkit - Dreaming Big', url: 'https://cdn.mixkit.co/music/preview/mixkit-dreaming-big-31-short.mp3', bpm: 70 },
  luxury:       { title: 'Mixkit - Cinematic Mystery', url: 'https://cdn.mixkit.co/music/preview/mixkit-cinematic-mystery-61-short.mp3', bpm: 90 },
  default:      { title: 'Mixkit - Tech House Vibes', url: 'https://cdn.mixkit.co/music/preview/mixkit-tech-house-vibes-130-short.mp3', bpm: 128 },
}

export class ManifestGenerator implements VideoGenerator {
  readonly id = 'manifest'
  readonly name = 'Asset Manifest Composer'
  readonly description = 'Immer verfügbar — erstellt ein detailliertes Video-Rezept (JSON) mit FFmpeg-Befehl. Nutzbar in CapCut, Premiere, DaVinci Resolve.'
  readonly type = 'fallback' as const
  readonly priority = 999
  readonly cost = 'free' as const

  async checkAvailability(): Promise<GeneratorStatus> {
    return {
      id: this.id,
      name: this.name,
      available: true,
      type: this.type,
      priority: this.priority,
      cost: this.cost,
      reason: 'Immer verfügbar — kein API Key oder Tool nötig',
    }
  }

  async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const start = Date.now()

    try {
      const outputDir = path.join(process.cwd(), 'public', 'videos')
      fs.mkdirSync(outputDir, { recursive: true })

      const filename = `manifest-${params.jobId}-${Date.now()}.json`
      const outputPath = path.join(outputDir, filename)

      const manifest = this.buildManifest(params)
      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8')

      console.log(`[ManifestGenerator] Manifest erstellt: ${outputPath}`)

      return {
        success: true,
        generatorId: this.id,
        generatorName: this.name,
        outputPath,
        outputUrl: `/videos/${filename}`,
        duration: params.targetDuration,
        renderTimeMs: Date.now() - start,
        assetsUsed: params.assets.length,
        metadata: {
          type: 'video-manifest-json',
          format: params.format,
          scenes: params.scenes.length,
          assets: params.assets.length,
          note: 'Manifest bereit — in CapCut, Premiere oder DaVinci importierbar. FFmpeg-Befehl enthalten.',
          ffmpegReady: true,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        generatorId: this.id,
        generatorName: this.name,
        error: msg,
        renderTimeMs: Date.now() - start,
      }
    }
  }

  // ── Vollständiges Manifest aufbauen ────────────────────────────────────────
  private buildManifest(params: VideoGenerationParams) {
    const isVertical = params.format === '9:16'
    const width = isVertical ? 1080 : params.format === '1:1' ? 1080 : 1920
    const height = isVertical ? 1920 : params.format === '1:1' ? 1080 : 1080

    const colorGrade = COLOR_GRADES[params.colorLook] || COLOR_GRADES['cinematic-dark']
    const musicKey = params.musicStyle.toLowerCase()
    const music = MUSIC_RECOMMENDATIONS[musicKey] || MUSIC_RECOMMENDATIONS.default

    const videoAssets = params.assets.filter(a => a.type === 'video')
    const imageAssets = params.assets.filter(a => a.type === 'image')
    const audioAssets = params.assets.filter(a => a.type === 'audio')

    return {
      _version: '2.0',
      _generator: 'AI Content OS — Video Manifest Composer',
      _createdAt: new Date().toISOString(),
      _instructions: 'Dieses JSON beschreibt das Video vollständig. Es kann von FFmpeg, CapCut, Premiere oder DaVinci Resolve verwendet werden.',

      // ── Metadaten ──────────────────────────────────────────────────────────
      metadata: {
        title: params.title,
        hook: params.hook,
        platform: params.platform,
        format: params.format,
        resolution: `${width}x${height}`,
        targetDuration: params.targetDuration,
        colorLook: params.colorLook,
        musicStyle: params.musicStyle,
        hashtags: params.hashtags,
        effects: params.effects,
        transitions: params.transitions,
      },

      // ── Szenen ─────────────────────────────────────────────────────────────
      scenes: params.scenes.map((scene, i) => ({
        index: i,
        text: scene.text,
        duration: scene.duration || (params.targetDuration / params.scenes.length),
        visualAsset: params.assets.filter(a => a.type !== 'audio')[i % Math.max(params.assets.filter(a => a.type !== 'audio').length, 1)] || null,
        cameraMove: scene.cameraMove || (i % 2 === 0 ? 'zoom-in' : 'zoom-out'),
        textOverlay: i === 0 ? params.hook : scene.textOverlay,
        transition: i > 0 ? params.transitions : 'none',
      })),

      // ── Assets ─────────────────────────────────────────────────────────────
      assets: {
        video: videoAssets,
        image: imageAssets,
        audio: audioAssets,
        music: {
          recommended: music,
          volume: 0.3,
          fadeIn: 1.0,
          fadeOut: 2.0,
        },
      },

      // ── Color Grade ────────────────────────────────────────────────────────
      colorGrading: {
        look: params.colorLook,
        settings: colorGrade,
        effects: params.effects.map(e => ({
          type: e,
          intensity: e === 'filmGrain' ? 0.4 : e === 'vignette' ? 0.3 : 0.5,
        })),
      },

      // ── Text Overlays ──────────────────────────────────────────────────────
      textLayers: [
        {
          id: 'hook',
          text: params.hook,
          startTime: 0.5,
          endTime: 3.5,
          style: {
            fontSize: Math.floor(width * 0.045),
            fontWeight: 800,
            color: '#FFFFFF',
            textShadow: '2px 2px 10px rgba(0,0,0,0.9)',
            animation: { in: 'fadeInUp', out: 'fadeOut', duration: 0.4 },
          },
          position: { x: '50%', y: isVertical ? '76%' : '80%', anchor: 'center' },
        },
        ...params.subtitles.slice(0, 15).map((sub, i) => ({
          id: `subtitle-${i}`,
          text: sub.text,
          startTime: sub.start,
          endTime: sub.end,
          style: {
            fontSize: Math.floor(width * 0.03),
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '6px 14px',
            borderRadius: 4,
          },
          position: { x: '50%', y: isVertical ? '88%' : '90%', anchor: 'center' },
        })),
      ],

      // ── Export Einstellungen ────────────────────────────────────────────────
      exportSettings: {
        format: 'mp4',
        codec: 'h264',
        width,
        height,
        fps: 30,
        videoBitrate: '6M',
        audioBitrate: '192k',
        audioCodec: 'aac',
        colorSpace: 'yuv420p',
        faststart: true,
      },

      // ── FFmpeg Render Befehl ────────────────────────────────────────────────
      ffmpegCommand: this.buildFFmpegCommand(params, width, height),

      // ── CapCut Import Hinweise ──────────────────────────────────────────────
      capCutImport: {
        steps: [
          '1. Lade alle Assets aus der "assets" Sektion herunter',
          '2. Öffne CapCut und erstelle neues Projekt (9:16)',
          '3. Importiere Video-/Bild-Assets in der Reihenfolge der Szenen',
          `4. Wende Color Look "${params.colorLook}" an (Filters → Cinematic)`,
          '5. Füge Hook-Text als erstes Text-Element ein (0.5s - 3.5s)',
          `6. Musik hinzufügen: ${music.title} (${music.url})`,
          '7. Exportiere als 1080x1920, 30fps, H.264',
        ],
      },
    }
  }

  // ── FFmpeg-Befehl als Referenz ─────────────────────────────────────────────
  private buildFFmpegCommand(params: VideoGenerationParams, w: number, h: number): string {
    const colorFilter = {
      'cinematic-dark': 'eq=brightness=-0.08:contrast=1.25:saturation=0.75,vignette=PI/4',
      'warm-golden':    'eq=brightness=0.05:contrast=1.1:saturation=1.3,colorbalance=rs=0.15:bs=-0.1',
      'cool-blue':      'eq=brightness=0:contrast=1.15:saturation=0.85,colorbalance=bs=0.15',
      'vintage':        'eq=brightness=-0.05:contrast=0.9:saturation=0.6,vignette=PI/3,noise=c0s=6:allf=t',
      'clean':          'eq=brightness=0.05:contrast=1.05:saturation=1.15',
    }[params.colorLook] || 'eq=contrast=1.1'

    const hookText = (params.hook || '').substring(0, 50).replace(/'/g, '').replace(/:/g, '\\:')
    const subtitleFilter = hookText
      ? `,drawtext=text='${hookText}':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=h*0.76:enable='between(t,0.5,3.5)':box=1:boxcolor=black@0.55:boxborderw=10`
      : ''

    return `# Schritt 1: Hintergrundmusik herunterladen
curl -o music.mp3 "${MUSIC_RECOMMENDATIONS[params.musicStyle.toLowerCase()]?.url || MUSIC_RECOMMENDATIONS.default.url}"

# Schritt 2: Assets herunterladen (für jedes Asset in der assets-Liste)
# curl -o asset_0.mp4 "[asset.url]"
# curl -o asset_1.mp4 "[asset.url]"
# ...

# Schritt 3: Concat-Datei erstellen
# echo "file 'asset_0.mp4'" > concat.txt
# echo "duration ${params.targetDuration / params.scenes.length}" >> concat.txt
# ... (für jedes Asset wiederholen)

# Schritt 4: Video rendern
ffmpeg -y -f concat -safe 0 -i concat.txt -i music.mp3 \\
  -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,\\
  pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,\\
  zoompan=z='if(lte(zoom,1.0),1.05,zoom-0.001)':d=150:s=${w}x${h},\\
  ${colorFilter}${subtitleFilter}" \\
  -map 0:v -map 1:a \\
  -af "afade=t=in:st=0:d=1,afade=t=out:st=${params.targetDuration - 2}:d=2,volume=0.3" \\
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \\
  -c:a aac -b:a 128k -ar 44100 -movflags +faststart \\
  -t ${params.targetDuration} output_video.mp4`
  }
}
