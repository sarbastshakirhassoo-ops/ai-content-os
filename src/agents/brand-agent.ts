import { BaseAgent, AgentInput, AgentOutput } from './base'
import { BRAND_VALUES, FORBIDDEN_PHRASES } from '@/lib/niche-config'

export class BrandAgent extends BaseAgent {
  slug = 'brand-agent'
  name = 'Brand Consistency'

  validateInput(input: AgentInput): boolean | string { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const script = (input.script || input.fullScript || '') as string
      const hook   = (input.hook   || '') as string
      const text   = `${hook} ${script}`.toLowerCase()

      const brandMatches   = (BRAND_VALUES as readonly string[]).filter(v => text.includes(v.toLowerCase()))
      const forbiddenFound = FORBIDDEN_PHRASES.filter(p => text.includes(p.toLowerCase()))
      const brandScore     = Math.min(100, Math.round((brandMatches.length / BRAND_VALUES.length) * 100))
      const passed         = forbiddenFound.length === 0 && brandScore >= 40

      return this.generateOutput({
        brandScore,
        passed,
        matchedValues:   brandMatches,
        forbiddenFound,
        issues:   forbiddenFound.length > 0 ? [`Verbotene Phrasen: ${forbiddenFound.join(', ')}`] : [],
        suggestions: brandScore < 60 ? ['Mehr Luxury/Motivation/Disziplin Begriffe einbauen', 'CTA prüfen'] : [],
        summary: passed ? `✅ Brand-Check bestanden (${brandScore}/100)` : `❌ Brand-Probleme (${brandScore}/100)`,
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}

export type BrandAgentOutput = Record<string, unknown>
export type BrandCheck       = Record<string, unknown>
