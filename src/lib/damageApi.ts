import type {
  DamageException,
  DamageSelfValidationRecord,
  SubRoleEmergencyUnblockMetadata,
  DamageVerdict,
} from './types'

const BASE_URL = 'http://localhost:8080/api/damage-reports'

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('_lumiere_auth_token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function resolveGuid(id: string): string {
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
    return id
  }
  if (id === 'DEMO-001') return '33333333-3333-3333-3333-333333333333'
  if (id === 'DEMO-002') return '44444444-4444-4444-4444-444444444444'
  return '11111111-1111-1111-1111-111111111111'
}

function mapBackendDtoToDamageException(dto: any): DamageException {
  const shortId = dto.id ? dto.id.slice(0, 4).toUpperCase() : '800'
  return {
    id: dto.id,
    logId: `EXC-2026-${shortId}`,
    boundEvent: dto.eventId === '11111111-1111-1111-1111-111111111111' ? 'Maison Lumine Premiere Gala' : 'Casa Ruiz Wedding',
    reportingOfficer: dto.submittedBy === 'ab72d5b3-4f46-4068-87a1-8680b0db0d96' ? 'R. Montoya' : (dto.submittedBy || 'Ground Crew Lead'),
    officerRole: 'GROUND CREW',
    assetName: dto.id === '33333333-3333-3333-3333-333333333333'
      ? 'SkyPanel S60-C LED Softlight'
      : dto.id === '44444444-4444-4444-4444-444444444444'
      ? 'Gold Chiavari Chair — Leg Fracture'
      : 'White Linen Table Runner',
    assetSku: dto.id === '33333333-3333-3333-3333-333333333333' ? 'SKU: LMR-LGT-S60C' : 'SKU: LMR-FURN-CH08',
    damageType: dto.severity || 'Critical',
    imageUrl: dto.photoUrl || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04',
    gps: 'GPS: 14.5492° N, 121.019° E',
    capturedAt: dto.submittedAt ? new Date(dto.submittedAt).toLocaleDateString() : '12 Dec 2025 · 22:40',
    exifVerified: !dto.noPhotographicEvidence,
    estimatedCost: dto.repairCostEstimate ?? 150,
    notes: dto.verdictBy ? `Verdict by ${dto.verdictBy}` : 'Physical inspection pending',
    status: (dto.reportStatus || dto.status || 'Pending Verdict') as DamageVerdict,
    noPhotographicEvidence: dto.noPhotographicEvidence ?? false,
    firstSignOff: dto.firstSignOff,
    secondSignOff: dto.secondSignOff,
    custodyMode: dto.custodyMode,
    unblockMetadata: dto.emergencyUnblockMetadata || dto.unblockMetadata,
    selfValidation: dto.selfValidation,
  }
}

export async function fetchDamageReportsForEvent(eventId: string): Promise<DamageException[]> {
  const realGuid = resolveGuid(eventId)
  const res = await fetch(`${BASE_URL}/event/${encodeURIComponent(realGuid)}`, {
    headers: getHeaders(),
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch damage reports for event ${eventId}: ${res.statusText}`)
  }
  const rawList = await res.json()
  return Array.isArray(rawList) ? rawList.map(mapBackendDtoToDamageException) : []
}

export async function fetchDamageReportsAllEvents(events: Array<{ id: string; title?: string; refId?: string }>): Promise<{ reports: DamageException[]; connected: boolean }> {
  try {
    const rawIds = Array.from(new Set(events.map(e => e.refId || e.id || e.title).filter(Boolean))) as string[]
    rawIds.push('11111111-1111-1111-1111-111111111111')
    const eventGuids = Array.from(new Set(rawIds.map(resolveGuid)))

    const results = await Promise.allSettled(
      eventGuids.map(id => fetchDamageReportsForEvent(id))
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

    if (!connected) {
      return { reports: [], connected: false }
    }

    return { reports: allReports, connected: true }
  } catch (err) {
    console.warn('[damageApi] Failed to fetch damage reports from backend:', err)
    return { reports: [], connected: false }
  }
}

export async function createDamageReport(payload: Partial<DamageException>): Promise<DamageException> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to create damage report: ${res.statusText}`)
  }
  return res.json()
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
  }
): Promise<DamageException> {
  const realGuid = resolveGuid(reportId)
  const sv = payload.selfValidation as (DamageSelfValidationRecord & { pin?: string }) | undefined
  const dtoPayload = {
    verdict: payload.verdict,
    note: payload.note || 'Signed off via portal',
    pin: sv?.pin,
    justification: payload.selfValidation?.justification,
    repairCostEstimate: payload.verdict === 'Repair' ? 150 : 0
  }

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(realGuid)}/sign-off`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dtoPayload),
  })
  if (!res.ok) {
    throw new Error(`Failed to record sign-off: ${res.statusText}`)
  }
  return res.json()
}

export async function adminUnblock(
  reportId: string,
  payload: {
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>
    note: string
    unblockMetadata: SubRoleEmergencyUnblockMetadata
    selfValidation?: DamageSelfValidationRecord
  }
): Promise<DamageException> {
  const realGuid = resolveGuid(reportId)
  const dtoPayload = {
    reason: payload.note || payload.unblockMetadata?.emergencyReason || 'Emergency override by system administrator',
    unblockScope: 'instance',
    permanentAcknowledged: false
  }

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(realGuid)}/admin-unblock`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dtoPayload),
  })
  if (!res.ok) {
    throw new Error(`Failed to perform admin emergency unblock: ${res.statusText}`)
  }
  return res.json()
}

export async function completeMaintenanceBackend(reportId: string): Promise<{ success: boolean; message?: string }> {
  const realGuid = resolveGuid(reportId)
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(realGuid)}/complete-maintenance`, {
    method: 'POST',
    headers: getHeaders(),
  })
  if (!res.ok) {
    throw new Error(`Failed to complete maintenance: ${res.statusText}`)
  }
  return res.json()
}

export async function checkSettlementBlockedBackend(eventId: string): Promise<{ blocked: boolean; blockingItemsCount: number }> {
  const realGuid = resolveGuid(eventId)
  const res = await fetch(`${BASE_URL}/event/${encodeURIComponent(realGuid)}/settlement-blocked`, {
    headers: getHeaders(),
  })
  if (!res.ok) {
    throw new Error(`Failed to check settlement blocked status: ${res.statusText}`)
  }
  return res.json()
}
