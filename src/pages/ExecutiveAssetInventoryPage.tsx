import { useMemo } from 'react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import { AssetCatalogModule } from '@/components/warehouse/asset-catalog/AssetCatalogModule'
import { useCatalogAssets } from '@/lib/warehouse-catalog'
import { useNav } from '@/lib/nav'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

export function ExecutiveAssetInventoryPage() {
  const { navigate } = useNav()
  const assets = useCatalogAssets()

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stats = useMemo(() => {
    const totalSKUs = assets.length
    const available = assets.filter((a) => a.status === 'Available').length
    const lowStock = assets.filter((a) => a.status === 'Low Stock').length
    const criticalDeficit = assets.filter((a) => a.status === 'Critical Deficit').length
    const deployed = assets.filter((a) => a.status === 'Deployed').length
    const lostInAction = assets.filter((a) => a.status === 'Lost In Action').length

    return {
      totalSKUs,
      available,
      lowStock,
      criticalDeficit,
      deployed,
      lostInAction,
    }
  }, [assets])

  const stickyHeader = (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Asset Inventory
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Portfolio-level asset catalog, tier-grouped inventory oversight, and stock distribution.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <ExecutiveShell activeId="inventory" onSelect={destination} stickyHeader={stickyHeader}>
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
        <CompactStatStrip
          stats={[
            { label: 'Total Assets', value: stats.totalSKUs },
            { label: 'Available', value: stats.available },
            { label: 'Low Stock', value: stats.lowStock },
            { label: 'Critical Deficit', value: stats.criticalDeficit },
            { label: 'Deployed', value: stats.deployed },
            { label: 'Lost In Action', value: stats.lostInAction },
          ]}
        />
        <div className="p-4 sm:p-6">
          <AssetCatalogModule readOnly embedded />
        </div>
      </div>
    </ExecutiveShell>
  )
}
