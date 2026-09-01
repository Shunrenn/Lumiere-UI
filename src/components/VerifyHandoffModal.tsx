import { useEffect, useState } from 'react'
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Calendar,
  Briefcase,
  Truck,
  Package,
  PackageCheck,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HandoffManifest {
  id: string
  manifestId: string
  vehicle: string
  event: string
  venue: string
  date: string
  fieldTask: string
  logisticsHandoff: string
  fieldReceiver: string
  status: 'Pending Verification' | 'In Transit' | 'Completed'
}

interface LineItem {
  sku: string
  name: string
  qty: number
  category: string
}

// Complete physical item manifests, keyed by manifest reference.
const MANIFEST_ITEMS: Record<string, LineItem[]> = {
  'MNF-9940': [
    { sku: 'LM-0041', name: 'Ivory Floral Arch', qty: 2, category: 'Décor · Backdrop' },
    { sku: 'LM-0519', name: 'Eucalyptus Garland Set', qty: 8, category: 'Floristry · Greenery' },
    { sku: 'LM-0012', name: 'White Resin Tiffany Chair', qty: 120, category: 'Seating · Ceremony' },
    { sku: 'LM-0089', name: 'Ivory Pillar Candle Set', qty: 24, category: 'Ambiance · Wax Goods' },
    { sku: 'LM-0035', name: 'Round Linen Banquet Table', qty: 12, category: 'Furniture · Banquet' },
    { sku: 'LM-0203', name: 'Silk Drape Panel (4m)', qty: 16, category: 'Décor · Backdrop' },
    { sku: 'LM-0118', name: 'Gold Charger Plate', qty: 120, category: 'Tabletop · Service' },
    { sku: 'LM-0612', name: 'Crystal Centerpiece Vase', qty: 12, category: 'Floristry · Vessels' },
  ],
  'MNF-9941': [
    { sku: 'LM-0301', name: 'Modular Runway Deck (2m)', qty: 14, category: 'Staging · Platform' },
    { sku: 'LM-0114', name: 'Champagne Coupe Glasses', qty: 96, category: 'Beverage · Glassware' },
    { sku: 'LM-0207', name: 'Velvet Gold Chiavari Chair', qty: 80, category: 'Seating · Ceremony' },
    { sku: 'LM-0455', name: 'Backstage Garment Rack', qty: 10, category: 'Logistics · Fixtures' },
    { sku: 'LM-0820', name: 'LED Uplight Cannister', qty: 24, category: 'Lighting · Accent' },
    { sku: 'LM-0377', name: 'Cable Ramp Protector', qty: 18, category: 'Logistics · Safety' },
    { sku: 'LM-0512', name: 'Black Pipe & Drape Kit', qty: 6, category: 'Staging · Backdrop' },
  ],
  'MNF-9938': [
    { sku: 'LM-0027', name: 'Luxury Crystal Chandelier', qty: 6, category: 'Lighting · Statement' },
    { sku: 'LM-0820', name: 'LED Uplight Cannister', qty: 32, category: 'Lighting · Accent' },
    { sku: 'LM-0931', name: 'DMX Lighting Controller', qty: 2, category: 'Lighting · Control' },
    { sku: 'LM-0944', name: 'Truss Segment (3m)', qty: 12, category: 'Rigging · Structure' },
    { sku: 'LM-0958', name: 'Moving Head Spotlight', qty: 8, category: 'Lighting · Effects' },
    { sku: 'LM-0377', name: 'Cable Ramp Protector', qty: 14, category: 'Logistics · Safety' },
  ],
  'MNF-9942': [
    { sku: 'LM-0089', name: 'Ivory Pillar Candle Set', qty: 40, category: 'Ambiance · Wax Goods' },
    { sku: 'LM-0118', name: 'Gold Charger Plate', qty: 160, category: 'Tabletop · Service' },
    { sku: 'LM-0612', name: 'Crystal Centerpiece Vase', qty: 20, category: 'Floristry · Vessels' },
    { sku: 'LM-0035', name: 'Round Linen Banquet Table', qty: 20, category: 'Furniture · Banquet' },
    { sku: 'LM-0012', name: 'White Resin Tiffany Chair', qty: 160, category: 'Seating · Ceremony' },
    { sku: 'LM-0519', name: 'Eucalyptus Garland Set', qty: 10, category: 'Floristry · Greenery' },
    { sku: 'LM-0203', name: 'Silk Drape Panel (4m)', qty: 12, category: 'Décor · Backdrop' },
    { sku: 'LM-0741', name: 'Taper Candle Holder Set', qty: 30, category: 'Ambiance · Holders' },
    { sku: 'LM-0856', name: 'Ivory Organza Sash', qty: 160, category: 'Linen · Ceremony' },
  ],
  'MNF-9943': [
    { sku: 'LM-0301', name: 'Modular Runway Deck (2m)', qty: 20, category: 'Staging · Platform' },
    { sku: 'LM-0512', name: 'Black Pipe & Drape Kit', qty: 10, category: 'Staging · Backdrop' },
    { sku: 'LM-0820', name: 'LED Uplight Cannister', qty: 40, category: 'Lighting · Accent' },
    { sku: 'LM-0958', name: 'Moving Head Spotlight', qty: 12, category: 'Lighting · Effects' },
    { sku: 'LM-0931', name: 'DMX Lighting Controller', qty: 2, category: 'Lighting · Control' },
    { sku: 'LM-0207', name: 'Velvet Gold Chiavari Chair', qty: 200, category: 'Seating · Ceremony' },
    { sku: 'LM-0377', name: 'Cable Ramp Protector', qty: 20, category: 'Logistics · Safety' },
    { sku: 'LM-0455', name: 'Backstage Garment Rack', qty: 6, category: 'Logistics · Fixtures' },
    { sku: 'LM-1021', name: 'Branded Podium Stand', qty: 2, category: 'Staging · Podium' },
    { sku: 'LM-1035', name: 'Projection Screen (8ft)', qty: 3, category: 'AV · Display' },
  ],
}

const FALLBACK_ITEMS: LineItem[] = [
  { sku: 'LM-0000', name: 'General Asset Crate', qty: 10, category: 'Logistics · Mixed' },
  { sku: 'LM-0001', name: 'Protective Wrap Bundle', qty: 6, category: 'Logistics · Safety' },
  { sku: 'LM-0002', name: 'Custody Transfer Token', qty: 1, category: 'Documentation' },
]

interface Props {
  open: boolean
  manifests: HandoffManifest[]
  preselectedId: string | null
  onClose: () => void
  onAuthorize: (manifestId: string) => void
}

export function VerifyHandoffModal({ open, manifests, preselectedId, onClose, onAuthorize }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId)
  const [received, setReceived] = useState<Set<string>>(new Set())
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [protocolSigned, setProtocolSigned] = useState(false)
  const [dispatchLog, setDispatchLog] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)

  // Sync + reset internal state whenever the modal opens or the preselection changes.
  useEffect(() => {
    if (open) {
      setSelectedId(preselectedId)
      setReceived(new Set())
      setFlagged(new Set())
      setProtocolSigned(false)
      setDispatchLog('')
      setConfirming(false)
      setAuthorizing(false)
    }
  }, [open, preselectedId])

  if (!open) return null

  const selected = manifests.find((m) => m.id === selectedId) ?? null
  const items = selected ? MANIFEST_ITEMS[selected.manifestId] ?? FALLBACK_ITEMS : []
  const totalUnits = items.reduce((sum, i) => sum + i.qty, 0)

  const toggleReceived = (sku: string) => {
    setReceived((prev) => {
      const next = new Set(prev)
      if (next.has(sku)) next.delete(sku)
      else next.add(sku)
      return next
    })
    setFlagged((prev) => {
      if (!prev.has(sku)) return prev
      const next = new Set(prev)
      next.delete(sku)
      return next
    })
  }

  const resolvedCount = received.size + flagged.size
  const allResolved = items.length > 0 && resolvedCount === items.length
  const hasDiscrepancy = flagged.size > 0
  const canAuthorize =
    allResolved && protocolSigned && (!hasDiscrepancy || dispatchLog.trim().length > 0)

  const handleConfirm = () => {
    if (!selected || !canAuthorize) return
    setAuthorizing(true)
    setTimeout(() => {
      onAuthorize(selected.id)
      onClose()
    }, 500)
  }

  const goBackToSelection = () => {
    setSelectedId(null)
    setReceived(new Set())
    setFlagged(new Set())
    setProtocolSigned(false)
    setDispatchLog('')
    setConfirming(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between bg-primary px-6 py-5 text-primary-foreground">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              LUMIÈRE · DEPLOYMENTS — DISPATCH HANDSHAKE
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight md:text-3xl text-balance">
              {selected ? 'Verify Handoff' : 'Select Event to Verify'}
            </h2>
            <p className="mt-1 text-xs text-primary-foreground/80">
              {selected ? `REF: ${selected.manifestId} · ${selected.event}` : 'Choose a pending manifest to begin the chain-of-custody handshake'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-primary-foreground/70 transition hover:text-primary-foreground"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* ---------- STEP 1: EVENT SELECTION ---------- */}
        {!selected && (
          <div className="space-y-3 px-6 py-6 max-h-[calc(100vh-220px)] overflow-y-auto">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Manifests Awaiting Handshake
            </p>
            {manifests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-12 text-center">
                <PackageCheck className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-card-foreground">All handshakes reconciled</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  There are no manifests pending verification right now.
                </p>
              </div>
            ) : (
              manifests.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className="group flex w-full items-center gap-4 rounded-lg border border-border bg-muted/30 p-4 text-left transition hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Package className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-serif text-base font-medium text-card-foreground">{m.event}</p>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.1em] text-amber-800">
                        {m.manifestId}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {m.venue}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" /> {m.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="size-3" /> {m.fieldTask}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))
            )}
          </div>
        )}

        {/* ---------- STEP 2: VERIFICATION ---------- */}
        {selected && (
          <>
            <div className="space-y-6 px-6 py-6 max-h-[calc(100vh-260px)] overflow-y-auto">
              {/* Back link (only when chosen from list) */}
              {!preselectedId && (
                <button
                  type="button"
                  onClick={goBackToSelection}
                  className="inline-flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-primary"
                >
                  <ChevronLeft className="size-3.5" />
                  Back to Event Selection
                </button>
              )}

              {/* Dispatch Identification */}
              <div>
                <h3 className="mb-4 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Dispatch Identification
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Destination Venue
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">{selected.venue}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Assigned Fleet Vehicle
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">{selected.vehicle}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custody Chain */}
              <div className="border-t border-border pt-6">
                <h3 className="mb-4 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Custodian Chain of Custody
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Releasing Party (Warehouse)
                    </p>
                    <p className="mt-2 font-semibold text-card-foreground">{selected.logisticsHandoff}</p>
                  </div>
                  <div>
                    <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Receiving Party (Field)
                    </p>
                    <p className="mt-2 font-semibold text-card-foreground">{selected.fieldReceiver}</p>
                  </div>
                </div>
              </div>

              {/* Physical Item Verification — COMPLETE LIST */}
              <div className="border-t border-border pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Physical Item Verification
                  </h3>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                      allResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    <span className={cn('size-1.5 rounded-full', allResolved ? 'bg-emerald-500' : 'bg-amber-500')} />
                    {resolvedCount}/{items.length} Lines · {received.size} of {items.length} confirmed
                  </span>
                </div>

                {/* Bulk action */}
                <div className="mb-3 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[0.6rem] text-muted-foreground">
                    {items.length} line items · {totalUnits} total units staged
                  </p>
                  <button
                    type="button"
                    onClick={() => setReceived(new Set(items.map((i) => i.sku)))}
                    className="inline-flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary transition hover:underline"
                  >
                    <ClipboardCheck className="size-3.5" />
                    Confirm All Received
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item) => {
                    const isReceived = received.has(item.sku)
                    const isFlagged = flagged.has(item.sku)
                    return (
                      <label
                        key={item.sku}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition',
                          isReceived && 'border-emerald-300 bg-emerald-50',
                          isFlagged && 'border-amber-300 bg-amber-50',
                          !isReceived && !isFlagged && 'border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isReceived}
                          onChange={() => toggleReceived(item.sku)}
                          className="size-4 shrink-0 cursor-pointer rounded border-border accent-emerald-600"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              'truncate text-sm font-medium',
                              isReceived ? 'text-emerald-800' : 'text-card-foreground',
                            )}>
                              {item.name}
                            </p>
                            <span className="shrink-0 rounded bg-card px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                              {item.sku}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                            {item.category} · Qty {item.qty}
                          </p>
                        </div>
                        {isReceived && (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        )}
                        {isFlagged && !isReceived && (
                          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Handshake Protocol */}
              <div className="border-t border-border pt-6">
                <h3 className="mb-4 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Handshake Protocol
                </h3>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 transition hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={protocolSigned}
                    onChange={(e) => setProtocolSigned(e.target.checked)}
                    className="mt-1 size-4 cursor-pointer rounded border-border accent-primary"
                  />
                  <span className="text-sm text-card-foreground">
                    Dual-Auth Handshake completed with manifest checksum verification
                  </span>
                </label>
              </div>

              {/* State Lifecycle */}
              <div className="border-t border-border pt-6">
                <h3 className="mb-4 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  State Lifecycle Changes
                </h3>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
                  <span className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    Pending Verification
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    In Transit
                  </span>
                </div>
              </div>

              {/* Dispatch Log */}
              <div>
                <label
                  htmlFor="dispatch-log"
                  className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
                >
                  Dispatch Logs / Variance Justification
                  {hasDiscrepancy && <span className="ml-1 text-amber-600">· Required (discrepancy flagged)</span>}
                </label>
                <textarea
                  id="dispatch-log"
                  value={dispatchLog}
                  onChange={(e) => setDispatchLog(e.target.value)}
                  placeholder={
                    hasDiscrepancy
                      ? 'Document the flagged discrepancy and corrective action...'
                      : 'Optional notes for this handshake...'
                  }
                  rows={3}
                  className={cn(
                    'mt-2 w-full resize-none rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-ring/30',
                    hasDiscrepancy && !dispatchLog.trim()
                      ? 'border-amber-400 focus:border-amber-500'
                      : 'border-input focus:border-primary',
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!canAuthorize}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] transition',
                  canAuthorize
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                <CheckCircle2 className="size-4" />
                Authorize Dispatch
              </button>
            </div>
          </>
        )}

        {/* ---------- REVALIDATION CONFIRM OVERLAY ---------- */}
        {confirming && selected && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation()
              setConfirming(false)
            }}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  'flex size-11 items-center justify-center rounded-full',
                  hasDiscrepancy ? 'bg-amber-100' : 'bg-emerald-100',
                )}
              >
                {hasDiscrepancy ? (
                  <AlertTriangle className="size-5 text-amber-700" />
                ) : (
                  <CheckCircle2 className="size-5 text-emerald-700" />
                )}
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium text-card-foreground">
                Authorize &amp; Release Custody?
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Manifest <span className="font-semibold text-card-foreground">{selected.manifestId}</span> for{' '}
                <span className="font-semibold text-card-foreground">{selected.event}</span> will transition to{' '}
                <span className="font-semibold text-card-foreground">In Transit</span>, releasing assets from
                warehouse custody to {selected.fieldReceiver}.
                {hasDiscrepancy && (
                  <span className="mt-2 block rounded-md bg-amber-50 px-3 py-2 text-amber-700">
                    {flagged.size} item line(s) flagged with a discrepancy. The variance note will be appended to
                    the audit trail.
                  </span>
                )}
              </p>
              <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 font-mono text-[0.6rem] text-muted-foreground">
                {received.size}/{items.length} confirmed · OPERATOR: TRANSIT_SUPY_01
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-border bg-card px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-muted"
                >
                  Review Again
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={authorizing}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  <CheckCircle2 className="size-3.5" />
                  {authorizing ? 'Authorizing...' : 'Confirm Dispatch'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
