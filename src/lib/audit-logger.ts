import { supabase } from '@/lib/supabase'

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
 * Emits a structured audit log entry to Supabase `audit_logs` table,
 * falling back durably to localStorage if Supabase is unreachable.
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

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: fullEntry.actor_id,
        actor_name: fullEntry.actor_name,
        module: fullEntry.module,
        action_type: fullEntry.action_type,
        target_id: fullEntry.target_id,
        target_snapshot: fullEntry.target_snapshot ?? null,
        reason: fullEntry.reason,
        created_at: fullEntry.created_at,
      })
      .select('*')
      .single()

    if (!error && data) {
      return data as AuditLogEntry
    }
  } catch (err) {
    console.warn('[AuditLogger] Supabase audit log insert fallback to localStorage.', err)
  }

  return fullEntry
}

/**
 * Fetches audit logs from Supabase with fallbacks to localStorage.
 */
export async function fetchAuditLogs(filter?: {
  module?: AuditModule
  action_type?: AuditActionType
}): Promise<AuditLogEntry[]> {
  try {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false })

    if (filter?.module) {
      query = query.eq('module', filter.module)
    }
    if (filter?.action_type) {
      query = query.eq('action_type', filter.action_type)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data as AuditLogEntry[]
    }
  } catch (err) {
    console.warn('[AuditLogger] Supabase fetch audit logs fallback to localStorage.', err)
  }

  let logs = getLocalAuditLogs()
  if (filter?.module) {
    logs = logs.filter((l) => l.module === filter.module)
  }
  if (filter?.action_type) {
    logs = logs.filter((l) => l.action_type === filter.action_type)
  }

  return logs
}
