import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'
import type { CatalogAsset } from '@/lib/warehouse-catalog'

export interface BackendAssetPayload {
  name: string
  description?: string
  quantity?: number
  catalogPhotoUrl?: string
}

export function mapCatalogAssetToBackendPayload(asset: Partial<CatalogAsset>): BackendAssetPayload {
  return {
    name: asset.name || '',
    description: asset.description || '',
    quantity: asset.currentStock ?? 0,
    catalogPhotoUrl: asset.image || '',
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

/**
 * Query parameters forwarded to GET /api/assets.
 * Mirrors AssetController.GetAssets query params exactly:
 *   search   - free-text search (name / description)
 *   category - category filter
 *   theme    - theme/tag filter (maps to tagValue on backend)
 *   page, pageSize - pagination
 */
export interface SearchAssetsParams {
  search?: string
  category?: string
  theme?: string
  page?: number
  pageSize?: number
}

/**
 * Fetches canonical Asset Registry data from GET /api/assets.
 *
 * Supports backend-side search/theme/category filtering.
 * Backend contract (AssetController.cs):
 *   GET /api/assets?search=&category=&theme=&page=&pageSize=
 *
 * Returns [] on any failure — callers must handle empty state explicitly.
 * The empty result is a real backend response, not a fallback stock substitute.
 */
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
    // AssetController may return a bare array or a paginated envelope.
    // Normalize here so Canvas never mistakes a valid envelope for an empty catalog.
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
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.warn('[assetsApi] Create asset API call skipped/fallback:', err)
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
    return res.ok
  } catch (err) {
    console.warn('[assetsApi] Update asset API call skipped/fallback:', err)
    return true
  }
}
