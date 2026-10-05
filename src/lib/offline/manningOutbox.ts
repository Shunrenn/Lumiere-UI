import {
  enqueueMutation,
  getUserMutations,
  updateMutationStatus,
  removeMutation,
  type MutationOutboxEntry,
} from './db'
import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'
import { type MyManningAssignmentDto, normalizeMyAssignmentRecord } from '@/features/manning/api/manningApi'

export interface ManningMutationPayload {
  assignmentId: string
  eventId?: string
  userId: string
  status: 'InProgress' | 'Completed' | 'Blocked'
  blockerReason?: string | null
  notes?: string | null
}

/**
 * Enqueues a Manning task execution mutation when offline or network fails.
 */
export async function queueManningStatusUpdate(
  userId: string,
  assignmentId: string,
  eventId: string | undefined,
  req: { status: 'InProgress' | 'Completed' | 'Blocked'; blockerReason?: string | null; notes?: string | null }
): Promise<MutationOutboxEntry<ManningMutationPayload>> {
  if (!userId || userId.trim() === '') {
    throw new Error('[ManningOutbox] Cannot enqueue mutation without authenticated userId.')
  }

  const payload: ManningMutationPayload = {
    assignmentId,
    eventId,
    userId,
    status: req.status,
    blockerReason: req.blockerReason ? req.blockerReason.trim() : null,
    notes: req.notes ? req.notes.trim() : null,
  }

  return enqueueMutation<ManningMutationPayload>({
    userId,
    domain: 'manning',
    action: 'UPDATE_EXECUTION_STATUS',
    endpoint: `/api/manning/assignments/${encodeURIComponent(assignmentId)}/status`,
    method: 'POST',
    payload,
    status: 'pending',
  })
}

/**
 * Gets all outbox mutations for Manning execution scoped to the user.
 */
export async function getManningUserMutations(userId: string): Promise<MutationOutboxEntry<ManningMutationPayload>[]> {
  const all = await getUserMutations(userId)
  return all.filter((m) => m.domain === 'manning') as MutationOutboxEntry<ManningMutationPayload>[]
}

/**
 * Replays a single Manning mutation against the canonical backend REST endpoint.
 */
export async function replaySingleManningMutation(
  userId: string,
  entry: MutationOutboxEntry<ManningMutationPayload>
): Promise<{
  success: boolean
  status: number
  data?: MyManningAssignmentDto
  conflict?: boolean
  error?: string
}> {
  if (!userId || entry.userId !== userId) {
    return {
      success: false,
      status: 403,
      conflict: true,
      error: 'Security partition violation: cannot replay mutation for different user',
    }
  }

  const token = getAuthToken()
  if (!token) {
    return {
      success: false,
      status: 401,
      error: 'User not authenticated. Replay suspended.',
    }
  }

  // Transition to syncing
  await updateMutationStatus(userId, entry.id, 'syncing')

  try {
    const res = await fetch(`${API_BASE_URL}${entry.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Client-Tx-Id': entry.clientTxId,
      },
      body: JSON.stringify({
        status: entry.payload.status,
        blockerReason: entry.payload.blockerReason,
        notes: entry.payload.notes,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      // Server acknowledged mutation — remove from outbox safely
      await removeMutation(userId, entry.id)
      return {
        success: true,
        status: res.status,
        data: normalizeMyAssignmentRecord(data),
      }
    }

    // Server rejected (400, 403, 404, 409, 422)
    const errBody = await res.json().catch(() => ({}))
    const errorMsg =
      errBody.error ??
      errBody.Error ??
      errBody.message ??
      `Server rejected mutation with HTTP ${res.status}`

    // DO NOT discard operation. Retain with Conflict / Needs Attention
    await updateMutationStatus(userId, entry.id, 'conflict', errorMsg, true)

    return {
      success: false,
      status: res.status,
      conflict: true,
      error: errorMsg,
    }
  } catch (err: any) {
    // Network failure / still offline
    const netMsg = err?.message || 'Network unreachable'
    await updateMutationStatus(userId, entry.id, 'failed', netMsg, true)
    return {
      success: false,
      status: 0,
      error: netMsg,
    }
  }
}
