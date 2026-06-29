import { NextResponse } from 'next/server'
import { DEMO_KPI, DEMO_VIDEOS, ALERTS } from '@/lib/demo-data'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const VIDEO_STORE_PATH = path.join(process.cwd(), 'data', 'videos.json')

function loadStoredVideos() {
  try {
    if (fs.existsSync(VIDEO_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(VIDEO_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return null
}

export async function GET() {
  const stored = loadStoredVideos()
  const videos = (stored && stored.length > 0) ? stored : DEMO_VIDEOS

  // KPI aus echten Video-Daten berechnen
  const uploaded = videos.filter((v: { uploadStatus: string }) => v.uploadStatus === 'complete')
  const totalViews = videos.reduce((sum: number, v: { views?: number }) => sum + (v.views || 0), 0)
  const totalWatchtime = videos.filter((v: { watchtime?: number }) => (v.watchtime || 0) > 0)
  const avgWatchtime = totalWatchtime.length > 0
    ? Math.round(totalWatchtime.reduce((s: number, v: { watchtime?: number }) => s + (v.watchtime || 0), 0) / totalWatchtime.length * 10) / 10
    : DEMO_KPI.avgWatchtime

  // Best Platform aus Views ermitteln
  const platformViews: Record<string, number> = { instagram: 0, tiktok: 0, youtube: 0 }
  for (const v of videos) {
    if (v.instagramUrl && v.views) platformViews.instagram += Math.round(v.views * 0.5)
    if (v.tiktokUrl && v.views) platformViews.tiktok += Math.round(v.views * 0.35)
    if (v.youtubeUrl && v.views) platformViews.youtube += Math.round(v.views * 0.15)
  }
  const bestPlatform = Object.entries(platformViews).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Instagram'

  const kpi = {
    videosToday: videos.filter((v: { createdAt: string }) => {
      const created = new Date(v.createdAt)
      const today = new Date()
      return created.toDateString() === today.toDateString()
    }).length || DEMO_KPI.videosToday,
    successfulUploads: uploaded.length || DEMO_KPI.successfulUploads,
    failedUploads: videos.filter((v: { uploadStatus: string }) => v.uploadStatus === 'failed').length,
    avgWatchtime,
    bestPlatform: bestPlatform.charAt(0).toUpperCase() + bestPlatform.slice(1),
    activeAgents: DEMO_KPI.activeAgents,
    totalViews: totalViews || DEMO_KPI.totalViews,
  }

  // Alerts: dynamisch aus aktuellen Video-Daten + ALERTS-Basis
  const dynamicAlerts = [...ALERTS]

  // Wenn echte Videos vorhanden, Top-Performer-Alert ergänzen
  if (stored && stored.length > 0) {
    const topVideo = [...stored].sort((a: { views?: number }, b: { views?: number }) => (b.views || 0) - (a.views || 0))[0]
    if (topVideo?.views > 0) {
      dynamicAlerts.unshift({
        id: 0,
        level: 'success',
        message: `"${topVideo.title}" — ${topVideo.views.toLocaleString()} Views`,
        time: 'gerade eben',
      })
    }
  }

  return NextResponse.json({
    kpi,
    alerts: dynamicAlerts.slice(0, 5),
    source: stored ? 'live' : 'demo',
  })
}
