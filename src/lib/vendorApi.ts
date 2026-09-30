import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface RepresentativeDto {
  id?: string
  representativeId?: string
  vendorId?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  title?: string
}

export interface VendorDto {
  id?: string
  vendorId?: string
  name: string
  address?: string | null
  contactName?: string
  email?: string
  phone?: string
  specialty?: string
  status?: string
  representatives?: RepresentativeDto[]
}

export interface CreateVendorRequestDto {
  name: string
  contactName?: string
  email?: string
  phone?: string
  specialty?: string
}

export interface CreateRepresentativeRequestDto {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  title?: string
}

function getHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export type VendorFetchResult =
  | { kind: 'success'; status: number; vendors: VendorDto[] }
  | { kind: 'auth-error'; status: number; message: string }
  | { kind: 'request-error'; status: number; message: string }

/**
 * GET /api/vendors with structured status result
 */
export async function fetchVendorsResultApi(): Promise<VendorFetchResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vendors`, {
      headers: getHeaders(),
    })
    if (res.status === 401 || res.status === 403) {
      console.warn(`[vendorApi] GET /api/vendors returned HTTP ${res.status}`)
      return {
        kind: 'auth-error',
        status: res.status,
        message: res.status === 401 ? 'Authentication required.' : 'Access denied.',
      }
    }
    if (!res.ok) {
      console.warn(`[vendorApi] GET /api/vendors returned HTTP ${res.status}`)
      return {
        kind: 'request-error',
        status: res.status,
        message: `Vendor service returned HTTP ${res.status}`,
      }
    }
    const data = await res.json()
    const vendors = Array.isArray(data) ? data : []
    return {
      kind: 'success',
      status: res.status,
      vendors,
    }
  } catch (err) {
    console.warn('[vendorApi] GET /api/vendors network error:', err)
    return {
      kind: 'request-error',
      status: 0,
      message: 'Network connection failed.',
    }
  }
}

/**
 * GET /api/vendors
 */
export async function fetchVendorsApi(): Promise<VendorDto[]> {
  const result = await fetchVendorsResultApi()
  return result.kind === 'success' ? result.vendors : []
}

/**
 * POST /api/vendors
 */
export async function createVendorApi(req: CreateVendorRequestDto): Promise<VendorDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vendors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      console.warn(`[vendorApi] POST /api/vendors returned HTTP ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn('[vendorApi] POST /api/vendors failed:', err)
    return null
  }
}

/**
 * POST /api/vendors/{vendorId}/representatives
 */
export async function createVendorRepresentativeApi(
  vendorId: string,
  req: CreateRepresentativeRequestDto,
): Promise<RepresentativeDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vendors/${encodeURIComponent(vendorId)}/representatives`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      console.warn(`[vendorApi] POST /api/vendors/${vendorId}/representatives returned HTTP ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn(`[vendorApi] POST /api/vendors/${vendorId}/representatives failed:`, err)
    return null
  }
}
