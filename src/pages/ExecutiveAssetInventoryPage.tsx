import { useState, useMemo } from 'react'
import { Search, Grid2X2, List, Sparkles, X, Layers } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { AssetDetailModal } from '@/components/warehouse/asset-catalog/AssetDetailModal'
import { useCatalogAssets, type CatalogAsset } from '@/lib/warehouse-catalog'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

interface ClassificationGroup {
  id: string
  name: string
  count: number
  image: string
  matcher: (asset: CatalogAsset) => boolean
}

export function ExecutiveAssetInventoryPage() {
  const { navigate } = useNav()
  const assets = useCatalogAssets()

  const [query, setQuery] = useState('')
  const [selectedClassificationId, setSelectedClassificationId] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<CatalogAsset | null>(null)

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const fallbackImage = '/images/decor/tiffany-chair.png'

  // Build high-level luxury event classifications matching the executive kiosk specification
  const classifications: ClassificationGroup[] = useMemo(() => {
    const allFirstImage = assets.find((a) => a.image)?.image || fallbackImage

    const groups: ClassificationGroup[] = [
      {
        id: 'all',
        name: 'All',
        count: assets.length,
        image: allFirstImage,
        matcher: () => true,
      },
      {
        id: 'display',
        name: 'Display',
        count: assets.filter((a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('display') ||
            a.subCategory?.toLowerCase().includes('backdrop') ||
            a.subCategory?.toLowerCase().includes('arch') ||
            a.tags?.some((t) => ['display', 'backdrop', 'arch', 'wall', 'plinth'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('display') ||
            a.name.toLowerCase().includes('backdrop') ||
            a.name.toLowerCase().includes('arch') ||
            a.name.toLowerCase().includes('plinth')
          )
        ).length,
        image:
          assets.find(
            (a) =>
              a.subCategory?.toLowerCase().includes('backdrop') ||
              a.name.toLowerCase().includes('wall') ||
              a.name.toLowerCase().includes('plinth')
          )?.image || '/assets/inventory/floral-arch.png',
        matcher: (a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('display') ||
            a.subCategory?.toLowerCase().includes('backdrop') ||
            a.subCategory?.toLowerCase().includes('arch') ||
            a.tags?.some((t) => ['display', 'backdrop', 'arch', 'wall', 'plinth'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('display') ||
            a.name.toLowerCase().includes('backdrop') ||
            a.name.toLowerCase().includes('arch') ||
            a.name.toLowerCase().includes('plinth')
          ),
      },
      {
        id: 'furniture',
        name: 'Furniture',
        count: assets.filter((a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('furniture') ||
            a.subCategory?.toLowerCase().includes('seating') ||
            a.tags?.some((t) => ['furniture', 'chair', 'lounge', 'table', 'sofa', 'seating'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('chair') ||
            a.name.toLowerCase().includes('lounge') ||
            a.name.toLowerCase().includes('table') ||
            a.name.toLowerCase().includes('bench')
          )
        ).length,
        image:
          assets.find(
            (a) =>
              a.subCategory?.toLowerCase().includes('furniture') ||
              a.name.toLowerCase().includes('chair') ||
              a.name.toLowerCase().includes('lounge')
          )?.image || fallbackImage,
        matcher: (a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('furniture') ||
            a.subCategory?.toLowerCase().includes('seating') ||
            a.tags?.some((t) => ['furniture', 'chair', 'lounge', 'table', 'sofa', 'seating'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('chair') ||
            a.name.toLowerCase().includes('lounge') ||
            a.name.toLowerCase().includes('table') ||
            a.name.toLowerCase().includes('bench')
          ),
      },
      {
        id: 'lighting',
        name: 'Lighting',
        count: assets.filter((a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('lighting') ||
            a.tags?.some((t) => ['lighting', 'light', 'led', 'beam', 'lamp', 'wash'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('light') ||
            a.name.toLowerCase().includes('beam') ||
            a.name.toLowerCase().includes('led') ||
            a.name.toLowerCase().includes('skypanel')
          )
        ).length,
        image:
          assets.find(
            (a) =>
              a.subCategory?.toLowerCase().includes('lighting') ||
              a.name.toLowerCase().includes('light') ||
              a.name.toLowerCase().includes('beam')
          )?.image || '/images/decor/uplighting.png',
        matcher: (a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('lighting') ||
            a.tags?.some((t) => ['lighting', 'light', 'led', 'beam', 'lamp', 'wash'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('light') ||
            a.name.toLowerCase().includes('beam') ||
            a.name.toLowerCase().includes('led') ||
            a.name.toLowerCase().includes('skypanel')
          ),
      },
      {
        id: 'signage',
        name: 'Signage',
        count: assets.filter((a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('signage') ||
            a.tags?.some((t) => ['signage', 'neon', 'acrylic', 'sign'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('sign') ||
            a.name.toLowerCase().includes('neon') ||
            a.name.toLowerCase().includes('mirror')
          )
        ).length,
        image:
          assets.find(
            (a) =>
              a.subCategory?.toLowerCase().includes('signage') ||
              a.name.toLowerCase().includes('sign') ||
              a.name.toLowerCase().includes('neon')
          )?.image || '/images/elements/led-strip-roll.png',
        matcher: (a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('signage') ||
            a.tags?.some((t) => ['signage', 'neon', 'acrylic', 'sign'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('sign') ||
            a.name.toLowerCase().includes('neon') ||
            a.name.toLowerCase().includes('mirror')
          ),
      },
      {
        id: 'styling',
        name: 'Styling',
        count: assets.filter((a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('styling') ||
            a.subCategory?.toLowerCase().includes('tableware') ||
            a.subCategory?.toLowerCase().includes('decor') ||
            a.tags?.some((t) => ['styling', 'tableware', 'decor', 'floral', 'vase', 'glassware'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('vase') ||
            a.name.toLowerCase().includes('flower') ||
            a.name.toLowerCase().includes('candelabra') ||
            a.name.toLowerCase().includes('charger')
          )
        ).length,
        image:
          assets.find(
            (a) =>
              a.subCategory?.toLowerCase().includes('tableware') ||
              a.name.toLowerCase().includes('flower') ||
              a.name.toLowerCase().includes('charger')
          )?.image || '/images/decor/table-runner.png',
        matcher: (a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('styling') ||
            a.subCategory?.toLowerCase().includes('tableware') ||
            a.subCategory?.toLowerCase().includes('decor') ||
            a.tags?.some((t) => ['styling', 'tableware', 'decor', 'floral', 'vase', 'glassware'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('vase') ||
            a.name.toLowerCase().includes('flower') ||
            a.name.toLowerCase().includes('candelabra') ||
            a.name.toLowerCase().includes('charger')
          ),
      },
      {
        id: 'textiles',
        name: 'Textiles',
        count: assets.filter((a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('textiles') ||
            a.subCategory?.toLowerCase().includes('linen') ||
            a.tags?.some((t) => ['textile', 'linen', 'velvet', 'runner', 'drape', 'fabric'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('drape') ||
            a.name.toLowerCase().includes('linen') ||
            a.name.toLowerCase().includes('runner') ||
            a.name.toLowerCase().includes('velvet')
          )
        ).length,
        image:
          assets.find(
            (a) =>
              a.subCategory?.toLowerCase().includes('textiles') ||
              a.name.toLowerCase().includes('runner') ||
              a.name.toLowerCase().includes('drape')
          )?.image || '/images/decor/table-runner.png',
        matcher: (a) =>
          Boolean(
            a.subCategory?.toLowerCase().includes('textiles') ||
            a.subCategory?.toLowerCase().includes('linen') ||
            a.tags?.some((t) => ['textile', 'linen', 'velvet', 'runner', 'drape', 'fabric'].includes(t.toLowerCase())) ||
            a.name.toLowerCase().includes('drape') ||
            a.name.toLowerCase().includes('linen') ||
            a.name.toLowerCase().includes('runner') ||
            a.name.toLowerCase().includes('velvet')
          ),
      },
    ]

    return groups
  }, [assets])

  const activeGroup = useMemo(() => {
    return classifications.find((c) => c.id === selectedClassificationId) || classifications[0]
  }, [classifications, selectedClassificationId])

  // Filter assets based on active group matcher and search query
  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assets.filter((asset) => {
      const matchesGroup = activeGroup.matcher(asset)
      const matchesQuery =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.assetId.toLowerCase().includes(q) ||
        (asset.itemCallName && asset.itemCallName.toLowerCase().includes(q)) ||
        (asset.category && asset.category.toLowerCase().includes(q)) ||
        (asset.subCategory && asset.subCategory.toLowerCase().includes(q)) ||
        (asset.material && asset.material.toLowerCase().includes(q)) ||
        (asset.tags && asset.tags.some((t) => t.toLowerCase().includes(q)))

      return matchesGroup && matchesQuery
    })
  }, [assets, activeGroup, query])

  const stickyHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
            ASSET KIOSK
          </span>
        </div>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Asset Allocation
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
          Browse, search, and allocate assets by classification. Quantity assignment routes to the deficit queue.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-80 md:w-96">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, tag, classification..."
          className="w-full rounded-xl border border-border/80 bg-card/90 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <ExecutiveShell activeId="inventory" onSelect={destination} stickyHeader={stickyHeader}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mt-2">
          {/* LEFT: CLASSIFICATIONS SIDEBAR */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Classifications
              </span>
              <span className="text-[0.65rem] font-medium text-muted-foreground/80">
                {classifications.length - 1} categories
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {classifications.map((cat) => {
                const isSelected = selectedClassificationId === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedClassificationId(cat.id)}
                    className={cn(
                      'group flex w-full items-center gap-3.5 rounded-xl p-3 text-left transition-all border shadow-xs select-none',
                      isSelected
                        ? 'bg-[#8B5E3C] text-white border-[#7A5032] shadow-sm dark:bg-amber-600 dark:text-neutral-950 dark:border-amber-500'
                        : 'bg-card/70 hover:bg-card text-foreground border-border/60 hover:border-border'
                    )}
                  >
                    {/* Category Thumbnail */}
                    <div
                      className={cn(
                        'relative size-12 shrink-0 overflow-hidden rounded-lg border',
                        isSelected ? 'border-white/30 bg-black/20' : 'border-border/50 bg-muted/40'
                      )}
                    >
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = fallbackImage
                        }}
                      />
                    </div>

                    {/* Category Name & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'font-serif text-sm font-medium tracking-tight truncate',
                          isSelected ? 'text-white dark:text-neutral-950 font-semibold' : 'text-foreground'
                        )}
                      >
                        {cat.name}
                      </p>
                      <p
                        className={cn(
                          'text-[0.65rem] tracking-wide',
                          isSelected ? 'text-white/80 dark:text-neutral-900/80' : 'text-muted-foreground'
                        )}
                      >
                        Browse collection
                      </p>
                    </div>

                    {/* Count Pill */}
                    <span
                      className={cn(
                        'shrink-0 font-mono text-xs font-semibold px-2 py-0.5 rounded-full',
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-950'
                          : 'bg-muted/70 text-muted-foreground'
                      )}
                    >
                      {cat.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT: ASSET ALLOCATION GALLERY */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Gallery Top Action Bar */}
            <div className="flex items-center justify-between pb-4 pt-1 border-b border-border/50">
              <div className="flex items-baseline gap-3">
                <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">
                  {activeGroup.id === 'all' ? 'All Assets' : activeGroup.name}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  {filteredAssets.length} {filteredAssets.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Grid / List View Toggle */}
              <div className="flex items-center rounded-lg border border-border/80 bg-card/80 p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewMode === 'grid'
                      ? 'bg-amber-600 text-white shadow-xs dark:bg-amber-500 dark:text-neutral-950'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Grid2X2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewMode === 'list'
                      ? 'bg-amber-600 text-white shadow-xs dark:bg-amber-500 dark:text-neutral-950'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>

            {/* Asset Items Display */}
            {filteredAssets.length === 0 ? (
              <div className="mt-12 flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
                <Layers className="size-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-serif text-lg font-medium text-foreground">No assets found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  No inventory matches the classification &quot;{activeGroup.name}&quot;
                  {query ? ` matching "${query}"` : ''}.
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {filteredAssets.map((asset) => {
                  const stock = asset.currentStock ?? 0
                  const isAvailable = asset.status === 'Available'
                  const isLow = asset.status === 'Low Stock'
                  const isDeficit = asset.status === 'Critical Deficit'

                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card hover:border-amber-600/60 hover:shadow-xl transition-all duration-200 cursor-pointer text-left"
                    >
                      {/* Asset Image Container */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
                        <img
                          src={asset.image || fallbackImage}
                          alt={asset.name}
                          crossOrigin="anonymous"
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = fallbackImage
                          }}
                        />
                      </div>

                      {/* Card Content Footer */}
                      <div className="flex flex-1 flex-col justify-between p-3.5 pb-2.5">
                        <div>
                          <h3 className="font-serif text-sm font-medium tracking-tight text-foreground truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                            {asset.name}
                          </h3>
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground text-[0.78rem]">
                              {stock} available
                            </span>
                            <span
                              className={cn(
                                'text-[0.68rem] font-medium tracking-wide',
                                isAvailable
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isLow
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : isDeficit
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {asset.status}
                            </span>
                          </div>
                        </div>

                        {/* Thin bottom status/progress accent line */}
                        <div className="mt-3">
                          <div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                isAvailable
                                  ? 'bg-emerald-500'
                                  : isLow
                                  ? 'bg-amber-500'
                                  : isDeficit
                                  ? 'bg-rose-500'
                                  : 'bg-primary'
                              )}
                              style={{
                                width: asset.threshold
                                  ? `${Math.min(100, Math.round((stock / Math.max(1, asset.threshold)) * 100))}%`
                                  : '100%',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="mt-5 divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="group flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="size-16 shrink-0 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                        <img
                          src={asset.image || fallbackImage}
                          alt={asset.name}
                          crossOrigin="anonymous"
                          className="size-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = fallbackImage
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif text-base font-medium text-foreground truncate group-hover:text-amber-700 dark:group-hover:text-amber-300">
                          {asset.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[0.68rem] text-muted-foreground">
                            {asset.assetId}
                          </span>
                          {asset.subCategory && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="text-xs text-muted-foreground truncate">{asset.subCategory}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{asset.currentStock ?? 0} {asset.unit}</p>
                        <p className="text-xs text-muted-foreground">
                          Cost: ₱{(asset.purchaseCost || asset.costPerUnit || 0).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-full',
                          asset.status === 'Available'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : asset.status === 'Low Stock'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                        )}
                      >
                        {asset.status}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-bold uppercase tracking-wider text-amber-700 hover:text-amber-800 dark:text-amber-400"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ExecutiveShell>

      {/* Asset Detail Inspection Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          readOnly={true}
        />
      )}
    </>
  )
}
