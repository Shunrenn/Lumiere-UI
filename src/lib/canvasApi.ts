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
  try {
    const res = await fetch(`${API_BASE_URL}/api/canvas/event/${encodeURIComponent(eventId)}`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.warn(`[canvasApi] GET /api/canvas/event/${eventId} fetch skipped/fallback:`, err)
    return null
  }
}

/**
 * Saves canvas layout state to PUT /api/canvas/event/{eventId}.
 */
export async function saveCanvasLayoutApi(eventId: string, canvasStateJson: string): Promise<boolean> {
  try {
    const payload: SaveCanvasRequestDto = {
      canvasState: canvasStateJson,
      canvasMode: 'Konva',
      canvasStatus: 'Draft',
    }
    const res = await fetch(`${API_BASE_URL}/api/canvas/event/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (err) {
    console.warn(`[canvasApi] PUT /api/canvas/event/${eventId} save skipped/fallback:`, err)
    return true
  }
}

/**
 * Approves a canvas layout and activates the warehouse dispatch queue bridge via POST /api/canvas/event/{eventId}/approve.
 */
export async function approveCanvasApi(eventId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/canvas/event/${encodeURIComponent(eventId)}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    return res.ok
  } catch (err) {
    console.warn(`[canvasApi] POST /api/canvas/event/${eventId}/approve skipped/fallback:`, err)
    return true
  }
}

