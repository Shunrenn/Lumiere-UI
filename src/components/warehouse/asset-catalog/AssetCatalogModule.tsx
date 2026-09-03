import { useMemo, useState } from 'react'
import { Grid2X2, List, Plus, Search, X } from 'lucide-react'
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
import { GridRevealContainer } from '@/components/GridRevealContainer'
import { Pill } from '@/components/warehouse/shared/Pill'
import { cn } from '@/lib/utils'

const FIXED_TIER_ORDER: AssetCategory[] = [
  'Event Asset',
  'Bespoke',
  'Stockroom',
  'Rental',
  'Office Asset',
]

const CATEGORY_FILTERS: Array<AssetCategory | 'All'> = [
  'All',
  'Event Asset',
  'Bespoke',
  'Stockroom',
  'Rental',
  'Office Asset',
]

const STATUS_FILTERS: Array<AssetStatus | 'All'> = [
  'All',
  'Available',
  'Low Stock',
  'Critical Deficit',
  'Deployed',
  'Lost In Action',
]

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

interface AssetCatalogModuleProps {
  onClose: () => void
}

export function AssetCatalogModule({ onClose }: AssetCatalogModuleProps) {
  const assets = useCatalogAssets()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'All'>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<CatalogAsset | null>(null)
  const [addOpen, setAddOpen] = useState(false)

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

  const handleCreate = (draft: NewAssetDraft) => {
    const seed = hashOf(`${draft.name}-${Date.now()}`)
    const assetId = `LM-${draft.category.slice(0, 2).toUpperCase()}-${1000 + assets.length + (seed % 900)}`
    const isFractional = draft.category === 'Event Asset' || draft.category === 'Stockroom'
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
    <div className="relative flex h-full flex-1 flex-col overflow-y-auto">
      {/* Header controls & filters */}
      <div className="flex flex-col gap-1.5 border-b border-border px-6 py-2.5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.56rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="font-serif text-lg font-medium leading-tight text-foreground">Asset Catalog</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and return to dashboard"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets…"
              className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex shrink-0 rounded-md border border-border bg-background p-1" aria-label="Asset view">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className={cn('rounded-sm p-1.5 transition', viewMode === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
              >
                <Grid2X2 className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                className={cn('rounded-sm p-1.5 transition', viewMode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
              >
                <List className="size-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="size-3.5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                aria-pressed={categoryFilter === c}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.08em] transition',
                  categoryFilter === c
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.08em] transition',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area (Tier-Grouped Sections with Sticky Headers) */}
      <div className="flex-1 px-6 py-4 sm:px-10">
        {tierGroups.length === 0 ? (
          <div className="mt-10 text-center text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            No assets match the current filters
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID VIEW: Tier-Grouped Sections with Sticky Headers ─── */
          <GridRevealContainer maxHeightClass="max-h-[calc(100vh-230px)]">
            <div className="space-y-6 pb-6">
              {tierGroups.map(([tierName, tierItems]) => (
                <div key={tierName} className="space-y-3">
                  {/* Sticky Section Header */}
                  <div className="sticky top-0 z-10 border-b border-border/80 bg-background/95 py-2 backdrop-blur-sm">
                    <span className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">
                      {tierName} ({tierItems.length})
                    </span>
                  </div>

                  {/* 6-Column Card Grid for this Tier */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
                    {tierItems.map((asset) => (
                      <AssetCard key={asset.id} asset={asset} onOpen={() => setSelectedAsset(asset)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GridRevealContainer>
        ) : (
          /* ─── LIST VIEW: Tier-Grouped Sections with Sticky Headers ─── */
          <div className="space-y-6 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
            {tierGroups.map(([tierName, tierItems]) => (
              <div key={tierName} className="space-y-2">
                {/* Sticky Section Header */}
                <div className="sticky top-0 z-10 border-b border-border/80 bg-background/95 py-2 backdrop-blur-sm">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">
                    {tierName} ({tierItems.length})
                  </span>
                </div>

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
      </div>

      {/* Floating Add Item FAB */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Add item"
        className="fixed bottom-8 right-8 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      {selectedAsset && <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
      {addOpen && <AddAssetModal onClose={() => setAddOpen(false)} onCreate={handleCreate} />}
    </div>
  )
}
