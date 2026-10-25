// ─────────────────────────────────────────────────────────────────────────────
// AI Content Factory — Core Types
// Nische: Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic
// ─────────────────────────────────────────────────────────────────────────────

// ── Agent Types ───────────────────────────────────────────────────────────────

export type AgentStatus =
  | 'idle' | 'queued' | 'running' | 'waiting' | 'retrying'
  | 'failed' | 'blocked' | 'completed' | 'success' | 'error'

export interface AgentDef {
  id: string
  slug: string
  name: string
  icon: string
  description: string
  input: string
  output: string
  status: AgentStatus
  lastRun?: string
  lastRunMs?: number
  errorCount: number
  lastError?: string
  color: string
  position: { x: number; y: number }
}

// ── Job System ────────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying' | 'blocked'

export interface AgentStepLog {
  agentSlug: string
  agentName: string
  status: AgentStepStatus
  startedAt?: string
  completedAt?: string
  durationMs?: number
  output?: Record<string, unknown>
  error?: string
  retryCount: number
  logs: string[]
}

export interface WorkflowJob {
  id: string
  niche: string
  topic: string
  status: JobStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  steps: AgentStepLog[]
  currentStep: number
  totalSteps: number
  videoUrl?: string
  qcScore?: number
  qcPassed?: boolean
  uploadUrls?: { youtube?: string; instagram?: string; tiktok?: string }
  error?: string
  retryCount: number
  triggeredBy: 'manual' | 'scheduled' | 'auto'
}

// ── Video Project ─────────────────────────────────────────────────────────────

export interface VideoProject {
  id: string
  jobId?: string
  title: string
  topic: string
  niche: string
  hook?: string
  script?: string
  videoPrompt?: string
  platforms: string[]
  status: string
  qcScore?: number
  qcPassed: boolean
  uploadStatus: string
  youtubeUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  watchtime: number
  retention: number
  ctr?: number
  followerGain?: number
  notes?: string
  assetSources?: string[]
  licenseStatus?: 'clean' | 'pending' | 'issue'
  createdAt: string
}

// ── KPI / Dashboard ───────────────────────────────────────────────────────────

export interface KPIData {
  videosToday: number
  successfulUploads: number
  failedUploads: number
  avgWatchtime: number
  bestPlatform: string
  activeAgents: number
  totalViews: number
  totalJobs?: number
  runningJobs?: number
  queuedJobs?: number
  avgQcScore?: number
}

// ── Asset / License ───────────────────────────────────────────────────────────

export type AssetLicense =
  | 'pexels' | 'pixabay' | 'mixkit' | 'unsplash' | 'cc0'
  | 'cc-by' | 'cc-by-sa' | 'commercial' | 'unknown'

export interface Asset {
  id: string
  scene: string
  type: 'video' | 'image' | 'audio'
  source: 'pexels' | 'pixabay' | 'mixkit' | 'unsplash' | 'openverse' | 'wikimedia' | 'manual'
  url: string
  downloadUrl?: string
  thumbnailUrl?: string
  creator?: string
  license: AssetLicense
  commercialUse: boolean
  attributionRequired: boolean
  attribution?: string
  copyrightRisk: 'none' | 'low' | 'medium' | 'high'
  keyword: string
  duration?: number
  width?: number
  height?: number
  format?: string
  luxuryScore: number
  nostalgiaScore: number
  cinematicScore: number
  aspectRatio916: boolean
  backupAsset?: string
}

export interface AssetManifest {
  totalAssets: number
  scenes: Asset[]
  licenseStatus: 'clean' | 'pending' | 'issue'
  blockedScenes: string[]
  attributions: string[]
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export interface KnowledgeEntry {
  id: string
  type: 'topic' | 'hook' | 'hashtag' | 'cta' | 'asset-keyword' | 'music-style' | 'format' | 'invideo-prompt' | 'learning'
  value: string
  score: number
  usedCount: number
  lastUsed: string
  platform?: string
  niche?: string
  notes?: string
  createdAt: string
}

export interface KnowledgeBase {
  topics: string[]
  bestHooks: KnowledgeEntry[]
  bestCTAs: KnowledgeEntry[]
  bestHashtags: KnowledgeEntry[]
  assetKeywords: KnowledgeEntry[]
  musicStyles: KnowledgeEntry[]
  videoFormats: KnowledgeEntry[]
  inVideoPrompts: KnowledgeEntry[]
  learnings: KnowledgeEntry[]
  lastUpdated: string
}

// ── Content Calendar ──────────────────────────────────────────────────────────

export interface CalendarSlot {
  id: string
  jobId?: string
  videoId?: string
  platform: 'youtube' | 'instagram' | 'tiktok'
  scheduledAt: string
  timezone: string
  status: 'scheduled' | 'uploaded' | 'failed' | 'cancelled'
  expectedReach?: number
  title?: string
  caption?: string
  hashtags?: string[]
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsReport {
  videoId: string
  platform: string
  views: number
  watchTime: number
  retention: number
  ctr: number
  likes: number
  comments: number
  shares: number
  saves: number
  followerGain: number
  bestHook?: string
  winningPatterns: string[]
  alerts: string[]
  recommendations: string[]
  measuredAt: string
}

// ── QC ────────────────────────────────────────────────────────────────────────

export interface QCDimension {
  score: number
  pass: boolean
  reason: string
}

export interface QCResult {
  passed: boolean
  overallScore: number
  blockers: string[]
  warnings: string[]
  improvements: string[]
  dimensions: {
    hookStrength: QCDimension
    scriptQuality: QCDimension
    brandConsistency: QCDimension
    licenseClean: QCDimension
    platformOptimization: QCDimension
    luxuryAesthetic: QCDimension
    noScamLanguage: QCDimension
    aspectRatio: QCDimension
    resolution: QCDimension
    audioSync: QCDimension
  }
}
