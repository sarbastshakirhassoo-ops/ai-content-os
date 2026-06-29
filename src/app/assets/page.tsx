import { Badge } from '@/components/ui/Badge'

const ASSET_SOURCES = [
  { name: 'Pexels', type: 'Video', license: 'Free Commercial', status: 'active', quota: '87%' },
  { name: 'Pixabay', type: 'Video + Images', license: 'Free Commercial', status: 'active', quota: '23%' },
  { name: 'Unsplash', type: 'Images', license: 'Free Commercial', status: 'active', quota: '41%' },
  { name: 'Freesound', type: 'Audio', license: 'CC Attribution', status: 'active', quota: '12%' },
]

const PLANNED_ASSETS = [
  { project: 'AI Replacing Jobs', scene: 'Scene 1', term: 'corporate office workers desk', source: 'Pexels', type: 'Video', risk: 'low' },
  { project: 'AI Replacing Jobs', scene: 'Scene 2', term: 'artificial intelligence hologram', source: 'Pixabay', type: 'Video', risk: 'low' },
  { project: 'AI Replacing Jobs', scene: 'Scene 3', term: 'data chart visualization', source: 'Unsplash', type: 'Image', risk: 'low' },
  { project: '$0 to $10K Blueprint', scene: 'Scene 1', term: 'laptop income online business', source: 'Pexels', type: 'Video', risk: 'low' },
  { project: '$0 to $10K Blueprint', scene: 'Scene 2', term: 'social media phone scrolling', source: 'Pexels', type: 'Video', risk: 'low' },
  { project: 'Morning Brain Lies', scene: 'Scene 1', term: 'brain neurons science', source: 'Pixabay', type: 'Video', risk: 'low' },
  { project: 'Morning Brain Lies', scene: 'Scene 2', term: 'morning routine alarm clock', source: 'Pexels', type: 'Video', risk: 'low' },
]

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Asset Library</h1>
        <p className="text-sm text-muted mt-0.5">Automated asset sourcing with copyright verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ASSET_SOURCES.map((source) => (
          <div key={source.name} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{source.name}</h3>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="text-xs text-muted mb-1">{source.type}</div>
            <div className="text-xs text-muted mb-3">{source.license}</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Rate limit</span>
                <span className={`font-medium ${parseInt(source.quota) > 80 ? 'text-warning' : 'text-success'}`}>{source.quota}</span>
              </div>
              <div className="w-full bg-surface rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${parseInt(source.quota) > 80 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: source.quota }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-white">Planned Assets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Project', 'Scene', 'Search Term', 'Source', 'Type', 'Copyright Risk'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANNED_ASSETS.map((asset, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-white font-medium">{asset.project}</td>
                  <td className="px-4 py-3 text-xs text-muted">{asset.scene}</td>
                  <td className="px-4 py-3 text-xs text-slate-300 font-mono">{asset.term}</td>
                  <td className="px-4 py-3 text-xs text-muted">{asset.source}</td>
                  <td className="px-4 py-3"><Badge variant="muted">{asset.type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="success">{asset.risk}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
