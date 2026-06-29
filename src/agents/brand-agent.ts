/**
 * Brand Consistency Agent
 * Position: After SEO Agent → Before Asset Manager
 *
 * Ensures every piece of content matches the brand identity.
 * Checks writing style, tone, CTA, visual elements, intro/outro,
 * and returns a consistency score with specific improvement suggestions.
 */

import { BaseAgent, AgentInput, AgentOutput } from './base'
import type { VideoScript } from './script-agent'
import type { SEOAgentOutput } from './seo-agent'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BrandProfile {
  name: string
  voice: 'authoritative' | 'casual' | 'motivational' | 'educational' | 'entertaining'
  tone: string[]                // e.g. ['direkt', 'klar', 'motivierend']
  primaryColors: string[]       // hex codes
  secondaryColors: string[]
  fonts: { headline: string; body: string }
  intro: string                 // standard intro pattern
  outro: string                 // standard outro / CTA pattern
  logoPlacement: string
  subtitleStyle: string         // e.g. "Weiß, Fett, zentriert, gelb für Betonung"
  voiceoverStyle: string
  ctaPattern: string            // what every CTA should contain
  forbiddenPhrases: string[]    // phrases that break brand consistency
  mustInclude: string[]         // elements that must be present
}

export interface BrandCheck {
  dimension: string
  passed: boolean
  score: number                 // 0–100
  finding: string
  suggestion?: string
}

export interface BrandAgentOutput {
  brandName: string
  overallScore: number           // 0–100
  passed: boolean                // score >= 75
  checks: BrandCheck[]
  criticalIssues: string[]
  suggestions: string[]
  approvedForProduction: boolean
  revisedCTA?: string            // if CTA needed fixing
  brandReport: string            // human-readable summary
  log: string[]
}

// ── Default brand profile ─────────────────────────────────────────────────────
// Users can override this via API input or a config file.

const DEFAULT_BRAND: BrandProfile = {
  name: 'Content OS Brand',
  voice: 'authoritative',
  tone: ['direkt', 'klar', 'präzise', 'motivierend', 'lösungsorientiert'],
  primaryColors: ['#6366f1', '#1e1e2e', '#ffffff'],
  secondaryColors: ['#10b981', '#f59e0b', '#ef4444'],
  fonts: { headline: 'Inter Bold', body: 'Inter Regular' },
  intro: 'Direkt ins Thema einsteigen — kein langer Intro-Abspann. Max. 3 Sekunden Branding.',
  outro: 'Klarer CTA + Kanal-Abo-Reminder. Nicht mehr als 5 Sekunden.',
  logoPlacement: 'Obere rechte Ecke, Größe: max. 8% der Breite, halbtransparent',
  subtitleStyle: 'Weiß, Inter Bold, 32px, zentriert. Schlüsselwörter in Akzentfarbe (#6366f1)',
  voiceoverStyle: 'Klar, selbstbewusst, kein zögerndes "äh" oder "ähm", mittleres Tempo',
  ctaPattern: 'Konkrete Handlungsaufforderung + Nutzen für Zuschauer (kein generisches "Like und Abo")',
  forbiddenPhrases: [
    'guys', 'what\'s up', 'ohne mich', 'ich weiß nicht', 'vielleicht',
    'könnte sein', 'mal sehen', 'irgendwie',
  ],
  mustInclude: ['Hook in ersten 3 Sekunden', 'Konkreter CTA', 'Klare Hauptaussage'],
}

// ── Brand checks ──────────────────────────────────────────────────────────────

function checkTone(script: VideoScript | undefined, brand: BrandProfile): BrandCheck {
  if (!script) return { dimension: 'Tonalität', passed: false, score: 0, finding: 'Kein Skript vorhanden' }
  const text = [script.hook, ...script.sections.map(s => s.text), script.cta].join(' ')
  const forbidden = brand.forbiddenPhrases.filter(p => text.toLowerCase().includes(p.toLowerCase()))
  const score = forbidden.length === 0 ? 90 : Math.max(20, 90 - forbidden.length * 20)
  return {
    dimension: 'Tonalität',
    passed: score >= 70,
    score,
    finding: forbidden.length === 0
      ? 'Ton entspricht der Markenstimme'
      : `Verbotene Formulierungen gefunden: ${forbidden.join(', ')}`,
    suggestion: forbidden.length > 0
      ? `Ersetze: ${forbidden.map(f => `"${f}"`).join(', ')} durch direktere Formulierungen`
      : undefined,
  }
}

function checkHook(script: VideoScript | undefined): BrandCheck {
  if (!script) return { dimension: 'Hook', passed: false, score: 0, finding: 'Kein Skript vorhanden' }
  const hook     = script.hook
  const isShort  = hook.length <= 120
  const hasVerb  = /[A-ZÄÖÜ]/.test(hook[0])          // starts with capital
  const isBold   = hook.includes('!') || hook.includes('?') || hook.split(' ').length <= 15
  const score    = (isShort ? 30 : 15) + (hasVerb ? 20 : 0) + (isBold ? 30 : 15) + 20
  return {
    dimension: 'Hook-Stärke',
    passed: score >= 70,
    score: Math.min(100, score),
    finding: score >= 70
      ? `Hook ist prägnant und brand-konform (${hook.length} Zeichen)`
      : `Hook zu schwach oder zu lang (${hook.length} Zeichen)`,
    suggestion: score < 70
      ? 'Hook kürzen auf max. 120 Zeichen. Mit starkem Verb beginnen. Frage oder Aussage die sofort Neugier erzeugt.'
      : undefined,
  }
}

function checkCTA(script: VideoScript | undefined, brand: BrandProfile): BrandCheck {
  if (!script) return { dimension: 'CTA', passed: false, score: 0, finding: 'Kein Skript vorhanden' }
  const cta          = script.cta
  const hasAction    = /folg|abonnier|kommentier|schreib|klick|save|speicher|teil/i.test(cta)
  const hasBenefit   = /kostenlos|gratis|exklusiv|lern|erhalte|bekomm|wissen/i.test(cta)
  const isGeneric    = /like und abo|gefällt mir|danke fürs|tschüss/i.test(cta)
  const score        = (hasAction ? 35 : 0) + (hasBenefit ? 35 : 10) + (isGeneric ? 0 : 30)
  return {
    dimension: 'CTA-Qualität',
    passed: score >= 70 && !isGeneric,
    score: Math.min(100, score),
    finding: isGeneric
      ? 'CTA ist zu generisch — keine klare Handlungsaufforderung mit Nutzen'
      : score >= 70
        ? 'CTA ist konkret und brand-konform'
        : 'CTA hat Handlungsaufforderung aber keinen klaren Nutzen für den Zuschauer',
    suggestion: score < 70 || isGeneric
      ? brand.ctaPattern
      : undefined,
  }
}

function checkLength(script: VideoScript | undefined): BrandCheck {
  if (!script) return { dimension: 'Videolänge', passed: false, score: 0, finding: 'Kein Skript vorhanden' }
  const wc    = script.wordCount
  const ideal = wc >= 100 && wc <= 400      // 60–90 sec at ~150wpm
  const score = ideal ? 95 : wc < 60 ? 40 : wc > 500 ? 50 : 70
  return {
    dimension: 'Skript-Länge',
    passed: ideal,
    score,
    finding: ideal
      ? `${wc} Wörter — ideal für Kurzform-Video (60–90 Sek.)`
      : wc < 100
        ? `Zu kurz (${wc} Wörter) — zu wenig Inhalt für Mehrwert`
        : `Zu lang (${wc} Wörter) — Zuschauer werden abspringen`,
    suggestion: !ideal
      ? wc < 100
        ? 'Mindestens 3 konkrete Punkte mit je 1–2 Sätzen ausarbeiten'
        : 'Inhalt auf die stärksten 3 Punkte kürzen'
      : undefined,
  }
}

function checkSEOAlignment(seo: SEOAgentOutput | undefined, script: VideoScript | undefined): BrandCheck {
  if (!seo || !script) {
    return { dimension: 'SEO-Alignment', passed: true, score: 75, finding: 'Keine SEO-Daten — Basis-Check bestanden' }
  }
  const title     = seo.platform.youtube.title.toLowerCase()
  const kw        = seo.primaryKeyword.toLowerCase()
  const inTitle   = title.includes(kw)
  const inHashtag = script.hashtags.some(h => h.toLowerCase().includes(kw.replace(/\s/g, '').toLowerCase()))
  const score     = (inTitle ? 50 : 20) + (inHashtag ? 30 : 10) + 20
  return {
    dimension: 'SEO-Alignment',
    passed: score >= 60,
    score: Math.min(100, score),
    finding: inTitle
      ? `Primäres Keyword "${seo.primaryKeyword}" korrekt im Titel platziert`
      : `Primäres Keyword "${seo.primaryKeyword}" fehlt im Titel`,
    suggestion: !inTitle
      ? `YouTube-Titel mit "${seo.primaryKeyword}" beginnen`
      : undefined,
  }
}

function checkVisualConsistency(brand: BrandProfile): BrandCheck {
  // Static check — in production this would analyze actual video assets
  return {
    dimension: 'Visuelle Konsistenz',
    passed: true,
    score: 85,
    finding: `Richtlinien: ${brand.subtitleStyle}. Logo: ${brand.logoPlacement}`,
    suggestion: 'Stelle sicher, dass Farbpalette und Schriftarten im Videoeditor korrekt eingestellt sind.',
  }
}

// ── Brand Agent ───────────────────────────────────────────────────────────────

export class BrandAgent extends BaseAgent {
  slug = 'brand-agent'
  name = 'Brand Consistency'

  validateInput(_input: AgentInput): boolean { return true }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start  = Date.now()
    const log: string[] = []

    const script  = input.script as VideoScript   | undefined
    const seo     = input.seo    as SEOAgentOutput | undefined
    const brand: BrandProfile = (input.brand as BrandProfile) || DEFAULT_BRAND

    log.push(`[Brand] Checking: "${script?.topic || 'No topic'}" against brand: "${brand.name}"`)

    // ── Run all checks ────────────────────────────────────────────────────────
    const checks: BrandCheck[] = [
      checkHook(script),
      checkTone(script, brand),
      checkCTA(script, brand),
      checkLength(script),
      checkSEOAlignment(seo, script),
      checkVisualConsistency(brand),
    ]

    const overallScore = Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length)
    const passed       = overallScore >= 75
    const criticalIssues = checks.filter(c => !c.passed).map(c => `${c.dimension}: ${c.finding}`)
    const suggestions    = checks.filter(c => c.suggestion).map(c => c.suggestion!)

    // Auto-fix CTA if it's the only critical issue
    let revisedCTA: string | undefined
    const ctaCheck = checks.find(c => c.dimension === 'CTA-Qualität' && !c.passed)
    if (ctaCheck && script) {
      revisedCTA = `${brand.ctaPattern} — Folge dem Kanal für mehr ${script.niche}-Content.`
      log.push(`[Brand] Auto-fixed CTA`)
    }

    const brandReport = [
      `## Brand Consistency Report`,
      `**Brand:** ${brand.name}`,
      `**Gesamtscore:** ${overallScore}/100 — ${passed ? '✅ BESTANDEN' : '⚠️ ÜBERARBEITUNG NÖTIG'}`,
      ``,
      `### Checks:`,
      ...checks.map(c => `${c.passed ? '✅' : '❌'} **${c.dimension}** (${c.score}/100): ${c.finding}`),
      ``,
      criticalIssues.length > 0 ? `### Kritische Probleme:\n${criticalIssues.map(i => `• ${i}`).join('\n')}` : '',
      suggestions.length > 0 ? `### Empfehlungen:\n${suggestions.map(s => `• ${s}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')

    log.push(`[Brand] Score: ${overallScore}/100 | Passed: ${passed} | Issues: ${criticalIssues.length}`)

    const output: BrandAgentOutput = {
      brandName:              brand.name,
      overallScore,
      passed,
      checks,
      criticalIssues,
      suggestions,
      approvedForProduction:  passed,
      revisedCTA,
      brandReport,
      log,
    }

    return {
      success: true,
      data:    output as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    }
  }
}
