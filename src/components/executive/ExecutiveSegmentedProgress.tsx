import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Calendar, PackageCheck, Layers } from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { EventStatus } from '@/lib/types'

// Event Progress Track Phases (Ends at Egress)
export const EVENT_PROGRESS_STAGES = [
  { id: 'initialization', label: 'Initialization', short: 'Init', color: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-500' },
  { id: 'production', label: 'In Production', short: 'Prod', color: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500' },
  { id: 'installation', label: 'Installation', short: 'Install', color: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500' },
  { id: 'egress', label: 'Egress Completed', short: 'Egress', color: 'bg-green-500', border: 'border-green-500', text: 'text-green-500' },
]

// Asset Settlement Progress Track Phases (Ends at Warehouse Check-In)
export const ASSET_SETTLEMENT_STAGES = [
  { id: 'return', label: 'Post-Event Return', short: 'Return', color: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-500' },
  { id: 'audit', label: 'Custody & Verification Audit', short: 'Audit', color: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500' },
  { id: 'restock', label: 'Maintenance & Restock', short: 'Restock', color: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500' },
  { id: 'checkin', label: 'Warehouse Check-In', short: 'Checked In', color: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-500' },
]

// Derive stage indices for Event Progress Track
function getEventStageIndex(status: EventStatus): number {
  switch (status) {
    case 'Initialized':
      return 0
    case 'In Production':
    case 'Reserved':
      return 1
    case 'On Hold':
      return 2
    case 'Completed':
    case 'Settled':
      return 3
    default:
      return 0
  }
}

// Derive stage indices for Asset Settlement Progress Track
function getSettlementStageIndex(status: EventStatus): number {
  switch (status) {
    case 'Initialized':
    case 'In Production':
    case 'Reserved':
      return 0 // Pending post-event return
    case 'Completed':
      return 1 // Under verification audit
    case 'On Hold':
      return 2 // Maintenance / restock hold
    case 'Settled':
      return 3 // Fully checked into warehouse
    default:
      return 0
  }
}

interface ExecutiveSegmentedProgressProps {
  onBack?: () => void
}

export function ExecutiveSegmentedProgress({ onBack }: ExecutiveSegmentedProgressProps) {
  const { events } = usePortal()
  const { navigate } = useNav()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const activeEvents = events.filter((e) => e.status !== 'Cancelled')
  const selectedEvent = activeEvents.find((e) => e.id === selectedEventId) || activeEvents[0]

  const handleBack = () => {
    if (onBack) onBack()
    else navigate('dashboard')
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header + Back Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Executive Dashboard
          </button>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Segmented Operational Progress
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Two-track discrete chunked milestone tracking: Event Lifecycle (to Egress) and Asset Settlement (to Warehouse Check-In).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Layers className="size-3.5" /> Dual-Track Monitoring
          </span>
        </div>
      </div>

      {/* Main Content: Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Event Selector Roster */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Active Portfolios ({activeEvents.length})
          </h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {activeEvents.map((evt) => {
              const eventStage = getEventStageIndex(evt.status)
              const isSelected = selectedEvent?.id === evt.id

              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEventId(evt.id)}
                  className={cn(
                    'w-full text-left rounded-xl border p-4 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif font-medium text-sm text-foreground line-clamp-1">
                      {evt.title}
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold text-muted-foreground">
                      {evt.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{evt.venue || 'Peninsula Manila'}</p>

                  {/* Micro chunk indicators */}
                  <div className="mt-3 grid grid-cols-4 gap-1">
                    {EVENT_PROGRESS_STAGES.map((stg, idx) => (
                      <div
                        key={stg.id}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          idx <= eventStage ? stg.color : 'bg-muted/60',
                        )}
                      />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Detailed Dual-Track Breakdown for Selected Event */}
        {selectedEvent ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Event Summary Box */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
                <div>
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
                    Selected Portfolio · {selectedEvent.refId || selectedEvent.id}
                  </span>
                  <h2 className="font-serif text-2xl font-medium text-foreground mt-0.5">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Client: <strong className="text-foreground">{selectedEvent.client}</strong> · Venue: <strong className="text-foreground">{selectedEvent.venue}</strong>
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> {selectedEvent.status}
                  </span>
                </div>
              </div>

              {/* TRACK 1: EVENT PROGRESS TRACK (To Egress) */}
              <div className="mt-6 rounded-xl border border-border bg-background/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                      Track 1: Event Progress Track
                    </h3>
                  </div>
                  <span className="text-[0.65rem] font-semibold text-muted-foreground">
                    Ends at Egress Completion
                  </span>
                </div>

                {/* Chunked Segment Bar */}
                <div className="grid grid-cols-4 gap-2">
                  {EVENT_PROGRESS_STAGES.map((stage, idx) => {
                    const currentEventStage = getEventStageIndex(selectedEvent.status)
                    const isPassed = idx < currentEventStage
                    const isCurrent = idx === currentEventStage

                    return (
                      <div key={stage.id} className="space-y-2">
                        <div
                          className={cn(
                            'h-3 rounded-md transition-all',
                            isPassed || isCurrent ? stage.color : 'bg-muted/50',
                            isCurrent && 'ring-2 ring-foreground/20 ring-offset-1',
                          )}
                        />
                        <div className="text-center">
                          <p className={cn('text-xs font-semibold', isCurrent ? stage.text : 'text-muted-foreground')}>
                            {stage.label}
                          </p>
                          <p className="text-[0.6rem] text-muted-foreground">
                            {isPassed ? 'Completed' : isCurrent ? 'Active Phase' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* TRACK 2: ASSET SETTLEMENT PROGRESS TRACK (To Warehouse Check-In) */}
              <div className="mt-6 rounded-xl border border-border bg-background/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="size-4 text-cyan-500" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                      Track 2: Asset Settlement Progress Track
                    </h3>
                  </div>
                  <span className="text-[0.65rem] font-semibold text-muted-foreground">
                    Ends at Full Warehouse Check-In
                  </span>
                </div>

                {/* Chunked Segment Bar */}
                <div className="grid grid-cols-4 gap-2">
                  {ASSET_SETTLEMENT_STAGES.map((stage, idx) => {
                    const currentSettlementStage = getSettlementStageIndex(selectedEvent.status)
                    const isPassed = idx < currentSettlementStage
                    const isCurrent = idx === currentSettlementStage

                    return (
                      <div key={stage.id} className="space-y-2">
                        <div
                          className={cn(
                            'h-3 rounded-md transition-all',
                            isPassed || isCurrent ? stage.color : 'bg-muted/50',
                            isCurrent && 'ring-2 ring-foreground/20 ring-offset-1',
                          )}
                        />
                        <div className="text-center">
                          <p className={cn('text-xs font-semibold', isCurrent ? stage.text : 'text-muted-foreground')}>
                            {stage.label}
                          </p>
                          <p className="text-[0.6rem] text-muted-foreground">
                            {isPassed ? 'Passed' : isCurrent ? 'Active Audit' : 'Queued'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center p-12 text-muted-foreground">
            No active portfolio selected.
          </div>
        )}
      </div>
    </div>
  )
}
