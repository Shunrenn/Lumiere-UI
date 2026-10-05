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
  if (asset.category === 'Event Assets') {
    const stock = asset.currentStock ?? 0
    const threshold = asset.threshold ?? 1
    return {
      kind: 'fraction',
      text: `${stock} / ${threshold} ${asset.unit}`,
      percent: threshold > 0 ? Math.min(100, Math.round((stock / threshold) * 100)) : 0,
    }
  }

  if (asset.category === 'Stockroom Assets') {
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

  if (asset.category === 'Production Assets') {
    const est = asset.finishTimeMinutes ? formatSmartDuration(asset.finishTimeMinutes) : null
    const stage = asset.bespokeStage ?? 'Unprepped'
    return {
      kind: 'text',
      text: est ? `${stage} · Finish: ~${est}` : stage,
    }
  }

  if (asset.category === 'Rental Assets') {
    return {
      kind: 'text',
      text: asset.onLoanDueDate ? `On Loan · Due ${asset.onLoanDueDate}` : 'In Warehouse',
    }
  }

  // Administrative Assets
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
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:ring-1 hover:ring-primary/20"
    >
      <div className="relative m-1.5 mb-0 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <img
          src={asset.image || '/placeholder.svg'}
          alt={asset.name}
          crossOrigin="anonymous"
          className="size-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <Pill tone={statusTone} className="border border-background/20 bg-background/80 px-2 py-1 text-[0.5rem] font-bold uppercase tracking-[0.08em] backdrop-blur-sm">
            {asset.status}
          </Pill>
          {glance.kind === 'health' && glance.badgeLabel && (
            <Pill tone={glance.badgeTone ?? 'positive'} className="border border-background/20 bg-background/80 px-2 py-1 text-[0.5rem] font-bold uppercase tracking-[0.08em] backdrop-blur-sm">
              {glance.badgeLabel}
            </Pill>
          )}
        </div>
      </div>

      <div className="flex min-h-[72px] flex-1 flex-col gap-1.5 px-3 py-2.5">
        <h3 className="truncate font-serif text-sm font-medium leading-snug text-card-foreground transition-colors group-hover:text-primary">
          {asset.name}
        </h3>

        <div className="mt-auto">
          {glance.kind === 'fraction' ? (
            <div className="flex items-center justify-between gap-2 text-[0.55rem] font-bold uppercase tracking-[0.09em] text-muted-foreground">
              <span className="truncate">{asset.category.replace(' Assets', '')} asset</span>
              <span className="shrink-0 text-card-foreground">{glance.text}</span>
            </div>
          ) : (
            <p className="truncate text-[0.55rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <span className="font-bold text-card-foreground/90">{asset.category.replace(' Assets', '')} asset</span>
              <span className="opacity-80"> · {glance.text}</span>
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
