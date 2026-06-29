/**
 * Knowledge Base Agent
 * Position: After Competitor Analysis → Before Script Agent
 *
 * Builds and queries an internal content knowledge base.
 * Prevents duplicate topics, learns from past performance,
 * enriches the Script Agent with proven hooks, formats, and insights.
 */

import { BaseAgent, AgentInput, AgentOutput } from './base'
import * as fs from 'fs'
import * as path from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KnowledgeEntry {
  id: string
  topic: string
  niche: string
  hook: string
  hashtags: string[]
  platform: string
  format: string                // e.g. "List", "Tutorial", "Story", "Comparison"
  scriptQuality: 'good' | 'bad' | 'average'
  createdAt: string
  performance?: {
    views: number
    likes: number
    comments: number
    shares: number
    retention: number            // 0–100 %
    watchtime: number            // seconds
  }
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  similarity: number             // 0–100
  matchedEntry?: KnowledgeEntry
  suggestion: string
}

export interface KnowledgeInsights {
  bestHooks: string[]
  worstHooks: string[]
  successfulFormats: string[]
  topHashtags: string[]
  avgRetention: number
  avgViews: number
  peakPostingTimes: string[]
  recommendations: string[]
}

export interface KnowledgeAgentOutput {
  mode: 'query' | 'store'
  duplicateCheck: DuplicateCheckResult
  insights: KnowledgeInsights
  similarTopics: Array<{ topic: string; views: number; retention: number }>
  totalEntries: number
  log: string[]
}

// ── Storage (JSON file) ───────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'knowledge-base.json')

function loadDB(): KnowledgeEntry[] {
  try {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(SEED_DATA, null, 2))
      return SEED_DATA
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as KnowledgeEntry[]
  } catch {
    return SEED_DATA
  }
}

function saveDB(entries: KnowledgeEntry[]): void {
  try {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(entries, null, 2))
  } catch { /* ignore write errors in read-only environments */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-zäöüß0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length > 3)
}

function similarity(a: string, b: string): number {
  const tokA = new Set(tokenize(a))
  const tokB = new Set(tokenize(b))
  const intersection = [...tokA].filter(t => tokB.has(t)).length
  const union = new Set([...tokA, ...tokB]).size
  return union === 0 ? 0 : Math.round((intersection / union) * 100)
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

// ── Knowledge Agent ───────────────────────────────────────────────────────────

export class KnowledgeAgent extends BaseAgent {
  slug = 'knowledge-agent'
  name = 'Knowledge Base'

  validateInput(_input: AgentInput): boolean { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const log: string[] = []
    const db = loadDB()

    const topic  = String(input.topic  || '')
    const niche  = String(input.niche  || 'Allgemein')
    const mode   = (input.mode as 'query' | 'store') || 'query'

    log.push(`[KB] Mode: ${mode} | Topic: "${topic}" | DB size: ${db.length} entries`)

    // ── Duplicate Check ───────────────────────────────────────────────────────
    let bestSim = 0
    let bestMatch: KnowledgeEntry | undefined

    for (const entry of db) {
      const sim = similarity(topic, entry.topic)
      if (sim > bestSim) { bestSim = sim; bestMatch = entry }
    }

    const isDuplicate = bestSim >= 70
    const duplicateCheck: DuplicateCheckResult = {
      isDuplicate,
      similarity: bestSim,
      matchedEntry: bestMatch,
      suggestion: isDuplicate
        ? `Ähnliches Video existiert bereits: "${bestMatch?.topic}". Verwende einen neuen Winkel oder aktualisiere das Thema.`
        : bestSim >= 40
          ? `Ähnliches Thema "${bestMatch?.topic}" vorhanden (${bestSim}% Übereinstimmung). Differenziere deinen Ansatz.`
          : 'Thema ist frisch — noch nicht behandelt.',
    }
    log.push(`[KB] Duplicate check: ${bestSim}% similarity → ${isDuplicate ? '⚠️ DUPLICATE' : '✅ UNIQUE'}`)

    // ── Similar Topics ────────────────────────────────────────────────────────
    const similarTopics = db
      .map(e => ({ ...e, sim: similarity(topic, e.topic) }))
      .filter(e => e.sim >= 25 && e.sim < 100)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5)
      .map(e => ({
        topic: e.topic,
        views: e.performance?.views ?? 0,
        retention: e.performance?.retention ?? 0,
      }))

    // ── Insights from DB ──────────────────────────────────────────────────────
    const nicheEntries = db.filter(e => e.niche === niche || niche === 'Allgemein')
    const goodEntries  = nicheEntries.filter(e => e.scriptQuality === 'good')
    const badEntries   = nicheEntries.filter(e => e.scriptQuality === 'bad')

    const bestHooks = goodEntries
      .sort((a, b) => (b.performance?.retention ?? 0) - (a.performance?.retention ?? 0))
      .slice(0, 5)
      .map(e => e.hook)

    const worstHooks = badEntries
      .sort((a, b) => (a.performance?.retention ?? 100) - (b.performance?.retention ?? 100))
      .slice(0, 3)
      .map(e => e.hook)

    const formatCount: Record<string, number> = {}
    for (const e of goodEntries) {
      formatCount[e.format] = (formatCount[e.format] ?? 0) + (e.performance?.views ?? 0)
    }
    const successfulFormats = Object.entries(formatCount)
      .sort((a, b) => b[1] - a[1])
      .map(([f]) => f)
      .slice(0, 4)

    const hashtagFreq: Record<string, number> = {}
    for (const e of nicheEntries) {
      for (const h of e.hashtags) hashtagFreq[h] = (hashtagFreq[h] ?? 0) + 1
    }
    const topHashtags = Object.entries(hashtagFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([h]) => h)
      .slice(0, 10)

    const retentions = nicheEntries.map(e => e.performance?.retention ?? 0).filter(Boolean)
    const views      = nicheEntries.map(e => e.performance?.views ?? 0).filter(Boolean)

    const recommendations: string[] = []
    if (bestHooks.length > 0)       recommendations.push(`Bewährtester Hook-Stil: "${bestHooks[0]}"`)
    if (successfulFormats.length > 0) recommendations.push(`Format "${successfulFormats[0]}" erzielt die höchste Reichweite in dieser Nische`)
    if (worstHooks.length > 0)      recommendations.push(`Hook-Muster vermeiden: "${worstHooks[0]}"`)
    if (topHashtags.length > 3)     recommendations.push(`Top-Hashtags für maximale Reichweite: ${topHashtags.slice(0, 4).join(', ')}`)
    if (isDuplicate)                recommendations.push('Thema überarbeiten — zu ähnlich zu bestehendem Content')

    const insights: KnowledgeInsights = {
      bestHooks,
      worstHooks,
      successfulFormats,
      topHashtags,
      avgRetention: avg(retentions),
      avgViews:     avg(views),
      peakPostingTimes: ['18:00–20:00 Uhr', '07:00–09:00 Uhr', '12:00–13:00 Uhr'],
      recommendations,
    }

    // ── Store mode ────────────────────────────────────────────────────────────
    if (mode === 'store' && input.entry) {
      const entry = input.entry as KnowledgeEntry
      entry.id        = entry.id || `kb-${Date.now()}`
      entry.createdAt = entry.createdAt || new Date().toISOString()
      db.push(entry)
      saveDB(db)
      log.push(`[KB] Stored new entry: "${entry.topic}"`)
    }

    const output: KnowledgeAgentOutput = {
      mode,
      duplicateCheck,
      insights,
      similarTopics,
      totalEntries: db.length,
      log,
    }

    log.push(`[KB] Done in ${Date.now() - start}ms`)

    return {
      success: true,
      data:    output as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    }
  }
}

// ── Seed data (initial knowledge base) ───────────────────────────────────────

const SEED_DATA: KnowledgeEntry[] = [
  {
    id: 'kb-seed-1',
    topic: 'ChatGPT für Anfänger — alles was du wissen musst',
    niche: 'KI / Tech',
    hook: 'Die meisten Menschen nutzen ChatGPT falsch. Hier ist der richtige Weg.',
    hashtags: ['#ChatGPT', '#KI', '#AITutorial', '#Tech2024'],
    platform: 'YouTube Shorts',
    format: 'Tutorial',
    scriptQuality: 'good',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    performance: { views: 284000, likes: 18200, comments: 3400, shares: 2100, retention: 72, watchtime: 38 },
  },
  {
    id: 'kb-seed-2',
    topic: '5 KI-Tools die dein Business automatisieren',
    niche: 'Business / Finance',
    hook: 'Diese 5 Tools ersetzen 3 Vollzeitstellen. Und kosten nichts.',
    hashtags: ['#AITools', '#BusinessAutomation', '#Productivity', '#KI'],
    platform: 'TikTok',
    format: 'List',
    scriptQuality: 'good',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    performance: { views: 156000, likes: 12400, comments: 8900, shares: 1800, retention: 68, watchtime: 42 },
  },
  {
    id: 'kb-seed-3',
    topic: 'Passives Einkommen mit KI — so gehts wirklich',
    niche: 'Business / Finance',
    hook: 'Ich verdiene 8.000€ im Monat ohne aktiv zu arbeiten. Das ist mein System.',
    hashtags: ['#PassivesEinkommen', '#KI', '#OnlineBusiness', '#Geld'],
    platform: 'TikTok',
    format: 'Story',
    scriptQuality: 'good',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    performance: { views: 421000, likes: 34100, comments: 12300, shares: 5600, retention: 81, watchtime: 51 },
  },
  {
    id: 'kb-seed-4',
    topic: 'Morgenroutine für maximale Produktivität',
    niche: 'Fitness / Health',
    hook: 'Deine Morgenroutine zerstört deine Produktivität. Ein Neurowissenschaftler erklärt warum.',
    hashtags: ['#Morgenroutine', '#Produktivität', '#Mindset', '#Fitness'],
    platform: 'Instagram Reels',
    format: 'Educational',
    scriptQuality: 'average',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    performance: { views: 89000, likes: 7200, comments: 1200, shares: 890, retention: 59, watchtime: 31 },
  },
  {
    id: 'kb-seed-5',
    topic: 'Wie ich in 30 Tagen 10 Kilo abgenommen habe',
    niche: 'Fitness / Health',
    hook: 'Keine Diät. Kein Gym. Nur diese eine Veränderung.',
    hashtags: ['#Abnehmen', '#Fitness', '#Gewichtsverlust', '#Motivation'],
    platform: 'TikTok',
    format: 'Story',
    scriptQuality: 'bad',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    performance: { views: 12000, likes: 340, comments: 89, shares: 45, retention: 31, watchtime: 18 },
  },
]
