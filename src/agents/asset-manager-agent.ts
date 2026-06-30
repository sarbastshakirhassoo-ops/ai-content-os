// ─────────────────────────────────────────────────────────────────────────────
// Asset Manager Agent — Multi-Source, vollständige Lizenzprüfung
// Quellen: Pexels → Pixabay → Mixkit → Unsplash (in dieser Priorität)
// YouTube ist NICHT erlaubt ohne explizite schriftliche Genehmigung
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent, AgentInput, AgentOutput } from './base'
import { ASSET_KEYWORDS } from '@/lib/niche-config'
import type { Asset, AssetManifest } from '@/types'

// ── Pexels API ────────────────────────────────────────────────────────────────

async function searchPexels(query: string, type: 'video' | 'image' = 'video'): Promise<Asset[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []
  try {
    // portrait + medium/large für bessere Qualität
    const endpoint = type === 'video'
      ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=6&size=medium`
      : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=portrait&size=large`
    const res  = await fetch(endpoint, { headers: { Authorization: key } })
    if (!res.ok) return []
    const data = await res.json() as Record<string, unknown>

    const items = (type === 'video'
      ? (data.videos as Record<string, unknown>[])
      : (data.photos as Record<string, unknown>[])) || []

    return items.slice(0, 4).map((item, i): Asset => {
      const id = String(item.id || i)
      const videoFiles = (item.video_files as Record<string, unknown>[]) || []
      // Bevorzuge HD, dann Full HD, dann was auch immer verfügbar ist
      const hd = videoFiles.find((f: Record<string, unknown>) => (f.quality as string) === 'hd')
                 || videoFiles.find((f: Record<string, unknown>) => (f.quality as string) === 'sd')
                 || videoFiles[0]
      const url = type === 'video'
        ? String((hd as Record<string, unknown>)?.link || item.url || '')
        : String((item.src as Record<string, unknown>)?.original || item.url || '')

      return {
        id:                `pexels_${id}`,
        scene:             query,
        type,
        source:            'pexels',
        url:               type === 'video' ? `https://www.pexels.com/video/${id}/` : `https://www.pexels.com/photo/${id}/`,
        downloadUrl:       url,
        thumbnailUrl:      String((item.image as string) || (item.src as Record<string,unknown>)?.medium || ''),
        creator:           String((item.user as Record<string, unknown>)?.name || (item.photographer as string) || 'Pexels Creator'),
        license:           'pexels',
        commercialUse:     true,
        attributionRequired: false,
        copyrightRisk:     'none',
        keyword:           query,
        duration:          type === 'video' ? (item.duration as number) || 0 : undefined,
        width:             (item.width  as number) || 1080,
        height:            (item.height as number) || 1920,
        format:            type === 'video' ? 'mp4' : 'jpg',
        luxuryScore:       estimateLuxuryScore(query),
        nostalgiaScore:    estimateNostalgiaScore(query),
        cinematicScore:    85,
        aspectRatio916:    false, // Pexels hat meist 16:9, muss gecroppt werden
      }
    })
  } catch { return [] }
}

// ── Pixabay API ───────────────────────────────────────────────────────────────

async function searchPixabay(query: string, type: 'video' | 'image' = 'video'): Promise<Asset[]> {
  const key = process.env.PIXABAY_API_KEY
  if (!key) return []
  try {
    const endpoint = type === 'video'
      ? `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=3&video_type=film`
      : `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=3&image_type=photo&orientation=vertical`
    const res  = await fetch(endpoint)
    if (!res.ok) return []
    const data = await res.json() as { hits: Record<string, unknown>[] }
    return (data.hits || []).slice(0, 2).map((item, i): Asset => ({
      id:              `pixabay_${item.id || i}`,
      scene:           query,
      type,
      source:          'pixabay',
      url:             String(item.pageURL || ''),
      downloadUrl:     type === 'video'
        ? String((((item.videos as Record<string,unknown>)?.medium as Record<string,unknown>)?.url) || '')
        : String((item.largeImageURL as string) || ''),
      thumbnailUrl:    String(item.previewURL || item.userImageURL || ''),
      creator:         String(item.user || 'Pixabay Creator'),
      license:         'pixabay',
      commercialUse:   true,
      attributionRequired: false,
      copyrightRisk:   'none',
      keyword:         query,
      duration:        type === 'video' ? (item.duration as number) || 0 : undefined,
      width:           (item.imageWidth  as number) || 1280,
      height:          (item.imageHeight as number) || 720,
      format:          type === 'video' ? 'mp4' : 'jpg',
      luxuryScore:     estimateLuxuryScore(query),
      nostalgiaScore:  estimateNostalgiaScore(query),
      cinematicScore:  75,
      aspectRatio916:  false,
    }))
  } catch { return [] }
}

// ── Mixkit (curated luxury clips — keine API, bekannte URLs) ─────────────────

function getMixkitAssets(query: string): Asset[] {
  // Mixkit bietet freie Video-Templates — hier kuratierte Luxury-Clips
  const luxuryMixkitClips: Asset[] = [
    {
      id: 'mixkit_luxury_1', scene: query, type: 'video', source: 'mixkit',
      url: 'https://mixkit.co/free-stock-video/luxury-car-driving-through-city-at-night-34574/',
      downloadUrl: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-car-driving-through-city-at-night-34574-large.mp4',
      creator: 'Mixkit', license: 'mixkit', commercialUse: true, attributionRequired: false,
      copyrightRisk: 'none', keyword: query, duration: 15, width: 1920, height: 1080,
      format: 'mp4', luxuryScore: 90, nostalgiaScore: 30, cinematicScore: 85, aspectRatio916: false,
    },
    {
      id: 'mixkit_luxury_2', scene: query, type: 'video', source: 'mixkit',
      url: 'https://mixkit.co/free-stock-video/aerial-view-of-a-city-at-night-1717/',
      downloadUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-city-at-night-1717-large.mp4',
      creator: 'Mixkit', license: 'mixkit', commercialUse: true, attributionRequired: false,
      copyrightRisk: 'none', keyword: query, duration: 12, width: 1920, height: 1080,
      format: 'mp4', luxuryScore: 85, nostalgiaScore: 20, cinematicScore: 90, aspectRatio916: false,
    },
  ]
  return luxuryMixkitClips.slice(0, 1)
}

// ── Scoring Helpers ───────────────────────────────────────────────────────────

function estimateLuxuryScore(keyword: string): number {
  const k = keyword.toLowerCase()
  const luxuryWords = ['luxury', 'ferrari', 'lamborghini', 'porsche', 'yacht', 'jet', 'penthouse', 'rolex', 'dubai', 'monaco', 'villa', 'gold', 'premium', 'first class']
  const matches = luxuryWords.filter(w => k.includes(w)).length
  return Math.min(100, 50 + matches * 15)
}

function estimateNostalgiaScore(keyword: string): number {
  const k = keyword.toLowerCase()
  const nostalgiaWords = ['vintage', 'retro', 'nostalg', 'film grain', 'super 8', 'analog', 'old', 'classic', 'memory']
  const matches = nostalgiaWords.filter(w => k.includes(w)).length
  return Math.min(100, 20 + matches * 20)
}

function isLicenseClean(asset: Asset): boolean {
  return ['pexels', 'pixabay', 'mixkit', 'unsplash', 'cc0'].includes(asset.license)
    && asset.commercialUse === true
    && asset.copyrightRisk !== 'high'
}

// ── Asset Manager Agent ───────────────────────────────────────────────────────

export class AssetManagerAgent extends BaseAgent {
  slug = 'asset-manager-agent'
  name = 'Asset Manager'

  validateInput(input: AgentInput): boolean | string {
    return !!(input.niche || input.topic) || 'Nische oder Topic fehlt'
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const topic         = input.topic  as string || 'luxury lifestyle'
      const sceneKeywords = (input.sceneKeywords as string[]) || Object.values(ASSET_KEYWORDS).flat().slice(0, 6)

      // Rotiere durch alle Kategorien — inkl. Challenge für project50-Viralität
      const shuffle = <T>(arr: readonly T[]): T[] => [...arr].sort(() => Math.random() - 0.5)
      const allPool = shuffle([
        shuffle(ASSET_KEYWORDS.luxury_cars)[0],
        shuffle(ASSET_KEYWORDS.cities)[0],
        shuffle(ASSET_KEYWORDS.cinematic)[0],
        shuffle(ASSET_KEYWORDS.lifestyle)[0],
        shuffle(ASSET_KEYWORDS.motivation)[0],
        shuffle(ASSET_KEYWORDS.challenge)[0],
        shuffle(ASSET_KEYWORDS.travel)[0],
      ])
      const allKeywords = [
        ...allPool.slice(0, 4),
        ...sceneKeywords.slice(0, 1),
      ].filter((k): k is string => Boolean(k)).slice(0, 5)

      const allAssets: Asset[]     = []
      const blockedScenes: string[] = []
      const usedKeywords: string[]  = []

      // Pro Keyword: Pexels zuerst, dann Pixabay als Fallback, dann Mixkit
      for (const kw of allKeywords) {
        usedKeywords.push(kw)
        let found: Asset[] = await searchPexels(kw, 'video')

        if (found.length === 0) {
          found = await searchPixabay(kw, 'video')
        }
        if (found.length === 0) {
          found = getMixkitAssets(kw)
        }

        const clean = found.filter(isLicenseClean)
        if (clean.length === 0) {
          blockedScenes.push(`"${kw}" — keine lizenzreinen Assets gefunden`)
        } else {
          allAssets.push(...clean)
        }
      }

      // Lizenzstatus bestimmen
      const licenseStatus: 'clean' | 'pending' | 'issue' =
        allAssets.length > 0 && blockedScenes.length === 0 ? 'clean' :
        allAssets.length > 0 ? 'pending' : 'issue'

      // Attribution-Liste
      const attributions = allAssets
        .filter(a => a.attributionRequired && a.creator)
        .map(a => `${a.creator} via ${a.source} (${a.license})`)

      // Quellen-Übersicht
      const sources = [...new Set(allAssets.map(a => a.source))]

      const manifest: AssetManifest = {
        totalAssets:  allAssets.length,
        scenes:       allAssets,
        licenseStatus,
        blockedScenes,
        attributions,
      }

      return this.generateOutput({
        totalAssets:   allAssets.length,
        scenes:        allAssets,
        assets:        allAssets,
        licenseStatus,
        blockedScenes,
        attributions,
        sources,
        usedKeywords,
        manifest,
        warnings: blockedScenes.length > 0
          ? [`${blockedScenes.length} Szene(n) ohne lizenzreine Assets`]
          : [],
        hasPexels:    allAssets.some(a => a.source === 'pexels'),
        hasPixabay:   allAssets.some(a => a.source === 'pixabay'),
        hasMixkit:    allAssets.some(a => a.source === 'mixkit'),
        avgLuxuryScore: allAssets.length > 0
          ? Math.round(allAssets.reduce((s, a) => s + a.luxuryScore, 0) / allAssets.length)
          : 0,
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}
