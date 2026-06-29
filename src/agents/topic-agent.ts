import { BaseAgent, AgentInput, AgentOutput } from './base'

export class TopicAgent extends BaseAgent {
  slug = 'topic-agent'
  name = 'Topic Selector'

  validateInput(input: AgentInput): boolean | string {
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    await this.simulate(600 + Math.random() * 800)

    const selected = {
      topic: 'AI replacing white-collar jobs',
      angle: 'Urgency + personal risk framing',
      audience: 'Office workers 25-40',
      hookStrategy: 'Pattern interrupt with shocking statistic',
      estimatedCTR: '8.4%',
      estimatedRetention: '68%',
    }

    const output = this.generateOutput({ selected }, start)
    this.logResult(output)
    return output
  }
}
