import { NextResponse } from 'next/server'
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
  return []
}

export async function GET() {
  const videos = loadStoredVideos()

  const today = new Date().toDateString()
  const uploaded = videos.filter((v: { uploadStatus: string }) => v.uploadStatus === 'complete')
  const totalViews = videos.reduce((sum: number, v: { views?: number }) => sum + (v.views || 0), 0)

  const withWatchtime = videos.filter((v: { watchtime?: number }) => (v.watchtime || 0) > 0)
  const avgWatchtime = withWatchtime.length > 0
    ? Math.round(withWatchtime.reduce((s: number, v: { watchtime?: number }) => s + (v.watchtime || 0), 0) / withWatchtime.length * 10) / 10
    : 0

  const platformViews: Record<string, number> = { instagram: 0, tiktok: 0, youtube: 0 }
  for (const v of videos) {
    if (v.instagramUrl && v.views) platformViews.instagram += Math.round(v.views * 0.5)
    if (v.tiktokUrl && v.views) platformViews.tiktok += Math.round(v.views * 0.35)
    if (v.youtubeUrl && v.views) platformViews.youtube += Math.round(v.views * 0.15)
  }
  const topPlatformEntry = Object.entries(platformViews).sort((a, b) => b[1] - a[1])[0]
  const bestPlatform = topPlatformEntry && topPlatformEntry[1] > 0
    ? topPlatformEntry[0].charAt(0).toUpperCase() + topPlatformEntry[0].slice(1)
    : '—'

  const kpi = {
    videosToday: videos.filter((v: { createdAt: string }) => new Date(v.createdAt).toDateString() === today).length,
    successfulUploads: uploaded.length,
    failedUploads: videos.filter((v: { uploadStatus: string }) => v.uploadStatus === 'failed').length,
    avgWatchtime,
    bestPlatform,
    activeAgents: 0,
    totalViews,
  }

  // Alerts: nur echte Events — leer wenn noch nichts passiert ist
  const alerts: Array<{ id: number; level: string; message: string; time: string }> = []

  if (videos.length === 0) {
    alerts.push({
      id: 1,
      level: 'info',
      message: 'Noch keine Videos — starte den Workflow um das erste Video zu erstellen',
      time: 'jetzt',
    })
  } else {
    const topVideo = [...videos].sort((a: { views?: number }, b: { views?: number }) => (b.views || 0) - (a.views || 0))[0]
    if (topVideo?.views > 0) {
      alerts.push({ id: 1, level: 'success', message: `"${topVideo.title}" — ${topVideo.views.toLocaleString()} Views`, time: 'aktuell' })
    }
    const failed = videos.filter((v: { uploadStatus: string }) => v.uploadStatus === 'failed')
    if (failed.length > 0) {
      alerts.push({ id: 2, level: 'danger', message: `${failed.length} Upload(s) fehlgeschlagen — manuelle Überprüfung nötig`, time: 'aktuell' })
    }
    const rendering = videos.filter((v: { status: string }) => v.status === 'rendering')
    if (rendering.length > 0) {
      alerts.push({ id: 3, level: 'info', message: `${rendering.length} Video(s) werden gerade gerendert`, time: 'aktuell' })
    }
  }

  return NextResponse.json({ kpi, alerts, source: 'live' })
}
