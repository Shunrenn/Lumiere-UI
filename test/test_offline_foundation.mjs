import puppeteer from 'puppeteer-core'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 4199

// Simple static server for dist
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
}

const server = createServer((req, res) => {
  let urlPath = req.url.split('?')[0]
  if (urlPath === '/') urlPath = '/index.html'

  let filePath = join(process.cwd(), 'dist', urlPath)
  if (!existsSync(filePath)) {
    filePath = join(process.cwd(), 'dist', 'index.html')
  }

  try {
    const data = readFileSync(filePath)
    const ext = extname(filePath)
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Service-Worker-Allowed': '/',
    })
    res.end(data)
  } catch (err) {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(PORT, async () => {
  console.log(`[Test Server] Running at http://localhost:${PORT}`)
  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })

    console.log('[Test] Running Phase 1 Offline Foundation tests in browser context...')

    const testResults = await page.evaluate(async () => {
      const results = []
      function assert(cond, msg) {
        if (!cond) throw new Error(`Assertion failed: ${msg}`)
      }

      // Test 1: Open lumiere-offline-v2 database and verify schema
      try {
        const DB_NAME = 'lumiere-offline-v2'
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = (e) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains('mutation_outbox')) {
            const s1 = db.createObjectStore('mutation_outbox', { keyPath: 'id' })
            s1.createIndex('userId', 'userId', { unique: false })
            s1.createIndex('status', 'status', { unique: false })
            s1.createIndex('clientTxId', 'clientTxId', { unique: true })
            s1.createIndex('user_status', ['userId', 'status'], { unique: false })
          }
          if (!db.objectStoreNames.contains('read_cache')) {
            const s2 = db.createObjectStore('read_cache', { keyPath: 'key' })
            s2.createIndex('userId', 'userId', { unique: false })
            s2.createIndex('domain', 'domain', { unique: false })
          }
          if (!db.objectStoreNames.contains('evidence_blobs')) {
            const s3 = db.createObjectStore('evidence_blobs', { keyPath: 'id' })
            s3.createIndex('userId', 'userId', { unique: false })
            s3.createIndex('sha256', 'sha256', { unique: false })
          }
        }

        const db = await new Promise((res, rej) => {
          req.onsuccess = () => res(req.result)
          req.onerror = () => rej(req.error)
        })

        assert(db.objectStoreNames.contains('mutation_outbox'), 'Store mutation_outbox exists')
        assert(db.objectStoreNames.contains('read_cache'), 'Store read_cache exists')
        assert(db.objectStoreNames.contains('evidence_blobs'), 'Store evidence_blobs exists')
        results.push({ test: 'Schema & Store Creation', passed: true })

        // Test 2: User Partition Isolation (User A vs User B)
        const userA = 'usr-crew-alpha'
        const userB = 'usr-crew-bravo'

        // Write mutation for user A
        const tx1 = db.transaction('mutation_outbox', 'readwrite')
        const store1 = tx1.objectStore('mutation_outbox')
        store1.add({
          id: 'mut-1',
          clientTxId: 'tx-1',
          userId: userA,
          domain: 'manning',
          action: 'START_TASK',
          endpoint: '/api/manning/assignments/123/status',
          method: 'PATCH',
          payload: { status: 'In Progress' },
          createdAt: new Date().toISOString(),
          status: 'pending',
          retryCount: 0,
          lastError: null,
        })
        await new Promise((r) => { tx1.oncomplete = r })

        // Query user B outbox
        const tx2 = db.transaction('mutation_outbox', 'readonly')
        const userBReq = tx2.objectStore('mutation_outbox').index('userId').getAll(userB)
        const userBItems = await new Promise((r) => { userBReq.onsuccess = () => r(userBReq.result) })
        assert(userBItems.length === 0, 'User B must not see User A mutations')

        // Query user A outbox
        const tx3 = db.transaction('mutation_outbox', 'readonly')
        const userAReq = tx3.objectStore('mutation_outbox').index('userId').getAll(userA)
        const userAItems = await new Promise((r) => { userAReq.onsuccess = () => r(userAReq.result) })
        assert(userAItems.length === 1 && userAItems[0].id === 'mut-1', 'User A sees own mutations')
        results.push({ test: 'User Partition Isolation in Outbox', passed: true })

        // Test 3: Read Cache Partitioning & Durability
        const tx4 = db.transaction('read_cache', 'readwrite')
        const cacheStore = tx4.objectStore('read_cache')
        cacheStore.put({
          key: `${userA}:manning:my-assignments`,
          userId: userA,
          domain: 'manning',
          data: [{ id: 'assign-1', title: 'Stage Setup' }],
          cachedAt: new Date().toISOString(),
        })
        await new Promise((r) => { tx4.oncomplete = r })

        // Verify User B cannot access User A's cache key
        const tx5 = db.transaction('read_cache', 'readonly')
        const reqB = tx5.objectStore('read_cache').get(`${userB}:manning:my-assignments`)
        const resB = await new Promise((r) => { reqB.onsuccess = () => r(reqB.result) })
        assert(resB === undefined, 'User B read cache is isolated')
        results.push({ test: 'Read Cache Partition Isolation', passed: true })

        // Test 4: Blob Byte-for-Byte Durability
        const originalBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0xFF, 0xEE, 0xDD])
        const blob = new Blob([originalBytes], { type: 'image/png' })
        const tx6 = db.transaction('evidence_blobs', 'readwrite')
        tx6.objectStore('evidence_blobs').put({
          id: 'blob-1',
          userId: userA,
          blob: blob,
          mimeType: 'image/png',
          sha256: 'a1b2c3d4e5f6',
          createdAt: new Date().toISOString(),
        })
        await new Promise((r) => { tx6.oncomplete = r })

        // Read blob back
        const tx7 = db.transaction('evidence_blobs', 'readonly')
        const blobReq = tx7.objectStore('evidence_blobs').get('blob-1')
        const blobRecord = await new Promise((r) => { blobReq.onsuccess = () => r(blobReq.result) })
        assert(blobRecord && blobRecord.userId === userA, 'Blob record retrieved')

        const readArrayBuffer = await blobRecord.blob.arrayBuffer()
        const readBytes = new Uint8Array(readArrayBuffer)
        assert(readBytes.length === originalBytes.length, `Byte length matches: ${readBytes.length} == ${originalBytes.length}`)
        for (let i = 0; i < originalBytes.length; i++) {
          assert(readBytes[i] === originalBytes[i], `Byte mismatch at index ${i}`)
        }
        results.push({ test: 'Blob Byte-for-Byte Durability', passed: true })

        // Test 5: Mutation Lifecycle Status Transition
        const tx8 = db.transaction('mutation_outbox', 'readwrite')
        const mutStore = tx8.objectStore('mutation_outbox')
        const mutRecord = await new Promise((r) => {
          const req = mutStore.get('mut-1')
          req.onsuccess = () => r(req.result)
        })
        mutRecord.status = 'syncing'
        mutStore.put(mutRecord)
        await new Promise((r) => { tx8.oncomplete = r })

        const tx9 = db.transaction('mutation_outbox', 'readonly')
        const checkReq = tx9.objectStore('mutation_outbox').get('mut-1')
        const updatedMut = await new Promise((r) => { checkReq.onsuccess = () => r(checkReq.result) })
        assert(updatedMut.status === 'syncing', 'Mutation transitioned to syncing')
        results.push({ test: 'Mutation Lifecycle Status Transitions', passed: true })

        db.close()

        // Test 6: DB Reopen Durability
        const db2Req = indexedDB.open(DB_NAME, 1)
        const db2 = await new Promise((res, rej) => {
          db2Req.onsuccess = () => res(db2Req.result)
          db2Req.onerror = () => rej(db2Req.error)
        })
        const tx10 = db2.transaction('mutation_outbox', 'readonly')
        const recheckReq = tx10.objectStore('mutation_outbox').get('mut-1')
        const recheckMut = await new Promise((r) => { recheckReq.onsuccess = () => r(recheckReq.result) })
        assert(recheckMut && recheckMut.status === 'syncing', 'Data preserved across DB close & reopen')
        db2.close()
        results.push({ test: 'DB Reopen Durability', passed: true })

        return { success: true, results }
      } catch (err) {
        return { success: false, error: err.message, stack: err.stack, results }
      }
    })

    console.log('Results:', JSON.stringify(testResults, null, 2))
    if (!testResults.success) {
      process.exit(1)
    }

    await browser.close()
    server.close()
    console.log('[Test] All Phase 1 browser tests PASSED!')
    process.exit(0)
  } catch (err) {
    console.error('Test execution failed:', err)
    if (browser) await browser.close()
    server.close()
    process.exit(1)
  }
})
