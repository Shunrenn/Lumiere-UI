import {
  enqueueMutation,
  updateMutationStatus,
  type MutationOutboxEntry,
} from './db'

export interface EgressItemCompletionPayload {
  eventId: string
  itemId: string
  expectedEgressVersion: number
  expectedItemVersion: number
}

export interface PhaseAdvancementPayload {
  eventId: string
  fromPhase: string
  toPhase: string
}

export interface BatchStallPayload {
  eventId: string
  batchId: string
  reason: string
}

export interface BatchResumePayload {
  eventId: string
  batchId: string
}

/**
 * Enqueues an egress checklist item completion for offline sync.
 */
export async function queueOfflineEgressItemCompletion(
  userId: string,
  eventId: string,
  itemId: string,
  expectedEgressVersion: number,
  expectedItemVersion: number
): Promise<MutationOutboxEntry<EgressItemCompletionPayload>> {
  return enqueueMutation<EgressItemCompletionPayload>({
    userId,
    domain: 'checklist',
    action: 'COMPLETE_EGRESS_ITEM',
    endpoint: `/api/partial-egress/events/${eventId}/items/${itemId}/complete`,
    method: 'POST',
    payload: {
      eventId,
      itemId,
      expectedEgressVersion,
      expectedItemVersion,
    },
  })
}

/**
 * Enqueues a checkpoint phase advancement (loading, arrival, setup) for offline sync.
 */
export async function queueOfflinePhaseAdvancement(
  userId: string,
  eventId: string,
  fromPhase: string,
  toPhase: string
): Promise<MutationOutboxEntry<PhaseAdvancementPayload>> {
  return enqueueMutation<PhaseAdvancementPayload>({
    userId,
    domain: 'checklist',
    action: 'ADVANCE_PHASE',
    endpoint: `/api/events/${eventId}/checkpoint-phase`,
    method: 'POST',
    payload: {
      eventId,
      fromPhase,
      toPhase,
    },
  })
}

/**
 * Replays a single checklist / dispatch mutation against canonical backend REST endpoints.
 */
export async function replaySingleChecklistMutation(
  userId: string,
  entry: MutationOutboxEntry<any>
): Promise<{ success: boolean; conflict: boolean; error?: string }> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('lumiere_token') : null
  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''

  try {
    await updateMutationStatus(userId, entry.id, 'syncing')

    if (entry.action === 'COMPLETE_EGRESS_ITEM') {
      const payload = entry.payload as EgressItemCompletionPayload
      const res = await fetch(`${apiBase}${entry.endpoint}`, {
        method: entry.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          expectedEgressVersion: payload.expectedEgressVersion,
          expectedItemVersion: payload.expectedItemVersion,
        }),
      })

      if (res.ok) {
        await updateMutationStatus(userId, entry.id, 'confirmed')
        return { success: true, conflict: false }
      }

      const body = await res.json().catch(() => ({}))
      const errorMsg = body.error || body.Error || body.message || `Server returned HTTP ${res.status}`

      if (res.status === 409 || res.status === 403 || res.status === 400 || res.status === 404) {
        await updateMutationStatus(userId, entry.id, 'conflict', errorMsg)
        return { success: false, conflict: true, error: errorMsg }
      }

      await updateMutationStatus(userId, entry.id, 'failed', errorMsg)
      return { success: false, conflict: false, error: errorMsg }
    }

    if (entry.action === 'ADVANCE_PHASE') {
      // Phase advancement endpoint replay
      const res = await fetch(`${apiBase}${entry.endpoint}`, {
        method: entry.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(entry.payload),
      })

      if (res.ok || res.status === 404) {
        // Even if endpoint returns 404 on API without Phase table, acknowledge if handled
        await updateMutationStatus(userId, entry.id, 'confirmed')
        return { success: true, conflict: false }
      }

      const body = await res.json().catch(() => ({}))
      const errorMsg = body.error || body.Error || `HTTP ${res.status}`
      if (res.status === 409 || res.status === 403) {
        await updateMutationStatus(userId, entry.id, 'conflict', errorMsg)
        return { success: false, conflict: true, error: errorMsg }
      }

      await updateMutationStatus(userId, entry.id, 'failed', errorMsg)
      return { success: false, conflict: false, error: errorMsg }
    }

    // Default generic mutation replay
    const res = await fetch(`${apiBase}${entry.endpoint}`, {
      method: entry.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(entry.payload),
    })

    if (res.ok) {
      await updateMutationStatus(userId, entry.id, 'confirmed')
      return { success: true, conflict: false }
    }

    const body = await res.json().catch(() => ({}))
    const errorMsg = body.error || body.Error || `HTTP ${res.status}`
    if (res.status === 409 || res.status === 403) {
      await updateMutationStatus(userId, entry.id, 'conflict', errorMsg)
      return { success: false, conflict: true, error: errorMsg }
    }

    await updateMutationStatus(userId, entry.id, 'failed', errorMsg)
    return { success: false, conflict: false, error: errorMsg }
  } catch (err: any) {
    const errorMsg = err?.message || 'Network error during replay'
    // Keep as pending on network disconnection so it retries upon next reconnection
    await updateMutationStatus(userId, entry.id, 'pending', errorMsg)
    return { success: false, conflict: false, error: errorMsg }
  }
}
