import { useMemo, useState } from 'react'
import { ChevronDown, Grid2X2, List, Plus, Search, X, Palette } from 'lucide-react'
import {
  addCatalogAsset,
  useCatalogAssets,
  type AssetCategory,
  type AssetStatus,
  type CatalogAsset,
} from '@/lib/warehouse-catalog'
import { AssetCard, ASSET_STATUS_TONE, getTierGlanceDisplay } from '@/components/warehouse/asset-catalog/AssetCard'
import { AssetDetailModal } from '@/components/warehouse/asset-catalog/AssetDetailModal'
import { AddAssetModal, type NewAssetDraft } from '@/components/warehouse/asset-catalog/AddAssetModal'
import { WarehousePaintRegistryModal } from '@/components/warehouse/paint/WarehousePaintRegistryModal'
import { GridRevealContainer } from '@/components/GridRevealContainer'
import { Pill } from '@/components/warehouse/shared/Pill'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { WarehouseModuleHeader } from '@/components/warehouse/WarehouseModuleHeader'

const FIXED_TIER_ORDER: AssetCategory[] = [
  'Event Assets',
  'Production Assets',
  'Stockroom Assets',
  'Rental Assets',
  'Administrative Assets',
]

const STATUS_FILTERS: Array<AssetStatus | 'All'> = [
  'All',
  'Available',
  'Low Stock',
  'Critical Deficit',
  'Deployed',
  'Lost In Action',
]

const CATEGORY_ARTWORK: Record<AssetCategory, string> = {
  'Event Assets': '/assets/inventory/floral-arch.png',
  'Production Assets': '/images/elements/chandelier.png',
  'Stockroom Assets': '/assets/inventory/pillar-candles.png',
  'Rental Assets': '/assets/inventory/tiffany-chair.png',
  'Administrative Assets': '/images/decor/minimalist-table.png',
}

function classificationLabel(category: AssetCategory | 'All') {
  return category === 'All' ? 'All Assets' : category.replace(/s$/, '')
}

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

interface AssetCatalogModuleProps {
  onClose?: () => void
  readOnly?: boolean
  embedded?: boolean
  executiveKiosk?: boolean
}

export function AssetCatalogModule({ onClose, readOnly = false, embedded = false, executiveKiosk = false }: AssetCatalogModuleProps) {
  const { isWarehouseAssociate } = useAuth()
  const effectiveReadOnly = readOnly
  const assets = useCatalogAssets()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'All'>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<CatalogAsset | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [paintOpen, setPaintOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assets.filter((asset) => {
      const matchesCategory = categoryFilter === 'All' || asset.category === categoryFilter
      const matchesStatus = statusFilter === 'All' || asset.status === statusFilter
      const matchesQuery = !q || asset.name.toLowerCase().includes(q)
      return matchesCategory && matchesStatus && matchesQuery
    })
  }, [assets, query, categoryFilter, statusFilter])

  // Group items by Tier in fixed order
  const tierGroups = useMemo(() => {
    const map = new Map<AssetCategory, CatalogAsset[]>()
    FIXED_TIER_ORDER.forEach((t) => map.set(t, []))
    filtered.forEach((asset) => {
      const list = map.get(asset.category) ?? []
      list.push(asset)
      map.set(asset.category, list)
    })
    return Array.from(map.entries()).filter(([_, items]) => items.length > 0)
  }, [filtered])

  const categoryCounts = useMemo(
    () =>
      FIXED_TIER_ORDER.reduce((counts, category) => {
        counts[category] = assets.filter((asset) => asset.category === category).length
        return counts
      }, {} as Record<AssetCategory, number>),
    [assets],
  )

  const handleCreate = (draft: NewAssetDraft) => {
    const seed = hashOf(`${draft.name}-${Date.now()}`)
    const assetId = `LM-${draft.category.slice(0, 2).toUpperCase()}-${1000 + assets.length + (seed % 900)}`
    const isFractional = draft.category === 'Event Assets' || draft.category === 'Stockroom Assets'
    const status: AssetStatus = isFractional
      ? (draft.currentStock ?? 0) === 0
        ? 'Critical Deficit'
        : (draft.currentStock ?? 0) / Math.max(1, draft.threshold ?? 50) < 0.5
          ? 'Low Stock'
          : 'Available'
      : 'Available'

    const newAsset: CatalogAsset = {
      id: `cat-new-${Date.now()}`,
      assetId,
      name: draft.name,
      itemCallName: draft.itemCallName || draft.name,
      category: draft.category,
      subCategory: draft.subCategory || 'General',
      description: draft.description || `Custom ${draft.category} entry added to warehouse registry.`,
      status,
      image: draft.image || '/placeholder.svg',
      unit: draft.unit || 'pcs',
      dimensions: draft.dimensions || { height: '30 cm', width: '30 cm', depth: '30 cm', weight: '5 kg' },
      is_circular: draft.is_circular,
      shape: draft.shape,
      circumference: draft.circumference,
      material: draft.material || 'Standard Composite',
      colorType: draft.colorType || 'mono',
      colorPrimary: draft.colorPrimary || 'Standard',
      colorSecondary: draft.colorSecondary,
      tags: draft.tags && draft.tags.length > 0 ? draft.tags : ['New Registry Entry'],
      purchaseCost: draft.purchaseCost ?? 0,
      costPerUnit: draft.costPerUnit ?? draft.purchaseCost ?? 0,
      dateAdded: new Date().toISOString().slice(0, 10),
      primaryVendorId: draft.primaryVendorId || 'ven-01',
      backupVendorId: draft.backupVendorId,

      // Event Asset
      currentStock: draft.currentStock,
      threshold: draft.threshold,
      lifeSpan: draft.lifeSpan,
      damageReplacementCost: draft.damageReplacementCost,

      // Bespoke
      bespokeStage: draft.bespokeStage || 'Prepping',
      bespokeCrew: 'Fab Team — Ronnie',
      rawMaterials: draft.rawMaterials,
      manCount: draft.manCount,
      finishTimeMinutes: draft.finishTimeMinutes,
      revisionTimeMinutes: draft.revisionTimeMinutes,

      // Stockroom
      criticalThreshold: draft.criticalThreshold,
      ceilingCap: draft.ceilingCap,
      pricePerPack: draft.pricePerPack,

      // Rental
      supplierDetails: draft.supplierDetails,
      supplierContact: draft.supplierContact,
      lengthOfRent: draft.lengthOfRent,
      overduePenaltyFee: draft.overduePenaltyFee,
      onLoanDueDate: draft.onLoanDueDate,

      // Office Asset
      vendorDetails: draft.vendorDetails,
      custodian: draft.custodian,
    }
    addCatalogAsset(newAsset)
    setAddOpen(false)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Kiosk-style inventory header */}
      <div className={cn('flex flex-col', !embedded && 'border-b border-border px-0 py-7')}>
        {!embedded && (
          <div className="flex items-start justify-between gap-4">
            <WarehouseModuleHeader
              eyebrow="Asset Kiosk"
              title={isWarehouseAssociate ? 'Inventory' : 'Asset Inventory'}
              description="Browse, search, and inspect assets by classification and availability."
            />
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close and return to dashboard"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-end">
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {!effectiveReadOnly && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
              >
                <Plus className="size-3.5" />
                Add Item
              </button>
            )}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, tag, classification…"
                className="h-9 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Classification rail plus gallery */}
      <div className="min-h-0 flex-1 overflow-y-auto px-0 py-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
          <aside aria-label="Asset classifications" className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Classifications</p>
              <span className="text-xs text-muted-foreground">5 categories</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                aria-pressed={categoryFilter === 'All'}
                className={cn('flex min-w-0 items-center gap-3 rounded-xl border p-2 text-left transition', categoryFilter === 'All' ? 'border-primary bg-primary/15' : 'border-border bg-card hover:border-primary/50')}
              >
                <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted"><img src="/assets/inventory/crystal-chandelier.png" alt="" className="size-full object-cover" /></div>
                <span className="min-w-0 flex-1"><span className="block whitespace-normal text-[0.9rem] font-semibold leading-tight text-foreground">All</span><span className="block text-xs text-muted-foreground">Browse collection</span></span>
                <span className="rounded-full bg-background/70 px-2 py-1 text-xs font-bold text-muted-foreground">{assets.length}</span>
              </button>
              {FIXED_TIER_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  aria-pressed={categoryFilter === category}
                  className={cn('flex min-w-0 items-center gap-3 rounded-xl border p-2 text-left transition', categoryFilter === category ? 'border-primary bg-primary/15' : 'border-border bg-card hover:border-primary/50')}
                >
                  <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted"><img src={CATEGORY_ARTWORK[category]} alt="" className="size-full object-cover" /></div>
                  <span className="min-w-0 flex-1"><span className="block whitespace-normal text-[0.9rem] font-semibold leading-tight text-foreground">{category}</span><span className="block text-xs text-muted-foreground">Browse collection</span></span>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">{categoryCounts[category]}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 min-[700px]:flex-row min-[700px]:items-center min-[700px]:justify-between">
              <div><h2 className="font-serif text-2xl font-medium text-foreground">{classificationLabel(categoryFilter)}</h2><p className="mt-1 text-xs text-muted-foreground">{filtered.length} item{filtered.length === 1 ? '' : 's'} shown</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <div className={cn('relative h-10 w-48 rounded-lg border bg-background', statusFilter === 'All' ? 'border-border' : 'border-primary bg-primary/10')}>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground">Status:</span>
                  <select
                    aria-label="Filter assets by status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as AssetStatus | 'All')}
                    className="size-full appearance-none rounded-lg bg-transparent pl-[4.35rem] pr-9 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {STATUS_FILTERS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={() => setPaintOpen(true)}
                  title="Open Paint Registry"
                  aria-label="Open Paint Registry"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                ><Palette className="size-4" /></button>
                <div className="inline-flex shrink-0 rounded-lg border border-border bg-background p-1" aria-label="Asset view">
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                    className={cn('rounded-md p-2 transition', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                  ><Grid2X2 className="size-3.5" /></button>
                  <button type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={cn('rounded-md p-2 transition', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}><List className="size-3.5" /></button>
                </div>
              </div>
            </div>
            {tierGroups.length === 0 ? (
              <div className="mt-10 text-center text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                No assets match the current filters
              </div>
            ) : viewMode === 'grid' ? (
              /* ─── GRID VIEW: Tier-Grouped Sections with Sticky Headers ─── */
              <GridRevealContainer>
                <div className="space-y-8 pb-8">
                  {tierGroups.map(([tierName, tierItems]) => (
                    <div key={tierName} className="space-y-3">
                      {/* Sticky Section Header */}
                      {categoryFilter === 'All' && <div className="sticky top-0 z-10 border-b border-border/80 bg-background/95 py-3 backdrop-blur-sm">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">
                          {tierName} ({tierItems.length})
                        </span>
                      </div>}

                      {/* 6-Column Card Grid for this Tier */}
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {tierItems.map((asset) => (
                          <AssetCard key={asset.id} asset={asset} onOpen={() => setSelectedAsset(asset)} executiveKiosk={executiveKiosk} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </GridRevealContainer>
            ) : (
              /* ─── LIST VIEW: Tier-Grouped Sections with Sticky Headers ─── */
              <div className="space-y-6 pr-1">
                {tierGroups.map(([tierName, tierItems]) => (
                  <div key={tierName} className="space-y-2">
                    {/* Sticky Section Header */}
                    {categoryFilter === 'All' && <div className="sticky top-0 z-10 border-b border-border/80 bg-background/95 py-2 backdrop-blur-sm">
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">
                        {tierName} ({tierItems.length})
                      </span>
                    </div>}

                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                      <table className="w-full min-w-[720px] text-left">
                        <thead>
                          <tr className="bg-muted/50">
                            {['Item', 'Category', 'Status', 'Detail', ''].map((h) => (
                              <th key={h} className="px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tierItems.map((asset) => {
                            const display = getTierGlanceDisplay(asset)
                            return (
                              <tr
                                key={asset.id}
                                onClick={() => setSelectedAsset(asset)}
                                className="cursor-pointer border-t border-border/60 align-middle transition-colors hover:bg-accent/50"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                                      <img src={asset.image || '/placeholder.svg'} alt={asset.name} crossOrigin="anonymous" className="size-full object-cover" />
                                    </div>
                                    <p className="font-serif text-sm text-card-foreground">{asset.name}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{asset.category}</td>
                                <td className="px-4 py-3">
                                  <Pill tone={ASSET_STATUS_TONE[asset.status]}>{asset.status}</Pill>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{display.text}</td>
                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedAsset(asset)
                                    }}
                                    className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary hover:underline"
                                  >
                                    View item
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Floating Add Item FAB */}
      {!effectiveReadOnly && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add item"
          className="fixed bottom-8 right-8 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      )}

      {selectedAsset && <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
      {addOpen && <AddAssetModal onClose={() => setAddOpen(false)} onCreate={handleCreate} />}
      {paintOpen && <WarehousePaintRegistryModal onClose={() => setPaintOpen(false)} />}
    </div>
  )
}
