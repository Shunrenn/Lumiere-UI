import type { ProductionBannerState } from '@/lib/event-detail'
import type { ProductionItem, ProductionStage } from '@/lib/warehouse-production'
import { EventDetailSection, SectionButton } from '@/components/warehouse/event-detail/EventDetailSection'
import { StateBanner } from '@/components/warehouse/event-detail/StateBanner'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'

const BANNER_TONE: Record<ProductionBannerState, Tone> = {
  'Not Started': 'neutral',
  'In Production': 'progress',
  Ready: 'positive',
}

// Display-only transform of the real fabrication stage into a progress
// fraction for the bar below — the stage itself remains the source of truth.
const STAGE_PROGRESS: Record<ProductionStage, number> = {
  Unprepped: 0,
  Prepping: 50,
  'Awaiting Approval': 85,
  Ready: 100,
}

interface ProductionPanelProps {
  banner: ProductionBannerState
  items: ProductionItem[]
  onOpenItem: (item: ProductionItem) => void
  onViewTracker: () => void
}

export function ProductionPanel({ banner, items, onOpenItem, onViewTracker }: ProductionPanelProps) {
  return (
    <EventDetailSection
      title="Production / Bespoke"
      action={<SectionButton onClick={onViewTracker}>View Full Production Tracker</SectionButton>}
    >
      <div className="flex flex-col gap-4">
        <StateBanner label={banner} tone={BANNER_TONE[banner]} />

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center text-sm text-muted-foreground">
            No bespoke or production items for this event yet.
          </p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">{item.itemName}</p>
                    <p className="truncate text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">
                      {item.assignedCrew}
                    </p>
                  </div>
                  <div className="flex w-28 shrink-0 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${STAGE_PROGRESS[item.stage]}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-[0.6rem] font-semibold text-muted-foreground">
                      {STAGE_PROGRESS[item.stage]}%
                    </span>
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
