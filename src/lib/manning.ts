import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// =====================================================================
// Manning & SLA engine + Incident Reporting data access
// (WOM / Manning designated modules). All persistence is Supabase.
// The 48h lead-confirmation SLA is enforced here so both the UI badges
// and the escalation sweep share a single source of truth.
// =====================================================================

export const LEAD_CONFIRM_SLA_HOURS = 48

// ---- Types -----------------------------------------------------------
// These deterministic records keep the workspace usable when a connected
// account has not yet provisioned the Manning tables. They are explicitly
// marked as preset data in the UI and are never mixed into successful live
// responses.
export const MANNING_PRESET_MODE = 'preset' as const

const presetNow = new Date().toISOString()
const presetDue = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()

export type ManningTaskStatus =
  | 'Assigned'
  | 'In Progress'
  | 'Submitted'
  | 'Confirmed'
  | 'Escalated'
  | 'Rejected'

export type IncidentStatus = 'Submitted' | 'Under Review' | 'Resolved' | 'Dismissed'
export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type IncidentCategory =
  | 'General'
  | 'Safety'
  | 'Equipment'
  | 'Personnel'
  | 'Security'
  | 'Logistics'

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

export interface IncidentReport {
  id: string
  reference: string
  title: string
  category: IncidentCategory
  severity: IncidentSeverity
  description: string
  location: string | null
  reported_by_name: string
  reported_by_email: string | null
  occurred_at: string | null
  status: IncidentStatus
  resolution_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  image_url?: string | null
}

const PRESET_ASSIGNMENTS: ManningAssignment[] = [
  {
    id: 'preset-assignment-1',
    work_date: new Date().toISOString().slice(0, 10),
    event_name: 'Louvre Gala Event',
    venue: 'The Grand Ballroom',
    deployment_ref: 'EVT-2026-081',
    lead_name: 'Amara Okafor',
    lead_email: 'amara@example.com',
    member_names: ['Lucia Mendes', 'Noah Williams', 'Sofia Reyes'],
    sub_role: 'Warehouse deployment lead',
    inherited_from: null,
    notes: 'Preset example assignment for workspace preview.',
    status: 'Active',
    created_by: 'Preset Example',
    created_at: presetNow,
  },
  {
    id: 'preset-assignment-2',
    work_date: new Date().toISOString().slice(0, 10),
    event_name: 'Harbor Lights Product Launch',
    venue: 'North Loading Hall',
    deployment_ref: 'EVT-2026-094',
    lead_name: 'Lucia Mendes',
    lead_email: 'lucia@example.com',
    member_names: ['Daniel Price', 'Marcus Chen', 'Aisha Bello', 'Noah Williams'],
    sub_role: 'Outbound logistics lead',
    inherited_from: null,
    notes: 'Coordinate dock access, equipment staging, and final manifest handoff.',
    status: 'Active',
    created_by: 'Preset Example',
    created_at: presetNow,
  },
  {
    id: 'preset-assignment-3',
    work_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    event_name: 'Riverside Exhibition Setup',
    venue: 'East Exhibition Wing',
    deployment_ref: 'EVT-2026-101',
    lead_name: 'Sofia Reyes',
    lead_email: 'sofia@example.com',
    member_names: ['Amara Okafor', 'Elena Rossi', 'Theo Martin'],
    sub_role: 'Venue setup coordinator',
    inherited_from: null,
    notes: 'Pre-stage display hardware and complete the venue handover checklist.',
    status: 'Active',
    created_by: 'Preset Example',
    created_at: presetNow,
  },
]

const PRESET_TASKS: ManningTask[] = [
  {
    id: 'preset-task-1',
    title: 'Confirm outbound equipment manifest',
    description: 'Review the locked manifest and confirm all items are staged.',
    task_type: 'personal',
    assignee_name: 'Lucia Mendes',
    assignee_email: 'lucia@example.com',
    lead_name: 'Amara Okafor',
    assignment_id: 'preset-assignment-1',
    work_date: new Date().toISOString().slice(0, 10),
    deadline: presetDue,
    status: 'Submitted',
    submitted_at: presetNow,
    sla_due: presetDue,
    confirmed_at: null,
    confirmed_by: null,
    escalated: false,
    escalated_at: null,
    created_by: 'Preset Example',
    created_at: presetNow,
  },
  {
    id: 'preset-task-2',
    title: 'Verify dock safety inspection',
    description: 'Complete the dock walk-through and upload the signed safety checklist.',
    task_type: 'generic',
    assignee_name: null,
    assignee_email: null,
    lead_name: 'Lucia Mendes',
    assignment_id: 'preset-assignment-2',
    work_date: new Date().toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    status: 'Assigned',
    submitted_at: null,
    sla_due: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    confirmed_at: null,
    confirmed_by: null,
    escalated: false,
    escalated_at: null,
    created_by: 'Preset Example',
    created_at: presetNow,
  },
  {
    id: 'preset-task-3',
    title: 'Confirm exhibition hardware count',
    description: 'Check the packed display hardware against the transfer manifest before dispatch.',
    task_type: 'personal',
    assignee_name: 'Elena Rossi',
    assignee_email: 'elena@example.com',
    lead_name: 'Sofia Reyes',
    assignment_id: 'preset-assignment-3',
    work_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'In Progress',
    submitted_at: null,
    sla_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    confirmed_at: null,
    confirmed_by: null,
    escalated: false,
    escalated_at: null,
    created_by: 'Preset Example',
    created_at: presetNow,
  },
]

const PRESET_WARNINGS: ManningWarning[] = [
  {
    id: 'preset-warning-1',
    subject_name: 'Daniel Price',
    subject_email: 'daniel@example.com',
    tier: 1,
    reason: 'Dock safety checklist is due before the outbound handoff.',
    related_task_id: 'preset-task-2',
    issued_by: 'Lucia Mendes',
    issued_at: presetNow,
    acknowledged: false,
    acknowledged_at: null,
  },
  {
    id: 'preset-warning-2',
    subject_name: 'Elena Rossi',
    subject_email: 'elena@example.com',
    tier: 2,
    reason: 'Hardware count remains in progress inside the lead-confirmation window.',
    related_task_id: 'preset-task-3',
    issued_by: 'Sofia Reyes',
    issued_at: presetNow,
    acknowledged: false,
    acknowledged_at: null,
  },
]

const PRESET_INCIDENTS: IncidentReport[] = [
  {
    id: 'incident-2026-001',
    reference: 'INC-26001',
    title: 'Forklift contact with outbound staging rack',
    category: 'Safety',
    severity: 'High',
    description: 'During the 06:40 outbound preparation, a forklift clipped the lower guard rail of Rack B-14 while reversing from the loading lane. No injury was reported, but two cases were displaced and the aisle was isolated pending inspection. The operator stopped work, notified the shift lead, and preserved the area for review.',
    location: 'North loading bay · Rack B-14',
    reported_by_name: 'Lucia Mendes',
    reported_by_email: 'lucia.mendes@lumiere.example',
    occurred_at: '2026-08-20T06:40:00.000Z',
    status: 'Submitted',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-08-20T06:54:00.000Z',
    image_url: '/incidents/forklift-rack.png',
  },
  {
    id: 'incident-2026-002',
    reference: 'INC-26002',
    title: 'Cold-chain scanner battery failure',
    category: 'Equipment',
    severity: 'Medium',
    description: 'The handheld scanner assigned to the cold-chain lane shut down during a temperature verification round. The battery indicator had shown 40 percent earlier in the shift. A spare device was issued and the affected pallet checks were repeated manually before release.',
    location: 'Cold-chain lane 2',
    reported_by_name: 'Noah Williams',
    reported_by_email: 'noah.williams@lumiere.example',
    occurred_at: '2026-08-20T08:15:00.000Z',
    status: 'Under Review',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-08-20T08:31:00.000Z',
    image_url: '/incidents/scanner-battery.png',
  },
  {
    id: 'incident-2026-003',
    reference: 'INC-26003',
    title: 'Contractor access badge not returned',
    category: 'Security',
    severity: 'High',
    description: 'A temporary contractor left the site at the end of the evening shift without returning a visitor access badge. Security checked the sign-out desk, vehicle staging area, and supervisor locker. The badge was recovered from the contractor van the following morning and deactivated until reconciliation was complete.',
    location: 'Security desk · East entrance',
    reported_by_name: 'Sofia Reyes',
    reported_by_email: 'sofia.reyes@lumiere.example',
    occurred_at: '2026-08-19T22:10:00.000Z',
    status: 'Resolved',
    resolution_notes: 'Badge recovered and deactivated. Visitor sign-out checklist updated for the evening team.',
    resolved_by: 'Amara Okafor',
    resolved_at: '2026-08-20T07:20:00.000Z',
    created_at: '2026-08-19T22:26:00.000Z',
    image_url: '/incidents/access-badge.png',
  },
  {
    id: 'incident-2026-004',
    reference: 'INC-26004',
    title: 'Two crew members missing from event call sheet',
    category: 'Personnel',
    severity: 'Medium',
    description: 'The 12:00 event call sheet listed two crew members against the wrong deployment zone. The discrepancy was found during the pre-opening roll call and corrected before doors opened. Both crew members received the revised briefing and the printed call sheets were replaced.',
    location: 'Briefing room A',
    reported_by_name: 'Amara Okafor',
    reported_by_email: 'amara.okafor@lumiere.example',
    occurred_at: '2026-08-20T11:45:00.000Z',
    status: 'Submitted',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-08-20T11:58:00.000Z',
    image_url: '/incidents/call-sheet.png',
  },
  {
    id: 'incident-2026-005',
    reference: 'INC-26005',
    title: 'Inbound delivery arrived without seal record',
    category: 'Logistics',
    severity: 'Low',
    description: 'A scheduled inbound delivery arrived with the trailer seal intact, but the seal number was absent from the advance paperwork. Receiving held the load for a secondary count and photographed the seal before breaking it. The count matched the manifest with no variance.',
    location: 'Inbound receiving dock 3',
    reported_by_name: 'Daniel Price',
    reported_by_email: 'daniel.price@lumiere.example',
    occurred_at: '2026-08-20T09:05:00.000Z',
    status: 'Dismissed',
    resolution_notes: 'No stock variance found. Supplier paperwork issue logged for follow-up outside the incident queue.',
    resolved_by: 'Amara Okafor',
    resolved_at: '2026-08-20T10:10:00.000Z',
    created_at: '2026-08-20T09:18:00.000Z',
    image_url: '/incidents/inbound-seal.png',
  },
  {
    id: 'incident-2026-006',
    reference: 'INC-26006',
    title: 'Water ingress near electrical distribution panel',
    category: 'General',
    severity: 'Critical',
    description: 'Water was observed on the floor within two metres of the temporary electrical distribution panel after heavy rain. Power to the affected bay was isolated, the area was cordoned off, and facilities were called to inspect the roof and cable protection. No one entered the cordoned area after isolation.',
    location: 'South warehouse · Bay 7',
    reported_by_name: 'Marcus Chen',
    reported_by_email: 'marcus.chen@lumiere.example',
    occurred_at: '2026-08-20T13:22:00.000Z',
    status: 'Submitted',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-08-20T13:29:00.000Z',
    image_url: '/incidents/water-ingress.png',
  },
]

let localAssignments = [...PRESET_ASSIGNMENTS]
let localTasks = [...PRESET_TASKS]

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
let localWarnings = [...PRESET_WARNINGS]
let localIncidents = [...PRESET_INCIDENTS]
let manningUsingPreset = false
let incidentsUsingPreset = false

// ---- SLA helpers -----------------------------------------------------

/** Whether a submitted task has blown its 48h lead-confirmation window. */
export function isSlaOverdue(task: ManningTask, now: Date = new Date()): boolean {
  if (task.status !== 'Submitted' || !task.sla_due) return false
  return new Date(task.sla_due).getTime() < now.getTime()
}

/** Milliseconds remaining until the SLA window closes (negative if overdue). */
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
    manningUsingPreset = true
    console.warn('[v0] Manning assignments unavailable; using preset example data.', error)
    return localAssignments
  }
}

export async function createAssignment(
  input: Pick<
    ManningAssignment,
    'work_date' | 'event_name' | 'venue' | 'deployment_ref' | 'lead_name' | 'lead_email' | 'member_names' | 'sub_role' | 'notes'
  > & { inherited_from?: string | null; created_by?: string | null },
): Promise<ManningAssignment> {
  const hasLead = Boolean(input.lead_name && input.lead_name.trim().length > 0)
  if (!hasLead) {
    throw new Error(
      `Cannot finalize assignment: At least 1 active Team Lead must be assigned for sub-role '${input.sub_role || 'General'}' on ${input.work_date}.`,
    )
  }

  const { data, error } = await supabase
    .from('manning_assignments')
    .insert(input)
    .select('*')
    .single()
  if (!error && data) {
    localAssignments = dedupeActiveAssignments([data as ManningAssignment, ...localAssignments])
    return data as ManningAssignment
  }

  const now = new Date().toISOString()
  const fallback: ManningAssignment = {
    id: `preset-assignment-${Date.now()}`,
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
  manningUsingPreset = true
  console.warn('[v0] Assignment save unavailable; applied the assignment to preset data.', error)
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

  return createAssignment(carried)
}

export async function closeAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from('manning_assignments')
    .update({ status: 'Closed' })
    .eq('id', id)
  if (error) throw error
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
    manningUsingPreset = true
    console.warn('[v0] Manning tasks unavailable; using preset example data.', error)
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
  manningUsingPreset = true
  console.warn('[v0] Task save unavailable; applied the task to preset data.', error)
  return fallback
}

/** Member submits work — opens the 48h lead-confirmation SLA window. */
export async function submitTask(id: string): Promise<void> {
  const now = new Date()
  const slaDue = new Date(now.getTime() + LEAD_CONFIRM_SLA_HOURS * 3_600_000)
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
    manningUsingPreset = true
    return
  }

  throw error
}

export async function setTaskStatus(id: string, status: ManningTaskStatus): Promise<void> {
  const { error } = await supabase.from('manning_tasks').update({ status }).eq('id', id)
  if (error) throw error
}

/** Lead confirms a submitted task inside the SLA window. */
export async function confirmTask(id: string, confirmedBy: string): Promise<void> {
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
    manningUsingPreset = true
    console.warn('[v0] Confirm update unavailable; applied the change to preset task data.', error)
    return
  }

  throw error
}

export async function rejectTask(id: string): Promise<void> {
  const { error } = await supabase.from('manning_tasks').update({ status: 'Rejected' }).eq('id', id)
  if (!error) return

  if (localTasks.some((task) => task.id === id)) {
    localTasks = localTasks.map((task) => (task.id === id ? { ...task, status: 'Rejected' } : task))
    manningUsingPreset = true
    console.warn('[v0] Reject update unavailable; applied the change to preset task data.', error)
    return
  }

  throw error
}

/**
 * SLA sweep: any Submitted task past its sla_due is auto-escalated so an
 * unresponsive lead cannot silently sit on a member's submission.
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
    manningUsingPreset = true
    console.warn('[v0] Manning warnings unavailable; using preset example data.', error)
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

// ---- Incidents -------------------------------------------------------

export async function fetchIncidents(): Promise<IncidentReport[]> {
  try {
    const { data, error } = await supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    localIncidents = (data ?? []) as IncidentReport[]
    return localIncidents
  } catch (error) {
    incidentsUsingPreset = true
    console.warn('[v0] Incident reports unavailable; using preset example data.', error)
    return localIncidents
  }
}

export async function createIncident(
  input: Pick<IncidentReport, 'title' | 'description' | 'reported_by_name'> &
    Partial<
      Pick<IncidentReport, 'category' | 'severity' | 'location' | 'reported_by_email' | 'occurred_at'>
    >,
): Promise<IncidentReport> {
  const reference = `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  const category: IncidentCategory = input.category ?? 'General'
  const severity: IncidentSeverity = input.severity ?? 'Medium'
  const payload = { ...input, reference, category, severity }
  const { data, error } = await supabase
    .from('incident_reports')
    .insert(payload)
    .select('*')
    .single()
  if (!error && data) {
    localIncidents = [data as IncidentReport, ...localIncidents]
    return data as IncidentReport
  }

  const now = new Date().toISOString()
  const fallback: IncidentReport = {
    id: `preset-incident-${Date.now()}`,
    reference,
    title: payload.title,
    category: payload.category ?? 'General',
    severity: payload.severity ?? 'Medium',
    description: payload.description,
    location: payload.location ?? null,
    reported_by_name: payload.reported_by_name,
    reported_by_email: payload.reported_by_email ?? null,
    occurred_at: payload.occurred_at ?? now,
    status: 'Submitted',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: now,
  }
  localIncidents = [fallback, ...localIncidents]
  incidentsUsingPreset = true
  console.warn('[v0] Incident save unavailable; applied the report to preset data.', error)
  return fallback
}

export async function reviewIncident(id: string): Promise<void> {
  const { error } = await supabase
    .from('incident_reports')
    .update({ status: 'Under Review' })
    .eq('id', id)
  if (!error) return

  const presetIncident = localIncidents.some((incident) => incident.id === id)
  if (presetIncident) {
    localIncidents = localIncidents.map((incident) =>
      incident.id === id ? { ...incident, status: 'Under Review' } : incident,
    )
    incidentsUsingPreset = true
    console.warn('[v0] Review update unavailable; applied the change to preset incident data.', error)
    return
  }

  throw error
}

export async function resolveIncident(
  id: string,
  status: 'Resolved' | 'Dismissed',
  resolutionNotes: string,
  resolvedBy: string,
): Promise<void> {
  const resolvedAt = new Date().toISOString()
  const { error } = await supabase
    .from('incident_reports')
    .update({
      status,
      resolution_notes: resolutionNotes,
      resolved_by: resolvedBy,
      resolved_at: resolvedAt,
    })
    .eq('id', id)
  if (!error) {
    localIncidents = localIncidents.map((incident) =>
      incident.id === id
        ? { ...incident, status, resolution_notes: resolutionNotes, resolved_by: resolvedBy, resolved_at: resolvedAt }
        : incident,
    )
    return
  }

  if (localIncidents.some((incident) => incident.id === id)) {
    localIncidents = localIncidents.map((incident) =>
      incident.id === id
        ? { ...incident, status, resolution_notes: resolutionNotes, resolved_by: resolvedBy, resolved_at: resolvedAt }
        : incident,
    )
    incidentsUsingPreset = true
    console.warn('[v0] Incident resolution unavailable; applied the change to preset data.', error)
    return
  }

  throw error
}

// ---- Settings (incident review PIN) ---------------------------------

export const DEFAULT_WOM_REVIEW_PIN = '246810'

export async function fetchIncidentPin(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('manning_settings')
      .select('incident_pin')
      .eq('id', 1)
      .single()
    if (error) throw error

    const configuredPin = String(data?.incident_pin ?? '').trim()
    return configuredPin || DEFAULT_WOM_REVIEW_PIN
  } catch (error) {
    // The settings table is optional for the preset/demo workspace.
    console.warn('[v0] WOM settings unavailable; using the default review PIN.', error)
    return DEFAULT_WOM_REVIEW_PIN
  }
}

export async function updateIncidentPin(pin: string): Promise<void> {
  const { error } = await supabase
    .from('manning_settings')
    .update({ incident_pin: pin, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
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
      // Run the SLA sweep, then re-pull tasks if anything escalated so the
      // UI reflects auto-escalations immediately.
      let escalated: string[] = []
      try {
        escalated = await escalateOverdueTasks(t)
      } catch (error) {
        console.warn('[v0] Manning SLA sweep unavailable; keeping preset task data.', error)
      }
      setAssignments(a)
      setWarnings(w)
      setUsingPreset(manningUsingPreset)
      setTasks(escalated.length ? await fetchTasks() : manningUsingPreset ? [...localTasks] : t)
    } catch (err) {
      console.warn('[v0] Manning tables unavailable; using preset workspace data.', err)
      setAssignments(localAssignments)
      setTasks(localTasks)
      setWarnings(localWarnings)
      setUsingPreset(true)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { assignments, tasks, warnings, loading, error, usingPreset, reload }
}

// ---- Hook: incidents workspace --------------------------------------

export interface IncidentData {
  incidents: IncidentReport[]
  loading: boolean
  error: string | null
  usingPreset: boolean
  reload: () => Promise<void>
}

export function useIncidentData(): IncidentData {
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingPreset, setUsingPreset] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsingPreset(false)
      setIncidents(await withManningTimeout(fetchIncidents(), 'Incident workspace'))
      setUsingPreset(incidentsUsingPreset)
    } catch (err) {
      console.warn('[v0] Incident tables unavailable; using preset incident data.', err)
      setIncidents(localIncidents)
      setUsingPreset(true)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return { incidents, loading, error, usingPreset, reload }
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

let localOverrides: ManningOverride[] = []

export async function fetchOverrides(): Promise<ManningOverride[]> {
  try {
    const { data, error } = await supabase
      .from('manning_overrides')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    localOverrides = (data ?? []) as ManningOverride[]
    return localOverrides
  } catch (err) {
    console.warn('[v0] manning_overrides table unavailable; using local memory store.', err)
    return localOverrides
  }
}

export async function createOverride(
  input: Omit<ManningOverride, 'id' | 'created_at'>,
): Promise<ManningOverride> {
  const now = new Date().toISOString()
  const id = `override-${Date.now()}`
  const override: ManningOverride = { id, created_at: now, ...input }

  try {
    const { data, error } = await supabase
      .from('manning_overrides')
      .insert(override)
      .select('*')
      .single()
    if (!error && data) {
      localOverrides = [data as ManningOverride, ...localOverrides]
      return data as ManningOverride
    }
  } catch (err) {
    console.warn('[v0] Failed to insert manning_override to Supabase; storing locally.', err)
  }

  localOverrides = [override, ...localOverrides]
  return override
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

