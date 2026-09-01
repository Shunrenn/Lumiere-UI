import { useState } from 'react'
import { X, Layers, Tag as TagIcon, Clock, ShieldCheck, DollarSign } from 'lucide-react'
import {
  computeStockHealth,
  formatSmartDuration,
  getAssetLedger,
  type CatalogAsset,
  type ReconciliationTag,
} from '@/lib/warehouse-catalog'
import { getVendorById } from '@/lib/warehouse-vendors'
import { ASSET_STATUS_TONE, getTierGlanceDisplay } from '@/components/warehouse/asset-catalog/AssetCard'
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
  const glance = getTierGlanceDisplay(asset)
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
        className="flex h-full max-h-[42rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-primary">
                {asset.category}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{asset.assetId}</span>
            </div>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">{asset.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div className="flex gap-1 border-b border-border px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'true' : undefined}
              className={cn(
                'border-b-2 px-4 py-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* ────────────────── 1. PREVIEW TAB (100% Identical Structure for all 5 tiers) ────────────────── */}
          {tab === 'preview' && (
            <div className="flex flex-col gap-5">
              <div className="aspect-[1.9] w-full overflow-hidden rounded-lg bg-muted">
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
                {asset.subCategory && (
                  <span className="rounded-full border border-border px-2.5 py-1 text-[0.55rem] font-semibold text-muted-foreground">
                    {asset.subCategory}
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-border bg-background px-4 py-3.5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {glance.kind === 'fraction' ? 'Stock Availability' : 'Current State Summary'}
                </p>
                <p className="mt-1 font-serif text-lg font-medium text-card-foreground">{glance.text}</p>

                {glance.kind === 'fraction' && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        tone === 'critical' ? 'bg-destructive' : tone === 'caution' ? 'bg-amber-500' : 'bg-primary',
                      )}
                      style={{ width: `${glance.percent ?? 0}%` }}
                    />
                  </div>
                )}
              </div>

              {asset.description && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-card-foreground mb-0.5">Asset Description</p>
                  {asset.description}
                </div>
              )}
            </div>
          )}

          {/* ────────────────── 2. DETAILED TAB (Tier-Aware Field Set) ────────────────── */}
          {tab === 'detailed' && (
            <div className="flex flex-col gap-6">
              {/* === Shared Base Section (Always Shown for All Tiers) === */}
              <div>
                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
                  <Layers className="size-3.5" /> Shared Base Metadata
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <DetailField label="Asset ID" value={asset.assetId} isMono />
                  <DetailField label="Asset Name" value={asset.name} />
                  <DetailField label="Item Call Name" value={asset.itemCallName ?? asset.name} />
                  <DetailField label="Category" value={asset.category} />
                  <DetailField label="Sub-Category" value={asset.subCategory ?? 'General'} />
                  <DetailField label="Date Added" value={asset.dateAdded} />
                </div>
              </div>

              {/* Description */}
              {asset.description && (
                <div>
                  <p className="mb-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Description
                  </p>
                  <div className="rounded-lg border border-border bg-background p-3 text-xs text-card-foreground leading-relaxed">
                    {asset.description}
                  </div>
                </div>
              )}

              {/* Dimensions (Height, Width, Depth, Weight + Shape & Circumference ONLY if is_circular === true) */}
              <div>
                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Dimensions &amp; Weight
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailField label="Height" value={asset.dimensions.height} />
                  <DetailField label="Width" value={asset.dimensions.width} />
                  <DetailField label="Depth" value={asset.dimensions.depth} />
                  <DetailField label="Weight" value={asset.dimensions.weight} />
                  {asset.is_circular && (
                    <>
                      <DetailField label="Shape" value={asset.shape ?? 'Circular'} />
                      <DetailField label="Circumference" value={asset.circumference ?? '—'} />
                    </>
                  )}
                </div>
              </div>

              {/* Material & Color State */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailField label="Material Composition" value={asset.material ?? 'Standard Composite'} />
                <div className="rounded-lg border border-border bg-background px-3.5 py-2.5">
                  <p className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Color &amp; Finish State
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase text-primary">
                      {asset.colorType ?? 'mono'}
                    </span>
                    <span className="text-xs font-semibold text-card-foreground">
                      {asset.colorPrimary ?? 'Natural'}
                    </span>
                    {asset.colorSecondary && asset.colorSecondary.length > 0 && (
                      <span className="text-[0.6rem] text-muted-foreground">
                        (+ {asset.colorSecondary.join(', ')})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {asset.tags && asset.tags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1">
                    <TagIcon className="size-3" /> Asset Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[0.58rem] font-semibold text-card-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* === Tier-Specific Section (Appended Below Base Fields) === */}
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" /> Tier Details ({asset.category})
                </p>

                {/* 1. EVENT ASSET */}
                {asset.category === 'Event Asset' && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <DetailField label="Primary Vendor" value={primaryVendor?.name ?? '—'} />
                    <DetailField label="Backup Vendor" value={backupVendor?.name ?? '—'} />
                    <DetailField label="Purchase Price" value={`₱${asset.purchaseCost.toLocaleString()}`} />
                    <DetailField label="Expected Life Span" value={asset.lifeSpan ?? '3 Years'} />
                    <DetailField
                      label="Damage / Replacement Cost"
                      value={asset.damageReplacementCost ? `₱${asset.damageReplacementCost.toLocaleString()}` : '₱1,500 / unit'}
                    />
                    <DetailField label="Reservable Stock" value={`${asset.currentStock ?? 0} ${asset.unit}`} />
                  </div>
                )}

                {/* 2. BESPOKE */}
                {asset.category === 'Bespoke' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <DetailField label="Fabrication Crew" value={asset.bespokeCrew ?? 'Fab Team — Ronnie'} />
                      <DetailField label="Manpower Count" value={asset.manCount ? `${asset.manCount} Crew Members` : '3 Crew Members'} />
                      <DetailField
                        label="Estimated Finish Time"
                        value={asset.finishTimeMinutes ? formatSmartDuration(asset.finishTimeMinutes) : '2h 15m'}
                      />
                      <DetailField
                        label="Revision Buffer Time"
                        value={asset.revisionTimeMinutes ? formatSmartDuration(asset.revisionTimeMinutes) : '45m'}
                      />
                      <DetailField label="Build Stage" value={asset.bespokeStage ?? 'Prepping'} />
                      <DetailField label="Purchase Cost" value={`₱${asset.purchaseCost.toLocaleString()}`} />
                    </div>

                    <div>
                      <p className="mb-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        Raw Materials Breakdown
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(asset.rawMaterials ?? ['Plywood 3/4"', 'Acrylic Panel', 'Gold Leaf Coating', 'Steel Bracing']).map((mat) => (
                          <span key={mat} className="rounded bg-accent px-2.5 py-1 text-[0.58rem] font-semibold text-accent-foreground">
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. STOCKROOM */}
                {asset.category === 'Stockroom' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <DetailField label="Primary Vendor" value={primaryVendor?.name ?? '—'} />
                      <DetailField label="Backup Vendor" value={backupVendor?.name ?? '—'} />
                      <DetailField label="Price per Unit" value={`₱${asset.costPerUnit.toLocaleString()}`} />
                      <DetailField
                        label="Price per Pack"
                        value={asset.pricePerPack ? `₱${asset.pricePerPack.toLocaleString()}` : `₱${(asset.costPerUnit * 12).toLocaleString()}`}
                      />
                      <DetailField label="Expected Life Span" value={asset.lifeSpan ?? '24 Months'} />
                      <DetailField label="Safety Stock Threshold" value={`${asset.criticalThreshold ?? 30} ${asset.unit}`} />
                      <DetailField label="Stock Ceiling Cap" value={`${asset.ceilingCap ?? 200} ${asset.unit}`} />
                    </div>

                    {/* Branded Stock Indicator */}
                    <div className="rounded-lg border border-border bg-background p-3.5">
                      <p className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
                        Branded Stock Health Indicator
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-base font-medium text-card-foreground">
                          {asset.currentStock ?? 0} / {asset.ceilingCap ?? 200} {asset.unit}
                        </span>
                        {(() => {
                          const health = computeStockHealth(asset.currentStock, asset.criticalThreshold, asset.ceilingCap)
                          const tone: Tone = health === 'Low Stock' ? 'caution' : health === 'Over Stock' ? 'progress' : 'positive'
                          return <Pill tone={tone}>{health}</Pill>
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. RENTAL */}
                {asset.category === 'Rental' && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <DetailField label="Supplier Details" value={asset.supplierDetails ?? asset.rentalVendorName ?? 'Ritz Suppliers'} />
                    <DetailField label="Supplier Contact" value={asset.supplierContact ?? 'Vendor Representative'} />
                    <DetailField label="Rental Fee / Rate" value={`₱${asset.purchaseCost.toLocaleString()}`} />
                    <DetailField label="Length of Rent" value={asset.lengthOfRent ?? '7 Days'} />
                    <DetailField
                      label="Overdue Penalty Fee"
                      value={asset.overduePenaltyFee ? `₱${asset.overduePenaltyFee.toLocaleString()} / day` : '₱1,500 / day'}
                    />
                    <DetailField label="Due Back Date" value={asset.onLoanDueDate ?? 'In Warehouse'} />
                  </div>
                )}

                {/* 5. OFFICE ASSET */}
                {asset.category === 'Office Asset' && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <DetailField label="Vendor Details" value={asset.vendorDetails ?? primaryVendor?.name ?? 'Direct Purchase'} />
                    <DetailField label="Purchase Cost" value={`₱${asset.purchaseCost.toLocaleString()}`} />
                    <DetailField label="Life Span / Warranty" value={asset.lifeSpan ?? '5 Years Warranty'} />
                    <DetailField label="Assigned Custodian" value={asset.custodian ?? 'Unassigned — In Storage'} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ────────────────── 3. HISTORY TAB (100% Identical Structure for all 5 tiers) ────────────────── */}
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

function DetailField({ label, value, isMono = false }: { label: string; value: string; isMono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3.5 py-2.5">
      <p className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-xs text-card-foreground font-semibold', isMono && 'font-mono')}>{value}</p>
    </div>
  )
}
