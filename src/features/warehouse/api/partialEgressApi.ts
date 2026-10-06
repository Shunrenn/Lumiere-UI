import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'
import type {
  EventEgressResponse,
  InitiatePartialEgressRequest,
  CompleteEgressItemRequest,
  ExceptionResolveEgressItemRequest,
  EscalatePartialEgressRequest,
  PostEgressPolicyResponse,
  UpdatePostEgressPolicyRequest,
} from '@/lib/types'

const BASE_URL = `${API_BASE_URL}/api/partial-egress`

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isGuid(val: string | undefined | null): boolean {
  if (!val) return false
  return GUID_REGEX.test(val.trim())
}

function getHeaders(idempotencyKey?: string): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey
  }
  return headers
}

export type PartialEgressApiResult<T> =
  | { success: true; data: T; isDuplicate?: boolean }
  | { success: false; error: string; isStaleVersion?: boolean; statusCode?: number }

/**
 * Fetches the active partial egress record for a specific event.
 * Returns null if 404 (no egress initiated yet).
 */
export async function getEventEgressApi(eventId: string): Promise<EventEgressResponse | null> {
  if (!isGuid(eventId)) return null

  try {
    const res = await fetch(`${BASE_URL}/events/${encodeURIComponent(eventId)}`, {
      headers: getHeaders(),
    })
    if (res.status === 404) return null
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn(`[partialEgressApi] Failed to fetch egress for ${eventId}:`, err)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn(`[partialEgressApi] Network error fetching egress for ${eventId}:`, err)
    return null
  }
}

/**
 * Initiates post-event partial egress accountability.
 * Ground Crew, Warehouse Lead, Warehouse Manager, or WOM.
 */
export async function initiatePartialEgressApi(
  eventId: string,
  request: InitiatePartialEgressRequest,
): Promise<PartialEgressApiResult<EventEgressResponse>> {
  if (!isGuid(eventId)) {
    return { success: false, error: `Invalid event ID "${eventId}". Must be a canonical GUID.` }
  }
  if (!request.idempotencyKey || request.idempotencyKey.trim().length < 8) {
    return { success: false, error: 'An idempotency key of at least 8 characters is required.' }
  }

  try {
    const res = await fetch(`${BASE_URL}/events/${encodeURIComponent(eventId)}/initiate`, {
      method: 'POST',
      headers: getHeaders(request.idempotencyKey),
      body: JSON.stringify(request),
    })

    const body = await res.json().catch(() => ({}))

    if (res.ok) {
      const isDuplicate = res.status === 200 || Boolean(body.isDuplicate)
      return { success: true, data: body as EventEgressResponse, isDuplicate }
    }

    const errorMsg = body.error || body.Error || body.message || `Failed to initiate egress (HTTP ${res.status})`
    return { success: false, error: errorMsg, statusCode: res.status }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Partial Egress service. Reconnection required.',
    }
  }
}

/**
 * Completes an outstanding egress item upon physical return accountability verification.
 */
export async function completeEgressItemApi(
  eventId: string,
  itemId: string,
  request: CompleteEgressItemRequest,
): Promise<PartialEgressApiResult<EventEgressResponse>> {
  if (!isGuid(eventId) || !isGuid(itemId)) {
    return { success: false, error: 'Invalid event or item ID. Must be a canonical GUID.' }
  }

  try {
    const res = await fetch(
      `${BASE_URL}/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}/complete`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(request),
      },
    )

    const body = await res.json().catch(() => ({}))

    if (res.ok) {
      return { success: true, data: body as EventEgressResponse }
    }

    const code = body.code || body.Code
    const errorMsg = body.error || body.Error || body.message || `Failed to complete item (HTTP ${res.status})`

    if (res.status === 409 && (code === 'STALE_VERSION' || errorMsg.includes('another session'))) {
      return { success: false, error: errorMsg, isStaleVersion: true, statusCode: 409 }
    }

    return { success: false, error: errorMsg, statusCode: res.status }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Partial Egress service. Reconnection required.',
    }
  }
}

/**
 * Supervisory exception resolution for an overdue egress item.
 * Available only after deadline, when escalated. Warehouse Manager or WOM only.
 * Requires minimum 20 characters written rationale. Cannot bypass HAVA.
 */
export async function exceptionResolveEgressItemApi(
  eventId: string,
  itemId: string,
  request: ExceptionResolveEgressItemRequest,
): Promise<PartialEgressApiResult<EventEgressResponse>> {
  if (!isGuid(eventId) || !isGuid(itemId)) {
    return { success: false, error: 'Invalid event or item ID. Must be a canonical GUID.' }
  }
  if (!request.reason || request.reason.trim().length < 20) {
    return {
      success: false,
      error: 'Supervisory exception resolution requires a detailed operational reason (minimum 20 characters).',
    }
  }

  try {
    const res = await fetch(
      `${BASE_URL}/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}/exception-resolve`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(request),
      },
    )

    const body = await res.json().catch(() => ({}))

    if (res.ok) {
      return { success: true, data: body as EventEgressResponse }
    }

    const code = body.code || body.Code
    const errorMsg =
      body.error || body.Error || body.message || `Failed to record supervisory exception (HTTP ${res.status})`

    if (res.status === 409 && (code === 'STALE_VERSION' || errorMsg.includes('another session'))) {
      return { success: false, error: errorMsg, isStaleVersion: true, statusCode: 409 }
    }

    return { success: false, error: errorMsg, statusCode: res.status }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Partial Egress service. Reconnection required.',
    }
  }
}

/**
 * Escalates overdue post-egress accountability to warehouse management.
 * Available only after completion deadline. Warehouse Manager or WOM only.
 * Requires minimum 20 characters written rationale.
 */
export async function escalatePartialEgressApi(
  eventId: string,
  request: EscalatePartialEgressRequest,
): Promise<PartialEgressApiResult<EventEgressResponse>> {
  if (!isGuid(eventId)) {
    return { success: false, error: 'Invalid event ID. Must be a canonical GUID.' }
  }
  if (!request.reason || request.reason.trim().length < 20) {
    return {
      success: false,
      error: 'Escalation requires an operational explanation (minimum 20 characters).',
    }
  }

  try {
    const res = await fetch(`${BASE_URL}/events/${encodeURIComponent(eventId)}/escalate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    const body = await res.json().catch(() => ({}))

    if (res.ok) {
      return { success: true, data: body as EventEgressResponse }
    }

    const code = body.code || body.Code
    const errorMsg = body.error || body.Error || body.message || `Failed to escalate egress (HTTP ${res.status})`

    if (res.status === 409 && (code === 'STALE_VERSION' || errorMsg.includes('another session'))) {
      return { success: false, error: errorMsg, isStaleVersion: true, statusCode: 409 }
    }

    return { success: false, error: errorMsg, statusCode: res.status }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Partial Egress service. Reconnection required.',
    }
  }
}

/**
 * Fetches the active Post-Egress completion window policy.
 */
export async function getPostEgressPolicyApi(): Promise<PostEgressPolicyResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/policy`, {
      headers: getHeaders(),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.warn('[partialEgressApi] Failed to fetch post-egress policy:', err)
    return null
  }
}

/**
 * Updates the Post-Egress completion window policy. Admin role only.
 */
export async function updatePostEgressPolicyApi(
  request: UpdatePostEgressPolicyRequest,
): Promise<PartialEgressApiResult<PostEgressPolicyResponse>> {
  if (request.completionWindowMinutes < 1 || request.completionWindowMinutes > 1440) {
    return {
      success: false,
      error: 'Completion window must be between 1 and 1440 minutes (24 hours).',
    }
  }

  try {
    const res = await fetch(`${BASE_URL}/policy`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    const body = await res.json().catch(() => ({}))

    if (res.ok) {
      return { success: true, data: body as PostEgressPolicyResponse }
    }

    const code = body.code || body.Code
    const errorMsg = body.error || body.Error || body.message || `Failed to update policy (HTTP ${res.status})`

    if (res.status === 409 && (code === 'STALE_VERSION' || errorMsg.includes('another session'))) {
      return { success: false, error: errorMsg, isStaleVersion: true, statusCode: 409 }
    }

    return { success: false, error: errorMsg, statusCode: res.status }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Partial Egress service.',
    }
  }
}
