import { NextResponse } from 'next/server'
import { getJobStats, getRecentJobs } from '@/lib/job-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = getJobStats()
    const jobs  = getRecentJobs(50)

    const completedWithQC = jobs.filter(j => j.status === 'completed' && j.qcScore !== undefined)
    const avgQcScore = completedWithQC.length > 0
      ? Math.round(completedWithQC.reduce((s, j) => s + (j.qcScore||0), 0) / completedWithQC.length)
      : 0

    const uploadedJobs = jobs.filter(j => j.uploadUrls && (j.uploadUrls.youtube || j.uploadUrls.instagram || j.uploadUrls.tiktok))
    const platformCounts = { youtube: 0, instagram: 0, tiktok: 0 }
    uploadedJobs.forEach(j => {
      if (j.uploadUrls?.youtube)   platformCounts.youtube++
      if (j.uploadUrls?.instagram) platformCounts.instagram++
      if (j.uploadUrls?.tiktok)    platformCounts.tiktok++
    })
    const bestPlatform = Object.entries(platformCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—'

    const kpi = {
      totalJobs:        stats.total,
      runningJobs:      stats.running,
      queuedJobs:       stats.queued,
      successfulUploads: uploadedJobs.length,
      failedUploads:    stats.failed,
      avgQcScore,
      bestPlatform,
      videosToday:      jobs.filter(j => {
        const d = new Date(j.createdAt)
        const now = new Date()
        return d.toDateString() === now.toDateString()
      }).length,
      activeAgents:     stats.running,
      avgWatchtime:     0,
      totalViews:       0,
    }

    return NextResponse.json({ kpi, stats, ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e), ok: false }, { status: 500 })
  }
}
