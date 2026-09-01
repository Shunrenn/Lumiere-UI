import { useRef, useState } from 'react'
import { ImagePlus, Trash2, X } from 'lucide-react'
import type { AssetCategory } from '@/lib/warehouse-catalog'

const CATEGORIES: AssetCategory[] = ['Event Asset', 'Bespoke', 'Stockroom', 'Rental', 'Office Asset']

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export interface NewAssetDraft {
  name: string
  category: AssetCategory
  unit: string
  currentStock: number
  threshold: number
  image?: string
}

interface AddAssetModalProps {
  onClose: () => void
  onCreate: (draft: NewAssetDraft) => void
}

export function AddAssetModal({ onClose, onCreate }: AddAssetModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AssetCategory>('Event Asset')
  const [unit, setUnit] = useState('pcs')
  const [currentStock, setCurrentStock] = useState('0')
  const [threshold, setThreshold] = useState('50')
  const [image, setImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showStock = category === 'Event Asset' || category === 'Stockroom'
  const canSubmit = name.trim().length > 0

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('That file is not an image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image is larger than 4 MB — pick a smaller photo.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(typeof reader.result === 'string' ? reader.result : null)
      setImageError(null)
    }
    reader.onerror = () => setImageError('That image could not be read.')
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImage(null)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <h2 className="font-serif text-xl font-medium text-card-foreground">Add Item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Asset photo</span>
            <div className="flex items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background">
                {image ? (
                  <img src={image} alt="Selected asset preview" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col items-start gap-1.5">
                <input
                  ref={fileInputRef}
                  id="asset-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
                <label
                  htmlFor="asset-photo"
                  className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
                >
                  {image ? 'Replace photo' : 'Upload photo'}
                </label>
                {image ? (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="inline-flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-destructive hover:underline"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                    Remove
                  </button>
                ) : (
                  <p className="text-[0.6rem] text-muted-foreground">PNG or JPG, up to 4 MB. Optional.</p>
                )}
              </div>
            </div>
            {imageError && <p className="text-[0.62rem] font-medium text-destructive">{imageError}</p>}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Item name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rattan Peacock Chair"
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Unit</span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
            {showStock && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Threshold</span>
                <input
                  type="number"
                  min={0}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </label>
            )}
          </div>

          {showStock && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Starting stock</span>
              <input
                type="number"
                min={0}
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
          )}
          {!showStock && (
            <p className="rounded-md border border-dashed border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
              {category === 'Bespoke'
                ? 'New bespoke builds start in the Unprepped stage.'
                : category === 'Rental'
                  ? 'New rentals start unassigned — tag a loan once dispatched.'
                  : 'New office assets start in storage, unassigned.'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onCreate({
                name: name.trim(),
                category,
                unit,
                currentStock: Number(currentStock) || 0,
                threshold: Number(threshold) || 1,
                image: image ?? undefined,
              })
            }
            className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  )
}
