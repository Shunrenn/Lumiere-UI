import { useState, useMemo } from 'react'
import { Search, Grid2X2, List } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { AssetInformationModal } from '@/components/AssetInformationModal'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { InventoryItem } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

export function ExecutiveLiteAssetAllocation() {
  const { navigate } = useNav()
  const { inventory: items } = usePortal()

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<InventoryItem | null>(null)

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  // Derive dynamic classification list from real canonical asset data
  const classifications = useMemo(() => {
    const catMap = new Map<string, { count: number; image?: string }>()
    for (const item of items) {
      const cat = item.category || 'General'
      const existing = catMap.get(cat)
      if (existing) {
        existing.count += 1
        if (!existing.image && item.image) existing.image = item.image
      } else {
        catMap.set(cat, {
          count: 1,
          image: item.image,
        })
      }
    }

    const firstImage = items.find((i) => i.image)?.image || '/images/decor/tiffany-chair.png'

    const list: { id: string; name: string; count: number; image: string }[] = [
      {
        id: 'All',
        name: 'All',
        count: items.length,
        image: firstImage,
      },
    ]

    Array.from(catMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([name, data]) => {
        list.push({
          id: name,
          name,
          count: data.count,
          image: data.image || '/images/decor/tiffany-chair.png',
        })
      })

    return list
  }, [items])

  // Real data filtering by selected classification and query
  const filteredAssets = useMemo(() => {
    const q = query.toLowerCase().trim()
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || !selectedCategory || item.category === selectedCategory
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.assetId.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      return matchesCategory && matchesQuery
    })
  }, [items, selectedCategory, query])

  const stickyHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
          ASSET KIOSK
        </span>
        <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Asset Allocation
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Client-facing luxury inventory allocation, event styling collections, and element availability.
        </p>
      </div>

      {/* Large search field aligned toward upper-right */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search asset collection…"
          className="w-full rounded-lg border border-border/80 bg-background/90 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-xs"
        />
      </div>
    </div>
  )

  return (
    <>
      <ExecutiveShell activeId="inventory" onSelect={destination} stickyHeader={stickyHeader}>
        {/* Main Content: Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT: CLASSIFICATIONS browser */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="flex items-center justify-between pb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Classifications
              </h3>
              <span className="font-mono text-xs font-medium text-muted-foreground">
                {classifications.length - 1}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {classifications.map((cat) => {
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'group flex w-full items-center gap-3.5 rounded-xl p-3 text-left transition-all border shadow-xs',
                      isSelected
                        ? 'bg-[#8B5E3C] text-white border-[#7A5032] shadow-sm dark:bg-amber-600 dark:text-neutral-950 dark:border-amber-500'
                        : 'bg-[#F9F7F2] hover:bg-[#F2ECE1] text-foreground border-[#E8E2D7] dark:bg-card/70 dark:hover:bg-card dark:border-border/60'
                    )}
                  >
                    {/* Thumbnail */}
                    <div
                      className={cn(
                        'relative size-12 shrink-0 overflow-hidden rounded-lg border',
                        isSelected
                          ? 'border-white/30 bg-black/20'
                          : 'border-border/50 bg-muted/40'
                      )}
                    >
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/images/decor/tiffany-chair.png'
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'font-serif text-sm font-medium tracking-tight truncate',
                          isSelected ? 'text-white dark:text-neutral-950' : 'text-foreground'
                        )}
                      >
                        {cat.name}
                      </p>
                      <p
                        className={cn(
                          'text-[0.68rem] tracking-wide',
                          isSelected
                            ? 'text-white/80 dark:text-neutral-900/80 font-normal'
                            : 'text-muted-foreground'
                        )}
                      >
                        Browse collection
                      </p>
                    </div>

                    {/* Count Badge */}
                    <span
                      className={cn(
                        'shrink-0 font-mono text-xs font-semibold px-2 py-0.5 rounded-full',
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-950'
                          : 'bg-muted/60 text-muted-foreground'
                      )}
                    >
                      {cat.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT: ASSET GALLERY */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Header row with Title and Grid/List toggle */}
            <div className="flex items-center justify-between pb-4 pt-1 border-b border-border/40">
              <div className="flex items-baseline gap-3">
                <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">
                  {selectedCategory === 'All' || !selectedCategory ? 'All Assets' : selectedCategory}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  {filteredAssets.length} {filteredAssets.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Grid / List toggle */}
              <div className="flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5 shadow-xs">
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

            {/* Visual Asset Gallery */}
            {filteredAssets.length === 0 ? (
              <div className="mt-8 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-[#FAF7F2]/50 dark:bg-card/40">
                <p className="font-serif text-lg text-foreground">No assets found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No luxury assets match your current classification filter or search query.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All')
                    setQuery('')
                  }}
                  className="mt-4 rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="group flex flex-col rounded-xl overflow-hidden bg-[#FAF7F2] dark:bg-card border border-[#E8E2D7] dark:border-border/70 shadow-xs hover:shadow-md hover:border-amber-600/40 dark:hover:border-amber-500/40 transition-all duration-200 cursor-pointer"
                  >
                    {/* Large image occupying most of card height */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EFEAE1]/50 dark:bg-muted/20">
                      <img
                        src={asset.image || '/images/decor/tiffany-chair.png'}
                        alt={asset.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/images/decor/tiffany-chair.png'
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <h3 className="font-serif text-base font-medium tracking-tight text-foreground line-clamp-1 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                          {asset.name}
                        </h3>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {asset.stock} Available
                          </span>
                          <span
                            className={cn(
                              'text-[0.68rem] font-medium tracking-wide',
                              asset.status === 'Available'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : asset.status === 'Low Stock'
                                ? 'text-amber-700 dark:text-amber-400'
                                : asset.status === 'In Maintenance'
                                ? 'text-indigo-700 dark:text-indigo-400'
                                : 'text-muted-foreground'
                            )}
                          >
                            {asset.status}
                          </span>
                        </div>
                      </div>

                      {/* Restrained stock/progress indicator */}
                      {asset.capacity > 0 && (
                        <div className="mt-3">
                          <div className="h-1 w-full rounded-full bg-muted/60 dark:bg-muted/40 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                asset.status === 'Available'
                                  ? 'bg-emerald-600 dark:bg-emerald-500'
                                  : asset.status === 'Low Stock'
                                  ? 'bg-amber-600 dark:bg-amber-500'
                                  : asset.status === 'In Maintenance'
                                  ? 'bg-indigo-600 dark:bg-indigo-500'
                                  : 'bg-rose-600 dark:bg-rose-500'
                              )}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((asset.stock / asset.capacity) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 divide-y divide-border/60 rounded-xl border border-[#E8E2D7] dark:border-border/70 overflow-hidden bg-[#FAF7F2] dark:bg-card">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="group flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="size-16 shrink-0 rounded-lg overflow-hidden border border-border/50 bg-[#EFEAE1]/50 dark:bg-muted/20">
                        <img
                          src={asset.image || '/images/decor/tiffany-chair.png'}
                          alt={asset.name}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = '/images/decor/tiffany-chair.png'
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif text-base font-medium text-foreground truncate group-hover:text-amber-800 dark:group-hover:text-amber-300">
                          {asset.name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{asset.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{asset.stock} Available</p>
                        <p className="text-xs text-muted-foreground">Capacity: {asset.capacity}</p>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full',
                          asset.status === 'Available'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : asset.status === 'Low Stock'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
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

      {/* Read-Only Asset Information Modal */}
      {selectedAsset && (
        <AssetInformationModal
          asset={{
            id: selectedAsset.id,
            name: selectedAsset.name,
            description:
              selectedAsset.description || `${selectedAsset.name} luxury event decor specification.`,
            assetId: selectedAsset.assetId,
            dateAdded: selectedAsset.dateAdded || '2026-09-01',
            store: selectedAsset.store || 'Main Facility',
            representative: selectedAsset.representative || 'Warehouse Ops',
            contact: selectedAsset.contact || '+63 900 000 0000',
            height: selectedAsset.height || '—',
            width: selectedAsset.width || '—',
            weight: selectedAsset.weight || '—',
            category: selectedAsset.category,
            tier: 'Standard Luxury',
            fragile: Boolean(selectedAsset.fragile),
            quantity: selectedAsset.stock,
            unit: selectedAsset.unit || 'units',
            cost: selectedAsset.cost || 0,
            costPerUnit: selectedAsset.costPerUnit || 0,
            image: selectedAsset.image || '/images/decor/tiffany-chair.png',
          }}
          onClose={() => setSelectedAsset(null)}
          readOnly={true}
        />
      )}
    </>
  )
}
