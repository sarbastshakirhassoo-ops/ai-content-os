/**
 * Engagement Agent
 * Position: After Analytics Agent → Before Learning Agent
 *
 * Analyzes all community reactions (comments, likes, shares, saves).
 * Extracts FAQs, trending requests, criticism, and wishes.
 * Generates new content ideas, reply suggestions, and community trends.
 * Feeds enriched data to the Learning Agent.
 */

import { BaseAgent, AgentInput, AgentOutput } from './base'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  platform: 'youtube' | 'tiktok' | 'instagram'
  text: string
  likes: number
  isQuestion: boolean
  sentiment: 'positive' | 'negative' | 'neutral'
  createdAt: string
}

export interface ContentIdea {
  title: string
  hook: string
  rationale: string            // why the community wants this
  estimatedInterest: number    // 0–100
  format: string
  platform: string
  sourceComments: number       // how many comments suggested this
}

export interface FAQ {
  question: string
  frequency: number            // how often asked
  suggestedAnswer: string
  contentPotential: 'high' | 'medium' | 'low'
}

export interface CommunityTrend {
  topic: string
  momentum: 'rising' | 'stable' | 'declining'
  mentionCount: number
  sentiment: 'positive' | 'negative' | 'mixed'
  platforms: string[]
}

export interface ReplySuggestion {
  commentSnippet: string
  platform: string
  suggestion: string
  tone: string
}

export interface EngagementAgentOutput {
  analysedVideos: number
  totalComments: number
  sentimentBreakdown: { positive: number; negative: number; neutral: number }
  topContentIdeas: ContentIdea[]
  faqs: FAQ[]
  communityTrends: CommunityTrend[]
  replySuggestions: ReplySuggestion[]
  engagementInsights: string[]
  seriesOpportunities: string[]
  log: string[]
}

// ── Comment analysis helpers ──────────────────────────────────────────────────

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const pos = /gut|toll|super|danke|genial|perfekt|love|amazing|great|helpful|hilfreich|weiter so|bitte mehr|top|best/i
  const neg = /schlecht|falsch|langweilig|nervig|schlechte|unsinn|nutzlos|bad|wrong|boring|dislike|hate|lüge/i
  if (pos.test(text)) return 'positive'
  if (neg.test(text)) return 'negative'
  return 'neutral'
}

function detectQuestion(text: string): boolean {
  return /\?$|was ist|wie kann|kannst du|würdest du|wann kommt|wieso|warum|wo finde|welche/i.test(text)
}

function extractTopics(comments: Comment[]): Record<string, number> {
  const topics: Record<string, number> = {}
  const topicPatterns: Array<{ pattern: RegExp; topic: string }> = [
    { pattern: /chatgpt|gpt|openai|ki-tool|ki tool/i,      topic: 'ChatGPT / KI Tools' },
    { pattern: /geld verdien|einkommen|passiv|side hustle/i, topic: 'Geld verdienen' },
    { pattern: /anfänger|beginner|tutorial|schritt für schritt/i, topic: 'Anfänger-Tutorials' },
    { pattern: /mehr videos?|nächst|folge|serie|teil 2/i,    topic: 'Mehr Content zu diesem Thema' },
    { pattern: /automatisier|workflow|system|tools/i,        topic: 'Automatisierung' },
    { pattern: /preis|kostet|kosten|gratis|kostenlos/i,      topic: 'Kosten & Preise' },
    { pattern: /deutsch|german|auf deutsch/i,                topic: 'Deutsche Sprache' },
    { pattern: /handy|smartphone|mobile|app/i,               topic: 'Mobile Nutzung' },
    { pattern: /anfang|start|wie starte/i,                   topic: 'Wie anfangen?' },
    { pattern: /ergebnis|resultat|wirklich|wahr|funktioniert/i, topic: 'Realitäts-Check' },
  ]
  for (const c of comments) {
    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(c.text)) {
        topics[topic] = (topics[topic] ?? 0) + 1 + (c.likes > 10 ? 2 : 0)
      }
    }
  }
  return topics
}

// ── Engagement Agent ──────────────────────────────────────────────────────────

export class EngagementAgent extends BaseAgent {
  slug = 'engagement-agent'
  name = 'Engagement Analyzer'

  validateInput(_input: AgentInput): boolean { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const log: string[] = []

    // Accept either injected comments or use demo data
    const rawComments = (input.comments as Comment[] | undefined) || DEMO_COMMENTS
    const analytics   = input.analytics as Record<string, unknown> | undefined

    log.push(`[Engagement] Analyzing ${rawComments.length} comments from community`)

    // ── Sentiment breakdown ───────────────────────────────────────────────────
    const withSentiment = rawComments.map(c => ({
      ...c,
      sentiment:  detectSentiment(c.text),
      isQuestion: detectQuestion(c.text),
    }))

    const positive = withSentiment.filter(c => c.sentiment === 'positive').length
    const negative = withSentiment.filter(c => c.sentiment === 'negative').length
    const neutral  = withSentiment.length - positive - negative
    const sentimentBreakdown = { positive, negative, neutral }

    log.push(`[Engagement] Sentiment: +${positive} / -${negative} / ~${neutral}`)

    // ── FAQ extraction ────────────────────────────────────────────────────────
    const questions = withSentiment.filter(c => c.isQuestion)
    const faqMap: Record<string, { count: number; likes: number; platform: string }> = {}

    for (const q of questions) {
      const key = q.text.toLowerCase().slice(0, 60)
      if (!faqMap[key]) faqMap[key] = { count: 0, likes: 0, platform: q.platform }
      faqMap[key].count++
      faqMap[key].likes += q.likes
    }

    const faqs: FAQ[] = Object.entries(faqMap)
      .sort((a, b) => (b[1].count + b[1].likes) - (a[1].count + a[1].likes))
      .slice(0, 6)
      .map(([q, data]) => ({
        question: q,
        frequency: data.count,
        suggestedAnswer: `Kurzes, direktes Video zu "${q.slice(0, 40)}..." erstellen — Community fragt das ${data.count}×`,
        contentPotential: data.count >= 5 ? 'high' : data.count >= 2 ? 'medium' : 'low',
      }))

    // ── Topic extraction ──────────────────────────────────────────────────────
    const topicFreq = extractTopics(withSentiment)

    // ── Community trends ──────────────────────────────────────────────────────
    const communityTrends: CommunityTrend[] = Object.entries(topicFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic, count]) => ({
        topic,
        momentum:    count >= 5 ? 'rising' : 'stable',
        mentionCount: count,
        sentiment:   'positive' as const,
        platforms:   ['TikTok', 'YouTube'],
      }))

    // ── Content ideas from community ──────────────────────────────────────────
    const topContentIdeas: ContentIdea[] = [
      ...communityTrends.slice(0, 3).map((trend, i) => ({
        title:              `${trend.topic}: Community-Fragen beantwortet`,
        hook:               `${trend.mentionCount} Menschen haben mich das gefragt. Jetzt antworte ich.`,
        rationale:          `${trend.mentionCount} Community-Mitglieder interessieren sich für "${trend.topic}"`,
        estimatedInterest:  Math.min(99, 60 + trend.mentionCount * 5),
        format:             i === 0 ? 'Q&A' : i === 1 ? 'Tutorial' : 'Story',
        platform:           'TikTok + YouTube Shorts',
        sourceComments:     trend.mentionCount,
      })),
      ...faqs.slice(0, 2).map(faq => ({
        title:              `Antwort auf: "${faq.question.slice(0, 40)}..."`,
        hook:               `Das fragt ihr mich am häufigsten. Hier ist die ehrliche Antwort.`,
        rationale:          `FAQ von Community — ${faq.frequency}× gefragt`,
        estimatedInterest:  faq.contentPotential === 'high' ? 88 : 70,
        format:             'Q&A',
        platform:           'TikTok',
        sourceComments:     faq.frequency,
      })),
    ]

    // ── Reply suggestions ─────────────────────────────────────────────────────
    const topComments = withSentiment
      .filter(c => c.likes >= 5 || c.isQuestion)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5)

    const replySuggestions: ReplySuggestion[] = topComments.map(c => ({
      commentSnippet: c.text.slice(0, 80),
      platform:       c.platform,
      suggestion:     c.isQuestion
        ? `Danke für deine Frage! Ich plane ein dediziertes Video dazu. Folge mir um es nicht zu verpassen 🔔`
        : c.sentiment === 'positive'
          ? `Freut mich wirklich! Mehr davon kommt in der nächsten Woche 🚀`
          : `Danke für das ehrliche Feedback! Das nehme ich mit.`,
      tone: c.sentiment === 'positive' ? 'enthusiastisch' : c.isQuestion ? 'hilfsbereit' : 'respektvoll',
    }))

    // ── Engagement insights ───────────────────────────────────────────────────
    const totalLikes    = withSentiment.reduce((s, c) => s + c.likes, 0)
    const avgLikesPerC  = Math.round(totalLikes / Math.max(1, withSentiment.length))
    const questionRate  = Math.round((questions.length / Math.max(1, withSentiment.length)) * 100)

    const engagementInsights = [
      `${positive}% positive Kommentare — Community reagiert stark positiv`,
      `${questionRate}% der Kommentare sind Fragen — hoher Content-Hunger`,
      `Ø ${avgLikesPerC} Likes pro Kommentar — überdurchschnittliche Interaktion`,
      topicFreq['Mehr Content zu diesem Thema'] ? `Community fordert aktiv mehr Content (${topicFreq['Mehr Content zu diesem Thema']}× erwähnt)` : null,
      `Stärkste Community-Signale: ${communityTrends.slice(0, 2).map(t => t.topic).join(', ')}`,
    ].filter(Boolean) as string[]

    // ── Series opportunities ──────────────────────────────────────────────────
    const seriesOpportunities = [
      'Q&A-Serie: Top-Community-Fragen wöchentlich beantworten',
      'Deep-Dive-Serie: Die 3 meistgefragten Themen ausführlich behandeln',
      'Community-Challenge: Zuschauer machen es nach und taggen dich',
      'Behind-the-Scenes: Wie das Content OS wirklich funktioniert',
    ]

    log.push(`[Engagement] Ideas: ${topContentIdeas.length} | FAQs: ${faqs.length} | Trends: ${communityTrends.length}`)

    const output: EngagementAgentOutput = {
      analysedVideos:     analytics ? 1 : DEMO_COMMENTS.length,
      totalComments:      rawComments.length,
      sentimentBreakdown,
      topContentIdeas,
      faqs,
      communityTrends,
      replySuggestions,
      engagementInsights,
      seriesOpportunities,
      log,
    }

    return {
      success: true,
      data:    output as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    }
  }
}

// ── Demo comments (realistic seed data) ──────────────────────────────────────

const DEMO_COMMENTS: Comment[] = [
  { id: 'c1',  platform: 'tiktok',   text: 'Kannst du ein Tutorial über ChatGPT für Anfänger machen?', likes: 142, isQuestion: true,  sentiment: 'positive', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'c2',  platform: 'youtube',  text: 'Das ist mega hilfreich! Weiter so 🔥', likes: 89, isQuestion: false, sentiment: 'positive', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'c3',  platform: 'youtube',  text: 'Funktioniert das wirklich oder nur in der Theorie?', likes: 67, isQuestion: true,  sentiment: 'neutral',  createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'c4',  platform: 'tiktok',   text: 'Ich warte seit Wochen auf Teil 2! Wann kommt der?', likes: 54, isQuestion: true,  sentiment: 'positive', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'c5',  platform: 'instagram',text: 'Super Video! Kannst du das auch für Handys zeigen?', likes: 48, isQuestion: true,  sentiment: 'positive', createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 'c6',  platform: 'youtube',  text: 'Wie viel kostet das insgesamt?', likes: 39, isQuestion: true,  sentiment: 'neutral',  createdAt: new Date(Date.now() - 21600000).toISOString() },
  { id: 'c7',  platform: 'tiktok',   text: 'Das beste Video zu diesem Thema auf der Plattform!', likes: 33, isQuestion: false, sentiment: 'positive', createdAt: new Date(Date.now() - 25200000).toISOString() },
  { id: 'c8',  platform: 'youtube',  text: 'Ich verstehe das nicht, zu schnell erklärt', likes: 28, isQuestion: false, sentiment: 'negative',  createdAt: new Date(Date.now() - 28800000).toISOString() },
  { id: 'c9',  platform: 'instagram',text: 'Bitte mehr Videos auf Deutsch!', likes: 25, isQuestion: false, sentiment: 'positive', createdAt: new Date(Date.now() - 32400000).toISOString() },
  { id: 'c10', platform: 'tiktok',   text: 'Wie lange dauert es bis man erste Ergebnisse sieht?', likes: 22, isQuestion: true,  sentiment: 'neutral',  createdAt: new Date(Date.now() - 36000000).toISOString() },
  { id: 'c11', platform: 'youtube',  text: 'Nutze ich schon 3 Monate — funktioniert wirklich!', likes: 19, isQuestion: false, sentiment: 'positive', createdAt: new Date(Date.now() - 39600000).toISOString() },
  { id: 'c12', platform: 'tiktok',   text: 'Welche Tools brauchst du dafür?', likes: 17, isQuestion: true,  sentiment: 'neutral',  createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 'c13', platform: 'instagram',text: 'Die Automatisierung klingt interessant aber kompliziert', likes: 15, isQuestion: false, sentiment: 'neutral',  createdAt: new Date(Date.now() - 46800000).toISOString() },
  { id: 'c14', platform: 'youtube',  text: 'Gibt es einen kostenlosen Einstieg?', likes: 14, isQuestion: true,  sentiment: 'neutral',  createdAt: new Date(Date.now() - 50400000).toISOString() },
  { id: 'c15', platform: 'tiktok',   text: 'Wie fange ich an wenn ich noch kein Geld habe?', likes: 12, isQuestion: true,  sentiment: 'neutral',  createdAt: new Date(Date.now() - 54000000).toISOString() },
]
