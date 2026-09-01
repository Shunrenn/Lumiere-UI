// Deterministic seed + derivation layer for Manpower & Crew.
// Event Schedule rows are derived from the live staff roster + event list
// (mirroring the Crew Roster page's shape); Daily-Weekly Ops is a separate,
// non-event-bound shift grid for warehouse staffing that exists independent
// of any specific event.
import { useSyncExternalStore } from 'react'
import type { PortalEvent, Staff } from '@/lib/types'

export type CrewRowStatus = 'Available' | 'Assigned' | 'On Leave'

export interface CrewAllocation {
  eventId: string
  event: string
  venue: string
  date: string
  task: string
}

export interface CrewRow {
  id: string
  staffId: string
  name: string
  role: string
  status: CrewRowStatus
  allocation?: CrewAllocation
}

export type ShiftCode = 'AM' | 'PM' | 'OFF'

export interface ShiftCell {
  staffId: string
  date: string
  shift: ShiftCode
}

export interface PresetSquad {
  id: string
  name: string
  memberIds: string[]
}

export type AssignMode = 'fifo' | 'manual' | 'preset'

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7))
}

const FIELD_TASKS = [
  'Load-in & setup',
  'Décor styling',
  'Floral install',
  'Load-out & strike',
  'Vehicle marshaling',
  'Client liaison',
  'Rigging & lighting',
  'Site supervision',
]


export function getCrewPool(staff: Staff[]) {
  return staff.filter((member) => member.role === 'Field & Production Crew')
}

let cache: { key: string; rows: CrewRow[] } | null = null

// Manual overlay — assignments made through the Assign Crew flow this
// session. Layered on top of the deterministic base rows so re-renders
// (and the underlying seed) never wipe out a manager's manual action.
const assignmentListeners = new Set<() => void>()
const overlayStoreKey = '__warehouse_crew_overlay__'
type OverlayGlobal = typeof globalThis & { [overlayStoreKey]?: Record<string, CrewAllocation | 'clear'> }
const overlayGlobal = globalThis as OverlayGlobal
let overlay: Record<string, CrewAllocation | 'clear'> = overlayGlobal[overlayStoreKey] ?? {}

function publishOverlay() {
  overlayGlobal[overlayStoreKey] = overlay
  assignmentListeners.forEach((listener) => listener())
}

export function assignCrewToEvent(staffId: string, allocation: CrewAllocation) {
  overlay = { ...overlay, [staffId]: allocation }
  publishOverlay()
}

export function clearCrewAssignment(staffId: string) {
  overlay = { ...overlay, [staffId]: 'clear' }
  publishOverlay()
}

function applyOverlay(rows: CrewRow[]): CrewRow[] {
  return rows.map((row) => {
    const change = overlay[row.staffId]
    if (!change) return row
    if (change === 'clear') return { ...row, status: 'Available', allocation: undefined }
    return { ...row, status: 'Assigned', allocation: change }
  })
}

export function useCrewRows(staff: Staff[], events: PortalEvent[]): CrewRow[] {
  const base = getCrewRows(staff, events)
  const currentOverlay = useSyncExternalStore(
    (listener) => {
      assignmentListeners.add(listener)
      return () => assignmentListeners.delete(listener)
    },
    () => overlay,
    () => overlay,
  )
  void currentOverlay
  return applyOverlay(base)
}

// Event Schedule — per-event crew assignment view.
export function getCrewRows(staff: Staff[], events: PortalEvent[]): CrewRow[] {
  const key = `${staff.map((s) => s.id).join(',')}|${events.map((e) => e.id).join(',')}`
  if (cache && cache.key === key) return cache.rows

  const pool = getCrewPool(staff)
  const rows: CrewRow[] = pool.map((member, index) => {
    const seed = hashOf(member.id)
    const isOnLeave = seed % 9 === 0
    const isAssigned = !isOnLeave && seed % 3 !== 0 && events.length > 0

    if (isOnLeave) {
      return {
        id: `crew-${member.id}`,
        staffId: member.id,
        name: `${member.firstName} ${member.surname}`,
        role: member.role,
        status: 'On Leave',
      }
    }

    if (isAssigned) {
      const event = events[(seed + index) % events.length]
      return {
        id: `crew-${member.id}`,
        staffId: member.id,
        name: `${member.firstName} ${member.surname}`,
        role: member.role,
        status: 'Assigned',
        allocation: {
          eventId: event.id,
          event: event.title,
          venue: event.venue,
          date: event.targetDate,
          task: FIELD_TASKS[(seed + index * 3) % FIELD_TASKS.length],
        },
      }
    }

    return {
      id: `crew-${member.id}`,
      staffId: member.id,
      name: `${member.firstName} ${member.surname}`,
      role: member.role,
      status: 'Available',
    }
  })

  cache = { key, rows }
  return rows
}

// Preset squads — saved crew groupings for the Assign Crew flow.
export function getPresetSquads(staff: Staff[]): PresetSquad[] {
  const pool = getCrewPool(staff)
  if (pool.length === 0) return []
  const squadNames = ['Team A', 'Team B', 'Team C']
  return squadNames.map((name, squadIndex) => {
    const size = Math.min(4, Math.max(2, Math.floor(pool.length / squadNames.length)))
    const memberIds = Array.from({ length: size }, (_, i) => {
      const idx = (squadIndex * size + i) % pool.length
      return pool[idx].id
    })
    return { id: `squad-${squadIndex}`, name, memberIds: Array.from(new Set(memberIds)) }
  })
}

// A preset member is in conflict if the Event Schedule already has them
// Assigned to a *different* event on the requested date.
export function crewHasConflict(row: CrewRow | undefined, eventId: string): boolean {
  if (!row) return false
  if (row.status === 'On Leave') return true
  if (row.status === 'Assigned' && row.allocation && row.allocation.eventId !== eventId) return true
  return false
}

export const QUALIFIED_LEAD_ROLES = [
  'Event Admin',
  'Warehouse Lead',
  'Team Lead / Field Lead',
  'Field Lead',
  'Team Lead',
  'Site Supervisor',
] as const

export function isTeamLead(
  row: CrewRow | undefined,
  staffList: Staff[] = [],
  declarations: { submittedBy: string; submittedRole: string; submittedAt: string }[] = [],
): boolean {
  if (!row) return false
  const staffMember = staffList.find((s) => s.id === row.staffId)

  // 1. Check explicit staff role (exact match)
  if (staffMember && QUALIFIED_LEAD_ROLES.includes(staffMember.role as any)) {
    return true
  }

  // 2. Check CrewRow role text (exact match against fixed list)
  if (QUALIFIED_LEAD_ROLES.includes(row.role.trim() as any)) {
    return true
  }

  // 3. Check recent Ground Crew Declarations (recency window: <= 7 days)
  const now = Date.now()
  const recentDecl = declarations.find((d) => {
    if (d.submittedRole !== 'Team Lead' && d.submittedRole !== 'Field Lead') return false
    const ageMs = now - new Date(d.submittedAt).getTime()
    if (ageMs > 7 * 24 * 60 * 60 * 1000) return false // Expire declarations older than 7 days
    return (
      (staffMember && d.submittedBy.toLowerCase().includes(staffMember.surname.toLowerCase())) ||
      d.submittedBy.toLowerCase().includes(row.name.toLowerCase())
    )
  })

  return Boolean(recentDecl)
}

// ---------- Daily-Weekly Ops — non-event-bound shift roster grid ----------

export function getOpsWeekDates(weekOffset = 0): string[] {
  const monday = new Date(2026, 1, 2 + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function dayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const listeners = new Set<() => void>()
const shiftStoreKey = '__warehouse_shift_grid__'
type ShiftGlobal = typeof globalThis & { [shiftStoreKey]?: Record<string, ShiftCode> }
const globalStore = globalThis as ShiftGlobal
let grid: Record<string, ShiftCode> = globalStore[shiftStoreKey] ?? {}

function cellKey(staffId: string, date: string) {
  return `${staffId}__${date}`
}

function seedGrid(staff: Staff[], dates: string[]) {
  const pool = getCrewPool(staff)
  pool.forEach((member) => {
    dates.forEach((date) => {
      const key = cellKey(member.id, date)
      if (grid[key]) return
      const seed = hashOf(`${member.id}-${date}`)
      grid[key] = seed % 5 === 0 ? 'OFF' : seed % 2 === 0 ? 'AM' : 'PM'
    })
  })
  globalStore[shiftStoreKey] = grid
}

function publish() {
  globalStore[shiftStoreKey] = grid
  listeners.forEach((listener) => listener())
}

export function useShiftGrid(staff: Staff[], dates: string[]) {
  seedGrid(staff, dates)
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => grid,
    () => grid,
  )
}

export function getShift(staffId: string, date: string): ShiftCode {
  return grid[cellKey(staffId, date)] ?? 'OFF'
}

const CYCLE: ShiftCode[] = ['AM', 'PM', 'OFF']
export function cycleShift(staffId: string, date: string) {
  const key = cellKey(staffId, date)
  const current = grid[key] ?? 'OFF'
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
  grid = { ...grid, [key]: next }
  publish()
}
