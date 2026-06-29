// ─────────────────────────────────────────────────────────────────────────────
// Learning Agent — schreibt Erkenntnisse zurück in die Knowledge Base
// Aktualisiert Hook-Bibliothek, Hashtags, Asset-Keywords, InVideo-Prompts
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent, AgentInput, AgentOutput } from './base'
import fs from 'fs'
import path from 'path'
import type { KnowledgeBase, KnowledgeEntry } from '@/types'

const KB_PATH = path.join(process.cwd(), 'data', 'knowledge-base.json')

function loadKB(): KnowledgeBase {
  try {
    if (fs.existsSync(KB_PATH)) return JSON.parse(fs.readFileSync(KB_PATH, 'utf-8'))
  } catch { /* ignore */ }
  return {
    topics: [], bestHooks: [], bestCTAs: [], bestHashtags: [],
    assetKeywords: [], musicStyles: [], videoFormats: [],
    inVideoPrompts: [], learnings: [], lastUpdated: new Date().toISOString(),
  }
}

function saveKB(kb: KnowledgeBase): void {
  const dir = path.dirname(KB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  kb.lastUpdated = new Date().toISOString()
  fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2))
}

function makeEntry(
  type: KnowledgeEntry['type'],
  value: string,
  score: number,
  notes?: string,
): KnowledgeEntry {
  return {
    id:        `kb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type, value, score,
    usedCount: 1,
    lastUsed:  new Date().toISOString(),
    createdAt: new Date().toISOString(),
    notes,
  }
}

function upsertEntry(list: KnowledgeEntry[], entry: KnowledgeEntry): KnowledgeEntry[] {
  const idx = list.findIndex(e => e.value === entry.value && e.type === entry.type)
  if (idx === -1) return [...list, entry]
  const existing = list[idx]
  const updated  = {
    ...existing,
    usedCount: existing.usedCount + 1,
    lastUsed:  new Date().toISOString(),
    score:     Math.round((existing.score + entry.score) / 2),
    notes:     entry.notes || existing.notes,
  }
  const result = [...list]
  result[idx]  = updated
  return result
}

export class LearningAgent extends BaseAgent {
  slug = 'learning-agent'
  name = 'Learning Agent'

  validateInput(input: AgentInput): boolean | string {
    return !!input.niche || 'Nische fehlt'
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const qcScore     = (input.qcScore     as number)  || 0
      const qcPassed    = (input.qcPassed    as boolean) || false
      const scriptData  = (input.scriptData  as Record<string, unknown>) || {}
      const seoData     = (input.seoData     as Record<string, unknown>) || {}
      const assetData   = (input.assetData   as Record<string, unknown>) || {}
      const analyticsData   = (input.analyticsData   as Record<string, unknown>) || {}
      const engagementData  = (input.engagementData  as Record<string, unknown>) || {}

      const kb = loadKB()

      // ── 1. Topic als verwendet markieren (Duplikat-Schutz) ──────────────
      const topic = scriptData.topic as string || input.topic as string || ''
      if (topic && !kb.topics.includes(topic)) {
        kb.topics = [...kb.topics, topic].slice(-500)
      }

      // ── 2. Hook speichern ────────────────────────────────────────────────
      const hook = scriptData.hook as string || ''
      if (hook) {
        const hookScore = qcPassed ? Math.min(100, qcScore + 10) : Math.max(0, qcScore - 20)
        kb.bestHooks = upsertEntry(kb.bestHooks, makeEntry('hook', hook, hookScore,
          `QC: ${qcScore} | ${qcPassed ? 'Upload-freigegeben' : 'Blockiert'}`))
          .sort((a, b) => b.score - a.score)
          .slice(0, 100)
      }

      // ── 3. Hashtags speichern ────────────────────────────────────────────
      const hashtags = (seoData.hashtags as string[]) || []
      for (const tag of hashtags.slice(0, 10)) {
        const tagScore = qcPassed ? 70 : 40
        kb.bestHashtags = upsertEntry(kb.bestHashtags, makeEntry('hashtag', tag, tagScore))
      }
      kb.bestHashtags = kb.bestHashtags.sort((a, b) => b.score - a.score).slice(0, 200)

      // ── 4. Asset-Keywords speichern ──────────────────────────────────────
      const assetKeywords = (assetData.usedKeywords as string[]) ||
                            (assetData.keywords      as string[]) || []
      for (const kw of assetKeywords.slice(0, 10)) {
        kb.assetKeywords = upsertEntry(kb.assetKeywords, makeEntry('asset-keyword', kw, 70))
      }
      kb.assetKeywords = kb.assetKeywords.slice(0, 200)

      // ── 5. Analytics-Learnings ───────────────────────────────────────────
      const winningPatterns = (analyticsData.winningPatterns as string[]) || []
      for (const pattern of winningPatterns.slice(0, 5)) {
        kb.learnings = upsertEntry(kb.learnings, makeEntry('learning', pattern, 80,
          `Analytics: ${new Date().toLocaleDateString('de-DE')}`))
      }

      // ── 6. Community-Insights aus Engagement ────────────────────────────
      const contentIdeas = (engagementData.contentIdeas as string[]) || []
      for (const idea of contentIdeas.slice(0, 3)) {
        kb.learnings = upsertEntry(kb.learnings, makeEntry('learning', idea, 75,
          'Community-Wunsch via Engagement Analyzer'))
      }
      kb.learnings = kb.learnings.sort((a, b) => b.score - a.score).slice(0, 300)

      // ── 7. InVideo-Prompt Template speichern wenn QC passed ──────────────
      const videoPrompt = scriptData.videoPrompt as string || input.videoPrompt as string || ''
      if (videoPrompt && qcPassed) {
        kb.inVideoPrompts = upsertEntry(kb.inVideoPrompts,
          makeEntry('invideo-prompt', videoPrompt, qcScore,
            `QC Score: ${qcScore} | Topic: ${topic}`))
          .sort((a, b) => b.score - a.score)
          .slice(0, 50)
      }

      // ── 8. Musik-Stil speichern ──────────────────────────────────────────
      const musicStyle = scriptData.musicStyle as string || ''
      if (musicStyle) {
        kb.musicStyles = upsertEntry(kb.musicStyles, makeEntry('music-style', musicStyle, qcPassed ? 75 : 50))
          .slice(0, 50)
      }

      saveKB(kb)

      const learningsAdded = winningPatterns.length + contentIdeas.length
      const summary = {
        topicsTracked:    kb.topics.length,
        hooksInLibrary:   kb.bestHooks.length,
        hashtagsInLib:    kb.bestHashtags.length,
        assetKeywordsLib: kb.assetKeywords.length,
        learningsTotal:   kb.learnings.length,
        learningsAdded,
        lastUpdated:      kb.lastUpdated,
        message: qcPassed
          ? `✅ Alle Learnings aus erfolgreichem Job gespeichert`
          : `⚠️ Job nicht erfolgreich — trotzdem Fehlermuster dokumentiert`,
      }

      return this.generateOutput(summary, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}
