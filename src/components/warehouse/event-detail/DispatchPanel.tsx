import { ArrowDown, ArrowUp } from 'lucide-react'
import type { DispatchBannerState, DispatchBatch } from '@/lib/event-detail'
import { EventDetailSection, SectionButton } from '@/components/warehouse/event-detail/EventDetailSection'
import { StateBanner } from '@/components/warehouse/event-detail/StateBanner'
import { DispatchStepper } from '@/components/warehouse/event-detail/DispatchStepper'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'

const BANNER_TONE: Record<DispatchBannerState, Tone> = {
  'No Dispatch Yet': 'neutral',
  'Dispatch In Progress': 'progress',
  'Delayed Dispatch': 'caution',
  'Stalled In Transit — Needs Attention': 'critical',
}

interface DispatchPanelProps {
  banner: DispatchBannerState
  batches: DispatchBatch[]
  onNewBatch: () => void
  onOpenBatch: (batchId: string) => void
}

export function DispatchPanel({ banner, batches, onNewBatch, onOpenBatch }: DispatchPanelProps) {
  return (
    <EventDetailSection
      title="Logistics / Dispatch"
      action={<SectionButton onClick={onNewBatch}>+ New Batch</SectionButton>}
    >
      <div className="flex flex-col gap-4">
        <StateBanner label={banner} tone={BANNER_TONE[banner]} />

        {batches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center text-sm text-muted-foreground">
            No dispatch batches created for this event yet.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {batches.map((batch) => (
              <li key={batch.id}>
                <button
                  type="button"
                  onClick={() => onOpenBatch(batch.id)}
                  className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                    aria-label={batch.direction === 'outbound' ? 'Outbound / egress' : 'Return / ingress'}
                    title={batch.direction === 'outbound' ? 'Outbound / egress' : 'Return / ingress'}
                  >
                    {batch.direction === 'outbound' ? (
                      <ArrowUp className="size-4" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-4" aria-hidden="true" />
                    )}
                  </span>

                  <div className="min-w-0 shrink-0">
                    <p className="truncate text-sm font-medium text-card-foreground">{batch.vehicleType}</p>
                    <p className="truncate text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">
                      {batch.plateNumber}
                    </p>
                  </div>

                  <div className="ml-auto shrink-0">
                    <DispatchStepper direction={batch.direction} stage={batch.stage} stalled={batch.stalled} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </EventDetailSection>
  )
}
