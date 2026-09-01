import { useMemo } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import { usePortal } from '@/lib/store'
import { useCrewRows } from '@/lib/warehouse-crew'
import { useDispatchStore } from '@/lib/warehouse-dispatch'
import { cn } from '@/lib/utils'

interface WomInputSummaryModalProps {
  event: PortalEvent | null
  onClose: () => void
  onOpenFullDetail?: (eventId: string) => void
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-bold uppercase tracking-wider text-primary ring-1 ring-border">
      {initials}
    </span>
  )
}

export function WomInputSummaryModal({ event, onClose, onOpenFullDetail }: WomInputSummaryModalProps) {
  const { staff, events } = usePortal()
  const dispatchRecords = useDispatchStore()
  const crewRows = useCrewRows(staff, events)

  if (!event) return null

  // ---- Section A: Event Planner Asset Plan Mock/Derived Status ----
  const hasAllocatedItems = Boolean(event.items && event.items.length > 0)
  const isPlanSettled = hasAllocatedItems && event.status !== 'On Hold' && event.status !== 'Cancelled'

  // ---- Section B: Assigned Crew Mock/Derived Status ----
  const assignedCrewForEvent = useMemo(() => {
    return crewRows.filter(
      (row) => row.allocation && (row.allocation.eventId === event.id || row.allocation.event === event.title),
    )
  }, [crewRows, event])

  const leadCrew = assignedCrewForEvent.find(
    (row) => row.role.includes('Lead') || row.role.includes('Admin') || row.role.includes('Supervisor'),
  )
  const fieldCrew = assignedCrewForEvent.filter((row) => row.staffId !== leadCrew?.staffId)

  // ---- Section C: Dispatch & Logistics Mock/Derived Status ----
  const dispatchBatch = useMemo(() => {
    return dispatchRecords.find(
      (record) => record.event.trim().toLowerCase() === event.title.trim().toLowerCase(),
    )
  }, [dispatchRecords, event])

  // ---- Section D: Executive Registry Metadata ----
  const execRegistry = useMemo(() => {
    return {
      registryRef: event.refId || `REG-2026-${event.id.toUpperCase()}`,
      client: event.client || 'Enterprise Client',
      venue: event.venue || 'TBD Venue',
      targetDate: event.targetDate,
      registeredStatus: event.status,
    }
  }, [event])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[46rem] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-primary">
                WOM Input Summary
              </span>
              <span className="text-[0.65rem] font-semibold text-muted-foreground">{execRegistry.registryRef}</span>
            </div>
            <h2 className="mt-1 font-serif text-2xl font-medium text-card-foreground">{event.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" /> {event.targetDate}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {event.venue}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFullDetail && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenFullDetail(event.id)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
              >
                <ExternalLink className="size-3.5" /> Full Event Detail
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 sm:px-8">
          {/* Section A: Event Planner Asset Plan Status */}
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                  a) Event Planner Asset Plan Status
                </h3>
              </div>
              {isPlanSettled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Plan Settled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Clock className="size-3.5" /> Not Yet Settled
                </span>
              )}
            </div>

            {hasAllocatedItems ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Allocated Decor Items</p>
                  <p className="mt-1 font-serif text-xl font-medium text-foreground">{event.items.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Plan Finalization</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {isPlanSettled ? 'Confirmed by Planner' : 'Draft / Revisions Pending'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Special Custom Fab</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {event.items.some((i) => i.name.toLowerCase().includes('arch') || i.name.toLowerCase().includes('custom'))
                      ? 'Required (In Production)'
                      : 'Standard Stock Catalog'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                <AlertCircle className="mx-auto size-5 text-muted-foreground/60 mb-1" />
                No Event Planner asset plan registered yet for this event.
              </div>
            )}
          </div>

          {/* Section B: Assigned Crew */}
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                  b) Assigned Crew
                </h3>
              </div>
              <span className="text-[0.62rem] font-bold text-muted-foreground">
                {assignedCrewForEvent.length} Member{assignedCrewForEvent.length === 1 ? '' : 's'} Assigned
              </span>
            </div>

            {assignedCrewForEvent.length > 0 ? (
              <div className="mt-4 space-y-3">
                {/* Designated Field Lead */}
                {leadCrew ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={leadCrew.name} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-card-foreground">{leadCrew.name}</p>
                          <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-primary">
                            <UserCheck className="size-2.5" /> Designated Team Lead
                          </span>
                        </div>
                        <p className="text-[0.6rem] text-muted-foreground">{leadCrew.role} · Field Lead</p>
                      </div>
                    </div>
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-primary">
                      {leadCrew.allocation?.task ?? 'Lead Supervisor'}
                    </span>
                  </div>
                ) : null}

                {/* Field Crew Members */}
                {fieldCrew.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {fieldCrew.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2.5"
                      >
                        <Avatar name={member.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-card-foreground truncate">{member.name}</p>
                          <p className="text-[0.58rem] text-muted-foreground truncate">
                            {member.allocation?.task ?? member.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !leadCrew ? (
                  <p className="text-xs text-muted-foreground">No field crew members assigned.</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                <Users className="mx-auto size-5 text-muted-foreground/60 mb-1" />
                No crew assignments finalized for this event yet.
              </div>
            )}
          </div>

          {/* Section C: Dispatch & Logistics Summary */}
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                  c) Dispatch &amp; Logistics Summary
                </h3>
              </div>
              {dispatchBatch ? (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider',
                    dispatchBatch.status === 'In Progress'
                      ? 'bg-accent text-accent-foreground'
                      : dispatchBatch.status === 'Delivered'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {dispatchBatch.status === 'In Progress' ? 'In Transit' : dispatchBatch.status}
                </span>
              ) : (
                <span className="text-[0.62rem] font-bold text-muted-foreground">No Active Batches</span>
              )}
            </div>

            {dispatchBatch ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Driver / Courier</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{dispatchBatch.driver}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Vehicle Allocation</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{dispatchBatch.vehicle}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Manifest Status</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{dispatchBatch.manifestCount} Manifest Line Items</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                <Truck className="mx-auto size-5 text-muted-foreground/60 mb-1" />
                No dispatch batches planned or in-transit for this event yet.
              </div>
            )}
          </div>

          {/* Section D: Executive-registered Event Details */}
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                  d) Executive-registered Event Details
                </h3>
              </div>
              <span className="rounded bg-secondary px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-foreground">
                {execRegistry.registeredStatus}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Registry Reference</p>
                <p className="mt-1 text-xs font-semibold text-foreground truncate">{execRegistry.registryRef}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Client Name</p>
                <p className="mt-1 text-xs font-semibold text-foreground truncate">{execRegistry.client}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Target Date</p>
                <p className="mt-1 text-xs font-semibold text-foreground truncate">{execRegistry.targetDate}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Venue Location</p>
                <p className="mt-1 text-xs font-semibold text-foreground truncate">{execRegistry.venue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-accent"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  )
}
