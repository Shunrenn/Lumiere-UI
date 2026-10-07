import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'
import type { CatalogAsset } from '@/lib/types'

export interface BackendAssetPayload {
  name: string
  description?: string
  quantity?: number
  catalogPhotoUrl?: string
  photoUrl?: string
  category?: string
  cost?: number
  originalValue?: number
  assetState?: string
  assetTier?: number
}

export function mapCatalogAssetToBackendPayload(asset: Partial<CatalogAsset>): BackendAssetPayload {
  return {
    name: asset.name || '',
    description: asset.description || '',
    quantity: asset.currentStock ?? (asset as any).quantity ?? (asset as any).stock ?? 0,
    catalogPhotoUrl: asset.image || (asset as any).catalogPhotoUrl || (asset as any).photoUrl || '',
    photoUrl: asset.image || (asset as any).photoUrl || (asset as any).catalogPhotoUrl || '',
    category: asset.category || 'Stockroom Assets',
    cost: asset.purchaseCost ?? asset.costPerUnit ?? (asset as any).cost,
    originalValue: (asset as any).originalValue ?? asset.purchaseCost ?? asset.costPerUnit ?? (asset as any).cost,
    assetState: asset.status || (asset as any).assetState || 'Available',
    assetTier: (asset as any).assetTier ?? (asset as any).tier ?? 1,
  }
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

export interface SearchAssetsParams {
  search?: string
  category?: string
  theme?: string
  page?: number
  pageSize?: number
}

export async function fetchAssetsApi(params?: SearchAssetsParams): Promise<Partial<CatalogAsset>[]> {
  try {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.category) qs.set('category', params.category)
    if (params?.theme) qs.set('theme', params.theme)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.pageSize != null) qs.set('pageSize', String(params.pageSize))
    const query = qs.toString()
    const url = query ? `${API_BASE_URL}/api/assets?${query}` : `${API_BASE_URL}/api/assets`
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return []
    const body = await res.json()
    if (Array.isArray(body)) return body
    if (Array.isArray(body?.items)) return body.items
    if (Array.isArray(body?.data)) return body.data
    if (Array.isArray(body?.assets)) return body.assets
    if (Array.isArray(body?.result?.items)) return body.result.items
    if (Array.isArray(body?.result?.assets)) return body.result.assets
    return []
  } catch (err) {
    console.warn('[assetsApi] Fetch assets API call skipped/fallback:', err)
    return []
  }
}

export async function createAssetApi(asset: Partial<CatalogAsset>): Promise<Partial<CatalogAsset> | null> {
  try {
    const payload = mapCatalogAssetToBackendPayload(asset)
    const res = await fetch(`${API_BASE_URL}/api/assets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.warn(`[assetsApi] POST /api/assets failed with HTTP ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('[assetsApi] Create asset API call failed:', err)
    return null
  }
}

export async function updateAssetApi(id: string, asset: Partial<CatalogAsset>): Promise<boolean> {
  try {
    const payload = mapCatalogAssetToBackendPayload(asset)
    const res = await fetch(`${API_BASE_URL}/api/assets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.warn(`[assetsApi] PUT /api/assets/${id} failed with HTTP ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[assetsApi] Update asset API call failed:', err)
    return false
  }
}
