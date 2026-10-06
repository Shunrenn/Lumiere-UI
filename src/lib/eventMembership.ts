/**
 * Frontend prototype membership boundary.
 *
 * A production API should provide membership list, join, leave, and member
 * endpoints, plus project queries already filtered by the authenticated
 * member.  Keeping those details here lets the UI swap to that contract
 * without changing its components.
 *
 * This browser-only implementation is deliberately not authorization. It is
 * persisted per browser profile and is not shared with other devices.
 */

export type MembershipSource = 'self_joined' | 'assigned'

export interface EventMembership {
  eventId: string
  userId: string
  joinedAt: string
  source: MembershipSource
  assignedBy?: string
}

const STORAGE_KEY = 'lumiere-event-planner-memberships'

function read(): EventMembership[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter(isMembership) : []
  } catch {
    return []
  }
}

function isMembership(value: unknown): value is EventMembership {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<EventMembership>
  return typeof record.eventId === 'string' && typeof record.userId === 'string' &&
    typeof record.joinedAt === 'string' && (record.source === 'self_joined' || record.source === 'assigned')
}

function write(memberships: EventMembership[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memberships))
  window.dispatchEvent(new Event('lumiere-event-membership-change'))
}

export function listMembers(eventId: string): EventMembership[] {
  return read().filter((membership) => membership.eventId === eventId)
}

export function isMember(eventId: string, userId: string): boolean {
  return read().some((membership) => membership.eventId === eventId && membership.userId === userId)
}

export function join(eventId: string, userId: string, source: MembershipSource = 'self_joined', assignedBy?: string): EventMembership {
  const existing = read()
  const found = existing.find((membership) => membership.eventId === eventId && membership.userId === userId)
  if (found) return found
  const membership: EventMembership = { eventId, userId, joinedAt: new Date().toISOString(), source, ...(assignedBy ? { assignedBy } : {}) }
  write([...existing, membership])
  return membership
}

export function leave(eventId: string, userId: string) {
  write(read().filter((membership) => membership.eventId !== eventId || membership.userId !== userId))
}

export function getJoinedEventIds(userId: string): string[] {
  return Array.from(new Set(read().filter((membership) => membership.userId === userId).map((membership) => membership.eventId)))
}
