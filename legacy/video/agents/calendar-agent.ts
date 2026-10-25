import { BaseAgent, AgentInput, AgentOutput } from './base'
import { BEST_POSTING_TIMES } from '@/lib/niche-config'

export class CalendarAgent extends BaseAgent {
  slug = 'calendar-agent'
  name = 'Content Calendar'
  validateInput(input: AgentInput): boolean | string { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const qcScore = (input.qcScore as number) || 0
      const now     = new Date()

      // Nächsten besten Slot finden (morgen + bester Zeitpunkt)
      const igSlot = BEST_POSTING_TIMES.instagram[now.getDay() % BEST_POSTING_TIMES.instagram.length]
      const ttSlot = BEST_POSTING_TIMES.tiktok[now.getDay()    % BEST_POSTING_TIMES.tiktok.length]
      const ytSlot = BEST_POSTING_TIMES.youtube[now.getDay()   % BEST_POSTING_TIMES.youtube.length]

      const scheduledAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // morgen
      scheduledAt.setHours(19, 0, 0, 0)

      return this.generateOutput({
        scheduledTime:  scheduledAt.toISOString(),
        scheduledAt:    scheduledAt.toISOString(),
        platforms: [
          { platform: 'instagram', time: `morgen ${igSlot.time}`, timezone: igSlot.timezone },
          { platform: 'tiktok',    time: `morgen ${ttSlot.time}`, timezone: ttSlot.timezone },
          { platform: 'youtube',   time: `morgen ${ytSlot.time}`, timezone: ytSlot.timezone },
        ],
        expectedReach:  qcScore > 80 ? 'Hoch (QC sehr gut)' : qcScore > 60 ? 'Mittel' : 'Niedrig',
        bestTimeReason: 'Abends 18–21 Uhr: höchste Reichweite in DE/AT/CH',
        timezone:       'Europe/Berlin',
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}

export type CalendarAgentOutput = Record<string, unknown>
export type PlatformSlot        = Record<string, unknown>
export type PublicationPlan     = Record<string, unknown>
