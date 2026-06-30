// ─────────────────────────────────────────────────────────────────────────────
// Workflow Engine — vollautomatische 14-Agent Pipeline
// Job-basiert: jeder Schritt wird in jobs.json persistiert
// Fehler isoliert: ein fehlender Agent stoppt nicht die Pipeline
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import {
  createJob, updateJob, updateJobStep, appendStepLog,
  completeJob, failJob, PIPELINE_AGENTS,
} from '@/lib/job-store'
import { NICHE } from '@/lib/niche-config'

import { TrendAgent }        from '@/agents/trend-agent'
import { CompetitorAgent }   from '@/agents/competitor-agent'
import { KnowledgeAgent }    from '@/agents/knowledge-agent'
import { ScriptAgent }       from '@/agents/script-agent'
import { SEOAgent }          from '@/agents/seo-agent'
import { BrandAgent }        from '@/agents/brand-agent'
import { AssetManagerAgent } from '@/agents/asset-manager-agent'
import { VideoAgent }        from '@/agents/video-agent'
import { QCAgent }           from '@/agents/qc-agent'
import { CalendarAgent }     from '@/agents/calendar-agent'
import { UploadAgent }       from '@/agents/upload-agent'
import { AnalyticsAgent }    from '@/agents/analytics-agent'
import { EngagementAgent }   from '@/agents/engagement-agent'
import { LearningAgent }     from '@/agents/learning-agent'

export const dynamic     = 'force-dynamic'
export const maxDuration = 600

const MAX_RETRIES = 2
const RETRY_DELAY = 1500

async function runWithRetry(
  jobId: string,
  stepIndex: number,
  fn: () => Promise<Record<string, unknown>>,
): Promise<{ ok: boolean; data: Record<string, unknown>; error?: string }> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        appendStepLog(jobId, stepIndex, `Retry #${attempt}…`)
        updateJobStep(jobId, stepIndex, { status: 'retrying', retryCount: attempt })
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt))
      }
      const data = await fn()
      return { ok: true, data }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      appendStepLog(jobId, stepIndex, `Fehler (attempt ${attempt + 1}): ${msg}`)
      if (attempt === MAX_RETRIES) return { ok: false, data: {}, error: msg }
    }
  }
  return { ok: false, data: {}, error: 'Max retries exceeded' }
}

async function runStep(
  jobId: string,
  stepIndex: number,
  agentName: string,
  fn: () => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  updateJobStep(jobId, stepIndex, { status: 'running', startedAt: new Date().toISOString() })
  appendStepLog(jobId, stepIndex, `${agentName} gestartet`)

  const start  = Date.now()
  const result = await runWithRetry(jobId, stepIndex, fn)
  const ms     = Date.now() - start

  updateJobStep(jobId, stepIndex, {
    status:      result.ok ? 'completed' : 'failed',
    completedAt: new Date().toISOString(),
    durationMs:  ms,
    output:      result.ok ? result.data : undefined,
    error:       result.error,
  })
  appendStepLog(jobId, stepIndex,
    result.ok
      ? `✅ ${agentName} fertig (${ms}ms)`
      : `❌ ${agentName} fehlgeschlagen: ${result.error}`,
  )
  return result.data
}

export async function POST(req: NextRequest) {
  const body        = await req.json().catch(() => ({}))
  const jobId       = body.jobId as string | undefined
  const niche       = (body.niche       as string) || NICHE
  const topic       = (body.topic       as string) || ''
  const triggeredBy = (body.triggeredBy as 'manual' | 'scheduled' | 'auto') || 'manual'

  // Use existing job if jobId provided, otherwise create new one
  let job = jobId ? (await import('@/lib/job-store').then(m => m.getJob(jobId))) ?? null : null
  if (!job) job = createJob({ niche, topic, triggeredBy })
  updateJob(job.id, { status: 'running', startedAt: new Date().toISOString() })

  const ctx: Record<string, unknown> = { niche, topic }

  try {
    // Step 0 — Trend Scout
    const trendData = await runStep(job.id, 0, PIPELINE_AGENTS[0].name, async () => {
      const r = await new TrendAgent().run({ niche, topic }); return r.data || {}
    })
    Object.assign(ctx, trendData)

    // Step 1 — Competitor Analyst
    const competitorData = await runStep(job.id, 1, PIPELINE_AGENTS[1].name, async () => {
      const r = await new CompetitorAgent().run({ niche, ...ctx }); return r.data || {}
    })
    Object.assign(ctx, competitorData)

    // Step 2 — Knowledge Base
    const knowledgeData = await runStep(job.id, 2, PIPELINE_AGENTS[2].name, async () => {
      const r = await new KnowledgeAgent().run({ niche, topic: (ctx.topTrend as string) || topic, ...ctx })
      return r.data || {}
    })
    Object.assign(ctx, knowledgeData)

    // Step 3 — Script Writer
    const scriptData = await runStep(job.id, 3, PIPELINE_AGENTS[3].name, async () => {
      const r = await new ScriptAgent().run({
        niche,
        topic:      (ctx.topTrend as string) || topic || 'Luxury Lifestyle Motivation',
        trend:      trendData,
        competitor: competitorData,
        knowledge:  knowledgeData,
      })
      return r.data || {}
    })
    Object.assign(ctx, scriptData)

    // Step 4 — SEO Optimizer
    const seoData = await runStep(job.id, 4, PIPELINE_AGENTS[4].name, async () => {
      const r = await new SEOAgent().run({ niche, ...scriptData }); return r.data || {}
    })
    Object.assign(ctx, seoData)

    // Step 5 — Brand Consistency
    const brandData = await runStep(job.id, 5, PIPELINE_AGENTS[5].name, async () => {
      const r = await new BrandAgent().run({ niche, ...scriptData, ...seoData }); return r.data || {}
    })
    Object.assign(ctx, brandData)

    // Step 6 — Asset Manager
    const assetData = await runStep(job.id, 6, PIPELINE_AGENTS[6].name, async () => {
      const r = await new AssetManagerAgent().run({
        niche,
        topic:         (scriptData.topic     as string) || topic,
        hook:          (scriptData.hook       as string) || '',
        script:        (scriptData.fullScript as string) || (scriptData.script as string) || '',
        sceneKeywords: (scriptData.sceneKeywords as string[]) || [],
      })
      return r.data || {}
    })
    Object.assign(ctx, assetData)

    // Step 7 — InVideo AI
    const videoData = await runStep(job.id, 7, PIPELINE_AGENTS[7].name, async () => {
      const r = await new VideoAgent().run({
        niche,
        topic:         (scriptData.topic      as string) || topic,
        hook:          (scriptData.hook        as string) || '',
        script:        (scriptData.fullScript  as string) || (scriptData.script as string) || '',
        musicStyle:    (scriptData.musicStyle  as string) || 'Cinematic Orchestral',
        colorGrade:    'dark luxury teal-orange',
        assets:        assetData.scenes || assetData.assets,
        assetManifest: assetData,
      })
      return r.data || {}
    })
    Object.assign(ctx, videoData)

    // Step 8 — QC Inspector
    const qcData = await runStep(job.id, 8, PIPELINE_AGENTS[8].name, async () => {
      const r = await new QCAgent().run({
        niche,
        topic:         (scriptData.topic     as string) || topic,
        hook:          (scriptData.hook       as string) || '',
        script:        (scriptData.fullScript as string) || '',
        videoUrl:      videoData.videoUrl,
        assetManifest: assetData,
        platforms:     ['instagram', 'tiktok', 'youtube'],
      })
      return r.data || {}
    })
    Object.assign(ctx, qcData)

    const qcReport = (qcData.report || qcData) as { overallScore?: number; passed?: boolean }
    const qcScore  = (qcReport?.overallScore ?? 0) as number
    const qcPassed = (qcReport?.passed ?? false)   as boolean

    // Step 9 — Content Calendar (blockiert wenn QC failed)
    const calendarData = await runStep(job.id, 9, PIPELINE_AGENTS[9].name, async () => {
      if (!qcPassed) {
        updateJobStep(job.id, 9, { status: 'blocked' })
        return { skipped: true, reason: `QC Score ${qcScore} — Upload blockiert` }
      }
      const r = await new CalendarAgent().run({ niche, topic: scriptData.topic as string || topic, platforms: ['instagram','tiktok','youtube'], qcScore })
      return r.data || {}
    })
    Object.assign(ctx, calendarData)

    // Step 10 — Upload Bot (blockiert wenn QC failed)
    const uploadData = await runStep(job.id, 10, PIPELINE_AGENTS[10].name, async () => {
      if (!qcPassed) {
        updateJobStep(job.id, 10, { status: 'blocked' })
        return { skipped: true, reason: 'Kein Upload ohne QC-Freigabe' }
      }
      const r = await new UploadAgent().run({
        niche,
        videoPath:     (videoData.outputPath as string) || undefined,
        videoUrl:      (videoData.videoUrl   as string) || undefined,
        title:         (seoData.youtubeTitle      as string) || (scriptData.topic as string) || topic,
        description:   (seoData.description       as string) || '',
        tags:          (seoData.hashtags           as string[]) || [],
        tiktokCaption: (seoData.tiktokCaption      as string) || '',
        igCaption:     (seoData.instagramCaption   as string) || '',
        scheduledTime: calendarData.scheduledTime,
        platforms:     ['instagram', 'tiktok', 'youtube'],
      })
      return r.data || {}
    })
    Object.assign(ctx, uploadData)

    // Step 11 — Analytics Brain
    const analyticsData = await runStep(job.id, 11, PIPELINE_AGENTS[11].name, async () => {
      const r = await new AnalyticsAgent().run({ niche, ...uploadData }); return r.data || {}
    })
    Object.assign(ctx, analyticsData)

    // Step 12 — Engagement Analyzer
    const engagementData = await runStep(job.id, 12, PIPELINE_AGENTS[12].name, async () => {
      const r = await new EngagementAgent().run({ niche, ...uploadData, ...analyticsData }); return r.data || {}
    })
    Object.assign(ctx, engagementData)

    // Step 13 — Learning Agent
    await runStep(job.id, 13, PIPELINE_AGENTS[13].name, async () => {
      const r = await new LearningAgent().run({ niche, scriptData, seoData, assetData, qcData, analyticsData, engagementData, qcScore, qcPassed })
      return r.data || {}
    })

    // Job abschließen
    const urls = uploadData as { youtubeUrl?: string; instagramUrl?: string; tiktokUrl?: string }
    completeJob(job.id, {
      videoUrl:   videoData.videoUrl as string | undefined,
      qcScore, qcPassed,
      uploadUrls: { youtube: urls.youtubeUrl, instagram: urls.instagramUrl, tiktok: urls.tiktokUrl },
    })

    // Video in videos.json speichern
    try {
      const fs   = await import('fs')
      const path = await import('path')
      const vPath = path.join(process.cwd(), 'data', 'videos.json')
      const existing = fs.existsSync(vPath) ? JSON.parse(fs.readFileSync(vPath, 'utf-8')) : []
      const newVideo = {
        id: `v_${Date.now()}`, jobId: job.id,
        title: (seoData.youtubeTitle as string) || (scriptData.topic as string) || topic,
        topic: (scriptData.topic as string) || topic,
        niche,
        hook:        (scriptData.hook        as string) || '',
        script:      (scriptData.fullScript  as string) || '',
        platforms:   ['instagram', 'tiktok', 'youtube'],
        status:      qcPassed ? 'uploaded' : 'qc-failed',
        qcScore, qcPassed,
        uploadStatus: qcPassed ? 'complete' : 'blocked',
        youtubeUrl:   urls.youtubeUrl || null,
        instagramUrl: urls.instagramUrl || null,
        tiktokUrl:    urls.tiktokUrl || null,
        views: 0, likes: 0, comments: 0, shares: 0, saves: 0,
        watchtime: 0, retention: 0,
        assetSources:  (assetData.sources      as string[]) || [],
        licenseStatus: (assetData.licenseStatus as string)  || 'pending',
        createdAt: new Date().toISOString(),
      }
      fs.writeFileSync(vPath, JSON.stringify([newVideo, ...existing].slice(0, 100), null, 2))
    } catch { /* nicht kritisch */ }

    return NextResponse.json({
      ok: true, jobId: job.id, status: 'completed',
      qcScore, qcPassed,
      videoUrl: videoData.videoUrl || null,
      uploadUrls: urls,
      stepsCompleted: 14,
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    failJob(job.id, msg)
    return NextResponse.json({ ok: false, jobId: job.id, error: msg }, { status: 500 })
  }
}
