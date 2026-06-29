import { BaseAgent, AgentInput, AgentOutput } from './base'

export class AnalyticsAgent extends BaseAgent {
  slug = 'analytics-agent'
  name = 'Analytics Brain'
  validateInput(input: AgentInput): boolean | string { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const youtubeUrl   = input.youtubeUrl   as string || null
      const instagramUrl = input.instagramUrl as string || null
      const tiktokUrl    = input.tiktokUrl    as string || null

      const hasUpload = !!(youtubeUrl || instagramUrl || tiktokUrl)

      return this.generateOutput({
        hasData:         hasUpload,
        platforms:       [youtubeUrl && 'youtube', instagramUrl && 'instagram', tiktokUrl && 'tiktok'].filter(Boolean),
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
        alerts:          hasUpload ? ['Video live — Analytics in 24–48h verfügbar'] : ['Kein Upload — keine Analytics'],
        recommendations: ['Poste täglich zur besten Zeit', 'Teste verschiedene Hooks', 'Analysiere Retention-Kurve'],
        measuredAt:      new Date().toISOString(),
        summary: hasUpload
          ? 'Video hochgeladen — Analytics werden nach 24h verfügbar'
          : 'Kein Upload — Analytics übersprungen',
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}
