import { useEffect, useMemo, useState } from 'react'
import {
  X,
  ArrowRight,
  CheckCircle2,
  Star,
  Clock,
  Mail,
  Phone,
  BadgeCheck,
  Sparkles,
} from 'lucide-react'
import { usePortal } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { ProcurementItem, Vendor } from '@/lib/types'

interface Props {
  item: ProcurementItem | null
  onClose: () => void
}

/* Derives a stable, catalog-style item code from the asset ID + category. */
function itemCode(item: ProcurementItem) {
  const seg = item.category.split('·')[0]?.trim().slice(0, 5).toUpperCase() || 'ITEM'
  return `LMR-${seg}-${item.assetId.replace(/[^0-9]/g, '')}`
}

function MeterRow({
  label,
  value,
  unit,
  pct,
  tone,
}: {
  label: string
  value: number
  unit: string
  pct: number
  tone: 'critical' | 'neutral'
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-card-foreground">{label}</p>
        <p
          className={cn(
            'text-sm font-semibold',
            tone === 'critical' ? 'text-destructive' : 'text-card-foreground',
          )}
        >
          {value} {unit}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', tone === 'critical' ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
        />
      </div>
    </div>
  )
}

const priceTierStyles: Record<Vendor['priceTier'], string> = {
  Economy: 'bg-emerald-100 text-emerald-700',
  Standard: 'bg-sky-100 text-sky-700',
  Premium: 'bg-primary/15 text-primary',
}

function VendorCard({
  vendor,
  selected,
  recommended,
  onSelect,
}: {
  vendor: Vendor
  selected: boolean
  recommended: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card p-4 text-left transition-all',
        selected
          ? 'border-primary ring-2 ring-ring/30 shadow-sm'
          : 'border-border hover:border-primary/50 hover:bg-muted/40',
      )}
    >
      {/* Selected check indicator */}
      <span
        className={cn(
          'absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border transition-colors',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-transparent group-hover:border-primary/50',
        )}
      >
        <CheckCircle2 className="size-3.5" />
      </span>

      <div className="flex flex-wrap items-center gap-2 pr-6">
        <p className="font-serif text-base font-medium leading-tight text-card-foreground">
          {vendor.name}
        </p>
        {recommended && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.1em] text-primary">
            <Sparkles className="size-2.5" />
            Recommended
          </span>
        )}
        {vendor.preferred && !recommended && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.1em] text-emerald-700">
            <BadgeCheck className="size-2.5" />
            Preferred
          </span>
        )}
      </div>

      <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">{vendor.specialty}</p>

      {/* Metrics */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.65rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
          <Star className="size-3 fill-current" />
          {vendor.rating.toFixed(1)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {vendor.leadTimeHours}h lead
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.08em]',
            priceTierStyles[vendor.priceTier],
          )}
        >
          {vendor.priceTier}
        </span>
      </div>

      {/* Contact, revealed when selected */}
      {selected && (
        <div className="mt-3 space-y-1 border-t border-border/60 pt-3 text-[0.65rem] text-muted-foreground">
          <p className="font-semibold text-card-foreground">{vendor.contactName}</p>
          <a
            href={`mailto:${vendor.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 transition hover:text-primary"
          >
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{vendor.email}</span>
          </a>
          <a
            href={`tel:${vendor.phone.replace(/\s/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 transition hover:text-primary"
          >
            <Phone className="size-3 shrink-0" />
            {vendor.phone}
          </a>
        </div>
      )}
    </button>
  )
}

export function ReorderRequisitionModal({ item, onClose }: Props) {
  const { routeReorder, vendors } = usePortal()
  const [qty, setQty] = useState(0)
  const [note, setNote] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Rank vendors so the best category match (then preferred, then rating) leads.
  const rankedVendors = useMemo(() => {
    if (!item) return []
    const haystack = `${item.name} ${item.category}`.toLowerCase()
    const score = (v: Vendor) => {
      const matchHits = v.matches.filter((m) => haystack.includes(m)).length
      return matchHits * 100 + (v.preferred ? 10 : 0) + v.rating
    }
    return [...vendors].sort((a, b) => score(b) - score(a))
  }, [item, vendors])

  // The top-ranked vendor is the recommendation for this specific item.
  const recommendedId = rankedVendors[0]?.id ?? ''

  // Reset local form whenever a new item is opened, defaulting to the recommendation.
  useEffect(() => {
    if (item) {
      setQty(Math.max(1, item.threshold - item.currentStock))
      setNote('')
      setVendorId(recommendedId)
      setSubmitting(false)
    }
  }, [item, recommendedId])

  const stamp = useMemo(
    () => new Date().toLocaleTimeString('en-US', { hour12: false }),
    [item],
  )

  if (!item) return null

  const stockPct = item.threshold > 0 ? (item.currentStock / item.threshold) * 100 : 100
  const code = itemCode(item)
  const selectedVendor = vendors.find((v) => v.id === vendorId) ?? null

  const confirm = () => {
    if (qty < 1 || !vendorId || submitting) return
    setSubmitting(true)
    routeReorder({ itemId: item.id, reorderQty: qty, note: note.trim(), vendorId })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-700/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Reorder requisition for ${item.name}`}
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-xl overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <h2 className="font-serif text-2xl font-medium tracking-tight text-card-foreground">
            Inventory Reorder Requisition
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 pb-6">
          {/* Item details */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Item Details
              </p>
              <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Item Name
              </p>
              <p className="mt-0.5 font-serif text-xl font-medium text-card-foreground">
                {item.name}
              </p>
              <p className="mt-3 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Item Code
              </p>
              <p className="mt-1 inline-block rounded bg-muted px-2 py-1 font-mono text-xs text-card-foreground">
                {code}
              </p>
            </div>
            <div className="text-right">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em]',
                  item.status === 'Critical Deficit'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-800',
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {item.status}
              </span>
            </div>
          </div>

          {/* Inventory status meters */}
          <div className="space-y-4 border-t border-border pt-5">
            <MeterRow
              label="Current Stock"
              value={item.currentStock}
              unit={item.unit}
              pct={stockPct}
              tone="critical"
            />
            <MeterRow
              label="Required Stock (Standard)"
              value={item.threshold}
              unit={item.unit}
              pct={100}
              tone="neutral"
            />

            {/* Editable reorder quantity */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="reorder-qty"
                  className="text-sm text-card-foreground"
                >
                  Reorder Quantity
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="reorder-qty"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
                    className="w-20 rounded-md border border-input bg-card px-2 py-1 text-right text-sm font-semibold text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <span className="text-sm text-muted-foreground">{item.unit}</span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, Math.max(4, (qty / Math.max(1, item.threshold)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Vendor / supplier selection */}
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Route To Vendor / Contact
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select the supplier this requisition will be dispatched to.
                </p>
              </div>
              {selectedVendor && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[0.6rem] font-semibold text-primary">
                  <CheckCircle2 className="size-3.5" />
                  {selectedVendor.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rankedVendors.map((v) => (
                <VendorCard
                  key={v.id}
                  vendor={v}
                  selected={vendorId === v.id}
                  recommended={v.id === recommendedId}
                  onSelect={() => setVendorId(v.id)}
                />
              ))}
            </div>
          </div>

          {/* Workflow + lifecycle */}
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-card-foreground">Single-Entry Workflow</p>
              <div className="flex flex-wrap items-center gap-2">
                {selectedVendor && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[0.62rem] font-semibold text-primary">
                    <Clock className="size-3.5" />
                    Est. arrival {selectedVendor.leadTimeHours}h
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[0.62rem] font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  Purchasing Officer notified
                </span>
              </div>
            </div>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                State Lifecycle Change — Item State
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="rounded-md bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  {item.status}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Reorder Processing
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="reorder-note"
              className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Requisition Notes / Justification
            </label>
            <textarea
              id="reorder-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional notes for the Purchasing Officer..."
              className="mt-2 w-full resize-none rounded-lg border border-input bg-muted/40 px-3 py-2.5 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={confirm}
              disabled={qty < 1 || !vendorId || submitting}
              className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedVendor ? `Route to ${selectedVendor.name}` : 'Confirm & Route Requisition'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
            >
              Cancel
            </button>
          </div>
          <div className="text-right">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Audit Trail / Non-Repudiation
            </p>
            <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground">
              System timestamp {stamp} · WAREHOUSE_MGR_01
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
