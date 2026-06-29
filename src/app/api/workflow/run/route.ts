import { NextRequest, NextResponse } from 'next/server'
import { TrendAgent } from '@/agents/trend-agent'
import { CompetitorAgent } from '@/agents/competitor-agent'
import { KnowledgeAgent } from '@/agents/knowledge-agent'
import { ScriptAgent } from '@/agents/script-agent'
import { SEOAgent } from '@/agents/seo-agent'
import { BrandAgent } from '@/agents/brand-agent'
import { AssetManagerAgent } from '@/agents/asset-manager-agent'
import { VideoAgent } from '@/agents/video-agent'
import { QCAgent } from '@/agents/qc-agent'
import { CalendarAgent } from '@/agents/calendar-agent'
import { UploadAgent } from '@/agents/upload-agent'
import { AnalyticsAgent } from '@/agents/analytics-agent'

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 Minuten für kompletten Workflow

// Pipeline: Trend → Competitor → Knowledge → Script → SEO → Brand → Assets → Video → QC → Calendar → Upload → Analytics
// Output des vorherigen Agents wird als Input für den nächsten verwendet

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  // Eingang: Nische + optionales Topic
  const niche = (body.niche as string) || 'Fashion, Lifestyle, Travel, Personal Brand'
  const topic = (body.topic as string) || ''

  const log: string[] = []
  const results: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  // ── Agent 1: Trend Scout ─────────────────────────────────────────────────────
  log.push('[Trend Scout] Starte Trend-Analyse…')
  let trendData: Record<string, unknown> = { niche, topic }
  try {
    const trendAgent = new TrendAgent()
    const trendResult = await trendAgent.run({ niche, topic })
    results['trend-agent'] = trendResult
    trendData = { ...trendData, ...(trendResult.data || {}) }
    log.push(`[Trend Scout] ✅ ${trendResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['trend-agent'] = msg
    log.push(`[Trend Scout] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 2: Competitor Analyst ─────────────────────────────────────────────
  log.push('[Competitor] Starte Competitor-Analyse…')
  let competitorData: Record<string, unknown> = {}
  try {
    const competitorAgent = new CompetitorAgent()
    const competitorResult = await competitorAgent.run({ niche, ...trendData })
    results['competitor-agent'] = competitorResult
    competitorData = competitorResult.data || {}
    log.push(`[Competitor] ✅ ${competitorResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['competitor-agent'] = msg
    log.push(`[Competitor] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 3: Knowledge Base ──────────────────────────────────────────────────
  log.push('[Knowledge] Starte Wissens-Recherche…')
  let knowledgeData: Record<string, unknown> = {}
  try {
    const knowledgeAgent = new KnowledgeAgent()
    const knowledgeResult = await knowledgeAgent.run({ niche, ...trendData, ...competitorData })
    results['knowledge-agent'] = knowledgeResult
    knowledgeData = knowledgeResult.data || {}
    log.push(`[Knowledge] ✅ ${knowledgeResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['knowledge-agent'] = msg
    log.push(`[Knowledge] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 4: Script Writer ───────────────────────────────────────────────────
  log.push('[Script] Erstelle Video-Skript…')
  let scriptData: Record<string, unknown> = { niche }
  try {
    const scriptAgent = new ScriptAgent()
    const scriptInput = {
      niche,
      topic: (trendData.topTrend as string) || topic || 'Lifestyle Motivation',
      trend: trendData,
      competitor: competitorData,
      knowledge: knowledgeData,
    }
    const scriptResult = await scriptAgent.run(scriptInput)
    results['script-agent'] = scriptResult
    scriptData = { niche, ...(scriptResult.data || {}) }
    log.push(`[Script] ✅ ${scriptResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['script-agent'] = msg
    log.push(`[Script] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 5: SEO Optimizer ───────────────────────────────────────────────────
  log.push('[SEO] Optimiere für Plattformen…')
  let seoData: Record<string, unknown> = {}
  try {
    const seoAgent = new SEOAgent()
    const seoResult = await seoAgent.run({ niche, ...scriptData })
    results['seo-agent'] = seoResult
    seoData = seoResult.data || {}
    log.push(`[SEO] ✅ ${seoResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['seo-agent'] = msg
    log.push(`[SEO] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 6: Brand Consistency ───────────────────────────────────────────────
  log.push('[Brand] Prüfe Brand-Konsistenz…')
  let brandData: Record<string, unknown> = {}
  try {
    const brandAgent = new BrandAgent()
    const brandResult = await brandAgent.run({ niche, ...scriptData, ...seoData })
    results['brand-agent'] = brandResult
    brandData = brandResult.data || {}
    log.push(`[Brand] ✅ ${brandResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['brand-agent'] = msg
    log.push(`[Brand] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 7: Asset Manager ───────────────────────────────────────────────────
  log.push('[Assets] Suche Stock-Material…')
  let assetData: Record<string, unknown> = {}
  try {
    const assetAgent = new AssetManagerAgent()
    const assetResult = await assetAgent.run({ niche, ...scriptData })
    results['asset-manager-agent'] = assetResult
    assetData = assetResult.data || {}
    log.push(`[Assets] ✅ ${assetResult.durationMs}ms — ${(assetData.totalAssets as number) || 0} Assets gefunden`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['asset-manager-agent'] = msg
    log.push(`[Assets] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 8: InVideo AI Video ────────────────────────────────────────────────
  log.push('[Video] Erstelle Video mit InVideo AI…')
  let videoData: Record<string, unknown> = {}
  try {
    const videoAgent = new VideoAgent()
    const videoResult = await videoAgent.run({
      niche,
      topic: (scriptData.topic as string) || topic,
      hook: (scriptData.hook as string) || '',
      script: (scriptData.fullScript as string) || (scriptData.script as string) || '',
      assets: assetData.assets,
    })
    results['video-agent'] = videoResult
    videoData = videoResult.data || {}
    log.push(`[Video] ✅ ${videoResult.durationMs}ms — ${(videoData.videoUrl as string) || 'Mock'}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['video-agent'] = msg
    log.push(`[Video] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 9: QC Inspector ────────────────────────────────────────────────────
  log.push('[QC] Qualitätsprüfung…')
  let qcData: Record<string, unknown> = {}
  try {
    const qcAgent = new QCAgent()
    const qcResult = await qcAgent.run({
      niche,
      topic: (scriptData.topic as string) || topic,
      hook: (scriptData.hook as string) || '',
      script: (scriptData.fullScript as string) || '',
      videoUrl: videoData.videoUrl,
      platforms: ['instagram', 'tiktok', 'youtube'],
    })
    results['qc-agent'] = qcResult
    qcData = qcResult.data || {}
    log.push(`[QC] ✅ Score: ${(qcData.report as { overallScore?: number })?.overallScore || '?'}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['qc-agent'] = msg
    log.push(`[QC] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 10: Content Calendar ───────────────────────────────────────────────
  log.push('[Calendar] Plant Upload-Zeitpunkt…')
  let calendarData: Record<string, unknown> = {}
  try {
    const calendarAgent = new CalendarAgent()
    const calendarResult = await calendarAgent.run({ niche, ...scriptData, qcScore: (qcData.report as { overallScore?: number })?.overallScore })
    results['calendar-agent'] = calendarResult
    calendarData = calendarResult.data || {}
    log.push(`[Calendar] ✅ ${calendarResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['calendar-agent'] = msg
    log.push(`[Calendar] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 11: Upload Agent ───────────────────────────────────────────────────
  log.push('[Upload] Bereite Upload vor…')
  let uploadData: Record<string, unknown> = {}
  try {
    const uploadAgent = new UploadAgent()
    const uploadResult = await uploadAgent.run({
      niche,
      videoUrl: videoData.videoUrl,
      title: (scriptData.topic as string) || topic,
      description: (seoData.description as string) || '',
      hashtags: (seoData.hashtags as string[]) || (scriptData.hashtags as string[]) || [],
      scheduledTime: calendarData.scheduledTime,
      platforms: ['instagram', 'tiktok', 'youtube'],
    })
    results['upload-agent'] = uploadResult
    uploadData = uploadResult.data || {}
    log.push(`[Upload] ✅ ${uploadResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['upload-agent'] = msg
    log.push(`[Upload] ⚠️ Fehler: ${msg}`)
  }

  // ── Agent 12: Analytics ──────────────────────────────────────────────────────
  log.push('[Analytics] Analysiere Performance-Daten…')
  try {
    const analyticsAgent = new AnalyticsAgent()
    const analyticsResult = await analyticsAgent.run({ niche, ...uploadData })
    results['analytics-agent'] = analyticsResult
    log.push(`[Analytics] ✅ ${analyticsResult.durationMs}ms`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors['analytics-agent'] = msg
    log.push(`[Analytics] ⚠️ Fehler: ${msg}`)
  }

  // ── Zusammenfassung ──────────────────────────────────────────────────────────
  const agentCount = Object.keys(results).length
  const errorCount = Object.keys(errors).length
  log.push(`\n📊 Pipeline abgeschlossen: ${agentCount}/12 Agents erfolgreich, ${errorCount} Fehler`)

  return NextResponse.json({
    ok: true,
    log,
    results,
    errors,
    summary: {
      agentsRun: agentCount,
      agentsFailed: errorCount,
      videoUrl: videoData.videoUrl || null,
      qcScore: (qcData.report as { overallScore?: number })?.overallScore || null,
      qcPassed: (qcData.report as { passed?: boolean })?.passed || false,
    },
  })
}
