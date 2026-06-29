/**
 * Competitor Analyzer Agent v2
 * Analysiert TikTok, YouTube & Instagram Kanäle mit echten API-Daten
 */

// ── Typen ───────────────────────────────────────────────────────────────────

export interface VideoStat {
  id: string
  title: string
  views: number
  likes: number
  comments: number
  shares?: number
  url: string
  thumbnail?: string
  postedAt?: string
  hashtags: string[]
}

export interface ChannelProfile {
  username: string
  platform: 'tiktok' | 'youtube' | 'instagram'
  displayName: string
  followers: number
  following?: number
  totalLikes?: number
  totalVideos: number
  bio?: string
  verified?: boolean
  avgViews: number
  avgLikes: number
  engagementRate: number
  postingFrequency: string
  topVideos: VideoStat[]
  topHashtags: string[]
  bestPostingTimes: string[]
  nicheScore: number
  analysis: NicheAnalysis
  dataSource: 'live' | 'mock'
}

export interface NicheAnalysis {
  niche: string
  contentStyle: string
  hookPatterns: string[]
  viralFormula: string
  monetizationPotential: string
  competitionLevel: 'low' | 'medium' | 'high'
  growthPotential: 'low' | 'medium' | 'high'
  recommendation: string
  copyStrategy: string[]
}

export interface WebTrend {
  keyword: string
  source: string
  searchVolume: string
  trend: 'rising' | 'stable' | 'falling'
  relatedKeywords: string[]
  contentIdeas: string[]
}

export interface CompetitorReport {
  profiles: ChannelProfile[]
  webTrends: WebTrend[]
  overallNiche: string
  topHashtagsAcrossPlatforms: string[]
  viralHooks: string[]
  contentCalendar: string[]
  summary: string
}

// ── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Liest Zahl aus einem Wert der Number oder String sein kann */
function n(val: unknown): number {
  if (val === undefined || val === null) return 0
  const parsed = parseInt(String(val).replace(/[^0-9]/g, ''), 10)
  return isNaN(parsed) ? 0 : parsed
}

/** Liest Video-Stats aus `stats` oder `statsV2` (TikTok API Unterschiede) */
function readStats(v: Record<string, unknown>) {
  const s = (v.stats || v.statistics || {}) as Record<string, unknown>
  const s2 = (v.statsV2 || {}) as Record<string, unknown>
  const get = (key: string) => n(s[key] ?? s2[key])
  return {
    views: get('playCount') || get('viewCount') || get('view_count') || 0,
    likes: get('diggCount') || get('likeCount') || get('like_count') || 0,
    comments: get('commentCount') || get('comment_count') || 0,
    shares: get('shareCount') || get('share_count') || 0,
  }
}

function calcPostingFrequency(videos: VideoStat[]): string {
  const dated = videos.filter(v => v.postedAt).sort((a, b) =>
    new Date(b.postedAt!).getTime() - new Date(a.postedAt!).getTime()
  )
  if (dated.length < 2) return 'Unbekannt'
  const newest = new Date(dated[0].postedAt!).getTime()
  const oldest = new Date(dated[dated.length - 1].postedAt!).getTime()
  const days = (newest - oldest) / 86400000
  const perWeek = days > 0 ? ((dated.length / days) * 7).toFixed(1) : '?'
  return `~${perWeek}x / Woche`
}

function calcNicheScore(avgViews: number, engagementRate: number, followers: number): number {
  let s = 0
  if (avgViews > 500000) s += 40
  else if (avgViews > 100000) s += 30
  else if (avgViews > 10000) s += 20
  else if (avgViews > 1000) s += 10
  if (engagementRate > 8) s += 30
  else if (engagementRate > 5) s += 25
  else if (engagementRate > 2) s += 15
  else if (engagementRate > 0.5) s += 8
  if (followers > 1000000) s += 30
  else if (followers > 100000) s += 25
  else if (followers > 10000) s += 15
  else if (followers > 1000) s += 8
  return Math.min(s, 100)
}

function generateAnalysis(videos: VideoStat[], hashtags: string[], platform: string): NicheAnalysis {
  const text = videos.map(v => v.title.toLowerCase()).join(' ')

  let niche = 'Allgemein / Lifestyle'
  if (/geld|money|verdien|hustle|reich|finanz|invest|krypto|crypto/.test(text)) niche = 'Finance / Side Hustle'
  else if (/fitness|workout|gym|sport|training|abnehm/.test(text)) niche = 'Fitness / Health'
  else if (/rezept|kochen|food|essen|backen|küche/.test(text)) niche = 'Food / Kochen'
  else if (/\bki\b|chatgpt|\bai\b|künstliche|midjourney|automation/.test(text)) niche = 'KI / Tech'
  else if (/motivation|mindset|erfolg|mindfulness|produktiv/.test(text)) niche = 'Motivation / Mindset'
  else if (/reise|travel|urlaub|trip|hotel/.test(text)) niche = 'Travel / Lifestyle'
  else if (/beauty|makeup|mode|fashion|style|outfit/.test(text)) niche = 'Beauty / Fashion'
  else if (/business|startup|marketing|brand|sales|verkauf/.test(text)) niche = 'Business / Marketing'

  const hooks: string[] = []
  if (/fehler|mistake|falsch|wrong/.test(text)) hooks.push('"Diese X Fehler machen alle"')
  if (/geheimnis|secret|niemand|keiner/.test(text)) hooks.push('"Das Geheimnis das niemand dir sagt"')
  if (/€|\$|euro|dollar/.test(text)) hooks.push('"X€ in Y Tagen — so geht\'s"')
  if (/wie ich|how i|meine story/.test(text)) hooks.push('"Wie ich X in Y geschafft habe"')
  if (/teil|part|serie|folge/.test(text)) hooks.push('Serienformat: Teil 1/2/3...')
  if (hooks.length === 0) hooks.push('"X Tipps die dein Leben verändern"', '"POV: Du weißt endlich wie..."')

  return {
    niche,
    contentStyle:
      platform === 'tiktok' ? 'Schnelle Cuts, Text-Overlays, Trending Audio, <60 Sek.' :
      platform === 'youtube' ? 'Thumbnails mit Gesicht, starke Titel, SEO-optimiert' :
      'Reels mit starkem Hook in Sek. 1, Karussell-Posts',
    hookPatterns: hooks,
    viralFormula: 'Problem ansprechen → emotionale Reaktion → Lösung → Konkreter CTA',
    monetizationPotential:
      /Finance|KI|Business/.test(niche) ? 'Sehr hoch (Affiliate, Kurse, Coaching)' :
      /Fitness|Motivation/.test(niche) ? 'Hoch (Supplements, Coaching, Merch)' : 'Mittel (Brand Deals)',
    competitionLevel:
      (videos[0]?.views || 0) > 500000 ? 'high' :
      (videos[0]?.views || 0) > 50000 ? 'medium' : 'low',
    growthPotential: /KI|Finance|Business/.test(niche) ? 'high' : 'medium',
    recommendation: `Fokus auf "${niche}" mit konsequentem Posting (5–7x/Woche). Kopiere die bewährtesten Formate und mache sie besser.`,
    copyStrategy: [
      `Analysiere die Top-5 Videos und rekreiere denselben Aufbau`,
      hashtags.length > 0 ? `Nutze diese Hashtags: ${hashtags.slice(0, 4).join(' ')}` : 'Hashtags aus der Nische nutzen',
      `Poste zur Primetime des Kanals`,
      `Führe eine eigene Perspektive ein — nicht 1:1 kopieren`,
    ],
  }
}

// ── TikTok Analyzer ─────────────────────────────────────────────────────────

async function analyzeTikTok(username: string): Promise<ChannelProfile | null> {
  const key = process.env.RAPIDAPI_KEY || ''
  if (!key) {
    console.warn('[TikTok] Kein RAPIDAPI_KEY — Mock-Daten')
    return getMockTikTokProfile(username)
  }

  const BASE = 'https://tiktok-api23.p.rapidapi.com'
  const headers = {
    'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
    'x-rapidapi-key': key,
  }

  // ── 1. User-Info ──────────────────────────────────────────────────────────
  console.log(`[TikTok] Hole User-Info für @${username}`)
  const profileRes = await fetch(`${BASE}/api/user/info?uniqueId=${encodeURIComponent(username)}`, { headers })
  const profileData = await profileRes.json()
  console.log('[TikTok PROFILE]', JSON.stringify(profileData).slice(0, 400))

  // Fehler-Check
  if (profileData?.message && !profileData?.userInfo) {
    throw new Error(`TikTok API: ${profileData.message}`)
  }

  const user     = profileData?.userInfo?.user
  const stats    = profileData?.userInfo?.stats

  if (!user) {
    throw new Error(`TikTok: @${username} nicht gefunden`)
  }

  const followers    = n(stats?.followerCount)
  const totalLikes   = n(stats?.heartCount)
  const totalVideos  = n(stats?.videoCount)
  const secUid       = String(user.secUid || '')

  console.log(`[TikTok] @${username}: ${followers} Follower | ${totalLikes} Likes | secUid: ${secUid.slice(0, 20)}...`)

  // ── 2. Videos holen ───────────────────────────────────────────────────────
  let rawVideos: Record<string, unknown>[] = []

  if (secUid) {
    const vidRes = await fetch(
      `${BASE}/api/user/posts?secUid=${encodeURIComponent(secUid)}&count=30&cursor=0`,
      { headers }
    )
    const vidData = await vidRes.json()
    console.log('[TikTok VIDEOS]', JSON.stringify(vidData).slice(0, 300))

    // Verschiedene mögliche Keys je nach API-Version
    rawVideos = vidData?.itemList || vidData?.items || vidData?.data?.itemList || vidData?.data?.items || []

    // Wenn leer, versuche /api/user/oldest-posts
    if (rawVideos.length === 0) {
      const alt = await fetch(
        `${BASE}/api/user/oldest-posts?secUid=${encodeURIComponent(secUid)}&count=30`,
        { headers }
      )
      const altData = await alt.json()
      rawVideos = altData?.itemList || altData?.items || altData?.data?.itemList || []
    }
  }

  console.log(`[TikTok] ${rawVideos.length} Videos geladen`)

  // ── 3. Video-Stats parsen ─────────────────────────────────────────────────
  const topVideos: VideoStat[] = rawVideos.map((v) => {
    const st = readStats(v)
    const desc = String(v.desc || v.title || v.text || '')
    const hashtags = desc.match(/#[\wÀ-ž一-鿿]+/g) || []
    return {
      id: String(v.id || v.aweme_id || ''),
      title: desc.slice(0, 120) || '(kein Titel)',
      views: st.views,
      likes: st.likes,
      comments: st.comments,
      shares: st.shares,
      url: `https://www.tiktok.com/@${username}/video/${v.id || v.aweme_id}`,
      hashtags,
      postedAt: v.createTime ? new Date(Number(v.createTime) * 1000).toISOString() : undefined,
    }
  }).sort((a, b) => b.views - a.views)

  const avgViews = topVideos.length
    ? Math.round(topVideos.reduce((s, v) => s + v.views, 0) / topVideos.length) : 0
  const avgLikes = topVideos.length
    ? Math.round(topVideos.reduce((s, v) => s + v.likes, 0) / topVideos.length) : 0
  const engagementRate = followers > 0
    ? parseFloat(((avgLikes / followers) * 100).toFixed(2)) : 0

  const hashtagCount: Record<string, number> = {}
  topVideos.flatMap(v => v.hashtags).forEach(h => { hashtagCount[h] = (hashtagCount[h] || 0) + 1 })
  const topHashtags = Object.entries(hashtagCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 12).map(([h]) => h)

  return {
    username,
    platform: 'tiktok',
    displayName: user.nickname || user.uniqueId || username,
    followers,
    following: n(stats?.followingCount),
    totalLikes,
    totalVideos: totalVideos || rawVideos.length,
    bio: String(user.signature || ''),
    verified: Boolean(user.verified),
    avgViews,
    avgLikes,
    engagementRate,
    postingFrequency: calcPostingFrequency(topVideos),
    topVideos: topVideos.slice(0, 8),
    topHashtags,
    bestPostingTimes: ['18:00–20:00', '12:00–13:00', '07:00–09:00'],
    nicheScore: calcNicheScore(avgViews, engagementRate, followers),
    analysis: generateAnalysis(topVideos, topHashtags, 'tiktok'),
    dataSource: 'live',
  }
}

// ── YouTube Analyzer ─────────────────────────────────────────────────────────

async function analyzeYouTube(handle: string): Promise<ChannelProfile | null> {
  const clientId     = process.env.YOUTUBE_CLIENT_ID || ''
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || ''
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN || ''

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('[YouTube] OAuth-Credentials fehlen — Mock-Daten')
    return getMockYouTubeProfile(handle)
  }

  // Access-Token holen
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  if (!accessToken) {
    console.warn('[YouTube] Kein Access-Token — Mock-Daten:', tokenData)
    return getMockYouTubeProfile(handle)
  }

  const ytHeaders = { Authorization: `Bearer ${accessToken}` }

  // Channel suchen
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1`,
    { headers: ytHeaders }
  )
  const searchData = await searchRes.json()
  const channelId = searchData?.items?.[0]?.id?.channelId

  if (!channelId) throw new Error(`YouTube: Kanal "${handle}" nicht gefunden`)

  // Channel-Stats
  const chanRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}`,
    { headers: ytHeaders }
  )
  const chanData = await chanRes.json()
  const channel = chanData?.items?.[0]
  if (!channel) throw new Error(`YouTube: Keine Channel-Daten für ${channelId}`)

  const st = channel.statistics
  const followers = n(st.subscriberCount)

  // Top Videos (nach Views)
  const vidRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&maxResults=10&type=video`,
    { headers: ytHeaders }
  )
  const vidData = await vidRes.json()
  const videoIds = (vidData?.items || [])
    .map((v: Record<string, unknown>) => (v.id as Record<string, string>)?.videoId)
    .filter(Boolean)
    .join(',')

  let topVideos: VideoStat[] = []

  if (videoIds) {
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
      { headers: ytHeaders }
    )
    const detailData = await detailRes.json()
    topVideos = (detailData?.items || []).map((v: Record<string, unknown>) => {
      const s = (v.statistics || {}) as Record<string, string>
      const sn = (v.snippet || {}) as Record<string, unknown>
      const tags = (sn.tags as string[] | undefined) || []
      return {
        id: String(v.id),
        title: String(sn.title || ''),
        views: n(s.viewCount),
        likes: n(s.likeCount),
        comments: n(s.commentCount),
        url: `https://youtube.com/watch?v=${v.id}`,
        thumbnail: ((sn.thumbnails as Record<string, Record<string, string>>)?.medium?.url) || '',
        hashtags: tags.slice(0, 5).map(t => `#${t}`),
        postedAt: String(sn.publishedAt || ''),
      }
    }).sort((a: VideoStat, b: VideoStat) => b.views - a.views)
  }

  const avgViews = topVideos.length ? Math.round(topVideos.reduce((s, v) => s + v.views, 0) / topVideos.length) : 0
  const avgLikes = topVideos.length ? Math.round(topVideos.reduce((s, v) => s + v.likes, 0) / topVideos.length) : 0
  const engagementRate = followers > 0 ? parseFloat(((avgLikes / followers) * 100).toFixed(2)) : 0

  const hashtagCount: Record<string, number> = {}
  topVideos.flatMap(v => v.hashtags).forEach(h => { hashtagCount[h] = (hashtagCount[h] || 0) + 1 })
  const topHashtags = Object.entries(hashtagCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h]) => h)

  return {
    username: handle,
    platform: 'youtube',
    displayName: String(channel.snippet?.title || handle),
    followers,
    totalVideos: n(st.videoCount),
    totalLikes: n(st.likeCount),
    bio: String(channel.snippet?.description || '').slice(0, 200),
    verified: false,
    avgViews,
    avgLikes,
    engagementRate,
    postingFrequency: calcPostingFrequency(topVideos),
    topVideos: topVideos.slice(0, 8),
    topHashtags,
    bestPostingTimes: ['15:00–17:00', '20:00–22:00', '10:00–12:00'],
    nicheScore: calcNicheScore(avgViews, engagementRate, followers),
    analysis: generateAnalysis(topVideos, topHashtags, 'youtube'),
    dataSource: 'live',
  }
}

// ── Instagram Analyzer ───────────────────────────────────────────────────────
// API: instagram-scraper-stable-api.p.rapidapi.com (POST, form-data)

const IG_HOST = 'instagram-scraper-stable-api.p.rapidapi.com'
const IG_BASE = `https://${IG_HOST}`

async function igPost(
  endpoint: string,
  key: string,
  body: Record<string, string>
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams(body)
  const res = await fetch(`${IG_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-rapidapi-host': IG_HOST,
      'x-rapidapi-key': key,
    },
    body: params.toString(),
    signal: AbortSignal.timeout(10000),
  })
  return res.json() as Promise<Record<string, unknown>>
}

async function analyzeInstagram(username: string): Promise<ChannelProfile | null> {
  const key = process.env.RAPIDAPI_KEY || ''
  if (!key) return getMockInstagramProfile(username)

  // Normalize: strip URL to bare username
  const handle = username.replace(/^https?:\/\/(www\.)?instagram\.com\/?/i, '').replace(/\/$/, '').replace(/^@/, '')
  const profileUrl = `https://www.instagram.com/${handle}/`

  console.log(`[Instagram] Hole Profil für @${handle}`)

  // ── 1. Profil-Info ────────────────────────────────────────────────────────
  let infoData: Record<string, unknown>
  try {
    infoData = await igPost('get_ig_user_info_v2.php', key, {
      username_or_url: profileUrl,
    })
    console.log('[Instagram PROFILE]', JSON.stringify(infoData).slice(0, 400))
  } catch (err) {
    console.warn('[Instagram] Fetch-Fehler — Mock-Daten:', err)
    return getMockInstagramProfile(handle)
  }

  // API-Fehler oder nicht abonniert → Mock
  if (infoData?.error || infoData?.message || infoData?.status === 'error') {
    const msg = String(infoData.error || infoData.message || 'API error')
    console.warn(`[Instagram] API-Fehler ("${msg}") — Mock-Daten`)
    return getMockInstagramProfile(handle)
  }

  // Daten auslesen — verschiedene mögliche Strukturen
  const user = (infoData?.user || infoData?.data || infoData) as Record<string, unknown>
  const followers   = n(user.follower_count ?? user.followers ?? user.edge_followed_by)
  const following   = n(user.following_count ?? user.following)
  const totalVideos = n(user.media_count ?? user.post_count ?? 0)

  // ── 2. Posts holen ────────────────────────────────────────────────────────
  let posts: Record<string, unknown>[] = []
  try {
    const postsData = await igPost('get_ig_user_posts_v2.php', key, {
      username_or_url: profileUrl,
      amount: '20',
      pagination_token: '',
    })
    console.log('[Instagram POSTS]', JSON.stringify(postsData).slice(0, 300))
    posts = (
      postsData?.posts ||
      postsData?.data ||
      postsData?.items ||
      (Array.isArray(postsData) ? postsData : [])
    ) as Record<string, unknown>[]
  } catch (err) {
    console.warn('[Instagram] Posts-Fehler (ignoriert):', err)
  }

  const topVideos: VideoStat[] = posts.map(p => {
    const caption = String(
      (p.caption as Record<string, unknown>)?.text ||
      p.caption || p.text || p.description || ''
    )
    const hashtags = caption.match(/#[\wÀ-ž]+/g) || []
    return {
      id:       String(p.id || p.pk || p.shortcode || ''),
      title:    caption.slice(0, 100) || '(kein Titel)',
      views:    n(p.play_count ?? p.view_count ?? p.video_view_count ?? p.like_count),
      likes:    n(p.like_count ?? p.likes_count),
      comments: n(p.comment_count ?? p.comments_count),
      url:      `https://instagram.com/p/${p.code || p.shortcode || p.id || ''}`,
      hashtags,
      postedAt: p.taken_at
        ? new Date(Number(p.taken_at) * 1000).toISOString()
        : String(p.timestamp || p.created_at || ''),
    }
  }).sort((a, b) => b.likes - a.likes)

  const avgViews       = topVideos.length ? Math.round(topVideos.reduce((s, v) => s + v.views, 0) / topVideos.length) : 0
  const avgLikes       = topVideos.length ? Math.round(topVideos.reduce((s, v) => s + v.likes, 0) / topVideos.length) : 0
  const engagementRate = followers > 0 ? parseFloat(((avgLikes / followers) * 100).toFixed(2)) : 0

  const hashtagCount: Record<string, number> = {}
  topVideos.flatMap(v => v.hashtags).forEach(h => { hashtagCount[h] = (hashtagCount[h] || 0) + 1 })
  const topHashtags = Object.entries(hashtagCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h]) => h)

  return {
    username:         handle,
    platform:         'instagram',
    displayName:      String(user.full_name || user.name || handle),
    followers,
    following,
    totalVideos:      totalVideos || topVideos.length,
    bio:              String(user.biography || user.bio || '').slice(0, 200),
    verified:         Boolean(user.is_verified ?? user.verified),
    avgViews,
    avgLikes,
    engagementRate,
    postingFrequency: calcPostingFrequency(topVideos),
    topVideos:        topVideos.slice(0, 8),
    topHashtags,
    bestPostingTimes: ['11:00–13:00', '19:00–21:00', '08:00–09:00'],
    nicheScore:       calcNicheScore(avgViews, engagementRate, followers),
    analysis:         generateAnalysis(topVideos, topHashtags, 'instagram'),
    dataSource:       'live',
  }
}

// ── Web Trends ───────────────────────────────────────────────────────────────

async function researchWebTrends(niche: string): Promise<WebTrend[]> {
  const queries = [
    `${niche} viral content ideas 2025`,
    `${niche} TikTok trending`,
  ]
  const trends: WebTrend[] = []

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}&hl=de`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) }
      )
      const data = await res.json()
      const suggestions: string[] = data[1] || []
      if (suggestions.length > 0) {
        trends.push({
          keyword: q,
          source: 'Google Suggest',
          searchVolume: 'hoch',
          trend: 'rising',
          relatedKeywords: suggestions.slice(0, 5),
          contentIdeas: suggestions.slice(0, 3).map(s => `Video: "${s}"`),
        })
      }
    } catch {
      trends.push({
        keyword: niche,
        source: 'Intern',
        searchVolume: 'mittel',
        trend: 'rising',
        relatedKeywords: [`${niche} anfänger`, `${niche} tipps`, `${niche} 2025`],
        contentIdeas: [
          `Top 5 ${niche} Hacks 2025`,
          `So startest du mit ${niche} ohne Erfahrung`,
          `${niche}: Fehler die alle machen`,
        ],
      })
    }
  }
  return trends
}

// ── Mock-Daten ────────────────────────────────────────────────────────────────

function getMockTikTokProfile(username: string): ChannelProfile {
  const vids = [
    { id: '1', title: 'Diese 3 KI-Tools machen mich reich #sidehustle #ki', views: 892000, likes: 45200, comments: 1240, shares: 8900, url: `https://tiktok.com/@${username}`, hashtags: ['#sidehustle', '#ki'] },
    { id: '2', title: 'Wie ich mit ChatGPT 2000€ in einer Woche verdient habe', views: 654000, likes: 32100, comments: 980, shares: 6700, url: `https://tiktok.com/@${username}`, hashtags: ['#chatgpt', '#geld'] },
    { id: '3', title: 'Der einfachste Side Hustle 2025 ohne Startkapital', views: 412000, likes: 21800, comments: 743, shares: 4200, url: `https://tiktok.com/@${username}`, hashtags: ['#sidehustle'] },
  ]
  return {
    username, platform: 'tiktok', displayName: username,
    followers: 45200, following: 312, totalLikes: 892000, totalVideos: 87,
    bio: 'Side Hustle & Online Business Tipps 🚀', verified: false,
    avgViews: 28400, avgLikes: 1820, engagementRate: 4.02,
    postingFrequency: '~6x / Woche', topVideos: vids,
    topHashtags: ['#sidehustle', '#ki', '#geldverdienen', '#chatgpt', '#onlinebusiness'],
    bestPostingTimes: ['18:00–20:00', '12:00–13:00', '07:00–09:00'],
    nicheScore: 78, dataSource: 'mock',
    analysis: generateAnalysis(vids, ['#sidehustle', '#ki'], 'tiktok'),
  }
}

function getMockYouTubeProfile(username: string): ChannelProfile {
  const vids = [
    { id: '1', title: 'ChatGPT macht ALLES für mich — automatisiertes Business', views: 1240000, likes: 54200, comments: 3210, url: `https://youtube.com/@${username}`, hashtags: ['#chatgpt', '#ki'] },
    { id: '2', title: 'Diese KI verdient Geld während ich schlafe', views: 892000, likes: 38900, comments: 2180, url: `https://youtube.com/@${username}`, hashtags: ['#ki'] },
  ]
  return {
    username, platform: 'youtube', displayName: username,
    followers: 128000, totalVideos: 234,
    bio: 'KI, Tech und Online Business', verified: false,
    avgViews: 45200, avgLikes: 2140, engagementRate: 1.67,
    postingFrequency: '~2x / Woche', topVideos: vids,
    topHashtags: ['#chatgpt', '#ki', '#onlinebusiness'],
    bestPostingTimes: ['15:00–17:00', '20:00–22:00'],
    nicheScore: 82, dataSource: 'mock',
    analysis: generateAnalysis(vids, ['#chatgpt', '#ki'], 'youtube'),
  }
}

function getMockInstagramProfile(username: string): ChannelProfile {
  const vids = [
    { id: '1', title: '3 Side Hustles ohne Startkapital 💸', views: 89200, likes: 4210, comments: 312, url: `https://instagram.com/p/example`, hashtags: ['#sidehustle'] },
  ]
  return {
    username, platform: 'instagram', displayName: username,
    followers: 23400, following: 891, totalVideos: 156,
    bio: '💰 Online Geld verdienen', verified: false,
    avgViews: 12400, avgLikes: 890, engagementRate: 3.8,
    postingFrequency: '~4x / Woche', topVideos: vids,
    topHashtags: ['#sidehustle', '#geld', '#onlinebusiness'],
    bestPostingTimes: ['11:00–13:00', '19:00–21:00'],
    nicheScore: 65, dataSource: 'mock',
    analysis: generateAnalysis(vids, ['#sidehustle'], 'instagram'),
  }
}

// ── URL Parser ────────────────────────────────────────────────────────────────

function parseInput(raw: string): { platform: 'tiktok' | 'youtube' | 'instagram'; username: string } {
  const input = raw.trim()

  // Platform aus URL erkennen
  let platform: 'tiktok' | 'youtube' | 'instagram' = 'tiktok'
  if (/youtube\.com|youtu\.be/i.test(input)) platform = 'youtube'
  else if (/instagram\.com|ig\.me/i.test(input)) platform = 'instagram'
  else if (/tiktok\.com/i.test(input)) platform = 'tiktok'

  // Username extrahieren
  let username = input
  try {
    if (input.startsWith('http')) {
      const url = new URL(input)
      const parts = url.pathname.split('/').filter(Boolean)
      // youtube.com/@handle oder youtube.com/c/handle oder youtube.com/user/handle
      username = parts[parts.length - 1] || parts[0]
      // Entferne @ am Anfang
      username = username.replace(/^@/, '')
      // TikTok video URL: /@user/video/ID → nimm user
      if (platform === 'tiktok' && parts.includes('video')) {
        const atIdx = parts.findIndex(p => p.startsWith('@') || parts.indexOf('video') > 0)
        username = parts[0].replace(/^@/, '')
      }
    } else {
      // @username oder username
      username = input.replace(/^@/, '').split('/')[0].split('?')[0]
    }
  } catch {
    username = input.replace(/^@/, '')
  }

  return { platform, username: username.toLowerCase().trim() }
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export async function analyzeCompetitor(
  url: string,
  platform?: 'tiktok' | 'youtube' | 'instagram' | 'auto'
): Promise<CompetitorReport> {
  const parsed = parseInput(url)
  const detected = (platform && platform !== 'auto') ? platform : parsed.platform
  const username = parsed.username

  console.log(`[Competitor] Analysiere @${username} auf ${detected}`)

  let profile: ChannelProfile | null = null

  try {
    if (detected === 'tiktok')         profile = await analyzeTikTok(username)
    else if (detected === 'youtube')   profile = await analyzeYouTube(username)
    else if (detected === 'instagram') profile = await analyzeInstagram(username)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Competitor] API-Fehler: ${msg}`)
    // Bei API-Fehler: plattform-spezifische Mock-Daten zurückgeben
    console.warn(`[Competitor] Fallback auf Demo-Daten für @${username}`)
    if (detected === 'tiktok')         profile = getMockTikTokProfile(username)
    else if (detected === 'youtube')   profile = getMockYouTubeProfile(username)
    else if (detected === 'instagram') profile = getMockInstagramProfile(username)
    else throw new Error(msg)
  }

  if (!profile) throw new Error(`Kanal nicht gefunden: @${username}`)

  const webTrends = await researchWebTrends(profile.analysis.niche).catch(() => [])

  const allHashtags = [
    ...profile.topHashtags,
    ...webTrends.flatMap(t => t.relatedKeywords.map(k => `#${k.replace(/\s+/g, '')}`))
  ]
  const uniqueHashtags = [...new Set(allHashtags)].slice(0, 15)

  const plat = detected === 'tiktok' ? 'TikTok' : detected === 'youtube' ? 'YouTube' : 'Instagram'

  return {
    profiles: [profile],
    webTrends,
    overallNiche: profile.analysis.niche,
    topHashtagsAcrossPlatforms: uniqueHashtags,
    viralHooks: profile.analysis.hookPatterns,
    contentCalendar: [
      `Mo: Hook-Video — ${profile.analysis.hookPatterns[0] || 'Problem aufdecken'}`,
      `Di: Tutorial / How-To — Schritt-für-Schritt`,
      `Mi: Trend-Reaktion in "${profile.analysis.niche}"`,
      `Do: Persönliche Story / Behind the Scenes`,
      `Fr: Kontroverse Meinung / "Unpopular Opinion"`,
      `Sa: Q&A oder Community-Post`,
      `So: Best-of Compilation / Recap`,
    ],
    summary: `@${username} ist ein ${plat}-Kanal in der "${profile.analysis.niche}"-Nische. ${profile.followers.toLocaleString('de')} Follower · ${profile.totalLikes?.toLocaleString('de') || '?'} Gesamt-Likes · Ø ${profile.avgViews.toLocaleString('de')} Views · ${profile.engagementRate}% Engagement. ${profile.dataSource === 'live' ? '✅ Echte Daten' : '⚠️ Demo-Daten'}`,
  }
}

// ── Agent-Klasse für Pipeline-Integration ─────────────────────────────────────
import { BaseAgent, AgentInput, AgentOutput } from './base'

export class CompetitorAgent extends BaseAgent {
  slug = 'competitor-agent'
  name = 'Competitor Analyst'

  validateInput(_input: AgentInput): boolean {
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()

    const niche = (input.niche as string) || 'Fashion, Lifestyle, Travel, Personal Brand'
    // Default-Creator für die Nische — @69perception Stil
    const handle = (input.handle as string) || (input.username as string) || '@69perception'

    try {
      const report = await analyzeCompetitor(handle, 'instagram')
      const output = this.generateOutput({
        ...report,
        niche,
        dataSource: report.profiles[0]?.dataSource || 'mock',
      }, start)
      this.logResult(output)
      return output
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[CompetitorAgent] Fehler, nutze Mock:', msg)
      // Graceful fallback
      const output = this.generateOutput({
        niche,
        viralHooks: ['Die Leute die wenig reden bauen am meisten auf', 'Niemand erinnert sich an den Durchschnitt'],
        topHashtagsAcrossPlatforms: ['#lifestyle', '#personalbrand', '#aesthetic', '#mindset', '#builddifferent'],
        contentCalendar: ['Mo: Hook-Video', 'Mi: Montage', 'Fr: CTA-Video'],
        summary: `Competitor-Analyse für Nische: ${niche} (Demo)`,
        dataSource: 'mock',
      }, start)
      this.logResult(output)
      return output
    }
  }
}
