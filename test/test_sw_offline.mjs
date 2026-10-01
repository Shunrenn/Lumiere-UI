import puppeteer from 'puppeteer-core'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 4198

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

    // 1. Initial online load
    console.log('[SW Test] Step 1: Initial online load...')
    await page.goto(`http://localhost:${PORT}/ground-crew`, { waitUntil: 'networkidle0' })

    // Explicitly register and wait for ready in page context
    console.log('[SW Test] Step 2: Ensuring Service Worker registration & cache...')
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) throw new Error('ServiceWorker not supported')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
    })
    // Give SW time to finish caching shell assets
    await new Promise((r) => setTimeout(r, 2000))

    // 2. Set browser to OFFLINE mode
    console.log('[SW Test] Step 3: Setting browser to OFFLINE mode...')
    const client = await page.target().createCDPSession()
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    })

    // 3. Reload while OFFLINE
    console.log('[SW Test] Step 4: Reloading /ground-crew route while OFFLINE...')
    await page.reload({ waitUntil: 'load' })

    // 4. Verify DOM and application shell rendered offline
    const pageTitle = await page.title()
    const rootHasContent = await page.evaluate(() => {
      const root = document.getElementById('root')
      return root && root.children.length > 0
    })

    console.log(`[SW Test] Page title: "${pageTitle}", Root rendered: ${rootHasContent}`)

    if (!rootHasContent) {
      throw new Error('Application root failed to render while offline!')
    }

    console.log('[SW Test] Service Worker offline shell reload SUCCESS!')
    await browser.close()
    server.close()
    process.exit(0)
  } catch (err) {
    console.error('[SW Test] FAILED:', err)
    if (browser) await browser.close()
    server.close()
    process.exit(1)
  }
})
