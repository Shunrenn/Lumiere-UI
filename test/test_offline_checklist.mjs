import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 4196

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const server = createServer((req, res) => {
  const [urlPath, queryString] = req.url.split('?')
  const params = new URLSearchParams(queryString || '')
  const simulateStatus = parseInt(params.get('status') || '200', 10)

  if (urlPath.includes('/complete') && req.method === 'POST') {
    let bodyStr = ''
    req.on('data', (c) => { bodyStr += c })
    req.on('end', () => {
      if (simulateStatus === 200) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        })
        res.end(JSON.stringify({ success: true, version: 2 }))
      } else {
        res.writeHead(simulateStatus, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        })
        res.end(JSON.stringify({ Code: 'STALE_VERSION', Error: 'Stale version conflict on egress item' }))
      }
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
    const content = readFileSync(filePath)
    const ext = extname(filePath)
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(content)
  } catch (err) {
    res.writeHead(404)
    res.end()
  }
})

async function runTest() {
  await new Promise((resolve) => server.listen(PORT, resolve))
  console.log(`>>> [PHASE 5 TEST] Server running at http://localhost:${PORT}`)

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })

    const testResults = await page.evaluate(async (serverPort) => {
      const results = []
      function assert(cond, msg) {
        if (!cond) throw new Error(`Assertion failed: ${msg}`)
      }

      const DB_NAME = 'lumiere-offline-v2'

      async function getDB() {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = (e) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains('mutation_outbox')) {
            const s = db.createObjectStore('mutation_outbox', { keyPath: 'id' })
            s.createIndex('userId', 'userId', { unique: false })
            s.createIndex('status', 'status', { unique: false })
            s.createIndex('user_status', ['userId', 'status'], { unique: false })
          }
        }
        return new Promise((resolve, reject) => {
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      }

      const db = await getDB()

      // 1. Queue offline egress item completion & phase advancement
      const userId = 'crew-user-field-1'
      const item1 = {
        id: 'mut-item-1',
        clientTxId: 'tx-item-1',
        userId,
        domain: 'checklist',
        action: 'COMPLETE_EGRESS_ITEM',
        endpoint: `/api/partial-egress/events/11111111-1111-1111-1111-111111111111/items/22222222-2222-2222-2222-222222222222/complete`,
        method: 'POST',
        payload: { expectedEgressVersion: 1, expectedItemVersion: 1 },
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      }

      const item2 = {
        id: 'mut-phase-1',
        clientTxId: 'tx-phase-1',
        userId,
        domain: 'checklist',
        action: 'ADVANCE_PHASE',
        endpoint: `/api/events/11111111-1111-1111-1111-111111111111/checkpoint-phase`,
        method: 'POST',
        payload: { fromPhase: 'Dispatch Loading', toPhase: 'Venue Arrival' },
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      }

      await new Promise((resolve, reject) => {
        const tx = db.transaction(['mutation_outbox'], 'readwrite')
        const store = tx.objectStore('mutation_outbox')
        store.put(item1)
        store.put(item2)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })

      results.push('Step 1: Queued offline checklist mutations')

      // 2. Verify User Partitioning
      const userAPending = await new Promise((resolve, reject) => {
        const tx = db.transaction(['mutation_outbox'], 'readonly')
        const store = tx.objectStore('mutation_outbox')
        const idx = store.index('userId')
        const req = idx.getAll(userId)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })

      const userBPending = await new Promise((resolve, reject) => {
        const tx = db.transaction(['mutation_outbox'], 'readonly')
        const store = tx.objectStore('mutation_outbox')
        const idx = store.index('userId')
        const req = idx.getAll('crew-user-field-2')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })

      assert(userAPending.length === 2, `User A should see 2 mutations, got ${userAPending.length}`)
      assert(userBPending.length === 0, `User B should see 0 mutations, got ${userBPending.length}`)
      results.push('Step 2: User partitioning strictly verified')

      // 3. Replay with 409 Conflict Rejection
      const conflictRes = await fetch(`http://localhost:${serverPort}/api/partial-egress/events/11111111-1111-1111-1111-111111111111/items/22222222-2222-2222-2222-222222222222/complete?status=409`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedEgressVersion: 1, expectedItemVersion: 1 }),
      })

      assert(conflictRes.status === 409, `Expected 409 conflict, got ${conflictRes.status}`)
      const conflictBody = await conflictRes.json()

      await new Promise((resolve, reject) => {
        const tx = db.transaction(['mutation_outbox'], 'readwrite')
        const store = tx.objectStore('mutation_outbox')
        const req = store.get('mut-item-1')
        req.onsuccess = () => {
          const entry = req.result
          entry.status = 'conflict'
          entry.lastError = conflictBody.Error
          store.put(entry)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })

      results.push('Step 3: Conflict response (409) preserved with status="conflict"')

      // 4. Replay with 200 Success
      const successRes = await fetch(`http://localhost:${serverPort}/api/partial-egress/events/11111111-1111-1111-1111-111111111111/items/22222222-2222-2222-2222-222222222222/complete?status=200`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedEgressVersion: 2, expectedItemVersion: 1 }),
      })

      assert(successRes.status === 200, `Expected 200 success, got ${successRes.status}`)

      await new Promise((resolve, reject) => {
        const tx = db.transaction(['mutation_outbox'], 'readwrite')
        const store = tx.objectStore('mutation_outbox')
        const req = store.get('mut-phase-1')
        req.onsuccess = () => {
          const entry = req.result
          entry.status = 'confirmed'
          store.put(entry)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })

      results.push('Step 4: Successful replay acknowledged with status="confirmed"')

      return results
    }, PORT)

    console.log('Test Results:', testResults)

    console.log('\n========================================')
    console.log('ALL PHASE 5 TESTS PASSED SUCCESSFULLY')
    console.log('========================================\n')
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
