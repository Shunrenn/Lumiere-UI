import { getPendingQueue, removeQueuedDeclaration } from './offlineQueue'

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
    const { submitDamageReportApi } = await import('./damageApi')

    for (const item of pendingItems) {
      try {
        const result = await submitDamageReportApi({
          assetId: item.assetId,
          eventId: item.eventId,
          damagedQuantity: item.quantity,
          noPhotographicEvidence: item.noPhotographicEvidence ?? false,
          photoUrl: item.photoUrl || '',
          sha256Hash: item.sha256Hash || '',
          exifMetadata: item.exifMetadata,
          gpsCoordinates: item.gpsCoordinates,
          severity: item.condition === 'Damaged' ? 'Critical' : 'Missing',
          idempotencyKey: item.idempotencyKey,
        })

        // HTTP 201 (Created) or 200 (Exact idempotent replay) count as successful sync
        if (result.kind === 'created' || result.kind === 'replayed') {
          await removeQueuedDeclaration(item.id)
          syncedCount++
        } else {
          // 409 (Idempotency conflict) or other failure must NOT be marked as success
          console.warn(`[offlineReplay] Declaration ${item.id} replay failed:`, result.message)
          errors++
        }
      } catch (err) {
        console.warn(`[offlineReplay] Failed to replay declaration ${item.id}:`, err)
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
