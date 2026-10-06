import { useEffect, useState, useMemo } from 'react'
import { X, Palette, Plus, Search, Check, AlertTriangle, Building2 } from 'lucide-react'
import {
  fetchPaintBrandsApi,
  fetchPaintColorsApi,
  createPaintBrandApi,
  createPaintColorApi,
  canManagePaintRegistry,
  type PaintBrand,
  type PaintColor,
} from '@/features/inventory/api/paintApi'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface WarehousePaintRegistryModalProps {
  onClose: () => void
}

export function WarehousePaintRegistryModal({ onClose }: WarehousePaintRegistryModalProps) {
  const { currentUser } = useAuth()
  const canEdit = canManagePaintRegistry(currentUser)

  // Data states
  const [brands, setBrands] = useState<PaintBrand[]>([])
  const [colors, setColors] = useState<PaintColor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters & Tab
  const [activeTab, setActiveTab] = useState<'colors' | 'brands'>('colors')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('All')

  // Creation forms
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [brandCode, setBrandCode] = useState('')
  const [brandDesc, setBrandDesc] = useState('')

  const [isAddingColor, setIsAddingColor] = useState(false)
  const [colorName, setColorName] = useState('')
  const [colorHex, setColorHex] = useState('#D4AF37')
  const [colorBrandId, setColorBrandId] = useState('')
  const [colorFinish, setColorFinish] = useState('Matte')
  const [colorCode, setColorCode] = useState('')

  // Async submission states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [fetchedBrands, fetchedColors] = await Promise.all([
        fetchPaintBrandsApi(),
        fetchPaintColorsApi(),
      ])
      setBrands(fetchedBrands)
      setColors(fetchedColors)
      if (fetchedBrands.length > 0 && !colorBrandId) {
        setColorBrandId(fetchedBrands[0].id)
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load paint registry.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredColors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return colors.filter((c) => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.colorCode && c.colorCode.toLowerCase().includes(q))
      const matchesBrand = selectedBrandFilter === 'All' || c.brandId === selectedBrandFilter || c.brandName === selectedBrandFilter
      return matchesSearch && matchesBrand
    })
  }, [colors, searchQuery, selectedBrandFilter])

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return brands.filter((b) => !q || b.name.toLowerCase().includes(q) || (b.code && b.code.toLowerCase().includes(q)))
  }, [brands, searchQuery])

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandName.trim() || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const created = await createPaintBrandApi({
        name: brandName.trim(),
        code: brandCode.trim() || undefined,
        description: brandDesc.trim() || undefined,
        active: true,
      })
      if (created) {
        setBrands((prev) => [...prev, created])
      } else {
        setBrands((prev) => [
          ...prev,
          {
            id: `brand-${Date.now()}`,
            name: brandName.trim(),
            code: brandCode.trim() || undefined,
            description: brandDesc.trim() || undefined,
            active: true,
          },
        ])
      }
      setSuccessMessage(`Paint brand "${brandName}" successfully registered.`)
      setBrandName('')
      setBrandCode('')
      setBrandDesc('')
      setIsAddingBrand(false)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create paint brand.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateColor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colorName.trim() || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const parentBrand = brands.find((b) => b.id === colorBrandId)

    try {
      const created = await createPaintColorApi({
        brandId: colorBrandId || (brands[0]?.id ?? 'brand-1'),
        brandName: parentBrand?.name || 'Standard Brand',
        name: colorName.trim(),
        hexCode: colorHex || '#111111',
        finish: colorFinish || 'Matte',
        colorCode: colorCode.trim() || undefined,
      })
      if (created) {
        setColors((prev) => [...prev, created])
      } else {
        setColors((prev) => [
          ...prev,
          {
            id: `col-${Date.now()}`,
            brandId: colorBrandId || (brands[0]?.id ?? 'brand-1'),
            brandName: parentBrand?.name || 'Standard Brand',
            name: colorName.trim(),
            hexCode: colorHex || '#111111',
            finish: colorFinish || 'Matte',
            colorCode: colorCode.trim() || undefined,
          },
        ])
      }
      setSuccessMessage(`Paint swatch "${colorName}" successfully registered.`)
      setColorName('')
      setColorCode('')
      setIsAddingColor(false)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create paint color.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[42rem] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Palette className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-primary">
                  Warehouse Operations
                </span>
                <span className="text-[0.65rem] font-mono text-muted-foreground">
                  Reference Registry
                </span>
              </div>
              <h2 className="mt-0.5 font-serif text-lg font-bold text-card-foreground">
                Paint Brand &amp; Color Registry
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="border-b border-border/70 bg-muted/20 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('colors')}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition',
                activeTab === 'colors'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              Paint Swatches ({colors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('brands')}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition',
                activeTab === 'brands'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              Paint Brands ({brands.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search paints…"
                className="w-full rounded-md border border-input bg-background py-1 pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'colors') {
                    setIsAddingColor(true)
                    setIsAddingBrand(false)
                  } else {
                    setIsAddingBrand(true)
                    setIsAddingColor(false)
                  }
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="size-3.5" />
                {activeTab === 'colors' ? 'Add Swatch' : 'Add Brand'}
              </button>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button type="button" onClick={() => setErrorMessage(null)}>
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={() => setSuccessMessage(null)}>
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Add Brand Form Modal Section */}
          {isAddingBrand && canEdit && (
            <form onSubmit={handleCreateBrand} className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Building2 className="size-3.5" /> Register New Paint Brand
                </span>
                <button type="button" onClick={() => setIsAddingBrand(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Brand Name *</span>
                  <input
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Boysen Paints"
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Brand Code / Acronym</span>
                  <input
                    value={brandCode}
                    onChange={(e) => setBrandCode(e.target.value)}
                    placeholder="e.g. BOY"
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs">
                <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Description</span>
                <input
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="e.g. Architectural coatings and scenic finishes"
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                />
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingBrand(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !brandName.trim()}
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          )}

          {/* Add Color Swatch Form Section */}
          {isAddingColor && canEdit && (
            <form onSubmit={handleCreateColor} className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Palette className="size-3.5" /> Register New Paint Swatch
                </span>
                <button type="button" onClick={() => setIsAddingColor(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Color Name *</span>
                  <input
                    required
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    placeholder="e.g. Imperial Gold"
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Paint Brand *</span>
                  <select
                    value={colorBrandId}
                    onChange={(e) => setColorBrandId(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Finish Type</span>
                  <select
                    value={colorFinish}
                    onChange={(e) => setColorFinish(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  >
                    <option value="Matte">Matte</option>
                    <option value="Satin">Satin</option>
                    <option value="Semi-Gloss">Semi-Gloss</option>
                    <option value="Gloss">Gloss</option>
                    <option value="Metallic">Metallic</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Color Hex Swatch</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="size-8 rounded border border-input cursor-pointer p-0.5"
                    />
                    <input
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      placeholder="#D4AF37"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Color Code / Swatch Ref</span>
                  <input
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    placeholder="e.g. B-50"
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingColor(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !colorName.trim()}
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Swatch'}
                </button>
              </div>
            </form>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-3 py-8">
              <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
              <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
              <div className="h-12 rounded-xl bg-muted/20 animate-pulse" />
            </div>
          )}

          {/* Load Error */}
          {loadError && !isLoading && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-xs text-destructive">
              <AlertTriangle className="size-6 mx-auto mb-2 opacity-80" />
              <p className="font-semibold">{loadError}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-destructive underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Color Swatches Grid */}
          {activeTab === 'colors' && !isLoading && !loadError && (
            <div>
              {/* Brand Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <span className="text-[0.6rem] font-bold uppercase text-muted-foreground mr-1">Brand:</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrandFilter('All')}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[0.58rem] font-semibold transition',
                    selectedBrandFilter === 'All'
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  All Brands
                </button>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrandFilter(b.id)}
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[0.58rem] font-semibold transition',
                      selectedBrandFilter === b.id
                        ? 'bg-foreground text-background'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {b.name}
                  </button>
                ))}
              </div>

              {filteredColors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No paint swatches match the current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredColors.map((color) => (
                    <div
                      key={color.id}
                      className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3.5 shadow-2xs hover:border-primary/40 transition"
                    >
                      <div
                        className="size-10 rounded-lg shrink-0 border border-black/15 shadow-inner"
                        style={{ backgroundColor: color.hexCode }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-serif text-xs font-bold text-card-foreground truncate">
                            {color.name}
                          </h4>
                          {color.colorCode && (
                            <span className="text-[0.55rem] font-mono font-bold text-primary shrink-0">
                              {color.colorCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[0.65rem] text-muted-foreground mt-0.5 truncate">
                          {color.paintBrand || color.brandName || 'Standard Brand'} · <span className="italic">{color.materialFinish || color.finish || 'Matte'}</span>
                        </p>
                        <div className="flex items-center justify-between gap-1 mt-1">
                          <span className="text-[0.58rem] font-mono text-muted-foreground/80">
                            {color.hexCode}
                          </span>
                          {color.availableQuantity !== undefined ? (
                            color.availableQuantity > 0 ? (
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[0.52rem] font-semibold text-emerald-700 dark:text-emerald-300">
                                {color.availableQuantity} Avail{color.quantityInStock !== undefined ? ` / ${color.quantityInStock} in stock` : ''}
                              </span>
                            ) : (
                              <span className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[0.52rem] font-semibold text-rose-700 dark:text-rose-300">
                                Not Available
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Brands List View */}
          {activeTab === 'brands' && !isLoading && !loadError && (
            <div>
              {filteredBrands.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No paint brands match the current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBrands.map((brand) => (
                    <div
                      key={brand.id}
                      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-primary" />
                          <h4 className="font-serif text-sm font-bold text-card-foreground">
                            {brand.name}
                          </h4>
                        </div>
                        {brand.code && (
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-[0.58rem] font-mono font-bold text-primary">
                            {brand.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {brand.description || 'Approved scenic & architectural coating supplier.'}
                      </p>
                      <div className="text-[0.65rem] text-muted-foreground/80 border-t border-border/50 pt-2 flex items-center justify-between">
                        <span>Swatches: {colors.filter((c) => c.brandId === brand.id || c.brandName === brand.name).length}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active Partner</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
