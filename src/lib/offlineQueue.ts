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
  photoUrl?: string
  sha256Hash?: string
  exifMetadata?: string
  gpsCoordinates?: string
  noPhotographicEvidence?: boolean
  timestamp: string
  retryCount: number
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
 * Enqueues a declaration item into IndexedDB storage.
 */
export async function enqueueDeclaration(
  item: Omit<QueuedDeclaration, 'id' | 'idempotencyKey' | 'timestamp' | 'retryCount'>
): Promise<QueuedDeclaration> {
  const queuedItem: QueuedDeclaration = {
    ...item,
    id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  }

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add(queuedItem)
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = reject
    })
  } catch (err) {
    console.warn('[offlineQueue] IndexedDB write failed, falling back to localStorage:', err)
    const existing = getFallbackQueue()
    existing.push(queuedItem)
    setFallbackQueue(existing)
  }

  return queuedItem
}

/**
 * Retrieves all pending queued items from IndexedDB or fallback storage.
 */
export async function getPendingQueue(): Promise<QueuedDeclaration[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    return getFallbackQueue()
  }
}

/**
 * Removes a successfully synced declaration from IndexedDB.
 */
export async function removeQueuedDeclaration(id: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = reject
    })
  } catch (err) {
    const existing = getFallbackQueue().filter((item) => item.id !== id)
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
