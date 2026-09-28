import { useSyncExternalStore } from 'react'

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
