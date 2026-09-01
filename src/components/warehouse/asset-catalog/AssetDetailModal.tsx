import { useState } from 'react'
import { X } from 'lucide-react'
import type { CatalogAsset, ReconciliationTag } from '@/lib/warehouse-catalog'
import { getAssetLedger } from '@/lib/warehouse-catalog'
import { getVendorById } from '@/lib/warehouse-vendors'
import { ASSET_STATUS_TONE, stockDisplay } from '@/components/warehouse/asset-catalog/AssetCard'
import { Pill } from '@/components/warehouse/shared/Pill'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'
import { cn } from '@/lib/utils'

type TabId = 'preview' | 'detailed' | 'history'
const TABS: { id: TabId; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'detailed', label: 'Detailed' },
  { id: 'history', label: 'History' },
]

const RECON_TONE: Record<ReconciliationTag, Tone> = {
  Matched: 'positive',
  Short: 'caution',
  Pahabol: 'critical',
}

interface AssetDetailModalProps {
  asset: CatalogAsset
  onClose: () => void
}

export function AssetDetailModal({ asset, onClose }: AssetDetailModalProps) {
  const [tab, setTab] = useState<TabId>('preview')
  const display = stockDisplay(asset)
  const tone = ASSET_STATUS_TONE[asset.status]
  const primaryVendor = getVendorById(asset.primaryVendorId)
  const backupVendor = getVendorById(asset.backupVendorId)
  const ledger = getAssetLedger(asset)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[38rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {asset.category}
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">{asset.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'true' : undefined}
              className={cn(
                'border-b-2 px-3 py-3 text-[0.65rem] font-bold uppercase tracking-[0.1em] transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {tab === 'preview' && (
            <div className="flex flex-col gap-5">
              <div className="aspect-[1.9] overflow-hidden rounded-lg bg-muted">
                <img
                  src={asset.image || '/placeholder.svg'}
                  alt={asset.name}
                  crossOrigin="anonymous"
                  className="size-full object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={tone}>{asset.status}</Pill>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {asset.category}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3.5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {display.kind === 'fraction' ? 'Stock level' : 'Current state'}
                </p>
                <p className="mt-1 font-serif text-lg text-card-foreground">{display.text}</p>
                {display.kind === 'fraction' && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', tone === 'critical' ? 'bg-destructive' : tone === 'caution' ? 'bg-destructive/60' : 'bg-primary')}
                      style={{ width: `${display.percent ?? 0}%` }}
                    />
                  </div>
                )}
              </div>
              {asset.category === 'Bespoke' && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailField label="Fabrication crew" value={asset.bespokeCrew ?? 'Unassigned'} />
                  <DetailField label="Stage" value={asset.bespokeStage ?? 'Unprepped'} />
                </div>
              )}
              {asset.category === 'Rental' && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailField label="Sourced from" value={asset.rentalVendorName ?? '—'} />
                  <DetailField label="Due back" value={asset.onLoanDueDate ?? '—'} />
                </div>
              )}
              {asset.category === 'Office Asset' && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailField label="Custodian" value={asset.custodian ?? 'Unassigned — in storage'} />
                </div>
              )}
            </div>
          )}

          {tab === 'detailed' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-background px-4 py-2.5">
                <span className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Asset ID
                </span>
                <span className="font-mono text-xs text-muted-foreground">{asset.assetId}</span>
              </div>

              <div>
                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Dimensions &amp; weight
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailField label="Height" value={asset.dimensions.height} />
                  <DetailField label="Width" value={asset.dimensions.width} />
                  <DetailField label="Depth" value={asset.dimensions.depth} />
                  <DetailField label="Weight" value={asset.dimensions.weight} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Purchasing information
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <DetailField label="Total cost" value={`₱${asset.purchaseCost.toLocaleString()}`} />
                  <DetailField label="Cost / unit" value={`₱${asset.costPerUnit.toLocaleString()}`} />
                  <DetailField label="Date added" value={asset.dateAdded} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Vendor routing
                </p>
                <div className="flex flex-wrap gap-2">
                  {primaryVendor && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[0.6rem] font-semibold text-primary">
                      Primary · {primaryVendor.name}
                    </span>
                  )}
                  {backupVendor && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[0.6rem] font-semibold text-muted-foreground">
                      Backup · {backupVendor.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div>
              <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Lifecycle ledger — newest first
              </p>
              <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
                {ledger.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[1.44rem] top-1 size-2.5 rounded-full border-2 border-card bg-primary" aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-card-foreground">{entry.type}</span>
                      <span className="text-[0.6rem] text-muted-foreground">{entry.timestamp}</span>
                      {entry.reconciliationTag && (
                        <Pill tone={RECON_TONE[entry.reconciliationTag]} className="text-[0.5rem]">
                          {entry.reconciliationTag}
                        </Pill>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.6rem] text-muted-foreground">
                      <span>Declared by {entry.declaredBy}</span>
                      {entry.linkedBatchRef && <span>Linked batch {entry.linkedBatchRef}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3.5 py-2.5">
      <p className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-card-foreground">{value}</p>
    </div>
  )
}
