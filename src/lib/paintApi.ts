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
  brandId: string
  brandName?: string
  name: string
  hexCode: string
  finish?: string // 'Matte' | 'Gloss' | 'Semi-Gloss' | 'Satin'
  colorCode?: string
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
  { id: 'col-1', brandId: 'brand-1', brandName: 'Boysen', name: 'Matte Black', hexCode: '#111111', finish: 'Matte', colorCode: 'B-01' },
  { id: 'col-2', brandId: 'brand-1', brandName: 'Boysen', name: 'Pure White', hexCode: '#FFFFFF', finish: 'Satin', colorCode: 'B-02' },
  { id: 'col-3', brandId: 'brand-2', brandName: 'Davies', name: 'Imperial Gold', hexCode: '#D4AF37', finish: 'Gloss', colorCode: 'D-50' },
  { id: 'col-4', brandId: 'brand-2', brandName: 'Davies', name: 'Champagne Bronze', hexCode: '#8E795D', finish: 'Semi-Gloss', colorCode: 'D-55' },
  { id: 'col-5', brandId: 'brand-3', brandName: 'Nippon Paint', name: 'Midnight Navy', hexCode: '#0A192F', finish: 'Matte', colorCode: 'N-80' },
]

export async function fetchPaintBrandsApi(): Promise<PaintBrand[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/paint/brands`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return CANONICAL_PAINT_BRANDS
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data : CANONICAL_PAINT_BRANDS
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
    return await res.json()
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
    return Array.isArray(data) && data.length > 0 ? data : CANONICAL_PAINT_COLORS
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
    return await res.json()
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
