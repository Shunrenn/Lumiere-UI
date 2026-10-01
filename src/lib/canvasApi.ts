import { API_BASE_URL, getAuthToken } from './apiConfig'

/**
 * Exact C# DTO matching Lumiere.Core.DTOs.CanvasResponse
 */
export interface CanvasResponseDto {
  id: string
  eventId: string
  canvasState?: string
  annotationState?: string
  pdfUrl?: string
  canvasMode: string
  canvasStatus: string
  submittedBy?: string
  submittedAt?: string
  approvedBy?: string
  approvedAt?: string
}

/**
 * Exact C# DTO matching Lumiere.Core.DTOs.SaveCanvasRequest
 */
export interface SaveCanvasRequestDto {
  canvasState?: string
  annotationState?: string
  pdfUrl?: string
  canvasMode?: string
  canvasStatus?: string
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
 * Loads canvas layout state from GET /api/canvas/event/{eventId}.
 */
export async function fetchCanvasLayoutApi(eventId: string): Promise<CanvasResponseDto | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/canvas/event/${encodeURIComponent(eventId)}`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      if (res.status === 404) {
        return null
      }
      console.warn(`[canvasApi] GET /api/canvas/event/${eventId} returned HTTP ${res.status}`)
      throw new Error(`Failed to fetch canvas layout: HTTP ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[canvasApi] GET /api/canvas/event/${eventId} fetch failed:`, err)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Canonical result type
// Callers MUST check .ok before showing success UI or triggering downstream
// operations. Never treat absence of ok:false as implicit success.
// ---------------------------------------------------------------------------

export type CanvasApiResult =
  | { ok: true }
  | { ok: false; reason: 'network-error' | 'backend-rejected' | 'no-event-id'; status?: number; message?: string }

/**
 * Saves canvas layout state to PUT /api/canvas/event/{eventId}.
 *
 * Returns CanvasApiResult. Callers must check .ok before showing "Saved" UI.
 * Network errors and backend rejections both return { ok: false }.
 * NEVER silently converts failures into success.
 */
export async function saveCanvasLayoutApi(eventId: string, canvasStateJson: string): Promise<CanvasApiResult> {
  const payload: SaveCanvasRequestDto = {
    canvasState: canvasStateJson,
    canvasMode: 'Konva',
    canvasStatus: 'Draft',
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/canvas/event/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.warn(`[canvasApi] PUT /api/canvas/event/${eventId} returned HTTP ${res.status}`)
      return { ok: false, reason: 'backend-rejected', status: res.status }
    }
    return { ok: true }
  } catch (err) {
    console.warn(`[canvasApi] PUT /api/canvas/event/${eventId} network error:`, err)
    return { ok: false, reason: 'network-error', message: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Approves a canvas layout and activates the warehouse dispatch queue bridge
 * via POST /api/canvas/event/{eventId}/approve.
 *
 * Returns CanvasApiResult. Callers must check .ok before showing "Approved" UI
 * and before triggering any downstream dispatch population.
 * NEVER silently converts failures into success.
 *
 * R9 boundary: This persists canvas approval to the backend. Downstream
 * warehouse logistics/dispatch queue population is backend-driven from this
 * approval event. Frontend dispatch state (populateWarehouseDispatchFromCanvas)
 * is module-scoped memory only and does NOT substitute for backend persistence.
 */
export async function approveCanvasApi(eventId: string): Promise<CanvasApiResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/canvas/event/${encodeURIComponent(eventId)}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      console.warn(`[canvasApi] POST /api/canvas/event/${eventId}/approve returned HTTP ${res.status}`)
      return { ok: false, reason: 'backend-rejected', status: res.status }
    }
    return { ok: true }
  } catch (err) {
    console.warn(`[canvasApi] POST /api/canvas/event/${eventId}/approve network error:`, err)
    return { ok: false, reason: 'network-error', message: err instanceof Error ? err.message : String(err) }
  }
}