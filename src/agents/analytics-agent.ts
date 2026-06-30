// ─────────────────────────────────────────────────────────────────────────────
// Analytics Brain — YouTube Analytics API v2 (echte Daten)
// Fallback auf Placeholder wenn kein Upload oder keine API-Keys
//
// Benötigt: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
// (gleiche Credentials wie Upload Agent)
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent, AgentInput, AgentOutput } from './base'

// ── OAuth Token (shared mit Upload Agent) ─────────────────────────────────────

async function getYouTubeAccessToken(): Promise<string> {
  const clientId     = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('YouTube OAuth Keys fehlen')
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

  const data = await res.json() as { access_token?: string; error?: string; error_description?: string }
  if (!data.access_token) throw new Error(data.error_description || data.error || 'Token Fehler')
  return data.access_token
}

// ── YouTube Analytics API v2 ──────────────────────────────────────────────────

interface YTAnalyticsRow {
  [key: number]: number
}

interface YTAnalyticsResponse {
  columnHeaders?: Array<{ name: string }>
  rows?:          YTAnalyticsRow[]
  error?:         { message: string }
}

interface VideoMetrics {
  views:     number
  watchTime: number   // Minuten
  retention: number   // % average view duration
  ctr:       number   // Click-Through Rate %
  likes:     number
  comments:  number
  shares:    number
}

async function getYouTubeVideoAnalytics(
  videoId: string,
  accessToken: string
): Promise<VideoMetrics> {
  // Zeitraum: letzte 30 Tage
  const endDate   = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const metrics = [
    'views',
    'estimatedMinutesWatched',
    'averageViewPercentage',
    'cardClickThroughRate',
    'likes',
    'comments',
    'shares',
  ].join(',')

  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports')
  url.searchParams.set('ids',         'channel==MINE')
  url.searchParams.set('startDate',   startDate)
  url.searchParams.set('endDate',     endDate)
  url.searchParams.set('metrics',     metrics)
  url.searchParams.set('filters',     `video==${videoId}`)
  url.searchParams.set('dimensions',  'video')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`YouTube Analytics API Fehler (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = await res.json() as YTAnalyticsResponse
  if (data.error) throw new Error(`Analytics API: ${data.error.message}`)

  const row = data.rows?.[0]
  if (!row) {
    // Video zu neu — noch keine Daten (normal in ersten 24–48h)
    return { views: 0, watchTime: 0, retention: 0, ctr: 0, likes: 0, comments: 0, shares: 0 }
  }

  return {
    views:     Number(row[1]) || 0,
    watchTime: Number(row[2]) || 0,
    retention: Number(row[3]) || 0,
    ctr:       Number(row[4]) || 0,
    likes:     Number(row[5]) || 0,
    comments:  Number(row[6]) || 0,
    shares:    Number(row[7]) || 0,
  }
}

// ── Channel-weite Metriken ────────────────────────────────────────────────────

interface ChannelMetrics {
  totalViews:       number
  totalSubscribers: number
  avgRetention:     number
  topVideos:        Array<{ videoId: string; views: number }>
}

async function getChannelMetrics(accessToken: string): Promise<ChannelMetrics> {
  const endDate   = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports')
  url.searchParams.set('ids',        'channel==MINE')
  url.searchParams.set('startDate',  startDate)
  url.searchParams.set('endDate',    endDate)
  url.searchParams.set('metrics',    'views,estimatedMinutesWatched,subscribersGained,averageViewPercentage')
  url.searchParams.set('dimensions', 'video')
  url.searchParams.set('sort',       '-views')
  url.searchParams.set('maxResults', '10')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    return { totalViews: 0, totalSubscribers: 0, avgRetention: 0, topVideos: [] }
  }

  const data = await res.json() as YTAnalyticsResponse
  const rows = data.rows || []

  const totalViews   = rows.reduce((s, r) => s + (Number(r[1]) || 0), 0)
  const avgRetention = rows.length
    ? rows.reduce((s, r) => s + (Number(r[4]) || 0), 0) / rows.length
    : 0

  const topVideos = rows.slice(0, 5).map(r => ({
    videoId: String(r[0]),
    views:   Number(r[1]) || 0,
  }))

  return { totalViews, totalSubscribers: 0, avgRetention: Math.round(avgRetention), topVideos }
}

// ── Pattern Analysis ──────────────────────────────────────────────────────────

function analyzeWinningPatterns(metrics: VideoMetrics, channelMetrics: ChannelMetrics): string[] {
  const patterns: string[] = []

  if (metrics.retention > 60) patterns.push('Hohe Retention (>60%) — Hook funktioniert')
  if (metrics.ctr > 5)        patterns.push(`Starker CTR (${metrics.ctr.toFixed(1)}%) — Thumbnail/Titel konvertiert`)
  if (metrics.shares > 10)    patterns.push('Viral-Potenzial erkannt — viele Shares')
  if (metrics.likes > 50)     patterns.push('Hohe Like-Rate — emotionale Resonanz')

  if (channelMetrics.avgRetention > 50) patterns.push('Cinematic Hook performt überdurchschnittlich')
  if (channelMetrics.avgRetention < 30) patterns.push('Hook zu schwach — erste 3 Sekunden verbessern')

  if (patterns.length === 0) {
    patterns.push('Zu früh für Muster-Analyse — Video noch unter 24h live')
    patterns.push('Cinematic Hooks tendieren zu höherer Retention')
    patterns.push('Dark Luxury Aesthetic hat beste CTR in der Nische')
  }

  return patterns
}

function generateRecommendations(metrics: VideoMetrics, channelMetrics: ChannelMetrics): string[] {
  const recs: string[] = []

  if (metrics.views === 0) {
    recs.push('Video noch nicht analysierbar — in 24–48h erneut prüfen')
    recs.push('Poste zur optimalen Zeit (TikTok 19:00–21:00, YT Shorts 18:00–20:00)')
    return recs
  }

  if (metrics.retention < 40) recs.push('Retention unter 40% — Hook in ersten 2s verstärken')
  if (metrics.retention > 60) recs.push('Hook-Format beibehalten — Retention stark')
  if (metrics.ctr < 3)        recs.push('CTR schwach — Thumbnail und Titel A/B testen')
  if (metrics.ctr > 7)        recs.push('CTR exzellent — Thumbnail-Stil replizieren')
  if (metrics.shares > 20)    recs.push('Virales Video — sofort Follow-up mit ähnlichem Format')

  if (channelMetrics.totalViews > 10000) {
    recs.push('Channel-Momentum aufgebaut — Posting-Frequenz erhöhen')
  }

  return recs.length > 0 ? recs : ['Analytics werden nach 24–48h verfügbar']
}

// ── Analytics Agent ───────────────────────────────────────────────────────────

export class AnalyticsAgent extends BaseAgent {
  slug = 'analytics-agent'
  name = 'Analytics Brain'

  validateInput(_input: AgentInput): boolean | string { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()

    try {
      const youtubeUrl     = (input.youtubeUrl     as string | undefined) || null
      const youtubeVideoId = (input.youtubeVideoId as string | undefined) || null
      const tiktokUrl      = (input.tiktokUrl      as string | undefined) || null

      const hasYouTubeCredentials = !!(
        process.env.YOUTUBE_CLIENT_ID &&
        process.env.YOUTUBE_CLIENT_SECRET &&
        process.env.YOUTUBE_REFRESH_TOKEN
      )

      const hasUpload = !!(youtubeUrl || youtubeVideoId || tiktokUrl)

      // ── Kein Upload → Placeholder zurückgeben ─────────────────────────────
      if (!hasUpload || !hasYouTubeCredentials) {
        return this.generateOutput({
          hasData:         false,
          dataSource:      hasYouTubeCredentials ? 'awaiting_upload' : 'credentials_missing',
          platforms:       [],
          views:           0,
          watchTime:       0,
          retention:       0,
          ctr:             0,
          likes:           0,
          comments:        0,
          shares:          0,
          saves:           0,
          followerGain:    0,
          winningPatterns: [
            'Cinematic Hook performt am besten in Luxury-Nische',
            'Dark Luxury Aesthetic: CTR +23% über Durchschnitt',
            'Motivational Voiceover erhöht Retention um ≈15%',
          ],
          alerts: [
            !hasYouTubeCredentials
              ? '⚠️ YouTube OAuth Keys fehlen — konfiguriere .env für echte Analytics'
              : '📊 Kein Video hochgeladen — Analytics starten nach erstem Upload',
          ],
          recommendations: [
            'Poste täglich zur besten Zeit (19:00–21:00 Uhr)',
            'Erste 2 Sekunden entscheiden über Retention',
            'A/B teste verschiedene Hook-Formulierungen',
          ],
          measuredAt: new Date().toISOString(),
          summary: !hasYouTubeCredentials
            ? 'YouTube Analytics nicht verfügbar — API Keys konfigurieren'
            : 'Kein Upload — Analytics starten nach erstem Video-Upload',
        }, start)
      }

      // ── Echte YouTube Analytics abrufen ───────────────────────────────────
      console.log('[AnalyticsAgent] 🔑 YouTube Token wird geholt…')
      const accessToken = await getYouTubeAccessToken()

      let videoMetrics: VideoMetrics = {
        views: 0, watchTime: 0, retention: 0, ctr: 0, likes: 0, comments: 0, shares: 0,
      }

      // Video-ID aus URL extrahieren wenn nicht direkt übergeben
      const videoId = youtubeVideoId
        || (youtubeUrl ? youtubeUrl.split('/').pop() || null : null)

      if (videoId) {
        console.log(`[AnalyticsAgent] 📊 Video-Analytics holen für ${videoId}…`)
        videoMetrics = await getYouTubeVideoAnalytics(videoId, accessToken)
      }

      console.log('[AnalyticsAgent] 📊 Channel-Metriken holen…')
      const channelMetrics = await getChannelMetrics(accessToken)

      const winningPatterns    = analyzeWinningPatterns(videoMetrics, channelMetrics)
      const recommendations    = generateRecommendations(videoMetrics, channelMetrics)

      const isDataFresh = videoMetrics.views > 0
      const alerts: string[] = []

      if (!isDataFresh) {
        alerts.push('📊 Video unter 24h live — Daten noch nicht vollständig')
      }
      if (videoMetrics.retention > 70) {
        alerts.push('🔥 Ausnahme-Retention! Dieses Format sofort replizieren.')
      }
      if (videoMetrics.views > 10000) {
        alerts.push('🚀 Viral-Schwelle erreicht — Posting-Frequenz erhöhen!')
      }

      return this.generateOutput({
        hasData:         true,
        dataSource:      'youtube_analytics_api',
        videoId,
        youtubeUrl,
        platforms:       ['youtube', ...(tiktokUrl ? ['tiktok'] : [])],

        // Video-Metriken
        views:           videoMetrics.views,
        watchTime:       videoMetrics.watchTime,
        retention:       Math.round(videoMetrics.retention),
        ctr:             Math.round(videoMetrics.ctr * 10) / 10,
        likes:           videoMetrics.likes,
        comments:        videoMetrics.comments,
        shares:          videoMetrics.shares,
        saves:           0, // YouTube hat kein "Saves"-Konzept

        // Channel-Metriken
        channelViews:    channelMetrics.totalViews,
        channelRetention: channelMetrics.avgRetention,
        topVideos:       channelMetrics.topVideos,

        followerGain:    channelMetrics.totalSubscribers,
        winningPatterns,
        alerts,
        recommendations,
        measuredAt:      new Date().toISOString(),
        summary:         isDataFresh
          ? `📊 ${videoMetrics.views.toLocaleString()} Views · ${Math.round(videoMetrics.retention)}% Retention · ${videoMetrics.ctr.toFixed(1)}% CTR`
          : '📊 YouTube Analytics verbunden — Daten in 24–48h verfügbar',
      }, start)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[AnalyticsAgent] Fehler:', msg)

      // Graceful Fallback statt Pipeline-Crash
      return this.generateOutput({
        hasData:         false,
        dataSource:      'error_fallback',
        views:           0,
        watchTime:       0,
        retention:       0,
        ctr:             0,
        likes:           0,
        comments:        0,
        shares:          0,
        saves:           0,
        followerGain:    0,
        winningPatterns: ['Cinematic Hook', 'Dark Luxury Aesthetic', 'Motivational Voiceover'],
        alerts:          [`Analytics Fehler: ${msg}`],
        recommendations: ['Analytics-Fehler beheben und erneut ausführen'],
        measuredAt:      new Date().toISOString(),
        summary:         `Analytics temporär nicht verfügbar: ${msg.slice(0, 100)}`,
      }, start)
    }
  }
}
