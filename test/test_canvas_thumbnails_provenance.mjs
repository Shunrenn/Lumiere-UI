import puppeteer from 'puppeteer-core'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 4201

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
}

const mockApiEvents = [
  {
    id: 'evt-canon-101',
    name: 'Metropolitan Luxury Gala',
    dateOfEvent: '2026-11-15T00:00:00Z',
    ingressDate: '2026-11-14T00:00:00Z',
    ingressTime: '08:00:00',
    fullStop: '23:00:00',
    venue: 'Shangri-La Fort Grand Ballroom',
    geoClass: 'Local',
    coverUrl: 'https://images.canonical-lumiere.com/covers/gala-real.jpg',
    status: 'Active',
    projectManagerName: 'Victoria Sterling',
  },
  {
    id: 'evt-no-thumb-202',
    name: 'Vanguard Industrial Summit',
    dateOfEvent: '2026-11-20T00:00:00Z',
    ingressDate: '2026-11-19T00:00:00Z',
    ingressTime: '08:00:00',
    fullStop: '22:00:00',
    venue: 'SMX Convention Center',
    geoClass: 'Local',
    coverUrl: null,
    status: 'Active',
    projectManagerName: 'Carlos Mendoza',
  },
  {
    id: 'evt-no-thumb-303',
    name: 'Horizon Tech Keynote',
    dateOfEvent: '2026-11-25T00:00:00Z',
    ingressDate: '2026-11-24T00:00:00Z',
    ingressTime: '08:00:00',
    fullStop: '20:00:00',
    venue: 'Marriott Grand Hall',
    geoClass: 'Local',
    coverUrl: null,
    status: 'Active',
    projectManagerName: 'Alexander Hayes',
  },
  {
    id: 'evt-persisted-designed',
    name: 'Designed Project With Real Export',
    dateOfEvent: '2026-10-05T00:00:00Z',
    ingressDate: '2026-10-04T00:00:00Z',
    ingressTime: '08:00:00',
    fullStop: '20:00:00',
    venue: 'Grand Hyatt Ballroom',
    geoClass: 'Local',
    coverUrl: null,
    status: 'Active',
    projectManagerName: 'Elena Vasseur',
  },
]

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

  if (urlPath === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify({ items: mockApiEvents, totalCount: mockApiEvents.length }))
    return
  }

  if (urlPath === '/api/auth/me' || urlPath === '/api/auth/login') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(
      JSON.stringify({
        token: 'test-jwt',
        user: { email: 'planner@lumiere.com', role: 'Planner', fullName: 'Elena Vasseur' },
        email: 'planner@lumiere.com',
        role: 'Planner',
        fullName: 'Elena Vasseur',
      }),
    )
    return
  }

  const distDir = join(process.cwd(), 'dist')
  let filePath = join(distDir, urlPath === '/' ? 'index.html' : urlPath)

  if (!existsSync(filePath)) {
    filePath = join(distDir, 'index.html')
  }

  const ext = extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  try {
    const content = readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

async function runCanvasProvenanceTests() {
  await new Promise((resolve) => server.listen(PORT, resolve))
  console.log(`[Canvas Test Server] Running at http://localhost:${PORT}`)

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' })

    // Seed local storage with auth and test cards
    await page.evaluate(() => {
      localStorage.setItem('_lumiere_auth_token', 'test-jwt')
      localStorage.setItem('_lumiere_auth_portal', 'web')
      localStorage.setItem(
        '_lumiere_auth_user',
        JSON.stringify({
          id: 'usr-planner-1',
          email: 'planner@lumiere.com',
          name: 'Elena Vasseur',
          role: 'Event Planner',
          portal: 'web',
          temporaryPassword: false,
        }),
      )
      // Custom user mood board with uploaded peg
      const persistedCards = [
        {
          id: 'mb-user-peg-01',
          title: 'Custom Velvet Luxury Concept',
          type: 'Mood Board',
          designer: 'Elena Vasseur',
          collaborators: [],
          eventAlias: '',
          eventDate: 'Oct 01, 2026',
          lastEdited: 'Just now',
          thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          starred: true,
        },
        // Persisted canvas export for design project
        {
          id: 'pc-event-evt-persisted-designed',
          title: 'Designed Project With Real Export',
          type: 'Design',
          designer: 'Elena Vasseur',
          collaborators: [],
          eventAlias: 'DPRE-26',
          eventDate: 'Oct 05, 2026',
          lastEdited: 'Synced from API',
          thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          starred: false,
        }
      ]
      localStorage.setItem('lumiere-recents-cards', JSON.stringify(persistedCards))
      localStorage.setItem('_lumiere_cached_events', JSON.stringify([
        {
          id: 'evt-canon-101',
          refId: 'PRT-2026-EVT1',
          title: 'Metropolitan Luxury Gala',
          client: 'Metropolitan Client',
          venue: 'Shangri-La Fort Grand Ballroom',
          targetDate: '2026-11-15',
          installationStart: '2026-11-14',
          installationEnd: '2026-11-15',
          budget: 5000000,
          status: 'Active',
          moodPlan: '',
          coverUrl: 'https://images.canonical-lumiere.com/covers/gala-real.jpg',
          thumbnail: 'https://images.canonical-lumiere.com/covers/gala-real.jpg',
          projectManagerName: 'Victoria Sterling',
        },
        {
          id: 'evt-no-thumb-202',
          refId: 'PRT-2026-EVT2',
          title: 'Vanguard Industrial Summit',
          client: 'Vanguard Client',
          venue: 'SMX Convention Center',
          targetDate: '2026-11-20',
          installationStart: '2026-11-19',
          installationEnd: '2026-11-20',
          budget: 2000000,
          status: 'Active',
          moodPlan: '',
          coverUrl: '',
          thumbnail: '',
          projectManagerName: 'Carlos Mendoza',
        },
        {
          id: 'evt-no-thumb-303',
          refId: 'PRT-2026-EVT3',
          title: 'Horizon Tech Keynote',
          client: 'Horizon Client',
          venue: 'Marriott Grand Hall',
          targetDate: '2026-11-25',
          installationStart: '2026-11-24',
          installationEnd: '2026-11-25',
          budget: 3000000,
          status: 'Active',
          moodPlan: '',
          coverUrl: '',
          thumbnail: '',
          projectManagerName: 'Alexander Hayes',
        },
        {
          id: 'evt-persisted-designed',
          refId: 'PRT-2026-EVT4',
          title: 'Designed Project With Real Export',
          client: 'Design Client',
          venue: 'Grand Hyatt Ballroom',
          targetDate: '2026-10-05',
          installationStart: '2026-10-04',
          installationEnd: '2026-10-05',
          budget: 4000000,
          status: 'Active',
          moodPlan: '',
          coverUrl: '',
          thumbnail: '',
          projectManagerName: 'Elena Vasseur',
        },
      ]))
    })

    await page.goto(`http://localhost:${PORT}/canvas`, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 2000))

    const testResults = await page.evaluate(() => {
      const results = []

      // Find cards rendered on the page
      const cardElements = Array.from(document.querySelectorAll('div[role="button"]'))
      const allText = document.body.innerText

      // 1. API event with canonical thumbnail -> canonical thumbnail rendered
      const canonImg = document.querySelector('img[src="https://images.canonical-lumiere.com/covers/gala-real.jpg"]')
      results.push({
        test: '1. API event with canonical thumbnail -> canonical thumbnail rendered',
        passed: Boolean(canonImg),
      })

      // 2. API event WITHOUT thumbnail -> neutral placeholder rendered
      const noCoverPlaceholders = Array.from(document.querySelectorAll('div')).filter(
        (d) => d.textContent && d.textContent.includes('No project cover yet'),
      )
      results.push({
        test: '2. API event WITHOUT thumbnail -> neutral placeholder rendered',
        passed: noCoverPlaceholders.length >= 2,
      })

      // 3. API event without thumbnail NEVER receives an unrelated stock/event photograph
      const decorImages = Array.from(document.querySelectorAll('img')).filter((img) =>
        img.src && (
          img.src.includes('chateau-ballroom') ||
          img.src.includes('garden-wedding') ||
          img.src.includes('floral-arch') ||
          img.src.includes('candelabra') ||
          img.src.includes('dance-floor')
        ),
      )
      // Only seed mood board (if present) can have its own peg; API events must NOT have any of these
      const apiEventWithStockImg = Array.from(document.querySelectorAll('div[role="button"]')).some((card) => {
        const titleEl = card.querySelector('p')
        const title = titleEl ? titleEl.textContent : ''
        const hasStock = card.querySelector('img[src*="chateau-ballroom"], img[src*="floral-arch"], img[src*="candelabra"]')
        return title && (title.includes('Vanguard Industrial') || title.includes('Horizon Tech')) && hasStock
      })

      results.push({
        test: '3. API event without thumbnail NEVER receives an unrelated stock/event photograph',
        passed: !apiEventWithStockImg,
      })

      // 4. Two unrelated events without covers do not pretend to have factual photography
      const vanguardCard = cardElements.find((c) => c.textContent && c.textContent.includes('Vanguard Industrial'))
      const horizonCard = cardElements.find((c) => c.textContent && c.textContent.includes('Horizon Tech'))
      const vanguardHasImg = vanguardCard ? Boolean(vanguardCard.querySelector('img')) : false
      const horizonHasImg = horizonCard ? Boolean(horizonCard.querySelector('img')) : false

      results.push({
        test: '4. Two unrelated events without covers do not pretend to have factual photography',
        passed: Boolean(vanguardCard && horizonCard && !vanguardHasImg && !horizonHasImg),
      })

      // 5. Persisted Mood Board cover remains visible
      const userMbCard = cardElements.find((c) => c.textContent && c.textContent.includes('Custom Velvet Luxury Concept'))
      const userMbImg = userMbCard ? userMbCard.querySelector('img') : null
      results.push({
        test: '5. Persisted Mood Board cover remains visible',
        passed: Boolean(userMbImg && userMbImg.src.startsWith('data:image')),
      })

      // 6. Persisted Design Project cover remains visible
      const designedCard = cardElements.find((c) => c.textContent && c.textContent.includes('Designed Project With Real Export'))
      const designedImg = designedCard ? designedCard.querySelector('img') : null
      results.push({
        test: '6. Persisted Design Project cover remains visible',
        passed: Boolean(designedCard && designedImg && designedImg.src.startsWith('data:image')),
      })

      // 7. Production rendering does not inject mock operational events when API events exist
      const hasMockAuraLuxe = allText.includes('Aura Luxe Autumn Gala 2026')
      const hasMockCelestial = allText.includes('Celestial Horizon Presidential Wedding')
      results.push({
        test: '7. Production rendering does not inject mock operational events when API events exist',
        passed: !hasMockAuraLuxe && !hasMockCelestial,
      })

      // 8. "SYNCED FROM API" only applies to actual API-backed records
      const apiCard = cardElements.find((c) => c.textContent && c.textContent.includes('Metropolitan Luxury Gala'))
      const apiHasSyncedLabel = apiCard ? apiCard.textContent.includes('Synced from API') : false
      const mbCard = cardElements.find((c) => c.textContent && c.textContent.includes('Custom Velvet Luxury Concept'))
      const mbHasSyncedLabel = mbCard ? mbCard.textContent.includes('Synced from API') : false

      results.push({
        test: '8. "SYNCED FROM API" only applies to actual API-backed records',
        passed: apiHasSyncedLabel && !mbHasSyncedLabel,
      })

      return results
    })

    console.log('[Test] Running Canvas Thumbnails & Provenance Tests...')
    console.log('Results:', JSON.stringify({ success: testResults.every((r) => r.passed), results: testResults }, null, 2))

    const failed = testResults.filter((r) => !r.passed)
    if (failed.length > 0) {
      console.error(`[Test] ${failed.length} test(s) failed!`)
      process.exit(1)
    } else {
      console.log(`[Test] All ${testResults.length} Canvas Thumbnails & Provenance UI tests PASSED!`)
    }
  } finally {
    await browser.close()
    server.close()
  }
}

runCanvasProvenanceTests().catch((err) => {
  console.error('[Test] Unexpected error:', err)
  server.close()
  process.exit(1)
})
