import { NextRequest, NextResponse } from 'next/server'
import { DEMO_VIDEOS } from '@/lib/demo-data'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Persistenter Video-Speicher (JSON-Datei)
const VIDEO_STORE_PATH = path.join(process.cwd(), 'data', 'videos.json')

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadStoredVideos() {
  try {
    ensureDataDir()
    if (fs.existsSync(VIDEO_STORE_PATH)) {
      const raw = fs.readFileSync(VIDEO_STORE_PATH, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    console.warn('[/api/videos] Fehler beim Laden des Stores — nutze Demo-Daten')
  }
  return null
}

export async function GET() {
  const stored = loadStoredVideos()

  if (stored && Array.isArray(stored) && stored.length > 0) {
    // Echte Daten aus persistentem Store
    return NextResponse.json({ videos: stored, source: 'live' })
  }

  // Fallback: Demo-Daten (korrekte Nische)
  return NextResponse.json({ videos: DEMO_VIDEOS, source: 'demo' })
}

// POST: Neues Video speichern (wird vom Workflow aufgerufen)
export async function POST(req: NextRequest) {
  try {
    const video = await req.json()

    ensureDataDir()
    const existing = loadStoredVideos() || []
    const updated = [video, ...existing].slice(0, 50) // Max 50 Videos

    fs.writeFileSync(VIDEO_STORE_PATH, JSON.stringify(updated, null, 2))
    return NextResponse.json({ ok: true, id: video.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
