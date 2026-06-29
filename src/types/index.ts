export type AgentStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting'

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

export interface VideoProject {
  id: string
  title: string
  topic: string
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
  watchtime: number
  retention: number
  notes?: string
  createdAt: string
}

export interface KPIData {
  videosToday: number
  successfulUploads: number
  failedUploads: number
  avgWatchtime: number
  bestPlatform: string
  activeAgents: number
  totalViews: number
}
