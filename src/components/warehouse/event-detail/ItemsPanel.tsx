import type { AllocatedItemStatus, EventAllocatedItem } from '@/lib/event-detail'
import { EventDetailSection, SectionButton } from '@/components/warehouse/event-detail/EventDetailSection'
import { toneClasses, toneDot, type Tone } from '@/components/warehouse/event-detail/status-tone'

const STATUS_TONE: Record<AllocatedItemStatus, Tone> = {
  Reserved: 'progress',
  Packed: 'positive',
  Short: 'caution',
}

interface ItemsPanelProps {
  items: EventAllocatedItem[]
  onViewAllocation: () => void
  onOpenItem: (item: EventAllocatedItem) => void
}

export function ItemsPanel({ items, onViewAllocation, onOpenItem }: ItemsPanelProps) {
  return (
    <EventDetailSection
      title="Items / Assets"
      action={<SectionButton onClick={onViewAllocation}>View Full Allocation</SectionButton>}
    >
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center text-sm text-muted-foreground">
          No items allocated yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Item
                </th>
                <th className="py-2.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Quantity
                </th>
                <th className="py-2.5 text-right text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const tone = STATUS_TONE[item.status]
                return (
                  <tr
                    key={item.id}
                    onClick={() => onOpenItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onOpenItem(item)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${item.name}`}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent"
                  >
                    <td className="py-3 text-sm text-card-foreground">{item.name}</td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.06em] ${toneClasses[tone]}`}
                      >
                        <span className={`size-1.5 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </EventDetailSection>
  )
}
