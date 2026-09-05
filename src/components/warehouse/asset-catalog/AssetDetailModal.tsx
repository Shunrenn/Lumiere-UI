import { useState, useMemo } from 'react'
import { X, Layers, Tag as TagIcon, ShieldCheck, Clock, User, Plus, Check } from 'lucide-react'
import {
  computeStockHealth,
  formatSmartDuration,
  getAssetLedger,
  updateAssetSimulation,
  type CatalogAsset,
  type ReconciliationTag,
  type BespokeSimulationAttempt,
} from '@/lib/warehouse-catalog'
import { getVendorById } from '@/lib/warehouse-vendors'
import { ASSET_STATUS_TONE, getTierGlanceDisplay } from '@/components/warehouse/asset-catalog/AssetCard'
import { Pill } from '@/components/warehouse/shared/Pill'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'
import { cn } from '@/lib/utils'

type TabId = 'preview' | 'detailed' | 'history' | 'simulation'

const RECON_TONE: Record<ReconciliationTag, Tone> = {
  Matched: 'positive',
  Short: 'caution',
  Pahabol: 'critical',
}

interface AssetDetailModalProps {
  asset: CatalogAsset
  onClose: () => void
  onCompleteMaintenance?: () => void
}

export function AssetDetailModal({ asset, onClose, onCompleteMaintenance }: AssetDetailModalProps) {
  const [tab, setTab] = useState<TabId>('preview')
  const glance = getTierGlanceDisplay(asset)
  const tone = ASSET_STATUS_TONE[asset.status]
  const primaryVendor = getVendorById(asset.primaryVendorId)
  const backupVendor = getVendorById(asset.backupVendorId)
  const ledger = getAssetLedger(asset)

  // Simulation State (Bespoke only)
  const [attempts, setAttempts] = useState<BespokeSimulationAttempt[]>(asset.simulationAttempts || [])
  const [headcount] = useState<number>(asset.simulationHeadcount || 1)
  const [newDurationInput, setNewDurationInput] = useState('')
  const [isAddingAttempt, setIsAddingAttempt] = useState(false)

  const computedMeanMinutes = useMemo(() => {
    const valid = attempts.filter((a) => a.durationMinutes > 0)
    if (valid.length === 0) return 0
    return Math.round(valid.reduce((sum, a) => sum + a.durationMinutes, 0) / valid.length)
  }, [attempts])

  const tabs: { id: TabId; label: string }[] = useMemo(() => {
    const list: { id: TabId; label: string }[] = [
      { id: 'preview', label: 'Preview' },
      { id: 'detailed', label: 'Detailed' },
      { id: 'history', label: 'History' },
    ]
    if (asset.category === 'Bespoke') {
      list.push({ id: 'simulation', label: 'Simulation' })
    }
    return list
  }, [asset.category])

  const handleAddAttempt = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(newDurationInput.replace(/\D/g, ''), 10)
    if (isNaN(parsed) || parsed <= 0) return

    const newAttempt: BespokeSimulationAttempt = {
      id: `att-${Date.now()}`,
      attemptNumber: attempts.length + 1,
      durationMinutes: parsed,
      rawInput: `${parsed} min`,
      loggedAt: new Date().toISOString().slice(0, 10),
      loggedBy: 'Warehouse Manager',
    }

    const updated = [...attempts, newAttempt]
    setAttempts(updated)
    setNewDurationInput('')
    setIsAddingAttempt(false)
    updateAssetSimulation(asset.id, updated, headcount)
  }

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
          {tabs.map((t) => (
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

              {asset.status === 'In Maintenance' && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-indigo-900">
                        Asset Under Service / Maintenance
                      </p>
                      <p className="text-xs text-indigo-700 mt-0.5">
                        This asset was placed in maintenance following a damage repair verdict.
                      </p>
                    </div>
                    {onCompleteMaintenance && (
                      <button
                        type="button"
                        onClick={onCompleteMaintenance}
                        className="rounded bg-indigo-600 px-3.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition"
                      >
                        Complete Maintenance / Return to Stock
                      </button>
                    )}
                  </div>
                </div>
              )}

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

          {/* ────────────────── 4. SIMULATION TAB (Bespoke Estimation) ────────────────── */}
          {tab === 'simulation' && (
            <div className="flex flex-col gap-5">
              {/* Baseline Headcount & Computed Mean Banner */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Baseline Headcount
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <User className="size-4 text-primary" />
                    <span className="font-serif text-lg font-bold text-card-foreground">
                      {headcount} Worker
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-[0.55rem] font-bold uppercase text-muted-foreground">
                      Fixed Standard
                    </span>
                  </div>
                  <p className="mt-1 text-[0.62rem] text-muted-foreground">
                    Historical baseline reference crew for build time measurements.
                  </p>
                </div>

                <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-primary">
                    Auto-Computed Baseline Time
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    <span className="font-serif text-xl font-bold text-primary">
                      {formatSmartDuration(computedMeanMinutes)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({computedMeanMinutes} min mean)
                    </span>
                  </div>
                  <p className="mt-1 text-[0.62rem] text-muted-foreground">
                    Mean of {attempts.length} logged attempt{attempts.length === 1 ? '' : 's'}. Basis for future scheduling.
                  </p>
                </div>
              </div>

              {/* Simulation Attempts Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                      Build Duration Attempts
                    </h3>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Manual duration entries per completed build attempt
                    </p>
                  </div>
                  {!isAddingAttempt && (
                    <button
                      type="button"
                      onClick={() => setIsAddingAttempt(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
                    >
                      <Plus className="size-3" />
                      Add Attempt
                    </button>
                  )}
                </div>

                {isAddingAttempt && (
                  <form onSubmit={handleAddAttempt} className="border-b border-border bg-primary/5 p-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Attempt #{attempts.length + 1}:
                    </span>
                    <input
                      type="text"
                      autoFocus
                      value={newDurationInput}
                      onChange={(e) => setNewDurationInput(e.target.value)}
                      placeholder="e.g. 45 min or 60"
                      className="w-36 rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:opacity-90"
                    >
                      <Check className="size-3" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingAttempt(false)
                        setNewDurationInput('')
                      }}
                      className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted/80 text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5">Attempt</th>
                        <th className="px-4 py-2.5">Finished Time (Duration)</th>
                        <th className="px-4 py-2.5">Logged Date</th>
                        <th className="px-4 py-2.5 text-right">Logged By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attempts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                            No simulation attempts logged yet. Click &quot;Add Attempt&quot; to log build times.
                          </td>
                        </tr>
                      ) : (
                        attempts.map((attempt) => (
                          <tr key={attempt.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-semibold text-foreground">
                              Attempt #{attempt.attemptNumber}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-bold text-primary">
                                {formatSmartDuration(attempt.durationMinutes)}
                              </span>
                              <span className="ml-1.5 text-[0.6rem] text-muted-foreground">
                                ({attempt.durationMinutes} min)
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground text-[0.65rem]">
                              {attempt.loggedAt}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground text-[0.65rem]">
                              {attempt.loggedBy || 'Warehouse Team'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informational Guidance */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground">Scheduling Integration Note:</p>
                <p className="mt-1">
                  The computed arithmetic mean ({formatSmartDuration(computedMeanMinutes)}) automatically sets{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono text-[0.65rem]">baseSingleWorkerTime</code>{' '}
                  for newly scheduled production orders of this item. Once a job is scheduled in the Production Module, its baseline is locked into a snapshot to ensure stability.
                </p>
              </div>
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
