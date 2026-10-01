/**
 * Lumiere Durable Offline Storage Foundation (v2)
 *
 * Implements durable IndexedDB storage for:
 * - mutation_outbox: Unsent and pending client mutations
 * - read_cache: User-scoped canonical REST read snapshots
 * - evidence_blobs: Durable binary blobs for HAVA/damage validation
 *
 * Architecture Principles:
 * - User Partitioning: User A data is never accessible or returned to User B.
 * - Non-destructive logout: Logged-out state suspends replay without destroying records.
 * - Server Authority: Offline storage is never canonical authority.
 */

export type MutationStatus = 'pending' | 'syncing' | 'confirmed' | 'failed' | 'conflict'

export interface MutationOutboxEntry<TPayload = any> {
  id: string
  clientTxId: string
  userId: string
  domain: 'manning' | 'damage' | 'dispatch' | 'checklist' | string
  action: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload: TPayload
  createdAt: string
  status: MutationStatus
  retryCount: number
  lastError?: string | null
}

export interface ReadCacheEntry<TData = any> {
  key: string
  userId: string
  domain: string
  data: TData
  cachedAt: string
}

export interface EvidenceBlobEntry {
  id: string
  userId: string
  blob: Blob | ArrayBuffer
  mimeType: string
  sha256: string
  createdAt: string
}

export const OFFLINE_DB_NAME = 'lumiere-offline-v2'
export const OFFLINE_DB_VERSION = 1

export const STORE_OUTBOX = 'mutation_outbox'
export const STORE_READ_CACHE = 'read_cache'
export const STORE_EVIDENCE_BLOBS = 'evidence_blobs'

/**
 * Opens or upgrades the IndexedDB database.
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in the current environment.'))
      return
    }

    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 1. Mutation Outbox Store
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' })
        outboxStore.createIndex('userId', 'userId', { unique: false })
        outboxStore.createIndex('status', 'status', { unique: false })
        outboxStore.createIndex('clientTxId', 'clientTxId', { unique: true })
        outboxStore.createIndex('user_status', ['userId', 'status'], { unique: false })
        outboxStore.createIndex('domain', 'domain', { unique: false })
      }

      // 2. Read Cache Store
      if (!db.objectStoreNames.contains(STORE_READ_CACHE)) {
        const cacheStore = db.createObjectStore(STORE_READ_CACHE, { keyPath: 'key' })
        cacheStore.createIndex('userId', 'userId', { unique: false })
        cacheStore.createIndex('domain', 'domain', { unique: false })
        cacheStore.createIndex('user_domain', ['userId', 'domain'], { unique: false })
      }

      // 3. Evidence Blobs Store
      if (!db.objectStoreNames.contains(STORE_EVIDENCE_BLOBS)) {
        const blobStore = db.createObjectStore(STORE_EVIDENCE_BLOBS, { keyPath: 'id' })
        blobStore.createIndex('userId', 'userId', { unique: false })
        blobStore.createIndex('sha256', 'sha256', { unique: false })
        blobStore.createIndex('user_sha256', ['userId', 'sha256'], { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/* ========================================================================= */
/* 1. MUTATION OUTBOX API (Strict User-Partitioned)                          */
/* ========================================================================= */

/**
 * Enqueues a durable mutation into the outbox for the authenticated user.
 */
export async function enqueueMutation<TPayload>(
  entry: Omit<MutationOutboxEntry<TPayload>, 'id' | 'createdAt' | 'retryCount' | 'status'> & {
    id?: string
    status?: MutationStatus
    createdAt?: string
  }
): Promise<MutationOutboxEntry<TPayload>> {
  if (!entry.userId || entry.userId.trim() === '') {
    throw new Error('[OfflineDB] Cannot enqueue mutation without an authenticated userId.')
  }

  const id = entry.id || `mut-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const clientTxId =
    entry.clientTxId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)

  const outboxEntry: MutationOutboxEntry<TPayload> = {
    id,
    clientTxId,
    userId: entry.userId,
    domain: entry.domain,
    action: entry.action,
    endpoint: entry.endpoint,
    method: entry.method,
    payload: entry.payload,
    createdAt: entry.createdAt || new Date().toISOString(),
    status: entry.status || 'pending',
    retryCount: 0,
    lastError: null,
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_OUTBOX, 'readwrite')
  const store = tx.objectStore(STORE_OUTBOX)
  store.add(outboxEntry)

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  return outboxEntry
}

/**
 * Gets all mutations belonging to the specified user, optionally filtered by status.
 */
export async function getUserMutations(
  userId: string,
  statuses?: MutationStatus[]
): Promise<MutationOutboxEntry[]> {
  if (!userId || userId.trim() === '') {
    return []
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_OUTBOX, 'readonly')
  const store = tx.objectStore(STORE_OUTBOX)
  const index = store.index('userId')
  const request = index.getAll(userId)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const items: MutationOutboxEntry[] = request.result || []
      // Double check user partitioning in memory
      const userItems = items.filter((item) => item.userId === userId)
      if (statuses && statuses.length > 0) {
        resolve(userItems.filter((item) => statuses.includes(item.status)))
      } else {
        resolve(userItems)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Gets pending mutations ready for replay for the specified user.
 */
export async function getPendingMutations(userId: string): Promise<MutationOutboxEntry[]> {
  return getUserMutations(userId, ['pending', 'failed'])
}

/**
 * Updates status and error information of a mutation.
 * Strictly verifies userId ownership.
 */
export async function updateMutationStatus(
  userId: string,
  id: string,
  status: MutationStatus,
  lastError?: string | null,
  incrementRetry = false
): Promise<void> {
  if (!userId || userId.trim() === '') {
    throw new Error('[OfflineDB] Cannot update mutation without authenticated userId.')
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_OUTBOX, 'readwrite')
  const store = tx.objectStore(STORE_OUTBOX)
  const getReq = store.get(id)

  await new Promise<void>((resolve, reject) => {
    getReq.onsuccess = () => {
      const record: MutationOutboxEntry = getReq.result
      if (!record) {
        resolve()
        return
      }
      // Strict user partitioning enforcement
      if (record.userId !== userId) {
        reject(new Error('[OfflineDB] Security violation: cannot modify mutation belonging to another user.'))
        return
      }

      record.status = status
      if (lastError !== undefined) {
        record.lastError = lastError
      }
      if (incrementRetry) {
        record.retryCount = (record.retryCount || 0) + 1
      }

      store.put(record)
      resolve()
    }
    getReq.onerror = () => reject(getReq.error)
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Removes an acknowledged mutation from the outbox.
 * Strictly verifies userId ownership.
 */
export async function removeMutation(userId: string, id: string): Promise<void> {
  if (!userId || userId.trim() === '') {
    throw new Error('[OfflineDB] Cannot delete mutation without authenticated userId.')
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_OUTBOX, 'readwrite')
  const store = tx.objectStore(STORE_OUTBOX)
  const getReq = store.get(id)

  await new Promise<void>((resolve, reject) => {
    getReq.onsuccess = () => {
      const record: MutationOutboxEntry = getReq.result
      if (!record) {
        resolve()
        return
      }
      if (record.userId !== userId) {
        reject(new Error('[OfflineDB] Security violation: cannot delete mutation belonging to another user.'))
        return
      }
      store.delete(id)
      resolve()
    }
    getReq.onerror = () => reject(getReq.error)
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/* ========================================================================= */
/* 2. READ CACHE API (Strict User-Partitioned)                               */
/* ========================================================================= */

/**
 * Sets a user-scoped canonical read cache entry.
 */
export async function setReadCache<TData>(
  userId: string,
  domain: string,
  keySuffix: string,
  data: TData
): Promise<ReadCacheEntry<TData>> {
  if (!userId || userId.trim() === '') {
    throw new Error('[OfflineDB] Cannot set read cache without authenticated userId.')
  }

  const compositeKey = `${userId}:${domain}:${keySuffix}`
  const entry: ReadCacheEntry<TData> = {
    key: compositeKey,
    userId,
    domain,
    data,
    cachedAt: new Date().toISOString(),
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_READ_CACHE, 'readwrite')
  const store = tx.objectStore(STORE_READ_CACHE)
  store.put(entry)

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  return entry
}

/**
 * Gets a user-scoped read cache entry.
 */
export async function getReadCache<TData>(
  userId: string,
  domain: string,
  keySuffix: string
): Promise<ReadCacheEntry<TData> | null> {
  if (!userId || userId.trim() === '') {
    return null
  }

  const compositeKey = `${userId}:${domain}:${keySuffix}`
  const db = await openOfflineDB()
  const tx = db.transaction(STORE_READ_CACHE, 'readonly')
  const store = tx.objectStore(STORE_READ_CACHE)
  const req = store.get(compositeKey)

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const record: ReadCacheEntry<TData> = req.result
      if (!record || record.userId !== userId) {
        resolve(null)
      } else {
        resolve(record)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Gets all read cache entries for a domain scoped to the user.
 */
export async function getReadCacheByDomain<TData>(
  userId: string,
  domain: string
): Promise<ReadCacheEntry<TData>[]> {
  if (!userId || userId.trim() === '') {
    return []
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_READ_CACHE, 'readonly')
  const store = tx.objectStore(STORE_READ_CACHE)
  const index = store.index('userId')
  const req = index.getAll(userId)

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const records: ReadCacheEntry<TData>[] = req.result || []
      const filtered = records.filter((r) => r.userId === userId && r.domain === domain)
      resolve(filtered)
    }
    req.onerror = () => reject(req.error)
  })
}

/* ========================================================================= */
/* 3. EVIDENCE BLOBS API (Strict User-Partitioned Binary Storage)            */
/* ========================================================================= */

/**
 * Saves binary evidence Blob or ArrayBuffer durably in IndexedDB.
 */
export async function saveEvidenceBlob(
  userId: string,
  id: string,
  blob: Blob | ArrayBuffer,
  mimeType: string,
  sha256: string
): Promise<EvidenceBlobEntry> {
  if (!userId || userId.trim() === '') {
    throw new Error('[OfflineDB] Cannot save evidence blob without authenticated userId.')
  }

  const entry: EvidenceBlobEntry = {
    id,
    userId,
    blob,
    mimeType,
    sha256,
    createdAt: new Date().toISOString(),
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_EVIDENCE_BLOBS, 'readwrite')
  const store = tx.objectStore(STORE_EVIDENCE_BLOBS)
  store.put(entry)

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  return entry
}

/**
 * Retrieves a durable binary evidence entry for the specified user.
 */
export async function getEvidenceBlob(
  userId: string,
  id: string
): Promise<EvidenceBlobEntry | null> {
  if (!userId || userId.trim() === '') {
    return null
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_EVIDENCE_BLOBS, 'readonly')
  const store = tx.objectStore(STORE_EVIDENCE_BLOBS)
  const req = store.get(id)

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const record: EvidenceBlobEntry = req.result
      if (!record || record.userId !== userId) {
        resolve(null)
      } else {
        resolve(record)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieves a durable evidence blob by SHA-256 for the specified user.
 */
export async function getEvidenceBlobBySha256(
  userId: string,
  sha256: string
): Promise<EvidenceBlobEntry | null> {
  if (!userId || userId.trim() === '') {
    return null
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_EVIDENCE_BLOBS, 'readonly')
  const store = tx.objectStore(STORE_EVIDENCE_BLOBS)
  const index = store.index('userId')
  const req = index.getAll(userId)

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const records: EvidenceBlobEntry[] = req.result || []
      const match = records.find((r) => r.userId === userId && r.sha256 === sha256)
      resolve(match || null)
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Removes an evidence blob once successfully confirmed on the server.
 */
export async function removeEvidenceBlob(userId: string, id: string): Promise<void> {
  if (!userId || userId.trim() === '') {
    throw new Error('[OfflineDB] Cannot remove evidence blob without authenticated userId.')
  }

  const db = await openOfflineDB()
  const tx = db.transaction(STORE_EVIDENCE_BLOBS, 'readwrite')
  const store = tx.objectStore(STORE_EVIDENCE_BLOBS)
  const getReq = store.get(id)

  await new Promise<void>((resolve, reject) => {
    getReq.onsuccess = () => {
      const record: EvidenceBlobEntry = getReq.result
      if (!record) {
        resolve()
        return
      }
      if (record.userId !== userId) {
        reject(new Error('[OfflineDB] Security violation: cannot remove evidence blob belonging to another user.'))
        return
      }
      store.delete(id)
      resolve()
    }
    getReq.onerror = () => reject(getReq.error)
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
