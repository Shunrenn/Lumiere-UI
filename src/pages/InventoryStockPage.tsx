import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, ChevronDown, Grid2X2, List } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { AddNewAssetModal } from '@/components/AddNewAssetModal'
import { AssetInformationModal } from '@/components/AssetInformationModal'
import { ReorderRequisitionModal } from '@/components/ReorderRequisitionModal'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { useInventoryOps } from '@/lib/inventory-ops'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import { GridRevealContainer } from '@/components/GridRevealContainer'
import type { InventoryItem, ProcurementItem, StockStatus } from '@/lib/types'

// Map a warehouse inventory category onto an Event Planner décor category so a
// newly registered asset lands in the right group of the canvas side panel.
function toDecorCategory(warehouseCategory: string): string {
  const c = warehouseCategory.toLowerCase()
  if (c.includes('light') || c.includes('ambiance') || c.includes('wax')) {
    return 'Lighting & Atmosphere'
  }
  if (c.includes('textile') || c.includes('glass') || c.includes('beverage') || c.includes('table')) {
    return 'Textiles & Tableware'
  }
  if (c.includes('décor') || c.includes('decor') || c.includes('backdrop') || c.includes('floristry') || c.includes('greenery')) {
    return 'Moodboard & Inspiration'
  }
  return 'Furniture Stock'
}

const statusMeta: Record<StockStatus, { badge: string; dot: string; bar: string }> = {
  Available: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-600' },
  'Low Stock': { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  'Critical Deficit': { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', bar: 'bg-destructive' },
  'Order Placed': { badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', bar: 'bg-sky-500' },
  Depleted: { badge: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground', bar: 'bg-muted-foreground' },
  'In Maintenance': { badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', bar: 'bg-indigo-500' },
}

const FILTER_STATES: StockStatus[] = [
  'Available',
  'Low Stock',
  'Critical Deficit',
  'In Maintenance',
]

function StatusBadge({ status }: { status: StockStatus }) {
  const meta = statusMeta[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
        meta.badge,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {status}
    </span>
  )
}

const CATEGORIES = [
  'Seating · Ceremony',
  'Furniture · Banquet',
  'Lighting · Statement',
  'Décor · Backdrop',
  'Ambiance · Wax Goods',
  'Beverage · Glassware',
  'Floristry · Greenery',
  'Others',
]

function deriveStatus(stock: number, capacity: number): StockStatus {
  if (stock <= 0) return 'Depleted'
  const pct = capacity > 0 ? stock / capacity : 1
  if (pct <= 0.15) return 'Critical Deficit'
  if (pct < 0.5) return 'Low Stock'
  return 'Available'
}

const SORT_OPTIONS = [
  { label: 'Asset ID ↑', value: 'id-asc' },
  { label: 'Asset ID ↓', value: 'id-desc' },
  { label: 'Name A–Z', value: 'name-asc' },
  { label: 'Name Z–A', value: 'name-desc' },
  { label: 'Stock: High → Low', value: 'stock-desc' },
  { label: 'Stock: Low → High', value: 'stock-asc' },
]

export function InventoryStockPage() {
  const { inventory: items, addInventoryItem, updateInventoryItem, completeMaintenance } = usePortal()
  const liveOps = useInventoryOps()
  // Executive and Admin have read-only oversight; Warehouse Managers mutate the registry.
  const { isAdmin, isExecutive } = useAuth()
  const { intent, clearIntent } = useNav()
  const readOnly = isAdmin || isExecutive
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<StockStatus | 'All'>('All')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('id-asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<InventoryItem | null>(null)
  const [reorderItem, setReorderItem] = useState<ProcurementItem | null>(null)
  const [maintenanceConfirmAsset, setMaintenanceConfirmAsset] = useState<InventoryItem | null>(null)

  // A dashboard "restock request" Open hands over a reorder-asset intent.
  // Warehouse Managers get the reorder requisition; read-only roles see the
  // asset detail so they can review the shortage.
  useEffect(() => {
    if (intent?.kind === 'reorder-asset') {
      const target = items.find((i) => i.id === intent.payload?.id)
      if (target) {
        if (readOnly) setSelectedAsset(target)
        else openReorder(target)
      }
      clearIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  const openReorder = (item: InventoryItem) => {
    const procurement: ProcurementItem = {
      id: item.id,
      assetId: item.assetId,
      name: item.name,
      category: item.category,
      currentStock: item.stock,
      threshold: item.capacity,
      unit: item.unit ?? 'pcs',
      status: item.status === 'Critical Deficit' ? 'Critical Deficit' : 'Low Stock',
    }
    setReorderItem(procurement)
  }

  const counts = useMemo(() => {
    const tally: Record<string, number> = {}
    FILTER_STATES.forEach((s) => {
      tally[s] = items.filter((i) => i.status === s).length
    })
    return tally
  }, [items])

  const metrics = useMemo(
    () => ({
      total: items.length,
      available: items.filter((i) => i.status === 'Available').length,
      maintenance: items.filter((i) => i.status === 'In Maintenance').length,
      restock: items.filter((i) => i.status === 'Low Stock' || i.status === 'Critical Deficit')
        .length,
    }),
    [items],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    let result = items.filter((i) => {
      const matchesState = stateFilter === 'All' || i.status === stateFilter
      const matchesCategory = !categoryFilter || i.category === categoryFilter
      const matchesQuery =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.assetId.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      return matchesState && matchesCategory && matchesQuery
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'id-asc') return a.assetId.localeCompare(b.assetId)
      if (sortBy === 'id-desc') return b.assetId.localeCompare(a.assetId)
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'stock-desc') return b.stock - a.stock
      if (sortBy === 'stock-asc') return a.stock - b.stock
      return 0
    })
    return result
  }, [query, stateFilter, categoryFilter, sortBy, items])

  // Heading + search + add for Warehouse ConsoleLayout
  const headerBlock = (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Asset Inventory
          </h1>
          <p className="mt-1.5 text-sm normal-case tracking-normal text-muted-foreground">
            {readOnly
              ? 'Registry oversight — asset stock levels, maintenance state, and restock exposure.'
              : 'Track asset stock levels, maintenance state, and restock requisitions across the registry.'}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Live field sync: {liveOps.inventory.length} operational items · {liveOps.orders.filter((order) => order.status !== 'Received').length} open orders · {liveOps.batches.filter((batch) => batch.status === 'In Transit').length} in transit
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, category…"
              className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-72"
            />
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="size-3.5" />
              Add New Item
            </button>
          )}
        </div>
      </div>

      {/* Compact Stat Strip */}
      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
        <CompactStatStrip
          stats={[
            { label: 'Total Assets', value: metrics.total },
            { label: 'Available', value: metrics.available },
            { label: 'In Maintenance', value: metrics.maintenance },
            { label: 'Restock Needed', value: metrics.restock },
          ]}
        />
      </div>
    </div>
  )

  const bodyContent = (
    <>
      {/* Controls row */}
      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-3">
          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full appearance-none rounded-md border border-border bg-card py-2 pl-4 pr-9 text-xs font-medium text-muted-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-auto"
            >
              <option value="">Filter: Category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>Filter: {c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none rounded-md border border-border bg-card py-2 pl-4 pr-9 text-xs font-medium text-muted-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-auto"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>Sort: {o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          {categoryFilter && (
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className="rounded-full border border-border bg-card px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-muted"
            >
              Clear Filter ×
            </button>
          )}
        </div>

      </div>

      {/* Status filter tabs — plain label + count, matching every other table */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStateFilter('All')}
            className={cn(
              'rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] transition',
              stateFilter === 'All'
                ? 'bg-neutral-900 text-white'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            All ({items.length})
          </button>
          {FILTER_STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStateFilter((cur) => (cur === s ? 'All' : s))}
              aria-pressed={stateFilter === s}
              className={cn(
                'rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] transition',
                stateFilter === s
                  ? 'bg-neutral-900 text-white'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {s} ({counts[s] ?? 0})
            </button>
          ))}
          <div className="ml-auto inline-flex shrink-0 rounded-md border border-border bg-card p-1" aria-label="Inventory view">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              className={cn('rounded-sm p-2 transition', viewMode === 'grid' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-muted')}
            >
              <Grid2X2 className="size-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={cn('rounded-sm p-2 transition', viewMode === 'list' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-muted')}
            >
              <List className="size-4" />
            </button>
          </div>
      </div>

      {/* Inventory views */}
      {filtered.length === 0 ? (
        <div className="mt-16 text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">No items available</div>
      ) : viewMode === 'grid' ? (
        <div className="mt-6">
          <GridRevealContainer maxHeightClass="max-h-[calc(100vh-320px)] min-h-[460px]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((item) => {
                const meta = statusMeta[item.status]
                const percentage = item.capacity ? Math.min(100, Math.round((item.stock / item.capacity) * 100)) : 0
                return (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative aspect-[1.28] overflow-hidden bg-muted">
                      <img src={item.image || '/placeholder.svg'} alt={item.name} className="size-full object-cover transition duration-500 hover:scale-105" />
                      <div className="absolute left-3 top-3"><StatusBadge status={item.status} /></div>
                      <span className="absolute right-3 top-3 rounded bg-foreground/90 px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-background">{item.assetId}</span>
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-primary">{item.category}</p>
                        <h2 className="mt-1 font-serif text-lg leading-tight text-card-foreground">{item.name}</h2>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground"><span>Stock level</span><span className="text-card-foreground">{item.stock} / {item.capacity} {item.unit ?? 'units'}</span></div>
                        <div className="mt-2 h-1 rounded-full bg-muted"><div className={cn('h-full rounded-full', meta.bar)} style={{ width: `${percentage}%` }} /></div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/70 pt-3">
                        <span className="text-[0.6rem] text-muted-foreground">{item.updated}</span>
                        <div className="flex gap-3">
                          {!readOnly && (item.status === 'Critical Deficit' || item.status === 'Low Stock') && <button type="button" onClick={() => openReorder(item)} className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-rose-600">Reorder</button>}
                          {!readOnly && item.status === 'In Maintenance' && <button type="button" onClick={() => setMaintenanceConfirmAsset(item)} className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-indigo-600">Complete Maintenance</button>}
                          <button type="button" onClick={() => setSelectedAsset(item)} className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-primary">View item</button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </GridRevealContainer>
        </div>
      ) : (
        <div className="mt-7 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left"><thead><tr className="bg-muted/50">{['Asset', 'Item Name', 'Category', 'Stock Level', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-border/60 align-middle"><td className="px-4 py-3"><div className="size-12 overflow-hidden rounded-md bg-muted"><img src={item.image || '/placeholder.svg'} alt={item.name} className="size-full object-cover" /></div></td><td className="px-4 py-3"><p className="font-serif text-base font-medium text-card-foreground">{item.name}</p><p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">{item.assetId}</p></td><td className="px-4 py-3 text-xs text-muted-foreground">{item.category}</td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="font-serif text-base text-card-foreground">{item.stock}</span> / {item.capacity}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-3">{!readOnly && (item.status === 'Critical Deficit' || item.status === 'Low Stock') && <button type="button" onClick={() => openReorder(item)} className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-rose-600">Reorder</button>}{!readOnly && item.status === 'In Maintenance' && <button type="button" onClick={() => setMaintenanceConfirmAsset(item)} className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-indigo-600">Complete Maintenance</button>}<button type="button" onClick={() => setSelectedAsset(item)} className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary">View Asset</button></div></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddNewAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(data) => {
          const quantity = Number(data.quantity) || 0
          const assetId = `LM-${Math.floor(1000 + Math.random() * 9000)}`
          const newItem: InventoryItem = {
            id: `i-${Date.now()}`,
            assetId,
            name: data.assetName,
            category: data.category,
            image: data.image || '/placeholder.svg',
            stock: quantity,
            capacity: quantity > 0 ? quantity : 1,
            status: deriveStatus(quantity, quantity > 0 ? quantity : 1),
            updated: 'Added just now',
            description: data.description,
            dateAdded: new Date().toLocaleDateString(),
            store: data.store,
            representative: data.representative,
            contact: data.contact,
            height: data.height,
            width: data.width,
            weight: data.weight,
            fragile: data.fragile,
            unit: data.unit,
            cost: data.cost,
            costPerUnit: data.costPerUnit,
          }
          addInventoryItem(newItem)
          setIsAddModalOpen(false)

          // Publish to the Event Planner décor library so the new asset shows up
          // in the canvas side panel. Fire-and-forget; UI already updated.
          void supabase
            .from('planner_assets')
            .insert({
              sku: assetId,
              name: data.assetName,
              decor_category: toDecorCategory(data.category),
              image: data.image || null,
              warehouse_stock: quantity,
            })
            .then(({ error }) => {
              if (error) console.error('[v0] Failed to publish asset to planner library:', error)
            })
        }}
      />

      <ReorderRequisitionModal
        item={reorderItem}
        onClose={() => setReorderItem(null)}
      />

      <AssetInformationModal
        asset={
          selectedAsset
            ? {
                id: selectedAsset.id,
                name: selectedAsset.name,
                description: selectedAsset.description ?? selectedAsset.category,
                assetId: selectedAsset.assetId,
                dateAdded: selectedAsset.dateAdded ?? new Date().toLocaleDateString(),
                store: selectedAsset.store ?? '—',
                representative: selectedAsset.representative ?? '—',
                contact: selectedAsset.contact ?? '—',
                height: selectedAsset.height ?? '0',
                width: selectedAsset.width ?? '0',
                weight: selectedAsset.weight ?? '0',
                category: selectedAsset.category,
                tier: 'Standard',
                fragile: selectedAsset.fragile ?? false,
                quantity: selectedAsset.stock,
                unit: selectedAsset.unit ?? 'pcs',
                cost: selectedAsset.cost ?? 0,
                costPerUnit: selectedAsset.costPerUnit ?? 0,
                image: selectedAsset.image,
              }
            : null
        }
        onClose={() => setSelectedAsset(null)}
        readOnly={readOnly}
        onSave={(updated) => {
          const existing = items.find((it) => it.id === updated.id)
          if (!existing) return
          const capacity = Math.max(existing.capacity, updated.quantity)
          updateInventoryItem({
            ...existing,
            name: updated.name,
            category: updated.category,
            description: updated.description,
            store: updated.store,
            representative: updated.representative,
            contact: updated.contact,
            height: updated.height,
            width: updated.width,
            weight: updated.weight,
            fragile: updated.fragile,
            unit: updated.unit,
            cost: updated.cost,
            costPerUnit: updated.costPerUnit,
            stock: updated.quantity,
            capacity,
            status: deriveStatus(updated.quantity, capacity),
            updated: 'Updated just now',
          })
          setSelectedAsset((cur) =>
            cur && cur.id === updated.id
              ? { ...cur, name: updated.name, category: updated.category, description: updated.description }
              : cur,
          )
        }}
      />
    </>
  )

  return (
    <ConsoleLayout>
      <div className="mt-4">{headerBlock}</div>
      {bodyContent}
      {maintenanceConfirmAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-medium text-foreground">Confirm Return to Stock</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Are you sure maintenance is complete for <strong className="text-foreground">{maintenanceConfirmAsset.name}</strong> ({maintenanceConfirmAsset.assetId})?
              This will transition the asset status back to <strong className="text-emerald-600">Available</strong> and record an audit log entry.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMaintenanceConfirmAsset(null)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  completeMaintenance(maintenanceConfirmAsset.id, 'Warehouse Ops Manager')
                  setMaintenanceConfirmAsset(null)
                  setSelectedAsset(null)
                }}
                className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-indigo-700"
              >
                Complete Maintenance
              </button>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  )
}
