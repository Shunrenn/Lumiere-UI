import { useSyncExternalStore } from 'react'
import type { HavaDeclarationState, HavaEvidenceStatus } from './types'

export type DeclarationStatus = 'Pending Event Admin' | 'Confirmed' | 'Rejected' | 'Escalated to Manning'

export interface GroundCrewDeclaration {
  id: string
  eventId: string
  eventName: string
  assetId?: string
  item: string
  condition: 'Damaged' | 'Missing'
  quantity: number
  description: string
  submittedBy: string
  submittedRole: 'Member' | 'Team Lead' | 'Field Lead' | 'Receiver'
  submittedAt: string
  status: DeclarationStatus
  decisionAt?: string
  decisionBy?: string
  demoLabel?: string
  photoUrl?: string
  noPhotographicEvidence?: boolean
  isOfflineQueued?: boolean
  idempotencyKey?: string
  // Forensic capture fields (neutral evidence display without claiming verified validity)
  sha256Hash?: string
  exifMetadata?: string
  gpsCoordinates?: string

  // Authoritative HAVA fields
  declarationState?: HavaDeclarationState
  evidenceStatus?: HavaEvidenceStatus | string
  isTemporallyValid?: boolean
  reviewDeadlineAt?: string
  version?: number
  isEditable?: boolean
  finalizedAt?: string
  lastEditedAt?: string
  offlineSyncStatus?: 'locally queued' | 'syncing' | 'server accepted' | 'server rejected/conflicted'
  lastError?: string
}

export type SubmitDeclarationResult =
  | { success: true; queuedOffline: false; reportId: string; declaration: GroundCrewDeclaration }
  | { success: true; queuedOffline: true; declaration: GroundCrewDeclaration }
  | { success: false; error: string }

type Listener = () => void
const listeners = new Set<Listener>()
const seededAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
let declarations: GroundCrewDeclaration[] = [
  {
    id: 'decl-expiry-demo',
    eventId: 'e-1',
    eventName: 'La Nuit Dorée — Spring Gala 2026',
    item: 'Gold Chiavari Chairs',
    condition: 'Damaged',
    quantity: 2,
    description: 'Expiry-test declaration seeded beyond the 48-hour confirmation window.',
    submittedBy: 'Field Lead Demo',
    submittedRole: 'Field Lead',
    submittedAt: seededAt,
    status: 'Pending Event Admin',
    demoLabel: '48+ hour expiry test',
    declarationState: 'Finalized',
    evidenceStatus: 'Unverifiable',
    version: 1,
  },
  {
    id: 'decl-event-admin-demo',
    eventId: 'e-1',
    eventName: 'La Nuit Dorée — Spring Gala 2026',
    item: 'Premium Crystal Candelabra',
    condition: 'Damaged',
    quantity: 1,
    description: 'Fresh demo declaration for Event Admin confirmation practice.',
    submittedBy: 'Team Lead Demo',
    submittedRole: 'Team Lead',
    submittedAt: new Date().toISOString(),
    status: 'Pending Event Admin',
    demoLabel: 'Event Admin confirmation demo',
    declarationState: 'Reviewable',
    evidenceStatus: 'Temporally Valid',
    isTemporallyValid: true,
    reviewDeadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    isEditable: true,
    version: 1,
  },
]

function emit() { listeners.forEach((listener) => listener()) }
function isExpired(declaration: GroundCrewDeclaration, now = Date.now()) { return now - new Date(declaration.submittedAt).getTime() >= 48 * 60 * 60 * 1000 }

export function useGroundCrewDeclarations() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener) }, () => declarations, () => declarations)
}

export async function submitGroundCrewDeclaration(
  input: Omit<GroundCrewDeclaration, 'id' | 'status' | 'decisionAt' | 'decisionBy' | 'isOfflineQueued'>,
): Promise<SubmitDeclarationResult> {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Offline: Enqueue to IndexedDB for automatic background replay on reconnect
    try {
      const { enqueueDeclaration } = await import('./offlineQueue')
      const queued = await enqueueDeclaration({
        eventId: input.eventId,
        eventName: input.eventName,
        assetId: input.assetId || '',
        itemName: input.item,
        condition: input.condition,
        quantity: input.quantity,
        description: input.description,
        submittedBy: input.submittedBy,
        photoUrl: input.photoUrl,
        sha256Hash: input.sha256Hash,
        exifMetadata: input.exifMetadata,
        gpsCoordinates: input.gpsCoordinates,
        noPhotographicEvidence: input.noPhotographicEvidence,
      })

      const queuedDecl: GroundCrewDeclaration = {
        ...input,
        id: queued.id,
        status: 'Pending Event Admin',
        isOfflineQueued: true,
        offlineSyncStatus: 'locally queued',
        declarationState: 'Reviewable',
        evidenceStatus: input.noPhotographicEvidence ? 'No Photographic Evidence' : 'Unverifiable',
        version: 1,
      }
      declarations = [queuedDecl, ...declarations]
      emit()
      return { success: true, queuedOffline: true, declaration: queuedDecl }
    } catch (err: any) {
      console.warn('[ground-crew-declarations] Failed to enqueue offline declaration:', err)
      return { success: false, error: err?.message || 'Failed to enqueue offline condition report.' }
    }
  }

  // Online: Submit to authoritative backend REST API
  try {
    const { submitDamageReportApi } = await import('./damageApi')
    const res = await submitDamageReportApi({
      assetId: input.assetId || '',
      eventId: input.eventId,
      damagedQuantity: input.quantity,
      noPhotographicEvidence: input.noPhotographicEvidence ?? (input.condition !== 'Damaged' || !input.photoUrl),
      photoUrl: input.photoUrl || '',
      sha256Hash: input.sha256Hash || '',
      exifMetadata: input.exifMetadata,
      gpsCoordinates: input.gpsCoordinates,
      severity: input.condition === 'Damaged' ? 'Critical' : 'Minor',
      idempotencyKey: input.idempotencyKey,
    })

    if (res.kind === 'created' || res.kind === 'replayed') {
      const persistedDecl: GroundCrewDeclaration = {
        ...input,
        id: res.report.id,
        status: 'Pending Event Admin',
        isOfflineQueued: false,
        offlineSyncStatus: 'server accepted',
        declarationState: res.report.declarationState,
        evidenceStatus: res.report.evidenceStatus,
        isTemporallyValid: res.report.isTemporallyValid,
        reviewDeadlineAt: res.report.reviewDeadlineAt,
        version: res.report.version,
        isEditable: res.report.isEditable,
      }
      declarations = [persistedDecl, ...declarations]
      emit()
      return {
        success: true,
        queuedOffline: false,
        reportId: res.report.id,
        declaration: persistedDecl,
      }
    }

    // Explicit error from server: Never create optimistic success record
    return {
      success: false,
      error: res.message || 'Damage report rejected by server.',
    }
  } catch (err: any) {
    console.warn('[ground-crew-declarations] Backend damage report submit error:', err)
    return {
      success: false,
      error: err?.message || 'Network error submitting damage report to server.',
    }
  }
}

/**
 * Edit an existing declaration during the authoritative Declaration Review Window.
 */
export async function updateGroundCrewDeclaration(
  id: string,
  updates: {
    quantity: number
    description?: string
    condition?: 'Damaged' | 'Missing'
    photoUrl?: string
    sha256Hash?: string
    gpsCoordinates?: string
    expectedVersion: number
  },
): Promise<{ success: boolean; declaration?: GroundCrewDeclaration; error?: string; code?: string }> {
  try {
    const { editDamageReportApi } = await import('./damageApi')
    const res = await editDamageReportApi(id, {
      damagedQuantity: updates.quantity,
      photoUrl: updates.photoUrl,
      severity: updates.condition === 'Damaged' ? 'Critical' : 'Minor',
      sha256Hash: updates.sha256Hash,
      gpsCoordinates: updates.gpsCoordinates,
      expectedVersion: updates.expectedVersion,
    })

    if (res.kind === 'success') {
      const prev = declarations.find((d) => d.id === id)
      const updated: GroundCrewDeclaration = {
        ...(prev || {
          id,
          eventId: '',
          eventName: '',
          item: '',
          condition: updates.condition ?? 'Damaged',
          quantity: updates.quantity,
          description: updates.description ?? '',
          submittedBy: '',
          submittedRole: 'Member',
          submittedAt: new Date().toISOString(),
          status: 'Pending Event Admin',
        }),
        quantity: res.report.damagedQuantity ?? updates.quantity,
        description: updates.description ?? (prev ? prev.description : ''),
        condition: updates.condition ?? (prev ? prev.condition : 'Damaged'),
        photoUrl: res.report.photoUrl || prev?.photoUrl,
        declarationState: res.report.declarationState,
        evidenceStatus: res.report.evidenceStatus,
        isTemporallyValid: res.report.isTemporallyValid,
        reviewDeadlineAt: res.report.reviewDeadlineAt,
        version: res.report.version,
        isEditable: res.report.isEditable,
        lastEditedAt: res.report.lastEditedAt,
      }
      declarations = declarations.map((d) => (d.id === id ? updated : d))
      emit()
      return { success: true, declaration: updated }
    }

    if (res.kind === 'finalized') {
      // Transition local state to finalized
      declarations = declarations.map((d) =>
        d.id === id ? { ...d, declarationState: 'Finalized', isEditable: false } : d,
      )
      emit()
      return { success: false, error: res.message, code: 'DECLARATION_FINALIZED' }
    }

    if (res.kind === 'stale_version') {
      return { success: false, error: res.message, code: 'STALE_VERSION' }
    }

    return { success: false, error: res.message }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error updating declaration' }
  }
}


export function decideGroundCrewDeclaration(id: string, decision: 'Confirmed' | 'Rejected', decisionBy: string) {
  declarations = declarations.map((declaration) => declaration.id === id ? { ...declaration, status: decision, decisionAt: new Date().toISOString(), decisionBy } : declaration)
  emit()
}

export function getManningFallbackDeclarations(now = Date.now()) {
  return declarations.filter((declaration) => declaration.status === 'Escalated to Manning' && isExpired(declaration, now))
}

export function getDeclarationSla(declaration: GroundCrewDeclaration, now = Date.now()) {
  return Math.max(0, 48 * 60 * 60 * 1000 - (now - new Date(declaration.submittedAt).getTime()))
}

export function reconcileExpiredDeclarations(now = Date.now()) {
  const next = declarations.map((declaration) => declaration.status === 'Pending Event Admin' && isExpired(declaration, now) ? { ...declaration, status: 'Escalated to Manning' as const } : declaration)
  if (next.some((declaration, index) => declaration.status !== declarations[index].status)) { declarations = next; emit() }
  return declarations
}

export function getGroundCrewDeclarationsSnapshot() { return declarations }
export function subscribeGroundCrewDeclarations(listener: Listener) { listeners.add(listener); return () => listeners.delete(listener) }

export function getDeclarationAging(submittedAt: string, now = Date.now()) {
  const elapsedHours = Math.max(0, Math.floor((now - new Date(submittedAt).getTime()) / 3_600_000))
  const remainingHours = Math.max(0, 48 - elapsedHours)
  return { elapsedHours, remainingHours, approaching: remainingHours > 0 && remainingHours <= 12 }
}

export function formatDeclarationAge(submittedAt: string) {
  const { elapsedHours, remainingHours } = getDeclarationAging(submittedAt)
  return elapsedHours >= 48 ? `${elapsedHours}h overdue` : `${remainingHours}h remaining`
}

export function getApproachingDeclarations(eventId?: string, now = Date.now()) {
  return declarations.filter((declaration) => {
    if (declaration.status !== 'Pending Event Admin') return false
    if (eventId && declaration.eventId !== eventId) return false
    const { approaching } = getDeclarationAging(declaration.submittedAt, now)
    return approaching
  })
}

export function getApproachingDeclarationsSummary(now = Date.now()) {
  const approaching = declarations.filter((d) => d.status === 'Pending Event Admin' && getDeclarationAging(d.submittedAt, now).approaching)
  const eventIds = new Set(approaching.map((d) => d.eventId))
  return {
    totalApproaching: approaching.length,
    eventsCount: eventIds.size,
  }
}
