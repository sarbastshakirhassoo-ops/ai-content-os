import { BaseAgent, AgentInput, AgentOutput } from './base'

// ── Typen ─────────────────────────────────────────────────────────────────────
export interface Asset {
  scene: number
  type: 'video' | 'image'
  source: string
  url: string
  downloadUrl?: string
  license: string
  copyrightRisk: 'low' | 'medium' | 'high'
  keyword: string
  duration?: number
  width?: number
  height?: number
}

// ── Pexels Videos ─────────────────────────────────────────────────────────────
async function searchPexelsVideos(keyword: string, perPage = 3): Promise<Asset[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) {
    console.warn('[AssetManager] Kein PEXELS_API_KEY — Mock-Assets')
    return getMockVideoAssets(keyword)
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=${perPage}&orientation=portrait`,
      { headers: { Authorization: key } }
    )
    if (!res.ok) {
      console.warn(`[AssetManager] Pexels Fehler ${res.status}`)
      return getMockVideoAssets(keyword)
    }
    const data = await res.json()
    const videos = (data.videos || []) as Array<Record<string, unknown>>
    return videos.slice(0, perPage).map((v, i) => {
      const files = (v.video_files as Array<Record<string, unknown>>) || []
      const hdFile = files.find((f) => f.quality === 'hd') || files[0]
      return {
        scene: i + 1,
        type: 'video' as const,
        source: 'Pexels',
        url: v.url as string,
        downloadUrl: hdFile ? (hdFile.link as string) : undefined,
        license: 'free',
        copyrightRisk: 'low' as const,
        keyword,
        duration: v.duration as number,
        width: hdFile ? (hdFile.width as number) : undefined,
        height: hdFile ? (hdFile.height as number) : undefined,
      }
    })
  } catch (err) {
    console.warn('[AssetManager] Pexels Fehler:', err)
    return getMockVideoAssets(keyword)
  }
}

async function searchPexelsImages(keyword: string, perPage = 2): Promise<Asset[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return getMockImageAssets(keyword)

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${perPage}&orientation=portrait`,
      { headers: { Authorization: key } }
    )
    if (!res.ok) return getMockImageAssets(keyword)
    const data = await res.json()
    const photos = (data.photos || []) as Array<Record<string, unknown>>
    return photos.slice(0, perPage).map((p, i) => {
      const src = p.src as Record<string, string>
      return {
        scene: i + 1,
        type: 'image' as const,
        source: 'Pexels',
        url: p.url as string,
        downloadUrl: src?.portrait || src?.large,
        license: 'free',
        copyrightRisk: 'low' as const,
        keyword,
        width: p.width as number,
        height: p.height as number,
      }
    })
  } catch {
    return getMockImageAssets(keyword)
  }
}

// ── Keywords aus Nische ableiten ───────────────────────────────────────────────
function extractKeywords(input: AgentInput): string[] {
  const niche = ((input.niche as string) || '').toLowerCase()
  const topic = ((input.topic as string) || '').toLowerCase()

  const nicheMap: Record<string, string[]> = {
    fashion: ['luxury fashion editorial', 'street style cinematic', 'outfit details closeup'],
    lifestyle: ['luxury lifestyle cinematic', 'morning routine aesthetic', 'minimal living apartment'],
    travel: ['travel cinematic golden hour', 'city skyline night', 'airport luxury travel'],
    'personal brand': ['entrepreneur lifestyle desk', 'success mindset urban', 'professional aesthetic'],
  }

  let keywords: string[] = ['luxury lifestyle cinematic', 'urban aesthetic', 'golden hour city', 'fashion details']

  for (const [key, kws] of Object.entries(nicheMap)) {
    if (niche.includes(key)) {
      keywords = [...kws, ...keywords].slice(0, 4)
      break
    }
  }

  if (topic) {
    const words = topic.split(' ').filter(w => w.length > 4).slice(0, 2)
    if (words.length) keywords = [...words.map(w => w + ' cinematic'), ...keywords].slice(0, 4)
  }

  return keywords
}

// ── Mock Fallbacks ─────────────────────────────────────────────────────────────
function getMockVideoAssets(keyword: string): Asset[] {
  return [
    { scene: 1, type: 'video', source: 'Pexels (Mock)', url: 'https://www.pexels.com/video/luxury-lifestyle/', license: 'free', copyrightRisk: 'low', keyword, duration: 15 },
    { scene: 2, type: 'video', source: 'Pexels (Mock)', url: 'https://www.pexels.com/video/urban-cinematic/', license: 'free', copyrightRisk: 'low', keyword, duration: 10 },
  ]
}

function getMockImageAssets(keyword: string): Asset[] {
  return [
    { scene: 1, type: 'image', source: 'Pexels (Mock)', url: 'https://www.pexels.com/photo/fashion-editorial/', license: 'free', copyrightRisk: 'low', keyword },
  ]
}

// ── Agent ─────────────────────────────────────────────────────────────────────
export class AssetManagerAgent extends BaseAgent {
  slug = 'asset-manager-agent'
  name = 'Asset Manager'

  validateInput(_input: AgentInput): boolean {
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const keywords = extractKeywords(input)
    console.log('[AssetManager] Suche nach Keywords:', keywords)

    const [videoAssets, imageAssets, extraVideos] = await Promise.all([
      searchPexelsVideos(keywords[0] || 'luxury lifestyle', 3),
      searchPexelsImages(keywords[1] || 'urban aesthetic', 2),
      keywords[2] ? searchPexelsVideos(keywords[2], 2) : Promise.resolve([] as Asset[]),
    ])

    const allAssets: Asset[] = [...videoAssets, ...imageAssets, ...extraVideos]
      .map((a, i) => ({ ...a, scene: i + 1 }))

    const hasPexels = !!process.env.PEXELS_API_KEY
    const isLive = allAssets.some(a => !a.source.includes('Mock'))

    const output = this.generateOutput({
      assets: allAssets,
      totalAssets: allAssets.length,
      videoCount: allAssets.filter(a => a.type === 'video').length,
      imageCount: allAssets.filter(a => a.type === 'image').length,
      allLicensed: true,
      keywords,
      dataSource: isLive ? 'live' : 'mock',
      apiStatus: hasPexels ? 'connected' : 'no_key',
    }, start)

    this.logResult(output)
    return output
  }
}
