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
  returnDate?: string
  geoClass?: string
  status?: string
  isLossMaker?: boolean
  estimatedRevenue?: number
  projectManagerId?: string
  projectManagerName?: string
  notes?: string
  client?: string
  tier?: any
  createdBy?: string
  createdAt?: string
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
    client: dto.client || 'Client TBD',
    tier: (dto.tier || 'Tier-3 Standard') as any,
    venue: dto.eventVenue || dto.venue || 'Venue pending assignment',
    targetDate: eventDate,
    installationStart: dto.ingressDate ? dto.ingressDate.split('T')[0] : eventDate,
    installationEnd: dto.returnDate ? dto.returnDate.split('T')[0] : eventDate,
    ingressDate: dto.ingressDate ? dto.ingressDate.split('T')[0] : undefined,
    geoClass: dto.geoClass || 'Local',
    budget: dto.estimatedRevenue ?? 0,
    status: (dto.status || 'Active') as any,
    moodPlan: dto.notes || '',
    projectManagerId: dto.projectManagerId,
    projectManagerName: dto.projectManagerName,
  }
}

/**
 * Fetches all events from GET /api/events.
 * 10-second timeout. Throws on network/server errors to distinguish failure from empty state.
 */
export async function fetchEventsApi(): Promise<PortalEvent[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/events`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      throw new Error(`GET /api/events returned HTTP ${res.status}`)
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
    console.warn('[eventsApi] GET /api/events failed:', err)
    throw err
  }
}

/**
 * Fetches a single event by ID from GET /api/events/{id}.
 */
export async function fetchEventByIdApi(eventId: string): Promise<PortalEvent | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
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
    console.warn(`[eventsApi] GET /api/events/${eventId} fetch failed:`, err)
    return null
  }
}

/**
 * Updates an event via PUT /api/events/{id}.
 */
export async function updateEventApi(
  id: string,
  draft: Record<string, any>,
): Promise<void> {
  const payload: Record<string, any> = {}
  if (draft.title !== undefined) payload.eventName = draft.title
  if (draft.eventName !== undefined) payload.eventName = draft.eventName
  if (draft.venue !== undefined) payload.eventVenue = draft.venue
  if (draft.eventVenue !== undefined) payload.eventVenue = draft.eventVenue
  if (draft.status !== undefined) payload.status = draft.status
  if (draft.moodPlan !== undefined) payload.notes = draft.moodPlan
  if (draft.notes !== undefined) payload.notes = draft.notes
  if (draft.projectManagerId !== undefined) payload.projectManagerId = draft.projectManagerId

  const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update event: ${res.status} ${errorText}`)
  }
}
