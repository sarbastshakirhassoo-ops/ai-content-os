import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const VIDEO_STORE_PATH = path.join(process.cwd(), 'data', 'videos.json')

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadStoredVideos() {
  try {
    ensureDataDir()
    if (fs.existsSync(VIDEO_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(VIDEO_STORE_PATH, 'utf-8'))
    }
  } catch {
    console.warn('[/api/videos] Fehler beim Laden')
  }
  return []
}

export async function GET() {
  const videos = loadStoredVideos()
  return NextResponse.json({ videos, source: 'live' })
}

export async function POST(req: NextRequest) {
  try {
    const video = await req.json()
    ensureDataDir()
    const existing = loadStoredVideos()
    const updated = [video, ...existing].slice(0, 50)
    fs.writeFileSync(VIDEO_STORE_PATH, JSON.stringify(updated, null, 2))
    return NextResponse.json({ ok: true, id: video.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
