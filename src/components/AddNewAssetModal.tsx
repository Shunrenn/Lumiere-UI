import { useState } from 'react'
import { X, Upload, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendorEntry {
  store: string
  representative: string
  contact: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}

const labelClass = 'text-[0.65rem] font-bold uppercase tracking-[0.08em] text-foreground'
const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30'
const sectionClass = 'text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary'

export function AddNewAssetModal({ isOpen, onClose, onSave }: Props) {
  const [assetName, setAssetName] = useState('')
  const [description, setDescription] = useState('')
  const [height, setHeight] = useState('')
  const [width, setWidth] = useState('')
  const [weight, setWeight] = useState('')
  const [category, setCategory] = useState('')
  const [fragile, setFragile] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('pcs/sets')
  const [cost, setCost] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [vendors, setVendors] = useState<VendorEntry[]>([{ store: '', representative: '', contact: '' }])
  const [saving, setSaving] = useState(false)
  const [assetImage, setAssetImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const addVendor = () =>
    setVendors((v) => [...v, { store: '', representative: '', contact: '' }])

  const removeVendor = (idx: number) =>
    setVendors((v) => v.filter((_, i) => i !== idx))

  const updateVendor = (idx: number, field: keyof VendorEntry, value: string) =>
    setVendors((v) => v.map((entry, i) => (i === idx ? { ...entry, [field]: value } : entry)))

  if (!isOpen) return null

  const primaryVendor = vendors[0]
  const canSave =
    assetName &&
    description &&
    category &&
    primaryVendor?.store &&
    primaryVendor?.representative &&
    primaryVendor?.contact &&
    assetImage

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setImageError('Please upload a valid image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image size must be less than 5MB')
      return
    }

    setImageError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      setAssetImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setAssetName('')
    setDescription('')
    setHeight('')
    setWidth('')
    setWeight('')
    setCategory('')
    setFragile(false)
    setQuantity('')
    setUnit('pcs/sets')
    setCost('')
    setCostPerUnit('')
    setVendors([{ store: '', representative: '', contact: '' }])
    setAssetImage(null)
    setImageError('')
    setShowConfirm(false)
  }

  const confirmSave = () => {
    setSaving(true)
    const assetData = {
      assetName,
      description,
      height,
      width,
      weight,
      category,
      fragile,
      quantity: parseInt(quantity) || 0,
      unit,
      cost: parseFloat(cost) || 0,
      costPerUnit: parseFloat(costPerUnit) || 0,
      store: primaryVendor?.store ?? '',
      representative: primaryVendor?.representative ?? '',
      contact: primaryVendor?.contact ?? '',
      vendors,
      image: assetImage,
    }
    setTimeout(() => {
      onSave(assetData)
      setSaving(false)
      resetForm()
      onClose()
    }, 400)
  }

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={handleCancel}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary-foreground">
            Add New Asset Profile
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            className="text-primary-foreground/70 transition hover:text-primary-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
          <div className="grid gap-8 px-8 py-8 md:grid-cols-[300px_1fr]">
            {/* Left Sidebar */}
            <div className="space-y-6">
              {/* Image Upload */}
              <div>
                <p className={cn(labelClass, 'mb-2')}>Asset Image *</p>
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-border bg-muted/40 transition hover:bg-muted">
                  {assetImage ? (
                    <img src={assetImage || '/placeholder.svg'} alt="Asset preview" className="size-full object-cover" />
                  ) : (
                    <>
                      <Upload className="mb-2 size-10 text-muted-foreground" />
                      <p className="px-2 text-center text-[0.6rem] font-semibold uppercase text-muted-foreground">
                        Upload Image
                      </p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {imageError && <p className="mt-1 text-[0.6rem] font-semibold text-destructive">{imageError}</p>}
                {!assetImage && !imageError && (
                  <p className="mt-1 text-[0.6rem] font-semibold text-destructive">Image is required</p>
                )}
              </div>

              {/* Asset ID & Date */}
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">Asset ID</p>
                  <p className="text-sm font-semibold text-foreground">AST-9921</p>
                </div>
                <div>
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">Date Added</p>
                  <p className="text-sm font-semibold text-foreground">06/07/2026</p>
                </div>
              </div>

              {/* Purchasing Info — multi-vendor */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className={sectionClass}>Purchasing Info</p>
                  <button
                    type="button"
                    onClick={addVendor}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-primary/50 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary transition hover:bg-primary/5"
                  >
                    <Plus className="size-3" />
                    Add Vendor
                  </button>
                </div>

                {vendors.map((v, idx) => (
                  <div key={idx} className="rounded-md border border-border bg-muted/20 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {idx === 0 ? 'Primary Vendor' : `Vendor ${idx + 1}`}
                      </p>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => removeVendor(idx)}
                          aria-label="Remove vendor"
                          className="text-muted-foreground transition hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Store:</label>
                      <input
                        type="text"
                        value={v.store}
                        onChange={(e) => updateVendor(idx, 'store', e.target.value)}
                        placeholder="Add Store Name"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Representative:</label>
                      <input
                        type="text"
                        value={v.representative}
                        onChange={(e) => updateVendor(idx, 'representative', e.target.value)}
                        placeholder="Name of Representative"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Contact:</label>
                      <input
                        type="text"
                        value={v.contact}
                        onChange={(e) => updateVendor(idx, 'contact', e.target.value)}
                        placeholder="09xxxxxxxxx"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Core Details */}
              <div>
                <p className={cn(sectionClass, 'mb-3 border-b border-border pb-2')}>Core Details</p>
                <div>
                  <label className={labelClass}>Asset Name:</label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="e.g., Premium Dior Chairs"
                    className={cn(inputClass, 'mt-1')}
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
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add descriptive tags separated by commas (e.g., White, Wedding, Luxury)..."
                      className={cn(inputClass, 'mt-1 resize-none')}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>Height:</label>
                      <input
                        type="text"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="0.00"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Width:</label>
                      <input
                        type="text"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="0.00"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Weight:</label>
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="0.00"
                        className={cn(inputClass, 'mt-1')}
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
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={cn(inputClass, 'mt-1')}
                    >
                      <option value="">Select Category</option>
                      <option value="Seating · Ceremony">Seating · Ceremony</option>
                      <option value="Furniture · Banquet">Furniture · Banquet</option>
                      <option value="Lighting · Statement">Lighting · Statement</option>
                      <option value="Décor · Backdrop">Décor · Backdrop</option>
                      <option value="Ambiance · Wax Goods">Ambiance · Wax Goods</option>
                      <option value="Beverage · Glassware">Beverage · Glassware</option>
                      <option value="Floristry · Greenery">Floristry · Greenery</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Fragile?</label>
                    <div className="mt-1 flex h-[38px] items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFragile(!fragile)}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition',
                          fragile ? 'bg-primary' : 'bg-muted-foreground/40',
                        )}
                        aria-pressed={fragile}
                      >
                        <span
                          className={cn(
                            'inline-block h-5 w-5 transform rounded-full bg-card transition',
                            fragile ? 'translate-x-5' : 'translate-x-0.5',
                          )}
                        />
                      </button>
                      <span className="text-sm font-semibold text-foreground">{fragile ? 'Yes' : 'No'}</span>
                    </div>
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
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Unit (e.g. pcs):</label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Cost (DECIMAL):</label>
                      <input
                        type="text"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="0.00"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cost per Unit:</label>
                      <input
                        type="text"
                        value={costPerUnit}
                        onChange={(e) => setCostPerUnit(e.target.value)}
                        placeholder="0.00"
                        className={cn(inputClass, 'mt-1')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border bg-muted/40 px-8 py-4">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-border bg-card px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSave && setShowConfirm(true)}
            disabled={!canSave || saving}
            title={!assetImage ? 'Image is required' : !canSave ? 'Please fill all required fields' : ''}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition',
              canSave && !saving
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            Save Asset Profile →
          </button>
        </div>

        {/* Confirmation overlay */}
        {showConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <AlertTriangle className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-medium text-card-foreground">Confirm New Item</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add <span className="font-semibold text-foreground">{assetName}</span> ({quantity} {unit}) to the
                    inventory stock registry?
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={saving}
                  className="rounded-md border border-border bg-card px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={confirmSave}
                  disabled={saving}
                  className="rounded-md bg-primary px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Adding…' : 'Confirm & Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
