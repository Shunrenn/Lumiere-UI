import { useCallback, useEffect, useState } from 'react'
import { isTeamLead, isTeamLeadToday, QUALIFIED_LEAD_ROLES, registerCrewLeaveHandler } from '@/lib/warehouse-crew'
import { expandDateRange } from '@/lib/utils'
import {
  fetchAllManningAssignmentsApi,
  inheritManningAssignmentApi,
  fetchManningTasksApi,
  createManningTaskApi,
  submitManningTaskApi,
  updateManningTaskStatusApi,
  confirmManningTaskApi,
  rejectManningTaskApi,
  escalateManningTasksApi,
  fetchManningWarningsApi,
  createManningWarningApi,
  removeManningApi,
  removeManningOverrideApi,
} from '@/features/manning/api/manningApi'

export { expandDateRange }


// =====================================================================
// Manning delegation data access
// (WOM / Manning designated modules). All persistence is ASP.NET Core REST API.
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
    const data = await fetchAllManningAssignmentsApi()
    const mapped: ManningAssignment[] = data.map((dto) => ({
      id: dto.id,
      work_date: dto.shiftDate ? dto.shiftDate.split('T')[0] : '',
      event_name: dto.eventName || '',
      venue: dto.venue || 'Main Venue',
      deployment_ref: dto.eventName || dto.eventId || '',
      lead_name: dto.userName || '',
      lead_email: dto.userEmail || '',
      member_names: [dto.userName].filter(Boolean),
      sub_role: dto.subRole || dto.roleName || 'General',
      notes: dto.notes ?? null,
      status: 'Active',
      inherited_from: null,
      created_by: null,
      created_at: dto.createdAt || new Date().toISOString(),
    }))
    localAssignments = dedupeActiveAssignments(mapped)
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

  try {
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(source.id)
    if (isGuid) {
      const inheritedDto = await inheritManningAssignmentApi(source.id, workDate, source.notes ?? undefined)
      const mapped: ManningAssignment = {
        id: inheritedDto.id,
        work_date: inheritedDto.shiftDate ? inheritedDto.shiftDate.split('T')[0] : workDate,
        event_name: inheritedDto.eventName || source.event_name,
        venue: inheritedDto.venue || source.venue,
        deployment_ref: source.deployment_ref,
        lead_name: inheritedDto.userName || source.lead_name,
        lead_email: inheritedDto.userEmail || source.lead_email,
        member_names: source.member_names,
        sub_role: inheritedDto.subRole || source.sub_role,
        notes: inheritedDto.notes ?? source.notes,
        status: 'Active',
        inherited_from: source.id,
        created_by: createdBy ?? null,
        created_at: inheritedDto.createdAt || new Date().toISOString(),
      }
      localAssignments = [mapped, ...localAssignments.filter((item) => item.id !== mapped.id)]
      return mapped
    }
  } catch (e) {
    console.warn('[manning] Backend assignment inheritance failed, falling back to local assignment creation:', e)
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

// Wire automatic crew-leave release handler to warehouse-crew daily duty / shift grid
registerCrewLeaveHandler(handleCrewLeaveAutoRelease)

// ---- Tasks -----------------------------------------------------------

export async function fetchTasks(): Promise<ManningTask[]> {
  try {
    const data = await fetchManningTasksApi()
    localTasks = data.map((dto) => ({
      id: dto.id,
      title: dto.title,
      description: dto.description ?? null,
      task_type: (dto.taskType as 'personal' | 'generic') || 'personal',
      assignee_name: dto.assigneeName ?? null,
      assignee_email: dto.assigneeEmail ?? null,
      lead_name: dto.leadName || '',
      assignment_id: dto.assignmentId ?? null,
      work_date: dto.workDate,
      deadline: dto.deadline ?? null,
      status: (dto.status as ManningTaskStatus) || 'Assigned',
      submitted_at: dto.submittedAt ?? null,
      sla_due: dto.slaDueAt ?? null,
      confirmed_at: dto.confirmedAt ?? null,
      confirmed_by: dto.confirmedByName ?? null,
      escalated: dto.escalated,
      escalated_at: dto.escalatedAt ?? null,
      created_by: dto.createdByUserId ?? null,
      created_at: dto.createdAt,
    }))
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
  try {
    const dto = await createManningTaskApi({
      title: input.title,
      description: input.description ?? null,
      taskType: input.task_type ?? 'personal',
      assigneeName: input.assignee_name ?? null,
      assigneeEmail: input.assignee_email ?? null,
      leadName: input.lead_name,
      assignmentId: input.assignment_id ?? null,
      workDate: input.work_date ?? new Date().toISOString().slice(0, 10),
      deadline: input.deadline ?? null,
    })

    const task: ManningTask = {
      id: dto.id,
      title: dto.title,
      description: dto.description ?? null,
      task_type: (dto.taskType as 'personal' | 'generic') || 'personal',
      assignee_name: dto.assigneeName ?? null,
      assignee_email: dto.assigneeEmail ?? null,
      lead_name: dto.leadName || input.lead_name,
      assignment_id: dto.assignmentId ?? null,
      work_date: dto.workDate,
      deadline: dto.deadline ?? null,
      status: (dto.status as ManningTaskStatus) || 'Assigned',
      submitted_at: dto.submittedAt ?? null,
      sla_due: dto.slaDueAt ?? null,
      confirmed_at: dto.confirmedAt ?? null,
      confirmed_by: dto.confirmedByName ?? null,
      escalated: dto.escalated,
      escalated_at: dto.escalatedAt ?? null,
      created_by: dto.createdByUserId ?? null,
      created_at: dto.createdAt,
    }

    localTasks = [task, ...localTasks.filter((t) => t.id !== task.id)]
    return task
  } catch (error) {
    console.warn('[manning] Backend task create failed; fallback applied locally:', error)
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
    return fallback
  }
}

/** Member submits work item. */
export async function submitTask(id: string): Promise<void> {
  const now = new Date()
  const slaDue = new Date(now.getTime() + 48 * 3_600_000)

  try {
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isGuid) {
      await submitManningTaskApi(id)
    }
  } catch (err) {
    console.warn('[manning] Backend submitTask failed, applying locally:', err)
  }

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) =>
      task.id === id
        ? { ...task, status: 'Submitted', submitted_at: now.toISOString(), sla_due: slaDue.toISOString() }
        : task,
    )
  }
}

export async function setTaskStatus(id: string, status: ManningTaskStatus): Promise<void> {
  try {
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isGuid) {
      await updateManningTaskStatusApi(id, status)
    }
  } catch (err) {
    console.warn('[manning] Backend setTaskStatus failed, applying locally:', err)
  }

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) => (task.id === id ? { ...task, status } : task))
  }
}

/** Lead confirms a submitted task. */
export async function confirmTask(id: string, confirmedBy: string): Promise<void> {
  const existing = localTasks.find((t) => t.id === id)
  if (existing && (existing.status === 'Confirmed' || existing.status === 'Rejected')) {
    if (existing.status === 'Confirmed') {
      return
    }
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
  try {
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isGuid) {
      await confirmManningTaskApi(id, confirmedBy)
    }
  } catch (err) {
    console.warn('[manning] Backend confirmTask failed, applying locally:', err)
  }

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) =>
      task.id === id
        ? { ...task, status: 'Confirmed', confirmed_at: confirmedAt, confirmed_by: confirmedBy }
        : task,
    )
  }
}

export async function rejectTask(id: string, rejectedBy: string = 'Team Lead'): Promise<void> {
  const existing = localTasks.find((t) => t.id === id)
  if (existing && (existing.status === 'Confirmed' || existing.status === 'Rejected')) {
    if (existing.status === 'Rejected') {
      return
    }
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

  try {
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isGuid) {
      await rejectManningTaskApi(id, rejectedBy)
    }
  } catch (err) {
    console.warn('[manning] Backend rejectTask failed, applying locally:', err)
  }

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) => (task.id === id ? { ...task, status: 'Rejected' } : task))
  }
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

  try {
    const guidIds = ids.filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    if (guidIds.length > 0) {
      await escalateManningTasksApi(guidIds)
    }
  } catch (err) {
    console.warn('[manning] Backend escalateOverdueTasks failed, applying locally:', err)
  }

  localTasks = localTasks.map((t) =>
    ids.includes(t.id) ? { ...t, status: 'Escalated', escalated: true, escalated_at: now.toISOString() } : t,
  )
  return ids
}

// ---- Warnings --------------------------------------------------------

export async function fetchWarnings(): Promise<ManningWarning[]> {
  try {
    const data = await fetchManningWarningsApi()
    localWarnings = data.map((dto) => ({
      id: dto.id,
      subject_name: dto.subjectName,
      subject_email: dto.subjectEmail ?? null,
      tier: (dto.tier as 1 | 2 | 3) || 1,
      reason: dto.reason,
      related_task_id: dto.relatedTaskId ?? null,
      issued_by: dto.issuedByName || null,
      issued_at: dto.issuedAt,
      acknowledged: Boolean(dto.acknowledgedAt),
      acknowledged_at: dto.acknowledgedAt ?? null,
    }))
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
  const dto = await createManningWarningApi({
    subjectName: input.subject_name,
    subjectEmail: input.subject_email ?? null,
    tier: input.tier,
    reason: input.reason,
    relatedTaskId: input.related_task_id ?? null,
  })

  const warning: ManningWarning = {
    id: dto.id,
    subject_name: dto.subjectName,
    subject_email: dto.subjectEmail ?? null,
    tier: (dto.tier as 1 | 2 | 3) || 1,
    reason: dto.reason,
    related_task_id: dto.relatedTaskId ?? null,
    issued_by: dto.issuedByName || null,
    issued_at: dto.issuedAt,
    acknowledged: Boolean(dto.acknowledgedAt),
    acknowledged_at: dto.acknowledgedAt ?? null,
  }

  localWarnings = [warning, ...localWarnings.filter((w) => w.id !== warning.id)]
  return warning
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


// ---- Manning Overrides (REST API + Local Fallback) -------------------

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

