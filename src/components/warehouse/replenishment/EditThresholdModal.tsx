import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { usePortal } from '@/lib/store'
import type { ProcurementItem } from '@/lib/types'

interface Props {
  item: ProcurementItem | null
  onClose: () => void
}

export function EditThresholdModal({ item, onClose }: Props) {
  const { updateThreshold } = usePortal()
  const [threshold, setThreshold] = useState(0)

  useEffect(() => {
    if (item) setThreshold(item.threshold)
  }, [item])

  if (!item) return null

  const save = () => {
    if (threshold < 1) return
    updateThreshold(item.id, threshold)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-700/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit threshold for ${item.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between bg-sidebar px-6 py-5 text-sidebar-foreground">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
              {item.assetId}
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium leading-tight text-sidebar-primary">
              {item.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-sidebar-foreground/70 transition hover:text-sidebar-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Current Stock
              </p>
              <p className="mt-1 font-medium text-card-foreground">
                {item.currentStock} {item.unit}
              </p>
            </div>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Category
              </p>
              <p className="mt-1 text-card-foreground">{item.category}</p>
            </div>
          </div>

          <div>
            <label
              htmlFor="threshold"
              className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Threshold Minimum
            </label>
            <input
              id="threshold"
              type="number"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value)))}
              className="mt-2 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <p className="mt-2 text-[0.65rem] leading-relaxed text-muted-foreground">
              Adjusting the minimum re-evaluates this asset&apos;s deficit status automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-card px-5 py-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={threshold < 1}
            className="rounded-md bg-primary px-5 py-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Save Threshold
          </button>
        </div>
      </div>
    </div>
  )
}
