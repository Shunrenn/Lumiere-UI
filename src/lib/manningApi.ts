import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface ManningRecordDto {
  id: string
  eventId: string
  eventName?: string
  userId: string
  userName?: string
  userEmail?: string
  roleName?: string
  shiftDate?: string
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  notes?: string | null
  isOverride?: boolean
  executionStatus?: 'Assigned' | 'InProgress' | 'Completed' | 'Blocked' | string
  startedAt?: string | null
  completedAt?: string | null
  executionUpdatedAt?: string | null
  blockerReason?: string | null
  executionNotes?: string | null
  taskTitle?: string | null
  workArea?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AssignManningRequestDto {
  eventId: string
  userId: string
  roleName: string
  shiftDate: string
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  notes?: string | null
}

export interface OverrideManningRequestDto {
  eventId: string
  userId: string
  roleName: string
  shiftDate: string
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  notes?: string | null
  justification: string
  expectedConflictingAssignmentIds: string[]
}

export interface RemoveManningRequestDto {
  reason: string
}

export interface ManningRemovalResponseDto {
  assignmentId: string
  removed: boolean
  removedBy: string
  removedAt: string
  reason: string
}

export type AssignManningResult =
  | { success: true; status: 201; data: ManningRecordDto }
  | {
      success: false
      status: 409
      code: 'MANNING_OVERLAP'
      error: string
      conflictingAssignments: ManningRecordDto[]
    }
  | { success: false; status: number; code?: string; error: string }

export type OverrideManningResult =
  | { success: true; status: 201; data: ManningRecordDto }
  | { success: false; status: 409; code: 'MANNING_STALE_STATE'; error: string }
  | { success: false; status: number; code?: string; error: string }

export type RemoveManningResult =
  | { success: true; status: 200; data: ManningRemovalResponseDto }
  | { success: false; status: number; code?: string; error: string }

function getHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function normalizeManningRecord(raw: any): ManningRecordDto {
  return {
    id: raw.id ?? raw.Id ?? '',
    eventId: raw.eventId ?? raw.EventId ?? '',
    eventName: raw.eventName ?? raw.EventName ?? '',
    userId: raw.userId ?? raw.UserId ?? '',
    userName: raw.userName ?? raw.UserName ?? '',
    userEmail: raw.userEmail ?? raw.UserEmail ?? '',
    roleName: raw.roleName ?? raw.RoleName ?? '',
    shiftDate: raw.shiftDate ?? raw.ShiftDate ?? '',
    shiftStartTime: raw.shiftStartTime ?? raw.ShiftStartTime ?? null,
    shiftEndTime: raw.shiftEndTime ?? raw.ShiftEndTime ?? null,
    notes: raw.notes ?? raw.Notes ?? null,
    isOverride: Boolean(raw.isOverride ?? raw.IsOverride ?? false),
    executionStatus: raw.executionStatus ?? raw.ExecutionStatus ?? 'Assigned',
    startedAt: raw.startedAt ?? raw.StartedAt ?? null,
    completedAt: raw.completedAt ?? raw.CompletedAt ?? null,
    executionUpdatedAt: raw.executionUpdatedAt ?? raw.ExecutionUpdatedAt ?? null,
    blockerReason: raw.blockerReason ?? raw.BlockerReason ?? null,
    executionNotes: raw.executionNotes ?? raw.ExecutionNotes ?? null,
    taskTitle: raw.taskTitle ?? raw.TaskTitle ?? null,
    workArea: raw.workArea ?? raw.WorkArea ?? null,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? '',
  }
}

function formatShiftDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString()
  if (dateStr.includes('T')) return dateStr
  return `${dateStr}T00:00:00Z`
}

function formatTimeSpan(timeStr?: string | null): string | null {
  if (!timeStr) return null
  const trimmed = timeStr.trim()
  if (!trimmed) return null
  if (trimmed.length === 5) return `${trimmed}:00`
  return trimmed
}

/**
 * Role-aware UI helpers mirroring authoritative backend permissions.
 */
export function canPerformRoutineAssignment(user: { role?: string; subRole?: string }): boolean {
  if (user.role === 'Admin') return true
  if (user.role === 'Warehouse Manager' || user.role === 'Warehouse Operations Manager') return true
  if (user.subRole === 'Manning Officer') return true
  return false
}

export function canPerformResourceOverride(user: {
  role?: string
  subRole?: string
  fullWarehouseAccess?: boolean
}): boolean {
  if (user.role === 'Admin') return true
  if (user.subRole === 'Manning Officer') return false
  if (user.role === 'Warehouse Manager' || user.role === 'Warehouse Operations Manager') {
    if (user.fullWarehouseAccess || !user.subRole || user.subRole === 'Warehouse Manager') return true
  }
  return false
}

export function canPerformRoutineRemoval(user: { role?: string; subRole?: string }): boolean {
  return canPerformRoutineAssignment(user)
}

export function canPerformOverrideRemoval(user: {
  role?: string
  subRole?: string
  fullWarehouseAccess?: boolean
}): boolean {
  return canPerformResourceOverride(user)
}

/**
 * GET /api/manning/event/{eventId}
 */
export async function fetchManningForEvent(eventId: string): Promise<ManningRecordDto[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/event/${encodeURIComponent(eventId)}`, {
      headers: getHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      console.warn(`[manningApi] GET /api/manning/event/${eventId} returned HTTP ${res.status}`)
      throw new Error(`Failed to fetch manning: HTTP ${res.status}`)
    }
    const data = await res.json()
    return Array.isArray(data) ? data.map(normalizeManningRecord) : []
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[manningApi] GET /api/manning/event/${eventId} failed:`, err)
    throw err
  }
}

/**
 * GET /api/manning/user/{userId}
 */
export async function fetchManningForUser(userId: string): Promise<ManningRecordDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/user/${encodeURIComponent(userId)}`, {
      headers: getHeaders(),
    })
    if (!res.ok) {
      console.warn(`[manningApi] GET /api/manning/user/${userId} returned HTTP ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data.map(normalizeManningRecord) : []
  } catch (err) {
    console.warn(`[manningApi] GET /api/manning/user/${userId} failed:`, err)
    return []
  }
}

/**
 * POST /api/manning/assign
 * Authoritative Routine Assignment.
 * IMPORTANT: Does NOT send isOverride.
 */
export async function assignManningApi(req: AssignManningRequestDto): Promise<AssignManningResult> {
  try {
    const payload = {
      eventId: req.eventId,
      userId: req.userId,
      roleName: req.roleName,
      shiftDate: formatShiftDate(req.shiftDate),
      shiftStartTime: formatTimeSpan(req.shiftStartTime),
      shiftEndTime: formatTimeSpan(req.shiftEndTime),
      notes: req.notes ?? null,
    }

    const res = await fetch(`${API_BASE_URL}/api/manning/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })

    if (res.status === 201) {
      const data = await res.json()
      return { success: true, status: 201, data: normalizeManningRecord(data) }
    }

    if (res.status === 409) {
      const errorBody = await res.json().catch(() => ({}))
      const rawConflicts = errorBody.conflictingAssignments ?? errorBody.ConflictingAssignments ?? []
      const conflictingAssignments = Array.isArray(rawConflicts) ? rawConflicts.map(normalizeManningRecord) : []
      return {
        success: false,
        status: 409,
        code: 'MANNING_OVERLAP',
        error: errorBody.error ?? errorBody.Error ?? 'Crew member has an overlapping shift.',
        conflictingAssignments,
      }
    }

    const errorBody = await res.json().catch(() => ({}))
    return {
      success: false,
      status: res.status,
      error: errorBody.error ?? errorBody.Error ?? `Assignment failed with HTTP ${res.status}`,
    }
  } catch (err: any) {
    console.warn('[manningApi] POST /api/manning/assign failed:', err)
    return {
      success: false,
      status: 0,
      error: err?.message || 'Network error connecting to Manning API',
    }
  }
}

/**
 * POST /api/manning/override
 * Manual Resource Override (WOM / Admin only).
 */
export async function overrideManningApi(req: OverrideManningRequestDto): Promise<OverrideManningResult> {
  try {
    const trimmedJustification = req.justification.trim()
    if (!trimmedJustification) {
      return {
        success: false,
        status: 400,
        error: 'Mandatory operational justification is required for Manual Resource Override.',
      }
    }

    if (!req.expectedConflictingAssignmentIds || req.expectedConflictingAssignmentIds.length === 0) {
      return {
        success: false,
        status: 400,
        error: 'At least one conflicting assignment ID must be specified for override.',
      }
    }

    const payload = {
      eventId: req.eventId,
      userId: req.userId,
      roleName: req.roleName,
      shiftDate: formatShiftDate(req.shiftDate),
      shiftStartTime: formatTimeSpan(req.shiftStartTime),
      shiftEndTime: formatTimeSpan(req.shiftEndTime),
      notes: req.notes ?? null,
      justification: trimmedJustification,
      expectedConflictingAssignmentIds: req.expectedConflictingAssignmentIds,
    }

    const res = await fetch(`${API_BASE_URL}/api/manning/override`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })

    if (res.status === 201) {
      const data = await res.json()
      return { success: true, status: 201, data: normalizeManningRecord(data) }
    }

    if (res.status === 409) {
      const errorBody = await res.json().catch(() => ({}))
      const code = errorBody.code ?? errorBody.Code
      return {
        success: false,
        status: 409,
        code: code === 'MANNING_STALE_STATE' ? 'MANNING_STALE_STATE' : undefined,
        error: errorBody.error ?? errorBody.Error ?? 'Manning conflict state has changed on server.',
      }
    }

    const errorBody = await res.json().catch(() => ({}))
    return {
      success: false,
      status: res.status,
      error: errorBody.error ?? errorBody.Error ?? `Override failed with HTTP ${res.status}`,
    }
  } catch (err: any) {
    console.warn('[manningApi] POST /api/manning/override failed:', err)
    return {
      success: false,
      status: 0,
      error: err?.message || 'Network error connecting to Manning API',
    }
  }
}

/**
 * POST /api/manning/{id}/remove
 * Routine Removal (Manning Officer, WOM, Admin).
 * Cannot remove an override assignment.
 */
export async function removeManningApi(id: string, reason: string): Promise<RemoveManningResult> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    return {
      success: false,
      status: 400,
      error: 'Non-blank removal reason is required.',
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/${encodeURIComponent(id)}/remove`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason: trimmedReason }),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        success: true,
        status: 200,
        data: {
          assignmentId: data.assignmentId ?? data.AssignmentId ?? id,
          removed: Boolean(data.removed ?? data.Removed ?? true),
          removedBy: data.removedBy ?? data.RemovedBy ?? '',
          removedAt: data.removedAt ?? data.RemovedAt ?? new Date().toISOString(),
          reason: data.reason ?? data.Reason ?? trimmedReason,
        },
      }
    }

    const errorBody = await res.json().catch(() => ({}))
    return {
      success: false,
      status: res.status,
      code: res.status === 403 ? 'OVERRIDE_AUTHORITY_REQUIRED' : undefined,
      error: errorBody.error ?? errorBody.Error ?? `Removal failed with HTTP ${res.status}`,
    }
  } catch (err: any) {
    console.warn(`[manningApi] POST /api/manning/${id}/remove failed:`, err)
    return {
      success: false,
      status: 0,
      error: err?.message || 'Network error connecting to Manning API',
    }
  }
}

/**
 * POST /api/manning/{id}/remove-override
 * Privileged Override Removal (WOM, Admin only).
 */
export async function removeManningOverrideApi(id: string, reason: string): Promise<RemoveManningResult> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    return {
      success: false,
      status: 400,
      error: 'Non-blank removal reason is required.',
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/${encodeURIComponent(id)}/remove-override`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason: trimmedReason }),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        success: true,
        status: 200,
        data: {
          assignmentId: data.assignmentId ?? data.AssignmentId ?? id,
          removed: Boolean(data.removed ?? data.Removed ?? true),
          removedBy: data.removedBy ?? data.RemovedBy ?? '',
          removedAt: data.removedAt ?? data.RemovedAt ?? new Date().toISOString(),
          reason: data.reason ?? data.Reason ?? trimmedReason,
        },
      }
    }

    const errorBody = await res.json().catch(() => ({}))
    return {
      success: false,
      status: res.status,
      error: errorBody.error ?? errorBody.Error ?? `Override removal failed with HTTP ${res.status}`,
    }
  } catch (err: any) {
    console.warn(`[manningApi] POST /api/manning/${id}/remove-override failed:`, err)
    return {
      success: false,
      status: 0,
      error: err?.message || 'Network error connecting to Manning API',
    }
  }
}

export interface MyManningAssignmentDto {
  assignmentId: string
  eventId: string
  eventName: string
  shiftDate: string
  shiftStartTime: string | null
  shiftEndTime: string | null
  workArea: string | null
  taskTitle: string
  taskDescription: string | null
  assetId: string | null
  assetName: string | null
  productionTaskId: string | null
  taskPoolId: string | null
  taskPoolName: string | null
  taskPoolItemId: string | null
  manningRequirementId: string | null
  assignedRole: string
  executionStatus?: 'Assigned' | 'InProgress' | 'Completed' | 'Blocked' | string
  startedAt?: string | null
  completedAt?: string | null
  executionUpdatedAt?: string | null
  blockerReason?: string | null
  executionNotes?: string | null
  pendingSync?: boolean
  syncStatus?: 'pending' | 'syncing' | 'confirmed' | 'failed' | 'conflict'
  lastSyncError?: string | null
}

export function normalizeMyAssignmentRecord(raw: any): MyManningAssignmentDto {
  return {
    assignmentId: String(raw.assignmentId ?? raw.AssignmentId ?? ''),
    eventId: String(raw.eventId ?? raw.EventId ?? ''),
    eventName: String(raw.eventName ?? raw.EventName ?? ''),
    shiftDate: String(raw.shiftDate ?? raw.ShiftDate ?? ''),
    shiftStartTime: raw.shiftStartTime ?? raw.ShiftStartTime ?? null,
    shiftEndTime: raw.shiftEndTime ?? raw.ShiftEndTime ?? null,
    workArea: raw.workArea ?? raw.WorkArea ?? null,
    taskTitle: String(raw.taskTitle ?? raw.TaskTitle ?? 'Assigned Task'),
    taskDescription: raw.taskDescription ?? raw.TaskDescription ?? null,
    assetId: raw.assetId ?? raw.AssetId ?? null,
    assetName: raw.assetName ?? raw.AssetName ?? null,
    productionTaskId: raw.productionTaskId ?? raw.ProductionTaskId ?? null,
    taskPoolId: raw.taskPoolId ?? raw.TaskPoolId ?? null,
    taskPoolName: raw.taskPoolName ?? raw.TaskPoolName ?? null,
    taskPoolItemId: raw.taskPoolItemId ?? raw.TaskPoolItemId ?? null,
    manningRequirementId: raw.manningRequirementId ?? raw.ManningRequirementId ?? null,
    assignedRole: String(raw.assignedRole ?? raw.AssignedRole ?? 'Ground Crew'),
    executionStatus: String(raw.executionStatus ?? raw.ExecutionStatus ?? 'Assigned'),
    startedAt: raw.startedAt ?? raw.StartedAt ?? null,
    completedAt: raw.completedAt ?? raw.CompletedAt ?? null,
    executionUpdatedAt: raw.executionUpdatedAt ?? raw.ExecutionUpdatedAt ?? null,
    blockerReason: raw.blockerReason ?? raw.BlockerReason ?? null,
    executionNotes: raw.executionNotes ?? raw.ExecutionNotes ?? null,
  }
}

/**
 * GET /api/manning/my-assignments
 * Retrieves the authenticated Ground Crew / Staff member's assigned operational tasks.
 */
export async function fetchMyManningAssignments(): Promise<MyManningAssignmentDto[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/my-assignments`, {
      headers: getHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.status === 401) {
      return []
    }

    if (!res.ok) {
      console.warn(`[manningApi] GET /api/manning/my-assignments returned HTTP ${res.status}`)
      throw new Error(`Failed to load assignments: HTTP ${res.status}`)
    }

    const data = await res.json()
    return Array.isArray(data) ? data.map(normalizeMyAssignmentRecord) : []
  } catch (err: any) {
    clearTimeout(timeoutId)
    console.warn('[manningApi] GET /api/manning/my-assignments failed:', err)
    throw err
  }
}

export interface UpdateExecutionStatusRequestDto {
  status: 'InProgress' | 'Completed' | 'Blocked'
  blockerReason?: string | null
  notes?: string | null
}

export type UpdateExecutionStatusResult =
  | { success: true; status: 200; data: MyManningAssignmentDto }
  | { success: false; status: number; error: string }

export interface OverrideAssignmentRequestDto {
  newUserId: string
  justification: string
}

export type OverrideAssignmentResult =
  | { success: true; status: 200; data: ManningRecordDto }
  | { success: false; status: number; error: string }

/**
 * POST /api/manning/assignments/{assignmentId}/override
 * Manual Resource Override for a specific assignment by WOM/Admin.
 */
export async function overrideAssignmentApi(
  assignmentId: string,
  req: OverrideAssignmentRequestDto,
): Promise<OverrideAssignmentResult> {
  const trimmedJustification = req.justification ? req.justification.trim() : ''
  if (!trimmedJustification) {
    return {
      success: false,
      status: 400,
      error: 'Mandatory justification is required for Manual Resource Override.',
    }
  }

  if (!req.newUserId) {
    return {
      success: false,
      status: 400,
      error: 'Replacement Ground Crew member is required.',
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/assignments/${encodeURIComponent(assignmentId)}/override`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        newUserId: req.newUserId,
        justification: trimmedJustification,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        success: true,
        status: 200,
        data: normalizeManningRecord(data),
      }
    }

    const errorBody = await res.json().catch(() => ({}))
    return {
      success: false,
      status: res.status,
      error: errorBody.error ?? errorBody.Error ?? errorBody.message ?? `Resource override failed with HTTP ${res.status}`,
    }
  } catch (err: any) {
    console.warn(`[manningApi] POST /api/manning/assignments/${assignmentId}/override failed:`, err)
    return {
      success: false,
      status: 0,
      error: err?.message || 'Network error performing resource override',
    }
  }
}

/**
 * POST /api/manning/assignments/{assignmentId}/status
 * Updates the execution status of an authenticated crew assignment.
 */
export async function updateMyAssignmentExecutionStatus(
  assignmentId: string,
  req: UpdateExecutionStatusRequestDto,
): Promise<UpdateExecutionStatusResult> {
  const trimmedBlocker = req.blockerReason ? req.blockerReason.trim() : null
  if (req.status === 'Blocked' && !trimmedBlocker) {
    return {
      success: false,
      status: 400,
      error: 'Blocker reason is required when reporting a blocker.',
    }
  }

  const payload = {
    status: req.status,
    blockerReason: trimmedBlocker,
    notes: req.notes ? req.notes.trim() : null,
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/manning/assignments/${encodeURIComponent(assignmentId)}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        success: true,
        status: 200,
        data: normalizeMyAssignmentRecord(data),
      }
    }

    const errorBody = await res.json().catch(() => ({}))
    return {
      success: false,
      status: res.status,
      error: errorBody.error ?? errorBody.Error ?? errorBody.message ?? `Status update failed with HTTP ${res.status}`,
    }
  } catch (err: any) {
    console.warn(`[manningApi] POST /api/manning/assignments/${assignmentId}/status failed:`, err)
    return {
      success: false,
      status: 0,
      error: err?.message || 'Network error updating assignment execution status',
    }
  }
}
