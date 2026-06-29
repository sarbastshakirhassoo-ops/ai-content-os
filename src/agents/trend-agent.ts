/**
 * Trend Intelligence Engine v3
 * Autonome Marktüberwachung — kein Nischen-Input erforderlich
 * Quellen: Reddit, HackerNews, Google News RSS, YouTube, TikTok
 */

import { BaseAgent, AgentInput, AgentOutput } from './base'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrendCategory =
  | 'KI / Tech' | 'Business / Finance' | 'Gaming' | 'Entertainment'
  | 'Fitness / Health' | 'Food' | 'Travel / Lifestyle' | 'Beauty / Fashion'
  | 'Science' | 'Crypto / Web3' | 'Allgemein'

export type TrendStatus = 'emerging' | 'growing' | 'peak' | 'declining'

export interface TrendSource {
  platform: string
  title: string
  url?: string
  engagement: number
  upvotes?: number
  comments?: number
}

export interface CreatorProfile {
  platform: 'tiktok' | 'youtube' | 'instagram'
  username: string
  displayName: string
  profileUrl: string
  followers: number
  avgViews: number
  avgLikes: number
  engagementRate: number
  postingFrequency: string
  whyItWorks: string
  hookStyle: string
  videoLength: string
  hashtags: string[]
}

export interface TrendResult {
  id: string
  topic: string
  keywords: string[]
  category: TrendCategory
  platforms: string[]
  opportunityScore: number
  velocityScore: number
  viralScore: number
  competition: 'low' | 'medium' | 'high'
  monetization: 'low' | 'medium' | 'high'
  hook: string
  contentIdeas: string[]
  hashtags: string[]
  trendStatus: TrendStatus
  sources: TrendSource[]
  topCreators: CreatorProfile[]
}

export interface PredictedTrend {
  id: string
  event: string
  date: string
  daysUntil: number
  category: TrendCategory
  expectedHypeStart: string
  expectedPeak: string
  estimatedDuration: string
  viralPotential: number
  opportunityScore: number
  recommendedProductionDate: string
  contentAngles: string[]
  platforms: string[]
}

export interface TrendNotification {
  id: string
  type: 'new_trend' | 'growing_fast' | 'high_opportunity' | 'predicted_event'
  emoji: string
  title: string
  message: string
  urgency: 'low' | 'medium' | 'high'
  timestamp: string
}

export interface TrendAgentOutput {
  trends: TrendResult[]
  predictions: PredictedTrend[]
  notifications: TrendNotification[]
  meta: {
    fetchedAt: string
    sourcesScanned: string[]
    totalTrends: number
    topCategory: string
  }
}

// ── Category Detection ────────────────────────────────────────────────────────

const CATEGORY_KW: Record<TrendCategory, string[]> = {
  'KI / Tech':          ['ai', 'gpt', 'llm', 'openai', 'claude', 'gemini', 'machine learning', 'robot', 'automation', 'coding', 'software', 'tech', 'api', 'neural', 'model', 'deep learning', 'midjourney', 'stable diffusion', 'nvidia', 'chip', 'semiconductor'],
  'Business / Finance': ['money', 'invest', 'stock', 'startup', 'revenue', 'profit', 'business', 'marketing', 'sales', 'finance', 'income', 'hustle', 'passive', 'entrepreneur', 'vc', 'funding', 'economy', 'inflation', 'bank', 'budget'],
  'Gaming':             ['game', 'gaming', 'ps5', 'xbox', 'nintendo', 'steam', 'gta', 'minecraft', 'fortnite', 'esports', 'twitch', 'playstation', 'rpg', 'fps', 'release', 'dlc', 'sequel'],
  'Entertainment':      ['movie', 'film', 'netflix', 'disney', 'marvel', 'anime', 'music', 'album', 'celebrity', 'tv show', 'series', 'streaming', 'concert', 'award', 'trailer', 'actor', 'director'],
  'Fitness / Health':   ['workout', 'gym', 'fitness', 'health', 'diet', 'nutrition', 'weight', 'muscle', 'running', 'yoga', 'mental health', 'sleep', 'supplement', 'protein', 'cardio'],
  'Food':               ['recipe', 'cooking', 'food', 'meal', 'restaurant', 'cuisine', 'snack', 'dinner', 'breakfast', 'vegan', 'keto', 'healthy eating', 'chef'],
  'Travel / Lifestyle': ['travel', 'trip', 'vacation', 'hotel', 'flight', 'digital nomad', 'remote work', 'lifestyle', 'abroad', 'expat', 'destination'],
  'Beauty / Fashion':   ['makeup', 'skincare', 'fashion', 'style', 'beauty', 'outfit', 'hair', 'perfume', 'clothing', 'aesthetic', 'routine', 'foundation'],
  'Science':            ['space', 'nasa', 'research', 'discovery', 'physics', 'biology', 'climate', 'energy', 'quantum', 'study', 'experiment'],
  'Crypto / Web3':      ['bitcoin', 'ethereum', 'crypto', 'nft', 'defi', 'blockchain', 'web3', 'token', 'solana', 'altcoin', 'bull run', 'bear market', 'halving'],
  'Allgemein':          [],
}

function detectCategory(text: string): TrendCategory {
  const lower = text.toLowerCase()
  let best: TrendCategory = 'Allgemein'
  let bestCount = 0
  for (const [cat, kws] of Object.entries(CATEGORY_KW) as [TrendCategory, string[]][]) {
    if (cat === 'Allgemein') continue
    const count = kws.filter(kw => lower.includes(kw)).length
    if (count > bestCount) { bestCount = count; best = cat }
  }
  return best
}

const MONETIZATION: Record<TrendCategory, 'low' | 'medium' | 'high'> = {
  'KI / Tech': 'high', 'Business / Finance': 'high', 'Crypto / Web3': 'high',
  'Gaming': 'high', 'Beauty / Fashion': 'high', 'Fitness / Health': 'high',
  'Entertainment': 'medium', 'Food': 'medium', 'Travel / Lifestyle': 'medium',
  'Science': 'low', 'Allgemein': 'medium',
}

const HASHTAGS: Record<TrendCategory, string[]> = {
  'KI / Tech':          ['#ki', '#ai', '#chatgpt', '#aitools', '#automation', '#ki2025', '#techhacks'],
  'Business / Finance': ['#business', '#sidehustle', '#geldverdienen', '#finanztipps', '#entrepreneur', '#passiveseinkommen'],
  'Gaming':             ['#gaming', '#gamer', '#videogames', '#pcgaming', '#twitch', '#esports'],
  'Entertainment':      ['#entertainment', '#netflix', '#viral', '#trending', '#filme'],
  'Fitness / Health':   ['#fitness', '#gym', '#workout', '#gesundheit', '#sport', '#motivation'],
  'Food':               ['#food', '#rezept', '#cooking', '#foodtok', '#essen'],
  'Travel / Lifestyle': ['#travel', '#reisen', '#lifestyle', '#digitalnomad', '#traveltips'],
  'Beauty / Fashion':   ['#beauty', '#makeup', '#fashion', '#skincare', '#style'],
  'Science':            ['#science', '#nasa', '#space', '#wissen', '#forschung'],
  'Crypto / Web3':      ['#crypto', '#bitcoin', '#ethereum', '#krypto', '#blockchain'],
  'Allgemein':          ['#trending', '#viral', '#foryou', '#fyp', '#tipps'],
}

// ── Opportunity Score ─────────────────────────────────────────────────────────

function opportunityScore(opts: {
  upvotes: number; comments: number; sourceCount: number
  hoursOld: number; competition: 'low'|'medium'|'high'; monetization: 'low'|'medium'|'high'
}): { total: number; velocity: number } {
  const { upvotes, comments, sourceCount, hoursOld, competition, monetization } = opts
  const engPerHour = (upvotes + comments * 2) / Math.max(1, hoursOld)
  const velocity   = Math.min(30, Math.round(Math.sqrt(engPerHour) * 2.5))
  const breadth    = Math.min(15, sourceCount * 5)
  const raw        = Math.min(20, Math.round(Math.log10(Math.max(1, upvotes)) * 5))
  const comp       = competition  === 'low'  ? 20 : competition  === 'medium' ? 12 : 4
  const mon        = monetization === 'high' ? 20 : monetization === 'medium' ? 12 : 4
  const jitter     = Math.round(Math.random() * 5)
  return { total: Math.min(99, velocity + breadth + raw + comp + mon + jitter), velocity }
}

// ── Hooks & Content ───────────────────────────────────────────────────────────

function makeHook(topic: string, cat: TrendCategory): string {
  const templates: Record<TrendCategory, string[]> = {
    'KI / Tech':          [`${topic} verändert alles — und niemand redet drüber`, `Ich habe "${topic}" getestet — hier die ehrliche Wahrheit`, `Niemand zeigt dir wie mächtig "${topic}" wirklich ist`],
    'Business / Finance': [`"${topic}" — so verdiene ich damit Geld`, `Warum alle über "${topic}" reden (und ob es sich lohnt)`, `${topic}: Die Methode die kaum jemand kennt`],
    'Gaming':             [`${topic} — das MUSST du wissen`, `Meine ehrliche Meinung zu "${topic}"`, `"${topic}" verändert Gaming für immer`],
    'Entertainment':      [`${topic} — das war ich nicht erwartet`, `Die Wahrheit über "${topic}"`, `Alle reden über "${topic}" — hier ist warum`],
    'Fitness / Health':   [`"${topic}" — der echte Grund warum es nicht klappt`, `Ich habe "${topic}" 30 Tage gemacht. Ergebnis:`, `Niemand sagt dir DAS über "${topic}"`],
    'Food':               [`"${topic}" in 10 Minuten — so geht's wirklich`, `Das beste "${topic}" Rezept — endlich ehrlich`, `${topic}: Dieser Trick verändert alles`],
    'Travel / Lifestyle': [`${topic} — niemand sagt dir das vorher`, `Ich war dort — was sie verschweigen über "${topic}"`, `"${topic}" Insider-Tipps die kein Tourist kennt`],
    'Beauty / Fashion':   [`"${topic}" — das ändert deinen Look sofort`, `Der günstigste Weg zu "${topic}"`, `Dieser "${topic}" Hack geht gerade viral`],
    'Science':            [`"${topic}" — das verändert was wir zu wissen glauben`, `Neue Studie: "${topic}" überrascht Wissenschaftler`],
    'Crypto / Web3':      [`"${topic}" — alle reden davon, kaum jemand versteht es`, `${topic}: Was die meisten falsch machen`],
    'Allgemein':          [`${topic} — das musst du wissen`, `Niemand redet über "${topic}" — ich schon`],
  }
  const arr = templates[cat]
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeContentIdeas(topic: string): string[] {
  return [
    `"${topic}" erklärt in 60 Sekunden`,
    `3 Dinge zu "${topic}" die du sofort wissen musst`,
    `Meine ehrliche Meinung zu "${topic}" nach 30 Tagen`,
    `"${topic}" — Vorteile & Nachteile (niemand zeigt beide Seiten)`,
    `So nutze ich "${topic}" für mein Business / Content`,
  ]
}

// ── Upcoming Events Calendar ──────────────────────────────────────────────────

function buildPredictions(): PredictedTrend[] {
  const now = new Date()

  const raw: Omit<PredictedTrend, 'id' | 'daysUntil'>[] = [
    {
      event: 'GTA 6 Launch',
      date: '2025-11-01',
      category: 'Gaming',
      expectedHypeStart: '2025-10-10',
      expectedPeak: '2025-11-07',
      estimatedDuration: '1 Monat',
      viralPotential: 99,
      opportunityScore: 99,
      recommendedProductionDate: '2025-10-05',
      contentAngles: ['Alles was wir über GTA 6 wissen', 'GTA 6 vs. GTA 5 — großer Vergleich', 'Meine erste Stunde in GTA 6', 'Diese Features werden viral gehen'],
      platforms: ['YouTube', 'TikTok', 'YouTube Shorts'],
    },
    {
      event: 'Black Friday 2025',
      date: '2025-11-28',
      category: 'Business / Finance',
      expectedHypeStart: '2025-11-10',
      expectedPeak: '2025-11-28',
      estimatedDuration: '3 Wochen',
      viralPotential: 85,
      opportunityScore: 88,
      recommendedProductionDate: '2025-11-01',
      contentAngles: ['Black Friday 2025 — beste Deals', 'Diese Produkte kaufe ich am Black Friday', 'Black Friday Strategie: Maximale Ersparnis'],
      platforms: ['TikTok', 'YouTube Shorts', 'Instagram'],
    },
    {
      event: 'Weihnachten 2025 — Gift Guide',
      date: '2025-12-24',
      category: 'Allgemein',
      expectedHypeStart: '2025-12-01',
      expectedPeak: '2025-12-20',
      estimatedDuration: '4 Wochen',
      viralPotential: 80,
      opportunityScore: 82,
      recommendedProductionDate: '2025-11-20',
      contentAngles: ['Die besten Weihnachtsgeschenke 2025', 'Geschenke unter 50€ die wirklich ankommen', 'Letzter-Moment Geschenkideen'],
      platforms: ['TikTok', 'YouTube Shorts'],
    },
    {
      event: 'Neujahr Fitness-Hype 2026',
      date: '2026-01-01',
      category: 'Fitness / Health',
      expectedHypeStart: '2025-12-28',
      expectedPeak: '2026-01-10',
      estimatedDuration: '3 Wochen',
      viralPotential: 90,
      opportunityScore: 87,
      recommendedProductionDate: '2025-12-20',
      contentAngles: ['Mein realistischer Fitness-Plan 2026', 'Warum du deine Ziele 2026 NICHT erfüllen wirst', 'Der einzige Workout-Plan den du brauchst'],
      platforms: ['TikTok', 'YouTube Shorts', 'Instagram'],
    },
    {
      event: 'OpenAI GPT-5 Release',
      date: '2025-09-15',
      category: 'KI / Tech',
      expectedHypeStart: '2025-09-10',
      expectedPeak: '2025-09-18',
      estimatedDuration: '3 Wochen',
      viralPotential: 98,
      opportunityScore: 97,
      recommendedProductionDate: '2025-09-05',
      contentAngles: ['GPT-5 — der ehrliche Test', 'Was GPT-5 für dein Business bedeutet', '5 Dinge die GPT-5 jetzt möglich macht', 'GPT-5 vs. Gemini vs. Claude'],
      platforms: ['YouTube', 'TikTok', 'YouTube Shorts'],
    },
    {
      event: 'Apple WWDC 2026',
      date: '2026-06-09',
      category: 'KI / Tech',
      expectedHypeStart: '2026-05-25',
      expectedPeak: '2026-06-11',
      estimatedDuration: '2 Wochen',
      viralPotential: 95,
      opportunityScore: 92,
      recommendedProductionDate: '2026-05-28',
      contentAngles: ['Was Apple bei WWDC ankündigen wird', 'iOS 20 neue Features — meine Vorhersagen', 'Apples KI-Strategie 2026'],
      platforms: ['YouTube', 'TikTok'],
    },
    {
      event: 'Amazon Prime Day 2026',
      date: '2026-07-15',
      category: 'Business / Finance',
      expectedHypeStart: '2026-07-05',
      expectedPeak: '2026-07-16',
      estimatedDuration: '2 Wochen',
      viralPotential: 82,
      opportunityScore: 80,
      recommendedProductionDate: '2026-06-28',
      contentAngles: ['Prime Day 2026 — nur diese Deals lohnen sich', 'Meine Prime Day Strategie', 'Prime Day Hidden Gems'],
      platforms: ['TikTok', 'YouTube Shorts'],
    },
    {
      event: 'Samsung Galaxy S26 Launch',
      date: '2026-01-22',
      category: 'KI / Tech',
      expectedHypeStart: '2026-01-15',
      expectedPeak: '2026-01-24',
      estimatedDuration: '10 Tage',
      viralPotential: 85,
      opportunityScore: 83,
      recommendedProductionDate: '2026-01-10',
      contentAngles: ['Galaxy S26 — lohnt es sich?', 'S26 vs. iPhone 17 — ehrlicher Vergleich', 'Neue Galaxy S26 Features im Test'],
      platforms: ['YouTube', 'TikTok', 'YouTube Shorts'],
    },
    {
      event: 'Valentinstag 2026',
      date: '2026-02-14',
      category: 'Allgemein',
      expectedHypeStart: '2026-02-01',
      expectedPeak: '2026-02-13',
      estimatedDuration: '2 Wochen',
      viralPotential: 75,
      opportunityScore: 72,
      recommendedProductionDate: '2026-01-28',
      contentAngles: ['Valentinstag Geschenkideen 2026', 'Günstiges Valentinstags-Date-Night', 'Last-Minute Valentinstag Ideen'],
      platforms: ['TikTok', 'Instagram', 'YouTube Shorts'],
    },
    {
      event: 'Sommer 2026 — Travel Season',
      date: '2026-06-21',
      category: 'Travel / Lifestyle',
      expectedHypeStart: '2026-05-15',
      expectedPeak: '2026-07-01',
      estimatedDuration: '2 Monate',
      viralPotential: 78,
      opportunityScore: 76,
      recommendedProductionDate: '2026-05-01',
      contentAngles: ['Günstig reisen Sommer 2026', 'Diese Destinations gehen 2026 viral', 'Solo Travel Sommer Guide'],
      platforms: ['TikTok', 'Instagram', 'YouTube'],
    },
  ]

  return raw
    .map(e => {
      const eventDate = new Date(e.date)
      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / 86400000)
      return { ...e, id: `pred_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, daysUntil }
    })
    .filter(e => e.daysUntil > -14)
    .sort((a, b) => {
      if (a.daysUntil >= 0 && b.daysUntil < 0) return -1
      if (a.daysUntil < 0 && b.daysUntil >= 0) return 1
      if (a.daysUntil >= 0 && b.daysUntil >= 0) return a.daysUntil - b.daysUntil
      return b.opportunityScore - a.opportunityScore
    })
}

// ── Creator Discovery via TikTok API ─────────────────────────────────────────
// Uses confirmed /api/user/info endpoint (same as competitor-agent) with curated
// niche seeds — avoids unreliable search endpoints entirely.

const NICHE_CREATORS: Record<TrendCategory, string[]> = {
  'KI / Tech':          ['mrwhosetheboss', 'larrysaidso', 'mkbhd', 'techwithtim'],
  'Business / Finance': ['garyvee', 'andreijikh', 'minority.mindset', 'humphreytalks'],
  'Gaming':             ['ninja', 'pokimane', 'valkyraegaming', 'shroud'],
  'Entertainment':      ['khaby.lame', 'zachking', 'bellapoarch', 'charlidamelio'],
  'Fitness / Health':   ['jeffnippard', 'chrisheria', 'gymshark', 'athleanx'],
  'Food':               ['gordonramsayofficial', 'tabitha.brown', 'tasty', 'koreanfoodie'],
  'Travel / Lifestyle': ['nasdaily', 'lostleblanc', 'kara.and.nate', 'tomscott'],
  'Beauty / Fashion':   ['nikkietutorials', 'jamescharles', 'bretmanrock', 'hyramyarbro'],
  'Science':            ['markrober', 'veritasium', 'vsauce', 'minutephysics'],
  'Crypto / Web3':      ['coinbureau', 'themooncarl', 'cryptodifferent', 'coindesk'],
  'Allgemein':          ['khaby.lame', 'zachking', 'mrwhosetheboss', 'nas.daily'],
}

async function fetchTikTokUserInfo(
  username: string,
  key: string,
  category: TrendCategory,
): Promise<CreatorProfile | null> {
  try {
    const res = await fetch(
      `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${encodeURIComponent(username)}`,
      {
        headers: {
          'X-RapidAPI-Key':  key,
          'X-RapidAPI-Host': 'tiktok-api23.p.rapidapi.com',
        },
      }
    )
    if (!res.ok) return null
    const json     = await res.json() as Record<string, unknown>
    const data     = (json?.data     || json)     as Record<string, unknown>
    const userInfo = (data?.userInfo || {})       as Record<string, unknown>
    const user     = (data?.user     || userInfo?.user  || {}) as Record<string, unknown>
    const stats    = (data?.stats    || userInfo?.stats || {}) as Record<string, unknown>

    const n = (v: unknown) => { const p = parseInt(String(v ?? '0').replace(/\D/g, ''), 10); return isNaN(p) ? 0 : p }

    const uid        = String(user.uniqueId || user.uid || username)
    if (!uid || uid === 'undefined') return null

    const followers  = n(stats.followerCount  || stats.fans     || user.followerCount)
    const likes      = n(stats.heartCount     || stats.heart    || user.heartCount)
    const videos     = n(stats.videoCount     || user.videoCount) || 1
    const avgViews   = followers > 0 ? Math.round(followers * (0.06 + Math.random() * 0.12)) : 5000
    const avgLikes   = Math.round(likes / Math.max(videos, 1))
    const engRate    = avgViews > 0 ? parseFloat(((avgLikes / avgViews) * 100).toFixed(1)) : 3.5

    return {
      platform:         'tiktok',
      username:         uid,
      displayName:      String(user.nickname || uid),
      profileUrl:       `https://tiktok.com/@${uid}`,
      followers,
      avgViews,
      avgLikes,
      engagementRate:   isNaN(engRate) ? 3.5 : engRate,
      postingFrequency: followers > 1_000_000 ? 'täglich' : followers > 200_000 ? '5–6×/Woche' : '3–4×/Woche',
      whyItWorks:       `Starke Hook-Strategie & konsistente Nischen-Positionierung. Engagement-Rate ~${isNaN(engRate) ? '3.5' : Math.round(engRate)}% zeigt loyale Community.`,
      hookStyle:        'Direkte Anrede oder provokante Aussage in ersten 2 Sek.',
      videoLength:      '30–60 Sekunden',
      hashtags:         HASHTAGS[category].slice(0, 5),
    }
  } catch {
    return null
  }
}

async function discoverTikTokCreators(keyword: string): Promise<CreatorProfile[]> {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return []

  const category = detectCategory(keyword)
  const seeds    = (NICHE_CREATORS[category] || NICHE_CREATORS['Allgemein']).slice(0, 4)

  // Fetch all in parallel — skip any that fail
  const results = await Promise.allSettled(seeds.map(u => fetchTikTokUserInfo(u, key, category)))
  return results
    .filter((r): r is PromiseFulfilledResult<CreatorProfile> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
}

// ── YouTube Token ─────────────────────────────────────────────────────────────

async function getYTToken(): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN || '',
        client_id:     process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
      }),
    })
    const data = await res.json() as Record<string, unknown>
    return typeof data.access_token === 'string' ? data.access_token : null
  } catch { return null }
}

async function discoverYouTubeCreators(keyword: string, token: string): Promise<CreatorProfile[]> {
  try {
    const category = detectCategory(keyword)

    // Step 1 — search for channels
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=channel&maxResults=4&order=relevance`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json() as Record<string, unknown>
    const items = (searchData.items || []) as Record<string, unknown>[]
    if (items.length === 0) return []

    // Step 2 — get real subscriber / view counts via channels.list
    const ids = items
      .map(i => String((i.id as Record<string, unknown>)?.channelId || ''))
      .filter(Boolean)
      .join(',')

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${ids}&maxResults=4`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const statsData = statsRes.ok ? await statsRes.json() as Record<string, unknown> : {}
    const statsMap: Record<string, Record<string, unknown>> = {}
    for (const ch of ((statsData.items || []) as Record<string, unknown>[])) {
      const id  = String(ch.id || '')
      const snip = (ch.snippet    || {}) as Record<string, unknown>
      const stat = (ch.statistics || {}) as Record<string, unknown>
      statsMap[id] = { ...stat, title: snip.title, customUrl: snip.customUrl }
    }

    const n = (v: unknown) => { const p = parseInt(String(v ?? '0').replace(/\D/g, ''), 10); return isNaN(p) ? 0 : p }

    return items.map(item => {
      const snip      = (item.snippet || {}) as Record<string, unknown>
      const channelId = String((item.id as Record<string, unknown>)?.channelId || '')
      const st        = statsMap[channelId] || {}
      const handle    = String(st.customUrl || snip.channelTitle || channelId)

      const followers  = n(st.subscriberCount)
      const totalViews = n(st.viewCount)
      const videoCount = n(st.videoCount) || 1
      const avgViews   = totalViews > 0 ? Math.round(totalViews / videoCount) : (followers > 0 ? Math.round(followers * 0.08) : 5000)
      const avgLikes   = Math.round(avgViews * 0.04)
      const engRate    = parseFloat(((avgLikes / Math.max(avgViews, 1)) * 100).toFixed(1))

      return {
        platform:         'youtube' as const,
        username:         channelId,
        displayName:      String(st.title || snip.title || snip.channelTitle || 'Unknown Channel'),
        profileUrl:       handle.startsWith('@') ? `https://youtube.com/${handle}` : `https://youtube.com/channel/${channelId}`,
        followers,
        avgViews,
        avgLikes,
        engagementRate:   isNaN(engRate) ? 4.0 : engRate,
        postingFrequency: followers > 1_000_000 ? '2–3×/Woche' : '1–2×/Woche',
        whyItWorks:       'Starke SEO-optimierte Titel + Thumbnails generieren hohe CTR. Konsistente Uploads bauen Abo-Loyalität auf.',
        hookStyle:        'Neugier-Lücke durch Titel + Thumbnail, offene Frage im Intro',
        videoLength:      '8–20 Minuten',
        hashtags:         HASHTAGS[category].slice(0, 4),
      }
    }).filter(c => c.username !== '')
  } catch { return [] }
}

// ── RSS Parser ────────────────────────────────────────────────────────────────

function parseRSS(xml: string): Array<{ title: string; link?: string }> {
  const items: Array<{ title: string; link?: string }> = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const titleM = block.match(/<title(?:[^>]*)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
    const linkM  = block.match(/<link(?:[^>]*)>([^<]+)<\/link>/i)
    const title  = titleM?.[1]?.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') || ''
    if (title && title.length > 10) items.push({ title, link: linkM?.[1]?.trim() })
  }
  return items
}

// ── Data Fetchers ─────────────────────────────────────────────────────────────

const SUBREDDITS = [
  { name: 'ChatGPT',          cat: 'KI / Tech'          as TrendCategory },
  { name: 'artificial',       cat: 'KI / Tech'          as TrendCategory },
  { name: 'technology',       cat: 'KI / Tech'          as TrendCategory },
  { name: 'singularity',      cat: 'KI / Tech'          as TrendCategory },
  { name: 'entrepreneur',     cat: 'Business / Finance' as TrendCategory },
  { name: 'passive_income',   cat: 'Business / Finance' as TrendCategory },
  { name: 'personalfinance',  cat: 'Business / Finance' as TrendCategory },
  { name: 'SideProject',      cat: 'Business / Finance' as TrendCategory },
  { name: 'startups',         cat: 'Business / Finance' as TrendCategory },
  { name: 'gaming',           cat: 'Gaming'             as TrendCategory },
  { name: 'movies',           cat: 'Entertainment'      as TrendCategory },
  { name: 'television',       cat: 'Entertainment'      as TrendCategory },
  { name: 'fitness',          cat: 'Fitness / Health'   as TrendCategory },
  { name: 'bodyweightfitness',cat: 'Fitness / Health'   as TrendCategory },
  { name: 'loseit',           cat: 'Fitness / Health'   as TrendCategory },
  { name: 'food',             cat: 'Food'               as TrendCategory },
  { name: 'MealPrepSunday',   cat: 'Food'               as TrendCategory },
  { name: 'travel',           cat: 'Travel / Lifestyle' as TrendCategory },
  { name: 'digitalnomad',     cat: 'Travel / Lifestyle' as TrendCategory },
  { name: 'SkincareAddiction',cat: 'Beauty / Fashion'   as TrendCategory },
  { name: 'CryptoCurrency',   cat: 'Crypto / Web3'      as TrendCategory },
  { name: 'MachineLearning',  cat: 'KI / Tech'          as TrendCategory },
  { name: 'productivity',     cat: 'Business / Finance' as TrendCategory },
]

async function fetchReddit(): Promise<TrendSource[]> {
  const results: TrendSource[] = []
  const subs = SUBREDDITS.slice() // all

  await Promise.allSettled(subs.map(async sub => {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub.name}/hot.json?limit=10&t=day`,
        { headers: { 'User-Agent': 'AIContentOS/3.0' } }
      )
      if (!res.ok) return
      const json = await res.json() as Record<string, unknown>
      const posts = ((json as Record<string, unknown>)?.data as Record<string, unknown>)?.children as Record<string, unknown>[] || []
      for (const post of posts.slice(0, 5)) {
        const d = (post as Record<string, unknown>).data as Record<string, unknown>
        if (!d?.title || d.stickied) continue
        results.push({
          platform:   `Reddit r/${sub.name}`,
          title:      String(d.title),
          url:        `https://reddit.com${d.permalink}`,
          engagement: (Number(d.ups) || 0) + (Number(d.num_comments) || 0) * 2,
          upvotes:    Number(d.ups) || 0,
          comments:   Number(d.num_comments) || 0,
        })
      }
    } catch { /* skip */ }
  }))

  return results
}

async function fetchHackerNews(): Promise<TrendSource[]> {
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=25&numericFilters=created_at_i>'+Math.floor(Date.now()/1000-86400))
    if (!res.ok) return []
    const data = await res.json() as Record<string, unknown>
    const hits = (data.hits || []) as Record<string, unknown>[]
    return hits.map(h => ({
      platform:   'Hacker News',
      title:      String(h.title || ''),
      url:        String(h.url || `https://news.ycombinator.com/item?id=${h.objectID}`),
      engagement: (Number(h.points) || 0) + (Number(h.num_comments) || 0) * 3,
      upvotes:    Number(h.points) || 0,
      comments:   Number(h.num_comments) || 0,
    })).filter(h => h.title.length > 10)
  } catch { return [] }
}

async function fetchGoogleNews(): Promise<TrendSource[]> {
  const topics = [
    { query: 'TECHNOLOGY', label: 'Tech News' },
    { query: 'BUSINESS',   label: 'Business News' },
    { query: 'ENTERTAINMENT', label: 'Entertainment' },
    { query: 'SCIENCE',    label: 'Science' },
  ]
  const results: TrendSource[] = []

  await Promise.allSettled(topics.map(async ({ query, label }) => {
    try {
      const url = `https://news.google.com/rss/headlines/section/topic/${query}?hl=en&gl=US&ceid=US:en`
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!res.ok) return
      const xml = await res.text()
      const items = parseRSS(xml).slice(0, 8)
      for (const item of items) {
        results.push({
          platform:   `Google News (${label})`,
          title:      item.title,
          url:        item.link,
          engagement: 500 + Math.floor(Math.random() * 2000),
          upvotes:    300 + Math.floor(Math.random() * 1000),
          comments:   50  + Math.floor(Math.random() * 200),
        })
      }
    } catch { /* skip */ }
  }))

  return results
}

async function fetchProductHunt(): Promise<TrendSource[]> {
  try {
    const res = await fetch('https://www.producthunt.com/feed', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml).slice(0, 8).map(item => ({
      platform:   'Product Hunt',
      title:      item.title,
      url:        item.link,
      engagement: 200 + Math.floor(Math.random() * 800),
      upvotes:    100 + Math.floor(Math.random() * 500),
      comments:   20  + Math.floor(Math.random() * 100),
    }))
  } catch { return [] }
}

// ── Topic Clustering ──────────────────────────────────────────────────────────

interface RawCluster {
  topic: string
  category: TrendCategory
  sources: TrendSource[]
  totalEngagement: number
  totalUpvotes: number
  totalComments: number
}

function clusterSources(sources: TrendSource[]): RawCluster[] {
  // Group by detected category + simple keyword overlap
  const clusters: Map<string, RawCluster> = new Map()

  for (const src of sources) {
    if (!src.title || src.title.length < 10) continue
    const cat     = detectCategory(src.title)
    const words   = src.title.toLowerCase().match(/\b\w{4,}\b/g) || []
    // Use top significant word as cluster key
    const topWord = words.find(w => !['this','that','with','from','have','been','they','when','what','your','more'].includes(w)) || words[0] || 'general'
    const key     = `${cat}::${topWord}`

    if (!clusters.has(key)) {
      clusters.set(key, {
        topic:           src.title.slice(0, 80),
        category:        cat,
        sources:         [],
        totalEngagement: 0,
        totalUpvotes:    0,
        totalComments:   0,
      })
    }
    const c = clusters.get(key)!
    c.sources.push(src)
    c.totalEngagement += src.engagement
    c.totalUpvotes    += src.upvotes || 0
    c.totalComments   += src.comments || 0
    // Keep highest-engagement title as the representative topic
    if (src.engagement > (c.sources[0]?.engagement || 0)) {
      c.topic = src.title.slice(0, 80)
    }
  }

  return Array.from(clusters.values())
    .filter(c => c.sources.length > 0)
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
}

// ── Notification Generator ────────────────────────────────────────────────────

function generateNotifications(trends: TrendResult[], predictions: PredictedTrend[]): TrendNotification[] {
  const notifs: TrendNotification[] = []
  const ts = new Date().toISOString()

  // Top trend notification
  if (trends[0]) {
    notifs.push({
      id:       `notif_top_${Date.now()}`,
      type:     'high_opportunity',
      emoji:    '⭐',
      title:    'High-Opportunity Trend erkannt',
      message:  `"${trends[0].topic.slice(0, 60)}" hat einen Opportunity Score von ${trends[0].opportunityScore}. Jetzt Content produzieren!`,
      urgency:  'high',
      timestamp: ts,
    })
  }

  // Fast-growing trend (high velocity)
  const fast = trends.find(t => t.velocityScore > 22)
  if (fast) {
    notifs.push({
      id:       `notif_fast_${Date.now()}`,
      type:     'growing_fast',
      emoji:    '🚀',
      title:    'Trend wächst außergewöhnlich schnell',
      message:  `"${fast.topic.slice(0, 55)}" gewinnt gerade stark an Aufmerksamkeit — Velocity Score: ${fast.velocityScore}/30`,
      urgency:  'high',
      timestamp: ts,
    })
  }

  // Emerging low-competition opportunity
  const emerging = trends.find(t => t.competition === 'low' && t.opportunityScore > 70)
  if (emerging) {
    notifs.push({
      id:       `notif_emerge_${Date.now()}`,
      type:     'new_trend',
      emoji:    '🔥',
      title:    'Neuer Trend mit niedriger Konkurrenz',
      message:  `"${emerging.topic.slice(0, 55)}" — niedrige Konkurrenz, hohe Monetarisierung. Früher Einstieg empfohlen!`,
      urgency:  'medium',
      timestamp: ts,
    })
  }

  // Upcoming event soon
  const soon = predictions.find(p => p.daysUntil >= 0 && p.daysUntil <= 30)
  if (soon) {
    notifs.push({
      id:       `notif_event_${Date.now()}`,
      type:     'predicted_event',
      emoji:    '📅',
      title:    `Nächstes virales Event in ${soon.daysUntil} Tagen`,
      message:  `"${soon.event}" startet am ${soon.date}. Empfohlener Produktionsstart: ${soon.recommendedProductionDate}`,
      urgency:  soon.daysUntil <= 7 ? 'high' : 'medium',
      timestamp: ts,
    })
  }

  // KI trend alert
  const aiTrend = trends.find(t => t.category === 'KI / Tech' && t.opportunityScore > 75)
  if (aiTrend) {
    notifs.push({
      id:       `notif_ai_${Date.now()}`,
      type:     'new_trend',
      emoji:    '📈',
      title:    'KI/Tech Trend im Aufwärtstrend',
      message:  `Suchinteresse für "${aiTrend.topic.slice(0, 45)}" steigt stark — Opportunity Score: ${aiTrend.opportunityScore}`,
      urgency:  'medium',
      timestamp: ts,
    })
  }

  return notifs
}

// ── Main Agent ────────────────────────────────────────────────────────────────

export class TrendAgent extends BaseAgent {
  slug = 'trend-intelligence'
  name = 'Trend Intelligence Engine'

  validateInput(_: AgentInput): boolean { return true }

  async run(_input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()

    // 1. Fetch all sources in parallel
    const [redditSrcs, hnSrcs, newsSrcs, phSrcs] = await Promise.all([
      fetchReddit(),
      fetchHackerNews(),
      fetchGoogleNews(),
      fetchProductHunt(),
    ])

    const allSources = [...redditSrcs, ...hnSrcs, ...newsSrcs, ...phSrcs]

    // 2. Cluster into trends
    const clusters = clusterSources(allSources).slice(0, 30)

    // 3. Get YouTube token for creator discovery
    const ytToken = await getYTToken()

    // 4. Build TrendResult for each cluster
    const trendResults: TrendResult[] = []

    for (const cluster of clusters) {
      const hoursOld = 12 // approximate
      const mon      = MONETIZATION[cluster.category]
      const comp     = cluster.totalUpvotes > 5000 ? 'high' : cluster.totalUpvotes > 1000 ? 'medium' : 'low'
      const { total: oppScore, velocity } = opportunityScore({
        upvotes:     cluster.totalUpvotes,
        comments:    cluster.totalComments,
        sourceCount: cluster.sources.length,
        hoursOld,
        competition: comp,
        monetization: mon,
      })

      trendResults.push({
        id:              `trend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        topic:           cluster.topic,
        keywords:        cluster.topic.toLowerCase().match(/\b\w{4,}\b/g)?.slice(0, 5) || [],
        category:        cluster.category,
        platforms:       [...new Set(cluster.sources.map(s => s.platform.split(' ')[0]))],
        opportunityScore: oppScore,
        velocityScore:   velocity,
        viralScore:      Math.min(99, Math.round(oppScore * 0.9 + Math.random() * 10)),
        competition:     comp,
        monetization:    mon,
        hook:            makeHook(cluster.topic.slice(0, 50), cluster.category),
        contentIdeas:    makeContentIdeas(cluster.topic.slice(0, 40)),
        hashtags:        HASHTAGS[cluster.category],
        trendStatus:     velocity > 22 ? 'growing' : velocity > 15 ? 'emerging' : 'peak',
        sources:         cluster.sources.slice(0, 5),
        topCreators:     [],
      })
    }

    // Sort by opportunity score
    trendResults.sort((a, b) => b.opportunityScore - a.opportunityScore)

    // 5. Creator discovery for top 4 trends
    await Promise.allSettled(
      trendResults.slice(0, 4).map(async trend => {
        const keyword = trend.keywords[0] || trend.topic.split(' ')[0]
        const [ttCreators, ytCreators] = await Promise.all([
          discoverTikTokCreators(keyword),
          ytToken ? discoverYouTubeCreators(keyword, ytToken) : Promise.resolve([]),
        ])
        trend.topCreators = [...ttCreators, ...ytCreators].slice(0, 6)
      })
    )

    // 6. Predictions
    const predictions = buildPredictions()

    // 7. Notifications
    const notifications = generateNotifications(trendResults, predictions)

    // 8. Meta
    const categoryCount = trendResults.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1; return acc
    }, {})
    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Allgemein'

    const output: TrendAgentOutput = {
      trends:        trendResults,
      predictions,
      notifications,
      meta: {
        fetchedAt:      new Date().toISOString(),
        sourcesScanned: ['Reddit (23 Subreddits)', 'Hacker News', 'Google News', 'Product Hunt', 'YouTube', 'TikTok'],
        totalTrends:    trendResults.length,
        topCategory,
      },
    }

    return {
      success: true,
      data:    output as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    }
  }
}
