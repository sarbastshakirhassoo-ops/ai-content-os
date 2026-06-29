import { BaseAgent, AgentInput, AgentOutput } from './base'
import { HASHTAG_SETS, SEO_KEYWORDS, BRAND_VALUES } from '@/lib/niche-config'

export class SEOAgent extends BaseAgent {
  slug = 'seo-agent'
  name = 'SEO Optimizer'

  validateInput(input: AgentInput): boolean | string {
    return !!(input.topic || input.niche) || 'Topic oder Nische fehlt'
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const topic = (input.topic as string) || 'Luxury Lifestyle'
      const hook  = (input.hook  as string) || ''

      const youtubeTitle  = `${topic} 🔥 ${hook.slice(0, 40) || 'Motivation'} #Shorts`
      const description   = `${topic} — Luxury Lifestyle, Motivation & Erfolg.\n\n${hook}\n\n📲 Folge uns für tägliche Inspiration.\n\n#luxury #motivation #success #lifestyle #mindset #discipline #cinematic`
      const tiktokCaption = `${hook || topic} ✨ #fyp #luxurylifestyle #motivation #viral #cinematicedit #success`
      const instagramCaption = `${hook || topic}\n\n${BRAND_VALUES.slice(0,3).join(' · ')}\n\n.\n.\n.\n${HASHTAG_SETS.instagram.join(' ')}`

      const hashtags = [
        ...HASHTAG_SETS.universal,
        ...HASHTAG_SETS.instagram,
        ...HASHTAG_SETS.tiktok,
      ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 30)

      return this.generateOutput({
        youtubeTitle:      youtubeTitle.slice(0, 100),
        description:       description.slice(0, 5000),
        tiktokCaption:     tiktokCaption.slice(0, 2200),
        instagramCaption:  instagramCaption.slice(0, 2200),
        hashtags,
        keywords:          SEO_KEYWORDS.slice(0, 15),
        alternativeTitles: [
          `${topic} — Der Unterschied den niemand sieht #Shorts`,
          `Das Geheimnis hinter ${topic} 🔥 #LuxuryLifestyle`,
          `${topic}: Was die Erfolgreichen wirklich tun`,
        ],
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}

export type SEOAgentOutput = Record<string, unknown>
export type SEOKeyword     = Record<string, unknown>
