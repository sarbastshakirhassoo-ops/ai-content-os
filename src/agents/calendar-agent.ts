/**
 * Content Calendar Agent
 * Position: After Quality Control → Before Upload Agent
 *
 * Decides when, where, and in what order content gets published.
 * Creates a detailed publication schedule based on platform behavior,
 * audience timezone, past performance, and content type.
 */

import { BaseAgent, AgentInput, AgentOutput } from './base'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Platform = 'youtube' | 'youtube_shorts' | 'tiktok' | 'instagram'

export interface PlatformSlot {
  platform: Platform
  displayName: string
  scheduledAt: string           // ISO datetime
  timezone: string
  dayOfWeek: string
  localTime: string
  expectedReach: number         // estimated views
  rationale: string
  priority: number              // 1 = first upload, 2 = second, etc.
  adaptations: string[]         // what to adapt for this platform
}

export interface PublicationPlan {
  contentTitle: string
  contentId: string
  niche: string
  slots: PlatformSlot[]
  primaryPlatform: Platform
  publishWindow: string         // "next 48h", "this weekend", etc.
  totalEstimatedReach: number
  calendarWeek: number
  notes: string[]
}

export interface CalendarEntry {
  id: string
  week: number
  title: string
  niche: string
  status: 'planned' | 'in_production' | 'ready' | 'published'
  platforms: PlatformSlot[]
  createdAt: string
}

export interface CalendarAgentOutput {
  plan: PublicationPlan
  calendar: CalendarEntry[]      // upcoming 4 weeks of planned content
  platformInsights: Record<Platform, string>
  nextOptimalSlot: string        // next best time to publish on primary platform
  weeklyCapacity: number         // recommended videos per week
  log: string[]
}

// ── Platform performance data ─────────────────────────────────────────────────

interface PlatformConfig {
  bestDays: string[]
  peakHours: number[]           // hours in platform's primary timezone (EST)
  timezone: 'CET' | 'EST' | 'PST'
  avgReachMultiplier: number    // relative reach vs baseline
  shortFormFirst: boolean       // publish here first for faster virality?
  adaptations: string[]
  minDaysBetweenUploads: number
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  tiktok: {
    bestDays:            ['Dienstag', 'Donnerstag', 'Freitag', 'Samstag'],
    peakHours:           [7, 12, 19, 21],
    timezone:            'CET',
    avgReachMultiplier:  2.4,
    shortFormFirst:      true,
    adaptations:         ['Trending Sound hinzufügen', 'Text-Overlay für erste 3 Sekunden optimieren', 'Hashtags auf 5 begrenzen'],
    minDaysBetweenUploads: 1,
  },
  instagram: {
    bestDays:            ['Montag', 'Mittwoch', 'Freitag'],
    peakHours:           [11, 14, 19],
    timezone:            'CET',
    avgReachMultiplier:  1.6,
    shortFormFirst:      false,
    adaptations:         ['Reel-Cover optimieren', 'Instagram Caption mit Hook', '20–30 Hashtags', 'Story-Teaser vorab posten'],
    minDaysBetweenUploads: 1,
  },
  youtube_shorts: {
    bestDays:            ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag'],
    peakHours:           [15, 18, 20],
    timezone:            'CET',
    avgReachMultiplier:  1.8,
    shortFormFirst:      false,
    adaptations:         ['#Shorts im Titel', 'Thumbnail für mobilen Feed optimieren', 'Kurze direkte Beschreibung'],
    minDaysBetweenUploads: 1,
  },
  youtube: {
    bestDays:            ['Freitag', 'Samstag', 'Sonntag'],
    peakHours:           [14, 16, 20],
    timezone:            'CET',
    avgReachMultiplier:  1.0,
    shortFormFirst:      false,
    adaptations:         ['SEO-Titel mit Keyword', 'Chapters hinzufügen', 'End-Screen für 20 Sek.', 'Custom Thumbnail pflicht'],
    minDaysBetweenUploads: 3,
  },
}

const NICHE_REACH: Record<string, number> = {
  'KI / Tech':          45000,
  'Business / Finance': 38000,
  'Gaming':             52000,
  'Fitness / Health':   35000,
  'Food':               42000,
  'Travel / Lifestyle': 28000,
  'Beauty / Fashion':   33000,
  'Motivation / Mindset': 30000,
  'Allgemein':          25000,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextWeekday(targetDay: string, baseDate: Date): Date {
  const days: Record<string, number> = {
    'Montag': 1, 'Dienstag': 2, 'Mittwoch': 3, 'Donnerstag': 4,
    'Freitag': 5, 'Samstag': 6, 'Sonntag': 0,
  }
  const target = days[targetDay] ?? 1
  const result = new Date(baseDate)
  const current = result.getDay()
  const diff = (target - current + 7) % 7 || 7
  result.setDate(result.getDate() + diff)
  return result
}

function formatDateTime(date: Date, hour: number): { iso: string; local: string } {
  const d = new Date(date)
  d.setHours(hour, 0, 0, 0)
  return {
    iso:   d.toISOString(),
    local: `${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} um ${hour}:00 Uhr`,
  }
}

function getCalendarWeek(date: Date): number {
  const oneJan = new Date(date.getFullYear(), 0, 1)
  return Math.ceil((((date.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7)
}

// ── Calendar Agent ────────────────────────────────────────────────────────────

export class CalendarAgent extends BaseAgent {
  slug = 'calendar-agent'
  name = 'Content Calendar'

  validateInput(_input: AgentInput): boolean { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const log: string[] = []

    const title    = String(input.title  || input.topic || 'Neues Video')
    const niche    = String(input.niche  || 'Allgemein')
    const contentId = String(input.contentId || `content-${Date.now()}`)
    const platforms = (input.platforms as Platform[] | undefined) || ['tiktok', 'instagram', 'youtube_shorts', 'youtube']
    const baseReach = NICHE_REACH[niche] || 25000

    log.push(`[Calendar] Planning: "${title}" | Niche: "${niche}" | Platforms: ${platforms.join(', ')}`)

    const now = new Date()

    // ── Build publication slots ───────────────────────────────────────────────
    // Sort by priority: TikTok first (highest virality), then Instagram, YT Shorts, YT
    const platformPriority: Platform[] = ['tiktok', 'instagram', 'youtube_shorts', 'youtube']
    const orderedPlatforms = platformPriority.filter(p => platforms.includes(p))

    const slots: PlatformSlot[] = []
    let dayOffset = 0

    for (let i = 0; i < orderedPlatforms.length; i++) {
      const p      = orderedPlatforms[i]
      const cfg    = PLATFORM_CONFIGS[p]
      const day    = cfg.bestDays[Math.floor(Math.random() * Math.min(2, cfg.bestDays.length))]
      const hour   = cfg.peakHours[Math.floor(Math.random() * Math.min(2, cfg.peakHours.length))]
      const slotDate = nextWeekday(day, new Date(now.getTime() + dayOffset * 86400000))
      const { iso, local } = formatDateTime(slotDate, hour)

      const reach = Math.round(baseReach * cfg.avgReachMultiplier * (0.8 + Math.random() * 0.4))

      slots.push({
        platform:      p,
        displayName:   p === 'youtube_shorts' ? 'YouTube Shorts' : p.charAt(0).toUpperCase() + p.slice(1),
        scheduledAt:   iso,
        timezone:      'Europe/Berlin (CET)',
        dayOfWeek:     day,
        localTime:     local,
        expectedReach: reach,
        rationale:     `${day} um ${hour}:00 Uhr ist der Peak für ${niche}-Content auf ${p}. Erwartete Reichweite: ~${(reach / 1000).toFixed(0)}K Views.`,
        priority:      i + 1,
        adaptations:   cfg.adaptations,
      })

      dayOffset += cfg.minDaysBetweenUploads
    }

    const primaryPlatform = orderedPlatforms[0]
    const totalReach = slots.reduce((s, sl) => s + sl.expectedReach, 0)

    const plan: PublicationPlan = {
      contentTitle:         title,
      contentId,
      niche,
      slots,
      primaryPlatform,
      publishWindow:        `Nächste ${Math.ceil(dayOffset / 7)} Woche(n)`,
      totalEstimatedReach:  totalReach,
      calendarWeek:         getCalendarWeek(now),
      notes: [
        `Primäre Plattform: ${primaryPlatform} (höchste Reichweite für ${niche})`,
        `Zeitversatz zwischen Plattformen: mind. ${PLATFORM_CONFIGS[primaryPlatform].minDaysBetweenUploads} Tag(e)`,
        `Gesamte geschätzte Reichweite: ${(totalReach / 1000).toFixed(0)}K Views`,
        'Content-Adaptierungen pro Plattform beachten (siehe Slot-Details)',
      ],
    }

    // ── Upcoming 4-week calendar ──────────────────────────────────────────────
    const calendar: CalendarEntry[] = Array.from({ length: 4 }, (_, week) => ({
      id:       `cal-${getCalendarWeek(now) + week}`,
      week:      getCalendarWeek(now) + week,
      title:    week === 0 ? title : `[Noch zu planen] Woche ${getCalendarWeek(now) + week}`,
      niche,
      status:   week === 0 ? 'ready' : 'planned',
      platforms: week === 0 ? slots : [],
      createdAt: new Date().toISOString(),
    }))

    // ── Platform insights ─────────────────────────────────────────────────────
    const platformInsights: Record<Platform, string> = {
      tiktok:         'Höchste organische Reichweite. Täglich posten für optimale Performance. Peak: Di, Do, Fr ab 19 Uhr.',
      instagram:      'Starke Engagement-Rate. Story-Teaser vorab posten erhöht Reel-Reichweite um ~30%.',
      youtube_shorts: 'Guter Feed-Traffic. Hohe Klickrate bei starkem Thumbnail-Text. Beste Tage: Mo–Do.',
      youtube:        'Längere Halbwertszeit (Evergreen). SEO-Optimierung entscheidend. Wochenende bevorzugen.',
    }

    const primaryCfg = PLATFORM_CONFIGS[primaryPlatform]
    const nextSlotTime = `${primaryCfg.bestDays[0]} um ${primaryCfg.peakHours[0]}:00 Uhr (CET)`

    log.push(`[Calendar] Plan created: ${slots.length} slots | Total reach: ~${(totalReach / 1000).toFixed(0)}K`)

    const output: CalendarAgentOutput = {
      plan,
      calendar,
      platformInsights,
      nextOptimalSlot:  nextSlotTime,
      weeklyCapacity:   5,         // recommended videos per week
      log,
    }

    return {
      success: true,
      data:    output as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    }
  }
}
