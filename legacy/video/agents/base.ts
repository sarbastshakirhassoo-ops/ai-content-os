export interface AgentInput {
  projectId?: string
  topic?: string
  script?: string
  [key: string]: unknown
}

export interface AgentOutput {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  durationMs: number
}

export abstract class BaseAgent {
  abstract slug: string
  abstract name: string

  abstract validateInput(input: AgentInput): boolean | string
  abstract run(input: AgentInput): Promise<AgentOutput>

  protected generateOutput(data: Record<string, unknown>, startTime: number): AgentOutput {
    return {
      success: true,
      data,
      durationMs: Date.now() - startTime,
    }
  }

  protected errorOutput(error: string, startTime: number): AgentOutput {
    return {
      success: false,
      error,
      durationMs: Date.now() - startTime,
    }
  }

  protected async simulate(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  logResult(output: AgentOutput): void {
    const icon = output.success ? '✅' : '❌'
    console.log(`[${this.name}] ${icon} ${output.durationMs}ms`, output.error || '')
  }
}
