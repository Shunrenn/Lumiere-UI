/**
 * Central Offline Replay & Synchronization Engine
 *
 * Coordinates sequential, durable replay of queued outbox operations
 * across domains (Manning, Field Checklists, HAVA/Damage) when connectivity
 * is restored.
 *
 * Guarantees:
 * - Replays only operations belonging to the currently authenticated user.
 * - Retains rejected/conflicted operations for human inspection without silent loss.
 * - Dispatches fine-grained synchronization lifecycle events to the UI.
 */

import { getPendingMutations, getUserMutations, type MutationOutboxEntry } from './db'
import { replaySingleManningMutation, type ManningMutationPayload } from './manningOutbox'
import { replaySingleChecklistMutation } from './checklistOutbox'

export type SyncEngineState = 'idle' | 'syncing' | 'offline'

export interface SyncEngineStatus {
  state: SyncEngineState
  pendingCount: number
  conflictCount: number
  lastSyncAt: string | null
}

type SyncListener = (status: SyncEngineStatus) => void

const listeners = new Set<SyncListener>()
let currentStatus: SyncEngineStatus = {
  state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
  pendingCount: 0,
  conflictCount: 0,
  lastSyncAt: null,
}

function notifyListeners() {
  listeners.forEach((l) => l({ ...currentStatus }))
}

export function subscribeSyncEngine(listener: SyncListener): () => void {
  listeners.add(listener)
  listener({ ...currentStatus })
  return () => listeners.delete(listener)
}

/**
 * Updates internal counter statistics for current user.
 */
export async function refreshSyncCounts(userId: string): Promise<SyncEngineStatus> {
  if (!userId) {
    currentStatus = { ...currentStatus, pendingCount: 0, conflictCount: 0 }
    notifyListeners()
    return currentStatus
  }

  try {
    const mutations = await getUserMutations(userId)
    const pending = mutations.filter((m) => m.status === 'pending' || m.status === 'syncing' || m.status === 'failed')
    const conflicts = mutations.filter((m) => m.status === 'conflict')

    currentStatus = {
      ...currentStatus,
      pendingCount: pending.length,
      conflictCount: conflicts.length,
    }
    notifyListeners()
  } catch (err) {
    console.warn('[OfflineReplayEngine] Failed to query sync counts:', err)
  }

  return currentStatus
}

let isReplaying = false

/**
 * Triggers sequential replay of all pending outbox mutations for the current user.
 */
export async function triggerOutboxReplay(userId: string): Promise<{
  total: number
  synced: number
  conflicts: number
  failed: number
}> {
  if (!userId || isReplaying) {
    return { total: 0, synced: 0, conflicts: 0, failed: 0 }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentStatus.state = 'offline'
    notifyListeners()
    return { total: 0, synced: 0, conflicts: 0, failed: 0 }
  }

  isReplaying = true
  currentStatus.state = 'syncing'
  notifyListeners()

  let synced = 0
  let conflicts = 0
  let failed = 0
  let total = 0

  try {
    const pending = await getPendingMutations(userId)
    total = pending.length

    for (const entry of pending) {
      if (entry.domain === 'manning') {
        const result = await replaySingleManningMutation(
          userId,
          entry as MutationOutboxEntry<ManningMutationPayload>
        )
        if (result.success) {
          synced++
        } else if (result.conflict) {
          conflicts++
        } else {
          failed++
        }
      } else if (entry.domain === 'checklist' || entry.domain === 'dispatch') {
        const result = await replaySingleChecklistMutation(userId, entry)
        if (result.success) {
          synced++
        } else if (result.conflict) {
          conflicts++
        } else {
          failed++
        }
      }
    }

    currentStatus.lastSyncAt = new Date().toISOString()
  } catch (err) {
    console.warn('[OfflineReplayEngine] Error during replay cycle:', err)
  } finally {
    isReplaying = false
    currentStatus.state = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle'
    await refreshSyncCounts(userId)
  }

  return { total, synced, conflicts, failed }
}

/**
 * Initializes listeners for online reconnection and window focus.
 */
export function initializeOfflineReplayEngine(getUserId: () => string | null) {
  if (typeof window === 'undefined') return

  const handleOnline = () => {
    const userId = getUserId()
    if (userId) {
      console.log('[OfflineReplayEngine] Network connection restored. Starting replay...')
      void triggerOutboxReplay(userId)
    }
  }

  const handleOffline = () => {
    currentStatus.state = 'offline'
    notifyListeners()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Initial count check
  const uid = getUserId()
  if (uid) {
    void refreshSyncCounts(uid)
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
