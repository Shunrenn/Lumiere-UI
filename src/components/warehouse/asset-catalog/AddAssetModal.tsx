import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Sparkles, Trash2, X, Layers, ShieldCheck } from 'lucide-react'
import type {
  AssetCategory,
  AssetDimensions,
  BespokeStage,
} from '@/lib/warehouse-catalog'
import { SearchableVendorSelect } from '@/components/warehouse/shared/SearchableVendorSelect'
import { cn } from '@/lib/utils'

const CATEGORIES: AssetCategory[] = [
  'Event Asset',
  'Bespoke',
  'Stockroom',
  'Rental',
  'Office Asset',
]

const SUB_CATEGORIES: Record<AssetCategory, string[]> = {
  'Event Asset': ['Furniture / Seating', 'Tableware / Chargers', 'Linens / Textiles', 'Lighting / Accents', 'Structures / Arches'],
  Bespoke: ['Fabrication / Backdrops', 'Fabrication / Hanging Decor', 'Fabrication / Stagecraft', 'Fabrication / Signage', 'Fabrication / Furniture'],
  Stockroom: ['Consumables / Cutlery', 'Consumables / Glassware', 'Consumables / Candles', 'Consumables / Napkins', 'Consumables / Wiring'],
  Rental: ['External Rental / Lighting', 'External Rental / Seating', 'External Rental / Tabletop', 'External Rental / Staging'],
  'Office Asset': ['Equipment / Logistics', 'Equipment / Comms', 'Equipment / Electronics', 'Equipment / Hydraulics'],
}

const CUSTODIAN_OPTIONS = [
  'Marco Villareal',
  'Dennis Pineda',
  'Joy Abrego',
  'Trisha Domingo',
  'Warehouse Pool (Unassigned)',
]

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export interface NewAssetDraft {
  name: string
  itemCallName?: string
  category: AssetCategory
  subCategory?: string
  description?: string
  image?: string
  unit: string

  // Shared Base Fields
  dimensions?: AssetDimensions
  is_circular?: boolean
  shape?: string
  circumference?: string
  material?: string
  colorType?: 'mono' | 'multi' | 'changeable'
  colorPrimary?: string
  colorSecondary?: string[]
  tags?: string[]

  // Event Asset
  currentStock?: number
  threshold?: number
  primaryVendorId?: string
  backupVendorId?: string
  purchaseCost?: number
  costPerUnit?: number
  lifeSpan?: string
  damageReplacementCost?: number

  // Bespoke
  rawMaterials?: string[]
  manCount?: number
  finishTimeMinutes?: number
  revisionTimeMinutes?: number
  bespokeStage?: BespokeStage

  // Stockroom
  criticalThreshold?: number
  ceilingCap?: number
  pricePerPack?: number

  // Rental
  supplierDetails?: string
  supplierContact?: string
  lengthOfRent?: string
  overduePenaltyFee?: number
  onLoanDueDate?: string

  // Office Asset
  vendorDetails?: string
  custodian?: string
  deviceModel?: string
  serialNumber?: string
  deviceSpecs?: string
}

interface AddAssetModalProps {
  onClose: () => void
  onCreate: (draft: NewAssetDraft) => void
}

/**
 * Simulates background removal by processing image canvas or returning transparent cutout data URL.
 * Falls back gracefully to original photo if anything fails.
 */
async function processBackgroundRemoval(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Process top-left background pixel sample
        const bgR = data[0]
        const bgG = data[1]
        const bgB = data[2]
        const threshold = 35

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          const isNearBg =
            Math.abs(r - bgR) < threshold &&
            Math.abs(g - bgG) < threshold &&
            Math.abs(b - bgB) < threshold

          const isLightBg = r > 238 && g > 238 && b > 238

          if (isNearBg || isLightBg) {
            data[i + 3] = 0 // Set alpha to transparent
          }
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

export function AddAssetModal({ onClose, onCreate }: AddAssetModalProps) {
  // Photo state & BG removal toggle
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [bgRemovedImage, setBgRemovedImage] = useState<string | null>(null)
  const [activePhotoMode, setActivePhotoMode] = useState<'bgRemoved' | 'original'>('bgRemoved')
  const [isProcessingBg, setIsProcessingBg] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Shared Base Fields (BLANK DEFAULTS)
  const [name, setName] = useState('')
  const [itemCallName, setItemCallName] = useState('')
  const [category, setCategory] = useState<AssetCategory>('Event Asset')
  const [subCategory, setSubCategory] = useState('')
  const [description, setDescription] = useState('')
  const [height, setHeight] = useState('')
  const [width, setWidth] = useState('')
  const [depth, setDepth] = useState('')
  const [weight, setWeight] = useState('')
  const [isCircular, setIsCircular] = useState(false)
  const [shape, setShape] = useState('')
  const [circumference, setCircumference] = useState('')
  const [material, setMaterial] = useState('')
  const [colorType, setColorType] = useState<'mono' | 'multi' | 'changeable' | ''>('')
  const [colorPrimary, setColorPrimary] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  // Event Asset Tier Fields (BLANK DEFAULTS)
  const [unit, setUnit] = useState('')
  const [currentStock, setCurrentStock] = useState('')
  const [threshold, setThreshold] = useState('')
  const [primaryVendorId, setPrimaryVendorId] = useState('')
  const [backupVendorId, setBackupVendorId] = useState('')
  const [purchaseCost, setPurchaseCost] = useState('')
  const [lifeSpan, setLifeSpan] = useState('')
  const [damageReplacementCost, setDamageReplacementCost] = useState('')

  // Bespoke Tier Fields (BLANK DEFAULTS)
  const [rawMaterials, setRawMaterials] = useState('')
  const [manCount, setManCount] = useState('')
  const [finishHours, setFinishHours] = useState('')
  const [finishMins, setFinishMins] = useState('')
  const [revisionHours, setRevisionHours] = useState('')
  const [revisionMins, setRevisionMins] = useState('')
  const [bespokeStage, setBespokeStage] = useState<BespokeStage | ''>('')

  // Stockroom Tier Fields (BLANK DEFAULTS)
  const [pricePerPack, setPricePerPack] = useState('')
  const [criticalThreshold, setCriticalThreshold] = useState('')
  const [ceilingCap, setCeilingCap] = useState('')

  // Rental Tier Fields (BLANK DEFAULTS)
  const [supplierContact, setSupplierContact] = useState('')
  const [lengthOfRent, setLengthOfRent] = useState('')
  const [overduePenaltyFee, setOverduePenaltyFee] = useState('')

  // Office Asset Tier Fields (BLANK DEFAULTS)
  const [custodian, setCustodian] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [deviceSpecs, setDeviceSpecs] = useState('')

  const canSubmit = name.trim().length > 0

  // Category switch handler — resets subCategory
  const handleCategoryChange = (newCat: AssetCategory) => {
    setCategory(newCat)
    setSubCategory('')
  }

  // Handle Photo Upload with Auto-Background Removal
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
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null
      if (!dataUrl) return

      setOriginalImage(dataUrl)
      setImageError(null)
      setIsProcessingBg(true)

      setTimeout(async () => {
        const bgRemoved = await processBackgroundRemoval(dataUrl)
        if (bgRemoved) {
          setBgRemovedImage(bgRemoved)
          setActivePhotoMode('bgRemoved')
        } else {
          setBgRemovedImage(null)
          setActivePhotoMode('original')
        }
        setIsProcessingBg(false)
      }, 500)
    }
    reader.onerror = () => setImageError('That image could not be read.')
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setOriginalImage(null)
    setBgRemovedImage(null)
    setActivePhotoMode('original')
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const activeDisplayImage =
    activePhotoMode === 'bgRemoved' && bgRemovedImage ? bgRemovedImage : originalImage

  const handleSubmit = () => {
    if (!canSubmit) return

    const finishMinutesTotal = (Number(finishHours) || 0) * 60 + (Number(finishMins) || 0)
    const revisionMinutesTotal = (Number(revisionHours) || 0) * 60 + (Number(revisionMins) || 0)
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const parsedRawMaterials = rawMaterials
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)

    const draft: NewAssetDraft = {
      name: name.trim(),
      itemCallName: itemCallName.trim() || name.trim(),
      category,
      subCategory: subCategory || undefined,
      description: description.trim() || undefined,
      image: activeDisplayImage ?? undefined,
      unit: unit.trim() || 'pcs',

      // Shared base fields
      dimensions: height || width || depth || weight ? { height: height || '—', width: width || '—', depth: depth || '—', weight: weight || '—' } : undefined,
      is_circular: isCircular,
      shape: isCircular ? shape || 'Circular' : undefined,
      circumference: isCircular ? circumference || undefined : undefined,
      material: material.trim() || undefined,
      colorType: colorType || undefined,
      colorPrimary: colorPrimary.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,

      // Event Asset
      currentStock: currentStock ? Number(currentStock) : undefined,
      threshold: threshold ? Number(threshold) : undefined,
      primaryVendorId: primaryVendorId || undefined,
      backupVendorId: backupVendorId || undefined,
      purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
      costPerUnit: purchaseCost ? Number(purchaseCost) : undefined,
      lifeSpan: lifeSpan.trim() || undefined,
      damageReplacementCost: damageReplacementCost ? Number(damageReplacementCost) : undefined,

      // Bespoke
      rawMaterials: parsedRawMaterials.length > 0 ? parsedRawMaterials : undefined,
      manCount: manCount ? Number(manCount) : undefined,
      finishTimeMinutes: finishMinutesTotal > 0 ? finishMinutesTotal : undefined,
      revisionTimeMinutes: revisionMinutesTotal > 0 ? revisionMinutesTotal : undefined,
      bespokeStage: bespokeStage || undefined,

      // Stockroom
      criticalThreshold: criticalThreshold ? Number(criticalThreshold) : undefined,
      ceilingCap: ceilingCap ? Number(ceilingCap) : undefined,
      pricePerPack: pricePerPack ? Number(pricePerPack) : undefined,

      // Rental
      supplierContact: supplierContact.trim() || undefined,
      lengthOfRent: lengthOfRent.trim() || undefined,
      overduePenaltyFee: overduePenaltyFee ? Number(overduePenaltyFee) : undefined,

      // Office Asset
      custodian: custodian || undefined,
      deviceModel: deviceModel.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      deviceSpecs: deviceSpecs.trim() || undefined,
    }

    onCreate(draft)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-card shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <span className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-primary">
              Warehouse Registry
            </span>
            <h2 className="font-serif text-xl font-medium text-card-foreground">Add New Item</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* ────────────────── SECTION 1: ASSET PHOTO & BACKGROUND REMOVAL ────────────────── */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-background/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-card-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> Asset Photo &amp; AI Cutout
              </span>
              <span className="text-[0.55rem] text-muted-foreground">PNG/JPG up to 4MB (Optional)</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-card shadow-xs">
                {activeDisplayImage ? (
                  <img
                    src={activeDisplayImage}
                    alt="Asset photo"
                    className="size-full object-contain p-1"
                  />
                ) : (
                  <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
                )}
                {isProcessingBg && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur-2xs p-1 text-center">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span className="mt-1 text-[0.55rem] font-semibold text-primary">Removing BG...</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  id="asset-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="asset-photo-input"
                    className="cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground shadow-xs transition hover:bg-accent"
                  >
                    {originalImage ? 'Replace photo' : 'Upload photo'}
                  </label>
                  {originalImage && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="size-3" /> Remove
                    </button>
                  )}
                </div>

                {originalImage && (
                  <div className="flex items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setActivePhotoMode('bgRemoved')}
                      disabled={!bgRemovedImage || isProcessingBg}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-wider transition',
                        activePhotoMode === 'bgRemoved' && bgRemovedImage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-card text-muted-foreground hover:bg-accent disabled:opacity-40',
                      )}
                    >
                      ✨ Auto-Cutout
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhotoMode('original')}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-wider transition',
                        activePhotoMode === 'original'
                          ? 'bg-foreground text-background'
                          : 'border border-border bg-card text-muted-foreground hover:bg-accent',
                      )}
                    >
                      Original
                    </button>
                  </div>
                )}
                {imageError && <p className="text-[0.6rem] font-medium text-destructive">{imageError}</p>}
              </div>
            </div>
          </div>

          {/* ────────────────── SECTION 2: SHARED BASE FIELDS ────────────────── */}
          <div className="space-y-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5 border-b border-border pb-1.5">
              <Layers className="size-3.5" /> Shared Base Details
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Item Name *
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tiffany Ceremony Chair"
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1.5 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Item Call Name
                </span>
                <input
                  value={itemCallName}
                  onChange={(e) => setItemCallName(e.target.value)}
                  placeholder="e.g. Tiffany Chair"
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1.5 focus:ring-primary/30"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Category *
                </span>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as AssetCategory)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1.5 focus:ring-primary/30"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Sub-Category
                </span>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1.5 focus:ring-primary/30"
                >
                  <option value="">Select sub-category...</option>
                  {(SUB_CATEGORIES[category] || []).map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Description
              </span>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Item specification & staging notes..."
                className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1.5 focus:ring-primary/30"
              />
            </label>

            {/* Dimensions & Weight */}
            <div>
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
                Dimensions &amp; Weight
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Height (e.g. 90 cm)"
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                />
                <input
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Width (e.g. 45 cm)"
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                />
                <input
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  placeholder="Depth (e.g. 40 cm)"
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                />
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Weight (e.g. 6 kg)"
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                />
              </div>

              {/* Circular Shape Toggle */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="circular-toggle"
                  type="checkbox"
                  checked={isCircular}
                  onChange={(e) => setIsCircular(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary/30"
                />
                <label htmlFor="circular-toggle" className="text-xs font-semibold text-card-foreground">
                  Circular / Cylindrical Asset
                </label>
              </div>

              {isCircular && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    value={shape}
                    onChange={(e) => setShape(e.target.value)}
                    placeholder="Shape (e.g. Circular Rim)"
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                  />
                  <input
                    value={circumference}
                    onChange={(e) => setCircumference(e.target.value)}
                    placeholder="Circumference (e.g. 103 cm)"
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
              )}
            </div>

            {/* Material, Color & Tags */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Material
                </span>
                <input
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. Resin Wood"
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Color State
                </span>
                <select
                  value={colorType}
                  onChange={(e) => setColorType(e.target.value as any)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs outline-none"
                >
                  <option value="">Select state...</option>
                  <option value="mono">Mono-color</option>
                  <option value="multi">Multi-color</option>
                  <option value="changeable">Changeable</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Primary Color
                </span>
                <input
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  placeholder="e.g. Polished Gold"
                  className="rounded-md border border-input bg-background px-3 py-2 text-xs outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Tags (comma-separated)
              </span>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. Ceremony, Seating, Gala"
                className="rounded-md border border-input bg-background px-3 py-2 text-xs outline-none"
              />
            </label>
          </div>

          {/* ────────────────── SECTION 3: DYNAMIC TIER-SPECIFIC FIELDS ────────────────── */}
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Tier Inputs ({category})
            </p>

            {/* 1. EVENT ASSET */}
            {category === 'Event Asset' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Unit</span>
                    <input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. pcs"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Starting Stock</span>
                    <input
                      type="number"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      placeholder="e.g. 15"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Threshold</span>
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      placeholder="e.g. 5"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchableVendorSelect
                    label="Primary Vendor"
                    value={primaryVendorId}
                    onChange={setPrimaryVendorId}
                    placeholder="Select primary vendor…"
                  />
                  <SearchableVendorSelect
                    label="Backup Vendor"
                    value={backupVendorId}
                    onChange={setBackupVendorId}
                    placeholder="Select backup vendor…"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Purchase Cost (₱)</span>
                    <input
                      type="number"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      placeholder="e.g. 4500"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Life Span</span>
                    <input
                      value={lifeSpan}
                      onChange={(e) => setLifeSpan(e.target.value)}
                      placeholder="e.g. 3 Years"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Damage Cost (₱)</span>
                    <input
                      type="number"
                      value={damageReplacementCost}
                      onChange={(e) => setDamageReplacementCost(e.target.value)}
                      placeholder="e.g. 1500"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 2. BESPOKE */}
            {category === 'Bespoke' && (
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">
                    Raw Materials (comma-separated)
                  </span>
                  <input
                    value={rawMaterials}
                    onChange={(e) => setRawMaterials(e.target.value)}
                    placeholder="e.g. Plywood 3/4, Acrylic Panel, Gold Leaf"
                    className="rounded-md border border-input bg-background px-3 py-2 text-xs outline-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Man Count</span>
                    <input
                      type="number"
                      min={1}
                      value={manCount}
                      onChange={(e) => setManCount(e.target.value)}
                      placeholder="e.g. 3"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Build Stage</span>
                    <select
                      value={bespokeStage}
                      onChange={(e) => setBespokeStage(e.target.value as BespokeStage)}
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="">Select build stage...</option>
                      <option value="Unprepped">Unprepped</option>
                      <option value="Prepping">Prepping</option>
                      <option value="Ready">Ready</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Total Budget (₱)</span>
                    <input
                      type="number"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      placeholder="e.g. 25000"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>

                {/* Duration Inputs */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-background p-2.5">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground block mb-1">
                      Estimated Finish Time
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={finishHours}
                        onChange={(e) => setFinishHours(e.target.value)}
                        placeholder="Hours"
                        className="w-full rounded border border-input bg-card px-2 py-1 text-xs text-center"
                      />
                      <span className="text-xs font-semibold">h</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={finishMins}
                        onChange={(e) => setFinishMins(e.target.value)}
                        placeholder="Mins"
                        className="w-full rounded border border-input bg-card px-2 py-1 text-xs text-center"
                      />
                      <span className="text-xs font-semibold">m</span>
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-background p-2.5">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground block mb-1">
                      Revision Buffer Time
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={revisionHours}
                        onChange={(e) => setRevisionHours(e.target.value)}
                        placeholder="Hours"
                        className="w-full rounded border border-input bg-card px-2 py-1 text-xs text-center"
                      />
                      <span className="text-xs font-semibold">h</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={revisionMins}
                        onChange={(e) => setRevisionMins(e.target.value)}
                        placeholder="Mins"
                        className="w-full rounded border border-input bg-card px-2 py-1 text-xs text-center"
                      />
                      <span className="text-xs font-semibold">m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. STOCKROOM */}
            {category === 'Stockroom' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Unit</span>
                    <input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. sets"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Starting Stock</span>
                    <input
                      type="number"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      placeholder="e.g. 50"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Price / Unit (₱)</span>
                    <input
                      type="number"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      placeholder="e.g. 150"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchableVendorSelect
                    label="Primary Vendor"
                    value={primaryVendorId}
                    onChange={setPrimaryVendorId}
                    placeholder="Select primary vendor…"
                  />
                  <SearchableVendorSelect
                    label="Backup Vendor"
                    value={backupVendorId}
                    onChange={setBackupVendorId}
                    placeholder="Select backup vendor…"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Price / Pack (₱)</span>
                    <input
                      type="number"
                      value={pricePerPack}
                      onChange={(e) => setPricePerPack(e.target.value)}
                      placeholder="e.g. 1800"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Safety Threshold</span>
                    <input
                      type="number"
                      value={criticalThreshold}
                      onChange={(e) => setCriticalThreshold(e.target.value)}
                      placeholder="e.g. 30"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Ceiling Cap Level</span>
                    <input
                      type="number"
                      value={ceilingCap}
                      onChange={(e) => setCeilingCap(e.target.value)}
                      placeholder="e.g. 200"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 4. RENTAL */}
            {category === 'Rental' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchableVendorSelect
                    label="Primary Vendor"
                    value={primaryVendorId}
                    onChange={setPrimaryVendorId}
                    placeholder="Select primary rental vendor…"
                  />
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Supplier Contact / Ref</span>
                    <input
                      value={supplierContact}
                      onChange={(e) => setSupplierContact(e.target.value)}
                      placeholder="e.g. Jean Valjean (0917-555-0192)"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Rental Rate (₱)</span>
                    <input
                      type="number"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      placeholder="e.g. 8500"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Length of Rent</span>
                    <input
                      value={lengthOfRent}
                      onChange={(e) => setLengthOfRent(e.target.value)}
                      placeholder="e.g. 7 Days"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Overdue Penalty (₱)</span>
                    <input
                      type="number"
                      value={overduePenaltyFee}
                      onChange={(e) => setOverduePenaltyFee(e.target.value)}
                      placeholder="e.g. 1500"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 5. OFFICE ASSET */}
            {category === 'Office Asset' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchableVendorSelect
                    label="Primary Vendor"
                    value={primaryVendorId}
                    onChange={setPrimaryVendorId}
                    placeholder="Select primary vendor…"
                  />
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Assigned Custodian</span>
                    <select
                      value={custodian}
                      onChange={(e) => setCustodian(e.target.value)}
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="">Select assigned custodian...</option>
                      {CUSTODIAN_OPTIONS.map((cust) => (
                        <option key={cust} value={cust}>
                          {cust}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Device Info Fields */}
                <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
                  <span className="text-[0.58rem] font-bold uppercase tracking-[0.08em] text-primary block">
                    Device Info &amp; Hardware Specs
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.55rem] font-bold uppercase text-muted-foreground">Device Model / Type</span>
                      <input
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                        placeholder="e.g. MacBook Pro 16 M3 Max"
                        className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.55rem] font-bold uppercase text-muted-foreground">Serial Number / Asset Tag</span>
                      <input
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="e.g. SN-2026-88401"
                        className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.55rem] font-bold uppercase text-muted-foreground">Technical Specs / Condition</span>
                    <input
                      value={deviceSpecs}
                      onChange={(e) => setDeviceSpecs(e.target.value)}
                      placeholder="e.g. 36GB RAM, 1TB SSD — MINT CONDITION"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Purchase Cost (₱)</span>
                    <input
                      type="number"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      placeholder="e.g. 45000"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Warranty / Life Span</span>
                    <input
                      value={lifeSpan}
                      onChange={(e) => setLifeSpan(e.target.value)}
                      placeholder="e.g. 5 Years Warranty"
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-md bg-primary px-5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            Add Item to Registry
          </button>
        </div>
      </div>
    </div>
  )
}
