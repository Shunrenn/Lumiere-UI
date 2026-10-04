export type AuditModule =
  | 'dispatch'
  | 'manning'
  | 'inventory'
  | 'damage'
  | 'rbac'
  | 'squads'

export type AuditActionType =
  | 'BATCH_ARCHIVE'
  | 'BATCH_RESTORE'
  | 'MANNING_OVERRIDE'
  | 'SQUAD_CREATE'
  | 'SQUAD_UPDATE'
  | 'SQUAD_DELETE'
  | 'EMERGENCY_UNBLOCK'
  | 'DAMAGE_VERDICT'
  | 'EXECUTIVE_SIGNOFF'
  | 'DISPUTED_CONFIRMATION'
  | 'ASSIGNMENT_AUTO_RELEASED'
  | 'CAPABILITY_TOGGLE'

export interface AuditLogEntry {
  id: string
  actor_id: string
  actor_name: string
  module: AuditModule
  action_type: AuditActionType
  target_id: string
  target_snapshot?: Record<string, unknown> | null
  reason: string
  created_at: string
}

const LOCAL_STORAGE_KEY = 'lumiere_audit_logs'

function getLocalAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AuditLogEntry[]
  } catch {
    return []
  }
}

function saveLocalAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs))
  } catch (err) {
    console.warn('[AuditLogger] Failed to save audit logs to localStorage:', err)
  }
}

/**
 * Records a local UI activity notice. Authoritative audit records are written
 * by the API when it performs the underlying server-side operation.
 */
export async function logAuditEvent(
  entry: Omit<AuditLogEntry, 'id' | 'created_at'>,
): Promise<AuditLogEntry> {
  const fullEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    ...entry,
  }

  // Always update local storage first so prototype refreshes maintain durability
  const localLogs = getLocalAuditLogs()
  const updatedLogs = [fullEntry, ...localLogs]
  saveLocalAuditLogs(updatedLogs)

  return fullEntry
}

/**
 * Returns local UI activity notices. Administrative audit views use auditApi,
 * which reads the server's authoritative audit log through Lumiere.API.
 */
export async function fetchAuditLogs(filter?: {
  module?: AuditModule
  action_type?: AuditActionType
}): Promise<AuditLogEntry[]> {
  let logs = getLocalAuditLogs()
  if (filter?.module) {
    logs = logs.filter((l) => l.module === filter.module)
  }
  if (filter?.action_type) {
    logs = logs.filter((l) => l.action_type === filter.action_type)
  }

  return logs
}
