import { useEffect, useState } from 'react'
import { X, Pencil, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Asset {
  id: string
  name: string
  description: string
  assetId: string
  dateAdded: string
  store: string
  representative: string
  contact: string
  height: string
  width: string
  weight: string
  category: string
  tier: string
  fragile: boolean
  quantity: number
  unit: string
  cost: number
  costPerUnit: number
  image?: string
}

export interface AssetUsage {
  id: string
  eventName: string
  eventDate: string
  location: string
  quantity: number
  purpose: string
}

// Mock usage history for demo — in production, query from asset_allocations table
const getMockUsageHistory = (): AssetUsage[] => [
  {
    id: 'u-1',
    eventName: 'La Nuit Dorée — Spring Gala 2026',
    eventDate: '03/15/2026',
    location: 'Ballroom, Grand Manila Hotel',
    quantity: 25,
    purpose: 'Ceremony seating',
  },
  {
    id: 'u-2',
    eventName: 'Corporate Summit 2026',
    eventDate: '02/28/2026',
    location: 'Conference Center, BGC',
    quantity: 40,
    purpose: 'Panel discussion & VIP seating',
  },
  {
    id: 'u-3',
    eventName: 'Winter Wedding Reception',
    eventDate: '01/20/2026',
    location: 'Makati Shangri-La',
    quantity: 30,
    purpose: 'Reception & dining',
  },
]

interface Props {
  asset: Asset | null
  onClose: () => void
  onSave?: (asset: Asset) => void
  // When true, the asset profile is view-only and the Edit Info control is hidden.
  readOnly?: boolean
}

const labelClass = 'text-[0.65rem] font-bold uppercase tracking-[0.08em] text-foreground'
const sectionClass = 'text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary'
const baseInput = 'w-full rounded-md border px-3 py-2 text-sm outline-none transition'
const editInput =
  'border-input bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-ring/30'
const readOnlyInput = 'border-border bg-muted/40 text-foreground cursor-default'

export function AssetInformationModal({ asset, onClose, onSave, readOnly = false }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedAsset, setEditedAsset] = useState<Asset | null>(asset)
  const [showConfirm, setShowConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')
  const [usageHistory, setUsageHistory] = useState<AssetUsage[]>([])

  useEffect(() => {
    setEditedAsset(asset)
    setIsEditing(false)
    setShowConfirm(false)
    setActiveTab('info')
    if (asset) {
      setUsageHistory(getMockUsageHistory())
    }
  }, [asset])

  if (!asset || !editedAsset) return null

  const handleSaveEdit = () => {
    onSave?.(editedAsset)
    setIsEditing(false)
    setShowConfirm(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedAsset(asset)
  }

  const updateField = <K extends keyof Asset>(key: K, value: Asset[K]) => {
    setEditedAsset((prev) => (prev ? { ...prev, [key]: value } : null))
  }

  const fieldClass = cn(baseInput, 'mt-1', isEditing ? editInput : readOnlyInput)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={isEditing ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary-foreground">
            {isEditing ? 'Edit Asset Information' : 'Asset Information'}
          </h2>
          <button
            type="button"
            onClick={isEditing ? handleCancelEdit : onClose}
            aria-label="Close"
            className="text-primary-foreground/70 transition hover:text-primary-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              'px-4 py-3 text-sm font-semibold uppercase tracking-wide transition',
              activeTab === 'info'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-4 py-3 text-sm font-semibold uppercase tracking-wide transition',
              activeTab === 'history'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            History ({usageHistory.length})
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
          {activeTab === 'info' ? (
            <div className="grid gap-8 px-8 py-8 md:grid-cols-[300px_1fr]">
              {/* Left Sidebar */}
              <div className="space-y-6">
                {/* Asset Image */}
                <div>
                  <p className={cn(labelClass, 'mb-2')}>Asset</p>
                  <div className="aspect-square overflow-hidden rounded-md border border-border bg-muted/40">
                    {editedAsset.image ? (
                      <img src={editedAsset.image || '/placeholder.svg'} alt={editedAsset.name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">No image</div>
                    )}
                  </div>
                </div>

                {/* Asset ID & Date */}
                <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">Asset ID</p>
                    <p className="text-sm font-semibold text-foreground">{editedAsset.assetId}</p>
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">Date Added</p>
                    <p className="text-sm font-semibold text-foreground">{editedAsset.dateAdded}</p>
                  </div>
                </div>

                {/* Purchasing Info */}
                <div className="space-y-3 border-t border-border pt-4">
                  <p className={sectionClass}>Purchasing Info</p>
                  <div>
                    <label className={labelClass}>Store:</label>
                    <input
                      type="text"
                      value={editedAsset.store}
                      onChange={(e) => updateField('store', e.target.value)}
                      readOnly={!isEditing}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Representative:</label>
                    <input
                      type="text"
                      value={editedAsset.representative}
                      onChange={(e) => updateField('representative', e.target.value)}
                      readOnly={!isEditing}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact:</label>
                    <input
                      type="text"
                      value={editedAsset.contact}
                      onChange={(e) => updateField('contact', e.target.value)}
                      readOnly={!isEditing}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Core Details */}
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                    <p className={sectionClass}>Core Details</p>
            {!isEditing && !readOnly && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-[0.62rem] font-bold uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
                      >
                        <Pencil className="size-3" />
                        Edit Info
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Asset Name:</label>
                    <input
                      type="text"
                      value={editedAsset.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      readOnly={!isEditing}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Physical Info */}
                <div>
                  <p className={cn(sectionClass, 'mb-3 border-b border-border pb-2')}>Physical Info</p>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Description/Tags:</label>
                      <textarea
                        value={editedAsset.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        readOnly={!isEditing}
                        rows={3}
                        className={cn(fieldClass, 'resize-none')}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Height:</label>
                        <input
                          type="text"
                          value={editedAsset.height}
                          onChange={(e) => updateField('height', e.target.value)}
                          readOnly={!isEditing}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Width:</label>
                        <input
                          type="text"
                          value={editedAsset.width}
                          onChange={(e) => updateField('width', e.target.value)}
                          readOnly={!isEditing}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Weight:</label>
                        <input
                          type="text"
                          value={editedAsset.weight}
                          onChange={(e) => updateField('weight', e.target.value)}
                          readOnly={!isEditing}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Asset Type */}
                <div>
                  <p className={cn(sectionClass, 'mb-3 border-b border-border pb-2')}>Asset Type</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Category:</label>
                      <input
                        type="text"
                        value={editedAsset.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        readOnly={!isEditing}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fragile?</label>
                      {isEditing ? (
                        <div className="mt-1 flex h-[38px] items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateField('fragile', !editedAsset.fragile)}
                            className={cn(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition',
                              editedAsset.fragile ? 'bg-primary' : 'bg-muted-foreground/40',
                            )}
                            aria-pressed={editedAsset.fragile}
                          >
                            <span
                              className={cn(
                                'inline-block h-5 w-5 transform rounded-full bg-card transition',
                                editedAsset.fragile ? 'translate-x-5' : 'translate-x-0.5',
                              )}
                            />
                          </button>
                          <span className="text-sm font-semibold text-foreground">
                            {editedAsset.fragile ? 'Yes' : 'No'}
                          </span>
                        </div>
                      ) : (
                        <div className={cn(baseInput, 'mt-1', readOnlyInput, 'font-semibold')}>
                          {editedAsset.fragile ? 'Fragile' : 'Non-Fragile'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Value */}
                <div>
                  <p className={cn(sectionClass, 'mb-3 border-b border-border pb-2')}>Value</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Quantity (Base Count):</label>
                        <input
                          type="text"
                          value={editedAsset.quantity}
                          onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                          readOnly={!isEditing}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Unit (e.g. pcs):</label>
                        <input
                          type="text"
                          value={editedAsset.unit}
                          onChange={(e) => updateField('unit', e.target.value)}
                          readOnly={!isEditing}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Cost (DECIMAL):</label>
                        <input
                          type="text"
                          value={editedAsset.cost}
                          onChange={(e) => updateField('cost', parseFloat(e.target.value) || 0)}
                          readOnly={!isEditing}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Cost per Unit:</label>
                        <input
                          type="text"
                          value={editedAsset.costPerUnit}
                          onChange={(e) => updateField('costPerUnit', parseFloat(e.target.value) || 0)}
                          readOnly={!isEditing}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* History Tab */
            <div className="p-8">
              <h3 className={cn(sectionClass, 'mb-6')}>Asset Usage History</h3>
              {usageHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 text-left font-semibold text-foreground">Event</th>
                        <th className="pb-3 text-left font-semibold text-foreground">Date</th>
                        <th className="pb-3 text-left font-semibold text-foreground">Location</th>
                        <th className="pb-3 text-center font-semibold text-foreground">Qty</th>
                        <th className="pb-3 text-left font-semibold text-foreground">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageHistory.map((usage) => (
                        <tr key={usage.id} className="border-b border-border/50 hover:bg-muted/30 transition">
                          <td className="py-3 font-semibold text-foreground">{usage.eventName}</td>
                          <td className="py-3 text-muted-foreground">{usage.eventDate}</td>
                          <td className="py-3 text-muted-foreground">{usage.location}</td>
                          <td className="py-3 text-center text-foreground">{usage.quantity}</td>
                          <td className="py-3 text-muted-foreground">{usage.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>No usage history available for this asset.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — only in edit mode */}
        {isEditing && (
          <div className="flex justify-end gap-3 border-t border-border bg-muted/40 px-8 py-4">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-md border border-border bg-card px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-foreground transition hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Confirmation overlay */}
        {showConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <AlertTriangle className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-medium text-card-foreground">Confirm Changes</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Are the details for{' '}
                    <span className="font-semibold text-foreground">{editedAsset.name}</span> correct? These updates
                    will be saved to the inventory record.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md border border-border bg-card px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
                >
                  Review Again
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-md bg-primary px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
