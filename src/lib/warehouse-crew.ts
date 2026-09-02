// Deterministic seed + derivation layer for Manpower & Crew.
// Event Schedule rows are derived from the live staff roster + event list
// (mirroring the Crew Roster page's shape); Daily-Weekly Ops is a separate,
// non-event-bound shift grid for warehouse staffing that exists independent
// of any specific event.
import { useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import type { PortalEvent, Staff } from '@/lib/types'
import { expandDateRange } from '@/lib/manning'

export type CrewRowStatus = 'Available' | 'Assigned' | 'On Leave'

export type DutyCategory = 'Field' | 'Warehouse' | 'Production'

export type WarehouseZone =
  | 'Logistics & Movement'
  | 'Artificials Inventory'
  | 'Centerpieces Inventory'
  | 'Drapery & Fabrics'
  | 'Lighting & Rigging'
  | 'Staging & Hardware'

export interface DailyDutyAssignment {
  id: string
  date: string                      // ISO date string e.g. "2026-09-02"
  staffId: string
  staffName: string
  dutyCategory: 'Warehouse' | 'Production'
  zone?: WarehouseZone
  isTeamLeadToday: boolean          // Daily Duty Team Lead designation
  assignedBy?: string
  assignedAt?: string
  attendanceStatus?: 'present' | 'absent_approved' | 'no_show'
  flaggedBy?: string
  flaggedAt?: string
  noShowReason?: string
}

export function updateDailyDutyAttendance(
  id: string,
  attendanceStatus: 'present' | 'absent_approved' | 'no_show',
  flaggedBy?: string,
  noShowReason?: string,
): void {
  localDailyDuties = localDailyDuties.map((d) => {
    if (d.id !== id) return d
    if (attendanceStatus === 'no_show') {
      return {
        ...d,
        attendanceStatus: 'no_show',
        flaggedBy: flaggedBy || 'Manning Officer',
        flaggedAt: new Date().toISOString(),
        noShowReason: noShowReason || '',
      }
    }
    return {
      ...d,
      attendanceStatus,
      flaggedBy: undefined,
      flaggedAt: undefined,
      noShowReason: undefined,
    }
  })
}

export function removeDailyDutyAssignment(id: string): void {
  localDailyDuties = localDailyDuties.filter((d) => d.id !== id)
}

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
  department?: DutyCategory
  assignedZone?: WarehouseZone
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
  defaultTask?: string
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

// ─── Daily Duty Local Store & Handlers ───
let localDailyDuties: DailyDutyAssignment[] = [
  {
    id: 'duty-preset-1',
    date: '2026-08-20',
    staffId: 's-8',
    staffName: 'David Thompson',
    dutyCategory: 'Warehouse',
    zone: 'Logistics & Movement',
    isTeamLeadToday: true,
    assignedBy: 'Preset Example',
    assignedAt: '2026-08-20T08:00:00.000Z',
  },
  {
    id: 'duty-preset-2',
    date: '2026-08-20',
    staffId: 's-14',
    staffName: 'Amara Okafor',
    dutyCategory: 'Production',
    isTeamLeadToday: false,
    assignedBy: 'Preset Example',
    assignedAt: '2026-08-20T08:00:00.000Z',
  },
]

export function getDailyDutyAssignments(date?: string): DailyDutyAssignment[] {
  if (!date) return localDailyDuties
  return localDailyDuties.filter((d) => d.date === date)
}

export function assignDailyDuty(duty: Omit<DailyDutyAssignment, 'id' | 'assignedAt'>): DailyDutyAssignment {
  const newDuty: DailyDutyAssignment = {
    id: `duty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    assignedAt: new Date().toISOString(),
    ...duty,
  }
  localDailyDuties = [newDuty, ...localDailyDuties.filter((d) => !(d.staffId === duty.staffId && d.date === duty.date))]
  return newDuty
}


export function isTeamLeadToday(staffId: string, date?: string): boolean {
  if (!date) return false
  const assignment = localDailyDuties.find((d) => d.staffId === staffId && d.date === date)
  return Boolean(assignment?.isTeamLeadToday)
}

// ─── Symmetric Hard-Block Conflict Helper ───
export interface SymmetricConflictResult {
  hasConflict: boolean
  conflictType?: 'Field Crew' | 'Daily Duty'
  details?: string
  conflictingEventTitle?: string
  conflictingDutyLabel?: string
}

export function checkSymmetricConflict(
  staffId: string,
  targetDate: string,
  targetCategory: DutyCategory,
  activeFieldAssignments: { staff_id?: string; member_names?: string[]; work_date: string; end_date?: string | null; event_name: string }[] = [],
): SymmetricConflictResult {
  if (targetCategory === 'Warehouse' || targetCategory === 'Production') {
    const fieldConflict = activeFieldAssignments.find((assignment) => {
      const dates = expandDateRange(assignment.work_date, assignment.end_date)
      const isAssigned =
        (assignment.staff_id && assignment.staff_id === staffId) ||
        (assignment.member_names && assignment.member_names.some((name) => name.toLowerCase().includes(staffId.toLowerCase())))
      return isAssigned && dates.includes(targetDate)
    })

    if (fieldConflict) {
      return {
        hasConflict: true,
        conflictType: 'Field Crew',
        details: `Assigned as Field Crew on ${fieldConflict.event_name} (${targetDate})`,
        conflictingEventTitle: fieldConflict.event_name,
      }
    }
  }

  if (targetCategory === 'Field') {
    const dailyDuty = localDailyDuties.find((d) => d.staffId === staffId && d.date === targetDate)
    if (dailyDuty) {
      const dutyLabel = dailyDuty.dutyCategory === 'Warehouse' ? `Warehouse (${dailyDuty.zone || 'General'})` : 'Production'
      return {
        hasConflict: true,
        conflictType: 'Daily Duty',
        details: `Assigned to ${dutyLabel} on ${targetDate}`,
        conflictingDutyLabel: dutyLabel,
      }
    }
  }

  return { hasConflict: false }
}

export function getCrewPool(staff: Staff[]) {
  return staff.filter((member) => member.role === 'Field & Production Crew')
}

let cache: { key: string; rows: CrewRow[] } | null = null

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

let localPresetSquads: PresetSquad[] = []

export function getDefaultPresetSquads(staff: Staff[]): PresetSquad[] {
  const pool = getCrewPool(staff)
  if (pool.length === 0) return []
  const squadConfigs = [
    { name: 'Team A', task: 'Setup & Staging' },
    { name: 'Team B', task: 'AV & Lighting' },
    { name: 'Team C', task: 'Logistics & Loading' },
  ]
  return squadConfigs.map((cfg, squadIndex) => {
    const size = Math.min(4, Math.max(2, Math.floor(pool.length / squadConfigs.length)))
    const memberIds = Array.from({ length: size }, (_, i) => {
      const idx = (squadIndex * size + i) % pool.length
      return pool[idx].id
    })
    return {
      id: `squad-${squadIndex}`,
      name: cfg.name,
      defaultTask: cfg.task,
      memberIds: Array.from(new Set(memberIds)),
    }
  })
}

export function getPresetSquads(staff: Staff[]): PresetSquad[] {
  if (localPresetSquads.length > 0) return localPresetSquads
  localPresetSquads = getDefaultPresetSquads(staff)
  return localPresetSquads
}

export async function fetchPresetSquads(staff: Staff[]): Promise<PresetSquad[]> {
  try {
    const { data, error } = await supabase
      .from('manning_preset_squads')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      localPresetSquads = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        memberIds: d.member_ids || [],
        defaultTask: d.default_task || 'Setup & Staging',
      }))
      return localPresetSquads
    }
  } catch (e) {
    console.warn('[v0] Supabase preset squads unavailable; using local cache/defaults.', e)
  }

  return getPresetSquads(staff)
}

export async function savePresetSquad(squad: PresetSquad): Promise<PresetSquad> {
  try {
    const payload = {
      id: squad.id,
      name: squad.name,
      member_ids: squad.memberIds,
      default_task: squad.defaultTask || 'Setup & Staging',
    }
    await supabase.from('manning_preset_squads').upsert(payload)
  } catch (e) {
    console.warn('[v0] Failed to save preset squad to Supabase; using local store.', e)
  }

  const idx = localPresetSquads.findIndex((s) => s.id === squad.id)
  if (idx >= 0) {
    localPresetSquads[idx] = squad
  } else {
    localPresetSquads.push(squad)
  }
  return squad
}

export async function deletePresetSquad(squadId: string): Promise<void> {
  try {
    await supabase.from('manning_preset_squads').delete().eq('id', squadId)
  } catch (e) {
    console.warn('[v0] Failed to delete preset squad from Supabase; using local store.', e)
  }
  localPresetSquads = localPresetSquads.filter((s) => s.id !== squadId)
}

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
  date?: string,
): boolean {
  if (!row) return false

  // Tier 1: Check Daily Duty Team Lead designation if date is provided
  if (date && isTeamLeadToday(row.staffId, date)) {
    return true
  }

  // Tier 2: Static Role & Declaration Fallback
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
    if (ageMs > 7 * 24 * 60 * 60 * 1000) return false
    return (
      (staffMember && d.submittedBy.toLowerCase().includes(staffMember.surname.toLowerCase())) ||
      d.submittedBy.toLowerCase().includes(row.name.toLowerCase())
    )
  })

  return Boolean(recentDecl)
}

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

export function batchUpdateShifts(updates: Record<string, ShiftCode>) {
  grid = { ...grid, ...updates }
  publish()
}
