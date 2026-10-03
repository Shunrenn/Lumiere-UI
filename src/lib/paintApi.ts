import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface PaintBrand {
  id: string
  name: string
  code?: string
  description?: string
  active?: boolean
}

export interface PaintColor {
  id: string
  assetId?: string
  assetName?: string
  brandId?: string
  brandName?: string
  paintBrand?: string
  name: string
  hexCode: string
  materialFinish?: string
  finish?: string // 'Matte' | 'Gloss' | 'Semi-Gloss' | 'Satin'
  colorCode?: string
  colorOrder?: number
  quantityInStock?: number
  availableQuantity?: number
  operationalDomain?: string
  category?: string
  createdAt?: string
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const CANONICAL_PAINT_BRANDS: PaintBrand[] = [
  { id: 'brand-1', name: 'Boysen', code: 'BOY', description: 'Standard architectural & scenic coatings', active: true },
  { id: 'brand-2', name: 'Davies', code: 'DAV', description: 'Premium acrylic and industrial enamels', active: true },
  { id: 'brand-3', name: 'Nippon Paint', code: 'NIP', description: 'Specialty finishes & metallics', active: true },
]

export const CANONICAL_PAINT_COLORS: PaintColor[] = [
  { id: 'col-1', brandId: 'brand-1', brandName: 'Boysen', paintBrand: 'Boysen', name: 'Matte Black', hexCode: '#111111', finish: 'Matte', materialFinish: 'Matte', colorCode: 'B-01', quantityInStock: 25, availableQuantity: 20 },
  { id: 'col-2', brandId: 'brand-1', brandName: 'Boysen', paintBrand: 'Boysen', name: 'Pure White', hexCode: '#FFFFFF', finish: 'Satin', materialFinish: 'Satin', colorCode: 'B-02', quantityInStock: 40, availableQuantity: 38 },
  { id: 'col-3', brandId: 'brand-2', brandName: 'Davies', paintBrand: 'Davies', name: 'Imperial Gold', hexCode: '#D4AF37', finish: 'Gloss', materialFinish: 'Gloss', colorCode: 'D-50', quantityInStock: 15, availableQuantity: 12 },
  { id: 'col-4', brandId: 'brand-2', brandName: 'Davies', paintBrand: 'Davies', name: 'Champagne Bronze', hexCode: '#8E795D', finish: 'Semi-Gloss', materialFinish: 'Semi-Gloss', colorCode: 'D-55', quantityInStock: 10, availableQuantity: 8 },
  { id: 'col-5', brandId: 'brand-3', brandName: 'Nippon Paint', paintBrand: 'Nippon Paint', name: 'Midnight Navy', hexCode: '#0A192F', finish: 'Matte', materialFinish: 'Matte', colorCode: 'N-80', quantityInStock: 8, availableQuantity: 5 },
]

export function normalizePaintColor(raw: any): PaintColor {
  if (!raw) {
    return { id: '', name: 'Unknown', hexCode: '#000000' }
  }

  const id = String(raw.id ?? raw.Id ?? '')
  const assetId = raw.assetId ?? raw.AssetId ?? undefined
  const assetName = raw.assetName ?? raw.AssetName ?? undefined
  const brandId = raw.brandId ?? raw.BrandId ?? ''
  const brandName = raw.brandName ?? raw.BrandName ?? raw.paintBrand ?? raw.PaintBrand ?? ''
  const paintBrand = raw.paintBrand ?? raw.PaintBrand ?? brandName
  const name = raw.name ?? raw.Name ?? 'Unnamed Color'
  const hexCode = raw.hexCode ?? raw.HexCode ?? '#000000'
  const finish = raw.finish ?? raw.Finish ?? raw.materialFinish ?? raw.MaterialFinish ?? 'Matte'
  const materialFinish = raw.materialFinish ?? raw.MaterialFinish ?? finish
  const colorCode = raw.colorCode ?? raw.ColorCode ?? undefined
  const colorOrder = raw.colorOrder ?? raw.ColorOrder != null ? Number(raw.colorOrder ?? raw.ColorOrder) : undefined
  const quantityInStock = raw.quantityInStock ?? raw.QuantityInStock != null ? Number(raw.quantityInStock ?? raw.QuantityInStock) : undefined
  const availableQuantity = raw.availableQuantity ?? raw.AvailableQuantity != null ? Number(raw.availableQuantity ?? raw.AvailableQuantity) : quantityInStock
  const operationalDomain = raw.operationalDomain ?? raw.OperationalDomain ?? undefined
  const category = raw.category ?? raw.Category ?? undefined
  const createdAt = raw.createdAt ?? raw.CreatedAt ?? undefined

  return {
    id,
    assetId,
    assetName,
    brandId,
    brandName,
    paintBrand,
    name,
    hexCode,
    finish,
    materialFinish,
    colorCode,
    colorOrder,
    quantityInStock,
    availableQuantity,
    operationalDomain,
    category,
    createdAt,
  }
}

export function normalizePaintBrand(raw: any): PaintBrand {
  if (!raw) {
    return { id: '', name: 'Unknown' }
  }
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    name: raw.name ?? raw.Name ?? 'Unknown Brand',
    code: raw.code ?? raw.Code ?? undefined,
    description: raw.description ?? raw.Description ?? undefined,
    active: Boolean(raw.active ?? raw.Active ?? true),
  }
}

export async function fetchPaintBrandsApi(): Promise<PaintBrand[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/paint/brands`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return CANONICAL_PAINT_BRANDS
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data.map(normalizePaintBrand) : CANONICAL_PAINT_BRANDS
  } catch (err) {
    console.warn('[paintApi] Fetch paint brands fallback to canonical:', err)
    return CANONICAL_PAINT_BRANDS
  }
}

export async function createPaintBrandApi(brand: Omit<PaintBrand, 'id'>): Promise<PaintBrand | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/paint/brands`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(brand),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return normalizePaintBrand(data)
  } catch (err: any) {
    console.warn('[paintApi] Create paint brand error:', err)
    throw err
  }
}

export async function fetchPaintColorsApi(): Promise<PaintColor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/paint/colors`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return CANONICAL_PAINT_COLORS
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data.map(normalizePaintColor) : CANONICAL_PAINT_COLORS
  } catch (err) {
    console.warn('[paintApi] Fetch paint colors fallback to canonical:', err)
    return CANONICAL_PAINT_COLORS
  }
}

export async function createPaintColorApi(color: Omit<PaintColor, 'id'>): Promise<PaintColor | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/paint/colors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(color),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return normalizePaintColor(data)
  } catch (err: any) {
    console.warn('[paintApi] Create paint color error:', err)
    throw err
  }
}

export function canManagePaintRegistry(user: { role?: string; subRole?: string; fullWarehouseAccess?: boolean } | null): boolean {
  if (!user) return false
  if (user.fullWarehouseAccess) return true
  const r = (user.role || '').trim()
  const s = (user.subRole || '').trim()
  if (r === 'Admin' || r === 'SystemAdmin' || r === 'Warehouse Operations Manager' || r === 'Warehouse Manager') return true
  if (s === 'Production Manager' || r === 'Production Manager') return true
  if (s === 'Inventory Officer' || r === 'Inventory Officer') return true
  return false
}
