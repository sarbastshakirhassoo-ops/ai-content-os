import { NextResponse } from 'next/server'
import { existsSync }  from 'fs'
import { execSync }    from 'child_process'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, boolean | string> = {}

  // FFmpeg vorhanden?
  try {
    const ver = execSync('ffmpeg -version 2>&1 | head -1', { timeout: 3000 }).toString().trim()
    checks.ffmpeg = ver.includes('ffmpeg version') ? ver.split(' ').slice(0,3).join(' ') : false
  } catch {
    checks.ffmpeg = false
  }

  // Data-Verzeichnis schreibbar?
  try {
    checks.dataDir = existsSync(process.cwd() + '/data')
  } catch {
    checks.dataDir = false
  }

  // YouTube credentials konfiguriert?
  checks.youtubeCredentials = !!(
    process.env.YOUTUBE_CLIENT_ID &&
    process.env.YOUTUBE_CLIENT_SECRET &&
    process.env.YOUTUBE_REFRESH_TOKEN
  )

  // Pexels API Key vorhanden?
  checks.pexelsKey = !!process.env.PEXELS_API_KEY

  const allOk = checks.ffmpeg !== false && checks.dataDir === true

  return NextResponse.json({
    status:    allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
    checks,
  }, { status: allOk ? 200 : 503 })
}
