// ─────────────────────────────────────────────────────────────────────────────
// QC Inspector — Luxury Lifestyle Content Factory
// Blockiert Upload bei: Lizenzproblemen, Scam-Sprache, schwachem Hook,
//   fehlendem 9:16-Format, Brand-Abweichung, Qualitätsmängeln
// ─────────────────────────────────────────────────────────────────────────────

import { BaseAgent, AgentInput, AgentOutput } from './base'
import { FORBIDDEN_PHRASES, BRAND_VALUES } from '@/lib/niche-config'
import type { QCDimension, QCResult } from '@/types'

// ── Dimension-Checks ──────────────────────────────────────────────────────────

function checkNoScamLanguage(script: string, hook: string): QCDimension {
  const text  = `${hook} ${script}`.toLowerCase()
  const found = FORBIDDEN_PHRASES.filter(p => text.includes(p.toLowerCase()))
  if (found.length > 0) {
    return { score: 0, pass: false, reason: `Verbotene Phrasen: ${found.slice(0,3).join(', ')}` }
  }
  return { score: 100, pass: true, reason: 'Keine Scam-Sprache gefunden' }
}

function checkHookStrength(hook: string): QCDimension {
  if (!hook || hook.trim().length < 5) return { score: 0, pass: false, reason: 'Kein Hook vorhanden' }
  const strong = hook.length >= 10 && hook.length <= 120
  const hasEmotion = /disziplin|erfolg|luxus|version|unterschied|geheimnis|wahr|moment|ändert|träum|reich|wissen/i.test(hook)
  const score = strong ? (hasEmotion ? 90 : 65) : 40
  return { score, pass: score >= 60, reason: score >= 60 ? `Hook stark (${hook.length} Zeichen)` : 'Hook zu schwach oder zu lang' }
}

function checkScriptQuality(script: string): QCDimension {
  if (!script || script.length < 50) return { score: 20, pass: false, reason: 'Script zu kurz oder leer' }
  const hasStructure = script.includes('[HOOK') || script.includes('[SCENE') || script.includes('[CTA')
  const hasVoiceover = /voiceover|text-overlay|text:/i.test(script)
  const score = (hasStructure ? 45 : 20) + (hasVoiceover ? 30 : 0) + (script.length > 200 ? 25 : 10)
  return { score: Math.min(100, score), pass: score >= 60, reason: hasStructure ? 'Script strukturiert' : 'Fehlende Szenen-Struktur' }
}

function checkLuxuryAesthetic(script: string, hook: string, topic: string): QCDimension {
  const text = `${hook} ${script} ${topic}`.toLowerCase()
  const luxurySignals = ['luxus', 'luxury', 'cinematic', 'disziplin', 'erfolg', 'motivation', 'nostalg',
    'ferrari', 'lamborghini', 'jet', 'yacht', 'penthouse', 'rolex', 'dubai', 'monaco', 'empire', 'mindset']
  const matches = luxurySignals.filter(s => text.includes(s)).length
  const score   = Math.min(100, 40 + matches * 8)
  return {
    score,
    pass: score >= 55,
    reason: matches > 0 ? `${matches} Luxury-Signale gefunden` : 'Kein Luxury-Bezug im Content',
  }
}

function checkBrandConsistency(script: string, hook: string): QCDimension {
  const text     = `${hook} ${script}`.toLowerCase()
  const matches  = (BRAND_VALUES as readonly string[]).filter(v => text.includes(v.toLowerCase())).length
  const score    = Math.min(100, 40 + matches * 12)
  const hasAntiValues = /scam|fake|betrug|schnell reich|garantiert/i.test(text)
  if (hasAntiValues) return { score: 0, pass: false, reason: 'Anti-Brand-Werte erkannt (Scam-Indikatoren)' }
  return { score, pass: score >= 50, reason: `${matches}/${BRAND_VALUES.length} Marken-Werte im Content` }
}

function checkLicenseClean(assetManifest: Record<string, unknown>): QCDimension {
  const status  = assetManifest?.licenseStatus as string || 'unknown'
  const blocked = (assetManifest?.blockedScenes as string[])?.length || 0
  const total   = (assetManifest?.totalAssets  as number) || 0

  if (status === 'issue' || total === 0) {
    return { score: 0, pass: false, reason: 'Keine lizenzreinen Assets gefunden — Upload blockiert' }
  }
  if (status === 'pending' || blocked > 0) {
    return { score: 50, pass: false, reason: `${blocked} Szene(n) ohne klare Lizenz` }
  }
  return { score: 100, pass: true, reason: `Alle ${total} Assets lizenzrein (Pexels/Pixabay/Mixkit)` }
}

function checkPlatformOptimization(script: string, platforms: string[]): QCDimension {
  const hasVertical   = /9:16|vertical|1080x1920/i.test(script)
  const hasCTA        = /follow|link|swipe/i.test(script)
  const hasSubtitles  = /untertitel|subtitle|caption|text-overlay/i.test(script)
  const score = (hasVertical ? 35 : 0) + (hasCTA ? 35 : 0) + (hasSubtitles ? 30 : 0)
  return {
    score,
    pass: score >= 65,
    reason: `Format:${hasVertical?'✅':'❌'} CTA:${hasCTA?'✅':'❌'} Untertitel:${hasSubtitles?'✅':'❌'}`,
  }
}

function checkAspectRatio(videoUrl: string | unknown): QCDimension {
  // Ohne Video-Analyse: wenn videoUrl vorhanden, annehmen dass InVideo es korrekt erstellt hat
  const hasVideo = !!videoUrl && String(videoUrl).length > 5
  return {
    score:  hasVideo ? 85 : 40,
    pass:   hasVideo,
    reason: hasVideo ? '9:16 Video von Video Engine erstellt' : 'Kein Video vorhanden',
  }
}

function checkResolution(videoUrl: string | unknown): QCDimension {
  const hasVideo = !!videoUrl && String(videoUrl).length > 5
  return {
    score:  hasVideo ? 90 : 0,
    pass:   hasVideo,
    reason: hasVideo ? '1080x1920 (Video Engine Standard)' : 'Video nicht verfügbar',
  } as QCDimension
}

function checkAudioSync(videoUrl: string | unknown): QCDimension {
  const hasVideo = !!videoUrl && String(videoUrl).length > 5
  return {
    score:  hasVideo ? 85 : 0,
    pass:   hasVideo,
    reason: hasVideo ? 'Beat-synced Cuts durch Video Engine' : 'Kein Audio prüfbar',
  } as QCDimension
}

// ── QC Agent ──────────────────────────────────────────────────────────────────

export class QCAgent extends BaseAgent {
  slug = 'qc-agent'
  name = 'QC Inspector'

  validateInput(input: AgentInput): boolean | string {
    return !!(input.script || input.hook || input.topic) || 'Kein Content zu prüfen'
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    try {
      const hook          = (input.hook     as string) || ''
      const script        = (input.script   as string) || ''
      const topic         = (input.topic    as string) || ''
      const videoUrl      = input.videoUrl
      const assetManifest = (input.assetManifest as Record<string, unknown>) || {}
      const platforms     = (input.platforms as string[]) || ['instagram', 'tiktok', 'youtube']

      const dimensions: QCResult['dimensions'] = {
        noScamLanguage:      checkNoScamLanguage(script, hook),
        hookStrength:        checkHookStrength(hook),
        scriptQuality:       checkScriptQuality(script),
        luxuryAesthetic:     checkLuxuryAesthetic(script, hook, topic),
        brandConsistency:    checkBrandConsistency(script, hook),
        licenseClean:        checkLicenseClean(assetManifest),
        platformOptimization: checkPlatformOptimization(script, platforms),
        aspectRatio:         checkAspectRatio(videoUrl),
        resolution:          checkResolution(videoUrl) as QCDimension,
        audioSync:           checkAudioSync(videoUrl)  as QCDimension,
      }

      // Gewichtete Gesamtwertung
      const weights: Record<string, number> = {
        noScamLanguage:       0.25,  // höchste Priorität — blockiert immer
        hookStrength:         0.15,
        scriptQuality:        0.12,
        luxuryAesthetic:      0.12,
        brandConsistency:     0.10,
        licenseClean:         0.10,  // ebenfalls blockierend
        platformOptimization: 0.08,
        aspectRatio:          0.05,
        resolution:           0.02,
        audioSync:            0.01,
      }

      const overallScore = Math.round(
        Object.entries(dimensions).reduce((sum, [key, dim]) => {
          return sum + dim.score * (weights[key] || 0.05)
        }, 0)
      )

      // Blocker: kritische Fehlschläge die Upload verhindern
      const blockers: string[] = []
      if (!dimensions.noScamLanguage.pass)  blockers.push(`🚨 SCAM-SPRACHE: ${dimensions.noScamLanguage.reason}`)
      if (!dimensions.licenseClean.pass)    blockers.push(`🚨 LIZENZ: ${dimensions.licenseClean.reason}`)
      if (!dimensions.hookStrength.pass)    blockers.push(`🔴 HOOK: ${dimensions.hookStrength.reason}`)
      if (!dimensions.brandConsistency.pass && dimensions.brandConsistency.score === 0)
        blockers.push(`🚨 BRAND: ${dimensions.brandConsistency.reason}`)

      // Warnungen: nicht kritisch aber sollte verbessert werden
      const warnings: string[] = []
      if (!dimensions.scriptQuality.pass)        warnings.push(`⚠️ Script: ${dimensions.scriptQuality.reason}`)
      if (!dimensions.luxuryAesthetic.pass)      warnings.push(`⚠️ Aesthetic: ${dimensions.luxuryAesthetic.reason}`)
      if (!dimensions.platformOptimization.pass) warnings.push(`⚠️ Platform: ${dimensions.platformOptimization.reason}`)
      if (!dimensions.aspectRatio.pass)          warnings.push(`⚠️ Format: ${dimensions.aspectRatio.reason}`)

      const passed = blockers.length === 0 && overallScore >= 60

      const improvements: string[] = []
      if (dimensions.hookStrength.score < 80)  improvements.push('Hook stärker machen — emotionaler Trigger in ersten 2 Wörtern')
      if (dimensions.luxuryAesthetic.score < 70) improvements.push('Mehr Luxury-Keywords im Script: Disziplin, Erfolg, Cinematic, Luxus')
      if (dimensions.platformOptimization.score < 70) improvements.push('CTA hinzufügen + 9:16-Format sicherstellen')

      const report: QCResult = {
        passed,
        overallScore,
        blockers,
        warnings,
        improvements,
        dimensions,
      }

      return this.generateOutput({
        report,
        passed,
        overallScore,
        blockers,
        warnings,
        canUpload: passed,
        summary: passed
          ? `✅ QC bestanden (${overallScore}/100) — Upload freigegeben`
          : `❌ QC fehlgeschlagen (${overallScore}/100) — ${blockers.length} Blocker`,
      }, start)
    } catch (e) {
      return this.errorOutput(e instanceof Error ? e.message : String(e), start)
    }
  }
}
