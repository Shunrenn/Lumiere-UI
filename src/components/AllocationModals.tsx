import { useState, useEffect } from 'react'
import { AlertTriangle, ShieldAlert, ArrowRight, X } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Shared shell                                                        */
/* ------------------------------------------------------------------ */

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

function Eyebrow({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: typeof AlertTriangle
  label: string
  tone?: 'default' | 'destructive'
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className={tone === 'destructive' ? 'size-4 text-destructive' : 'size-4 text-primary'}
      />
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export interface StagedItem {
  name: string
  sku: string
  stock: number
}

/* ------------------------------------------------------------------ */
/* 1. Configure allocation quantity                                    */
/* ------------------------------------------------------------------ */

export function ConfigureAllocationModal({
  item,
  onClose,
  onCheck,
}: {
  item: StagedItem | null
  onClose: () => void
  onCheck: (qty: number) => void
}) {
  const [qty, setQty] = useState('')

  useEffect(() => {
    if (item) setQty('')
  }, [item])

  if (!item) return null

  const numeric = Number(qty)
  const valid = qty.trim() !== '' && Number.isFinite(numeric) && numeric > 0

  return (
    <ModalShell onClose={onClose}>
      <div className="px-7 pt-7 pb-5">
        <Eyebrow icon={AlertTriangle} label="Lumière Design Canvas Staging" />
        <h2 className="mt-2 font-serif text-3xl tracking-tight text-card-foreground">
          Configure Element Allocation
        </h2>
      </div>
      <div className="border-t border-border px-7 py-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Please specify the required quantity for this design layout. The system will run a live
          cross-reference check against the warehouse inventory registry for your selected event
          date.
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-muted/50">
          <div className="px-4 py-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Staged Item
            </p>
            <p className="mt-1 font-mono text-sm text-card-foreground">
              {item.name} (SKU: {item.sku})
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
            <label
              htmlFor="alloc-qty"
              className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Allocation Quantity
            </label>
            <input
              id="alloc-qty"
              type="number"
              min={1}
              autoFocus
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && valid) onCheck(numeric)
              }}
              placeholder="Enter Units"
              className="w-32 rounded-md border border-input bg-card px-3 py-1.5 text-right font-mono text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-border px-7 py-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-card-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onCheck(numeric)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check Inventory
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Allocation verified                                              */
/* ------------------------------------------------------------------ */

export function AllocationVerifiedModal({
  item,
  qty,
  onClose,
  onConfirm,
}: {
  item: StagedItem | null
  qty: number
  onClose: () => void
  onConfirm: () => void
}) {
  if (!item) return null

  return (
    <ModalShell onClose={onClose}>
      <div className="px-7 pt-7 pb-5">
        <Eyebrow icon={AlertTriangle} label="Lumière Logistics Registry" />
        <h2 className="mt-2 font-serif text-3xl tracking-tight text-card-foreground">
          Allocation Verified
        </h2>
      </div>
      <div className="border-t border-border px-7 py-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The warehouse inventory cross-reference check was successful. The requested quantity has
          been securely reserved for your active event scheduling window.
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-muted/50">
          <div className="px-4 py-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Staged Item
            </p>
            <p className="mt-1 font-mono text-sm text-card-foreground">
              {item.name} (SKU: {item.sku})
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Requested Capacity in Proposal Layout
            </span>
            <span className="font-mono text-sm text-card-foreground">{qty} Units</span>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Verified Physical Warehouse Stock
            </span>
            <span className="font-mono text-sm text-card-foreground">{item.stock} Units</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-border px-7 py-5">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
        >
          Confirm &amp; Place on Canvas
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Inventory deficit                                                */
/* ------------------------------------------------------------------ */

export function InventoryDeficitModal({
  item,
  qty,
  onClose,
  onAdjust,
}: {
  item: StagedItem | null
  qty: number
  onClose: () => void
  onAdjust: () => void
}) {
  if (!item) return null

  const deficit = item.stock - qty

  return (
    <ModalShell onClose={onClose}>
      <div className="px-7 pt-7 pb-5">
        <Eyebrow icon={ShieldAlert} label="Lumière Automated Logistics Safeguard" tone="destructive" />
        <h2 className="mt-2 font-serif text-3xl tracking-tight text-card-foreground">
          Inventory Deficit Detected
        </h2>
      </div>
      <div className="border-t border-border px-7 py-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          A live staging canvas layout cross-reference check has identified an inventory shortage
          for your requested scheduling window. The selected item exceeds available physical
          warehouse stock for this event date.
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-muted/50">
          <div className="px-4 py-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Staged Item
            </p>
            <p className="mt-1 font-mono text-sm text-card-foreground">
              {item.name} (SKU: {item.sku})
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Requested Capacity in Proposal Layout
            </span>
            <span className="font-mono text-sm text-card-foreground">{qty} Units</span>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Verified Physical Warehouse Stock
            </span>
            <span className="font-mono text-sm text-card-foreground">{item.stock} Units</span>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-destructive/10 px-4 py-3">
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-destructive">
              Net Allocation Deficit Shortage
            </span>
            <span className="font-mono text-sm font-semibold text-destructive">{deficit} Units</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-border px-7 py-5">
        <button
          type="button"
          onClick={onAdjust}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
        >
          Acknowledge &amp; Adjust Allocation
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </ModalShell>
  )
}
