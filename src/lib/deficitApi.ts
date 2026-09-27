import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface DeficitQueueItemDto {
  id: string
  eventId?: string | null
  eventName?: string | null
  assetId?: string | null
  assetDescription?: string | null
  itemCategory?: string | null
  category?: string | null
  itemName: string
  quantityNeeded: number
  urgencyLevel?: string | null
  priority?: string | null
  status: string
  triggerSource?: string | null
  primaryVendorId?: string | null
  backupVendorId?: string | null
  costPerUnit?: number | null
  unit?: string | null
  currentStock?: number | null
  threshold?: number | null
  taggedForDispatch?: boolean | null
  reorderQty?: number | null
  poRef?: string | null
  etaHours?: number | null
  supplier?: string | null
  createdAt?: string
}

export interface CreateDeficitItemRequestDto {
  eventId?: string
  assetId?: string
  assetDescription?: string
  itemCategory?: string
  itemName?: string
  quantityNeeded: number
  urgencyLevel?: string
  priority?: string
  triggerSource?: string
}

export interface UpdateDeficitStatusRequestDto {
  status: string
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

/**
 * GET /api/deficit-queue
 */
export async function fetchDeficitQueueApi(eventId?: string, status?: string): Promise<DeficitQueueItemDto[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const params = new URLSearchParams()
    if (eventId) params.set('eventId', eventId)
    if (status) params.set('status', status)
    const queryString = params.toString() ? `?${params.toString()}` : ''

    const res = await fetch(`${API_BASE_URL}/api/deficit-queue${queryString}`, {
      headers: getHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      console.warn(`[deficitApi] GET /api/deficit-queue returned HTTP ${res.status}`)
      throw new Error(`Failed to fetch deficit queue: HTTP ${res.status}`)
    }
    const data = await res.json()
    return Array.isArray(data)
      ? data.map((d: any) => ({
          ...d,
          itemName: d.itemName || d.assetDescription || 'Asset Item',
        }))
      : []
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('[deficitApi] GET /api/deficit-queue failed:', err)
    throw err
  }
}

/**
 * POST /api/deficit-queue
 */
export async function createDeficitItemApi(req: CreateDeficitItemRequestDto): Promise<DeficitQueueItemDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/deficit-queue`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      console.warn(`[deficitApi] POST /api/deficit-queue returned HTTP ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn('[deficitApi] POST /api/deficit-queue failed:', err)
    return null
  }
}

/**
 * PATCH /api/deficit-queue/{id}/status
 */
export async function updateDeficitStatusApi(id: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/deficit-queue/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    })
    return res.ok || res.status === 204
  } catch (err) {
    console.warn(`[deficitApi] PATCH /api/deficit-queue/${id}/status failed:`, err)
    return false
  }
}
