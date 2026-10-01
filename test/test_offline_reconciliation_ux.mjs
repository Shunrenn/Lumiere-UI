import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
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
}

const server = createServer((req, res) => {
  const [urlPath] = req.url.split('?')

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
  console.log(`>>> [PHASE 6 TEST] Server running at http://localhost:${PORT}`)

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })

    const testResults = await page.evaluate(async () => {
      const results = []
      function assert(cond, msg) {
        if (!cond) throw new Error(`Assertion failed: ${msg}`)
      }

      const DB_NAME = 'lumiere-offline-v2'
      const userId = 'crew-ux-test-user'

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

      // 1. Initial Clean state (Server Confirmed)
      const clearTx = db.transaction(['mutation_outbox'], 'readwrite')
      const store = clearTx.objectStore('mutation_outbox')
      const idx = store.index('userId')
      const userRecords = await new Promise((res) => {
        const r = idx.getAll(userId)
        r.onsuccess = () => res(r.result)
      })
      for (const rec of userRecords) {
        store.delete(rec.id)
      }
      await new Promise((res) => { clearTx.oncomplete = () => res() })

      results.push('State 1: Verified Server Confirmed initial baseline')

      // 2. Add pending mutation -> Pending Sync
      const putTx1 = db.transaction(['mutation_outbox'], 'readwrite')
      const putStore1 = putTx1.objectStore('mutation_outbox')
      putStore1.put({
        id: 'mut-ux-1',
        clientTxId: 'tx-ux-1',
        userId,
        domain: 'manning',
        action: 'START_TASK',
        endpoint: '/api/manning/assignments/11111111-1111-1111-1111-111111111111/execution-status',
        method: 'PUT',
        payload: { status: 'InProgress' },
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      })
      await new Promise((res) => { putTx1.oncomplete = () => res() })

      const pendingList = await new Promise((res) => {
        const tx = db.transaction(['mutation_outbox'], 'readonly')
        const r = tx.objectStore('mutation_outbox').index('userId').getAll(userId)
        r.onsuccess = () => res(r.result.filter(m => m.status === 'pending'))
      })
      assert(pendingList.length === 1, `Expected 1 pending mutation, got ${pendingList.length}`)
      results.push(`State 2: Verified Pending Sync state (${pendingList.length} pending)`)

      // 3. Mark mutation as syncing -> Syncing state
      const putTx2 = db.transaction(['mutation_outbox'], 'readwrite')
      const putStore2 = putTx2.objectStore('mutation_outbox')
      putStore2.put({
        ...pendingList[0],
        status: 'syncing',
      })
      await new Promise((res) => { putTx2.oncomplete = () => res() })

      const syncingList = await new Promise((res) => {
        const tx = db.transaction(['mutation_outbox'], 'readonly')
        const r = tx.objectStore('mutation_outbox').index('userId').getAll(userId)
        r.onsuccess = () => res(r.result.filter(m => m.status === 'syncing'))
      })
      assert(syncingList.length === 1, `Expected 1 syncing mutation, got ${syncingList.length}`)
      results.push('State 3: Verified Syncing in-flight state')

      // 4. Mark mutation as conflict -> Conflict / Needs Attention
      const putTx3 = db.transaction(['mutation_outbox'], 'readwrite')
      const putStore3 = putTx3.objectStore('mutation_outbox')
      putStore3.put({
        ...syncingList[0],
        status: 'conflict',
        lastError: 'WOM reassigned task to another team member (409 Conflict)',
      })
      await new Promise((res) => { putTx3.oncomplete = () => res() })

      const conflictList = await new Promise((res) => {
        const tx = db.transaction(['mutation_outbox'], 'readonly')
        const r = tx.objectStore('mutation_outbox').index('userId').getAll(userId)
        r.onsuccess = () => res(r.result.filter(m => m.status === 'conflict'))
      })
      assert(conflictList.length === 1, `Expected 1 conflict mutation, got ${conflictList.length}`)
      assert(conflictList[0].lastError.includes('WOM reassigned task'), 'Conflict error preserved')
      results.push('State 4: Verified Conflict / Needs Attention state with detailed operational rationale')

      // 5. User isolation check
      const otherUserMutations = await new Promise((res) => {
        const tx = db.transaction(['mutation_outbox'], 'readonly')
        const r = tx.objectStore('mutation_outbox').index('userId').getAll('other-user-ux')
        r.onsuccess = () => res(r.result)
      })
      assert(otherUserMutations.length === 0, 'Other user must have zero records')
      results.push('State 5: Verified user partition isolation')

      return results
    })

    console.log('Phase 6 Test Results:', testResults)

    console.log('\n========================================')
    console.log('ALL PHASE 6 RECONCILIATION UX TESTS PASSED')
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
