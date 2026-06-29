import { BaseAgent, AgentInput, AgentOutput } from './base'

export class AssetManagerAgent extends BaseAgent {
  slug = 'asset-manager-agent'
  name = 'Asset Manager'

  validateInput(_input: AgentInput): boolean {
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    await this.simulate(2000 + Math.random() * 3000)

    const assets = [
      { scene: 1, type: 'video', source: 'Pexels', url: 'https://pexels.com/video/1234', license: 'free', copyrightRisk: 'low' },
      { scene: 2, type: 'video', source: 'Pixabay', url: 'https://pixabay.com/video/5678', license: 'free', copyrightRisk: 'low' },
      { scene: 3, type: 'image', source: 'Unsplash', url: 'https://unsplash.com/photo/9012', license: 'free', copyrightRisk: 'low' },
    ]

    const output = this.generateOutput({ assets, totalAssets: assets.length, allLicensed: true }, start)
    this.logResult(output)
    return output
  }
}
