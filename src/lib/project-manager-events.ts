import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'
import { mapEventResponseToPortalEvent, type EventResponseDto } from '@/features/events/api/eventsApi'
import type { PortalEvent } from './types'

// Keep legacy presentation defaults out of PM verification and missing-data checks.
export async function fetchProjectManagerEvents(): Promise<PortalEvent[]> {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}/api/events?page=1&pageSize=100`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`GET /api/events returned HTTP ${response.status}`)
  const body = await response.json()
  const items: EventResponseDto[] = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []
  return items.map((dto, index) => ({ ...mapEventResponseToPortalEvent(dto, index),
    title: dto.name || dto.title || '', client: '', venue: dto.venue || dto.eventVenue || '', targetDate: (dto.dateOfEvent || dto.targetDate || '').split('T')[0],
    status: (dto.status || 'Not available') as PortalEvent['status'], eventStart: undefined, eventEnd: dto.fullStop || undefined,
  }))
}
