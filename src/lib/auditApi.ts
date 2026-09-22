import type { ActivityLog } from './types'
import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface BackendAuditLog {
  id: string
  actorId?: string
  actorEmail?: string
  actionType: string
  affectedTable?: string
  affectedRecordId?: string
  loggedAt: string
  ipAddress?: string
}

function formatAuditDate(dateString: string): { timestamp: string; date: string } {
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) {
      return { timestamp: '00:00:00', date: 'Unknown' }
    }
    const timestamp = d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return { timestamp, date }
  } catch {
    return { timestamp: '00:00:00', date: 'Unknown' }
  }
}

export function mapBackendDtoToActivityLog(dto: BackendAuditLog): ActivityLog {
  const { timestamp, date } = formatAuditDate(dto.loggedAt)
  const shortId = dto.id ? dto.id.slice(-8).toUpperCase() : 'UNKNOWN'

  // Account display: prefer email, fallback to actorId or System
  const account = dto.actorEmail || (dto.actorId ? `USR-${dto.actorId.slice(0, 8)}` : 'System')

  // Infer role if recognizable or default to 'System'
  let initiatorRole = 'System'
  if (dto.actorEmail) {
    const emailLower = dto.actorEmail.toLowerCase()
    if (emailLower.includes('admin')) initiatorRole = 'Admin'
    else if (emailLower.includes('executive')) initiatorRole = 'Executive'
    else if (emailLower.includes('warehouse') || emailLower.includes('wom')) initiatorRole = 'Warehouse Operations'
    else if (emailLower.includes('planner')) initiatorRole = 'Event Planner'
    else if (emailLower.includes('crew')) initiatorRole = 'Ground Crew'
  }

  const detail = dto.affectedTable
    ? `${dto.affectedTable}${dto.affectedRecordId ? ` (${dto.affectedRecordId})` : ''}`
    : 'System operation'

  return {
    id: dto.id,
    timestamp,
    date,
    logId: `LOG-${shortId}`,
    account,
    initiatorRole,
    action: dto.actionType,
    detail,
    ip: dto.ipAddress || '127.0.0.1',
    status: 'Success',
  }
}

export async function fetchAuditLogs(limit: number = 200): Promise<{ logs: ActivityLog[]; connected: boolean }> {
  const token = getAuthToken()
  if (!token) {
    return { logs: [], connected: false }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/audit-logs?limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        // Operational roles or unauthenticated users don't have access
        return { logs: [], connected: false }
      }
      return { logs: [], connected: false }
    }

    const data: BackendAuditLog[] = await response.json()
    const mapped = data.map(mapBackendDtoToActivityLog)
    return { logs: mapped, connected: true }
  } catch (error) {
    console.warn('[AuditApi] Failed to fetch audit logs from backend:', error)
    return { logs: [], connected: false }
  }
}
