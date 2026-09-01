import type { EventReplenishmentSummary } from '@/lib/event-detail'
import { EventDetailSection, SectionButton } from '@/components/warehouse/event-detail/EventDetailSection'

interface ReplenishmentPanelProps {
  summary: EventReplenishmentSummary
  onViewDeficits: () => void
}

export function ReplenishmentPanel({ summary, onViewDeficits }: ReplenishmentPanelProps) {
  return (
    <EventDetailSection title="Replenishment Status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-card-foreground">
          <span className="font-semibold text-primary">{summary.resolved} resolved</span>
          <span className="mx-1.5 text-muted-foreground">·</span>
          <span className="font-semibold text-accent-foreground">{summary.pending} pending</span>
          <span className="mx-1.5 text-muted-foreground">·</span>
          <span className={summary.critical > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
            {summary.critical} critical
          </span>
        </p>
        <SectionButton onClick={onViewDeficits}>View Deficits for This Event</SectionButton>
      </div>
    </EventDetailSection>
  )
}
