import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/types'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'accent'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success border-success/25',
  warning: 'bg-warning/15 text-warning border-warning/25',
  danger: 'bg-danger/15 text-danger border-danger/25',
  info: 'bg-info/15 text-info border-info/25',
  muted: 'bg-muted/15 text-muted border-muted/25',
  accent: 'bg-accent/15 text-accent-hover border-accent/25',
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  idle: { variant: 'muted', label: 'Idle' },
  running: { variant: 'info', label: 'Running' },
  success: { variant: 'success', label: 'Success' },
  error: { variant: 'danger', label: 'Error' },
  waiting: { variant: 'warning', label: 'Waiting' },
  pending: { variant: 'muted', label: 'Pending' },
  scripting: { variant: 'accent', label: 'Scripting' },
  rendering: { variant: 'info', label: 'Rendering' },
  uploaded: { variant: 'success', label: 'Uploaded' },
  complete: { variant: 'success', label: 'Complete' },
  failed: { variant: 'danger', label: 'Failed' },
}

export function StatusBadge({ status }: { status: string }) {
  const map = statusMap[status] || { variant: 'muted' as BadgeVariant, label: status }
  return (
    <Badge variant={map.variant}>
      {map.variant === 'info' && <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-info animate-pulse"></span>}
      {map.label}
    </Badge>
  )
}
