import { useState, useMemo } from 'react'
import { Search, ChevronDown, Grid2X2, List, ShieldAlert } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import { AssetInformationModal } from '@/components/AssetInformationModal'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { useInventoryOps } from '@/lib/inventory-ops'
import { cn } from '@/lib/utils'
import { ASSET_CATEGORIES, type InventoryItem, type StockStatus } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const statusMeta: Record<StockStatus, { badge: string; dot: string; bar: string }> = {
  Available: {
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  'Low Stock': {
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  'Critical Deficit': {
    badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
  'Order Placed': {
    badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
  },
  Depleted: {
    badge: 'bg-muted text-muted-foreground border border-border',
    dot: 'bg-muted-foreground',
    bar: 'bg-muted-foreground',
  },
  'In Maintenance': {
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
}

const FILTER_STATES: StockStatus[] = [
  'Available',
  'Low Stock',
  'Critical Deficit',
  'In Maintenance',
]

const SORT_OPTIONS = [
  { label: 'Asset ID ↑', value: 'id-asc' },
  { label: 'Asset ID ↓', value: 'id-desc' },
  { label: 'Name A–Z', value: 'name-asc' },
  { label: 'Name Z–A', value: 'name-desc' },
  { label: 'Stock: High → Low', value: 'stock-desc' },
  { label: 'Stock: Low → High', value: 'stock-asc' },
]

export function ExecutiveLiteAssetAllocation() {
  const { navigate } = useNav()
  const { canAccessAssetInventory } = useAuth()
  const { inventory: items } = usePortal()
  const liveOps = useInventoryOps()

  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<StockStatus | 'All'>('All')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('id-asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<InventoryItem | null>(null)

  const destination = (id: ExecutiveDestinationId) => navigate(id)

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
    const q = query.toLowerCase().trim()
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

  // Direct RBAC Capability Guard
  if (!canAccessAssetInventory) {
    return (
      <ExecutiveShell activeId="dashboard" onSelect={destination}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="size-7" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-foreground">Access Restricted</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Asset Inventory and Allocation capability is currently disabled for Executive accounts by the system administrator.
          </p>
          <button
            type="button"
            onClick={() => navigate('dashboard')}
            className="button-primary mt-6 text-xs"
          >
            Return to Executive Dashboard
          </button>
        </div>
      </ExecutiveShell>
    )
  }

  const stickyHeader = (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
            ASSET KIOSK · CLIENT PORTFOLIO
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Asset Allocation
          </h1>
          <p className="mt-1.5 text-sm normal-case tracking-normal text-muted-foreground">
            Registry oversight — asset stock levels, maintenance state, and allocation readiness.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
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
        </div>
      </div>

      {/* Stat Ribbon */}
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

  return (
    <>
      <ExecutiveShell activeId="inventory" onSelect={destination} stickyHeader={stickyHeader}>
        {/* Controls row matching Reference 2 */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Category filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none rounded-md border border-border bg-card py-2 pl-4 pr-9 text-xs font-medium text-muted-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-auto"
              >
                <option value="">Filter: Category</option>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    Filter: {c}
                  </option>
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
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Sort: {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Right side: Filter Pills + Grid/List Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStateFilter('All')}
                className={cn(
                  'rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition',
                  stateFilter === 'All'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                All ({metrics.total})
              </button>
              {FILTER_STATES.map((state) => {
                const count = items.filter((i) => i.status === state).length
                const active = stateFilter === state
                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setStateFilter(state)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {state} ({count})
                  </button>
                )
              })}
            </div>

            {/* Grid / List View Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded p-1.5 transition',
                  viewMode === 'grid'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label="Grid view"
                title="Grid view"
              >
                <Grid2X2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded p-1.5 transition',
                  viewMode === 'list'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label="List view"
                title="List view"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Display: Grid vs List */}
        {filtered.length === 0 ? (
          <div className="mt-8 flex min-h-[18rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="font-serif text-base font-medium text-foreground">No assets match criteria</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search query, status pills, or category filter.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((item) => {
              const meta = statusMeta[item.status] || statusMeta['Available']
              const pct = item.capacity > 0 ? Math.min(100, Math.round((item.stock / item.capacity) * 100)) : 100

              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg"
                >
                  <div>
                    {/* Image frame */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground/50">
                          <span className="font-serif text-2xl font-light">L</span>
                        </div>
                      )}
                      {/* Status badge top-left */}
                      <div className="absolute left-3 top-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] backdrop-blur-md',
                            meta.badge,
                          )}
                        >
                          <span className={cn('size-1.5 rounded-full', meta.dot)} />
                          {item.status}
                        </span>
                      </div>
                      {/* Asset ID badge top-right */}
                      <div className="absolute right-3 top-3">
                        <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-white backdrop-blur-md">
                          {item.assetId}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        {item.category}
                      </p>
                      <h3 className="mt-1 font-serif text-base font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>

                      {/* Stock level bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>STOCK LEVEL</span>
                          <span className="text-foreground">
                            {item.stock} / {item.capacity} {item.unit || 'PCS'}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full transition-all duration-300', meta.bar)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 bg-muted/10 text-xs">
                    <span className="text-[0.62rem] text-muted-foreground">
                      {item.updated || 'Active'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAsset(item)}
                      className="text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline transition-colors"
                    >
                      VIEW ITEM
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      ASSET ID
                    </th>
                    <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      NAME
                    </th>
                    <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      CATEGORY
                    </th>
                    <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      STOCK LEVEL
                    </th>
                    <th className="px-4 py-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      STATUS
                    </th>
                    <th className="px-4 py-3 text-right text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => {
                    const meta = statusMeta[item.status] || statusMeta['Available']
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                          {item.assetId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="size-8 rounded object-cover"
                              />
                            )}
                            <span className="font-serif text-sm font-medium text-foreground">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground font-mono">
                          {item.stock} / {item.capacity} {item.unit || 'PCS'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                              meta.badge,
                            )}
                          >
                            <span className={cn('size-1.5 rounded-full', meta.dot)} />
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedAsset(item)}
                            className="text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline"
                          >
                            VIEW ITEM
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ExecutiveShell>

      {/* Read-Only Asset Information Modal */}
      <AssetInformationModal
        asset={
          selectedAsset
            ? {
                id: selectedAsset.id,
                name: selectedAsset.name,
                description: selectedAsset.description || `${selectedAsset.name} luxury event decor specification.`,
                assetId: selectedAsset.assetId,
                dateAdded: selectedAsset.dateAdded || '2026-09-01',
                store: selectedAsset.store || 'Main Facility',
                representative: selectedAsset.representative || 'Warehouse Ops',
                contact: selectedAsset.contact || '+63 900 000 0000',
                height: selectedAsset.height || '—',
                width: selectedAsset.width || '—',
                weight: selectedAsset.weight || '—',
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
        readOnly={true}
      />
    </>
  )
}

export default ExecutiveLiteAssetAllocation
