import { BaseAgent, AgentInput, AgentOutput } from './base'
import fs from 'fs'
import path from 'path'
import type { KnowledgeBase } from '@/types'

const KB_PATH = path.join(process.cwd(), 'data', 'knowledge-base.json')

function loadKB(): KnowledgeBase {
  try {
    if (fs.existsSync(KB_PATH)) return JSON.parse(fs.readFileSync(KB_PATH, 'utf-8'))
  } catch { /* ignore */ }
  return { topics:[], bestHooks:[], bestCTAs:[], bestHashtags:[], assetKeywords:[], musicStyles:[], videoFormats:[], inVideoPrompts:[], learnings:[], lastUpdated: new Date().toISOString() }
}

export class KnowledgeAgent extends BaseAgent {
  slug = 'knowledge-agent'
  name = 'Knowledge Base'
  validateInput(input: AgentInput): boolean | string { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const topic = (input.topic as string) || ''
      const kb    = loadKB()

      const isDuplicate = !!topic && kb.topics.some(t => t.toLowerCase() === topic.toLowerCase())
      const topHooks    = kb.bestHooks.slice(0, 5).map(h => h.value)
      const topHashtags = kb.bestHashtags.slice(0, 10).map(h => h.value)
      const topKeywords = kb.assetKeywords.slice(0, 8).map(k => k.value)
      const topLearnings = kb.learnings.slice(0, 5).map(l => l.value)
      const topPrompts   = kb.inVideoPrompts.slice(0, 2).map(p => p.value)

      return this.generateOutput({
        isDuplicate,
        usedTopics:    kb.topics,
        topHooks,
        topHashtags,
        topKeywords,
        topLearnings,
        topPrompts,
        totalTopics:   kb.topics.length,
        totalHooks:    kb.bestHooks.length,
        lastUpdated:   kb.lastUpdated,
        recommendation: isDuplicate
          ? `⚠️ Topic "${topic}" bereits verwendet — anderes Thema empfohlen`
          : topHooks.length > 0
          ? `Empfohlener Hook: "${topHooks[0]}"`
          : 'Knowledge Base noch leer — erster Job',
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}

export type KnowledgeAgentOutput = Record<string, unknown>
export type { KnowledgeEntry } from '@/types'
