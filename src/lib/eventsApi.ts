import { API_BASE_URL, getAuthToken } from './apiConfig'
import type { PortalEvent } from './types'

export function isGuid(id?: string | null): boolean {
  if (!id) return false
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
}

/**
 * Authoritative backend create request contract for POST /api/events
 */
export interface CreateEventRequest {
  eventName: string
  dateOfEvent: string // ISO-8601 string
  ingressDate: string // ISO-8601 string
  ingressTime: string // TimeSpan string "HH:mm:ss"
  fullStop: string // TimeSpan string "HH:mm:ss"
  eventVenue: string
  geoClass: 'Local' | 'National'
  returnDate?: string // ISO-8601 string
  eventPegs?: string
  colorPalette?: string
  brandingAndTextures?: string
  notes?: string
  estimatedRevenue?: number
  projectManagerId?: string // GUID
  allowConflictOverride?: boolean
}

/**
 * Authoritative backend update request contract for PUT /api/events/{eventId}
 */
export interface UpdateEventRequest {
  eventName?: string
  dateOfEvent?: string
  ingressDate?: string
  ingressTime?: string
  fullStop?: string
  eventVenue?: string
  geoClass?: 'Local' | 'National'
  returnDate?: string
  eventPegs?: string
  colorPalette?: string
  brandingAndTextures?: string
  status?: string
  notes?: string
  estimatedRevenue?: number
  projectManagerId?: string
  allowConflictOverride?: boolean
}

/**
 * Authoritative backend EventResponse contract from GET /api/events/{id} and POST / PUT responses
 */
export interface EventResponseDto {
  id: string // Canonical GUID
  name: string
  dateOfEvent: string
  ingressDate: string
  ingressTime: string
  fullStop: string
  mobilizationDate?: string
  returnDate?: string
  transitBufferDays?: number
  venue: string
  geoClass: string
  eventPegs?: string
  colorPalette?: string
  brandingAndTextures?: string
  notes?: string
  status: string
  isLossMaker?: boolean
  estimatedRevenue?: number
  projectManagerId?: string
  projectManagerName?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  // Legacy/Presentation compatibility aliases
  title?: string
  targetDate?: string
  eventVenue?: string
}

export type CreateEventResult =
  | { success: true; kind: 'success'; event: PortalEvent; raw: EventResponseDto; conflict?: false; message?: undefined; conflictingEvents?: undefined }
  | { success: false; kind: 'conflict'; conflict: true; message: string; conflictingEvents: any[]; event?: undefined; raw?: undefined }
  | { success: false; kind: 'forbidden'; conflict?: false; message: string; conflictingEvents?: undefined; event?: undefined; raw?: undefined }
  | { success: false; kind: 'validation_error'; conflict?: false; message: string; conflictingEvents?: undefined; event?: undefined; raw?: undefined }
  | { success: false; kind: 'error'; conflict?: false; message: string; statusCode?: number; conflictingEvents?: undefined; event?: undefined; raw?: undefined }

export type UpdateEventResult =
  | { success: true; kind: 'success'; event: PortalEvent; raw: EventResponseDto; conflict?: false; message?: undefined; conflictingEvents?: undefined }
  | { success: false; kind: 'conflict'; conflict: true; message: string; conflictingEvents: any[]; event?: undefined; raw?: undefined }
  | { success: false; kind: 'not_found'; conflict?: false; message: string; conflictingEvents?: undefined; event?: undefined; raw?: undefined }
  | { success: false; kind: 'forbidden'; conflict?: false; message: string; conflictingEvents?: undefined; event?: undefined; raw?: undefined }
  | { success: false; kind: 'validation_error'; conflict?: false; message: string; conflictingEvents?: undefined; event?: undefined; raw?: undefined }
  | { success: false; kind: 'error'; conflict?: false; message: string; statusCode?: number; conflictingEvents?: undefined; event?: undefined; raw?: undefined }

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
 * Maps authoritative EventResponseDto to frontend PortalEvent.
 * Note: `client` is NOT an Event backend field. 'Client TBD' is an explicit presentation-only
 * fallback that is never sent as persisted Event truth.
 */
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
    client: 'Client TBD', // Presentation-only; not persisted to backend Event model
    tier: 'Tier-3 Standard' as any,
    venue: dto.venue || dto.eventVenue || 'Venue pending assignment',
    targetDate: eventDate,
    installationStart: dto.ingressDate ? dto.ingressDate.split('T')[0] : eventDate,
    installationEnd: dto.returnDate ? dto.returnDate.split('T')[0] : eventDate,
    ingressDate: dto.ingressDate ? dto.ingressDate.split('T')[0] : undefined,
    ingressTime: dto.ingressTime ? dto.ingressTime.slice(0, 5) : undefined,
    fullStop: dto.fullStop ? dto.fullStop.slice(0, 5) : undefined,
    geoClass: dto.geoClass || 'Local',
    budget: dto.estimatedRevenue ?? 0,
    status: (dto.status || 'Active') as any,
    moodPlan: dto.notes || '',
    projectManagerId: dto.projectManagerId,
    projectManagerName: dto.projectManagerName,
  }
}

/**
 * Creates an event via POST /api/events.
 * Returns authoritative response or structured conflict/validation error.
 */
export async function createEventApi(
  request: CreateEventRequest,
  allowConflictOverride = false,
): Promise<CreateEventResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const payload = {
      ...request,
      allowConflictOverride: allowConflictOverride || request.allowConflictOverride || false,
    }
    const res = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.status === 201) {
      const raw: EventResponseDto = await res.json()
      const event = mapEventResponseToPortalEvent(raw)
      return { success: true, kind: 'success', event, raw }
    }

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        kind: 'conflict',
        conflict: true,
        message: body.error || body.Error || body.message || 'Venue scheduling conflict detected.',
        conflictingEvents: body.conflictingEvents || body.ConflictingEvents || [],
      }
    }

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        kind: 'forbidden',
        message: body.error || body.Error || 'Forbidden: Insufficient privileges to create events.',
      }
    }

    if (res.status === 400) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        kind: 'validation_error',
        message: body.error || body.Error || 'Validation error creating event.',
      }
    }

    const errText = await res.text().catch(() => '')
    return {
      success: false,
      kind: 'error',
      message: errText || `Failed to create event (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      success: false,
      kind: 'error',
      message: err?.message || 'Network error connecting to Event service',
    }
  }
}

/**
 * Updates an event via PUT /api/events/{id}.
 * Maps input fields into canonical backend contract. Note: `client` is excluded.
 * Returns authoritative response or structured conflict/validation error.
 */
export async function updateEventApi(
  eventId: string,
  request: UpdateEventRequest | Partial<PortalEvent>,
  allowConflictOverride = false,
): Promise<UpdateEventResult> {
  if (!isGuid(eventId)) {
    return {
      success: false,
      kind: 'validation_error',
      message: `Invalid event ID "${eventId}". Operational ID must be a canonical GUID.`,
    }
  }

  const sanitizeToIso = (val?: string): string | undefined => {
    if (!val) return undefined
    const clean = val.trim().split('T')[0]
    return clean ? `${clean}T00:00:00Z` : undefined
  }

  const payload: UpdateEventRequest = {
    eventName: (request as any).eventName ?? (request as any).title,
    eventVenue: (request as any).eventVenue ?? (request as any).venue,
    geoClass: (request as any).geoClass,
    dateOfEvent: (request as any).dateOfEvent ?? sanitizeToIso((request as any).targetDate),
    ingressDate: (request as any).ingressDate ?? sanitizeToIso((request as any).installationStart),
    ingressTime: (request as any).ingressTime,
    fullStop: (request as any).fullStop,
    returnDate: (request as any).returnDate ?? sanitizeToIso((request as any).installationEnd),
    eventPegs: (request as any).eventPegs,
    colorPalette: (request as any).colorPalette,
    brandingAndTextures: (request as any).brandingAndTextures,
    status: (request as any).status,
    notes: (request as any).notes ?? (request as any).moodPlan,
    estimatedRevenue: (request as any).estimatedRevenue ?? (request as any).budget,
    projectManagerId: (request as any).projectManagerId,
    allowConflictOverride: allowConflictOverride || (request as any).allowConflictOverride || false,
  }

  // Remove undefined keys so we do not overwrite unprovided values
  Object.keys(payload).forEach((k) => {
    if ((payload as any)[k] === undefined) {
      delete (payload as any)[k]
    }
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const raw: EventResponseDto = await res.json()
      const event = mapEventResponseToPortalEvent(raw)
      return { success: true, kind: 'success', event, raw }
    }

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        kind: 'conflict',
        conflict: true,
        message: body.error || body.Error || body.message || 'Venue scheduling conflict detected.',
        conflictingEvents: body.conflictingEvents || body.ConflictingEvents || [],
      }
    }

    if (res.status === 404) {
      return {
        success: false,
        kind: 'not_found',
        message: `Event "${eventId}" was not found on server.`,
      }
    }

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        kind: 'forbidden',
        message: body.error || body.Error || 'Forbidden: Insufficient privileges to update events.',
      }
    }

    if (res.status === 400) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        kind: 'validation_error',
        message: body.error || body.Error || 'Validation error updating event.',
      }
    }

    const errText = await res.text().catch(() => '')
    return {
      success: false,
      kind: 'error',
      message: errText || `Failed to update event (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      success: false,
      kind: 'error',
      message: err?.message || 'Network error connecting to Event service',
    }
  }
}

/**
 * Fetches all events from GET /api/events.
 * 10-second timeout. Throws on network/server errors to distinguish failure from empty state.
 */
export async function fetchEventsApi(page = 1, pageSize = 50, statusFilter?: string): Promise<PortalEvent[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    if (statusFilter) params.append('statusFilter', statusFilter)

    const res = await fetch(`${API_BASE_URL}/api/events?${params.toString()}`, {
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
  if (!isGuid(eventId)) return null
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
