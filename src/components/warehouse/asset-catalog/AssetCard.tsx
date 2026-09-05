import {
  computeStockHealth,
  formatSmartDuration,
  type AssetStatus,
  type CatalogAsset,
} from '@/lib/warehouse-catalog'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'
import { Pill } from '@/components/warehouse/shared/Pill'

export const ASSET_STATUS_TONE: Record<AssetStatus, Tone> = {
  Available: 'positive',
  'Low Stock': 'caution',
  'Critical Deficit': 'critical',
  Deployed: 'progress',
  'Lost In Action': 'critical',
  'In Maintenance': 'caution',
}

export function getTierGlanceDisplay(asset: CatalogAsset): {
  badgeLabel?: string
  badgeTone?: Tone
  text: string
  kind: 'fraction' | 'text' | 'health'
  percent?: number
} {
  if (asset.category === 'Event Asset') {
    const stock = asset.currentStock ?? 0
    const threshold = asset.threshold ?? 1
    return {
      kind: 'fraction',
      text: `${stock} / ${threshold} ${asset.unit}`,
      percent: threshold > 0 ? Math.min(100, Math.round((stock / threshold) * 100)) : 0,
    }
  }

  if (asset.category === 'Stockroom') {
    const stock = asset.currentStock ?? 0
    const crit = asset.criticalThreshold ?? 30
    const ceil = asset.ceilingCap ?? 200
    const health = computeStockHealth(stock, crit, ceil)
    const tone: Tone = health === 'Low Stock' ? 'caution' : health === 'Over Stock' ? 'progress' : 'positive'
    return {
      kind: 'health',
      badgeLabel: health,
      badgeTone: tone,
      text: `${stock} ${asset.unit} (${health})`,
    }
  }

  if (asset.category === 'Bespoke') {
    const est = asset.finishTimeMinutes ? formatSmartDuration(asset.finishTimeMinutes) : null
    const stage = asset.bespokeStage ?? 'Unprepped'
    return {
      kind: 'text',
      text: est ? `${stage} · Finish: ~${est}` : stage,
    }
  }

  if (asset.category === 'Rental') {
    return {
      kind: 'text',
      text: asset.onLoanDueDate ? `On Loan · Due ${asset.onLoanDueDate}` : 'In Warehouse',
    }
  }

  // Office Asset
  return {
    kind: 'text',
    text: asset.custodian ? `Cust: ${asset.custodian}` : 'Unassigned (Storage)',
  }
}

interface AssetCardProps {
  asset: CatalogAsset
  onOpen: () => void
}

export function AssetCard({ asset, onOpen }: AssetCardProps) {
  const glance = getTierGlanceDisplay(asset)
  const statusTone = ASSET_STATUS_TONE[asset.status]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/80 bg-white dark:bg-card text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 hover:ring-1 hover:ring-primary/20"
    >
      {/* Aspect Ratio 4:3 image for compact 6-col grid */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={asset.image || '/placeholder.svg'}
          alt={asset.name}
          crossOrigin="anonymous"
          className="size-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          <Pill tone={statusTone} className="text-[0.5rem] px-1.5 py-0.5">
            {asset.status}
          </Pill>
          {glance.kind === 'health' && glance.badgeLabel && (
            <Pill tone={glance.badgeTone ?? 'positive'} className="text-[0.5rem] px-1.5 py-0.5">
              {glance.badgeLabel}
            </Pill>
          )}
        </div>
      </div>

      {/* Proportional compact card body */}
      <div className="flex flex-1 flex-col gap-1 p-2 sm:p-2.5">
        <h3 className="truncate font-serif text-[0.68rem] font-medium leading-snug text-card-foreground group-hover:text-primary transition-colors">
          {asset.name}
        </h3>

        <div className="mt-auto pt-0.5">
          {glance.kind === 'fraction' ? (
            <div className="flex items-center justify-between text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="truncate">{asset.category}</span>
              <span className="shrink-0 text-card-foreground font-bold">{glance.text}</span>
            </div>
          ) : (
            <p className="truncate text-[0.55rem] font-medium text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-card-foreground/90">{asset.category}</span>
              <span className="opacity-80"> · {glance.text}</span>
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
