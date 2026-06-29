// ─────────────────────────────────────────────────────────────────────────────
// Script Writer Agent — Luxury Lifestyle + Nostalgie + Motivation
// Erstellt High-Retention Skripte im @69perception-Stil
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent, AgentInput, AgentOutput } from './base'
import {
  HOOK_TEMPLATES, SCRIPT_STRUCTURE, MUSIC_STYLES,
  ASSET_KEYWORDS, INVIDEO_PROMPT_BASE, SEO_KEYWORDS,
  FORBIDDEN_PHRASES,
} from '@/lib/niche-config'

const LUXURY_HOOKS = [
  'Das haben sie dir nie gesagt.',
  'Die Version von dir, die du sein könntest.',
  'In 5 Jahren wirst du dir wünschen, das früher gewusst zu haben.',
  'Das ist kein Zufall. Das ist Disziplin.',
  'Die meisten träumen davon. Wenige tun es wirklich.',
  'Wenn du das siehst, ändert sich alles.',
  'Der Unterschied zwischen arm und reich — es sind keine 1000 Dinge.',
  'Niemand zeigt dir das wirkliche Leben dahinter.',
  'Schweigen ist die Antwort derer, die es wirklich wissen.',
  'Dieser eine Moment änderte alles.',
]

const SCENE_VISUALS: Record<string, string[]> = {
  cars:     ['Lamborghini bei Sonnenuntergang', 'Ferrari auf leerer Straße bei Nacht', 'Porsche im Regen mit Lichtreflexen'],
  jets:     ['Privatjet Cockpit bei Sonnenaufgang', 'Boardingtreppe bei Nacht', 'Fensteransicht über den Wolken'],
  cities:   ['Dubai Skyline bei Nacht', 'New York Regen auf Glas', 'Monaco Hafenblick', 'Tokio Neonlichter'],
  lifestyle:['Rooftop-Pool mit Stadtblick', 'Penthouse-Innenraum', 'Champagner bei Sonnenuntergang', 'First-Class Kabine'],
  nostalgia:['Super-8 Film-Look alter Kindheitsmomente', 'Vintage-Foto-Ästhetik', 'Sepia-getönter Rückblick'],
  mindset:  ['Person meditiert auf Rooftop', 'Schreibtisch mit Plan und Kaffee morgens', 'Joggen im Morgengrauen'],
}

function buildSceneKeywords(topic: string): string[] {
  const t = topic.toLowerCase()
  const keywords: string[] = []
  if (t.includes('car') || t.includes('auto') || t.includes('fahrzeug')) keywords.push(...ASSET_KEYWORDS.luxury_cars)
  if (t.includes('travel') || t.includes('reise') || t.includes('jet')) keywords.push(...ASSET_KEYWORDS.travel)
  if (t.includes('city') || t.includes('dubai') || t.includes('nyc') || t.includes('stadt')) keywords.push(...ASSET_KEYWORDS.cities)
  if (t.includes('nostalg') || t.includes('vintage') || t.includes('erinnerung')) keywords.push(...ASSET_KEYWORDS.nostalgia)
  if (keywords.length === 0) keywords.push(...ASSET_KEYWORDS.cinematic, ...ASSET_KEYWORDS.lifestyle)
  return [...new Set(keywords)].slice(0, 8)
}

function pickHook(topic: string, competitorHooks?: string[]): string {
  if (competitorHooks && competitorHooks.length > 0) {
    return competitorHooks[0]
  }
  const idx = Math.abs(topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % LUXURY_HOOKS.length
  return LUXURY_HOOKS[idx]
}

function buildScript(topic: string, hook: string, competitorInsights: string): string {
  return `[HOOK — 0:00–0:02]
${hook}

[SCENE 1 — 0:02–0:07]
${SCENE_VISUALS.cities[0]} — kein Text, nur Musik und Atmosphäre.
Slow Motion. Dark Luxury Grading.

[SCENE 2 — 0:07–0:15]
VOICEOVER / TEXT-OVERLAY:
"${topic} — die meisten sehen das Ergebnis. Nicht den Weg."

[SCENE 3 — 0:15–0:25]
MUSIK-DROP — stärkstes Visual: Luxury-Moment (Auto / Jet / Rooftop).
TEXT: "Disziplin ist keine Option. Es ist die einzige Option."

[SCENE 4 — 0:25–0:33]
Nostalgie-Moment — Film Grain, warme Farben, Erinnerungen.
TEXT: "Du weißt bereits, wer du sein könntest."

[CTA — 0:33–0:37]
TEXT: "Follow für tägliche Inspiration ↗"
Eleganter Fade-Out mit Logo/Handle.

---
Competitor-Insights: ${competitorInsights || 'Cinematic Hook + Visual-first Storytelling'}
Gesamtlänge: ~37 Sekunden | Format: 9:16 | Plattform: IG/TT/YT-Shorts`
}

function buildVideoPrompt(topic: string, hook: string, musicStyle: string, scenes: string[]): string {
  return INVIDEO_PROMPT_BASE
    .replace('{music_style}', musicStyle)
    .replace('{hook}', hook)
    .replace('{topic}', topic)
    .replace('{scene_1}', scenes[0] || 'Luxury car on empty road at night')
    .replace('{scene_2}', scenes[1] || 'Penthouse rooftop with city skyline')
    .replace('{scene_3}', scenes[2] || 'Private jet interior, golden light')
    .replace('{scene_4}', scenes[3] || 'Person looking at city at night, contemplative')
}

function containsForbiddenPhrase(text: string): boolean {
  const lower = text.toLowerCase()
  return FORBIDDEN_PHRASES.some(p => lower.includes(p))
}

export class ScriptAgent extends BaseAgent {
  slug = 'script-agent'
  name = 'Script Writer'

  validateInput(input: AgentInput): boolean | string {
    return !!(input.niche || input.topic) || 'Nische oder Topic fehlt'
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const niche    = input.niche  as string || 'Luxury Lifestyle'
      const rawTopic = input.topic  as string || 'Disziplin und Erfolg'
      const topic    = rawTopic.slice(0, 100)

      const competitor  = (input.competitor  as Record<string, unknown>) || {}
      const knowledge   = (input.knowledge   as Record<string, unknown>) || {}

      // Duplikat-Check via Knowledge Base
      const usedTopics   = (knowledge.usedTopics   as string[]) || []
      const isDuplicate  = usedTopics.some(t => t.toLowerCase() === topic.toLowerCase())

      // Hook auswählen
      const competitorHooks = (competitor.successfulHooks as string[]) ||
                              (competitor.topHooks        as string[]) || []
      const hook = pickHook(topic, competitorHooks)

      // Musik-Stil
      const musicIdx   = Math.abs(topic.charCodeAt(0) + topic.charCodeAt(topic.length - 1)) % MUSIC_STYLES.length
      const musicStyle = MUSIC_STYLES[musicIdx]

      // Szenen-Keywords für Asset Manager
      const sceneKeywords = buildSceneKeywords(topic)

      // Szenen-Visuals für Prompt
      const sceneVisuals = [
        SCENE_VISUALS.cars[0],
        SCENE_VISUALS.lifestyle[0],
        SCENE_VISUALS.jets[0],
        SCENE_VISUALS.nostalgia[0],
      ]

      // Script aufbauen
      const competitorInsight = (competitor.keyInsight as string) ||
                                (competitor.summary    as string) || ''
      const fullScript  = buildScript(topic, hook, competitorInsight)
      const videoPrompt = buildVideoPrompt(topic, hook, musicStyle, sceneVisuals)

      // Anti-Scam Check
      const scamDetected = containsForbiddenPhrase(fullScript) || containsForbiddenPhrase(hook)

      return this.generateOutput({
        topic,
        niche,
        hook,
        fullScript,
        videoPrompt,
        musicStyle,
        sceneKeywords,
        sceneVisuals,
        isDuplicate,
        scamDetected,
        ctaText: 'Follow für tägliche Inspiration ↗',
        thumbnailIdea: `${topic.split(' ').slice(0,3).join(' ')} — cinematic dark overlay mit goldenem Text`,
        seoKeywords: SEO_KEYWORDS.slice(0, 8),
        warnings: [
          ...(isDuplicate  ? [`⚠️ Topic "${topic}" wurde bereits verwendet`] : []),
          ...(scamDetected ? ['🚨 Verbotene Phrase erkannt — QC wird blockieren'] : []),
        ],
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}

// ── Backward-compat type exports ──────────────────────────────────────────────
export type CompetitorContext = Record<string, unknown>
export type VideoScript       = Record<string, unknown>
export type ScriptSection     = Record<string, unknown>
export const AVAILABLE_NICHES = [
  'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic',
  'Business & Entrepreneurship',
  'Fitness & Health',
  'Personal Development',
] as const
