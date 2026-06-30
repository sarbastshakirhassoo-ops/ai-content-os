// ── Generator 1: FFmpeg Local Renderer (Priority 1) ───────────────────────────
// Lokal, kostenlos, keine API nötig.
// Voraussetzung: `brew install ffmpeg` (macOS) oder apt/winget
// Features: Ken Burns, Crossfade-Übergänge, Untertitel, Color Grading, Film Grain

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import {
  VideoGenerator,
  VideoGenerationParams,
  VideoGenerationResult,
  GeneratorStatus,
} from '../types'

const execAsync = promisify(exec)

// ── FFmpeg Verfügbarkeitscheck ─────────────────────────────────────────────────
async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version', { timeout: 5000 })
    return true
  } catch {
    try {
      await execAsync('which ffmpeg', { timeout: 3000 })
      return true
    } catch {
      return false
    }
  }
}

// ── Asset Download ─────────────────────────────────────────────────────────────
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)

    const request = proto.get(url, (res) => {
      // Redirect folgen
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        file.close()
        fs.unlink(dest, () => {})
        downloadFile(res.headers.location!, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => {})
        reject(new Error(`HTTP ${res.statusCode} für ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', (err) => { fs.unlink(dest, () => {}); reject(err) })
    })

    request.on('error', (err) => { fs.unlink(dest, () => {}); reject(err) })
    request.setTimeout(30000, () => { request.destroy(); reject(new Error('Download timeout')) })
  })
}

// ── Color Grade Filter Strings ────────────────────────────────────────────────
const COLOR_GRADES: Record<string, string> = {
  'cinematic-dark': 'eq=brightness=-0.08:contrast=1.25:saturation=0.75,vignette=PI/4',
  'warm-golden':    'eq=brightness=0.05:contrast=1.1:saturation=1.3,colorbalance=rs=0.15:gs=0.05:bs=-0.1,vignette=PI/6',
  'cool-blue':      'eq=brightness=0:contrast=1.15:saturation=0.85,colorbalance=rs=-0.1:gs=0:bs=0.15',
  'vintage':        'eq=brightness=-0.05:contrast=0.9:saturation=0.6,vignette=PI/3,noise=c0s=6:allf=t',
  'clean':          'eq=brightness=0.05:contrast=1.05:saturation=1.15',
}

// ── Musik URLs (kostenlos via Mixkit CDN) ─────────────────────────────────────
const MUSIC_URLS: Record<string, string> = {
  cinematic:    'https://cdn.mixkit.co/music/preview/mixkit-cinematic-mystery-61-short.mp3',
  motivational: 'https://cdn.mixkit.co/music/preview/mixkit-running-motivation-37-short.mp3',
  ambient:      'https://cdn.mixkit.co/music/preview/mixkit-dreaming-big-31-short.mp3',
  luxury:       'https://cdn.mixkit.co/music/preview/mixkit-life-is-a-dream-837-short.mp3',
  default:      'https://cdn.mixkit.co/music/preview/mixkit-tech-house-vibes-130-short.mp3',
}

export class FFmpegGenerator implements VideoGenerator {
  readonly id = 'ffmpeg'
  readonly name = 'FFmpeg Local Renderer'
  readonly description = 'Lokale Video-Erstellung aus Assets — kein API Key nötig. Ken Burns, Übergänge, Untertitel, Color Grading, Film Grain.'
  readonly type = 'local' as const
  readonly priority = 1
  readonly cost = 'free' as const

  async checkAvailability(): Promise<GeneratorStatus> {
    const available = await checkFFmpeg()
    return {
      id: this.id,
      name: this.name,
      available,
      type: this.type,
      priority: this.priority,
      cost: this.cost,
      reason: available
        ? 'FFmpeg installiert und bereit'
        : 'FFmpeg nicht gefunden. Installieren: brew install ffmpeg',
    }
  }

  async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const start = Date.now()
    const tmpDir = path.join(process.cwd(), 'tmp', `vgen-${params.jobId}`)
    const outputDir = path.join(process.cwd(), 'public', 'videos')

    fs.mkdirSync(tmpDir, { recursive: true })
    fs.mkdirSync(outputDir, { recursive: true })

    try {
      const format = params.format === '9:16'
        ? { w: 1080, h: 1920 }
        : params.format === '1:1'
          ? { w: 1080, h: 1080 }
          : { w: 1920, h: 1080 }

      const outputFile = path.join(outputDir, `video-${params.jobId}-${Date.now()}.mp4`)
      const colorFilter = COLOR_GRADES[params.colorLook] || COLOR_GRADES['cinematic-dark']

      // ── Assets herunterladen ────────────────────────────────────────────────
      const videoAssets = params.assets.filter(a => a.type === 'video').slice(0, 6)
      const imageAssets = params.assets.filter(a => a.type === 'image').slice(0, 6)
      const useVideos = videoAssets.length > 0

      const downloadTargets = useVideos ? videoAssets : imageAssets
      const downloaded: string[] = []

      for (let i = 0; i < Math.min(downloadTargets.length, 5); i++) {
        const asset = downloadTargets[i]
        const ext = asset.type === 'video' ? '.mp4' : '.jpg'
        const dest = path.join(tmpDir, `asset-${i}${ext}`)
        try {
          await downloadFile(asset.url, dest)
          if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
            downloaded.push(dest)
          }
        } catch (e) {
          console.warn(`[FFmpegGenerator] Asset-Download fehlgeschlagen: ${asset.url}`)
        }
      }

      if (downloaded.length === 0) {
        throw new Error('Keine Assets heruntergeladen — überprüfe Asset-URLs im Asset Manager')
      }

      // ── Musik herunterladen ─────────────────────────────────────────────────
      const musicKey = params.musicStyle.toLowerCase()
      const musicUrl = MUSIC_URLS[musicKey] || MUSIC_URLS.default
      const musicFile = path.join(tmpDir, 'music.mp3')
      let hasMusicFile = false
      try {
        await downloadFile(musicUrl, musicFile)
        hasMusicFile = fs.existsSync(musicFile) && fs.statSync(musicFile).size > 5000
      } catch {
        console.warn('[FFmpegGenerator] Musik-Download fehlgeschlagen — ohne Musik')
      }

      // ── Untertitel/Hook Text ────────────────────────────────────────────────
      const hookEscaped = (params.hook || '')
        .substring(0, 55)
        .replace(/'/g, "’")
        .replace(/:/g, '\\:')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')

      const hookFilter = hookEscaped
        ? `,drawtext=text='${hookEscaped}':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=h*0.76:enable='between(t,0.5,3.5)':box=1:boxcolor=black@0.55:boxborderw=10:font='Arial Bold'`
        : ''

      // ── Film Grain Overlay ──────────────────────────────────────────────────
      const grainFilter = params.effects.includes('filmGrain')
        ? ',noise=c0s=5:c0f=u+t'
        : ''

      // ── FFmpeg Command wählen ───────────────────────────────────────────────
      const sceneLen = params.targetDuration / downloaded.length
      let cmd: string

      if (useVideos) {
        cmd = this.buildVideoCommand(downloaded, outputFile, format, sceneLen, params, colorFilter, hookFilter, grainFilter, hasMusicFile ? musicFile : null)
      } else {
        cmd = this.buildImageCommand(downloaded, outputFile, format, sceneLen, params, colorFilter, hookFilter, grainFilter, hasMusicFile ? musicFile : null)
      }

      console.log(`[FFmpegGenerator] Render startet — ${downloaded.length} Assets, ${format.w}x${format.h}`)
      await execAsync(cmd, { timeout: 300_000, maxBuffer: 50 * 1024 * 1024 })

      // ── Cleanup ─────────────────────────────────────────────────────────────
      fs.rmSync(tmpDir, { recursive: true, force: true })

      if (!fs.existsSync(outputFile)) {
        throw new Error('FFmpeg Output-Datei nicht gefunden — Render fehlgeschlagen')
      }

      return {
        success: true,
        generatorId: this.id,
        generatorName: this.name,
        outputPath: outputFile,
        outputUrl: `/videos/${path.basename(outputFile)}`,
        duration: params.targetDuration,
        renderTimeMs: Date.now() - start,
        assetsUsed: downloaded.length,
        metadata: {
          format: params.format,
          colorLook: params.colorLook,
          resolution: `${format.w}x${format.h}`,
          assetType: useVideos ? 'video' : 'image',
          hasMusicFile,
        },
      }
    } catch (error) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[FFmpegGenerator] Fehler:', msg)
      return {
        success: false,
        generatorId: this.id,
        generatorName: this.name,
        error: msg,
        renderTimeMs: Date.now() - start,
      }
    }
  }

  // ── Video-Assets Command ──────────────────────────────────────────────────
  private buildVideoCommand(
    files: string[], out: string, fmt: { w: number; h: number },
    sceneLen: number, params: VideoGenerationParams,
    colorFilter: string, hookFilter: string, grainFilter: string,
    musicFile: string | null
  ): string {
    const concatFile = path.join(path.dirname(out), `concat-${Date.now()}.txt`)
    const concatContent = files.map(f =>
      `file '${f}'\nduration ${sceneLen.toFixed(2)}`
    ).join('\n')
    fs.writeFileSync(concatFile, concatContent)

    const audioInput = musicFile ? `-i "${musicFile}"` : ''
    const audioMap = musicFile
      ? `-map 0:v -map 1:a -af "afade=t=in:st=0:d=1,afade=t=out:st=${params.targetDuration - 2}:d=2,volume=0.3"`
      : '-an'

    return `ffmpeg -y -f concat -safe 0 -i "${concatFile}" ${audioInput} \
-vf "scale=${fmt.w}:${fmt.h}:force_original_aspect_ratio=decrease,\
pad=${fmt.w}:${fmt.h}:(ow-iw)/2:(oh-ih)/2:black,\
setsar=1,fps=30,\
zoompan=z='if(lte(zoom,1.0),1.05,zoom-0.001)':d=150:s=${fmt.w}x${fmt.h},\
${colorFilter}${hookFilter}${grainFilter}" \
${audioMap} \
-c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
-c:a aac -b:a 128k -ar 44100 \
-movflags +faststart \
-t ${params.targetDuration} "${out}"`
  }

  // ── Image-Assets Command (Ken Burns Slide Show) ───────────────────────────
  private buildImageCommand(
    files: string[], out: string, fmt: { w: number; h: number },
    sceneLen: number, params: VideoGenerationParams,
    colorFilter: string, hookFilter: string, grainFilter: string,
    musicFile: string | null
  ): string {
    const inputs = files.map(f => `-loop 1 -t ${sceneLen.toFixed(2)} -i "${f}"`).join(' ')
    const frames = Math.floor(sceneLen * 30)

    // Jedes Bild: scale + pad + Ken Burns Zoompan
    const filterParts = files.map((_, i) => {
      const zoomDir = i % 2 === 0
        ? `z='min(zoom+0.0012,1.3)'`   // zoom in
        : `z='if(gte(zoom,1.3),1.0,zoom+0.0012)'` // zoom out
      return `[${i}:v]scale=${fmt.w * 2}:${fmt.h * 2}:force_original_aspect_ratio=decrease,` +
        `pad=${fmt.w * 2}:${fmt.h * 2}:(ow-iw)/2:(oh-ih)/2:black,` +
        `zoompan=${zoomDir}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${fmt.w}x${fmt.h},setsar=1,fps=30[clip${i}]`
    })

    // Crossfade zwischen clips
    let concatStr = ''
    if (files.length === 1) {
      concatStr = `[clip0]`
    } else {
      const xfadeParts: string[] = []
      let prev = `[clip0]`
      for (let i = 1; i < files.length; i++) {
        const offset = sceneLen * i - 0.5
        const out_label = i < files.length - 1 ? `[xf${i}]` : '[video_raw]'
        xfadeParts.push(`${prev}[clip${i}]xfade=transition=fade:duration=0.5:offset=${offset.toFixed(2)}${out_label}`)
        prev = `[xf${i}]`
      }
      filterParts.push(...xfadeParts)
      concatStr = '[video_raw]'
    }

    if (files.length === 1) {
      filterParts.push(`[clip0]${colorFilter}${hookFilter}${grainFilter}[vout]`)
    } else {
      filterParts.push(`${concatStr}${colorFilter}${hookFilter}${grainFilter}[vout]`)
    }

    const audioInput = musicFile ? `-i "${musicFile}"` : ''
    const audioMap = musicFile
      ? `-map "[vout]" -map ${files.length}:a -af "afade=t=in:st=0:d=1,afade=t=out:st=${params.targetDuration - 2}:d=2,volume=0.3"`
      : `-map "[vout]" -an`

    return `ffmpeg -y ${inputs} ${audioInput} \
-filter_complex "${filterParts.join(';')}" \
${audioMap} \
-c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
-c:a aac -b:a 128k -ar 44100 \
-movflags +faststart \
-t ${params.targetDuration} "${out}"`
  }
}
