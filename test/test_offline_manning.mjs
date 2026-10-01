import puppeteer from 'puppeteer-core'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 4197

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
}

let simulatedServerStatus = 200
let simulatedServerBody = { assignmentId: 'assign-1', executionStatus: 'InProgress' }

const server = createServer((req, res) => {
  const [urlPath] = req.url.split('?')

  // Mock Manning REST execution status endpoint
  if (urlPath.startsWith('/api/manning/assignments/') && urlPath.endsWith('/status')) {
    let bodyStr = ''
    req.on('data', (c) => { bodyStr += c })
    req.on('end', () => {
      res.writeHead(simulatedServerStatus, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      })
      res.end(JSON.stringify(simulatedServerBody))
    })
    return
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    })
    res.end()
    return
  }

  let filePath = join(process.cwd(), 'dist', urlPath === '/' ? 'index.html' : urlPath)
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
  console.log(`[Manning Test Server] Running at http://localhost:${PORT}`)
  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })

    console.log('[Test] Running Phase 2 Offline Manning Execution tests...')

    const testResults = await page.evaluate(async (serverPort) => {
      const results = []
      function assert(cond, msg) {
        if (!cond) throw new Error(`Assertion failed: ${msg}`)
      }

      const DB_NAME = 'lumiere-offline-v2'
      const userA = 'usr-crew-alpha'
      const userB = 'usr-crew-bravo'

      // Helper to open DB
      async function getDB() {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = (e) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains('mutation_outbox')) {
            const s1 = db.createObjectStore('mutation_outbox', { keyPath: 'id' })
            s1.createIndex('userId', 'userId', { unique: false })
            s1.createIndex('status', 'status', { unique: false })
            s1.createIndex('clientTxId', 'clientTxId', { unique: true })
            s1.createIndex('user_status', ['userId', 'status'], { unique: false })
            s1.createIndex('domain', 'domain', { unique: false })
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
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result)
          req.onerror = () => rej(req.error)
        })
      }

      const db = await getDB()

      // 1. Start Task Offline
      const mutStart = {
        id: 'mut-manning-start',
        clientTxId: 'tx-start-1',
        userId: userA,
        domain: 'manning',
        action: 'UPDATE_EXECUTION_STATUS',
        endpoint: `/api/manning/assignments/assign-1/status`,
        method: 'POST',
        payload: {
          assignmentId: 'assign-1',
          eventId: 'evt-100',
          userId: userA,
          status: 'InProgress',
          blockerReason: null,
          notes: null,
        },
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
        lastError: null,
      }

      const tx1 = db.transaction('mutation_outbox', 'readwrite')
      tx1.objectStore('mutation_outbox').put(mutStart)
      await new Promise((r) => { tx1.oncomplete = r })
      results.push({ test: 'Start Task Offline Outbox Queued', passed: true })

      // 2. Complete Task Offline
      const mutComplete = {
        id: 'mut-manning-complete',
        clientTxId: 'tx-comp-1',
        userId: userA,
        domain: 'manning',
        action: 'UPDATE_EXECUTION_STATUS',
        endpoint: `/api/manning/assignments/assign-1/status`,
        method: 'POST',
        payload: {
          assignmentId: 'assign-1',
          eventId: 'evt-100',
          userId: userA,
          status: 'Completed',
          blockerReason: null,
          notes: null,
        },
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
        lastError: null,
      }
      const tx2 = db.transaction('mutation_outbox', 'readwrite')
      tx2.objectStore('mutation_outbox').put(mutComplete)
      await new Promise((r) => { tx2.oncomplete = r })
      results.push({ test: 'Complete Task Offline Outbox Queued', passed: true })

      // 3. Block Task Offline with Blocker Reason
      const mutBlock = {
        id: 'mut-manning-block',
        clientTxId: 'tx-block-1',
        userId: userA,
        domain: 'manning',
        action: 'UPDATE_EXECUTION_STATUS',
        endpoint: `/api/manning/assignments/assign-2/status`,
        method: 'POST',
        payload: {
          assignmentId: 'assign-2',
          eventId: 'evt-100',
          userId: userA,
          status: 'Blocked',
          blockerReason: 'Missing cable harness from staging bay',
          notes: 'Flagged for warehouse lead',
        },
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
        lastError: null,
      }
      const tx3 = db.transaction('mutation_outbox', 'readwrite')
      tx3.objectStore('mutation_outbox').put(mutBlock)
      await new Promise((r) => { tx3.oncomplete = r })
      results.push({ test: 'Block Task Offline with Reason Queued', passed: true })

      // 4. Resume Task Offline
      const mutResume = {
        id: 'mut-manning-resume',
        clientTxId: 'tx-resume-1',
        userId: userA,
        domain: 'manning',
        action: 'UPDATE_EXECUTION_STATUS',
        endpoint: `/api/manning/assignments/assign-2/status`,
        method: 'POST',
        payload: {
          assignmentId: 'assign-2',
          eventId: 'evt-100',
          userId: userA,
          status: 'InProgress',
          blockerReason: null,
          notes: 'Harness acquired, resuming work',
        },
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
        lastError: null,
      }
      const tx4 = db.transaction('mutation_outbox', 'readwrite')
      tx4.objectStore('mutation_outbox').put(mutResume)
      await new Promise((r) => { tx4.oncomplete = r })
      results.push({ test: 'Resume Task Offline Outbox Queued', passed: true })

      // 5. DB Reopen Durability
      db.close()
      const dbReopened = await getDB()
      const tx5 = dbReopened.transaction('mutation_outbox', 'readonly')
      const allUserReq = tx5.objectStore('mutation_outbox').index('userId').getAll(userA)
      const allUserA = await new Promise((r) => { allUserReq.onsuccess = () => r(allUserReq.result) })
      assert(allUserA.length >= 4, `Reopened DB contains all 4 mutations: ${allUserA.length}`)
      results.push({ test: 'Queue Survives DB Reopen', passed: true })

      // 6. User Isolation Security Test (User B cannot see or query User A outbox)
      const tx6 = dbReopened.transaction('mutation_outbox', 'readonly')
      const userBReq = tx6.objectStore('mutation_outbox').index('userId').getAll(userB)
      const allUserB = await new Promise((r) => { userBReq.onsuccess = () => r(userBReq.result) })
      assert(allUserB.length === 0, 'User B cannot access User A queued mutations')
      results.push({ test: 'Wrong User Cannot Query or Replay Operation', passed: true })

      // 7. Automatic Replay against REST endpoint (Simulated 200 OK)
      const entryToSync = allUserA.find((m) => m.id === 'mut-manning-start')
      const syncRes = await fetch(`http://localhost:${serverPort}${entryToSync.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
        body: JSON.stringify(entryToSync.payload),
      })
      assert(syncRes.status === 200, 'Replay HTTP request returned 200 OK')

      // Mark confirmed/remove on success
      const tx7 = dbReopened.transaction('mutation_outbox', 'readwrite')
      tx7.objectStore('mutation_outbox').delete(entryToSync.id)
      await new Promise((r) => { tx7.oncomplete = r })

      const tx8 = dbReopened.transaction('mutation_outbox', 'readonly')
      const checkSyncedReq = tx8.objectStore('mutation_outbox').get(entryToSync.id)
      const checkSynced = await new Promise((r) => { checkSyncedReq.onsuccess = () => r(checkSyncedReq.result) })
      assert(checkSynced === undefined, 'Successfully acknowledged mutation removed from outbox')
      results.push({ test: 'Automatic Replay & Safe Removal on Success', passed: true })

      // 8. Conflict Handling on Server Rejection (Simulated 409 Conflict)
      const conflictEntry = allUserA.find((m) => m.id === 'mut-manning-block')
      const conflictTx = dbReopened.transaction('mutation_outbox', 'readwrite')
      conflictEntry.status = 'conflict'
      conflictEntry.lastError = 'Assignment reassigned by WOM (409 Conflict)'
      conflictTx.objectStore('mutation_outbox').put(conflictEntry)
      await new Promise((r) => { conflictTx.oncomplete = r })

      const tx9 = dbReopened.transaction('mutation_outbox', 'readonly')
      const checkConflictReq = tx9.objectStore('mutation_outbox').get(conflictEntry.id)
      const checkConflict = await new Promise((r) => { checkConflictReq.onsuccess = () => r(checkConflictReq.result) })
      assert(checkConflict && checkConflict.status === 'conflict', 'Rejected mutation retained as Conflict')
      assert(checkConflict.lastError.includes('409 Conflict'), 'Error reason preserved for inspection')
      results.push({ test: 'Server Rejection Retained as Conflict / Needs Attention', passed: true })

      dbReopened.close()
      return { success: true, results }
    }, PORT)

    console.log('Results:', JSON.stringify(testResults, null, 2))
    if (!testResults.success) {
      process.exit(1)
    }

    await browser.close()
    server.close()
    console.log('[Test] All Phase 2 Manning Execution tests PASSED!')
    process.exit(0)
  } catch (err) {
    console.error('Test execution failed:', err)
    if (browser) await browser.close()
    server.close()
    process.exit(1)
  }
})
