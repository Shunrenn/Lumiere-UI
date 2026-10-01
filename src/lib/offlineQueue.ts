import {
  saveEvidenceBlob,
  getEvidenceBlob,
  removeEvidenceBlob,
} from './offline/db'

export type OfflineItemStatus =
  | 'locally queued'
  | 'syncing'
  | 'server accepted'
  | 'server rejected/conflicted'

export interface QueuedDeclaration {
  id: string
  idempotencyKey: string
  eventId: string // Canonical Event GUID
  eventName: string
  assetId: string // Canonical Asset GUID
  itemName: string
  condition: 'Damaged' | 'Missing'
  quantity: number
  description: string
  submittedBy: string
  userId?: string
  evidenceBlobId?: string
  photoBlob?: Blob | ArrayBuffer
  photoUrl?: string
  sha256Hash?: string
  exifMetadata?: string
  gpsCoordinates?: string
  noPhotographicEvidence?: boolean
  timestamp: string
  retryCount: number
  syncStatus?: OfflineItemStatus
  lastError?: string
}

const DB_NAME = 'lumiere-offline-db'
const DB_VERSION = 1
const STORE_NAME = 'pending_declarations'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in environment'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Converts a data: or blob: URL into a raw Blob.
 */
export async function urlToBlob(url: string): Promise<Blob | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    return await res.blob()
  } catch (err) {
    console.warn('[offlineQueue] Failed to convert URL to blob:', err)
    return null
  }
}

/**
 * Converts a Blob into a base64 Data URL.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Enqueues a declaration item into IndexedDB storage and persists binary evidence durably.
 */
export async function enqueueDeclaration(
  item: Omit<QueuedDeclaration, 'id' | 'idempotencyKey' | 'timestamp' | 'retryCount' | 'syncStatus'>
): Promise<QueuedDeclaration> {
  const id = `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const userId = item.userId || item.submittedBy || 'gc-user'

  let evidenceBlobId = item.evidenceBlobId
  let photoBlobToStore: Blob | null = null

  if (item.photoBlob instanceof Blob) {
    photoBlobToStore = item.photoBlob
  } else if (item.photoUrl && !item.noPhotographicEvidence) {
    photoBlobToStore = await urlToBlob(item.photoUrl)
  }

  // Persist binary evidence durably in evidence_blobs store
  if (photoBlobToStore) {
    evidenceBlobId = evidenceBlobId || `ev-blob-${id}`
    try {
      await saveEvidenceBlob(
        userId,
        evidenceBlobId,
        photoBlobToStore,
        photoBlobToStore.type || 'image/jpeg',
        item.sha256Hash || 'sha256-uncomputed'
      )
    } catch (blobErr) {
      console.warn('[offlineQueue] Failed to save binary evidence to evidence_blobs:', blobErr)
    }
  }

  const queuedItem: QueuedDeclaration = {
    ...item,
    id,
    idempotencyKey,
    userId,
    evidenceBlobId,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    syncStatus: 'locally queued',
  }

  // Strip transient in-memory blob reference before saving declaration record
  const recordToSave = { ...queuedItem }
  delete recordToSave.photoBlob

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add(recordToSave)
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = reject
    })
  } catch (err) {
    console.warn('[offlineQueue] IndexedDB write failed, falling back to localStorage:', err)
    const existing = getFallbackQueue()
    existing.push(recordToSave)
    setFallbackQueue(existing)
  }

  return queuedItem
}

/**
 * Retrieves all pending queued items from IndexedDB and reconstructs binary image evidence if needed.
 */
export async function getPendingQueue(): Promise<QueuedDeclaration[]> {
  let items: QueuedDeclaration[] = []
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    items = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    items = getFallbackQueue()
  }

  // Reconstruct photoUrl for items whose temporary blob URL might have expired across reload
  for (const item of items) {
    const userId = item.userId || item.submittedBy || 'gc-user'
    if (item.evidenceBlobId && (!item.photoUrl || item.photoUrl.startsWith('blob:'))) {
      try {
        const entry = await getEvidenceBlob(userId, item.evidenceBlobId)
        if (entry && entry.blob) {
          const blob = entry.blob instanceof Blob ? entry.blob : new Blob([entry.blob], { type: entry.mimeType })
          item.photoUrl = URL.createObjectURL(blob)
        }
      } catch (err) {
        console.warn(`[offlineQueue] Could not reconstruct evidence blob for ${item.id}:`, err)
      }
    }
  }

  return items
}

/**
 * Removes a successfully synced declaration and its associated binary evidence.
 */
export async function removeQueuedDeclaration(id: string, userId?: string): Promise<void> {
  let evidenceBlobId: string | undefined
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    await new Promise<void>((resolve) => {
      getReq.onsuccess = () => {
        if (getReq.result) {
          evidenceBlobId = getReq.result.evidenceBlobId
          userId = userId || getReq.result.userId || getReq.result.submittedBy
          store.delete(id)
        }
        resolve()
      }
      getReq.onerror = () => resolve()
    })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = reject
    })
  } catch (err) {
    const existing = getFallbackQueue().filter((item) => item.id !== id)
    setFallbackQueue(existing)
  }

  // Also remove durable evidence blob if present
  if (evidenceBlobId && userId) {
    try {
      await removeEvidenceBlob(userId, evidenceBlobId)
    } catch (err) {
      console.warn('[offlineQueue] Error removing evidence blob:', err)
    }
  }
}

export async function updateQueuedDeclaration(
  id: string,
  updates: Partial<QueuedDeclaration>,
): Promise<void> {
  const cleanUpdates = { ...updates }
  delete cleanUpdates.photoBlob

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    await new Promise<void>((resolve, reject) => {
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, ...cleanUpdates }
          store.put(updated)
        }
        resolve()
      }
      getReq.onerror = () => reject(getReq.error)
    })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = reject
    })
  } catch (err) {
    const existing = getFallbackQueue().map((item) =>
      item.id === id ? { ...item, ...cleanUpdates } : item,
    )
    setFallbackQueue(existing)
  }
}

/* LocalStorage fallback handlers for non-IndexedDB browser edge cases */
function getFallbackQueue(): QueuedDeclaration[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('lumiere_offline_queue')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setFallbackQueue(items: QueuedDeclaration[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('lumiere_offline_queue', JSON.stringify(items))
  } catch {}
}
