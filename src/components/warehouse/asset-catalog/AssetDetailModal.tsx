import { useState, useMemo, useRef } from 'react'
import {
  X,
  Layers,
  Tag as TagIcon,
  ShieldCheck,
  Plus,
  Check,
  Pencil,
  Upload,
  Image as ImageIcon,
  Trash2,
  Save,
  RotateCcw,
} from 'lucide-react'
import {
  formatSmartDuration,
  getAssetLedger,
  updateAssetSimulation,
  updateCatalogAsset,
  type CatalogAsset,
  type AssetCategory,
  type AssetStatus,
  type ReconciliationTag,
  type BespokeSimulationAttempt,
} from '@/lib/warehouse-catalog'
import { getVendorById, useWarehouseVendors } from '@/lib/warehouse-vendors'
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

const CATEGORIES: AssetCategory[] = [
  'Event Assets',
  'Production Assets',
  'Stockroom Assets',
  'Rental Assets',
  'Administrative Assets',
]

const STATUSES: AssetStatus[] = [
  'Available',
  'Low Stock',
  'Critical Deficit',
  'Deployed',
  'Lost In Action',
  'In Maintenance',
]

interface AssetDetailModalProps {
  asset: CatalogAsset
  onClose: () => void
  onCompleteMaintenance?: () => void
  readOnly?: boolean
}

export function AssetDetailModal({
  asset,
  onClose,
  onCompleteMaintenance,
  readOnly = false,
}: AssetDetailModalProps) {
  const vendors = useWarehouseVendors()
  const [tab, setTab] = useState<TabId>('preview')
  const [isEditing, setIsEditing] = useState(false)
  const [currentAsset, setCurrentAsset] = useState<CatalogAsset>(asset)
  const [draft, setDraft] = useState<CatalogAsset>(asset)
  const [imageError, setImageError] = useState('')
  const [savedToast, setSavedToast] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const glance = getTierGlanceDisplay(currentAsset)
  const tone = ASSET_STATUS_TONE[currentAsset.status]
  const primaryVendor = getVendorById(currentAsset.primaryVendorId)
  const backupVendor = getVendorById(currentAsset.backupVendorId)
  const ledger = getAssetLedger(currentAsset)

  // Simulation State (Bespoke only)
  const [attempts, setAttempts] = useState<BespokeSimulationAttempt[]>(currentAsset.simulationAttempts || [])
  const [headcount] = useState<number>(currentAsset.simulationHeadcount || 1)
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
    if (currentAsset.category === 'Production Assets') {
      list.push({ id: 'simulation', label: 'Simulation' })
    }
    return list
  }, [currentAsset.category])

  const handleStartEdit = () => {
    setDraft({ ...currentAsset })
    setIsEditing(true)
    setImageError('')
  }

  const handleCancelEdit = () => {
    setDraft({ ...currentAsset })
    setIsEditing(false)
    setImageError('')
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setImageError('Please choose a valid image file.')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageError('Image file is too large (max 8MB).')
      return
    }

    setImageError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setDraft((prev) => ({ ...prev, image: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    updateCatalogAsset(currentAsset.id, draft)
    setCurrentAsset({ ...draft })
    setIsEditing(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 3000)
  }

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
    updateAssetSimulation(currentAsset.id, updated, headcount)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[44rem] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border bg-card/80 px-6 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-primary">
                {currentAsset.category}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{currentAsset.assetId}</span>
              {savedToast && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[0.6rem] font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  <Check className="size-3" /> Saved live
                </span>
              )}
            </div>
            <h2 className="mt-1 truncate font-serif text-xl font-medium text-card-foreground">
              {isEditing ? `Edit: ${draft.name || 'Asset'}` : currentAsset.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={isEditing ? handleCancelEdit : handleStartEdit}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition',
                  isEditing
                    ? 'border border-border bg-muted text-muted-foreground hover:bg-muted/80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {isEditing ? (
                  <>
                    <RotateCcw className="size-3.5" /> Cancel Edit
                  </>
                ) : (
                  <>
                    <Pencil className="size-3.5" /> Edit Asset
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Modal Tabs Bar (When not editing) */}
        {!isEditing && (
          <div className="flex gap-1 border-b border-border bg-muted/20 px-6">
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
        )}

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* ===================== EDIT MODE ===================== */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-6">
              {/* Image Upload / Change Section */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" /> Asset Media / Visual Reference
                </p>
                
                <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr] items-center">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
                    {draft.image ? (
                      <img
                        src={draft.image}
                        alt="Asset preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center p-3 text-center text-muted-foreground">
                        <ImageIcon className="size-8 stroke-1 text-muted-foreground/50" />
                        <span className="mt-1 text-[0.65rem]">No image set</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                      >
                        <Upload className="size-3.5" /> Upload / Replace Image
                      </button>

                      {draft.image && (
                        <button
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, image: '' }))}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                        >
                          <Trash2 className="size-3.5" /> Remove Image
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Or specify Image URL
                      </label>
                      <input
                        type="text"
                        value={draft.image}
                        onChange={(e) => setDraft((prev) => ({ ...prev, image: e.target.value }))}
                        placeholder="/assets/inventory/... or https://..."
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                      />
                    </div>

                    {imageError && (
                      <p className="text-xs text-destructive font-medium">{imageError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Core Information Section */}
              <div className="space-y-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary flex items-center gap-1.5">
                  <Layers className="size-3.5" /> Core Asset Information
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Asset Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={draft.name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Item Call Name
                    </label>
                    <input
                      type="text"
                      value={draft.itemCallName ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, itemCallName: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Classification Tier *
                    </label>
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value as AssetCategory }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Sub-Category
                    </label>
                    <input
                      type="text"
                      value={draft.subCategory ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, subCategory: e.target.value }))}
                      placeholder="e.g. Staging, Audio, Lighting"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Current Status *
                    </label>
                    <select
                      value={draft.status}
                      onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as AssetStatus }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Primary Vendor */}
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">Primary Vendor</label><select value={draft.primaryVendorId} onChange={(e) => setDraft((prev) => ({ ...prev, primaryVendorId: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"><option value="">Select a vendor...</option>{vendors.map((v) => (<option key={v.id} value={v.id}>{v.name} ({v.specialty})</option>))}</select></div></div>
{/* Stock & Thresholds */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Current Stock / Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={draft.currentStock ?? 0}
                      onChange={(e) => setDraft((prev) => ({ ...prev, currentStock: Number(e.target.value) }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Safety Threshold
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={draft.threshold ?? draft.criticalThreshold ?? 5}
                      onChange={(e) => setDraft((prev) => ({ ...prev, threshold: Number(e.target.value), criticalThreshold: Number(e.target.value) }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      value={draft.unit}
                      onChange={(e) => setDraft((prev) => ({ ...prev, unit: e.target.value }))}
                      placeholder="panels, units, pcs, lots"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Purchase / Unit Cost (PHP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={draft.purchaseCost || draft.costPerUnit || 0}
                      onChange={(e) => setDraft((prev) => ({ ...prev, purchaseCost: Number(e.target.value), costPerUnit: Number(e.target.value) }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Height
                    </label>
                    <input
                      type="text"
                      value={draft.dimensions?.height ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, dimensions: { ...prev.dimensions, height: e.target.value } }))}
                      placeholder="30 cm"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Width
                    </label>
                    <input
                      type="text"
                      value={draft.dimensions?.width ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, dimensions: { ...prev.dimensions, width: e.target.value } }))}
                      placeholder="244 cm"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Depth
                    </label>
                    <input
                      type="text"
                      value={draft.dimensions?.depth ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, dimensions: { ...prev.dimensions, depth: e.target.value } }))}
                      placeholder="122 cm"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Weight
                    </label>
                    <input
                      type="text"
                      value={draft.dimensions?.weight ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, dimensions: { ...prev.dimensions, weight: e.target.value } }))}
                      placeholder="28 kg"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                {/* Material, Color & Description */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Material Composition
                    </label>
                    <input
                      type="text"
                      value={draft.material ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, material: e.target.value }))}
                      placeholder="e.g. Aluminium, Velvet, Solid Wood"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                      Primary Color / Finish
                    </label>
                    <input
                      type="text"
                      value={draft.colorPrimary ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, colorPrimary: e.target.value }))}
                      placeholder="e.g. Midnight Black, Gold, Ivory"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[0.65rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                    Asset Description
                  </label>
                  <textarea
                    rows={3}
                    value={draft.description ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide operational details, storage requirements, handling instructions..."
                    className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 shadow-md transition"
                >
                  <Save className="size-4" /> Save Changes
                </button>
              </div>
            </form>
          ) : (
            /* ===================== VIEW MODE ===================== */
            <>
              {/* 1. PREVIEW TAB */}
              {tab === 'preview' && (
                <div className="flex flex-col gap-5">
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)] md:items-stretch">
                    <div className="min-h-56 overflow-hidden rounded-xl border border-border bg-muted md:min-h-72">
                      <img
                        src={currentAsset.image || '/placeholder.svg'}
                        alt={currentAsset.name}
                        crossOrigin="anonymous"
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={tone}>{currentAsset.status}</Pill>
                        {currentAsset.subCategory && (
                          <span className="rounded-full border border-border px-2.5 py-1 text-[0.55rem] font-semibold text-muted-foreground">
                            {currentAsset.subCategory}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
                        <DetailField label="Classification" value={currentAsset.category} />
                        <DetailField label="Asset ID" value={currentAsset.assetId} isMono />
                        <DetailField label={glance.kind === 'fraction' ? 'Quantity / Stock' : 'Current State'} value={glance.text} />
                        <DetailField label="Unit Cost" value={`PHP ${(currentAsset.purchaseCost || currentAsset.costPerUnit || 0).toLocaleString()}`} />
                      </div>
                      {glance.kind === 'fraction' && (
                        <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full transition-all', tone === 'critical' ? 'bg-destructive' : tone === 'caution' ? 'bg-amber-500' : 'bg-primary')}
                            style={{ width: `${glance.percent ?? 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {currentAsset.status === 'In Maintenance' && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-indigo-900">Asset Under Service / Maintenance</p>
                          <p className="mt-0.5 text-xs text-indigo-700">This asset was placed in maintenance following a damage repair verdict.</p>
                        </div>
                        {onCompleteMaintenance && (
                          <button type="button" onClick={onCompleteMaintenance} className="rounded bg-indigo-600 px-3.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-indigo-700">
                            Complete Maintenance / Return to Stock
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {currentAsset.description && (
                    <div className="border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
                      <p className="mb-1 font-semibold text-card-foreground">Asset Description</p>
                      {currentAsset.description}
                    </div>
                  )}
                </div>
              )}

              {/* 2. DETAILED TAB */}
              {tab === 'detailed' && (
                <div className="flex flex-col gap-6">
                  {/* Shared Base Section */}
                  <div>
                    <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
                      <Layers className="size-3.5" /> Shared Base Metadata
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <DetailField label="Asset ID" value={currentAsset.assetId} isMono />
                      <DetailField label="Asset Name" value={currentAsset.name} />
                      <DetailField label="Item Call Name" value={currentAsset.itemCallName ?? currentAsset.name} />
                      <DetailField label="Category" value={currentAsset.category} />
                      <DetailField label="Sub-Category" value={currentAsset.subCategory ?? 'General'} />
                      <DetailField label="Date Added" value={currentAsset.dateAdded} />
                    </div>
                  </div>

                  {/* Description */}
                  {currentAsset.description && (
                    <div>
                      <p className="mb-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        Description
                      </p>
                      <div className="rounded-lg border border-border bg-background p-3 text-xs text-card-foreground leading-relaxed">
                        {currentAsset.description}
                      </div>
                    </div>
                  )}

                  {/* Dimensions */}
                  <div>
                    <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Dimensions & Weight
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <DetailField label="Height" value={currentAsset.dimensions.height} />
                      <DetailField label="Width" value={currentAsset.dimensions.width} />
                      <DetailField label="Depth" value={currentAsset.dimensions.depth} />
                      <DetailField label="Weight" value={currentAsset.dimensions.weight} />
                      {currentAsset.is_circular && (
                        <>
                          <DetailField label="Shape" value={currentAsset.shape ?? 'Circular'} />
                          <DetailField label="Circumference" value={currentAsset.circumference ?? '—'} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Material & Color */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailField label="Material Composition" value={currentAsset.material ?? 'Standard Composite'} />
                    <div className="rounded-lg border border-border bg-background px-3.5 py-2.5">
                      <p className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        Color & Finish State
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase text-primary">
                          {currentAsset.colorType ?? 'mono'}
                        </span>
                        <span className="text-xs font-semibold text-card-foreground">
                          {currentAsset.colorPrimary ?? 'Natural'}
                        </span>
                        {currentAsset.colorSecondary && currentAsset.colorSecondary.length > 0 && (
                          <span className="text-[0.6rem] text-muted-foreground">
                            (+ {currentAsset.colorSecondary.join(', ')})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {currentAsset.tags && currentAsset.tags.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1">
                        <TagIcon className="size-3" /> Asset Tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentAsset.tags.map((tag) => (
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

                  {/* Tier Details */}
                  <div className="border-t border-border pt-4">
                    <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" /> Tier Details ({currentAsset.category})
                    </p>

                    {currentAsset.category === 'Event Assets' && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <DetailField label="Primary Vendor" value={primaryVendor?.name ?? '—'} />
                        <DetailField label="Backup Vendor" value={backupVendor?.name ?? '—'} />
                        <DetailField label="Purchase Price" value={`PHP ${currentAsset.purchaseCost.toLocaleString()}`} />
                        <DetailField label="Expected Life Span" value={currentAsset.lifeSpan ?? '3 Years'} />
                        <DetailField
                          label="Damage / Replacement Cost"
                          value={currentAsset.damageReplacementCost ? `PHP ${currentAsset.damageReplacementCost.toLocaleString()}` : 'PHP 1,500 / unit'}
                        />
                        <DetailField label="Reservable Stock" value={`${currentAsset.currentStock ?? 0} ${currentAsset.unit}`} />
                      </div>
                    )}

                    {currentAsset.category === 'Production Assets' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <DetailField label="Fabrication Crew" value={currentAsset.bespokeCrew ?? 'Fab Team — Ronnie'} />
                          <DetailField label="Manpower Count" value={currentAsset.manCount ? `${currentAsset.manCount} Crew Members` : '3 Crew Members'} />
                          <DetailField
                            label="Estimated Finish Time"
                            value={currentAsset.finishTimeMinutes ? formatSmartDuration(currentAsset.finishTimeMinutes) : '2h 15m'}
                          />
                          <DetailField
                            label="Revision Buffer Time"
                            value={currentAsset.revisionTimeMinutes ? formatSmartDuration(currentAsset.revisionTimeMinutes) : '45m'}
                          />
                          <DetailField label="Build Stage" value={currentAsset.bespokeStage ?? 'Prepping'} />
                          <DetailField label="Purchase Cost" value={`PHP ${currentAsset.purchaseCost.toLocaleString()}`} />
                        </div>
                      </div>
                    )}

                    {currentAsset.category === 'Stockroom Assets' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <DetailField label="Primary Vendor" value={primaryVendor?.name ?? '—'} />
                          <DetailField label="Backup Vendor" value={backupVendor?.name ?? '—'} />
                          <DetailField label="Price per Unit" value={`PHP ${currentAsset.costPerUnit.toLocaleString()}`} />
                          <DetailField label="Safety Stock Threshold" value={`${currentAsset.criticalThreshold ?? 30} ${currentAsset.unit}`} />
                          <DetailField label="Stock Ceiling Cap" value={`${currentAsset.ceilingCap ?? 200} ${currentAsset.unit}`} />
                        </div>
                      </div>
                    )}

                    {currentAsset.category === 'Rental Assets' && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <DetailField label="Supplier / Vendor" value={primaryVendor?.name ?? currentAsset.supplierDetails ?? currentAsset.rentalVendorName ?? 'Legazpi Party Rentals'} />
                        <DetailField label="Supplier Contact" value={currentAsset.supplierContact ?? '+63 917 555 0011'} />
                        <DetailField label="Rental Fee / Rate" value={`PHP ${currentAsset.purchaseCost.toLocaleString()}`} />
                        <DetailField label="Length of Rent" value={currentAsset.lengthOfRent ?? '7 Days'} />
                        <DetailField label="Due Back Date" value={currentAsset.onLoanDueDate || 'In Warehouse'} />
                      </div>
                    )}

                    {currentAsset.category === 'Administrative Assets' && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <DetailField label="Vendor / Source" value={primaryVendor?.name ?? currentAsset.vendorDetails ?? 'Direct Purchase'} />
                        <DetailField label="Purchase Cost" value={`PHP ${currentAsset.purchaseCost.toLocaleString()}`} />
                        <DetailField label="Assigned Custodian" value={currentAsset.custodian ?? 'Unassigned — In Storage'} />
                        {currentAsset.deviceModel && <DetailField label="Device Model" value={currentAsset.deviceModel} />}
                        {currentAsset.serialNumber && <DetailField label="Serial Number" value={currentAsset.serialNumber} />}
                        {currentAsset.deviceSpecs && <DetailField label="Hardware Specs" value={currentAsset.deviceSpecs} />}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. HISTORY TAB */}
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

              {/* 4. SIMULATION TAB */}
              {tab === 'simulation' && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Baseline Headcount
                      </p>
                      <p className="mt-1 font-serif text-2xl font-medium text-card-foreground">
                        {headcount} <span className="text-xs font-sans text-muted-foreground">Carpenter{headcount > 1 ? 's' : ''}</span>
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Computed Mean Duration
                      </p>
                      <p className="mt-1 font-serif text-2xl font-medium text-primary">
                        {computedMeanMinutes > 0 ? formatSmartDuration(computedMeanMinutes) : 'No attempts logged'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground">
                      Fabrication Attempts Log ({attempts.length})
                    </p>
                    {!isAddingAttempt && (
                      <button
                        type="button"
                        onClick={() => setIsAddingAttempt(true)}
                        className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:bg-primary/20 transition"
                      >
                        <Plus className="size-3" /> Log Attempt
                      </button>
                    )}
                  </div>

                  {isAddingAttempt && (
                    <form onSubmit={handleAddAttempt} className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
                      <input
                        type="number"
                        min={1}
                        placeholder="Minutes (e.g. 135)"
                        value={newDurationInput}
                        onChange={(e) => setNewDurationInput(e.target.value)}
                        className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <button
                        type="submit"
                        className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingAttempt(false)}
                        className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition"
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {attempts.map((att) => (
                      <div key={att.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
                        <span className="font-semibold text-card-foreground">Attempt #{att.attemptNumber}</span>
                        <span className="font-mono text-primary font-bold">{att.rawInput}</span>
                        <span className="text-[0.65rem] text-muted-foreground">{att.loggedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value, isMono = false }: { label: string; value: string | number; isMono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-semibold text-card-foreground', isMono && 'font-mono text-[0.7rem]')}>{value}</span>
    </div>
  )
}
