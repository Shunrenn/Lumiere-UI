import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\de605531-c059-4d0b-85c3-a9281db2bc63'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
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

  // Click Asset Catalog button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find((b) => b.textContent.toLowerCase().includes('asset catalog'))
    if (btn) btn.click()
  })
  await sleep(1200)

  await page.screenshot({ path: path.join(OUT_DIR, 'test_asset_catalog_opened.png') })
  console.log('Saved test_asset_catalog_opened.png')

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
