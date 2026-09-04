import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\de605531-c059-4d0b-85c3-a9281db2bc63'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function clickBtn(page, textSubstr) {
  const ok = await page.evaluate((text) => {
    const btns = Array.from(document.querySelectorAll('button, a'))
    const target = btns.find((b) => b.textContent.toLowerCase().includes(text.toLowerCase()))
    if (target) {
      target.click()
      return true
    }
    return false
  }, textSubstr)
  if (ok) await sleep(800)
  return ok
}

async function run() {
  console.log('Launching Edge browser...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  // Pre-seed localStorage auth user
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const mockUser = {
      id: 'mock-warehouse-001',
      email: 'warehouseops@lumiere.com',
      name: 'Warehouse Ops Manager',
      role: 'Warehouse Manager',
      portal: 'web',
      fullWarehouseAccess: true,
      temporaryPassword: false,
    }
    localStorage.setItem('_lumiere_auth_user', JSON.stringify(mockUser))
    localStorage.setItem('_lumiere_auth_portal', 'web')
  })

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await sleep(1500)

  // 1. (a) SIMULATION TAB SCREENSHOT
  console.log('1. Opening Asset Catalog & Bespoke Simulation Tab...')
  await clickBtn(page, 'asset catalog')
  await sleep(1200)

  // Click on Bespoke filter pill
  await clickBtn(page, 'bespoke')
  await sleep(800)

  // Click on "Custom Monogram Backdrop" card button
  await clickBtn(page, 'custom monogram backdrop')
  await sleep(1200)

  // Click "Simulation" tab in modal
  await clickBtn(page, 'simulation')
  await sleep(1000)

  await page.screenshot({ path: path.join(OUT_DIR, 'simulation_tab_5_attempts.png') })
  console.log('✓ Saved (a) simulation_tab_5_attempts.png')

  // Close AssetDetailModal & exit companion panel
  await page.keyboard.press('Escape')
  await sleep(600)
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label*="Close"]')
    if (closeBtn) closeBtn.click()
  })
  await sleep(1000)

  // 2. (b) GANTT CHART IN BOTH MODES SCREENSHOTS
  console.log('2. Opening Production & Fabrication module...')
  await clickBtn(page, 'production & fabrication')
  await sleep(1200)

  // Click "Gantt Schedule" tab
  await clickBtn(page, 'gantt schedule')
  await sleep(1000)

  // View mode: Event-Grouped
  await clickBtn(page, 'event-grouped')
  await sleep(800)
  await page.screenshot({ path: path.join(OUT_DIR, 'gantt_event_grouped.png') })
  console.log('✓ Saved (b1) gantt_event_grouped.png')

  // View mode: Consolidated
  await clickBtn(page, 'consolidated')
  await sleep(800)
  await page.screenshot({ path: path.join(OUT_DIR, 'gantt_consolidated.png') })
  console.log('✓ Saved (b2) gantt_consolidated.png')

  // 3. (c) AMBER FLAG DELAY EXTENSION SCREENSHOT
  console.log('3. Triggering Flag Delay modal...')
  await clickBtn(page, 'flag delay')
  await sleep(1000)

  const reasonInput = await page.$('textarea')
  if (reasonInput) {
    await reasonInput.type('Custom paint curing delay + material hold')
  }
  await clickBtn(page, 'confirm & flag delay')
  await sleep(1200)

  await page.screenshot({ path: path.join(OUT_DIR, 'gantt_amber_flag_delay.png') })
  console.log('✓ Saved (c) gantt_amber_flag_delay.png')

  // 4. LOCKED BASELINE SNAPSHOT BEHAVIOR VERIFICATION
  console.log('4. Verifying Locked Baseline Snapshot Behavior...')

  // Step 4.1: Schedule Item #1 of Bespoke type
  await clickBtn(page, 'schedule bespoke')
  await sleep(1000)
  await clickBtn(page, 'confirm & place on gantt')
  await sleep(1200)

  // Step 4.2: Exit Production, open Asset Catalog -> Custom Monogram Backdrop -> Simulation tab
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label*="Close"]')
    if (closeBtn) closeBtn.click()
  })
  await sleep(1000)

  await clickBtn(page, 'asset catalog')
  await sleep(1200)
  await clickBtn(page, 'bespoke')
  await sleep(800)
  await clickBtn(page, 'custom monogram backdrop')
  await sleep(1200)

  await clickBtn(page, 'simulation')
  await sleep(1000)

  // Click "+ Add Attempt" button
  await clickBtn(page, 'add attempt')
  await sleep(500)

  // Type 300 min into input and save
  const durInput = await page.$('input[placeholder*="e.g. 45 min"]')
  if (durInput) {
    await durInput.type('300 min')
  }
  await clickBtn(page, 'save')
  await sleep(1000)

  // Close AssetDetailModal & exit companion panel
  await page.keyboard.press('Escape')
  await sleep(600)
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label*="Close"]')
    if (closeBtn) closeBtn.click()
  })
  await sleep(1000)

  // Step 4.3: Open Production module -> Schedule Item #2 of same Bespoke asset type
  await clickBtn(page, 'production & fabrication')
  await sleep(1200)
  await clickBtn(page, 'gantt schedule')
  await sleep(1000)

  await clickBtn(page, 'schedule bespoke')
  await sleep(1000)
  await clickBtn(page, 'confirm & place on gantt')
  await sleep(1500)

  await page.screenshot({ path: path.join(OUT_DIR, 'locked_baseline_snapshot_verification.png') })
  console.log('✓ Saved locked_baseline_snapshot_verification.png')

  // 5. OVER-ALLOCATION WARNING VERIFICATION
  console.log('5. Triggering Over-Allocation Warning...')
  for (let i = 0; i < 2; i++) {
    await clickBtn(page, 'schedule bespoke')
    await sleep(1000)

    const inputs = await page.$$('input[type="number"]')
    if (inputs.length >= 2) {
      await inputs[1].click({ clickCount: 3 })
      await inputs[1].type('5')
    }

    await clickBtn(page, 'confirm & place on gantt')
    await sleep(1200)
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'over_allocation_warning.png') })
  console.log('✓ Saved over_allocation_warning.png')

  console.log('All 6 verification screenshots saved successfully!')
  await browser.close()
}

run().catch((err) => {
  console.error('Execution error:', err)
  process.exit(1)
})
