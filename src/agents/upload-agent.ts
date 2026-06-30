// ─────────────────────────────────────────────────────────────────────────────
// Upload Agent — YouTube Shorts (echtes OAuth 2.0 via native fetch)
// Keine externen Dependencies: nutzt YouTube Data API v3 direkt
//
// Setup (einmalig):
//   1. Google Cloud Console → YouTube Data API v3 aktivieren
//   2. OAuth 2.0 Client ID erstellen (Typ: Web Application)
//      Redirect URI: http://localhost:3001/oauth/callback
//   3. Refresh Token holen: node scripts/get-youtube-token.js
//   4. In .env eintragen:
//        YOUTUBE_CLIENT_ID=...
//        YOUTUBE_CLIENT_SECRET=...
//        YOUTUBE_REFRESH_TOKEN=...
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent, AgentInput, AgentOutput } from './base'
import { readFileSync, existsSync } from 'fs'

// ── OAuth Token Refresh ───────────────────────────────────────────────────────

interface TokenResponse {
  access_token:       string
  expires_in:         number
  token_type:         string
  error?:             string
  error_description?: string
}

async function getYouTubeAccessToken(): Promise<string> {
  const clientId     = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'YouTube OAuth Keys fehlen — setze YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env'
    )
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }).toString(),
  })

  const data = await res.json() as TokenResponse

  if (data.error || !data.access_token) {
    throw new Error(
      `OAuth Token Fehler: ${data.error_description || data.error || 'Unbekannt'}`
    )
  }

  return data.access_token
}

// ── YouTube Resumable Upload ──────────────────────────────────────────────────

interface YouTubeUploadResult {
  videoId: string
  url:     string
}

async function uploadToYouTube(params: {
  videoPath:   string
  title:       string
  description: string
  tags:        string[]
  accessToken: string
}): Promise<YouTubeUploadResult> {
  const { videoPath, title, description, tags, accessToken } = params

  if (!existsSync(videoPath)) {
    throw new Error(`Video-Datei nicht gefunden: ${videoPath}`)
  }

  const videoBuffer = readFileSync(videoPath)
  const fileSize    = videoBuffer.length

  console.log(`[UploadAgent] Video-Größe: ${(fileSize / 1024 / 1024).toFixed(1)} MB`)

  // ── Schritt 1: Upload-Session initiieren ──────────────────────────────────
  const metadata = {
    snippet: {
      title:       title.slice(0, 100),
      description: description.slice(0, 5000),
      tags:        tags.slice(0, 500),
      categoryId:  '22', // People & Blogs
    },
    status: {
      privacyStatus:           'public',
      selfDeclaredMadeForKids: false,
    },
  }

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method:  'POST',
      headers: {
        Authorization:             `Bearer ${accessToken}`,
        'Content-Type':            'application/json; charset=UTF-8',
        'X-Upload-Content-Type':   'video/mp4',
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify(metadata),
    }
  )

  if (!initRes.ok) {
    const errText = await initRes.text()
    throw new Error(`YouTube Upload-Init fehlgeschlagen (HTTP ${initRes.status}): ${errText.slice(0, 300)}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('Kein Upload-URL von YouTube erhalten')

  console.log('[UploadAgent] Upload-Session erstellt, lade Video hoch…')

  // ── Schritt 2: Video hochladen ────────────────────────────────────────────
  const uploadRes = await fetch(uploadUrl, {
    method:  'PUT',
    headers: {
      'Content-Type':   'video/mp4',
      'Content-Length': String(fileSize),
    },
    body: videoBuffer,
  })

  // 200 = success, 201 = created — beide sind OK
  if (!uploadRes.ok && uploadRes.status !== 201) {
    const errText = await uploadRes.text()
    throw new Error(`YouTube Upload fehlgeschlagen (HTTP ${uploadRes.status}): ${errText.slice(0, 300)}`)
  }

  const video = await uploadRes.json() as { id?: string }
  const videoId = video.id

  if (!videoId) throw new Error('Kein Video-ID von YouTube erhalten')

  return {
    videoId,
    url: `https://youtube.com/shorts/${videoId}`,
  }
}

// ── TikTok Upload (Content Posting API v2) ────────────────────────────────────
// Benötigt: TIKTOK_ACCESS_TOKEN (via TikTok for Developers OAuth)

interface TikTokUploadResult {
  publishId: string
  url:       string
}

async function uploadToTikTok(params: {
  videoPath:   string
  title:       string
  accessToken: string
}): Promise<TikTokUploadResult | null> {
  const { videoPath, title, accessToken } = params

  if (!existsSync(videoPath)) return null

  try {
    const videoBuffer = readFileSync(videoPath)
    const fileSize    = videoBuffer.length

    // Initiiere Direct Post Upload
    const initRes = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title:           title.slice(0, 2200),
            privacy_level:   'PUBLIC_TO_EVERYONE',
            disable_duet:    false,
            disable_comment: false,
            disable_stitch:  false,
          },
          source_info: {
            source:            'FILE_UPLOAD',
            video_size:        fileSize,
            chunk_size:        fileSize,
            total_chunk_count: 1,
          },
        }),
      }
    )

    if (!initRes.ok) return null

    const initData = await initRes.json() as {
      data?: { publish_id?: string; upload_url?: string }
    }

    const publishId = initData.data?.publish_id
    const uploadUrl = initData.data?.upload_url

    if (!publishId || !uploadUrl) return null

    // Video-Bytes hochladen
    const uploadRes = await fetch(uploadUrl, {
      method:  'PUT',
      headers: {
        'Content-Type':            'video/mp4',
        'Content-Length':          String(fileSize),
        'Content-Range':           `bytes 0-${fileSize - 1}/${fileSize}`,
      },
      body: videoBuffer,
    })

    if (!uploadRes.ok) return null

    return {
      publishId,
      url: `https://www.tiktok.com/`, // TikTok gibt keine direkte Video-URL zurück
    }
  } catch (e) {
    console.error('[UploadAgent] TikTok Fehler:', e)
    return null
  }
}

// ── Upload Agent ──────────────────────────────────────────────────────────────

export class UploadAgent extends BaseAgent {
  slug = 'upload-agent'
  name = 'Upload Bot'

  validateInput(_input: AgentInput): boolean | string { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()

    try {
      // Input auflösen — videoPath kommt vom Video Engine Agent
      const videoPath   = (input.videoPath   as string | undefined) || null
      const videoUrl    = (input.videoUrl    as string | undefined) || null
      const title       = (input.title       as string | undefined) || 'Luxury Lifestyle ✨ #Shorts'
      const description = (input.description as string | undefined) || 'Luxury Lifestyle · Motivation · Disziplin'
      const tags        = (input.tags        as string[] | undefined) || ['luxury', 'shorts', 'motivation', 'lifestyle']

      // videoPath bevorzugen (direkt vom Video Engine), dann videoUrl
      const sourceFile = videoPath || videoUrl

      if (!sourceFile) {
        return this.generateOutput({
          skipped: true,
          reason:  'Kein Video-File — Video Engine muss zuerst laufen',
          status:  { youtube: 'skipped', tiktok: 'skipped', instagram: 'skipped' },
        }, start)
      }

      // Prüfe ob Datei tatsächlich existiert (videoPath)
      if (videoPath && !existsSync(videoPath)) {
        return this.generateOutput({
          skipped: true,
          reason:  `Video-Datei nicht gefunden: ${videoPath}`,
          status:  { youtube: 'skipped', tiktok: 'skipped', instagram: 'skipped' },
        }, start)
      }

      const hasYouTube = !!(
        process.env.YOUTUBE_CLIENT_ID &&
        process.env.YOUTUBE_CLIENT_SECRET &&
        process.env.YOUTUBE_REFRESH_TOKEN
      )
      const hasTikTok  = !!process.env.TIKTOK_ACCESS_TOKEN

      const uploadStatus: Record<string, string> = {
        youtube:   hasYouTube ? 'pending' : 'credentials_missing',
        tiktok:    hasTikTok  ? 'pending' : 'credentials_missing',
        instagram: 'manual_required', // Instagram erfordert Facebook Business App Review
      }

      const errors:      string[]  = []
      let   youtubeUrl:  string | null = null
      let   youtubeId:   string | null = null
      let   tiktokUrl:   string | null = null

      // ── YouTube Upload ────────────────────────────────────────────────────
      if (hasYouTube && sourceFile) {
        try {
          console.log('[UploadAgent] 🔑 YouTube Token wird geholt…')
          const accessToken = await getYouTubeAccessToken()

          console.log('[UploadAgent] 📤 YouTube Upload startet…')
          const yt = await uploadToYouTube({
            videoPath:   sourceFile,
            title,
            description,
            tags,
            accessToken,
          })

          youtubeUrl           = yt.url
          youtubeId            = yt.videoId
          uploadStatus.youtube = 'uploaded'
          console.log(`[UploadAgent] ✅ YouTube: ${yt.url}`)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error(`[UploadAgent] ❌ YouTube: ${msg}`)
          uploadStatus.youtube = 'error'
          errors.push(`YouTube: ${msg}`)
        }
      }

      // ── TikTok Upload ─────────────────────────────────────────────────────
      if (hasTikTok && sourceFile) {
        try {
          console.log('[UploadAgent] 📤 TikTok Upload startet…')
          const tt = await uploadToTikTok({
            videoPath:   sourceFile,
            title,
            accessToken: process.env.TIKTOK_ACCESS_TOKEN!,
          })

          if (tt) {
            tiktokUrl           = tt.url
            uploadStatus.tiktok = 'uploaded'
            console.log(`[UploadAgent] ✅ TikTok: publish_id ${tt.publishId}`)
          } else {
            uploadStatus.tiktok = 'error'
            errors.push('TikTok: Upload fehlgeschlagen')
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error(`[UploadAgent] ❌ TikTok: ${msg}`)
          uploadStatus.tiktok = 'error'
          errors.push(`TikTok: ${msg}`)
        }
      }

      const anySuccess =
        uploadStatus.youtube === 'uploaded' ||
        uploadStatus.tiktok  === 'uploaded'

      const credentialsMissing = !hasYouTube && !hasTikTok

      return this.generateOutput({
        attempted:    true,
        sourceFile,
        title,
        description,
        tags,
        uploadedAt:   new Date().toISOString(),
        youtubeUrl,
        youtubeVideoId: youtubeId,
        tiktokUrl,
        instagramUrl: null,
        instagramNote: 'Instagram Reels Upload erfordert Facebook Business App Review — nutze Creator Studio manuell.',
        status:       uploadStatus,
        errors,
        success:      anySuccess,
        credentialsMissing,
        setupRequired: credentialsMissing
          ? [
              'YouTube: YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET + YOUTUBE_REFRESH_TOKEN in .env',
              'Refresh Token holen: node scripts/get-youtube-token.js',
            ]
          : [],
        summary: credentialsMissing
          ? 'YouTube OAuth Keys fehlen — führe node scripts/get-youtube-token.js aus'
          : anySuccess
            ? `✅ Upload erfolgreich: ${[youtubeUrl, tiktokUrl].filter(Boolean).join(' | ')}`
            : `❌ Alle Uploads fehlgeschlagen: ${errors.join(' | ')}`,
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}
