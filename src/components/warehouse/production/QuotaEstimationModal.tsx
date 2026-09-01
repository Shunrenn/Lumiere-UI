import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { estimateFinishHours } from '@/lib/warehouse-production'

interface QuotaEstimationModalProps {
  onClose: () => void
  onSave: (result: { itemName: string; manCount: number; materialCount: number; estimatedHours: number }) => void
}

export function QuotaEstimationModal({ onClose, onSave }: QuotaEstimationModalProps) {
  const [itemName, setItemName] = useState('')
  const [manCount, setManCount] = useState(3)
  const [materialCount, setMaterialCount] = useState(4)
  const [override, setOverride] = useState<string | null>(null)

  const autoEstimate = useMemo(() => estimateFinishHours(manCount, materialCount), [manCount, materialCount])
  const finalEstimate = override !== null && override.trim() !== '' ? Number(override) : autoEstimate

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Production &amp; Fabrication
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">Quota Estimation Tool</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Item / build name</span>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Bespoke Ceiling Installation"
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Man count</span>
              <input
                type="number"
                min={1}
                max={20}
                value={manCount}
                onChange={(e) => setManCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Raw materials (# types)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={materialCount}
                onChange={(e) => setMaterialCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-3.5">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Auto-computed estimated finish time
            </p>
            <p className="mt-1 text-lg font-semibold text-card-foreground">{autoEstimate}h</p>
            <p className="mt-1 text-[0.6rem] text-muted-foreground">Based on historical build averages for similar bespoke work.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Override estimate (optional)
            </span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={override ?? ''}
              onChange={(e) => setOverride(e.target.value)}
              placeholder={`${autoEstimate}`}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={itemName.trim().length === 0}
            onClick={() => onSave({ itemName, manCount, materialCount, estimatedHours: finalEstimate })}
            className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            Save Estimate
          </button>
        </div>
      </div>
    </div>
  )
}
