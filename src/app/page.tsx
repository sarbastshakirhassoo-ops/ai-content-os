import KPICards from '@/components/dashboard/KPICards'
import PipelineTimeline from '@/components/dashboard/PipelineTimeline'
import VideoProjectsTable from '@/components/dashboard/VideoProjectsTable'
import AlertsPanel from '@/components/dashboard/AlertsPanel'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-muted mt-0.5">Autonomous video pipeline — 12 AI agents running 24/7</p>
      </div>

      <KPICards />
      <PipelineTimeline />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <VideoProjectsTable />
        </div>
        <div>
          <AlertsPanel />
        </div>
      </div>
    </div>
  )
}
