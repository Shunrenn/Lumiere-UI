import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'
import { createEventApi } from '@/features/events/api/eventsApi'

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

const STORAGE_KEY = 'lumiere_project_pitches'

const SEED_PITCHES: ProjectPitch[] = [
  {
    id: 'pitch-001',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
    assignedPmName: 'Project Manager User',
    assignedPmEmail: 'projectmanager@lumiere.com',
    status: 'For Presentation',
    brief: {
      clientName: 'Aura Luxe Global',
      contactPerson: 'Elena Rostova',
      contactEmail: 'elena@auraluxe.com',
      contactPhone: '+63 917 888 1122',
      eventType: 'Luxury Product Launch',
      proposedDate: '2026-11-15',
      proposedVenue: 'Grand Hyatt Manila Ballroom',
      estimatedGuests: 250,
      budgetRange: '₱1,500,000 - ₱2,000,000',
      requirements: 'Crystal chandeliers, bespoke staging, LED tunnel entrance.',
      notes: 'High-profile international guests and influencers attending.',
    },
    proposal: {
      conceptTitle: 'Aura Luxe Autumn Opulence Reveal',
      conceptSummary: 'An ethereal multi-sensory installation integrating architectural crystal rigging with bespoke floral canopies.',
      scopeOfWork: 'End-to-end design, lighting choreography, staging, run sheets, and VIP logistics.',
      deliverables: ['Custom Kinetic Crystal Rig', '360 Velvet Lounge', 'Bespoke Illuminated Runway'],
      estimatedBudget: 1850000,
      proposedTimeline: '6 weeks prep, 2 days ingress',
      notes: 'Draft proposal prepared for executive sign-off.',
    },
    feedback: [
      {
        id: 'fb-1',
        date: '2026-09-18T14:30:00.000Z',
        author: 'Client Representative',
        notes: 'Requested emphasis on sustainable floral and energy-efficient lighting.',
        stageChangedTo: 'For Presentation',
      },
    ],
  },
  {
    id: 'pitch-002',
    createdAt: '2026-09-22T09:15:00.000Z',
    updatedAt: '2026-09-25T11:00:00.000Z',
    assignedPmName: 'Project Manager User',
    assignedPmEmail: 'projectmanager@lumiere.com',
    status: 'Approved',
    brief: {
      clientName: 'Vanguard Innovations',
      contactPerson: 'Marcus Vance',
      contactEmail: 'm.vance@vanguardtech.io',
      contactPhone: '+63 918 555 4321',
      eventType: 'Tech Keynote & Summit',
      proposedDate: '2026-11-28',
      proposedVenue: 'SMX Convention Center Hall 2',
      estimatedGuests: 600,
      budgetRange: '₱2,500,000 - ₱3,200,000',
      requirements: 'Dual ultra-wide 4K projection mapping, smart badge check-in kiosks.',
      notes: 'Live global stream requiring redundant gigabit uplink.',
    },
    proposal: {
      conceptTitle: 'Vanguard Horizons Tech Keynote',
      conceptSummary: 'Futuristic minimalist stagecraft with seamless audio-visual integration and interactive guest demo zones.',
      scopeOfWork: 'Stage architecture, rigging, multi-camera live broadcast, spatial audio.',
      deliverables: ['Curved LED Wall 24x6m', 'Holographic Display Pods', 'Speaker Teleprompters'],
      estimatedBudget: 2800000,
      proposedTimeline: '8 weeks prep, 3 days ingress',
      notes: 'Approved by Vanguard board of directors.',
    },
    feedback: [],
  },
]

function loadStoredPitches(): ProjectPitch[] {
  if (typeof window === 'undefined') return SEED_PITCHES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn('[project-pitch] Failed to read from localStorage:', e)
  }
  return SEED_PITCHES
}

function saveStoredPitches(pitches: ProjectPitch[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pitches))
  } catch (e) {
    console.warn('[project-pitch] Failed to save to localStorage:', e)
  }
}

/**
 * REST API: GET /api/pitches?page=1&pageSize=100 with offline fallback
 */
export async function fetchPitchesApi(): Promise<ProjectPitch[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/pitches?page=1&pageSize=100`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const body = await res.json()
      const rawItems: ClientPitchResponseDto[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.items)
        ? body.items
        : []
      const mapped = rawItems.map(mapPitchResponseToProjectPitch)
      if (mapped.length > 0) {
        saveStoredPitches(mapped)
        return mapped
      }
    }
  } catch (err) {
    console.warn('[pitchesApi] Backend endpoint /api/pitches not reachable, using stored pitches:', err)
  }
  return loadStoredPitches()
}

/**
 * REST API: POST /api/pitches
 */
export async function createPitchApi(pitchData: Partial<ProjectPitch>): Promise<ProjectPitch | null> {
  const newPitch: ProjectPitch = {
    id: `pitch-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedPmName: pitchData.assignedPmName || 'Project Manager User',
    assignedPmEmail: pitchData.assignedPmEmail || 'projectmanager@lumiere.com',
    status: pitchData.status || 'Draft',
    brief: {
      clientName: pitchData.brief?.clientName || 'New Client',
      contactPerson: pitchData.brief?.contactPerson || '',
      contactEmail: pitchData.brief?.contactEmail || '',
      contactPhone: pitchData.brief?.contactPhone || '',
      eventType: pitchData.brief?.eventType || 'Corporate Event',
      proposedDate: pitchData.brief?.proposedDate || new Date().toISOString().slice(0, 10),
      proposedVenue: pitchData.brief?.proposedVenue || 'Venue TBD',
      estimatedGuests: pitchData.brief?.estimatedGuests || 100,
      budgetRange: pitchData.brief?.budgetRange || '₱500,000 - ₱1,000,000',
      requirements: pitchData.brief?.requirements || '',
      notes: pitchData.brief?.notes || '',
    },
    proposal: {
      conceptTitle: pitchData.proposal?.conceptTitle || `${pitchData.brief?.clientName || 'Client'} Proposal`,
      conceptSummary: pitchData.proposal?.conceptSummary || '',
      scopeOfWork: pitchData.proposal?.scopeOfWork || '',
      deliverables: Array.isArray(pitchData.proposal?.deliverables) ? pitchData.proposal!.deliverables : [],
      estimatedBudget: pitchData.proposal?.estimatedBudget || 500000,
      proposedTimeline: pitchData.proposal?.proposedTimeline || '4 weeks prep',
      notes: pitchData.proposal?.notes || '',
    },
    feedback: [],
  }

  try {
    const payload = {
      title: newPitch.proposal.conceptTitle,
      clientName: newPitch.brief.clientName,
      contactPerson: newPitch.brief.contactPerson,
      contactInformation: newPitch.brief.contactEmail,
      eventType: newPitch.brief.eventType,
      proposedDate: new Date(newPitch.brief.proposedDate).toISOString(),
      proposedVenue: newPitch.brief.proposedVenue,
      estimatedGuests: newPitch.brief.estimatedGuests,
      requirements: newPitch.brief.requirements,
      budgetRange: newPitch.brief.budgetRange,
      briefNotes: newPitch.brief.notes,
      concept: newPitch.proposal.conceptSummary,
      scope: newPitch.proposal.scopeOfWork,
      deliverables: newPitch.proposal.deliverables.join(', '),
      estimatedBudget: newPitch.proposal.estimatedBudget,
      proposedTimeline: newPitch.proposal.proposedTimeline,
      proposalNotes: newPitch.proposal.notes,
    }

    const res = await fetch(`${API_BASE_URL}/api/pitches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const dto: ClientPitchResponseDto = await res.json()
      const created = mapPitchResponseToProjectPitch(dto)
      const existing = loadStoredPitches()
      saveStoredPitches([created, ...existing])
      return created
    }
  } catch (err) {
    console.warn('[pitchesApi] POST /api/pitches failed, storing locally:', err)
  }

  const existing = loadStoredPitches()
  const updated = [newPitch, ...existing]
  saveStoredPitches(updated)
  return newPitch
}

/**
 * REST API: PUT /api/pitches/{id}
 */
export async function updatePitchApi(id: string, updates: Partial<ProjectPitch>): Promise<void> {
  const existing = loadStoredPitches()
  const updated = existing.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
  saveStoredPitches(updated)

  try {
    await fetch(`${API_BASE_URL}/api/pitches/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    })
  } catch (err) {
    console.warn('[pitchesApi] PUT /api/pitches offline:', err)
  }
}

/**
 * REST API: PATCH /api/pitches/{id}/status
 */
export async function updatePitchStatusApi(id: string, status: PitchStatus, statusNote?: string): Promise<void> {
  const existing = loadStoredPitches()
  const updated = existing.map((p) => {
    if (p.id !== id) return p
    const feedbackEntry: ClientFeedbackEntry | null = statusNote
      ? {
          id: `fb-${Date.now()}`,
          date: new Date().toISOString(),
          author: 'Project Manager',
          notes: statusNote,
          stageChangedTo: status,
        }
      : null

    return {
      ...p,
      status,
      updatedAt: new Date().toISOString(),
      feedback: feedbackEntry ? [feedbackEntry, ...p.feedback] : p.feedback,
    }
  })
  saveStoredPitches(updated)

  try {
    await fetch(`${API_BASE_URL}/api/pitches/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: mapPitchStatusToBackend(status),
        statusNote,
      }),
    })
  } catch (err) {
    console.warn('[pitchesApi] PATCH /api/pitches/status offline:', err)
  }
}

/**
 * REST API: POST /api/pitches/{id}/feedback
 */
export async function addPitchFeedbackApi(id: string, note: string): Promise<void> {
  const existing = loadStoredPitches()
  const updated = existing.map((p) => {
    if (p.id !== id) return p
    const newEntry: ClientFeedbackEntry = {
      id: `fb-${Date.now()}`,
      date: new Date().toISOString(),
      author: 'Project Manager',
      notes: note,
    }
    return {
      ...p,
      updatedAt: new Date().toISOString(),
      feedback: [newEntry, ...p.feedback],
    }
  })
  saveStoredPitches(updated)

  try {
    await fetch(`${API_BASE_URL}/api/pitches/${encodeURIComponent(id)}/feedback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ note }),
    })
  } catch (err) {
    console.warn('[pitchesApi] POST /api/pitches/feedback offline:', err)
  }
}

/**
 * REST API: POST /api/pitches/{id}/convert-to-event
 * Registers the pitch as a full active Event via createEventApi in the backend database.
 */
export async function convertPitchToEventApi(
  id: string,
  allowConflictOverride = false,
): Promise<ConvertPitchToEventResult> {
  const existing = loadStoredPitches()
  const pitch = existing.find((p) => p.id === id)
  if (!pitch) {
    return { success: false, message: 'Pitch not found' }
  }

  // Create authoritative event in database via backend createEventApi
  const eventName = pitch.proposal.conceptTitle || `${pitch.brief.clientName} Event`
  const targetDate = pitch.brief.proposedDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const createResult = await createEventApi({
    eventName,
    dateOfEvent: `${targetDate}T00:00:00.000Z`,
    ingressDate: `${targetDate}T00:00:00.000Z`,
    ingressTime: '08:00:00',
    fullStop: '23:59:00',
    eventVenue: pitch.brief.proposedVenue || 'Grand Ballroom, Shangri-La Fort',
    geoClass: 'Local',
    notes: `${pitch.proposal.conceptSummary || ''} | Budget: ₱${pitch.proposal.estimatedBudget?.toLocaleString() || 0}`,
    estimatedRevenue: pitch.proposal.estimatedBudget || 100000,
    allowConflictOverride,
  })

  if (!createResult.success) {
    if (createResult.conflict) {
      return {
        success: false,
        conflict: true,
        pitchId: id,
        message: createResult.message || 'Scheduling conflict detected for this date and venue.',
        conflictingEvents: createResult.conflictingEvents || [],
      }
    }
    return {
      success: false,
      message: createResult.message || 'Failed to register event in database.',
    }
  }

  const createdEventId = createResult.event?.id || String(Date.now())

  // Update pitch status to Converted to Event
  const updatedPitches = existing.map((p) =>
    p.id === id
      ? {
          ...p,
          status: 'Converted to Event' as PitchStatus,
          convertedEventId: createdEventId,
          updatedAt: new Date().toISOString(),
        }
      : p,
  )
  saveStoredPitches(updatedPitches)

  return {
    success: true,
    eventId: createdEventId,
    pitchId: id,
  }
}

/**
 * Custom React Hook for managing production pitch state.
 */
export function useProjectPitches() {
  const [pitches, setPitches] = useState<ProjectPitch[]>(() => loadStoredPitches())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshPitches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPitchesApi()
      setPitches(data)
    } catch (err: any) {
      console.warn('[useProjectPitches] Failed to fetch pitches:', err)
      setPitches(loadStoredPitches())
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
