import { useRef, useState } from 'react'
import type { DeficitLine, TriggerSource } from '@/lib/warehouse-replenishment'
import { lineCost } from '@/lib/warehouse-replenishment'
import { Pill } from '@/components/warehouse/shared/Pill'
import { KebabMenu } from '@/components/warehouse/shared/KebabMenu'
import { FloatingPanel } from '@/components/warehouse/shared/FloatingPanel'
import { PRIORITY_TONE, DEFICIT_STATUS_TONE } from '@/components/warehouse/replenishment/tone'
import { cn } from '@/lib/utils'

const TRIGGER_EXPLANATION: Record<TriggerSource, string> = {
  Canvas: 'Flagged automatically — a Canvas allocation exceeded projected stock for this event.',
  'Batch Pahabol': 'Flagged during batch reconciliation — an unplanned (pahabol) item pushed stock below threshold.',
  'Manual Audit': 'Flagged manually by a warehouse manager during a stockroom audit.',
  'Auto-Threshold':
    'Queued automatically — the Asset Catalog reported available stock below this item’s reorder threshold.',
}

interface DeficitTableProps {
  lines: DeficitLine[]
  selectedIds: Set<string>
  onToggleSelect?: (id: string) => void
  onRowClick: (line: DeficitLine) => void
  onEdit: (line: DeficitLine) => void
  onRemove: (id: string) => void
  onTagForDispatch: (id: string) => void
}

function TriggerCell({ source }: { source: TriggerSource }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isAuto = source === 'Auto-Threshold'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((cur) => !cur)
        }}
        aria-expanded={open}
        className={cn(
          'whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] transition',
          isAuto
            ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
            : 'border-border bg-background text-muted-foreground hover:bg-muted',
        )}
      >
        {source}
      </button>
      <FloatingPanel
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        align="left"
        width={232}
        label={`${source} explanation`}
        className="p-3 text-[0.65rem] leading-relaxed text-muted-foreground"
      >
        {TRIGGER_EXPLANATION[source]}
      </FloatingPanel>
    </>
  )
}

export function DeficitTable({ lines, selectedIds, onToggleSelect, onRowClick, onEdit, onRemove, onTagForDispatch }: DeficitTableProps) {
  if (lines.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-xs text-muted-foreground">No deficit lines in this view.</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr className="bg-muted/50">
            {(onToggleSelect ? [''] : []).concat([
              'Item',
              'Trigger Source',
              'Stock',
              'Cost',
              'Priority',
              'Status',
              '',
            ]).map((h, i) => (
              <th key={`${h}-${i}`} className="px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const pct = line.threshold > 0 ? Math.min(100, Math.round((line.currentStock / line.threshold) * 100)) : 0
            return (
              <tr
                key={line.id}
                onClick={() => onRowClick(line)}
                className="cursor-pointer border-t border-border/60 align-middle transition-colors hover:bg-accent/50"
              >
                {onToggleSelect && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(line.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        onToggleSelect(line.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${line.itemName}`}
                      className="size-4 accent-primary"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="text-left">
                    <p className="font-serif text-sm font-medium text-card-foreground group-hover:text-primary transition-colors">{line.itemName}</p>
                    <p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {line.category}
                      {line.taggedForDispatch && ' · Tagged for dispatch'}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <TriggerCell source={line.triggerSource} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', pct < 20 ? 'bg-destructive' : pct < 50 ? 'bg-destructive/60' : 'bg-primary')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-[0.65rem] text-muted-foreground">
                      {line.currentStock}/{line.threshold}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  ₱{lineCost(line).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={PRIORITY_TONE[line.priority]}>{line.priority}</Pill>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={DEFICIT_STATUS_TONE[line.status]}>{line.status}</Pill>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <KebabMenu
                    label={`Actions for ${line.itemName}`}
                    actions={[
                      { label: 'View Details', onSelect: () => onRowClick(line) },
                      { label: 'Tag for Dispatch', onSelect: () => onTagForDispatch(line.id) },
                      { label: 'Edit', onSelect: () => onEdit(line) },
                      { label: 'Remove', onSelect: () => onRemove(line.id), destructive: true },
                    ]}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
