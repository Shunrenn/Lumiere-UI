import { API_BASE_URL, getAuthToken } from './apiConfig'

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
 * Prepares dispatch allocation for an event.
 * Endpoint: POST /api/dispatch/event/{eventId}/prepare
 */
export async function prepareEventDispatch(eventId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/prepare`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    return res.ok
  } catch (err) {
    console.warn('[dispatchApi] Prepare dispatch skipped/fallback:', err)
    return true
  }
}

/**
 * Force-dispatches an event.
 * Endpoint: POST /api/dispatch/event/{eventId}/force-dispatch
 */
export async function forceDispatchEvent(eventId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/force-dispatch`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    return res.ok
  } catch (err) {
    console.warn('[dispatchApi] Force dispatch skipped/fallback:', err)
    return true
  }
}

/**
 * Updates asset dispatch movement status.
 * Endpoint: POST /api/dispatch/asset/{assetId}/status
 */
export async function updateAssetDispatchStatus(assetId: string, targetState: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dispatch/asset/${encodeURIComponent(assetId)}/status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetState }),
    })
    return res.ok
  } catch (err) {
    console.warn('[dispatchApi] Update asset dispatch status skipped/fallback:', err)
    return true
  }
}

/**
 * Fetches event packing list from backend REST API.
 * Endpoint: GET /api/dispatch/event/{eventId}/packing-list
 */
export async function fetchEventPackingList(eventId: string): Promise<{ eventId: string; groups: any[] } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/packing-list`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
    return null
  } catch (err) {
    console.warn('[dispatchApi] Fetch packing list skipped/fallback:', err)
    return null
  }
}

