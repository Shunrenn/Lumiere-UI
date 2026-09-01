import { useSyncExternalStore } from 'react'

export type DeclarationStatus = 'Pending Event Admin' | 'Confirmed' | 'Rejected' | 'Escalated to Manning'

export interface GroundCrewDeclaration {
  id: string
  eventId: string
  eventName: string
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
}

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

export function submitGroundCrewDeclaration(input: Omit<GroundCrewDeclaration, 'id' | 'status' | 'decisionAt' | 'decisionBy'>) {
  declarations = [{ ...input, id: `decl-${Date.now()}`, status: 'Pending Event Admin' }, ...declarations]
  emit()
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
