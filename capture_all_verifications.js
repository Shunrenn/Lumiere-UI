import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\de605531-c059-4d0b-85c3-a9281db2bc63'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function clickByText(page, selector, textSubstr) {
  const elements = await page.$$(selector)
  for (const el of elements) {
    const text = await page.evaluate((e) => e.textContent, el)
    if (text && text.includes(textSubstr)) {
      await el.click()
      return true
    }
  }
  return false
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

  // Reload page into authenticated state
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await sleep(1500)
  console.log('App loaded into Warehouse HomePage')

  // 1. (a) SIMULATION TAB SCREENSHOT
  console.log('1. Simulation Tab Screenshot...')
  await clickByText(page, 'div, button, a', 'Asset Catalog')
  await sleep(1200)

  await clickByText(page, 'button', 'Bespoke')
  await sleep(800)

  const assetCards = await page.$$('div.cursor-pointer, [role="button"]')
  if (assetCards.length > 0) {
    await assetCards[0].click()
    await sleep(1000)
  }

  await clickByText(page, 'button', 'Simulation')
  await sleep(1000)

  await page.screenshot({ path: path.join(OUT_DIR, 'simulation_tab_5_attempts.png') })
  console.log('✓ Saved (a) simulation_tab_5_attempts.png')

  // Close AssetDetailModal
  await page.keyboard.press('Escape')
  await sleep(500)
  const exitBtn1 = await page.$('button[aria-label*="Close"], button[aria-label*="return"]')
  if (exitBtn1) await exitBtn1.click().catch(() => {})
  await sleep(1000)

  // 2. (b) GANTT CHART IN BOTH MODES SCREENSHOTS
  console.log('2. Gantt Chart Screenshots...')
  await clickByText(page, 'div, button, a', 'Production & Fabrication')
  await sleep(1200)

  await clickByText(page, 'button', 'Gantt Schedule')
  await sleep(1000)

  await clickByText(page, 'button', 'Event-Grouped')
  await sleep(800)
  await page.screenshot({ path: path.join(OUT_DIR, 'gantt_event_grouped.png') })
  console.log('✓ Saved (b1) gantt_event_grouped.png')

  await clickByText(page, 'button', 'Consolidated')
  await sleep(800)
  await page.screenshot({ path: path.join(OUT_DIR, 'gantt_consolidated.png') })
  console.log('✓ Saved (b2) gantt_consolidated.png')

  // 3. (c) AMBER FLAG DELAY EXTENSION SCREENSHOT
  console.log('3. Amber Flag Delay Screenshot...')
  await clickByText(page, 'button', 'Flag Delay')
  await sleep(1000)

  const reasonInput = await page.$('textarea, input[type="text"]')
  if (reasonInput) {
    await reasonInput.type('Custom paint curing delay + material hold')
  }

  await clickByText(page, 'button', 'Confirm & Flag Delay') || await clickByText(page, 'button', 'Flag Delay')
  await sleep(1200)

  await page.screenshot({ path: path.join(OUT_DIR, 'gantt_amber_flag_delay.png') })
  console.log('✓ Saved (c) gantt_amber_flag_delay.png')

  // 4. LOCKED BASELINE SNAPSHOT BEHAVIOR VERIFICATION
  console.log('4. Locked Baseline Snapshot Verification...')

  // Step 4.1: Schedule Item 1 (Job #1)
  await clickByText(page, 'button', 'Schedule Bespoke Fabrication') || await clickByText(page, 'button', 'Schedule Bespoke Item') || await clickByText(page, 'button', 'Schedule Bespoke')
  await sleep(1000)

  await clickByText(page, 'button', 'Confirm & Place on Gantt') || await clickByText(page, 'button', 'Confirm & Schedule Production')
  await sleep(1200)

  // Step 4.2: Exit Production, open Asset Catalog -> Bespoke -> Custom Entrance Archway -> Simulation tab
  const closeProdBtn = await page.$('button[aria-label*="Close"], button[aria-label*="return"]')
  if (closeProdBtn) await closeProdBtn.click().catch(() => {})
  await sleep(1000)

  await clickByText(page, 'div, button, a', 'Asset Catalog')
  await sleep(1200)
  await clickByText(page, 'button', 'Bespoke')
  await sleep(800)

  const cards2 = await page.$$('div.cursor-pointer, [role="button"]')
  if (cards2.length > 0) {
    await cards2[0].click()
    await sleep(1000)
  }

  await clickByText(page, 'button', 'Simulation')
  await sleep(1000)

  // Click "+ Add Attempt" button
  await clickByText(page, 'button', 'Add Attempt')
  await sleep(500)

  // Type 350 into input and click Save
  const durationInput = await page.$('input[placeholder*="e.g. 45 min"]')
  if (durationInput) {
    await durationInput.type('350 min')
  }
  await clickByText(page, 'button', 'Save')
  await sleep(1000)

  // Close AssetDetailModal & exit module
  await page.keyboard.press('Escape')
  await sleep(500)
  const closeAssetBtn = await page.$('button[aria-label*="Close"], button[aria-label*="return"]')
  if (closeAssetBtn) await closeAssetBtn.click().catch(() => {})
  await sleep(1000)

  // Step 4.3: Open Production & Fabrication module -> Schedule Item 2 of same Bespoke type
  await clickByText(page, 'div, button, a', 'Production & Fabrication')
  await sleep(1200)
  await clickByText(page, 'button', 'Gantt Schedule')
  await sleep(1000)

  await clickByText(page, 'button', 'Schedule Bespoke Fabrication') || await clickByText(page, 'button', 'Schedule Bespoke Item') || await clickByText(page, 'button', 'Schedule Bespoke')
  await sleep(1000)

  await clickByText(page, 'button', 'Confirm & Place on Gantt') || await clickByText(page, 'button', 'Confirm & Schedule Production')
  await sleep(1500)

  await page.screenshot({ path: path.join(OUT_DIR, 'locked_baseline_snapshot_verification.png') })
  console.log('✓ Saved locked_baseline_snapshot_verification.png')

  // 5. OVER-ALLOCATION WARNING VERIFICATION
  console.log('5. Over-Allocation Warning Verification...')
  for (let i = 0; i < 2; i++) {
    await clickByText(page, 'button', 'Schedule Bespoke Fabrication') || await clickByText(page, 'button', 'Schedule Bespoke Item') || await clickByText(page, 'button', 'Schedule Bespoke')
    await sleep(1000)

    const inputs = await page.$$('input[type="number"]')
    if (inputs.length >= 2) {
      await inputs[1].click({ clickCount: 3 })
      await inputs[1].type('5')
    }

    await clickByText(page, 'button', 'Confirm & Place on Gantt') || await clickByText(page, 'button', 'Confirm & Schedule Production')
    await sleep(1200)
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'over_allocation_warning.png') })
  console.log('✓ Saved over_allocation_warning.png')

  console.log('All verification tasks completed successfully!')
  await browser.close()
}

run().catch((err) => {
  console.error('Execution error:', err)
  process.exit(1)
})
