import type { AssetStatus, CatalogAsset } from '@/lib/warehouse-catalog'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'
import { Pill } from '@/components/warehouse/shared/Pill'

export const ASSET_STATUS_TONE: Record<AssetStatus, Tone> = {
  Available: 'positive',
  'Low Stock': 'caution',
  'Critical Deficit': 'critical',
  Deployed: 'progress',
  'Lost In Action': 'critical',
}

// The stock-display line varies by category — this is the one piece of
// copy on the card that is never the same shape twice.
export function stockDisplay(asset: CatalogAsset): { kind: 'fraction' | 'text'; text: string; percent?: number } {
  if (asset.category === 'Event Asset' || asset.category === 'Stockroom') {
    const stock = asset.currentStock ?? 0
    const threshold = asset.threshold ?? 1
    return {
      kind: 'fraction',
      text: `${stock} / ${threshold} ${asset.unit}`,
      percent: threshold > 0 ? Math.min(100, Math.round((stock / threshold) * 100)) : 0,
    }
  }
  if (asset.category === 'Bespoke') {
    return { kind: 'text', text: asset.bespokeStage ?? 'Unprepped' }
  }
  if (asset.category === 'Rental') {
    return {
      kind: 'text',
      text: asset.onLoanDueDate ? `On Loan · Due back ${asset.onLoanDueDate}` : 'In Warehouse',
    }
  }
  // Office Asset
  return { kind: 'text', text: asset.custodian ? `Assigned to ${asset.custodian}` : 'In Storage' }
}

interface AssetCardProps {
  asset: CatalogAsset
  onOpen: () => void
}

export function AssetCard({ asset, onOpen }: AssetCardProps) {
  const display = stockDisplay(asset)
  const tone = ASSET_STATUS_TONE[asset.status]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[3.4] overflow-hidden bg-muted">
        <img
          src={asset.image || '/placeholder.svg'}
          alt={asset.name}
          crossOrigin="anonymous"
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-1.5 top-1.5">
          <Pill tone={tone}>{asset.status}</Pill>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-1.5">
        <h3 className="truncate font-serif text-[0.7rem] leading-tight text-card-foreground">{asset.name}</h3>
        <div className="mt-auto">
          {display.kind === 'fraction' ? (
            <div className="flex items-center justify-between text-[0.5rem] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
              <span className="truncate">{asset.category}</span>
              <span className="shrink-0 text-card-foreground">{display.text}</span>
            </div>
          ) : (
            <p className="truncate text-[0.56rem] font-medium text-muted-foreground">
              <span className="uppercase tracking-[0.03em]">{asset.category}</span> · {display.text}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
