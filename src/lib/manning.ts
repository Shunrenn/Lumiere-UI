import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isTeamLead, isTeamLeadToday, QUALIFIED_LEAD_ROLES } from '@/lib/warehouse-crew'
import { removeManningApi, removeManningOverrideApi } from './manningApi'

// =====================================================================
// Manning delegation data access
// (WOM / Manning designated modules). All persistence is Supabase.
// =====================================================================

// ---- Types -----------------------------------------------------------
// These deterministic records keep the workspace usable when a connected
// account has not yet provisioned the Manning tables. They are explicitly
// marked as preset data in the UI and are never mixed into successful live
// responses.
export const MANNING_PRESET_MODE = 'preset' as const


export type ManningTaskStatus =
  | 'Assigned'
  | 'In Progress'
  | 'Submitted'
  | 'Confirmed'
  | 'Escalated'
  | 'Rejected'


export interface ManningAssignment {
  id: string
  work_date: string
  event_name: string
  venue: string | null
  deployment_ref: string | null
  lead_name: string
  lead_email: string | null
  member_names: string[]
  sub_role: string | null
  inherited_from: string | null
  notes: string | null
  status: 'Active' | 'Closed'
  is_override?: boolean
  isOverride?: boolean
  executionStatus?: 'Assigned' | 'InProgress' | 'Completed' | 'Blocked' | string
  startedAt?: string | null
  completedAt?: string | null
  executionUpdatedAt?: string | null
  blockerReason?: string | null
  executionNotes?: string | null
  taskTitle?: string | null
  workArea?: string | null
  created_by: string | null
  created_at: string
}

export interface ManningTask {
  id: string
  title: string
  description: string | null
  task_type: 'personal' | 'generic'
  assignee_name: string | null
  assignee_email: string | null
  lead_name: string
  assignment_id: string | null
  work_date: string
  deadline: string | null
  status: ManningTaskStatus
  submitted_at: string | null
  sla_due: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  escalated: boolean
  escalated_at: string | null
  created_by: string | null
  created_at: string
}

export interface ManningWarning {
  id: string
  subject_name: string
  subject_email: string | null
  tier: 1 | 2 | 3
  reason: string
  related_task_id: string | null
  issued_by: string | null
  issued_at: string
  acknowledged: boolean
  acknowledged_at: string | null
}


let localAssignments: ManningAssignment[] = []
let localTasks: ManningTask[] = []

function assignmentIdentity(assignment: ManningAssignment): string {
  return `${assignment.work_date}|${assignment.event_name}|${assignment.venue ?? ''}|${assignment.deployment_ref ?? ''}`
}

function dedupeActiveAssignments(assignments: ManningAssignment[]): ManningAssignment[] {
  const seen = new Set<string>()
  return assignments.filter((assignment) => {
    if (assignment.status !== 'Active') return true
    const identity = assignmentIdentity(assignment)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}
let localWarnings: ManningWarning[] = []

// ---- Task helpers -----------------------------------------------------

/** Expand a date or start/end date range into discrete YYYY-MM-DD calendar date strings. */
export function expandDateRange(startDate: string, endDate?: string | null): string[] {
  if (!startDate) return []
  const start = new Date(`${startDate}T00:00:00`)
  if (isNaN(start.getTime())) return [startDate]
  if (!endDate || startDate === endDate) return [startDate]

  const end = new Date(`${endDate}T00:00:00`)
  if (isNaN(end.getTime()) || end.getTime() < start.getTime()) return [startDate]

  const dates: string[] = []
  const current = new Date(start)
  while (current.getTime() <= end.getTime()) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/** Whether a submitted task has exceeded its confirmation window. */
export function isSlaOverdue(task: ManningTask, now: Date = new Date()): boolean {
  if (task.status !== 'Submitted' || !task.sla_due) return false
  return new Date(task.sla_due).getTime() < now.getTime()
}

/** Milliseconds remaining until deadline. */
export function slaRemainingMs(task: ManningTask, now: Date = new Date()): number | null {
  if (task.status !== 'Submitted' || !task.sla_due) return null
  return new Date(task.sla_due).getTime() - now.getTime()
}

export function getApproachingSlaCount(tasks: ManningTask[], now: Date = new Date(), windowMs = 12 * 60 * 60 * 1000): number {
  return tasks.filter((task) => {
    const remaining = slaRemainingMs(task, now)
    return remaining !== null && remaining > 0 && remaining <= windowMs
  }).length
}

export function formatSlaCountdown(ms: number): string {
  const overdue = ms < 0
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3_600_000)
  const mins = Math.floor((abs % 3_600_000) / 60_000)
  const label = hours >= 1 ? `${hours}h ${mins}m` : `${mins}m`
  return overdue ? `${label} overdue` : `${label} left`
}

// ---- Assignments -----------------------------------------------------

export async function fetchAssignments(): Promise<ManningAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('manning_assignments')
      .select('*')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    localAssignments = dedupeActiveAssignments((data ?? []) as ManningAssignment[])
    return localAssignments
  } catch (error) {
    console.warn('[manning] Manning assignments unavailable:', error)
    throw error
  }
}

export async function createAssignment(
  input: Pick<
    ManningAssignment,
    'work_date' | 'event_name' | 'venue' | 'deployment_ref' | 'lead_name' | 'lead_email' | 'member_names' | 'sub_role' | 'notes'
  > & { inherited_from?: string | null; created_by?: string | null },
  quotaConfig?: { maxTeamLeads?: number; minTeamLeads?: number },
): Promise<ManningAssignment> {
  const leadName = input.lead_name?.trim() || ''
  if (!leadName) {
    throw new Error(
      `Cannot finalize assignment: At least 1 active Team Lead must be assigned for sub-role '${input.sub_role || 'General'}' on ${input.work_date}.`,
    )
  }

  // Validate maximum Team Lead quota (Foundation F)
  if (quotaConfig?.maxTeamLeads !== undefined && quotaConfig.maxTeamLeads > 0) {
    const currentActiveLeads = localAssignments.filter(
      (a) =>
        a.status === 'Active' &&
        a.work_date === input.work_date &&
        (input.sub_role ? a.sub_role === input.sub_role : true) &&
        Boolean(a.lead_name?.trim()),
    ).length
    if (currentActiveLeads + 1 > quotaConfig.maxTeamLeads) {
      throw new Error(
        `Cannot finalize assignment: Exceeds maximum Team Lead quota of ${quotaConfig.maxTeamLeads} for sub-role '${input.sub_role || 'General'}' on ${input.work_date}.`,
      )
    }
  }

  // Validate that the assigned lead is genuinely isTeamLead-qualified
  const isQualifiedLead =
    QUALIFIED_LEAD_ROLES.some((role) => leadName.toLowerCase().includes(role.toLowerCase())) ||
    isTeamLeadToday(leadName, input.work_date) ||
    isTeamLead({ id: `lead-${leadName}`, staffId: leadName, name: leadName, role: 'Team Lead', status: 'Available' }, [], [], input.work_date)

  if (!isQualifiedLead) {
    throw new Error(
      `Cannot finalize assignment: Assigned lead '${leadName}' is not a qualified Team Lead for ${input.work_date}.`,
    )
  }

  const now = new Date().toISOString()
  const fallback: ManningAssignment = {
    id: `assignment-${Date.now()}`,
    work_date: input.work_date,
    event_name: input.event_name,
    venue: input.venue,
    deployment_ref: input.deployment_ref,
    lead_name: input.lead_name,
    lead_email: input.lead_email,
    member_names: input.member_names,
    sub_role: input.sub_role,
    inherited_from: input.inherited_from ?? null,
    notes: input.notes,
    status: 'Active',
    created_by: input.created_by ?? null,
    created_at: now,
  }
  localAssignments = dedupeActiveAssignments([fallback, ...localAssignments])
  return fallback
}

/**
 * Roster inheritance: clone an existing assignment's lead + members onto a
 * new work date so a recurring deployment carries its manning forward.
 */
export async function inheritAssignment(
  source: ManningAssignment,
  workDate: string,
  createdBy?: string | null,
  quotaConfig?: { maxTeamLeads?: number; minTeamLeads?: number },
): Promise<ManningAssignment> {
  const existing = localAssignments.find(
    (assignment) =>
      assignment.status === 'Active' &&
      assignment.work_date === workDate &&
      assignment.event_name === source.event_name &&
      assignment.venue === source.venue &&
      assignment.deployment_ref === source.deployment_ref,
  )

  if (existing) return existing

  const carried = {
    work_date: workDate,
    event_name: source.event_name,
    venue: source.venue,
    deployment_ref: source.deployment_ref,
    lead_name: source.lead_name,
    lead_email: source.lead_email,
    member_names: source.member_names,
    sub_role: source.sub_role,
    notes: source.notes,
    inherited_from: source.id,
    created_by: createdBy ?? null,
  } as const

  const { data, error } = await supabase
    .from('manning_assignments')
    .select('*')
    .eq('work_date', workDate)
    .eq('event_name', source.event_name)
    .eq('venue', source.venue)
    .eq('deployment_ref', source.deployment_ref)
    .eq('status', 'Active')
    .order('created_at', { ascending: true })
    .limit(1)

  if (!error && data?.[0]) {
    const assignment = data[0] as ManningAssignment
    localAssignments = [
      assignment,
      ...localAssignments.filter((item) => item.id !== assignment.id),
    ]
    return assignment
  }

  return createAssignment(carried, quotaConfig)
}

export async function closeAssignment(
  id: string,
  quotaConfig?: { minTeamLeads?: number },
  reason: string = 'Routine operational removal',
  isOverride: boolean = false,
): Promise<void> {
  const target = localAssignments.find((a) => a.id === id)
  if (target && target.status === 'Active' && Boolean(target.lead_name?.trim())) {
    const activeLeadsCount = localAssignments.filter(
      (a) =>
        a.status === 'Active' &&
        a.work_date === target.work_date &&
        (target.sub_role ? a.sub_role === target.sub_role : true) &&
        Boolean(a.lead_name?.trim()),
    ).length
    if (
      quotaConfig?.minTeamLeads !== undefined &&
      quotaConfig.minTeamLeads > 0 &&
      activeLeadsCount - 1 < quotaConfig.minTeamLeads
    ) {
      throw new Error(
        `Cannot remove assignment: Operating below minimum Team Lead quota of ${quotaConfig.minTeamLeads} for sub-role '${target.sub_role || 'General'}' on ${target.work_date}.`,
      )
    }
  }

  // Call authoritative backend Manning API for valid backend GUID assignments
  const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
  if (isGuid) {
    const res = isOverride
      ? await removeManningOverrideApi(id, reason)
      : await removeManningApi(id, reason)
    if (!res.success) {
      throw new Error(res.error)
    }
  }

  localAssignments = localAssignments.map((a) => (a.id === id ? { ...a, status: 'Closed' } : a))
}

/**
 * Foundation C — Leave-after-assignment auto-release.
 * When a committed crew member goes on leave / marks a date Unavailable (via Shift Grid 'OFF' or Daily Duty 'absent_approved'),
 * auto-release their assignment slot and emit a structured audit log (and flag Team Lead quota deficit if applicable).
 */
export async function handleCrewLeaveAutoRelease(
  staffId: string,
  staffName: string,
  date: string,
  source: 'Shift Grid' | 'Daily Duty Attendance' = 'Shift Grid',
): Promise<void> {
  const normName = staffName.trim().toLowerCase()
  if (!normName) return

  // Find active assignments matching staffName and target date
  const targetAssignments = localAssignments.filter((assignment) => {
    if (assignment.status !== 'Active') return false
    const matchesDate = assignment.work_date === date
    if (!matchesDate) return false

    const isLead = Boolean(assignment.lead_name && assignment.lead_name.trim().toLowerCase().includes(normName))
    const isMember = Boolean(assignment.member_names && assignment.member_names.some((m) => m.trim().toLowerCase().includes(normName)))
    return isLead || isMember
  })

  if (targetAssignments.length === 0) return

  for (const assignment of targetAssignments) {
    const wasLead = Boolean(assignment.lead_name && assignment.lead_name.trim().toLowerCase().includes(normName))
    const updatedMembers = (assignment.member_names || []).filter((m) => !m.trim().toLowerCase().includes(normName))
    let nextLeadName = assignment.lead_name
    let nextStatus: 'Active' | 'Closed' = 'Active'

    if (wasLead) {
      if (updatedMembers.length > 0) {
        // Promote next member in roster to Lead slot if available
        nextLeadName = updatedMembers[0]
      } else {
        // Sole assigned lead went on leave; release lock completely by setting status to Closed
        nextLeadName = ''
        nextStatus = 'Closed'
      }
    } else if (updatedMembers.length === 0 && (!nextLeadName || nextLeadName.trim().toLowerCase().includes(normName))) {
      nextStatus = 'Closed'
    }

    // Update assignment state in local store
    localAssignments = localAssignments.map((a) => {
      if (a.id !== assignment.id) return a
      const autoNote = `[Auto-released: ${staffName} marked ${source} OFF/Leave on ${date}]`
      return {
        ...a,
        member_names: updatedMembers,
        lead_name: nextLeadName,
        status: nextStatus,
        notes: a.notes ? `${a.notes} | ${autoNote}` : autoNote,
      }
    })

    // Evaluate Team Lead quota deficit (Foundation F minimum quota threshold)
    const subRole = assignment.sub_role || 'General'
    const activeLeadsRemaining = localAssignments.filter(
      (a) =>
        a.status === 'Active' &&
        a.work_date === date &&
        (a.sub_role || 'General') === subRole &&
        Boolean(a.lead_name?.trim()),
    ).length

    const minQuota = 1
    const quotaDeficitTriggered = wasLead && activeLeadsRemaining < minQuota

    // Emit structured audit log
    void logAuditEvent({
      actor_id: 'system-auto-release',
      actor_name: 'Manning System',
      module: 'manning',
      action_type: 'ASSIGNMENT_AUTO_RELEASED',
      target_id: assignment.id,
      target_snapshot: {
        staffId,
        staffName,
        date,
        eventName: assignment.event_name,
        subRole,
        previousLead: assignment.lead_name,
        updatedLead: nextLeadName,
        remainingMembers: updatedMembers,
        status: nextStatus,
        quotaDeficitTriggered,
        minQuota,
        activeLeadsRemaining,
        source,
      },
      reason: `Auto-released assignment lock for '${assignment.event_name}' on ${date} due to crew member ${staffName} declaring leave (${source}).${
        quotaDeficitTriggered
          ? ` URGENT: Active Team Lead headcount (${activeLeadsRemaining}) dropped below minimum quota (${minQuota})!`
          : ''
      }`,
    })
  }
}

// ---- Tasks -----------------------------------------------------------

export async function fetchTasks(): Promise<ManningTask[]> {
  try {
    const { data, error } = await supabase
      .from('manning_tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    localTasks = (data ?? []) as ManningTask[]
    return localTasks
  } catch (error) {
    console.warn('[manning] Manning tasks unavailable:', error)
    return localTasks
  }
}

export async function createTask(
  input: Pick<ManningTask, 'title' | 'lead_name'> &
    Partial<
      Pick<
        ManningTask,
        'description' | 'task_type' | 'assignee_name' | 'assignee_email' | 'assignment_id' | 'work_date' | 'deadline' | 'created_by'
      >
    >,
): Promise<ManningTask> {
  const { data, error } = await supabase
    .from('manning_tasks')
    .insert({ task_type: 'personal', ...input })
    .select('*')
    .single()

  if (!error && data) {
    localTasks = [data as ManningTask, ...localTasks.filter((task) => task.id !== data.id)]
    return data as ManningTask
  }

  // Keep the preview interactive when Supabase was intentionally skipped.
  const now = new Date().toISOString()
  const fallback: ManningTask = {
    id: `preset-task-${Date.now()}`,
    title: input.title,
    description: input.description ?? null,
    task_type: input.task_type ?? 'personal',
    assignee_name: input.assignee_name ?? null,
    assignee_email: input.assignee_email ?? null,
    lead_name: input.lead_name,
    assignment_id: input.assignment_id ?? null,
    work_date: input.work_date ?? now.slice(0, 10),
    deadline: input.deadline ?? null,
    status: 'Assigned',
    submitted_at: null,
    sla_due: null,
    confirmed_at: null,
    confirmed_by: null,
    escalated: false,
    escalated_at: null,
    created_by: input.created_by ?? null,
    created_at: now,
  }
  localTasks = [fallback, ...localTasks]
  console.warn('[manning] Task save unavailable; applied locally.', error)
  return fallback
}

/** Member submits work item. */
export async function submitTask(id: string): Promise<void> {
  const now = new Date()
  const slaDue = new Date(now.getTime() + 48 * 3_600_000)
  const { error } = await supabase
    .from('manning_tasks')
    .update({ status: 'Submitted', submitted_at: now.toISOString(), sla_due: slaDue.toISOString() })
    .eq('id', id)

  if (!error) return

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) =>
      task.id === id
        ? { ...task, status: 'Submitted', submitted_at: now.toISOString(), sla_due: slaDue.toISOString() }
        : task,
    )
    return
  }

  throw error
}

export async function setTaskStatus(id: string, status: ManningTaskStatus): Promise<void> {
  const { error } = await supabase.from('manning_tasks').update({ status }).eq('id', id)
  if (error) throw error
}

/** Lead confirms a submitted task. */
export async function confirmTask(id: string, confirmedBy: string): Promise<void> {
  const existing = localTasks.find((t) => t.id === id)
  if (existing && (existing.status === 'Confirmed' || existing.status === 'Rejected')) {
    if (existing.status === 'Confirmed') {
      // Matching outcome ('Confirmed' === 'Confirmed'): First commit retained, silent no-op (no dispute log needed)
      return
    }
    // Differing outcome ('Confirmed' vs existing 'Rejected'): First-Commit-Wins tie-breaker intercepted write
    await logAuditEvent({
      actor_id: confirmedBy,
      actor_name: confirmedBy,
      module: 'manning',
      action_type: 'DISPUTED_CONFIRMATION',
      target_id: id,
      target_snapshot: {
        firstCommit: {
          actor: existing.confirmed_by || 'First Lead',
          timestamp: existing.confirmed_at || existing.created_at,
          status: existing.status,
        },
        attemptedCommit: {
          actor: confirmedBy,
          timestamp: new Date().toISOString(),
          status: 'Confirmed',
        },
      },
      reason: `Conflicting confirmation attempt by ${confirmedBy} ('Confirmed') intercepted for task '${existing.title}'. First commit by ${existing.confirmed_by || 'First Lead'} ('${existing.status}') retained.`,
    })
    return
  }

  const confirmedAt = new Date().toISOString()
  const { error } = await supabase
    .from('manning_tasks')
    .update({
      status: 'Confirmed',
      confirmed_at: confirmedAt,
      confirmed_by: confirmedBy,
    })
    .eq('id', id)

  if (!error) return

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) =>
      task.id === id
        ? { ...task, status: 'Confirmed', confirmed_at: confirmedAt, confirmed_by: confirmedBy }
        : task,
    )
    return
  }

  throw error
}

export async function rejectTask(id: string, rejectedBy: string = 'Team Lead'): Promise<void> {
  const existing = localTasks.find((t) => t.id === id)
  if (existing && (existing.status === 'Confirmed' || existing.status === 'Rejected')) {
    if (existing.status === 'Rejected') {
      // Matching outcome ('Rejected' === 'Rejected'): First commit retained, silent no-op (no dispute log needed)
      return
    }
    // Differing outcome ('Rejected' vs existing 'Confirmed'): First-Commit-Wins tie-breaker intercepted write
    await logAuditEvent({
      actor_id: rejectedBy,
      actor_name: rejectedBy,
      module: 'manning',
      action_type: 'DISPUTED_CONFIRMATION',
      target_id: id,
      target_snapshot: {
        firstCommit: {
          actor: existing.confirmed_by || 'First Lead',
          timestamp: existing.confirmed_at || existing.created_at,
          status: existing.status,
        },
        attemptedCommit: {
          actor: rejectedBy,
          timestamp: new Date().toISOString(),
          status: 'Rejected',
        },
      },
      reason: `Conflicting confirmation attempt by ${rejectedBy} ('Rejected') intercepted for task '${existing.title}'. First commit by ${existing.confirmed_by || 'First Lead'} ('${existing.status}') retained.`,
    })
    return
  }

  const { error } = await supabase.from('manning_tasks').update({ status: 'Rejected' }).eq('id', id)
  if (!error) return

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) => (task.id === id ? { ...task, status: 'Rejected' } : task))
    return
  }

  throw error
}

/**
 * Task sweep: any Submitted task past its due date is auto-escalated so an
 * unresponsive lead cannot sit on a member's submission.
 */
export async function escalateOverdueTasks(tasks: ManningTask[]): Promise<string[]> {
  const now = new Date()
  const overdue = tasks.filter((t) => isSlaOverdue(t, now))
  if (overdue.length === 0) return []
  const ids = overdue.map((t) => t.id)
  const { error } = await supabase
    .from('manning_tasks')
    .update({ status: 'Escalated', escalated: true, escalated_at: now.toISOString() })
    .in('id', ids)
  if (error) throw error
  return ids
}

// ---- Warnings --------------------------------------------------------

export async function fetchWarnings(): Promise<ManningWarning[]> {
  try {
    const { data, error } = await supabase
      .from('manning_warnings')
      .select('*')
      .order('issued_at', { ascending: false })
    if (error) throw error
    localWarnings = (data ?? []) as ManningWarning[]
    return localWarnings
  } catch (error) {
    console.warn('[manning] Manning warnings unavailable:', error)
    return localWarnings
  }
}

export async function issueWarning(
  input: Pick<ManningWarning, 'subject_name' | 'tier' | 'reason'> &
    Partial<Pick<ManningWarning, 'subject_email' | 'related_task_id' | 'issued_by'>>,
): Promise<ManningWarning> {
  const { data, error } = await supabase
    .from('manning_warnings')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data as ManningWarning
}

/** Next tier for a subject given how many warnings they already hold (caps at 3). */
export function nextWarningTier(existing: ManningWarning[], subjectName: string): 1 | 2 | 3 {
  const count = existing.filter((w) => w.subject_name === subjectName).length
  return Math.min(count + 1, 3) as 1 | 2 | 3
}


// ---- Hook: manning workspace ----------------------------------------

export interface ManningData {
  assignments: ManningAssignment[]
  tasks: ManningTask[]
  warnings: ManningWarning[]
  loading: boolean
  error: string | null
  usingPreset: boolean
  reload: () => Promise<void>
}

const MANNING_LOAD_TIMEOUT_MS = 8_000

async function withManningTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} did not respond. Manning tables may not be provisioned.`)), MANNING_LOAD_TIMEOUT_MS),
    ),
  ])
}

export function useManningData(): ManningData {
  const [assignments, setAssignments] = useState<ManningAssignment[]>([])
  const [tasks, setTasks] = useState<ManningTask[]>([])
  const [warnings, setWarnings] = useState<ManningWarning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingPreset, setUsingPreset] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsingPreset(false)
      const [a, t, w] = await withManningTimeout(
        Promise.all([fetchAssignments(), fetchTasks(), fetchWarnings()]),
        'Manning workspace',
      )
      setAssignments(a)
      setWarnings(w)
      setUsingPreset(false)
      setTasks(t)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Manning data unavailable'
      console.warn('[manning] Failed to load manning data:', err)
      setAssignments([])
      setTasks([])
      setWarnings([])
      setUsingPreset(false)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()

    const handleInvalidation = (e: Event) => {
      const customEvent = e as CustomEvent
      const eventName = customEvent.detail?.eventName
      if (!eventName || eventName === 'ManningUpdated' || eventName === 'OperationInvalidated') {
        void reload()
      }
    }

    window.addEventListener('lumiere:realtime_invalidation', handleInvalidation)
    return () => {
      window.removeEventListener('lumiere:realtime_invalidation', handleInvalidation)
    }
  }, [reload])

  return { assignments, tasks, warnings, loading, error, usingPreset, reload }
}


// ---- Manning Overrides (Supabase + Local Fallback) -------------------

export interface ManningOverride {
  id: string
  staff_id: string
  staff_name: string
  event_id: string
  event_title: string
  conflict_type: 'On Leave' | 'Double Booked'
  justification: string
  overridden_by: string
  created_at: string
}

import { fetchAuditLogs, logAuditEvent, type AuditLogEntry } from '@/lib/audit-logger'

let localOverrides: ManningOverride[] = []

function auditEntryToManningOverride(entry: AuditLogEntry): ManningOverride {
  const snapshot = (entry.target_snapshot as Record<string, any>) || null
  return {
    id: entry.id,
    staff_id: snapshot?.staff_id ?? entry.target_id,
    staff_name: snapshot?.staff_name ?? 'Unknown Staff',
    event_id: snapshot?.event_id ?? 'unknown-event',
    event_title: snapshot?.event_title ?? 'Unknown Event',
    conflict_type: (snapshot?.conflict_type as any) ?? 'Double Booked',
    justification: entry.reason,
    overridden_by: entry.actor_name,
    created_at: entry.created_at,
  }
}

export async function fetchOverrides(): Promise<ManningOverride[]> {
  try {
    const logs = await fetchAuditLogs({ module: 'manning', action_type: 'MANNING_OVERRIDE' })
    if (logs && logs.length > 0) {
      localOverrides = logs.map(auditEntryToManningOverride)
      return localOverrides
    }
  } catch (err) {
    console.warn('[v0] fetchAuditLogs for manning overrides fallback to local cache.', err)
  }
  return localOverrides
}

export async function createOverride(
  input: Omit<ManningOverride, 'id' | 'created_at'>,
): Promise<ManningOverride> {
  const auditEntry = await logAuditEvent({
    actor_id: input.overridden_by || 'wom-001',
    actor_name: input.overridden_by || 'Manning Officer',
    module: 'manning',
    action_type: 'MANNING_OVERRIDE',
    target_id: input.staff_id,
    target_snapshot: (input as unknown) as Record<string, unknown>,
    reason: input.justification,
  })

  const created = auditEntryToManningOverride(auditEntry)
  localOverrides = [created, ...localOverrides]
  return created
}

export function useManningOverrides() {
  const [overrides, setOverrides] = useState<ManningOverride[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOverrides()
      setOverrides(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { overrides, loading, reload }
}

