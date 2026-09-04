import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT_DIR = 'C:\\Users\\T480s\\.gemini\\antigravity-ide\\brain\\de605531-c059-4d0b-85c3-a9281db2bc63'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  console.log('Loaded home page')

  // Check login
  const emailInput = await page.$('input[type="email"]')
  if (emailInput) {
    console.log('Logging in...')
    await emailInput.type('warehouseops@lumiere.com')
    const passInput = await page.$('input[type="password"]')
    if (passInput) await passInput.type('password123')
    const submitBtn = await page.$('button[type="submit"]')
    if (submitBtn) await submitBtn.click()
    await sleep(1500)
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'test_initial.png') })
  console.log('Successfully saved test_initial.png')

  await browser.close()
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
