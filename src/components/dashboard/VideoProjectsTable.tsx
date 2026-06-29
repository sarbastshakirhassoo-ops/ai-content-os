import { DEMO_VIDEOS } from '@/lib/demo-data'
import { StatusBadge } from '@/components/ui/Badge'
import { formatNumber, timeAgo } from '@/lib/utils'

export default function VideoProjectsTable() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Recent Video Projects</h2>
        <a href="/content" className="text-xs text-accent hover:text-accent-hover">View all →</a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Title</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Status</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">QC</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Views</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Retention</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_VIDEOS.map((video) => (
              <tr key={video.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-white font-medium text-xs leading-snug max-w-xs truncate">{video.title}</div>
                  <div className="text-muted text-xs mt-0.5">{video.topic}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={video.status} />
                </td>
                <td className="px-4 py-3">
                  {video.qcScore ? (
                    <span className={`text-xs font-bold ${video.qcScore >= 85 ? 'text-success' : video.qcScore >= 70 ? 'text-warning' : 'text-danger'}`}>
                      {video.qcScore}%
                    </span>
                  ) : (
                    <span className="text-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-white text-xs font-medium">{video.views > 0 ? formatNumber(video.views) : '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${video.retention >= 60 ? 'text-success' : video.retention > 0 ? 'text-warning' : 'text-muted'}`}>
                    {video.retention > 0 ? `${video.retention}%` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-muted text-xs">{timeAgo(video.createdAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
