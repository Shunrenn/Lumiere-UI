import { API_BASE_URL, getAuthToken } from './apiConfig'

export type CanonicalProductionStatus =
  | 'Pending'
  | 'MaterialsVerified'
  | 'InProgress'
  | 'CompletedAwaitingApproval'
  | 'RejectedRework'
  | 'Approved'
  | 'DispatchReady'
  | 'Cancelled'

export interface MaterialRequirementDto {
  id?: string
  name: string
  quantity: number
  unit: string
  isAvailable?: boolean
  checked?: boolean
}

export interface ProductionTaskResponseDto {
  id: string
  eventId: string
  eventName: string
  taskName: string
  category: string
  targetQuantity: number
  completedQuantity: number
  progressPercentage: number
  startDate: string
  endDate: string
  assignedToUserId?: string
  assignedUserName?: string
  status: CanonicalProductionStatus | string
  materials?: MaterialRequirementDto[]
  materialRequirements?: MaterialRequirementDto[]
  verificationNotes?: string
  rejectionReason?: string
  rejectionNotes?: string
  approvalNotes?: string
  handoffNotes?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface GanttScheduleResponseDto {
  eventId: string
  eventName: string
  timelineStart: string
  timelineEnd: string
  tasks: ProductionTaskResponseDto[]
  overallProgressPercentage: number
}

export interface VerifyMaterialsRequest {
  verificationNotes?: string
  notes?: string
}

export interface UpdateProgressRequest {
  progressPercentage: number
  completedQuantity?: number
  notes?: string
}

export interface ApproveTaskRequest {
  notes?: string
}

export interface RejectTaskRequest {
  reason: string
}

export interface ResumeReworkRequest {
  notes?: string
}

export interface HandoffTaskRequest {
  notes?: string
}

export type ProductionMutationResult<T = ProductionTaskResponseDto> =
  | { success: true; data: T }
  | { success: false; message: string; statusCode?: number; conflict?: boolean; forbidden?: boolean; notFound?: boolean }

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function parseErrorResponse(res: Response, fallbackMessage: string): Promise<string> {
  try {
    const errObj = await res.json()
    return errObj.error || errObj.Error || errObj.message || errObj.Message || `${fallbackMessage} (HTTP ${res.status})`
  } catch {
    const text = await res.text().catch(() => '')
    return text || `${fallbackMessage} (HTTP ${res.status})`
  }
}

/**
 * Loads Gantt production schedule for an event from GET /api/production/event/{eventId}/gantt.
 */
export async function fetchGanttScheduleForEvent(eventId: string): Promise<GanttScheduleResponseDto | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/event/${encodeURIComponent(eventId)}/gantt`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      if (res.status === 404) {
        return null
      }
      console.warn(`[productionApi] GET /api/production/event/${eventId}/gantt returned HTTP ${res.status}`)
      throw new Error(`Failed to fetch production schedule: HTTP ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[productionApi] GET /api/production/event/${eventId}/gantt failed:`, err)
    throw err
  }
}

/**
 * Fetches a single production task by ID.
 * Endpoint: GET /api/production/task/{id}
 */
export async function fetchProductionTask(taskId: string): Promise<ProductionTaskResponseDto | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/task/${encodeURIComponent(taskId)}`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error(`Failed to fetch production task: HTTP ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[productionApi] GET /api/production/task/${taskId} failed:`, err)
    throw err
  }
}

/**
 * Verifies raw material requirements for a production task.
 * Endpoint: POST /api/production/task/{id}/verify-materials
 */
export async function verifyProductionMaterials(
  taskId: string,
  req: VerifyMaterialsRequest = {},
): Promise<ProductionMutationResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/task/${encodeURIComponent(taskId)}/verify-materials`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(req),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, data }
    }
    const message = await parseErrorResponse(res, 'Failed to verify materials')
    return {
      success: false,
      message,
      statusCode: res.status,
      forbidden: res.status === 403,
      notFound: res.status === 404,
      conflict: res.status === 409,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return { success: false, message: err?.message || 'Network error verifying materials' }
  }
}

/**
 * Records progress on an active production task.
 * Endpoint: PUT /api/production/task/{id}/progress
 */
export async function updateProductionProgress(
  taskId: string,
  req: UpdateProgressRequest,
): Promise<ProductionMutationResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/task/${encodeURIComponent(taskId)}/progress`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(req),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, data }
    }
    const message = await parseErrorResponse(res, 'Failed to update progress')
    return {
      success: false,
      message,
      statusCode: res.status,
      forbidden: res.status === 403,
      notFound: res.status === 404,
      conflict: res.status === 409,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return { success: false, message: err?.message || 'Network error updating progress' }
  }
}

/**
 * Approves a completed production task for quality/dispatch.
 * Endpoint: POST /api/production/task/{id}/approve
 */
export async function approveProductionTask(
  taskId: string,
  req: ApproveTaskRequest = {},
): Promise<ProductionMutationResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/task/${encodeURIComponent(taskId)}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(req),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, data }
    }
    const message = await parseErrorResponse(res, 'Failed to approve task')
    return {
      success: false,
      message,
      statusCode: res.status,
      forbidden: res.status === 403,
      notFound: res.status === 404,
      conflict: res.status === 409,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return { success: false, message: err?.message || 'Network error approving task' }
  }
}

/**
 * Rejects a production task with a mandatory reason, sending it to RejectedRework.
 * Endpoint: POST /api/production/task/{id}/reject
 */
export async function rejectProductionTask(
  taskId: string,
  req: RejectTaskRequest,
): Promise<ProductionMutationResult> {
  if (!req.reason || req.reason.trim().length === 0) {
    return { success: false, message: 'Rejection reason is required.' }
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/task/${encodeURIComponent(taskId)}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(req),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, data }
    }
    const message = await parseErrorResponse(res, 'Failed to reject task')
    return {
      success: false,
      message,
      statusCode: res.status,
      forbidden: res.status === 403,
      notFound: res.status === 404,
      conflict: res.status === 409,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return { success: false, message: err?.message || 'Network error rejecting task' }
  }
}

/**
 * Resumes rework on a rejected production task.
 * Endpoint: POST /api/production/task/{id}/resume-rework
 */
export async function resumeProductionRework(
  taskId: string,
  req: ResumeReworkRequest = {},
): Promise<ProductionMutationResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/task/${encodeURIComponent(taskId)}/resume-rework`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(req),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, data }
    }
    const message = await parseErrorResponse(res, 'Failed to resume rework')
    return {
      success: false,
      message,
      statusCode: res.status,
      forbidden: res.status === 403,
      notFound: res.status === 404,
      conflict: res.status === 409,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return { success: false, message: err?.message || 'Network error resuming rework' }
  }
}

/**
 * Executes warehouse handoff for an approved production task, releasing it to DispatchReady.
 * Endpoint: POST /api/production/task/{id}/handoff
 */
export async function handoffProductionTask(
  taskId: string,
  req: HandoffTaskRequest = {},
): Promise<ProductionMutationResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/task/${encodeURIComponent(taskId)}/handoff`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(req),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, data }
    }
    const message = await parseErrorResponse(res, 'Failed to handoff task')
    return {
      success: false,
      message,
      statusCode: res.status,
      forbidden: res.status === 403,
      notFound: res.status === 404,
      conflict: res.status === 409,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    return { success: false, message: err?.message || 'Network error completing handoff' }
  }
}

// ----------------------------------------------------------------------
// Authority & Role Visibility Helpers
// ----------------------------------------------------------------------

export interface RoleAccountLike {
  role?: string
  subRole?: string
  fullWarehouseAccess?: boolean
}

export function canCreateProductionTask(user?: RoleAccountLike | null): boolean {
  if (!user) return false
  const r = (user.role || '').trim()
  const s = (user.subRole || '').trim()
  if (user.fullWarehouseAccess) return true
  if (r === 'Admin' || r === 'SystemAdmin' || r === 'Warehouse Operations Manager' || r === 'Warehouse Manager') return true
  if (s === 'Production Manager' || r === 'Production Manager') return true
  return false
}

export function canVerifyProductionMaterials(user?: RoleAccountLike | null): boolean {
  if (!user) return false
  const r = (user.role || '').trim()
  const s = (user.subRole || '').trim()
  if (user.fullWarehouseAccess) return true
  if (r === 'Admin' || r === 'SystemAdmin' || r === 'Warehouse Operations Manager' || r === 'Warehouse Manager') return true
  if (s === 'Production Manager' || r === 'Production Manager') return true
  if (s === 'Inventory Officer' || r === 'Inventory Officer') return true
  return false
}

export function canUpdateProductionProgress(user?: RoleAccountLike | null): boolean {
  if (!user) return false
  const r = (user.role || '').trim()
  const s = (user.subRole || '').trim()
  if (user.fullWarehouseAccess) return true
  if (r === 'Admin' || r === 'SystemAdmin' || r === 'Warehouse Operations Manager' || r === 'Warehouse Manager') return true
  if (s === 'Production Manager' || r === 'Production Manager') return true
  if (
    r === 'Warehouse Lead' ||
    r === 'Warehouse Member' ||
    r === 'Warehouse Associate' ||
    r === 'Ground Crew'
  ) {
    return true
  }
  return false
}

export function canApproveOrRejectProduction(user?: RoleAccountLike | null): boolean {
  if (!user) return false
  const r = (user.role || '').trim()
  const s = (user.subRole || '').trim()
  if (user.fullWarehouseAccess) return true
  if (r === 'Admin' || r === 'SystemAdmin' || r === 'Warehouse Operations Manager' || r === 'Warehouse Manager') return true
  if (s === 'Production Manager' || r === 'Production Manager') return true
  return false
}

export function canWarehouseHandoffProduction(user?: RoleAccountLike | null): boolean {
  if (!user) return false
  const r = (user.role || '').trim()
  if (user.fullWarehouseAccess) return true
  if (r === 'Admin' || r === 'SystemAdmin' || r === 'Warehouse Operations Manager' || r === 'Warehouse Manager') return true
  return false
}

// ----------------------------------------------------------------------
// Status Formatting & Styling Helpers
// ----------------------------------------------------------------------

export function formatProductionStatus(status?: string): string {
  if (!status) return 'Pending'
  switch (status) {
    case 'Pending':
    case 'Unprepped':
      return 'Pending'
    case 'MaterialsVerified':
      return 'Materials Verified'
    case 'InProgress':
    case 'Prepping':
      return 'In Progress'
    case 'CompletedAwaitingApproval':
    case 'Awaiting Approval':
      return 'Awaiting Approval'
    case 'RejectedRework':
      return 'Rejected / Rework'
    case 'Approved':
      return 'Approved'
    case 'DispatchReady':
    case 'Ready':
      return 'Dispatch Ready'
    case 'Cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export function getProductionStatusTone(
  status?: string,
): 'neutral' | 'progress' | 'caution' | 'critical' | 'positive' {
  if (!status) return 'neutral'
  switch (status) {
    case 'Pending':
    case 'Unprepped':
      return 'neutral'
    case 'MaterialsVerified':
      return 'progress'
    case 'InProgress':
    case 'Prepping':
      return 'progress'
    case 'CompletedAwaitingApproval':
    case 'Awaiting Approval':
      return 'caution'
    case 'RejectedRework':
      return 'critical'
    case 'Approved':
      return 'positive'
    case 'DispatchReady':
    case 'Ready':
      return 'positive'
    case 'Cancelled':
      return 'neutral'
    default:
      return 'neutral'
  }
}
