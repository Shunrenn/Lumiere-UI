import { useMemo, useState } from 'react'
import { Grid2X2, List, Palette, Plus, Search } from 'lucide-react'
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

const CATEGORY_FILTER_LABELS: Record<AssetCategory, string> = {
  'Event Assets': 'Event Asset',
  'Production Assets': 'Bespoke',
  'Stockroom Assets': 'Stockroom',
  'Rental Assets': 'Rental',
  'Administrative Assets': 'Office Asset',
}

const PRIMARY_STATUS_FILTERS: Array<AssetStatus | 'All'> = ['All', 'Available', 'Low Stock', 'Critical Deficit']

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

interface AssetCatalogModuleProps {
  onClose?: () => void
  readOnly?: boolean
  embedded?: boolean
  executiveKiosk?: boolean
}

export function AssetCatalogModule({ readOnly = false, embedded = false, executiveKiosk = false }: AssetCatalogModuleProps) {
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
      const matchesQuery = !q || [
        asset.name,
        asset.assetId,
        asset.itemCallName,
        asset.category,
        asset.subCategory,
        asset.material,
        ...(asset.tags || []),
      ].filter(Boolean).some((value) => value!.toLowerCase().includes(q))
      return matchesCategory && matchesStatus && matchesQuery
    })
  }, [assets, query, categoryFilter, statusFilter])

  // Keep the gallery as one inventory collection. Category pills define the view.
  const tierGroups = useMemo(() => {
    return filtered.length > 0 ? [['Inventory', filtered] as const] : []
  }, [filtered])

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
      {/* Inventory heading and filter controls */}
      <div className={cn('flex flex-col', !embedded && 'border-b border-border px-0 py-7')}>
        {!embedded && (
          <div className="flex items-start justify-between gap-4">
            <WarehouseModuleHeader
              
              title={isWarehouseAssociate ? 'Inventory' : 'Asset Inventory'}
              description="Category-specific asset views, stock levels, and condition tracking."
            />
            
          </div>
        )}

        <div className="mt-7 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <div className="flex flex-wrap gap-2" aria-label="Filter assets by category">
              <button type="button" onClick={() => setCategoryFilter('All')} aria-pressed={categoryFilter === 'All'} className={cn('rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition', categoryFilter === 'All' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground')}>All</button>
              {FIXED_TIER_ORDER.map((category) => (
                <button key={category} type="button" onClick={() => setCategoryFilter(category)} aria-pressed={categoryFilter === category} className={cn('rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition', categoryFilter === category ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground')}>{CATEGORY_FILTER_LABELS[category]}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Filter assets by stock status">
              {PRIMARY_STATUS_FILTERS.map((status) => (
                <button key={status} type="button" onClick={() => setStatusFilter(status)} aria-pressed={statusFilter === status} className={cn('rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition', statusFilter === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground')}>{status}</button>
              ))}
              {STATUS_FILTERS.filter((status) => !PRIMARY_STATUS_FILTERS.includes(status)).map((status) => (
                <button key={status} type="button" onClick={() => setStatusFilter(status)} aria-pressed={statusFilter === status} className={cn('rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition', statusFilter === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground')}>{status}</button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:max-w-md xl:justify-end">
            <div className="inline-flex shrink-0 rounded-lg border border-border bg-background p-1" aria-label="Asset view">
              <button type="button" aria-label="Grid view" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={cn('rounded-md p-2 transition', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}><Grid2X2 className="size-3.5" /></button>
              <button type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={cn('rounded-md p-2 transition', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}><List className="size-3.5" /></button>
            </div>
            <button type="button" onClick={() => setPaintOpen(true)} title="Open Paint Registry" aria-label="Open Paint Registry" className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-primary/60 hover:text-foreground"><Palette className="size-3.5" /></button>
            {!effectiveReadOnly && (
              <button type="button" onClick={() => setAddOpen(true)} className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"><Plus className="size-3.5" />Add Item</button>
            )}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, category, or tag..." className="h-9 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory gallery */}
      <div className="min-h-0 flex-1 overflow-y-auto px-0 py-7">
        <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">{filtered.length} item{filtered.length === 1 ? '' : 's'} total</p>
            </div>
            {tierGroups.length === 0 ? (
              <div className="mt-10 text-center text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                No assets match the current filters
              </div>
            ) : viewMode === 'grid' ? (
              /* ─── GRID VIEW ─── */
              <GridRevealContainer>
                <div className="space-y-8 pb-8">
                  {tierGroups.map(([tierName, tierItems]) => (
                    <div key={tierName} className="space-y-3">
                      {/* Responsive inventory grid */}
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
              /* ─── LIST VIEW ─── */
              <div className="space-y-6 pr-1">
                {tierGroups.map(([tierName, tierItems]) => (
                  <div key={tierName} className="space-y-2">
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
