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

// ---------------------------------------------------------------------------
// Reservation / Availability DTOs
// Exactly mirrors Lumiere.Core.DTOs.ReservationDTOs
// ---------------------------------------------------------------------------

/**
 * Mirrors AssetConflictDetail in ReservationDTOs.cs
 */
export interface AssetConflictDetail {
  assetId: string
  assetName: string | null
  requestedQuantity: number
  availableQuantity: number
  physicalStock: number
  committedQuantity: number
  conflictingEventId: string
  conflictingEventName: string | null
  conflictingLockStart: string
  conflictingLockEnd: string
}

/**
 * Mirrors AssetAvailabilityDto in ReservationDTOs.cs.
 * AUTHORITATIVE server response for event-window asset availability.
 *
 * SEMANTICS:
 *   physicalStock      - total units in warehouse (physical reality)
 *   committedQuantity  - units already reserved in overlapping windows
 *   availableQuantity  - physicalStock minus committedQuantity for this window
 *   requestedQuantity  - the quantity we asked about
 *   hasConflict        - true when requestedQuantity > availableQuantity
 *   deficitQuantity    - shortfall when constrained
 */
export interface AssetAvailabilityDto {
  assetId: string
  assetName: string
  physicalStock: number
  committedQuantity: number
  availableQuantity: number
  requestedQuantity: number
  hasConflict: boolean
  deficitQuantity: number
  conflictingEvents: AssetConflictDetail[]
}

/**
 * Mirrors AssetReservationItemDto in ReservationDTOs.cs
 */
export interface AssetReservationItemDto {
  assetId: string
  quantity: number
}

/**
 * Mirrors CanvasValidationResponse in ReservationDTOs.cs
 */
export interface CanvasValidationResponse {
  availableAssetIds: string[]
  conflictedAssetIds: string[]
  availabilityDetails: AssetAvailabilityDto[]
  isValid: boolean
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
// Canonical result types
// Callers MUST check .ok before showing success UI or triggering downstream
// operations. Never treat absence of ok:false as implicit success.
// ---------------------------------------------------------------------------

export type CanvasApiResult =
  | { ok: true }
  | { ok: false; reason: 'network-error' | 'backend-rejected' | 'no-event-id'; status?: number; message?: string }

/**
 * Structured 409 conflict result from POST /api/canvas/event/{eventId}/approve.
 * Mirrors the TemporalConflictException shape from CanvasController.cs:
 *   { Message: string, Conflicts: AssetConflictDetail[] }
 */
export type CanvasApprovalResult =
  | { ok: true }
  | { ok: false; reason: 'conflict-409'; message: string; conflicts: AssetConflictDetail[] }
  | { ok: false; reason: 'backend-rejected'; status: number; message?: string }
  | { ok: false; reason: 'network-error'; message?: string }
  | { ok: false; reason: 'no-event-id' }

/**
 * Saves canvas layout state to PUT /api/canvas/event/{eventId}.
 * Returns CanvasApiResult. NEVER silently converts failures into success.
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
 * Normalizes backend conflict detail object to camelCase AssetConflictDetail regardless of server casing.
 */
export function normalizeConflictDetail(raw: any): AssetConflictDetail {
  if (!raw || typeof raw !== 'object') {
    return {
      assetId: '',
      assetName: null,
      requestedQuantity: 0,
      availableQuantity: 0,
      physicalStock: 0,
      committedQuantity: 0,
      conflictingEventId: '',
      conflictingEventName: null,
      conflictingLockStart: '',
      conflictingLockEnd: '',
    }
  }
  return {
    assetId: raw.assetId ?? raw.AssetId ?? '',
    assetName: raw.assetName ?? raw.AssetName ?? null,
    requestedQuantity: Number(raw.requestedQuantity ?? raw.RequestedQuantity ?? 0),
    availableQuantity: Number(raw.availableQuantity ?? raw.AvailableQuantity ?? 0),
    physicalStock: Number(raw.physicalStock ?? raw.PhysicalStock ?? 0),
    committedQuantity: Number(raw.committedQuantity ?? raw.CommittedQuantity ?? 0),
    conflictingEventId: raw.conflictingEventId ?? raw.ConflictingEventId ?? '',
    conflictingEventName: raw.conflictingEventName ?? raw.ConflictingEventName ?? null,
    conflictingLockStart: raw.conflictingLockStart ?? raw.ConflictingLockStart ?? '',
    conflictingLockEnd: raw.conflictingLockEnd ?? raw.ConflictingLockEnd ?? '',
  }
}

/**
 * Normalizes backend availability DTO to camelCase AssetAvailabilityDto regardless of server casing.
 */
export function normalizeAvailabilityDto(raw: any): AssetAvailabilityDto {
  if (!raw || typeof raw !== 'object') {
    return {
      assetId: '',
      assetName: '',
      physicalStock: 0,
      committedQuantity: 0,
      availableQuantity: 0,
      requestedQuantity: 0,
      hasConflict: false,
      deficitQuantity: 0,
      conflictingEvents: [],
    }
  }
  const rawConflicts = raw.conflictingEvents ?? raw.ConflictingEvents ?? []
  return {
    assetId: raw.assetId ?? raw.AssetId ?? '',
    assetName: raw.assetName ?? raw.AssetName ?? '',
    physicalStock: Number(raw.physicalStock ?? raw.PhysicalStock ?? 0),
    committedQuantity: Number(raw.committedQuantity ?? raw.CommittedQuantity ?? 0),
    availableQuantity: Number(raw.availableQuantity ?? raw.AvailableQuantity ?? 0),
    requestedQuantity: Number(raw.requestedQuantity ?? raw.RequestedQuantity ?? 0),
    hasConflict: Boolean(raw.hasConflict ?? raw.HasConflict ?? false),
    deficitQuantity: Number(raw.deficitQuantity ?? raw.DeficitQuantity ?? 0),
    conflictingEvents: Array.isArray(rawConflicts) ? rawConflicts.map(normalizeConflictDetail) : [],
  }
}

/**
 * Normalizes backend validation response to camelCase CanvasValidationResponse.
 */
export function normalizeValidationResponse(raw: any): CanvasValidationResponse {
  if (!raw || typeof raw !== 'object') {
    return {
      availableAssetIds: [],
      conflictedAssetIds: [],
      availabilityDetails: [],
      isValid: true,
    }
  }
  const rawAvailIds = raw.availableAssetIds ?? raw.AvailableAssetIds ?? []
  const rawConfIds = raw.conflictedAssetIds ?? raw.ConflictedAssetIds ?? []
  const rawDetails = raw.availabilityDetails ?? raw.AvailabilityDetails ?? []
  return {
    availableAssetIds: Array.isArray(rawAvailIds) ? rawAvailIds : [],
    conflictedAssetIds: Array.isArray(rawConfIds) ? rawConfIds : [],
    availabilityDetails: Array.isArray(rawDetails) ? rawDetails.map(normalizeAvailabilityDto) : [],
    isValid: Boolean(raw.isValid ?? raw.IsValid ?? (Array.isArray(rawConfIds) ? rawConfIds.length === 0 : true)),
  }
}

/**
 * Approves a canvas layout via POST /api/canvas/event/{eventId}/approve.
 *
 * Returns CanvasApprovalResult. Callers MUST check .ok before showing success UI.
 *
 * HTTP 409 Conflict:
 *   CanvasController.cs catches TemporalConflictException and returns:
 *     { Message: string, Conflicts: AssetConflictDetail[] }
 *   Surfaced as { ok: false, reason: 'conflict-409', message, conflicts }.
 *   NO success state must be shown on a 409. Planner must remain on Canvas.
 *
 * R9 boundary: Persistent AssetReservation + DispatchPreparationQueue creation is
 * backend-driven from this approval event. Frontend dispatch state is local only.
 */
export async function approveCanvasApi(eventId: string): Promise<CanvasApprovalResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/canvas/event/${encodeURIComponent(eventId)}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    if (res.status === 409) {
      let body: any = {}
      try { body = await res.json() } catch { /* non-JSON 409 body */ }
      const rawConflicts = body.conflicts ?? body.Conflicts ?? []
      const conflicts: AssetConflictDetail[] = Array.isArray(rawConflicts)
        ? rawConflicts.map(normalizeConflictDetail)
        : []
      const message = body.message ?? body.Message ?? 'Canvas approval rejected due to asset reservation conflicts.'
      console.warn(`[canvasApi] POST /api/canvas/event/${eventId}/approve 409 Conflict:`, message, conflicts)
      return { ok: false, reason: 'conflict-409', message, conflicts }
    }
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

// ---------------------------------------------------------------------------
// GET /api/reservations/availability
// Server-authoritative event-window asset availability.
// ---------------------------------------------------------------------------

export interface GetAssetAvailabilityParams {
  assetId: string
  start: string   // ISO-8601 DateTimeOffset
  end: string     // ISO-8601 DateTimeOffset
  quantity?: number
  eventId?: string
}

export type AssetAvailabilityResult =
  | { ok: true; data: AssetAvailabilityDto }
  | { ok: false; reason: 'not-found' | 'backend-error' | 'network-error' | 'missing-params'; message?: string }

/**
 * Fetches server-authoritative event-window availability for a single asset.
 *
 * GET /api/reservations/availability?assetId=&start=&end=&quantity=&eventId=
 *
 * AUTHORITATIVE operational truth:
 *   physicalStock      - total units in warehouse
 *   committedQuantity  - units locked by other overlapping reservations
 *   availableQuantity  - available for THIS event window
 *   requestedQuantity  - what we asked for
 *   hasConflict        - true when request cannot be met
 *
 * On failure: returns { ok: false }. Callers show "availability unknown".
 * NEVER substitute physicalStock for event-window available quantity.
 *
 * Supports AbortSignal for stale-request cancellation.
 */
export async function getAssetAvailabilityApi(
  params: GetAssetAvailabilityParams,
  signal?: AbortSignal,
): Promise<AssetAvailabilityResult> {
  const { assetId, start, end, quantity = 1, eventId } = params
  if (!assetId || !start || !end) {
    return { ok: false, reason: 'missing-params', message: 'assetId, start, and end are required.' }
  }
  const qs = new URLSearchParams({
    assetId,
    start,
    end,
    quantity: String(Math.max(1, quantity)),
  })
  if (eventId) qs.set('eventId', eventId)

  try {
    const res = await fetch(`${API_BASE_URL}/api/reservations/availability?${qs.toString()}`, {
      headers: getAuthHeaders(),
      signal,
    })
    if (res.status === 404) {
      return { ok: false, reason: 'not-found', message: 'Asset not found on server.' }
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { const b = await res.json(); msg = (b as { Error?: string })?.Error || msg } catch { /* ignore */ }
      console.warn(`[canvasApi] GET /api/reservations/availability returned ${res.status}`)
      return { ok: false, reason: 'backend-error', message: msg }
    }
    const rawData = await res.json()
    const data: AssetAvailabilityDto = normalizeAvailabilityDto(rawData)
    return { ok: true, data }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, reason: 'network-error', message: 'Request cancelled.' }
    }
    console.warn('[canvasApi] GET /api/reservations/availability network error:', err)
    return { ok: false, reason: 'network-error', message: err instanceof Error ? err.message : String(err) }
  }
}

// ---------------------------------------------------------------------------
// POST /api/reservations/validate-canvas-state
// Pre-approval server-side Canvas validation.
// ---------------------------------------------------------------------------

export interface ValidateCanvasStateParams {
  items: AssetReservationItemDto[]  // canonical asset ID + required quantity
  lockStart: string                  // ISO-8601 DateTimeOffset
  lockEnd: string                    // ISO-8601 DateTimeOffset
  eventId?: string
}

export type CanvasValidationResult =
  | { ok: true; data: CanvasValidationResponse }
  | { ok: false; reason: 'backend-error' | 'network-error' | 'missing-params'; message?: string }

/**
 * Validates current canvas resource requirements against backend availability.
 *
 * POST /api/reservations/validate-canvas-state
 *
 * Request body mirrors CanvasValidationRequest in ReservationDTOs.cs:
 *   Items: [{ AssetId: guid, Quantity: int }]
 *   LockStart, LockEnd: DateTimeOffset
 *   EventId: guid?
 *
 * Response (CanvasValidationResponse):
 *   availableAssetIds   - assets fully satisfiable
 *   conflictedAssetIds  - assets with shortfall
 *   availabilityDetails - per-asset breakdown
 *   isValid             - true only when conflictedAssetIds is empty
 *
 * IMPORTANT: Items must use canonical asset IDs + required quantities (not
 * visual instance counts unless the product model explicitly maps them).
 */
export async function validateCanvasStateApi(
  params: ValidateCanvasStateParams,
): Promise<CanvasValidationResult> {
  const { items, lockStart, lockEnd, eventId } = params
  if (!items || items.length === 0 || !lockStart || !lockEnd) {
    return { ok: false, reason: 'missing-params', message: 'items, lockStart, and lockEnd are required.' }
  }
  // Map to C# PascalCase DTO shape expected by the controller
  const body = {
    Items: items.map((i) => ({ AssetId: i.assetId, Quantity: i.quantity })),
    LockStart: lockStart,
    LockEnd: lockEnd,
    ...(eventId ? { EventId: eventId } : {}),
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/reservations/validate-canvas-state`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { const b = await res.json(); msg = (b as { Error?: string })?.Error || msg } catch { /* ignore */ }
      console.warn(`[canvasApi] POST /api/reservations/validate-canvas-state returned ${res.status}`)
      return { ok: false, reason: 'backend-error', message: msg }
    }
    const rawData = await res.json()
    const data: CanvasValidationResponse = normalizeValidationResponse(rawData)
    return { ok: true, data }
  } catch (err) {
    console.warn('[canvasApi] POST /api/reservations/validate-canvas-state network error:', err)
    return { ok: false, reason: 'network-error', message: err instanceof Error ? err.message : String(err) }
  }
}

// ---------------------------------------------------------------------------
// Canvas Collaboration & Access DTOs and API
// Exact C# endpoints:
//   GET    /api/events/{eventId}/access
//   POST   /api/events/{eventId}/access
//   PUT    /api/events/{eventId}/access/{targetUserId}
//   DELETE /api/events/{eventId}/access/{targetUserId}
//   GET    /api/events/{eventId}/collaborator-candidates
// ---------------------------------------------------------------------------

export type CanvasAccessLevel = 'CO_EDIT' | 'COMMENT' | 'VIEW'

export interface CanvasCollaboratorDto {
  userId: string
  eventId: string
  displayName: string
  role?: string
  email?: string
  accessLevel: CanvasAccessLevel
  grantedAt?: string
  grantedBy?: string
}

export interface CollaboratorCandidateDto {
  userId: string
  displayName: string
  role: string
  email?: string
  isEventPlanner?: boolean
}

export function normalizeCollaboratorDto(raw: any, eventIdFallback = ''): CanvasCollaboratorDto {
  if (!raw) {
    return {
      userId: '',
      eventId: eventIdFallback,
      displayName: 'Unknown',
      accessLevel: 'VIEW',
    }
  }

  const userId = String(raw.userId ?? raw.UserId ?? raw.targetUserId ?? raw.TargetUserId ?? raw.id ?? raw.Id ?? '')
  const eventId = String(raw.eventId ?? raw.EventId ?? eventIdFallback)
  const displayName = String(raw.displayName ?? raw.DisplayName ?? raw.name ?? raw.Name ?? raw.userName ?? raw.UserName ?? 'Team Member')
  const role = raw.role ?? raw.Role ?? undefined
  const email = raw.email ?? raw.Email ?? undefined
  
  const rawLevel = String(raw.accessLevel ?? raw.AccessLevel ?? raw.level ?? raw.Level ?? 'VIEW').toUpperCase()
  let accessLevel: CanvasAccessLevel = 'VIEW'
  if (rawLevel.includes('EDIT') || rawLevel === 'CO_EDIT') {
    accessLevel = 'CO_EDIT'
  } else if (rawLevel.includes('COMMENT')) {
    accessLevel = 'COMMENT'
  } else {
    accessLevel = 'VIEW'
  }

  const grantedAt = raw.grantedAt ?? raw.GrantedAt ?? undefined
  const grantedBy = raw.grantedBy ?? raw.GrantedBy ?? undefined

  return {
    userId,
    eventId,
    displayName,
    role,
    email,
    accessLevel,
    grantedAt,
    grantedBy,
  }
}

export function normalizeCandidateDto(raw: any): CollaboratorCandidateDto {
  if (!raw) {
    return {
      userId: '',
      displayName: 'Unknown Candidate',
      role: 'Staff',
    }
  }

  const userId = String(raw.userId ?? raw.UserId ?? raw.id ?? raw.Id ?? raw.user?.id ?? raw.user?.Id ?? '')
  const firstName = raw.firstName ?? raw.FirstName ?? raw.givenName ?? raw.GivenName ?? raw.user?.firstName ?? raw.user?.FirstName
  const lastName = raw.lastName ?? raw.LastName ?? raw.surname ?? raw.Surname ?? raw.user?.lastName ?? raw.user?.LastName
  const fullName = raw.fullName ?? raw.FullName ?? raw.user?.fullName ?? raw.user?.FullName
  const email = raw.email ?? raw.Email ?? raw.user?.email ?? raw.user?.Email ?? undefined
  const nameFromParts = [firstName, lastName].filter(Boolean).join(' ').trim()
  const displayName = String(
    raw.displayName ?? raw.DisplayName ?? raw.name ?? raw.Name ?? raw.userName ?? raw.UserName ?? fullName ?? nameFromParts ?? email?.split('@')[0] ?? 'Unnamed team member',
  )
  const role = String(raw.role ?? raw.Role ?? 'Staff')
  const isEventPlanner = role.toLowerCase().includes('planner') || role.toLowerCase().includes('creative')

  return {
    userId,
    displayName,
    role,
    email,
    isEventPlanner,
  }
}

/**
 * GET /api/events/{eventId}/access
 */
export async function fetchCanvasAccessApi(eventId: string): Promise<CanvasCollaboratorDto[]> {
  if (!eventId) return []
  try {
    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/access`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      if (res.status === 404) return []
      console.warn(`[canvasApi] fetchCanvasAccessApi HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map((item) => normalizeCollaboratorDto(item, eventId))
  } catch (err) {
    console.warn('[canvasApi] fetchCanvasAccessApi network error:', err)
    return []
  }
}

/**
 * GET /api/events/{eventId}/collaborator-candidates
 */
export async function fetchCollaboratorCandidatesApi(eventId: string): Promise<CollaboratorCandidateDto[]> {
  if (!eventId) return []
  try {
    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/collaborator-candidates`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      console.warn(`[canvasApi] fetchCollaboratorCandidatesApi HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map(normalizeCandidateDto)
  } catch (err) {
    console.warn('[canvasApi] fetchCollaboratorCandidatesApi network error:', err)
    return []
  }
}

/**
 * POST /api/events/{eventId}/access
 */
export async function grantCanvasAccessApi(
  eventId: string,
  targetUserId: string,
  accessLevel: CanvasAccessLevel,
): Promise<{ ok: boolean; error?: string }> {
  if (!eventId || !targetUserId) {
    return { ok: false, error: 'eventId and targetUserId are required' }
  }

  try {
    const body = {
      TargetUserId: targetUserId,
      targetUserId,
      AccessLevel: accessLevel,
      accessLevel,
    }

    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/access`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err.error || err.Error || err.message || err.Message || `HTTP ${res.status}`
      return { ok: false, error: msg }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error while granting canvas access' }
  }
}

/**
 * PUT /api/events/{eventId}/access/{targetUserId}
 */
export async function updateCanvasAccessApi(
  eventId: string,
  targetUserId: string,
  accessLevel: CanvasAccessLevel,
): Promise<{ ok: boolean; error?: string }> {
  if (!eventId || !targetUserId) {
    return { ok: false, error: 'eventId and targetUserId are required' }
  }

  try {
    const body = {
      AccessLevel: accessLevel,
      accessLevel,
    }

    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/access/${encodeURIComponent(targetUserId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err.error || err.Error || err.message || err.Message || `HTTP ${res.status}`
      return { ok: false, error: msg }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error while updating canvas access' }
  }
}

/**
 * DELETE /api/events/{eventId}/access/{targetUserId}
 */
export async function revokeCanvasAccessApi(
  eventId: string,
  targetUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!eventId || !targetUserId) {
    return { ok: false, error: 'eventId and targetUserId are required' }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/access/${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err.error || err.Error || err.message || err.Message || `HTTP ${res.status}`
      return { ok: false, error: msg }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error while revoking canvas access' }
  }
}

