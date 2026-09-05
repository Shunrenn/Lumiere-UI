import { useState } from 'react'
import { X } from 'lucide-react'
import type { DeficitLine, DeficitPriority, TriggerSource } from '@/lib/warehouse-replenishment'
import { useWarehouseVendors } from '@/lib/warehouse-vendors'
import { SearchableVendorSelect } from '@/components/warehouse/shared/SearchableVendorSelect'

const PRIORITIES: DeficitPriority[] = ['Low', 'Medium', 'High', 'Critical']
const TRIGGERS: TriggerSource[] = ['Canvas', 'Batch Pahabol', 'Manual Audit', 'Auto-Threshold']

export interface MasterItemDraft {
  itemName: string
  category: string
  unit: string
  currentStock: number
  threshold: number
  costPerUnit: number
  priority: DeficitPriority
  triggerSource: TriggerSource
  primaryVendorId: string
  eventId?: string
  eventTitle?: string
}

interface AddMasterItemModalProps {
  initial?: DeficitLine
  presetEvent?: { id: string; title: string }
  onClose: () => void
  onSave: (draft: MasterItemDraft) => void
}

export function AddMasterItemModal({ initial, presetEvent, onClose, onSave }: AddMasterItemModalProps) {
  const vendors = useWarehouseVendors()
  const [itemName, setItemName] = useState(initial?.itemName ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Event Asset')
  const [unit, setUnit] = useState(initial?.unit ?? 'pcs')
  const [currentStock, setCurrentStock] = useState(String(initial?.currentStock ?? 0))
  const [threshold, setThreshold] = useState(String(initial?.threshold ?? 50))
  const [costPerUnit, setCostPerUnit] = useState(String(initial?.costPerUnit ?? 500))
  const [priority, setPriority] = useState<DeficitPriority>(initial?.priority ?? 'Medium')
  const [triggerSource, setTriggerSource] = useState<TriggerSource>(initial?.triggerSource ?? 'Manual Audit')
  const [primaryVendorId, setPrimaryVendorId] = useState(initial?.primaryVendorId ?? vendors[0]?.id ?? '')

  const canSubmit = itemName.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-serif text-xl font-medium text-card-foreground">
              {initial ? 'Edit Deficit Line' : presetEvent ? `Add Item · ${presetEvent.title}` : 'Add Master Item'}
            </h2>
            {presetEvent && (
              <p className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-primary">
                Bound to {presetEvent.title}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto px-6 py-5">
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Item name</span>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Category</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Unit</span>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Current stock</span>
            <input
              type="number"
              min={0}
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Threshold</span>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Cost / unit (₱)</span>
            <input
              type="number"
              min={0}
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as DeficitPriority)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Trigger source</span>
            <select
              value={triggerSource}
              onChange={(e) => setTriggerSource(e.target.value as TriggerSource)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            >
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-2 flex flex-col gap-1.5">
            <SearchableVendorSelect
              label="Primary vendor"
              value={primaryVendorId}
              onChange={setPrimaryVendorId}
              placeholder="Search or select primary vendor…"
            />
            <span className="text-[0.6rem] text-muted-foreground">
              Pulled live from the Vendor Registry — type to filter or create a new vendor inline.
            </span>
          </div>
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
            disabled={!canSubmit}
            onClick={() =>
              onSave({
                itemName: itemName.trim(),
                category,
                unit,
                currentStock: Number(currentStock) || 0,
                threshold: Number(threshold) || 1,
                costPerUnit: Number(costPerUnit) || 0,
                priority,
                triggerSource,
                primaryVendorId,
                eventId: presetEvent?.id ?? initial?.eventId,
                eventTitle: presetEvent?.title ?? initial?.eventTitle,
              })
            }
            className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            {initial ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </div>
    </div>
  )
}
