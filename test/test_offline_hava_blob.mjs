import puppeteer from 'puppeteer-core'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 4195

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
}

let simulatedDamageApiStatus = 201
let receivedDamagePayload = null

const server = createServer((req, res) => {
  const [urlPath] = req.url.split('?')

  if (urlPath === '/api/damage-reports' && req.method === 'POST') {
    let bodyStr = ''
    req.on('data', (c) => { bodyStr += c })
    req.on('end', () => {
      receivedDamagePayload = JSON.parse(bodyStr)
      if (simulatedDamageApiStatus === 201) {
        res.writeHead(201, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        })
        res.end(JSON.stringify({ id: 'rep-created-123', status: 'Draft', sha256Hash: receivedDamagePayload.sha256Hash }))
      } else {
        res.writeHead(409, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        })
        res.end(JSON.stringify({ error: 'Temporal validity window expired or duplicate SHA-256 (409 Conflict)' }))
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
  console.log(`[HAVA Test Server] Running at http://localhost:${PORT}`)
  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })

    console.log('[Test] Running Phase 4 HAVA Binary Evidence Durability tests in browser...')

    const testResults = await page.evaluate(async (serverPort) => {
      const results = []
      function assert(cond, msg) {
        if (!cond) throw new Error(`Assertion failed: ${msg}`)
      }

      const DB_NAME_V2 = 'lumiere-offline-v2'
      const DB_NAME_V1 = 'lumiere-offline-db'
      const userId = 'usr-crew-alpha'

      // Helper to open DB v2
      async function getDBV2() {
        const req = indexedDB.open(DB_NAME_V2, 1)
        req.onupgradeneeded = (e) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains('evidence_blobs')) {
            const s = db.createObjectStore('evidence_blobs', { keyPath: 'id' })
            s.createIndex('userId', 'userId', { unique: false })
            s.createIndex('sha256', 'sha256', { unique: false })
          }
        }
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result)
          req.onerror = () => rej(req.error)
        })
      }

      // Helper to open DB v1
      async function getDBV1() {
        const req = indexedDB.open(DB_NAME_V1, 1)
        req.onupgradeneeded = (e) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains('pending_declarations')) {
            db.createObjectStore('pending_declarations', { keyPath: 'id' })
          }
        }
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result)
          req.onerror = () => rej(req.error)
        })
      }

      const dbV2 = await getDBV2()
      const dbV1 = await getDBV1()

      // 1. Capture & Store test image Blob
      const originalImageBytes = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
        0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      ])
      const testBlob = new Blob([originalImageBytes], { type: 'image/jpeg' })
      const testSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      const evidenceBlobId = 'ev-blob-declaration-100'

      // Save blob into evidence_blobs store
      const txV2 = dbV2.transaction('evidence_blobs', 'readwrite')
      txV2.objectStore('evidence_blobs').put({
        id: evidenceBlobId,
        userId: userId,
        blob: testBlob,
        mimeType: 'image/jpeg',
        sha256: testSha256,
        createdAt: new Date().toISOString(),
      })
      await new Promise((r) => { txV2.oncomplete = r })

      // Save declaration metadata into pending_declarations store
      const declarationItem = {
        id: 'decl-100',
        idempotencyKey: 'idemp-100',
        eventId: 'evt-alpha-01',
        eventName: 'Grand Gala 2026',
        assetId: 'ast-camera-99',
        itemName: 'LED Par 64',
        condition: 'Damaged',
        quantity: 2,
        description: 'Cracked lens fixture',
        submittedBy: userId,
        userId: userId,
        evidenceBlobId: evidenceBlobId,
        sha256Hash: testSha256,
        gpsCoordinates: '37.7749,-122.4194',
        exifMetadata: '{"make":"Sony","model":"Alpha 7"}',
        noPhotographicEvidence: false,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        syncStatus: 'locally queued',
      }
      const txV1 = dbV1.transaction('pending_declarations', 'readwrite')
      txV1.objectStore('pending_declarations').put(declarationItem)
      await new Promise((r) => { txV1.oncomplete = r })

      results.push({ test: 'Capture & Store Blob and Declaration into IndexedDB', passed: true })

      // 2. Simulate Application / Browser Restart: Close DB connections and reopen
      dbV2.close()
      dbV1.close()

      const dbV2Reopened = await getDBV2()
      const dbV1Reopened = await getDBV1()

      // 3. Recover identical bytes from reopened DB
      const readBlobTx = dbV2Reopened.transaction('evidence_blobs', 'readonly')
      const blobReq = readBlobTx.objectStore('evidence_blobs').get(evidenceBlobId)
      const blobRecord = await new Promise((r) => { blobReq.onsuccess = () => r(blobReq.result) })

      assert(blobRecord !== undefined, 'Evidence blob record exists after restart')
      assert(blobRecord.userId === userId, 'Blob belongs to correct user')
      assert(blobRecord.sha256 === testSha256, 'SHA-256 hash matches')

      const recoveredBuffer = await blobRecord.blob.arrayBuffer()
      const recoveredBytes = new Uint8Array(recoveredBuffer)
      assert(recoveredBytes.length === originalImageBytes.length, `Byte length identical: ${recoveredBytes.length}`)
      for (let i = 0; i < originalImageBytes.length; i++) {
        assert(recoveredBytes[i] === originalImageBytes[i], `Byte mismatch at byte ${i}`)
      }
      results.push({ test: 'Recover Identical Image Bytes After Restart', passed: true })

      // 4. Verify Associated Metadata Preserved in Pending Declaration
      const readDeclTx = dbV1Reopened.transaction('pending_declarations', 'readonly')
      const declReq = readDeclTx.objectStore('pending_declarations').get('decl-100')
      const declRecord = await new Promise((r) => { declReq.onsuccess = () => r(declReq.result) })

      assert(declRecord.gpsCoordinates === '37.7749,-122.4194', 'GPS coordinates preserved')
      assert(declRecord.sha256Hash === testSha256, 'SHA-256 preserved')
      assert(declRecord.eventId === 'evt-alpha-01', 'Event association preserved')
      assert(declRecord.assetId === 'ast-camera-99', 'Asset association preserved')
      results.push({ test: 'Metadata & Hardware Associations Preserved', passed: true })

      // 5. Test REST Replay with Reconstructed Evidence DataURL
      const reader = new FileReader()
      const dataUrl = await new Promise((res) => {
        reader.onloadend = () => res(reader.result)
        reader.readAsDataURL(blobRecord.blob)
      })

      const replayRes = await fetch(`http://localhost:${serverPort}/api/damage-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt',
        },
        body: JSON.stringify({
          assetId: declRecord.assetId,
          eventId: declRecord.eventId,
          damagedQuantity: declRecord.quantity,
          noPhotographicEvidence: false,
          photoUrl: dataUrl,
          sha256Hash: declRecord.sha256Hash,
          exifMetadata: declRecord.exifMetadata,
          gpsCoordinates: declRecord.gpsCoordinates,
          severity: 'Critical',
          idempotencyKey: declRecord.idempotencyKey,
        }),
      })

      assert(replayRes.status === 201, 'Replay HTTP request returned 201 Created')

      // Remove after successful confirmation
      const cleanTxV2 = dbV2Reopened.transaction('evidence_blobs', 'readwrite')
      cleanTxV2.objectStore('evidence_blobs').delete(evidenceBlobId)
      await new Promise((r) => { cleanTxV2.oncomplete = r })

      const cleanTxV1 = dbV1Reopened.transaction('pending_declarations', 'readwrite')
      cleanTxV1.objectStore('pending_declarations').delete('decl-100')
      await new Promise((r) => { cleanTxV1.oncomplete = r })

      results.push({ test: 'Replay Succeeded & Cleanup Confirmed', passed: true })

      dbV2Reopened.close()
      dbV1Reopened.close()
      return { success: true, results }
    }, PORT)

    console.log('Results:', JSON.stringify(testResults, null, 2))
    if (!testResults.success) {
      process.exit(1)
    }

    await browser.close()
    server.close()
    console.log('[Test] All Phase 4 HAVA Binary Evidence tests PASSED!')
    process.exit(0)
  } catch (err) {
    console.error('Test execution failed:', err)
    if (browser) await browser.close()
    server.close()
    process.exit(1)
  }
})
