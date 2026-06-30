// ── Video Generation Engine — Core Types ─────────────────────────────────────
// Alle Generatoren (FFmpeg, Shotstack, Manifest, etc.) implementieren
// VideoGenerator. Die Engine wählt automatisch den besten verfügbaren.

export interface VideoScene {
  id: string
  index: number
  text: string
  voiceover?: string
  duration: number            // Sekunden
  assetQuery?: string         // Suchbegriff für Asset Manager
  assetUrl?: string           // Direkte URL falls bereits vorhanden
  keywords: string[]
  cameraMove?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static'
  textOverlay?: string
}

export type ColorLook = 'cinematic-dark' | 'warm-golden' | 'cool-blue' | 'vintage' | 'clean'
export type VideoFormat = '9:16' | '16:9' | '1:1'
export type VideoPlatform = 'tiktok' | 'youtube-shorts' | 'instagram-reels' | 'youtube'
export type TransitionType = 'crossfade' | 'cut' | 'zoom' | 'slide' | 'wipe'

export interface VideoAsset {
  type: 'video' | 'image' | 'audio'
  url: string
  source: 'pexels' | 'pixabay' | 'mixkit' | 'openverse' | 'unsplash' | 'wikimedia' | 'local'
  license: string
  title?: string
  duration?: number           // Sekunden (nur video)
  width?: number
  height?: number
}

export interface SubtitleLine {
  start: number               // Sekunden
  end: number
  text: string
  style?: 'default' | 'highlight' | 'bold'
}

// ── Eingabe für alle Generatoren ──────────────────────────────────────────────
export interface VideoGenerationParams {
  jobId: string
  title: string
  script: string
  hook: string
  scenes: VideoScene[]
  assets: VideoAsset[]
  musicStyle: string          // z.B. 'cinematic', 'motivational', 'ambient'
  colorLook: ColorLook
  subtitles: SubtitleLine[]
  transitions: TransitionType
  effects: string[]           // z.B. ['filmGrain', 'vignette', 'motionBlur']
  format: VideoFormat
  platform: VideoPlatform
  hashtags: string[]
  targetDuration: number      // Sekunden
}

// ── Ausgabe jedes Generators ──────────────────────────────────────────────────
export interface VideoGenerationResult {
  success: boolean
  generatorId: string
  generatorName: string
  outputPath?: string         // Lokaler Dateipfad (nur local/ffmpeg)
  outputUrl?: string          // Öffentliche URL oder /videos/...
  previewUrl?: string
  duration?: number
  renderTimeMs?: number
  assetsUsed?: number
  error?: string
  metadata?: Record<string, unknown>
}

// ── Generator Status Check ────────────────────────────────────────────────────
export interface GeneratorStatus {
  id: string
  name: string
  available: boolean
  reason: string
  type: 'local' | 'api' | 'fallback'
  priority: number
  cost: 'free' | 'paid' | 'freemium'
  requiresApiKey?: boolean
  apiKeyEnvVar?: string
}

// ── Plugin Interface — alle Generatoren müssen dies implementieren ─────────────
export interface VideoGenerator {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: 'local' | 'api' | 'fallback'
  readonly priority: number   // Niedriger = höhere Priorität
  readonly cost: 'free' | 'paid' | 'freemium'
  checkAvailability(): Promise<GeneratorStatus>
  generate(params: VideoGenerationParams): Promise<VideoGenerationResult>
}

// ── Engine Status (für Dashboard) ─────────────────────────────────────────────
export interface EngineStatus {
  activeGenerator: GeneratorStatus | null
  allGenerators: GeneratorStatus[]
  lastRender?: {
    jobId: string
    generatorId: string
    success: boolean
    duration?: number
    renderTimeMs?: number
    timestamp: string
  }
}
