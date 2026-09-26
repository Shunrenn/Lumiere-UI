import { API_BASE_URL, getAuthToken } from './apiConfig'
import type { PortalEvent } from './types'

export interface EventResponseDto {
  id: string
  name?: string
  title?: string
  dateOfEvent?: string
  targetDate?: string
  eventVenue?: string
  venue?: string
  ingressDate?: string
  status?: string
  isLossMaker?: boolean
  projectManagerId?: string
  projectManagerName?: string
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

export function mapEventResponseToPortalEvent(dto: EventResponseDto, index = 0): PortalEvent {
  const eventTitle = dto.name || dto.title || 'Untitled Event'
  const rawDate = dto.dateOfEvent || dto.targetDate
  let eventDate = '2026-09-20'
  if (rawDate) {
    const clean = rawDate.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      eventDate = clean
    } else {
      const d = new Date(rawDate)
      if (!isNaN(d.getTime())) {
        eventDate = d.toISOString().slice(0, 10)
      }
    }
  }

  const shortRef = dto.id ? dto.id.slice(0, 4).toUpperCase() : String(145 + index)
  
  return {
    id: dto.id,
    refId: `PRT-2026-${shortRef}`,
    title: eventTitle,
    client: 'Lumière Events',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: dto.eventVenue || dto.venue || 'Venue pending assignment',
    targetDate: eventDate,
    installationStart: dto.ingressDate ? dto.ingressDate.split('T')[0] : eventDate,
    installationEnd: eventDate,
    budget: 0,
    status: (dto.status || 'Active') as any,
    moodPlan: '',
    projectManagerId: dto.projectManagerId,
    projectManagerName: dto.projectManagerName,
  }
}

/**
 * Fetches all events from GET /api/events.
 */
export async function fetchEventsApi(): Promise<PortalEvent[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 1200)
  try {
    const res = await fetch(`${API_BASE_URL}/api/events`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      console.warn(`[eventsApi] GET /api/events returned HTTP ${res.status}`)
      return []
    }
    const body = await res.json()
    const data: EventResponseDto[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
      ? body.items
      : []
    return data.map((dto, idx) => mapEventResponseToPortalEvent(dto, idx))
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('[eventsApi] GET /api/events fetch skipped/fallback:', err)
    return []
  }
}

/**
 * Fetches a single event by ID from GET /api/events/{id}.
 */
export async function fetchEventByIdApi(eventId: string): Promise<PortalEvent | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 600)
  try {
    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const dto: EventResponseDto = await res.json()
    return mapEventResponseToPortalEvent(dto)
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[eventsApi] GET /api/events/${eventId} fetch skipped/fallback:`, err)
    return null
  }
}
