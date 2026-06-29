/**
 * SEO Agent
 * Position: After Script Agent → Before Brand Consistency Agent
 *
 * Optimizes every video for maximum discoverability across all platforms.
 * Generates platform-specific titles, captions, descriptions, keywords,
 * hashtags, search terms, alternative titles, and hook variants.
 */

import { BaseAgent, AgentInput, AgentOutput } from './base'
import type { VideoScript } from './script-agent'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SEOKeyword {
  keyword: string
  volume: 'high' | 'medium' | 'low'        // estimated relative search volume
  competition: 'high' | 'medium' | 'low'   // keyword competition
  relevance: number                          // 0–100
  trend: 'rising' | 'stable' | 'declining'
}

export interface PlatformSEO {
  youtube: {
    title: string                   // ≤ 100 chars, keyword-first
    description: string             // 500+ chars, keyword-dense first 2 lines
    tags: string[]                  // 10–15 tags
    thumbnail: string               // thumbnail text overlay concept
    chapters: string[]              // video chapter markers
  }
  tiktok: {
    caption: string                 // ≤ 150 chars
    hashtags: string[]              // 3–5 trending hashtags
    soundSuggestion: string
  }
  instagram: {
    caption: string                 // 125 chars before "more"
    hashtags: string[]              // 20–30 hashtags
    altText: string                 // accessibility + SEO
    reelCoverText: string
  }
  youtube_shorts: {
    title: string
    hashtags: string[]
  }
}

export interface SEOAgentOutput {
  topic: string
  niche: string
  platform: PlatformSEO
  primaryKeyword: string
  secondaryKeywords: string[]
  keywords: SEOKeyword[]
  searchTerms: string[]
  altTitles: string[]
  hookVariants: string[]
  seoScore: number                   // 0–100
  scoreBreakdown: Record<string, number>
  improvements: string[]
  log: string[]
}

// ── Keyword databases per niche ───────────────────────────────────────────────

const NICHE_KEYWORDS: Record<string, string[]> = {
  'KI / Tech': [
    'ChatGPT', 'Künstliche Intelligenz', 'KI Tools', 'AI Tutorial', 'Automatisierung',
    'Machine Learning', 'AI 2025', 'KI für Anfänger', 'Prompt Engineering', 'GPT-4',
    'KI im Alltag', 'AI verdienen', 'Midjourney', 'Claude AI', 'AI Workflow',
  ],
  'Business / Finance': [
    'Passives Einkommen', 'Online verdienen', 'Side Hustle', 'Investieren', 'Geld sparen',
    'Finanzielle Freiheit', 'Nebeneinkommen', 'Business Ideen', 'Steuern sparen', 'ETF',
    'Kryptowährung', 'Online Business', 'Dropshipping', 'Freelancer', 'Reich werden',
  ],
  'Fitness / Health': [
    'Abnehmen', 'Muskeln aufbauen', 'Heimtraining', 'Ernährungsplan', 'Workout',
    'Kalorien', 'Protein', 'Krafttraining', 'Cardio', 'Intermittent Fasting',
    'Fitness Motivation', 'Gesund leben', 'Schlaf verbessern', 'Stress abbauen', 'Meal Prep',
  ],
  'Food': [
    'Rezept', 'Kochen', 'Einfach kochen', 'Schnelle Rezepte', 'Gesund essen',
    'Vegane Rezepte', 'Kuchenrezept', 'Abendbrot', 'Mittagessen', 'Frühstück',
    'Meal Prep', 'Günstig kochen', 'Restaurant Hack', 'Food Hacks', 'Backen',
  ],
  'Travel / Lifestyle': [
    'Reisen', 'Urlaub', 'Backpacking', 'Digitaler Nomade', 'Günstig reisen',
    'Geheimtipps', 'Reisetipps', 'Auslandserfahrung', 'Work and Travel', 'Solo Reisen',
    'Hotel Hacks', 'Flug günstig', 'Urlaub planen', 'Reiseziele', 'Vanlife',
  ],
  'Beauty / Fashion': [
    'Make-up Tutorial', 'Skincare Routine', 'Outfit', 'Hairstyle', 'Schminken',
    'Makeup für Anfänger', 'Mode Tipps', 'Capsule Wardrobe', 'Beauty Hacks', 'Pflegeprodukte',
    'Trend 2025', 'Dupes', 'Parfum', 'Anti-Aging', 'Glowy Skin',
  ],
  'Gaming': [
    'Gaming', 'Let\'s Play', 'Tipps und Tricks', 'Gameplay', 'Best Builds',
    'GTA 6', 'Fortnite', 'Minecraft', 'Gaming Setup', 'Esports',
    'Controller', 'PC Gaming', 'Gaming PC', 'Streams', 'Gaming verdienen',
  ],
  'Motivation / Mindset': [
    'Motivation', 'Mindset', 'Selbstdisziplin', 'Erfolg', 'Gewohnheiten',
    'Atomic Habits', 'Produktivität', 'Zeitmanagement', 'Ziele erreichen', 'Selbstentwicklung',
    'Stoizismus', 'Mentaltraining', 'Fokus', 'Morgenroutine', 'Deep Work',
  ],
  'Allgemein': [
    'Viral', 'Trending', 'Life Hacks', 'Überraschend', 'Das wusste ich nicht',
    'Unglaublich', 'Tipps', 'Tricks', 'Ratschläge', 'Inspiration',
  ],
}

const PLATFORM_HASHTAGS: Record<string, string[]> = {
  'KI / Tech': ['#KI', '#AITools', '#ChatGPT', '#Technologie', '#Automatisierung', '#AITutorial', '#KünstlicheIntelligenz'],
  'Business / Finance': ['#PassivesEinkommen', '#SideHustle', '#OnlineGeldVerdienen', '#Business', '#Investieren', '#FinanzielleFreiheit'],
  'Fitness / Health': ['#Fitness', '#Abnehmen', '#Workout', '#Gesundheit', '#Motivation', '#FitnessMotivation', '#Training'],
  'Food': ['#Rezept', '#Kochen', '#Food', '#Foodie', '#EinfachKochen', '#Lecker', '#Backen'],
  'Travel / Lifestyle': ['#Reisen', '#Travel', '#Urlaub', '#Wanderlust', '#DigitalNomad', '#TravelTips', '#Backpacking'],
  'Beauty / Fashion': ['#Beauty', '#Makeup', '#Skincare', '#Mode', '#Outfit', '#BeautyTips', '#Fashion'],
  'Gaming': ['#Gaming', '#Gamer', '#Games', '#GamePlay', '#Streamer', '#PS5', '#PCGaming'],
  'Motivation / Mindset': ['#Motivation', '#Mindset', '#Erfolg', '#Selbstentwicklung', '#Produktivität', '#Gewohnheiten'],
  'Allgemein': ['#Trending', '#LifeHacks', '#Viral', '#Tipps', '#FürDich', '#fyp'],
}

// ── SEO Agent ─────────────────────────────────────────────────────────────────

export class SEOAgent extends BaseAgent {
  slug = 'seo-agent'
  name = 'SEO Optimizer'

  validateInput(input: AgentInput): boolean {
    return Boolean(input.topic || input.script)
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const log: string[] = []

    const script  = input.script as VideoScript | undefined
    const topic   = String(input.topic   || script?.topic  || 'Allgemeines Video')
    const niche   = String(input.niche   || script?.niche  || 'Allgemein')
    const hook    = String(input.hook    || script?.hook   || '')
    const hashtags = (script?.hashtags || []) as string[]

    log.push(`[SEO] Topic: "${topic}" | Niche: "${niche}"`)

    // ── Keyword selection ─────────────────────────────────────────────────────
    const nicheKws  = NICHE_KEYWORDS[niche] || NICHE_KEYWORDS['Allgemein']
    const topicWords = topic.toLowerCase().split(' ')

    const scoredKws: SEOKeyword[] = nicheKws.map(kw => {
      const relevance = topicWords.some(w => kw.toLowerCase().includes(w)) ? 90 : 60
      return {
        keyword:     kw,
        volume:      relevance > 75 ? 'high' : 'medium',
        competition: relevance > 80 ? 'high' : 'medium',
        relevance,
        trend:       'rising' as const,
      }
    })
    scoredKws.sort((a, b) => b.relevance - a.relevance)

    const primaryKw         = scoredKws[0]?.keyword || niche
    const secondaryKeywords = scoredKws.slice(1, 6).map(k => k.keyword)
    const searchTerms       = [
      topic,
      `${topic} Tutorial`,
      `${topic} 2025`,
      `${topic} für Anfänger`,
      `${primaryKw} erklärt`,
      `Wie ${topic.toLowerCase()}`,
      `${niche} ${primaryKw}`,
    ]

    log.push(`[SEO] Primary keyword: "${primaryKw}" | ${secondaryKeywords.length} secondary keywords`)

    // ── Alt titles ────────────────────────────────────────────────────────────
    const altTitles = [
      `${primaryKw}: ${topic}`,
      `${topic} — Das musst du wissen (${new Date().getFullYear()})`,
      `Warum ${topic.toLowerCase()} alles verändert`,
      `${topic} in ${Math.floor(Math.random() * 3) + 2} Minuten erklärt`,
      `Das BESTE ${niche}-Video über ${topic}`,
    ]

    // ── Hook variants ─────────────────────────────────────────────────────────
    const hookVariants = [
      hook || `${primaryKw} — das wissen die wenigsten.`,
      `Bevor du ${topic.toLowerCase()} machst, schau das!`,
      `Ich habe ${topic.toLowerCase()} getestet. Das Ergebnis hat mich überrascht.`,
      `${new Date().getFullYear()} ändert ${topic.toLowerCase()} komplett. Hier ist warum.`,
      `Die meisten machen ${topic.toLowerCase()} falsch. So geht es richtig.`,
    ]

    // ── Platform-specific SEO ─────────────────────────────────────────────────
    const nicheHashtags = PLATFORM_HASHTAGS[niche] || PLATFORM_HASHTAGS['Allgemein']
    const allHashtags   = [...new Set([...hashtags, ...nicheHashtags])]

    const ytTitle = `${primaryKw}: ${topic}`.slice(0, 100)
    const ytDesc  = [
      `${hookVariants[0]}`,
      '',
      `In diesem Video lernst du alles über ${topic}. Wir decken die wichtigsten Aspekte von ${primaryKw} ab und zeigen dir, wie du sofort damit starten kannst.`,
      '',
      `📌 Das lernst du in diesem Video:`,
      `• Was ${topic} wirklich bedeutet`,
      `• Wie du ${primaryKw} optimal nutzt`,
      `• Die häufigsten Fehler und wie du sie vermeidest`,
      `• Schritt-für-Schritt Anleitung für Einsteiger`,
      '',
      `🔔 Abonniere für tägliche ${niche}-Updates!`,
      '',
      `Keywords: ${[primaryKw, ...secondaryKeywords].join(', ')}`,
    ].join('\n')

    const platform: PlatformSEO = {
      youtube: {
        title:       ytTitle,
        description: ytDesc,
        tags:        [primaryKw, topic, niche, ...secondaryKeywords.slice(0, 8), ...allHashtags.slice(0, 4).map(h => h.replace('#', ''))],
        thumbnail:   `Großer Text: "${topic.toUpperCase()}" | Kontrastreiche Farben | Emoji oder Icon | Gesicht mit Ausdruck`,
        chapters:    ['0:00 Intro', '0:15 Das Problem', '0:45 Die Lösung', '1:30 Schritt-für-Schritt', '2:15 Zusammenfassung'],
      },
      tiktok: {
        caption:         `${hookVariants[0]} ${allHashtags.slice(0, 3).join(' ')}`.slice(0, 150),
        hashtags:        [...allHashtags.slice(0, 3), '#fyp', '#viral', '#foryou'],
        soundSuggestion: 'Trending instrumentaler Sound oder motivierender Beat',
      },
      instagram: {
        caption:       `${hookVariants[0]}\n\n👇 Speichern für später!`,
        hashtags:      [...allHashtags.slice(0, 15), '#Deutschland', '#Österreich', '#Schweiz', '#Content', '#Creator'],
        altText:       `Video über ${topic}: ${primaryKw} Tutorial für ${niche}`,
        reelCoverText: topic.slice(0, 30).toUpperCase(),
      },
      youtube_shorts: {
        title:    `${topic} #Shorts`,
        hashtags: [...allHashtags.slice(0, 3), '#Shorts', '#YouTubeShorts'],
      },
    }

    // ── SEO Score ─────────────────────────────────────────────────────────────
    const titleLength    = ytTitle.length >= 40 && ytTitle.length <= 70 ? 25 : 15
    const hasKeyword     = ytTitle.toLowerCase().includes(primaryKw.toLowerCase()) ? 20 : 0
    const descLength     = ytDesc.length >= 300 ? 20 : 10
    const hashtagCount   = allHashtags.length >= 5 ? 15 : 8
    const altTitleCount  = altTitles.length >= 3 ? 10 : 5
    const hookCount      = hookVariants.length >= 3 ? 10 : 5
    const seoScore       = Math.min(100, titleLength + hasKeyword + descLength + hashtagCount + altTitleCount + hookCount)

    const scoreBreakdown = { titleLength, hasKeyword, descLength, hashtagCount, altTitleCount, hookCount }

    const improvements: string[] = []
    if (!hasKeyword)         improvements.push(`Primäres Keyword "${primaryKw}" in YouTube-Titel einbauen`)
    if (ytTitle.length < 40) improvements.push('YouTube-Titel zu kurz — mindestens 40 Zeichen anstreben')
    if (allHashtags.length < 10) improvements.push('Mehr Hashtags für bessere Reichweite')
    if (improvements.length === 0) improvements.push('SEO-Optimierung ist stark — keine kritischen Verbesserungen nötig')

    log.push(`[SEO] Score: ${seoScore}/100 | Primary: "${primaryKw}"`)

    const output: SEOAgentOutput = {
      topic, niche, platform,
      primaryKeyword: primaryKw,
      secondaryKeywords,
      keywords:       scoredKws.slice(0, 10),
      searchTerms,
      altTitles,
      hookVariants,
      seoScore,
      scoreBreakdown,
      improvements,
      log,
    }

    return {
      success: true,
      data:    output as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    }
  }
}
