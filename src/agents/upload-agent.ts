import { BaseAgent, AgentInput, AgentOutput } from './base'
import { readFileSync } from 'fs'

export interface UploadResult {
  platform: string
  status: 'success' | 'error'
  url?: string
  videoId?: string
  error?: string
  uploadedAt: string
}

export class UploadAgent extends BaseAgent {
  slug = 'upload-agent'
  name = 'Upload Agent'

  validateInput(input: AgentInput): boolean | string {
    if (!input.title) return 'Titel fehlt'
    if (!input.description) return 'Beschreibung fehlt'
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start   = Date.now()
    const results: UploadResult[] = []

    const title       = input.title as string
    const description = input.description as string
    const tags        = (input.tags as string[]) || []
    const videoPath   = input.videoPath as string | undefined

    try {
      const ytResult = await this.uploadToYouTube({ title, description, tags, videoPath })
      results.push(ytResult)
    } catch (err) {
      results.push({
        platform: 'youtube',
        status: 'error',
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
        uploadedAt: new Date().toISOString(),
      })
    }

    const successCount = results.filter(r => r.status === 'success').length
    const failCount    = results.filter(r => r.status === 'error').length

    return {
      success: successCount > 0,
      data: { results, successCount, failCount, uploadedAt: new Date().toISOString() },
      durationMs: Date.now() - start,
    }
  }

  private async uploadToYouTube(opts: {
    title: string
    description: string
    tags: string[]
    videoPath?: string
  }): Promise<UploadResult> {
    const clientId     = process.env.YOUTUBE_CLIENT_ID
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      return {
        platform: 'youtube',
        status: 'error',
        error: 'YouTube API Keys fehlen in .env',
        uploadedAt: new Date().toISOString(),
      }
    }

    // 1. Access Token holen
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return {
        platform: 'youtube',
        status: 'error',
        error: `Token-Fehler: ${tokenData.error_description || tokenData.error}`,
        uploadedAt: new Date().toISOString(),
      }
    }

    const accessToken = tokenData.access_token

    // Kein Video = Verbindungstest
    if (!opts.videoPath) {
      return {
        platform: 'youtube',
        status: 'success',
        url: 'https://studio.youtube.com',
        videoId: 'connection-test-ok',
        uploadedAt: new Date().toISOString(),
      }
    }

    // 2. Resumable Upload starten
    const videoMetadata = {
      snippet: {
        title:           opts.title,
        description:     opts.description,
        tags:            opts.tags,
        categoryId:      '22',
        defaultLanguage: 'de',
      },
      status: {
        privacyStatus:              'private',
        selfDeclaredMadeForKids:    false,
      },
    }

    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization:            `Bearer ${accessToken}`,
          'Content-Type':           'application/json',
          'X-Upload-Content-Type':  'video/*',
        },
        body: JSON.stringify(videoMetadata),
      }
    )

    const uploadUrl = initRes.headers.get('location')
    if (!uploadUrl) {
      return {
        platform: 'youtube',
        status: 'error',
        error: 'Upload-URL konnte nicht erstellt werden',
        uploadedAt: new Date().toISOString(),
      }
    }

    // 3. Video hochladen
    const videoBuffer = readFileSync(opts.videoPath)
    const uploadRes   = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/*' },
      body: videoBuffer,
    })

    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) {
      return {
        platform: 'youtube',
        status: 'error',
        error: uploadData.error?.message || 'Upload fehlgeschlagen',
        uploadedAt: new Date().toISOString(),
      }
    }

    return {
      platform: 'youtube',
      status: 'success',
      url: `https://studio.youtube.com/video/${uploadData.id}/edit`,
      videoId: uploadData.id,
      uploadedAt: new Date().toISOString(),
    }
  }
}
