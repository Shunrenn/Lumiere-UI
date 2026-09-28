import { API_BASE_URL, getAuthToken } from './apiConfig'

export type CanonicalPrepStatus = 'Pending Pull' | 'Prepping' | 'Completed'

export interface PackingListAssetDto {
  assetId: string
  assetName: string
  currentState: string
}

export interface AssetGroupDto {
  assetTypeName: string
  assetTier: number
  assets: PackingListAssetDto[]
}

export interface PackingListResponse {
  eventId: string
  groups: AssetGroupDto[]
}

export interface DispatchManifestQuantityMismatchDto {
  assetId: string
  reservationQuantity: number
  preparationQuantity: number
}

export interface DispatchPreparationItemDto {
  queueId: string
  eventId: string
  assetId: string
  assetName: string
  quantityRequired: number
  prepStatus: CanonicalPrepStatus | string
  assetState: string
  assignedTo?: string | null
  updatedBy?: string | null
  createdAt: string
  updatedAt: string
}

export interface DispatchPreparationResponse {
  eventId: string
  isPreparationComplete: boolean
  isManifestCurrent: boolean
  missingPreparationAssetIds: string[]
  stalePreparationAssetIds: string[]
  quantityMismatches: DispatchManifestQuantityMismatchDto[]
  items: DispatchPreparationItemDto[]
}

export interface VerifyItemRequest {
  assetId: string
}

export interface UpdateAssetStateRequest {
  targetState: string
  eventId?: string | null
}

export type GetPreparationResult =
  | { success: true; data: DispatchPreparationResponse }
  | { success: false; notFound?: boolean; forbidden?: boolean; message: string; statusCode?: number }

export type PrepareDispatchResult =
  | { success: true; data: DispatchPreparationResponse }
  | { success: false; conflict?: boolean; notFound?: boolean; forbidden?: boolean; message: string; code?: string; statusCode?: number }

export type VerifyItemResult =
  | { success: true; data: DispatchPreparationResponse }
  | { success: false; conflict?: boolean; notFound?: boolean; forbidden?: boolean; message: string; code?: string; statusCode?: number }

export type DispatchEventResult =
  | { success: true; data: PackingListResponse }
  | { success: false; conflict?: boolean; notFound?: boolean; forbidden?: boolean; message: string; code?: string; statusCode?: number }

export type GetPackingListResult =
  | { success: true; data: PackingListResponse }
  | { success: false; forbidden?: boolean; message: string; statusCode?: number }

function isGuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
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
 * Fetches authoritative preparation response for an event.
 * Endpoint: GET /api/dispatch/event/{eventId}/preparation?activeOnly={bool}
 * - activeOnly=true excludes terminal Completed items
 * - activeOnly=false retains full preparation history
 */
export async function getPreparation(
  eventId: string,
  activeOnly = false,
): Promise<GetPreparationResult> {
  if (!isGuid(eventId)) {
    return {
      success: false,
      message: `Invalid event ID "${eventId}". Expected canonical GUID.`,
      statusCode: 400,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/preparation?activeOnly=${activeOnly}`,
      {
        headers: getAuthHeaders(),
        signal: controller.signal,
      },
    )
    clearTimeout(timeoutId)

    if (res.ok) {
      const data: DispatchPreparationResponse = await res.json()
      return { success: true, data }
    }

    if (res.status === 404) {
      const err = await res.json().catch(() => ({}))
      return {
        success: false,
        notFound: true,
        message: err.error || err.Error || `Event "${eventId}" preparation not found.`,
        statusCode: 404,
      }
    }

    if (res.status === 403) {
      return {
        success: false,
        forbidden: true,
        message: 'Forbidden: Requires Warehouse Operations Manager authority.',
        statusCode: 403,
      }
    }

    const errText = await res.text().catch(() => '')
    return {
      success: false,
      message: errText || `Failed to fetch preparation (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      success: false,
      message: err?.message || 'Network error connecting to Dispatch service',
    }
  }
}

/**
 * Transitions Pending Pull items to Prepping for an Active event.
 * Endpoint: POST /api/dispatch/event/{eventId}/prepare
 */
export async function prepareDispatch(eventId: string): Promise<PrepareDispatchResult> {
  if (!isGuid(eventId)) {
    return {
      success: false,
      message: `Invalid event ID "${eventId}". Expected canonical GUID.`,
      statusCode: 400,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/prepare`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        signal: controller.signal,
      },
    )
    clearTimeout(timeoutId)

    if (res.ok) {
      const data: DispatchPreparationResponse = await res.json()
      return { success: true, data }
    }

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        conflict: true,
        code: body.code || body.Code || 'INVALID_PREPARATION_TRANSITION',
        message: body.error || body.Error || 'Invalid preparation transition or event is not ready.',
        statusCode: 409,
      }
    }

    if (res.status === 404) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        notFound: true,
        message: body.error || body.Error || `Event "${eventId}" not found.`,
        statusCode: 404,
      }
    }

    if (res.status === 403) {
      return {
        success: false,
        forbidden: true,
        message: 'Forbidden: Requires Warehouse Operations Manager authority.',
        statusCode: 403,
      }
    }

    const errText = await res.text().catch(() => '')
    return {
      success: false,
      message: errText || `Failed to prepare dispatch (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      success: false,
      message: err?.message || 'Network error connecting to Dispatch service',
    }
  }
}

/**
 * Verifies a single asset item in the preparation queue, transitioning it to Completed.
 * Invariant: Completed means physically prepared & verified for loading; it does NOT mean departed.
 * Endpoint: POST /api/dispatch/event/{eventId}/verify-item
 */
export async function verifyItem(
  eventId: string,
  assetId: string,
): Promise<VerifyItemResult> {
  if (!isGuid(eventId) || !isGuid(assetId)) {
    return {
      success: false,
      message: 'Invalid eventId or assetId. Operational identifiers must be canonical GUIDs.',
      statusCode: 400,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/verify-item`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assetId }),
        signal: controller.signal,
      },
    )
    clearTimeout(timeoutId)

    if (res.ok) {
      const data: DispatchPreparationResponse = await res.json()
      return { success: true, data }
    }

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        conflict: true,
        code: body.code || body.Code || 'INVALID_PREPARATION_TRANSITION',
        message: body.error || body.Error || 'Cannot verify item. Ensure preparation has started and manifest is current.',
        statusCode: 409,
      }
    }

    if (res.status === 404) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        notFound: true,
        message: body.error || body.Error || 'Asset not found in event preparation queue.',
        statusCode: 404,
      }
    }

    if (res.status === 403) {
      return {
        success: false,
        forbidden: true,
        message: 'Forbidden: Requires Warehouse Operations Manager authority.',
        statusCode: 403,
      }
    }

    const errText = await res.text().catch(() => '')
    return {
      success: false,
      message: errText || `Failed to verify item (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      success: false,
      message: err?.message || 'Network error connecting to Dispatch service',
    }
  }
}

/**
 * Consequential Event Outbound Departure.
 * Transitions all completed preparation assets to In-Transit Outbound.
 * Enabled only when isPreparationComplete === true and isManifestCurrent === true.
 * Endpoint: POST /api/dispatch/event/{eventId}/dispatch
 */
export async function dispatchEvent(eventId: string): Promise<DispatchEventResult> {
  if (!isGuid(eventId)) {
    return {
      success: false,
      message: `Invalid event ID "${eventId}". Expected canonical GUID.`,
      statusCode: 400,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/dispatch`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        signal: controller.signal,
      },
    )
    clearTimeout(timeoutId)

    if (res.ok) {
      const data: PackingListResponse = await res.json()
      return { success: true, data }
    }

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        conflict: true,
        code: body.code || body.Code || 'DISPATCH_PREPARATION_INCOMPLETE',
        message: body.error || body.Error || 'Physical dispatch rejected. Every preparation item must be Completed and manifest current.',
        statusCode: 409,
      }
    }

    if (res.status === 404) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        notFound: true,
        message: body.error || body.Error || 'No preparation record found for this event.',
        statusCode: 404,
      }
    }

    if (res.status === 403) {
      return {
        success: false,
        forbidden: true,
        message: 'Forbidden: Requires Warehouse Operations Manager authority.',
        statusCode: 403,
      }
    }

    const errText = await res.text().catch(() => '')
    return {
      success: false,
      message: errText || `Failed to dispatch event (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      success: false,
      message: err?.message || 'Network error connecting to Dispatch service',
    }
  }
}

/**
 * Fetches event packing list from backend REST API.
 * Endpoint: GET /api/dispatch/event/{eventId}/packing-list
 */
export async function getPackingList(eventId: string): Promise<GetPackingListResult> {
  if (!isGuid(eventId)) {
    return {
      success: false,
      message: `Invalid event ID "${eventId}". Expected canonical GUID.`,
      statusCode: 400,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/dispatch/event/${encodeURIComponent(eventId)}/packing-list`,
      {
        headers: getAuthHeaders(),
        signal: controller.signal,
      },
    )
    clearTimeout(timeoutId)

    if (res.ok) {
      const data: PackingListResponse = await res.json()
      return { success: true, data }
    }

    if (res.status === 403) {
      return {
        success: false,
        forbidden: true,
        message: 'Forbidden: Requires Warehouse Operations Manager authority.',
        statusCode: 403,
      }
    }

    const errText = await res.text().catch(() => '')
    return {
      success: false,
      message: errText || `Failed to fetch packing list (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      success: false,
      message: err?.message || 'Network error connecting to Dispatch service',
    }
  }
}

/**
 * Updates asset dispatch movement status.
 * Invariant: Cannot be used to initiate In-Transit Outbound.
 * Physical outbound departure occurs only through POST /api/dispatch/event/{eventId}/dispatch.
 * Endpoint: POST /api/dispatch/asset/{assetId}/status
 */
export async function updateAssetDispatchStatus(
  assetId: string,
  targetState: string,
  eventId?: string | null,
): Promise<boolean> {
  if (targetState.toLowerCase() === 'in-transit outbound') {
    console.error(
      '[dispatchApi] Invariant violation: per-asset status endpoint cannot be used to initiate In-Transit Outbound. Use dispatchEvent(eventId) instead.',
    )
    throw new Error(
      'Per-asset status cannot trigger In-Transit Outbound. Outbound departure must be confirmed at the event level.',
    )
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/dispatch/asset/${encodeURIComponent(assetId)}/status`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetState, eventId: eventId || null }),
      },
    )
    return res.ok
  } catch (err) {
    console.warn('[dispatchApi] Update asset dispatch status API call failed:', err)
    return false
  }
}

/**
 * Backward compatibility wrapper for packing list fetch.
 */
export async function fetchEventPackingList(
  eventId: string,
): Promise<{ eventId: string; groups: any[] } | null> {
  const result = await getPackingList(eventId)
  return result.success ? result.data : null
}

/**
 * Backward compatibility wrapper for prepare dispatch.
 */
export async function prepareEventDispatch(eventId: string): Promise<boolean> {
  const result = await prepareDispatch(eventId)
  return result.success
}
