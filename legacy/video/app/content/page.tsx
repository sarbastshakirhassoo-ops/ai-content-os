// @ts-nocheck
import { DEMO_VIDEOS } from '@/lib/demo-data'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { formatNumber, timeAgo } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'danger',
  instagram: 'accent',
  tiktok: 'info',
}

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Video Projects</h1>
          <p className="text-sm text-muted mt-0.5">{DEMO_VIDEOS.length} projects in pipeline</p>
        </div>
        <button className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors">
          + New Project
        </button>
      </div>

      <div className="space-y-4">
        {DEMO_VIDEOS.map((video) => (
          <div key={video.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <StatusBadge status={video.status} />
                  {video.platforms.map((p) => (
                    <Badge key={p} variant={(PLATFORM_COLORS[p] as 'danger' | 'accent' | 'info') || 'muted'}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Badge>
                  ))}
                </div>
                <h2 className="text-base font-semibold text-white leading-snug mb-1">{video.title}</h2>
                <p className="text-xs text-muted mb-3">{video.topic} · {timeAgo(video.createdAt)}</p>

                {video.hook && (
                  <div className="bg-surface rounded-lg px-4 py-3 mb-3 border border-border/50">
                    <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wide">Hook</div>
                    <p className="text-sm text-slate-200 italic">&ldquo;{video.hook}&rdquo;</p>
                  </div>
                )}
              </div>

              {video.views > 0 && (
                <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                  <div className="bg-surface rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white">{formatNumber(video.views)}</div>
                    <div className="text-xs text-muted">Views</div>
                  </div>
                  <div className="bg-surface rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-success">{video.retention}%</div>
                    <div className="text-xs text-muted">Retention</div>
                  </div>
                  <div className="bg-surface rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-info">{formatNumber(video.likes)}</div>
                    <div className="text-xs text-muted">Likes</div>
                  </div>
                  <div className="bg-surface rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-accent-hover">{formatNumber(video.comments)}</div>
                    <div className="text-xs text-muted">Comments</div>
                  </div>
                </div>
              )}
            </div>

            {video.qcScore !== undefined && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">QC Score</span>
                  <span className={`text-sm font-bold ${video.qcScore >= 85 ? 'text-success' : 'text-warning'}`}>
                    {video.qcScore}%
                  </span>
                  {video.qcPassed && <Badge variant="success">Passed</Badge>}
                </div>
                {video.youtubeUrl && (
                  <div className="flex items-center gap-3 ml-auto">
                    {video.youtubeUrl && <span className="text-xs text-danger">▶ YouTube</span>}
                    {video.instagramUrl && <span className="text-xs text-accent-hover">◈ Instagram</span>}
                    {video.tiktokUrl && <span className="text-xs text-info">♪ TikTok</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
