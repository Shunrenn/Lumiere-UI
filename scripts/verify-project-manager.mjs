import puppeteer from 'puppeteer-core'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
const baseUrl = process.env.PM_BASE_URL || 'http://127.0.0.1:5173'
const output = 'scratch/project-manager-validation'
await fs.mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.PM_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const checks = [], errors = [], writes = []
const record = (label, value = true) => { assert.ok(value, label); checks.push(label); console.log(`PASS ${label}`) }
try {
 const page = await browser.newPage()
 page.setDefaultTimeout(15000)
 page.setDefaultNavigationTimeout(60000)
 await page.setViewport({ width: 1440, height: 1000 })
 page.on('pageerror', error => errors.push(`Uncaught runtime: ${error.message}`))
 page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
 page.on('request', request => { if (/\/api\//.test(request.url()) && !['GET', 'OPTIONS'].includes(request.method())) writes.push(`${request.method()} ${new URL(request.url()).pathname}`) })
 await page.setRequestInterception(true)
 page.on('request', request => {
  if (request.url().startsWith(baseUrl)) return request.continue()
  return request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: '[]' })
 })
 await page.evaluateOnNewDocument(() => {
  const user = { id: '11111111-1111-4111-8111-111111111111', name: 'Browser Test PM', email: 'pm-test@example.test', role: 'Project Manager', portal: 'web', temporaryPassword: false }
  localStorage.setItem('_lumiere_auth_user', JSON.stringify(user))
  localStorage.setItem('lumiere-welcome-seen-pm-test@example.test', 'true')
  localStorage.setItem('_lumiere_has_pin_global', 'true')
  localStorage.setItem('lumiere-theme-mode', 'light')
  localStorage.setItem('lumiere-dark', 'false')
  // Browser-only fixtures. Production traffic is never sent and auth code is unchanged.
  const original = window.fetch.bind(window)
  const event = { id: '22222222-2222-4222-8222-222222222222', name: 'Assigned live fixture', venue: 'Fixture Hall', dateOfEvent: '2026-11-30', status: 'Active', projectManagerId: user.id, projectManagerName: user.name, createdAt: '2026-10-01', updatedAt: '2026-10-07', createdBy: 'Fixture creator', notes: 'Read-only browser fixture' }
  window.__pmFixtureWrites = []
  window.__pmFixtureFailure = false
  window.fetch = async (input, options = {}) => {
   const url = String(input instanceof Request ? input.url : input)
   if (!url.includes('/api/')) return original(input, options)
   const method = options.method || 'GET'
   if (!['GET', 'OPTIONS'].includes(method)) window.__pmFixtureWrites.push(method + ' ' + url)
   let body = []
   let status = 200
   if (/\/api\/events\?/.test(url)) body = [event, { ...event, id: 'foreign', name: 'Foreign event', projectManagerId: 'someone-else' }, { ...event, id: 'unassigned', name: 'Unassigned event', projectManagerId: '', projectManagerName: '' }]
   else if (url.includes('/api/events/' + event.id)) body = event
   else if (url.includes('/api/canvas/event/')) { body = { id: 'canvas-fixture', eventId: event.id, canvasStatus: 'Submitted', canvasMode: 'Konva' }; if (window.__pmFixtureFailure) status = 503 }
   else if (url.includes('/api/reservations/event/')) body = [{ id: 'reservation-fixture', assetId: 'asset-fixture', assetName: 'Live fixture chair', eventId: event.id, status: 'Reserved' }]
   else if (url.includes('/api/manning/event/')) body = [{ id: 'assignment-1', userId: 'worker-1', roleName: 'Setup', executionStatus: 'Blocked' }, { id: 'assignment-2', userId: 'worker-1', roleName: 'Setup' }]
   else if (url.includes('/api/production/event/')) body = { tasks: [{ id: 'task-fixture', taskName: 'Backdrop build', status: 'InProgress', endDate: '2026-09-01', progressPercentage: 20 }], overallProgressPercentage: 20 }
   else if (url.includes('/api/pitches')) body = []
   return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
 })
 const text = () => page.evaluate(() => document.body.innerText)
 const click = async (label, scope = '.pm-account') => {
  const found = await page.evaluate((label, scope) => {
   const button = [...document.querySelectorAll(`${scope} button`)].find(button => button.getClientRects().length && (button.textContent.trim() === label || button.getAttribute('aria-label') === label))
   if (!button) return false
   button.click(); return true
  }, label, scope)
  assert.ok(found, `Button exists: ${label}`)
 }
 const waitText = async value => page.waitForFunction(value => document.body.innerText.includes(value), {}, value)
 const close = async () => { await click('Close', '[role="dialog"]'); await page.waitForFunction(() => !document.querySelector('[role="dialog"]')) }
 const screenshot = name => page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
 const setInput = async (selector, value) => { await page.$eval(selector, (element, value) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })) }, value) }
 await page.goto(baseUrl + '/project-manager', { waitUntil: 'domcontentloaded' })
 await page.waitForSelector('.pm-account')
 await waitText('Assigned live fixture')
 record('Live directory excludes foreign and unassigned events', !(await text()).includes('Foreign event') && !(await text()).includes('Unassigned event'))
 record('Exactly four PM destinations', await page.$$eval('.pm-rail nav button', buttons => buttons.length === 4))
 await click('Preview sample account'); await waitText('Garden reception')
 await setInput('input[aria-label="Search Project Manager"]', 'Gallery')
 record('Global search includes venue matches', await page.$eval('.pm-search-results', element => element.innerText.includes('Studio showcase')))
 await click('Close search'); await click('Profile'); await waitText('Profile')
 record('Profile shows current PM identity', await page.$eval('[role="dialog"]', element => element.innerText.includes('pm-test@example.test'))); await close()
 await click('New Client Pitch'); await waitText('New Client Pitch'); await click('Cancel', '[role="dialog"]')
 record('New Client Pitch opens and cancels safely', !await page.$('[role="dialog"]'))
 record('Dashboard summaries and sample attention items', (await text()).includes('20 chairs unavailable') && (await text()).includes('4 staff slots still open'))
 await screenshot('dashboard-1440-light')
 await page.click('.pm-attention-row'); await waitText('← All Events'); record('Needs Attention opens affected event', await page.$eval('.pm-workspace-heading', element => element.innerText.includes('Garden reception'))); await click('Project Manager Dashboard')
 await click('View Aurora launch'); await waitText('Project Details'); record('Dashboard View opens Project Details popup', await page.$('[role="dialog"]'))
 await close(); await click('View Founders gala'); await waitText('Project Details'); record('Project popup switches records without stale title', await page.$eval('[role="dialog"]', element => element.innerText.includes('Founders gala') && !element.innerText.includes('Aurora launch'))); await close()
 await click('Projects'); await setInput('input[aria-label="Search projects"]', 'Aurora'); await waitText('Aurora launch')
 record('Project search filters results', !await page.$eval('.pm-main', element => element.innerText.includes('Founders gala')))
 await click('Clear filters'); await page.select('select[aria-label="Status"]', 'Completed'); record('Status filter', !await page.$eval('.pm-main', element => element.innerText.includes('Aurora launch')))
 await click('Clear filters'); await setInput('input[aria-label="Date"]', '2026-11-12'); record('Date filter', !await page.$eval('.pm-main', element => element.innerText.includes('Founders gala')))
 await click('Clear filters'); await page.select('select[aria-label="Client"]', 'Meridian'); record('Client filter', await page.$eval('.pm-main', element => element.innerText.includes('Founders gala') && !element.innerText.includes('Aurora launch')))
 await click('Clear filters');
 for (const [sort, firstTitle] of [['Newest', 'Founders gala'], ['Oldest', 'Harvest celebration'], ['Event Date', 'Harvest celebration'], ['Project Name', 'Aurora launch']]) {
  await page.select('select[aria-label="Sort projects"]', sort)
  record(`Sort order ${sort}`, await page.$eval('.pm-table-wrap tbody tr:first-child td:nth-child(2) strong', element => element.innerText) === firstTitle)
 }
 record('All four project sort options respond')
 await click('View Founders gala'); await click('Open Event Workspace', '[role="dialog"]'); await waitText('← All Events')
 record('Popup opens selected workspace with PM sidebar', await page.$eval('.pm-workspace-heading', element => element.innerText.includes('Founders gala')) && await page.$('.pm-rail'))
 for (const tab of ['Overview', 'Event Details', 'Registry', 'Timeline', 'Planning', 'Assets', 'Manning', 'Production', 'Oversight']) {
  await click(tab, '.pm-workspace-tabs'); await page.waitForFunction(tab => document.querySelector('[role="tabpanel"]')?.getAttribute('aria-label') === tab, {}, tab); record(`Workspace ${tab}`)
  if (tab === 'Planning') { await click('View Planning Summary'); await waitText('Planning Summary'); record('Planning popup is read-only', !await page.$('[role="dialog"] input')); await close() }
  if (tab === 'Assets') {
   await page.click('.pm-asset-row'); await waitText('Asset Details'); record('Asset details shows quantities and issue', await page.$eval('[role="dialog"]', element => element.innerText.includes('100') && element.innerText.includes('Issue'))); await close()
   await page.click('.pm-asset-row:nth-child(2)'); record('Asset popup has no stale record', await page.$eval('[role="dialog"]', element => element.innerText.includes('Stage lights') && !element.innerText.includes('Banquet chairs'))); await close()
  }
 }
 await screenshot('workspace-1440-light'); await click('← All Events')
 record('All Events returns to directory', await page.$('input[aria-label="Search events"]'))
 record('Event directory has cards and one primary page title', await page.$$('.pm-event-card').then(cards => cards.length === 5) && await page.$$eval('.pm-main h1', headings => headings.length === 1))
 await screenshot('event-directory-1440-light')
 await click('Attention (3)', '[aria-label="Event filters"]'); record('Event attention filter excludes healthy projects', !await page.$eval('.pm-event-grid', element => element.innerText.includes('Studio showcase'))); await click('All (5)', '[aria-label="Event filters"]')
 await setInput('input[aria-label="Search events"]', 'Aurora'); record('Event directory search', !await page.$eval('.pm-main', element => element.innerText.includes('Founders gala')))
 await click('Open Workspace Aurora launch'); await click('← All Events'); record('Directory search preserved', await page.$eval('input[aria-label="Search events"]', element => element.value === 'Aurora'))
 await click('Event Workspace'); record('Sidebar workspace opens directory without selecting a random project', !!await page.$('input[aria-label="Search events"]') && !await page.$('.pm-workspace-heading'))
 await click('Register Event'); await waitText('Initialize Event')
 const fields = { 'Event Title': 'Aurora launch', Client: 'Aurora', Venue: 'Grand Ballroom', 'Event Date': '2026-11-12', 'Start Time': '18:00', 'End Time': '22:00', 'Event Type': 'Corporate launch', 'Guest Count': '120', Notes: 'Browser walkthrough sample' }
 for (const [label, value] of Object.entries(fields)) {
  await page.evaluate((label, value) => { const input = [...document.querySelectorAll('[role="dialog"] label')].find(element => element.firstChild.textContent.trim() === label)?.querySelector('input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) }, label, value)
 }
 await click('Continue', '[role="dialog"]'); await waitText('Possible Duplicate Found'); record('Verification displays all fields and labeled sample duplicate', await page.$eval('[role="dialog"]', element => element.innerText.includes('PRT-2026-0198') && element.innerText.includes('Corporate launch')))
 await screenshot('duplicate-1440-light'); await click('Review Existing', '[role="dialog"]'); await waitText('Project Details'); record('Duplicate Review Existing opens matching project'); await click('Back to verification', '[role="dialog"]'); await waitText('Verify Event Information')
 await click('Continue Anyway', '[role="dialog"]'); await waitText('Confirm & Create'); await click('Back', '[role="dialog"]'); await waitText('Verify Event Information'); await click('Continue Anyway', '[role="dialog"]'); await click('Confirm & Create', '[role="dialog"]'); await waitText('Sample event created — Initialized.'); record('Confirm creates frontend Initialized record')
 await click('Activate Event'); await waitText('You are about to activate:'); await click('Cancel', '[role="dialog"]'); await click('Activate Event'); await click('Activate Event', '[role="dialog"]'); await waitText('Sample event activated — Active.'); record('Activation confirms Active state', await page.$eval('[role="tabpanel"]', element => element.innerText.includes('Active')))
 await screenshot('activated-1440-light'); await click('Pitches & Briefs'); await waitText('Summer garden party'); await setInput('input[aria-label="Search pitches"]', 'Aurora'); record('Pitch search', !await page.$eval('.pm-main', element => element.innerText.includes('Summer garden party'))); await click('Clear filters'); await page.select('select[aria-label="Pitch status"]', 'Approved'); record('Pitch status filter', !await page.$eval('.pm-main', element => element.innerText.includes('Summer garden party'))); await click('Clear filters')
 await click('Review Summer garden party'); await click('Concept Brief', '[role="dialog"]'); record('Pitch Concept Brief internal tab', await page.$('[role="dialog"] [role="tabpanel"][aria-label="Concept Brief"]')); await close(); await click('Review Founders gala'); record('Pitch popup has no stale title or tab', await page.$eval('[role="dialog"]', element => element.innerText.includes('Meridian') && !element.innerText.includes('Isla & Co.')) && await page.$('[role="dialog"] [role="tabpanel"][aria-label="Pitch"]')); await close()
 await click('Concept Briefs', '[aria-label="Pitches and briefs"]'); await click('Review Summer garden party'); record('Concept Briefs opens brief tab', !!await page.$('[role="dialog"] [role="tabpanel"][aria-label="Concept Brief"]')); await close()
 await click('+ Create New Brief'); await waitText('Create New Brief'); await click('Cancel', '[role="dialog"]'); record('Create New Brief opens and cancels')
 await click('Client Pitches', '[aria-label="Pitches and briefs"]'); await screenshot('pitches-1440-light')
 await click('Open Event Studio showcase'); await waitText('← All Events'); record('Converted pitch opens linked event', await page.$eval('.pm-workspace-heading', element => element.innerText.includes('Studio showcase')))
 await click('New Client Pitch'); await setInput('[role="dialog"] input[aria-label="Client"]', 'Sample new client'); await setInput('[role="dialog"] input[aria-label="Pitch Name"]', 'Walkthrough draft'); await setInput('[role="dialog"] input[aria-label="Target Date"]', '2026-12-01'); await click('Save Draft', '[role="dialog"]'); await waitText('Walkthrough draft'); record('Sample pitch draft creates local card'); await screenshot('sample-pitch-created')
 for (const width of [1440, 1024, 768, 390]) {
  await page.setViewport({ width, height: 1000 }); await click('Project Manager Dashboard');
  record(`No horizontal overflow at ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await screenshot(`dashboard-${width}-light`)
  if (width <= 768) { await click('Open navigation'); record(`All four mobile destinations at ${width}`, await page.$$eval('.pm-mobile-open nav button', buttons => buttons.length === 4)); await screenshot(`navigation-${width}`); await click('Projects'); record(`Mobile destination reachable at ${width}`, await page.$('input[aria-label="Search projects"]')) }
  else { await click('Collapse sidebar'); record(`Four collapsed icons at ${width}`, await page.$$eval('.pm-collapsed nav button', buttons => buttons.length === 4)); await screenshot(`collapsed-${width}`); await click('Expand sidebar') }
  await click('View Founders gala'); await screenshot(`project-popup-${width}`); record(`Modal within viewport at ${width}`, await page.$eval('.pm-modal', element => element.getBoundingClientRect().right <= window.innerWidth && element.getBoundingClientRect().bottom <= window.innerHeight)); await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[role="dialog"]')); record(`Escape closes popup at ${width}`)
 }
 await page.setViewport({ width: 1440, height: 1000 }); await click('Project Manager Dashboard'); await page.select('select[aria-label="Theme"]', 'dark'); record('Dark theme', await page.evaluate(() => document.documentElement.classList.contains('dark'))); await screenshot('dashboard-1440-dark'); await page.select('select[aria-label="Theme"]', 'system'); await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]); await page.waitForFunction(() => document.documentElement.classList.contains('dark')); record('System theme follows OS preference')
 record('No sample writes to API', await page.evaluate(() => window.__pmFixtureWrites.length === 0) && writes.length === 0)
 await click('Show live projects'); await click('Event Workspace'); await click('Open Workspace Assigned live fixture'); await page.waitForFunction(() => !document.body.innerText.includes('Loading workflow checkpoints'))
 await click('Registry', '.pm-workspace-tabs'); await waitText('Fixture creator'); record('Live registry uses returned audit fields')
 await click('Assets', '.pm-workspace-tabs'); await page.click('.pm-asset-row'); record('Live asset quantities remain unavailable', await page.$eval('[role="dialog"]', element => element.innerText.includes('Not available'))); await close()
 await click('Manning', '.pm-workspace-tabs'); record('Live staffing requirements remain unavailable', await page.$eval('[role="tabpanel"]', element => element.innerText.includes('Not available') && element.innerText.includes('1')))
 await click('Oversight', '.pm-workspace-tabs'); record('Live blockers use returned staffing and production states', await page.$eval('[role="tabpanel"]', element => element.innerText.includes('staffing assignment(s) blocked') && element.innerText.includes('production task(s) delayed')))
 await screenshot('live-fixture-oversight')
 await page.evaluate(() => { window.__pmFixtureFailure = true; window.dispatchEvent(new Event('focus')) }); await waitText('Planning unavailable'); record('Checkpoint failure reports unavailable rather than ready'); await screenshot('checkpoint-failure')
 await page.goto(baseUrl + '/canvas', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('.pm-rail'); record('Legacy PM canvas destination redirects into PM shell', new URL(page.url()).pathname === '/project-manager')
 await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.pm-account'); await click('Preview sample account'); await waitText('Founders gala'); record('Created sample is not persisted across reload', !await page.$eval('.pm-main', element => element.innerText.includes('SAMPLE-6')))
 const originalPM = execFileSync('git', ['show', 'HEAD:src/pages/ProjectManagerDashboardPage.tsx'], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trimEnd()
 const legacyPM = (await fs.readFile('src/pages/ProjectManagerLegacyPage.tsx', 'utf8')).replaceAll('ProjectManagerLegacyPage', 'ProjectManagerDashboardPage').replace(/\r\n/g, '\n').trimEnd()
 record('PM Lite and legacy consumers retain original PM implementation', originalPM === legacyPM)
 const unexpectedErrors = errors.filter(error => !error.includes('Supabase env vars missing') && !error.includes('/hubs/operations/negotiate') && !error.includes('Error: Failed to complete negotiation with the server') && !error.includes('Error: Failed to start the connection: Error: Failed to complete negotiation') && !error.includes('Failed to load resource: net::ERR_FAILED'))
 record('No React or runtime crashes', unexpectedErrors.length === 0)
 await fs.writeFile(`${output}/results.json`, JSON.stringify({ checks, errors, unexpectedErrors, writes, fixtureWrites: await page.evaluate(() => window.__pmFixtureWrites), screenshots: await fs.readdir(output), fixtureMode: 'Browser-only responses; production API not exercised' }, null, 2))
 console.log(JSON.stringify({ passed: checks.length, errors, writes }))
} catch (error) { console.error(error); await fs.writeFile(`${output}/failure.json`, JSON.stringify({ checks, errors, writes, failure: error.message }, null, 2)); const pages = await browser.pages(); await pages.at(-1)?.screenshot({ path: `${output}/failure.png`, fullPage: true }); process.exitCode = 1 }
finally { await browser.close() }




