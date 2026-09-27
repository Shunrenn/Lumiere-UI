import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL, getAuthToken } from './apiConfig'

export type PitchStatus =
  | 'Draft'
  | 'For Presentation'
  | 'Presented'
  | 'For Revision'
  | 'Approved'
  | 'Converted to Event'
  | 'Rejected'
  | 'Cancelled'

export interface ClientBrief {
  clientName: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  eventType: string
  proposedDate: string
  proposedVenue: string
  estimatedGuests: number
  budgetRange: string
  requirements: string
  notes: string
}

export interface ProposalDetails {
  conceptTitle: string
  conceptSummary: string
  scopeOfWork: string
  deliverables: string[]
  estimatedBudget: number
  proposedTimeline: string
  notes: string
}

export interface ClientFeedbackEntry {
  id: string
  date: string
  author: string
  notes: string
  stageChangedTo?: PitchStatus
}

export interface ProjectPitch {
  id: string
  createdAt: string
  updatedAt: string
  assignedPmName: string
  assignedPmEmail: string
  status: PitchStatus
  brief: ClientBrief
  proposal: ProposalDetails
  feedback: ClientFeedbackEntry[]
  convertedEventId?: string
}

export interface ClientPitchResponseDto {
  id: string
  title: string
  status: string
  clientName: string
  contactPerson: string
  contactInformation: string
  eventType: string
  proposedDate: string
  proposedVenue: string
  estimatedGuests: number
  requirements?: string
  budgetRange?: string
  briefNotes?: string
  concept?: string
  scope?: string
  deliverables?: string
  estimatedBudget?: number
  proposedTimeline?: string
  proposalNotes?: string
  assignedPmId?: string
  assignedPmName?: string
  convertedEventId?: string
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt: string
  feedbackEntries?: PitchFeedbackResponseDto[]
}

export interface PitchFeedbackResponseDto {
  id: string
  pitchId: string
  note: string
  authorId?: string
  authorName: string
  createdAt: string
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

export function mapBackendStatusToPitchStatus(status: string): PitchStatus {
  if (status === 'Converted' || status === 'Converted to Event') return 'Converted to Event'
  return (status as PitchStatus) || 'Draft'
}

export function mapPitchStatusToBackend(status: PitchStatus): string {
  if (status === 'Converted to Event') return 'Converted'
  return status
}

export function mapPitchResponseToProjectPitch(dto: ClientPitchResponseDto): ProjectPitch {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    assignedPmName: dto.assignedPmName || dto.createdByName || 'Project Manager',
    assignedPmEmail: '',
    status: mapBackendStatusToPitchStatus(dto.status),
    brief: {
      clientName: dto.clientName || '',
      contactPerson: dto.contactPerson || '',
      contactEmail: dto.contactInformation || '',
      contactPhone: '',
      eventType: dto.eventType || 'Corporate Event',
      proposedDate: dto.proposedDate ? dto.proposedDate.split('T')[0] : '',
      proposedVenue: dto.proposedVenue || '',
      estimatedGuests: dto.estimatedGuests || 0,
      budgetRange: dto.budgetRange || '',
      requirements: dto.requirements || '',
      notes: dto.briefNotes || '',
    },
    proposal: {
      conceptTitle: dto.title || '',
      conceptSummary: dto.concept || '',
      scopeOfWork: dto.scope || '',
      deliverables: dto.deliverables ? dto.deliverables.split(',').map((s) => s.trim()).filter(Boolean) : [],
      estimatedBudget: dto.estimatedBudget || 0,
      proposedTimeline: dto.proposedTimeline || '',
      notes: dto.proposalNotes || '',
    },
    feedback: (dto.feedbackEntries || []).map((f) => ({
      id: f.id,
      date: f.createdAt,
      author: f.authorName || 'User',
      notes: f.note,
    })),
    convertedEventId: dto.convertedEventId,
  }
}

export interface ConvertPitchToEventResult {
  success: boolean
  eventId?: string
  pitchId?: string
  conflict?: boolean
  message?: string
  conflictingEvents?: any[]
}

/**
 * REST API: GET /api/pitches?page=1&pageSize=100
 * 10-second timeout. Throws on failure to distinguish empty list from network error.
 */
export async function fetchPitchesApi(): Promise<ProjectPitch[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/pitches?page=1&pageSize=100`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      throw new Error(`GET /api/pitches returned HTTP ${res.status}`)
    }
    const body = await res.json()
    const rawItems: ClientPitchResponseDto[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
      ? body.items
      : []
    return rawItems.map(mapPitchResponseToProjectPitch)
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('[pitchesApi] GET /api/pitches failed:', err)
    throw err
  }
}

/**
 * REST API: POST /api/pitches
 */
export async function createPitchApi(pitchData: Partial<ProjectPitch>): Promise<ProjectPitch | null> {
  const payload = {
    title: pitchData.proposal?.conceptTitle || `${pitchData.brief?.clientName || 'Client'} Pitch`,
    clientName: pitchData.brief?.clientName || '',
    contactPerson: pitchData.brief?.contactPerson || '',
    contactInformation: pitchData.brief?.contactEmail || pitchData.brief?.contactPhone || '',
    eventType: pitchData.brief?.eventType || 'Corporate Event',
    proposedDate: pitchData.brief?.proposedDate
      ? new Date(pitchData.brief.proposedDate).toISOString()
      : new Date().toISOString(),
    proposedVenue: pitchData.brief?.proposedVenue || 'Venue TBD',
    estimatedGuests: pitchData.brief?.estimatedGuests || 0,
    requirements: pitchData.brief?.requirements || '',
    budgetRange: pitchData.brief?.budgetRange || '',
    briefNotes: pitchData.brief?.notes || '',
    concept: pitchData.proposal?.conceptSummary || '',
    scope: pitchData.proposal?.scopeOfWork || '',
    deliverables: Array.isArray(pitchData.proposal?.deliverables)
      ? pitchData.proposal.deliverables.join(', ')
      : '',
    estimatedBudget: pitchData.proposal?.estimatedBudget || 0,
    proposedTimeline: pitchData.proposal?.proposedTimeline || '',
    proposalNotes: pitchData.proposal?.notes || '',
  }

  const res = await fetch(`${API_BASE_URL}/api/pitches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create pitch: ${res.status} ${errorText}`)
  }

  const dto: ClientPitchResponseDto = await res.json()
  return mapPitchResponseToProjectPitch(dto)
}

/**
 * REST API: PUT /api/pitches/{id}
 */
export async function updatePitchApi(id: string, updates: Partial<ProjectPitch>): Promise<void> {
  const payload: Record<string, any> = {}
  if (updates.proposal?.conceptTitle) payload.title = updates.proposal.conceptTitle
  if (updates.brief?.clientName) payload.clientName = updates.brief.clientName
  if (updates.brief?.contactPerson) payload.contactPerson = updates.brief.contactPerson
  if (updates.brief?.contactEmail) payload.contactInformation = updates.brief.contactEmail
  if (updates.brief?.eventType) payload.eventType = updates.brief.eventType
  if (updates.brief?.proposedDate) payload.proposedDate = new Date(updates.brief.proposedDate).toISOString()
  if (updates.brief?.proposedVenue) payload.proposedVenue = updates.brief.proposedVenue
  if (updates.brief?.estimatedGuests !== undefined) payload.estimatedGuests = updates.brief.estimatedGuests
  if (updates.brief?.requirements !== undefined) payload.requirements = updates.brief.requirements
  if (updates.brief?.budgetRange !== undefined) payload.budgetRange = updates.brief.budgetRange
  if (updates.brief?.notes !== undefined) payload.briefNotes = updates.brief.notes
  if (updates.proposal?.conceptSummary !== undefined) payload.concept = updates.proposal.conceptSummary
  if (updates.proposal?.scopeOfWork !== undefined) payload.scope = updates.proposal.scopeOfWork
  if (updates.proposal?.deliverables) payload.deliverables = updates.proposal.deliverables.join(', ')
  if (updates.proposal?.estimatedBudget !== undefined) payload.estimatedBudget = updates.proposal.estimatedBudget
  if (updates.proposal?.proposedTimeline !== undefined) payload.proposedTimeline = updates.proposal.proposedTimeline
  if (updates.proposal?.notes !== undefined) payload.proposalNotes = updates.proposal.notes

  const res = await fetch(`${API_BASE_URL}/api/pitches/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update pitch: ${res.status} ${errorText}`)
  }
}

/**
 * REST API: PATCH /api/pitches/{id}/status
 */
export async function updatePitchStatusApi(id: string, status: PitchStatus, statusNote?: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/pitches/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      status: mapPitchStatusToBackend(status),
      statusNote: statusNote || undefined,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update status: ${res.status} ${errorText}`)
  }
}

/**
 * REST API: POST /api/pitches/{id}/feedback
 */
export async function addPitchFeedbackApi(id: string, note: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/pitches/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ note }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to add feedback: ${res.status} ${errorText}`)
  }
}

/**
 * REST API: POST /api/pitches/{id}/convert-to-event
 */
export async function convertPitchToEventApi(
  id: string,
  allowConflictOverride = false,
): Promise<ConvertPitchToEventResult> {
  const res = await fetch(`${API_BASE_URL}/api/pitches/${encodeURIComponent(id)}/convert-to-event`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ allowConflictOverride }),
  })

  if (res.status === 409) {
    const conflictData = await res.json().catch(() => ({}))
    return {
      success: false,
      conflict: true,
      pitchId: id,
      message: conflictData.error || conflictData.Error || conflictData.message || 'Venue scheduling conflict detected.',
      conflictingEvents: conflictData.conflictingEvents || conflictData.ConflictingEvents || [],
    }
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to convert pitch to event: ${res.status} ${errorText}`)
  }

  const data = await res.json()
  return {
    success: true,
    eventId: data.eventId || data.EventId || data.id || '',
    pitchId: data.pitchId || data.PitchId || id,
  }
}

/**
 * Custom React Hook for managing production pitch state.
 */
export function useProjectPitches() {
  const [pitches, setPitches] = useState<ProjectPitch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPitches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPitchesApi()
      setPitches(data)
    } catch (err: any) {
      console.warn('[useProjectPitches] Failed to fetch pitches:', err)
      setError(err?.message || 'Failed to load pitches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshPitches()
  }, [refreshPitches])

  const addPitch = useCallback(
    async (draft: Partial<ProjectPitch>) => {
      const newPitch = await createPitchApi(draft)
      if (newPitch) {
        setPitches((prev) => [newPitch, ...prev])
      }
      return newPitch
    },
    [],
  )

  const updatePitch = useCallback(
    async (id: string, updates: Partial<ProjectPitch>) => {
      await updatePitchApi(id, updates)
      if (updates.status) {
        await updatePitchStatusApi(id, updates.status)
      }
      await refreshPitches()
    },
    [refreshPitches],
  )

  const addFeedback = useCallback(
    async (pitchId: string, notes: string, _author?: string, newStatus?: PitchStatus) => {
      if (notes.trim()) {
        await addPitchFeedbackApi(pitchId, notes)
      }
      if (newStatus) {
        await updatePitchStatusApi(pitchId, newStatus)
      }
      await refreshPitches()
    },
    [refreshPitches],
  )

  const convertToEvent = useCallback(
    async (pitchId: string, allowConflictOverride = false) => {
      const result = await convertPitchToEventApi(pitchId, allowConflictOverride)
      if (result.success) {
        await refreshPitches()
      }
      return result
    },
    [refreshPitches],
  )

  return {
    pitches,
    loading,
    error,
    refreshPitches,
    addPitch,
    updatePitch,
    addFeedback,
    convertToEvent,
  }
}
