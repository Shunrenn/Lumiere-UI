import { X, MapPin, Briefcase, Users, Truck, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Deployment {
  id: string
  date: string
  time: string
  deploymentId: string
  event: string
  venue: string
  task: string
  status: 'In Progress' | 'Awaiting Setup' | 'Completed'
  progress: number
  crewLeads: string[]
  staffMembers: string[]
  vehicle: string
}

interface Props {
  deployment: Deployment | null
  onClose: () => void
}

const statusMeta = {
  'In Progress': { color: 'text-amber-700', bg: 'bg-amber-100' },
  'Awaiting Setup': { color: 'text-muted-foreground', bg: 'bg-muted' },
  Completed: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
}

export function DeploymentDetailModal({ deployment, onClose }: Props) {
  if (!deployment) return null

  const meta = statusMeta[deployment.status]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-2xl overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border bg-muted/60 px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Deployment · Event Allocation Brief
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight text-card-foreground">
              {deployment.event}
            </h2>
            <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground">{deployment.deploymentId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground transition hover:text-card-foreground"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-6">
          {/* Status & Progress */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Deployment Status
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em]', meta.bg, meta.color)}>
                    <span className="size-2 rounded-full bg-current" />
                    {deployment.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Completion
                </p>
                <p className="mt-2 font-serif text-3xl font-medium text-card-foreground">{deployment.progress}%</p>
                <div className="mt-2 h-2 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', deployment.status === 'In Progress' ? 'bg-amber-500' : deployment.status === 'Awaiting Setup' ? 'bg-muted-foreground/40' : 'bg-emerald-600')}
                    style={{ width: `${deployment.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Event Allocation */}
          <div className="space-y-4">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Event Allocation
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Venue
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-card-foreground">{deployment.venue}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Schedule
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-card-foreground">
                    {deployment.date} · {deployment.time}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:col-span-2">
                <Briefcase className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Field Task
                  </p>
                  <p className="mt-1.5 text-sm text-card-foreground">{deployment.task}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Crew Assignment */}
          <div className="space-y-4">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Field Crew Assignment
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="size-4 text-primary" />
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Crew Leads
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deployment.crewLeads.map((lead) => (
                    <span key={lead} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-[0.6rem] font-semibold text-primary">
                      {lead}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Support Staff
                </p>
                <div className="flex flex-wrap gap-2">
                  {deployment.staffMembers.length > 0 ? (
                    deployment.staffMembers.map((staff) => (
                      <span key={staff} className="inline-flex items-center rounded-full bg-card border border-border px-3 py-1.5 text-[0.6rem] font-medium text-card-foreground">
                        {staff}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No additional staff assigned.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="size-4 text-primary" />
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Fleet Transit Allocation
              </p>
            </div>
            <p className="text-sm font-medium text-card-foreground">{deployment.vehicle}</p>
          </div>

          {/* Status-specific note */}
          {deployment.status === 'Awaiting Setup' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[0.6rem] text-amber-700">
                This deployment is awaiting site clearance and prep. Crew will receive activation notice once venue is ready for setup operations.
              </p>
            </div>
          )}

          {deployment.status === 'Completed' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
              <AlertCircle className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[0.6rem] text-emerald-700">
                This deployment has been completed successfully. All field tasks and logistics have been finalized and closed out.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
