import {
  getPendingQueue,
  removeQueuedDeclaration,
  updateQueuedDeclaration,
  blobToDataUrl,
} from './offlineQueue'
import { getEvidenceBlob } from './offline/db'
import { submitDamageReportApi } from '@/features/damage/api/damageApi'

type SyncListener = (pendingCount: number, syncing: boolean) => void
const syncListeners = new Set<SyncListener>()
let isSyncing = false

export function subscribeOfflineSync(listener: SyncListener): () => void {
  syncListeners.add(listener)
  notifyListeners()
  return () => syncListeners.delete(listener)
}

async function notifyListeners() {
  const pending = await getPendingQueue()
  syncListeners.forEach((l) => l(pending.length, isSyncing))
}

/**
 * Triggers background sync replay of all queued offline declarations.
 */
export async function triggerOfflineReplay(): Promise<{ syncedCount: number; errors: number }> {
  if (isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const queue = await getPendingQueue()
    return { syncedCount: 0, errors: queue.length }
  }

  isSyncing = true
  notifyListeners()

  let syncedCount = 0
  let errors = 0

  try {
    const pendingItems = await getPendingQueue()

    for (const item of pendingItems) {
      await updateQueuedDeclaration(item.id, { syncStatus: 'syncing' })
      try {
        let photoDataUrl = item.photoUrl || ''
        const userId = item.userId || item.submittedBy || 'gc-user'

        // If binary evidence is stored in evidence_blobs, retrieve and encode to Data URL for REST transmission
        if (item.evidenceBlobId) {
          try {
            const blobRecord = await getEvidenceBlob(userId, item.evidenceBlobId)
            if (blobRecord && blobRecord.blob) {
              const b =
                blobRecord.blob instanceof Blob
                  ? blobRecord.blob
                  : new Blob([blobRecord.blob], { type: blobRecord.mimeType })
              photoDataUrl = await blobToDataUrl(b)
            }
          } catch (blobErr) {
            console.warn(`[offlineReplay] Could not load evidence blob for ${item.id}:`, blobErr)
          }
        }

        const result = await submitDamageReportApi({
          assetId: item.assetId,
          eventId: item.eventId,
          damagedQuantity: item.quantity,
          noPhotographicEvidence: item.noPhotographicEvidence ?? false,
          photoUrl: photoDataUrl,
          sha256Hash: item.sha256Hash || '',
          exifMetadata: item.exifMetadata,
          gpsCoordinates: item.gpsCoordinates,
          severity: item.condition === 'Damaged' ? 'Critical' : 'Missing',
          idempotencyKey: item.idempotencyKey,
        })

        // HTTP 201 (Created) or 200 (Exact idempotent replay) count as successful sync
        if (result.kind === 'created' || result.kind === 'replayed') {
          await removeQueuedDeclaration(item.id, userId)
          syncedCount++
        } else {
          // Server rejected or conflict: record status and error, do NOT report false success
          console.warn(`[offlineReplay] Declaration ${item.id} replay rejected:`, result.message)
          await updateQueuedDeclaration(item.id, {
            syncStatus: 'server rejected/conflicted',
            lastError: result.message,
            retryCount: (item.retryCount || 0) + 1,
          })
          errors++
        }
      } catch (err: any) {
        console.warn(`[offlineReplay] Failed to replay declaration ${item.id}:`, err)
        await updateQueuedDeclaration(item.id, {
          syncStatus: 'server rejected/conflicted',
          lastError: err?.message || 'Network error during sync',
          retryCount: (item.retryCount || 0) + 1,
        })
        errors++
      }
    }
  } finally {
    isSyncing = false
    notifyListeners()
  }

  return { syncedCount, errors }
}

// Auto-register network listener to flush queue on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[offlineReplay] Network connection restored — triggering background replay queue sync')
    triggerOfflineReplay()
  })
}
