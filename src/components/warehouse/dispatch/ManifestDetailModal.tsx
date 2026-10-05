import { X, MapPin, Calendar, Briefcase, Truck, Package, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Manifest {
  id: string
  manifestId: string
  vehicle: string
  event: string
  venue: string
  date: string
  fieldTask: string
  logisticsHandoff: string
  fieldReceiver: string
  status: string
}

interface Props {
  manifest: Manifest | null
  onClose: () => void
}

export function ManifestDetailModal({ manifest, onClose }: Props) {
  if (!manifest) return null

  const statusColor: Record<Manifest['status'], string> = {
    'Pending Verification': 'bg-amber-100 text-amber-700',
    'En Route': 'bg-blue-100 text-blue-700',
    Reconciled: 'bg-emerald-100 text-emerald-700',
  }

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
        <div className="flex items-start justify-between bg-sidebar px-6 py-5 text-sidebar-foreground">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Dispatch Records Detail
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight text-sidebar-primary">
              {manifest.manifestId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-sidebar-foreground/70 transition hover:text-sidebar-primary"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Allocation brief */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-2 rounded-full bg-primary" />
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-primary">
                Auto-Allocated Deployment
              </p>
              <span className={cn('ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]', statusColor[manifest.status])}>
                {manifest.status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Allocated Event
                </p>
                <p className="mt-0.5 font-serif text-lg font-medium text-card-foreground">{manifest.event}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Venue
                    </p>
                    <p className="mt-0.5 text-sm text-card-foreground">{manifest.venue}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Schedule Date
                    </p>
                    <p className="mt-0.5 text-sm text-card-foreground">{manifest.date}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <Briefcase className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Field Task
                    </p>
                    <p className="mt-0.5 text-sm text-card-foreground">{manifest.fieldTask}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fleet & Assets */}
          <div className="border-t border-border pt-6">
            <h3 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Fleet &amp; Asset Manifest
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
                <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Assigned Vehicle
                  </p>
                  <p className="mt-1 text-sm font-medium text-card-foreground">{manifest.vehicle}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
                <Package className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Total Items Staged
                  </p>
                  <p className="mt-1 text-sm font-medium text-card-foreground">15 items · 1,240 lbs total mass</p>
                  <p className="mt-2 text-[0.6rem] text-muted-foreground">
                    All items verified against manifest checksum · GPS telemetry active
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Custody Chain */}
          <div className="border-t border-border pt-6">
            <h3 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Chain of Custody
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
                <User className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Releasing Party (Warehouse)
                  </p>
                  <p className="mt-1 text-sm font-medium text-card-foreground">{manifest.logisticsHandoff}</p>
                  <p className="mt-1 text-[0.6rem] text-muted-foreground">Depot Logistics Officer</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
                <User className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Receiving Party (Field)
                  </p>
                  <p className="mt-1 text-sm font-medium text-card-foreground">{manifest.fieldReceiver}</p>
                  <p className="mt-1 text-[0.6rem] text-muted-foreground">On-Site Lead</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Progress */}
          <div className="border-t border-border pt-6">
            <h3 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Manifest Status Lifecycle
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/40">
                <div className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]', statusColor[manifest.status])}>
                  ● {manifest.status}
                </div>
              </div>
              <p className="text-[0.6rem] text-muted-foreground italic">
                {manifest.status === 'Pending Verification' && 'Awaiting handshake authorization. Review manifest details and approve dispatch authorization to transition to En Route.'}
                {manifest.status === 'En Route' && 'Assets in transit from warehouse to venue. GPS tracking active and real-time custody updates enabled.'}
                {manifest.status === 'Reconciled' && 'Delivery completed and verified. All items received by field lead and reconciled against manifest.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-muted/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-card border border-border px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
