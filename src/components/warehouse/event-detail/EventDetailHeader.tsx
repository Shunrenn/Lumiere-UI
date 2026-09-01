import { ArrowLeft, Bell } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import type { EventOverallStatus } from '@/lib/event-detail'
import { toneClasses, toneDot, type Tone } from '@/components/warehouse/event-detail/status-tone'

const STATUS_TONE: Record<EventOverallStatus, Tone> = {
  'On Track': 'positive',
  'Attention Needed': 'caution',
  Blocked: 'critical',
}

interface EventDetailHeaderProps {
  event: PortalEvent
  overallStatus: EventOverallStatus
  changedSinceLastView: boolean
  onBack: () => void
  // Opens the "what changed" details modal. Wired to the red-dot indicator
  // and the "Updated by admin" pill.
  onOpenChanges: () => void
}

export function EventDetailHeader({
  event,
  overallStatus,
  changedSinceLastView,
  onBack,
  onOpenChanges,
}: EventDetailHeaderProps) {
  const tone = STATUS_TONE[overallStatus]

  return (
    <header className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to dashboard
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card px-6 py-5">
        <div className="min-w-0">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Event detail</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">{event.title}</h1>
            {changedSinceLastView && (
              <button
                type="button"
                onClick={onOpenChanges}
                className="relative flex size-4 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                aria-label="Event details changed by an admin since your last view — view changes"
                title="View what an admin changed"
              >
                <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-destructive/70" aria-hidden="true" />
                <span className="relative inline-flex size-2.5 rounded-full bg-destructive" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {event.venue} · {event.targetDate}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {changedSinceLastView && (
            <button
              type="button"
              onClick={onOpenChanges}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-destructive/50 hover:text-foreground"
            >
              <Bell className="size-3" aria-hidden="true" />
              Updated by admin
            </button>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] ${toneClasses[tone]}`}
          >
            <span className={`size-1.5 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
            {overallStatus}
          </span>
        </div>
      </div>
    </header>
  )
}
