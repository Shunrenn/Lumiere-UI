import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface ProductionTaskResponseDto {
  id: string
  eventId: string
  eventName: string
  taskName: string
  category: string
  targetQuantity: number
  completedQuantity: number
  progressPercentage: number
  startDate: string
  endDate: string
  assignedToUserId?: string
  assignedUserName?: string
  status: string
  createdAt: string
}

export interface GanttScheduleResponseDto {
  eventId: string
  eventName: string
  timelineStart: string
  timelineEnd: string
  tasks: ProductionTaskResponseDto[]
  overallProgressPercentage: number
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
 * Loads Gantt production schedule for an event from GET /api/production/event/{eventId}/gantt.
 */
export async function fetchGanttScheduleForEvent(eventId: string): Promise<GanttScheduleResponseDto | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/event/${encodeURIComponent(eventId)}/gantt`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      if (res.status === 404) {
        return null
      }
      console.warn(`[productionApi] GET /api/production/event/${eventId}/gantt returned HTTP ${res.status}`)
      throw new Error(`Failed to fetch production schedule: HTTP ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[productionApi] GET /api/production/event/${eventId}/gantt failed:`, err)
    throw err
  }
}
