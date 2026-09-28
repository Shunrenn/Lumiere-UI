import type {
  DamageException,
  DamageSelfValidationRecord,
  SubRoleEmergencyUnblockMetadata,
  DamageVerdict,
} from './types'
import { API_BASE_URL, getAuthToken } from './apiConfig'
import { isGuid } from './eventsApi'

const BASE_URL = `${API_BASE_URL}/api/damage-reports`

/**
 * Authoritative backend create request for POST /api/damage-reports
 */
export interface CreateDamageReportRequest {
  assetId: string // Canonical Asset GUID
  eventId: string // Canonical Event GUID
  batchId?: string // Optional Batch GUID
  photoUrl: string
  sha256Hash: string
  exifMetadata?: string
  gpsCoordinates?: string
  damagedQuantity: number // int between 1 and 10000
  noPhotographicEvidence: boolean
  severity?: string // 'Critical' | 'Major' | 'Minor' etc.
  liabilityParty?: string
  linkedExceptionId?: string // Optional GUID
  settlementDueAt?: string // ISO string
  idempotencyKey?: string // UUID / unique request key
}

/**
 * Authoritative backend DamageReportResponse contract from C# API
 */
export interface DamageReportResponseDto {
  id: string // Canonical GUID
  assetId: string // Canonical GUID
  assetName?: string
  eventId: string // Canonical GUID
  eventName?: string
  batchId?: string
  photoUrl: string
  sha256Hash: string
  exifMetadata?: string
  gpsCoordinates?: string
  isTemporallyValid: boolean
  noPhotographicEvidence: boolean
  damagedQuantity: number
  reportStatus: string
  severity?: string
  liabilityParty?: string
  linkedExceptionId?: string
  settlementDueAt?: string
  supervisorVerdict?: string
  verdictBy?: string
  verdictAt?: string
  repairCostEstimate?: number
  submittedBy: string
  submittedAt: string
  firstSignOff?: string
  secondSignOff?: string
  custodyMode?: string
  selfValidation?: string
  emergencyUnblockMetadata?: string
  idempotencyKey?: string
}

export type SubmitDamageReportResult =
  | { kind: 'created'; report: DamageException; raw: DamageReportResponseDto }
  | { kind: 'replayed'; report: DamageException; raw: DamageReportResponseDto } // 200 OK idempotent replay
  | { kind: 'validation_error'; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'idempotency_conflict'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'error'; message: string; statusCode?: number }

function getHeaders(idempotencyKey?: string): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey
  }
  return headers
}

/**
 * Maps authoritative DamageReportResponseDto from backend to frontend DamageException.
 * Note on HAVA boundary:
 * exifVerified is intentionally set to false — photo presence alone NEVER proves temporal validity.
 * Evidence is presented neutrally as "Photo Attached" or "No Photographic Evidence".
 */
export function mapBackendDtoToDamageException(dto: DamageReportResponseDto): DamageException {
  const shortId = dto.id ? dto.id.slice(0, 4).toUpperCase() : '800'
  const gpsDisplay = dto.gpsCoordinates
    ? dto.gpsCoordinates
    : dto.noPhotographicEvidence
    ? 'No photo — GPS not captured'
    : 'GPS not captured'

  return {
    id: dto.id,
    logId: `EXC-2026-${shortId}`,
    eventId: dto.eventId,
    assetId: dto.assetId,
    boundEvent: dto.eventName || dto.eventId || 'Event',
    reportingOfficer: dto.submittedBy ? `Officer ${dto.submittedBy.slice(0, 6)}` : 'Ground Crew Member',
    officerRole: 'GROUND CREW',
    assetName: dto.assetName || 'Asset Item',
    assetSku: `ID: ${dto.assetId.slice(0, 8).toUpperCase()}`,
    damageType: dto.severity || 'Critical',
    damagedQuantity: dto.damagedQuantity ?? 1,
    photoUrl: dto.photoUrl || '',
    imageUrl: dto.photoUrl || '',
    gps: gpsDisplay,
    capturedAt: dto.submittedAt ? new Date(dto.submittedAt).toLocaleDateString() : 'Just now',
    // CRITICAL HAVA BOUNDARY:
    // Never infer verified merely because a photo exists.
    exifVerified: false,
    evidenceStatus: dto.noPhotographicEvidence ? 'No Photographic Evidence' : 'Photo Evidence Attached',
    estimatedCost: dto.repairCostEstimate ?? 150,
    notes: dto.supervisorVerdict ? `Supervisor Verdict: ${dto.supervisorVerdict}` : 'Condition inspection recorded',
    status: (dto.reportStatus || 'Pending Verdict') as DamageVerdict,
    noPhotographicEvidence: dto.noPhotographicEvidence ?? false,
    firstSignOff: dto.firstSignOff ? JSON.parseSafe(dto.firstSignOff) : undefined,
    secondSignOff: dto.secondSignOff ? JSON.parseSafe(dto.secondSignOff) : undefined,
    custodyMode: dto.custodyMode as any,
    unblockMetadata: dto.emergencyUnblockMetadata ? JSON.parseSafe(dto.emergencyUnblockMetadata) : undefined,
    selfValidation: dto.selfValidation ? JSON.parseSafe(dto.selfValidation) : undefined,
    sha256Hash: dto.sha256Hash || undefined,
    exifMetadata: dto.exifMetadata || undefined,
    gpsCoordinates: dto.gpsCoordinates || undefined,
  }
}

// Safe JSON parser helper for nested serialized JSON columns
declare global {
  interface JSON {
    parseSafe(text?: string | null): any
  }
}
JSON.parseSafe = (text?: string | null) => {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Authoritative damage report submission via POST /api/damage-reports.
 * Handles 201 Created (new report), 200 OK (idempotent replay), 400, 404, 409, 403.
 */
export async function submitDamageReportApi(
  request: CreateDamageReportRequest,
): Promise<SubmitDamageReportResult> {
  // Validate canonical GUID identities
  if (!isGuid(request.assetId)) {
    return {
      kind: 'validation_error',
      message: `Invalid asset ID "${request.assetId}". Operational assetId must be a canonical GUID.`,
    }
  }
  if (!isGuid(request.eventId)) {
    return {
      kind: 'validation_error',
      message: `Invalid event ID "${request.eventId}". Operational eventId must be a canonical GUID.`,
    }
  }
  if (request.damagedQuantity < 1) {
    return {
      kind: 'validation_error',
      message: 'Damaged quantity must be at least 1.',
    }
  }

  // Ensure request-level idempotency key
  const idempotencyKey = request.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined)

  const payload: CreateDamageReportRequest = {
    ...request,
    idempotencyKey,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: getHeaders(idempotencyKey),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.status === 201) {
      const data: DamageReportResponseDto = await res.json()
      const report = mapBackendDtoToDamageException(data)
      return { kind: 'created', report, raw: data }
    }

    if (res.status === 200) {
      const data: DamageReportResponseDto = await res.json()
      const report = mapBackendDtoToDamageException(data)
      return { kind: 'replayed', report, raw: data }
    }

    const body = await res.json().catch(() => ({}))
    const errorMessage = body.error || body.Error || body.message

    if (res.status === 400) {
      return {
        kind: 'validation_error',
        message: errorMessage || 'Validation failure on damage report submission.',
      }
    }

    if (res.status === 404) {
      return {
        kind: 'not_found',
        message: errorMessage || 'Referenced Event or Asset was not found on server.',
      }
    }

    if (res.status === 409) {
      return {
        kind: 'idempotency_conflict',
        message: errorMessage || 'An idempotency conflict occurred. Please retry with verified parameters.',
      }
    }

    if (res.status === 401 || res.status === 403) {
      return {
        kind: 'forbidden',
        message: errorMessage || 'Unauthorized: Only authorized Ground Crew members may submit damage reports.',
      }
    }

    return {
      kind: 'error',
      message: errorMessage || `Failed to submit damage report (HTTP ${res.status})`,
      statusCode: res.status,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return {
      kind: 'error',
      message: err?.message || 'Network error connecting to Damage service',
    }
  }
}

/**
 * Backward-compatible adapter for legacy callers of createDamageReport.
 * Routes directly to authoritative submitDamageReportApi.
 */
export async function createDamageReport(payload: Partial<CreateDamageReportRequest> & Partial<DamageException>): Promise<DamageException> {
  const assetId = payload.assetId || ''
  const eventId = payload.eventId || ''
  const damagedQuantity = payload.damagedQuantity ?? 1
  const noPhotographicEvidence = payload.noPhotographicEvidence ?? false
  const photoUrl = payload.photoUrl || payload.imageUrl || ''
  const sha256Hash = payload.sha256Hash || ''

  const result = await submitDamageReportApi({
    assetId,
    eventId,
    damagedQuantity,
    noPhotographicEvidence,
    photoUrl,
    sha256Hash,
    exifMetadata: payload.exifMetadata,
    gpsCoordinates: payload.gpsCoordinates,
    severity: payload.damageType || payload.severity || 'Critical',
    idempotencyKey: payload.idempotencyKey,
  })

  if (result.kind === 'created' || result.kind === 'replayed') {
    return result.report
  }

  throw new Error(`Failed to create damage report: ${result.message}`)
}

/**
 * Fetches all damage reports for a specific event by canonical event GUID.
 * Rejects non-GUID identifiers.
 */
export async function fetchDamageReportsForEvent(eventId: string): Promise<DamageException[]> {
  if (!isGuid(eventId)) {
    return []
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${BASE_URL}/event/${encodeURIComponent(eventId)}`, {
      headers: getHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      throw new Error(`Failed to fetch damage reports for event ${eventId}: HTTP ${res.status}`)
    }
    const rawList: DamageReportResponseDto[] = await res.json()
    return Array.isArray(rawList) ? rawList.map(mapBackendDtoToDamageException) : []
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[damageApi] fetchDamageReportsForEvent failed for ${eventId}:`, err)
    throw err
  }
}

/**
 * Hydrates damage reports across active events using their canonical event GUIDs.
 */
export async function fetchDamageReportsAllEvents(
  events: Array<{ id: string; title?: string; refId?: string }>,
): Promise<{ reports: DamageException[]; connected: boolean }> {
  try {
    // Collect ONLY canonical GUIDs. Never use PRT, refId, or title as API identity.
    const eventGuids = Array.from(new Set(events.map((e) => e.id).filter(isGuid)))

    if (eventGuids.length === 0) {
      return { reports: [], connected: true }
    }

    const results = await Promise.allSettled(
      eventGuids.map((id) => fetchDamageReportsForEvent(id)),
    )

    let connected = false
    const allReports: DamageException[] = []
    const seenIds = new Set<string>()

    for (const res of results) {
      if (res.status === 'fulfilled') {
        connected = true
        for (const report of res.value) {
          if (!seenIds.has(report.id)) {
            seenIds.add(report.id)
            allReports.push(report)
          }
        }
      }
    }

    return { reports: allReports, connected }
  } catch (err) {
    console.warn('[damageApi] Failed to fetch damage reports from backend:', err)
    return { reports: [], connected: false }
  }
}

export async function recordSignOff(
  reportId: string,
  payload: {
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>
    note: string
    initiatorRole: string
    staffEmail?: string
    staffName?: string
    selfValidation?: DamageSelfValidationRecord
  },
): Promise<DamageException> {
  if (!isGuid(reportId)) {
    throw new Error(`Invalid reportId "${reportId}". Must be a canonical GUID.`)
  }

  const sv = payload.selfValidation as (DamageSelfValidationRecord & { pin?: string }) | undefined
  const dtoPayload = {
    verdict: payload.verdict,
    note: payload.note || 'Signed off via portal',
    pin: sv?.pin,
    justification: payload.selfValidation?.justification,
    repairCostEstimate: payload.verdict === 'Repair' ? 150 : 0,
  }

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(reportId)}/sign-off`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dtoPayload),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const msg = errBody.error || errBody.Error || res.statusText
    throw new Error(`Failed to record sign-off: ${msg}`)
  }

  const raw: DamageReportResponseDto = await res.json()
  return mapBackendDtoToDamageException(raw)
}

export async function adminUnblock(
  reportId: string,
  payload: {
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>
    note: string
    unblockMetadata: SubRoleEmergencyUnblockMetadata
    selfValidation?: DamageSelfValidationRecord
  },
): Promise<DamageException> {
  if (!isGuid(reportId)) {
    throw new Error(`Invalid reportId "${reportId}". Must be a canonical GUID.`)
  }

  const dtoPayload = {
    reason: payload.note || payload.unblockMetadata?.emergencyReason || 'Emergency override by system administrator',
    unblockScope: 'instance',
    permanentAcknowledged: false,
  }

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(reportId)}/admin-unblock`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dtoPayload),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const msg = errBody.error || errBody.Error || res.statusText
    throw new Error(`Failed to perform admin emergency unblock: ${msg}`)
  }

  const raw: DamageReportResponseDto = await res.json()
  return mapBackendDtoToDamageException(raw)
}

export async function completeMaintenanceBackend(reportId: string): Promise<{ success: boolean; message?: string }> {
  if (!isGuid(reportId)) {
    throw new Error(`Invalid reportId "${reportId}". Must be a canonical GUID.`)
  }

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(reportId)}/complete-maintenance`, {
    method: 'POST',
    headers: getHeaders(),
  })
  if (!res.ok) {
    throw new Error(`Failed to complete maintenance: ${res.statusText}`)
  }
  return res.json()
}

export async function checkSettlementBlockedBackend(eventId: string): Promise<{ blocked: boolean; blockingItemsCount: number }> {
  if (!isGuid(eventId)) {
    return { blocked: false, blockingItemsCount: 0 }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${BASE_URL}/event/${encodeURIComponent(eventId)}/settlement-blocked`, {
      headers: getHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      throw new Error(`Failed to check settlement blocked status: HTTP ${res.status}`)
    }
    const data = await res.json()
    return {
      blocked: Boolean(data.blocked ?? data.isBlocked ?? data.Blocked),
      blockingItemsCount: Number(data.blockingItemsCount ?? data.count ?? data.BlockingItemsCount ?? 0),
    }
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[damageApi] checkSettlementBlockedBackend failed for ${eventId}:`, err)
    throw err
  }
}
