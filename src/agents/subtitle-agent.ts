import { BaseAgent, AgentInput, AgentOutput } from './base'

export class SubtitleAgent extends BaseAgent {
  slug = 'subtitle-agent'
  name = 'Subtitle Burner'

  validateInput(_input: AgentInput): boolean {
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    await this.simulate(1000 + Math.random() * 1500)

    const subtitles = {
      srtUrl: '/demo/subtitles.srt',
      wordCount: 312,
      emojiCount: 8,
      style: { font: 'Montserrat ExtraBold', size: 72, outline: 4, highlightColor: '#FFD700' },
      platforms: { youtube: true, instagram: true, tiktok: true },
    }

    const output = this.generateOutput({ subtitles }, start)
    this.logResult(output)
    return output
  }
}
