import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface BulkReservationRequest {
  eventId: string
  assetIds: string[]
  lockStart?: string
  lockEnd?: string
}

export interface BulkReservationResult {
  success: boolean
  committedCount?: number
  error?: string
  conflictingEvent?: string
  conflictingAssetIds?: string[]
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
 * Commits a bulk reservation for canvas allocated assets against POST /api/reservations/bulk.
 */
export async function bulkReserveAssets(request: BulkReservationRequest): Promise<BulkReservationResult> {
  const url = `${API_BASE_URL}/api/reservations/bulk`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      if (response.status === 409) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || 'Conflicting reservation: asset already committed to another event during this temporal buffer window.',
          conflictingEvent: errorData.conflictingEvent,
          conflictingAssetIds: errorData.conflictingAssetIds,
        }
      }
      const errorText = await response.text().catch(() => 'Reservation request failed.')
      return { success: false, error: errorText || `HTTP ${response.status}` }
    }

    const data = await response.json().catch(() => ({ committedCount: request.assetIds.length }))
    return {
      success: true,
      committedCount: data.committedCount || request.assetIds.length,
    }
  } catch (err: any) {
    console.warn('[reservationsApi] Failed to post bulk reservation:', err)
    return { success: false, error: err?.message || 'Could not verify reservation — please retry' }
  }
}

/**
 * Validates canvas allocation state against temporal buffer rules.
 */
export async function validateCanvasState(eventId: string, assetIds: string[]): Promise<{ valid: boolean; reason?: string }> {
  const url = `${API_BASE_URL}/api/reservations/validate-canvas-state`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventId, assetIds }),
    })
    if (!response.ok) {
      return { valid: false, reason: `Validation error (HTTP ${response.status})` }
    }
    const data = await response.json()
    return { valid: data.valid !== false, reason: data.reason }
  } catch (err: any) {
    return { valid: false, reason: err?.message || 'Could not verify reservation — please retry' }
  }
}
