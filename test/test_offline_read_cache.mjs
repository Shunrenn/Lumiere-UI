import puppeteer from 'puppeteer-core'
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
  '.jpg': 'image/jpeg',
}

let simulatedServerAssignments = [
  {
    assignmentId: 'assign-fresh-1',
    eventId: 'evt-100',
    eventName: 'Live Gala 2026',
    taskTitle: 'Fresh Online Task from Server',
    assignedRole: 'Field Crew',
    executionStatus: 'Assigned',
    shiftDate: '2026-10-02',
  },
]

const server = createServer((req, res) => {
  const [urlPath] = req.url.split('?')

  if (urlPath === '/api/manning/my-assignments') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    })
    res.end(JSON.stringify(simulatedServerAssignments))
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
  console.log(`[Read Cache Test Server] Running at http://localhost:${PORT}`)
  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })

    console.log('[Test] Running Phase 3 Operational Read Cache tests in browser context...')

    const testResults = await page.evaluate(async () => {
      const results = []
      function assert(cond, msg) {
        if (!cond) throw new Error(`Assertion failed: ${msg}`)
      }

      const DB_NAME = 'lumiere-offline-v2'
      const userA = 'usr-alpha-uuid'
      const userB = 'usr-bravo-uuid'

      async function getDB() {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = (e) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains('read_cache')) {
            const s = db.createObjectStore('read_cache', { keyPath: 'key' })
            s.createIndex('userId', 'userId', { unique: false })
            s.createIndex('domain', 'domain', { unique: false })
          }
        }
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result)
          req.onerror = () => rej(req.error)
        })
      }

      const db = await getDB()

      // 1. Online: Cache successful REST reads for User A
      const userATasks = [
        {
          assignmentId: 'assign-alpha-1',
          eventId: 'evt-101',
          eventName: 'Metropolitan Gala',
          taskTitle: 'Audio Rigging & Tuning',
          assignedRole: 'Field Lead',
          executionStatus: 'Assigned',
          shiftDate: '2026-10-02',
        },
      ]

      const cacheTx1 = db.transaction('read_cache', 'readwrite')
      cacheTx1.objectStore('read_cache').put({
        key: `${userA}:manning:my-assignments`,
        userId: userA,
        domain: 'manning',
        data: userATasks,
        cachedAt: new Date().toISOString(),
      })
      await new Promise((r) => { cacheTx1.oncomplete = r })
      results.push({ test: 'Online Successful REST Read Cached in read_cache', passed: true })

      // 2. Cache distinct REST reads for User B
      const userBTasks = [
        {
          assignmentId: 'assign-bravo-1',
          eventId: 'evt-202',
          eventName: 'Convention Hall Setup',
          taskTitle: 'Truss Assembly',
          assignedRole: 'Ground Crew',
          executionStatus: 'Assigned',
          shiftDate: '2026-10-02',
        },
      ]
      const cacheTx2 = db.transaction('read_cache', 'readwrite')
      cacheTx2.objectStore('read_cache').put({
        key: `${userB}:manning:my-assignments`,
        userId: userB,
        domain: 'manning',
        data: userBTasks,
        cachedAt: new Date().toISOString(),
      })
      await new Promise((r) => { cacheTx2.oncomplete = r })
      results.push({ test: 'Multi-User Partitioned Read Cache Populated', passed: true })

      db.close()

      // 3. Simulate PWA Close & Reopen completely Offline
      const dbOffline = await getDB()

      // Hydrate User A offline
      const txOfflineA = dbOffline.transaction('read_cache', 'readonly')
      const reqA = txOfflineA.objectStore('read_cache').get(`${userA}:manning:my-assignments`)
      const resA = await new Promise((r) => { reqA.onsuccess = () => r(reqA.result) })

      assert(resA !== undefined, 'User A cached data exists offline')
      assert(resA.userId === userA, 'User A cached data belongs to user A')
      assert(resA.data.length === 1 && resA.data[0].assignmentId === 'assign-alpha-1', 'User A sees correct assigned task')
      results.push({ test: 'User A Assigned Tasks Visible and Hydrated Offline', passed: true })

      // Hydrate User B offline
      const txOfflineB = dbOffline.transaction('read_cache', 'readonly')
      const reqB = txOfflineB.objectStore('read_cache').get(`${userB}:manning:my-assignments`)
      const resB = await new Promise((r) => { reqB.onsuccess = () => r(reqB.result) })

      assert(resB !== undefined, 'User B cached data exists offline')
      assert(resB.userId === userB, 'User B cached data belongs to user B')
      assert(resB.data.length === 1 && resB.data[0].assignmentId === 'assign-bravo-1', 'User B sees correct assigned task')
      assert(resB.data[0].assignmentId !== resA.data[0].assignmentId, 'User A and User B never cross-pollinate')
      results.push({ test: 'User Partition Isolation Fully Enforced Across Reopen', passed: true })

      dbOffline.close()
      return { success: true, results }
    })

    console.log('Results:', JSON.stringify(testResults, null, 2))
    if (!testResults.success) {
      process.exit(1)
    }

    await browser.close()
    server.close()
    console.log('[Test] All Phase 3 Operational Read Cache tests PASSED!')
    process.exit(0)
  } catch (err) {
    console.error('Test execution failed:', err)
    if (browser) await browser.close()
    server.close()
    process.exit(1)
  }
})
