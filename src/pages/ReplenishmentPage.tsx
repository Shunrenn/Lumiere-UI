import { useMemo, useState, useEffect } from 'react'
import { Search, Download, Plus, Package } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { ReorderRequisitionModal } from '@/components/ReorderRequisitionModal'
import { EditThresholdModal } from '@/components/EditThresholdModal'
import { ShopForOrderModal } from '@/components/ShopForOrderModal'
import { WarehouseRequestModal } from '@/components/WarehouseRequestModal'
import { usePortal } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { DeficitStatus, ProcurementItem } from '@/lib/types'

type Filter = 'All' | DeficitStatus

const FILTERS: Filter[] = ['All', 'Critical Deficit', 'Low Stock', 'Order Placed']

const statusStyles: Record<DeficitStatus, { badge: string; bar: string }> = {
  'Critical Deficit': { badge: 'bg-rose-100 text-rose-700', bar: 'bg-destructive' },
  'Low Stock': { badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
  'Order Placed': { badge: 'bg-muted text-muted-foreground', bar: 'bg-emerald-600' },
  Available: { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-600' },
}

interface Kpi {
  label: string
  value: string
  sub: string
  accent: string
  dot: string
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {kpi.label}
      </p>
      <p className="mt-3 font-sans text-2xl font-bold leading-none text-card-foreground">
        {kpi.value}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className={cn('size-1.5 rounded-full', kpi.dot)} />
        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {kpi.sub}
        </p>
      </div>
      <div className={cn('mt-3 h-0.5 w-full rounded-full', kpi.accent)} />
    </div>
  )
}

export function ReplenishmentPage() {
  const { procurement, inventory } = usePortal()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [reorderItem, setReorderItem] = useState<ProcurementItem | null>(null)
  const [editItem, setEditItem] = useState<ProcurementItem | null>(null)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [shopModalOpen, setShopModalOpen] = useState(false)
  const [warehouseRequestOpen, setWarehouseRequestOpen] = useState(false)
  // Flag to track if initiate reorder was explicitly clicked
  const [userInitiatedReorder, setUserInitiatedReorder] = useState(false)

  // Ensure modals don't auto-open on page load
  useEffect(() => {
    setShopModalOpen(false)
    setWarehouseRequestOpen(false)
    setUserInitiatedReorder(false)
  }, [])

  const counts = useMemo(() => {
    const critical = procurement.filter((p) => p.status === 'Critical Deficit').length
    const low = procurement.filter((p) => p.status === 'Low Stock').length
    const orders = procurement.filter((p) => p.status === 'Order Placed')
    const minEta = orders.reduce<number | null>(
      (min, o) => (o.etaHours != null && (min === null || o.etaHours < min) ? o.etaHours : min),
      null,
    )
    return {
      critical,
      pending: critical + low,
      orders: orders.length,
      eta: minEta === null ? '—' : `${minEta}h`,
    }
  }, [procurement])

  const kpis: Kpi[] = [
    {
      label: 'Critical Deficits',
      value: String(counts.critical),
      sub: 'Requires immediate action',
      accent: 'bg-destructive/40',
      dot: 'bg-destructive',
    },
    {
      label: 'Pending Procurements',
      value: String(counts.pending),
      sub: 'Lines awaiting reorder',
      accent: 'bg-amber-500/40',
      dot: 'bg-amber-500',
    },
    {
      label: 'Total Supplier Orders',
      value: String(counts.orders),
      sub: 'Active PO dispatches',
      accent: 'bg-primary/30',
      dot: 'bg-primary',
    },
    {
      label: 'Estimated Arrival',
      value: counts.eta,
      sub: 'Next incoming shipment',
      accent: 'bg-emerald-600/40',
      dot: 'bg-emerald-600',
    },
  ]

  const procurementWithImages = useMemo(
    () => procurement.map((item) => ({ ...item, image: inventory.find((asset) => asset.assetId === item.assetId)?.image })),
    [procurement, inventory],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return procurementWithImages.filter((p) => {
      const matchesFilter = filter === 'All' || p.status === filter
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.assetId.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [procurementWithImages, query, filter])

  const exportCsv = () => {
    const header = 'Asset ID,Item Name,Category,Current Stock,Threshold,Stock %,Status\n'
    const rows = procurement
      .map((p) => {
        const pct = p.threshold > 0 ? Math.round((p.currentStock / p.threshold) * 100) : 100
        return `"${p.assetId}","${p.name}","${p.category}","${p.currentStock}","${p.threshold}","${pct}%","${p.status}"`
      })
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumiere-procurement-register.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Reorder the most critical line as a one-tap "initiate reorder" entry point.
  const initiateReorder = () => {
    const target =
      procurement.find((p) => p.status === 'Critical Deficit') ??
      procurement.find((p) => p.status === 'Low Stock')
    if (target) {
      setReorderItem(target)
      setUserInitiatedReorder(true)
      setShopModalOpen(true)
    }
  }

  return (
    <ConsoleLayout>
      {/* Page heading */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            UC-05 · Active Monitoring
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Replenishment &amp; Deficit Management
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {procurement.length} line items across 4 supplier accounts ·{' '}
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em] text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live Console
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets, IDs, suppliers..."
              className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => setWarehouseRequestOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-primary bg-primary/10 px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary transition hover:bg-primary/20"
          >
            <Package className="size-3.5" />
            Warehouse Requests
          </button>
          <button
            type="button"
            onClick={initiateReorder}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            Initiate Reorder
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Register */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-card-foreground">
              Procurement Register
            </h2>
            <span className="rounded-full bg-muted px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {filtered.length} Items
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] transition-colors',
                  filter === f
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {f === 'All' ? 'All' : f}
              </button>
            ))}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-muted"
            >
              <Download className="size-3" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="bg-muted/50">
                {[
                  'Asset',
                  'Item Name',
                  'Current Stock Level',
                  'Threshold Minimum',
                  'Stock %',
                  'Deficit Status',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'px-5 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground',
                      h === 'Actions' && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-xs text-muted-foreground">
                    No line items match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const pct = p.threshold > 0 ? Math.round((p.currentStock / p.threshold) * 100) : 100
                  const isOrder = p.status === 'Order Placed'
                  const styles = statusStyles[p.status]
                  return (
                    <FragmentRow
                      key={p.id}
                      item={p}
                      pct={pct}
                      isOrder={isOrder}
                      badge={styles.badge}
                      bar={styles.bar}
                      expanded={trackingId === p.id}
                      onReorder={() => setReorderItem(p)}
                      onEdit={() => setEditItem(p)}
                      onTrack={() =>
                        setTrackingId((cur) => (cur === p.id ? null : p.id))
                      }
                    />
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReorderRequisitionModal item={reorderItem} onClose={() => setReorderItem(null)} />
      <EditThresholdModal item={editItem} onClose={() => setEditItem(null)} />
      {shopModalOpen && userInitiatedReorder && (
        <ShopForOrderModal
          open={true}
          itemName={reorderItem?.name}
          quantity={reorderItem?.currentStock}
          onClose={() => {
            setShopModalOpen(false)
            setUserInitiatedReorder(false)
          }}
        />
      )}
      {warehouseRequestOpen && (
        <WarehouseRequestModal
          open={true}
          onClose={() => setWarehouseRequestOpen(false)}
        />
      )}
    </ConsoleLayout>
  )
}

interface RowProps {
  item: ProcurementItem
  pct: number
  isOrder: boolean
  badge: string
  bar: string
  expanded: boolean
  onReorder: () => void
  onEdit: () => void
  onTrack: () => void
}

function FragmentRow({
  item,
  pct,
  isOrder,
  badge,
  bar,
  expanded,
  onReorder,
  onEdit,
  onTrack,
}: RowProps) {
  return (
    <>
      <tr className="border-t border-border/60 align-middle">
        <td className="px-5 py-4">
          <div className="size-12 overflow-hidden rounded-md bg-muted">
            <img
              src={item.image || '/placeholder.svg'}
              alt={item.name}
              className="size-full object-cover"
            />
          </div>
        </td>
        <td className="px-5 py-4">
          <p className="font-serif text-base font-medium leading-tight text-card-foreground">
            {item.name}
          </p>
          <p className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {item.category}
          </p>
        </td>
        <td className="px-5 py-4 text-xs text-muted-foreground">
          <span className="font-serif text-lg text-card-foreground">{item.currentStock}</span> {item.unit}
        </td>
        <td className="px-5 py-4 font-serif text-base text-muted-foreground">{item.threshold}</td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className="text-[0.65rem] font-medium text-muted-foreground">{pct}%</span>
          </div>
        </td>
        <td className="px-5 py-4">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
              badge,
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {item.status}
          </span>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center justify-end gap-3">
            {isOrder ? (
              <button
                type="button"
                onClick={onTrack}
                className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary underline-offset-4 transition hover:underline"
              >
                Track
              </button>
            ) : (
              <button
                type="button"
                onClick={onReorder}
                className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary underline-offset-4 transition hover:underline"
              >
                Reorder
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground underline-offset-4 transition hover:text-card-foreground hover:underline"
            >
              Edit
            </button>
          </div>
        </td>
      </tr>
      {isOrder && expanded && (
        <tr className="border-t border-border/40 bg-muted/30">
          <td colSpan={7} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
              <div>
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  PO Reference
                </span>
                <p className="mt-0.5 font-mono text-card-foreground">{item.poRef ?? '—'}</p>
              </div>
              <div>
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Reorder Quantity
                </span>
                <p className="mt-0.5 text-card-foreground">
                  {item.reorderQty ?? '—'} {item.unit}
                </p>
              </div>
              <div>
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Estimated Arrival
                </span>
                <p className="mt-0.5 text-card-foreground">
                  {item.etaHours != null ? `${item.etaHours}h` : '—'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em]">
                  En route — supplier confirmed
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
