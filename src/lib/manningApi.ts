import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface ManningRecordDto {
  id: string
  eventId: string
  eventName?: string
  userId: string
  userName?: string
  userEmail?: string
  roleName?: string
  shiftDate?: string
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  notes?: string | null
  isOverride?: boolean
  createdAt?: string
}

export interface AssignManningRequestDto {
  eventId: string
  userId: string
  roleName?: string
  shiftDate?: string
  shiftStartTime?: string
  shiftEndTime?: string
  notes?: string
  isOverride?: boolean
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
 * GET /api/manning/event/{eventId}
 */
export async function fetchManningForEvent(eventId: string): Promise<ManningRecordDto[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/event/${encodeURIComponent(eventId)}`, {
      headers: getHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      console.warn(`[manningApi] GET /api/manning/event/${eventId} returned HTTP ${res.status}`)
      throw new Error(`Failed to fetch manning: HTTP ${res.status}`)
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[manningApi] GET /api/manning/event/${eventId} failed:`, err)
    throw err
  }
}

/**
 * GET /api/manning/user/{userId}
 */
export async function fetchManningForUser(userId: string): Promise<ManningRecordDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/user/${encodeURIComponent(userId)}`, {
      headers: getHeaders(),
    })
    if (!res.ok) {
      console.warn(`[manningApi] GET /api/manning/user/${userId} returned HTTP ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn(`[manningApi] GET /api/manning/user/${userId} failed:`, err)
    return []
  }
}

/**
 * POST /api/manning/assign
 */
export async function assignManningApi(req: AssignManningRequestDto): Promise<ManningRecordDto | null> {
  try {
    const formattedShiftDate = req.shiftDate
      ? req.shiftDate.includes('T')
        ? req.shiftDate
        : `${req.shiftDate}T00:00:00Z`
      : new Date().toISOString()

    const formattedStartTime = req.shiftStartTime
      ? req.shiftStartTime.length === 5
        ? `${req.shiftStartTime}:00`
        : req.shiftStartTime
      : null

    const formattedEndTime = req.shiftEndTime
      ? req.shiftEndTime.length === 5
        ? `${req.shiftEndTime}:00`
        : req.shiftEndTime
      : null

    const payload = {
      ...req,
      shiftDate: formattedShiftDate,
      shiftStartTime: formattedStartTime,
      shiftEndTime: formattedEndTime,
    }

    const res = await fetch(`${API_BASE_URL}/api/manning/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.warn(`[manningApi] POST /api/manning/assign returned HTTP ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn('[manningApi] POST /api/manning/assign failed:', err)
    return null
  }
}

/**
 * DELETE /api/manning/{id}
 */
export async function deleteManningApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    return res.ok || res.status === 204
  } catch (err) {
    console.warn(`[manningApi] DELETE /api/manning/${id} failed:`, err)
    return false
  }
}
