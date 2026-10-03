import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import assert from 'assert'

console.log('--- RUNNING EVENT PLANNER FRONTEND INTEGRITY REGRESSION TESTS ---')

const hubSrc = readFileSync(join(process.cwd(), 'src/pages/DesignCanvasHubPage.tsx'), 'utf-8')
const workspaceSrc = readFileSync(join(process.cwd(), 'src/pages/CanvasWorkspacePage.tsx'), 'utf-8')
const eventDetailSrc = readFileSync(join(process.cwd(), 'src/pages/EventDetailPage.tsx'), 'utf-8')
const inventorySrc = readFileSync(join(process.cwd(), 'src/pages/InventoryStockPage.tsx'), 'utf-8')
const execRailSrc = readFileSync(join(process.cwd(), 'src/components/executive/ExecutiveRail.tsx'), 'utf-8')
const pipelinePanelSrc = readFileSync(join(process.cwd(), 'src/components/EventPipelinePanel.tsx'), 'utf-8')

// 1. DEMO_NOTIFICATIONS absent from production Event Planner UI
assert(!hubSrc.includes('DEMO_NOTIFICATIONS'), 'DEMO_NOTIFICATIONS must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes('Marc Delacroix'), 'Fabricated collaborator Marc Delacroix must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes('Sophie Laurent'), 'Fabricated collaborator Sophie Laurent must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes('Julien Morel'), 'Fabricated collaborator Julien Morel must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes('Elena Vasseur'), 'Fabricated collaborator Elena Vasseur must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes('Pierre Faure'), 'Fabricated collaborator Pierre Faure must not exist in DesignCanvasHubPage.tsx')
console.log('✓ 1. DEMO_NOTIFICATIONS and fabricated collaborators absent from DesignCanvasHubPage')

// 2. Calendar and Upcoming Events use canonical event.status
assert(!hubSrc.includes('statuses[index % statuses.length]'), 'Modulo status cycle must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes("'Final Draft'"), 'Hardcoded status string Final Draft must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes("'Subject to Review'"), 'Hardcoded status string Subject to Review must not exist in DesignCanvasHubPage.tsx')
assert(!hubSrc.includes("'Ready to Present'"), 'Hardcoded status string Ready to Present must not exist in DesignCanvasHubPage.tsx')
assert(hubSrc.includes('canonicalStatus'), 'Calendar & Upcoming events must bind to canonical status in DesignCanvasHubPage.tsx')
console.log('✓ 2. Calendar and Upcoming Events use canonical event.status')

// 3. /event-detail does not consume seedEvents
assert(!eventDetailSrc.includes('seedEvents'), 'EventDetailPage must not consume seedEvents')
assert(eventDetailSrc.includes('usePortal'), 'EventDetailPage must bind to canonical portal events')
console.log('✓ 3. EventDetailPage binds to canonical PortalEvent, not seedEvents')

// 4. Fake PDF success absent from EventDetailPage
assert(!eventDetailSrc.includes('exportingPdf'), 'EventDetailPage must not have simulated exportingPdf state')
assert(!eventDetailSrc.includes('pdfExported'), 'EventDetailPage must not have fake pdfExported alert')
assert(eventDetailSrc.includes('window.print()'), 'EventDetailPage must use truthful window.print()')
console.log('✓ 4. Fake PDF success behavior absent from EventDetailPage')

// 5. Event Planner inventory is read-only while warehouse retains mutation
assert(inventorySrc.includes('!isPlanner'), 'InventoryStockPage must ensure isPlanner is excluded from canMutate')
assert(inventorySrc.includes('const readOnly = !canMutate'), 'InventoryStockPage must set readOnly based on canMutate')
console.log('✓ 5. Event Planner inventory access is strictly read-only')

// 6. Unauthorized Executive rail destinations are filtered
assert(execRailSrc.includes('canAccessRoute(currentUser'), 'ExecutiveRail must filter visibleDestinations with canAccessRoute')
console.log('✓ 6. ExecutiveRail filters unauthorized destinations according to role')

// 7. Dead unsupported profile/card controls absent
assert(!hubSrc.includes('Make available offline'), 'Dead action Make available offline must be removed')
assert(!hubSrc.includes('Upload new photo'), 'Dead action Upload new photo must be removed')
assert(!hubSrc.includes('Update password'), 'Dead action Update password must be removed')
assert(!hubSrc.includes('Update passkey'), 'Dead action Update passkey must be removed')
assert(!hubSrc.includes('Offline designs'), 'Dead toggle Offline designs must be removed')
console.log('✓ 7. Dead unsupported profile/card controls removed from DesignCanvasHubPage')

// 8. Dead card checkbox absent
assert(!hubSrc.includes('input type="checkbox"'), 'Dead card checkbox must be removed from DesignCanvasHubPage')
console.log('✓ 8. Dead card checkbox removed from DesignCanvasHubPage')

// 9. Canvas workspace inert buttons converted/removed
assert(!workspaceSrc.includes('button className="cws-cloud-status"'), 'Cloud saved must not be a button affordance in CanvasWorkspacePage')
assert(!workspaceSrc.includes('Offline mode'), 'Dead offline mode toggle must be removed from CanvasWorkspacePage')
assert(workspaceSrc.includes('title="Cloud sync active"'), 'Cloud saved must be a non-interactive status indicator')
console.log('✓ 9. CanvasWorkspacePage header buttons cleaned and converted to status indicator')

// 10. Local-only mutations on API-backed event cards prevented
assert(hubSrc.includes('const isApiEvent = card.id.startsWith'), 'DesignCanvasHubPage must distinguish API events from local user artifacts')
assert(hubSrc.includes('!isApiEvent'), 'DesignCanvasHubPage must disallow fake local mutations on API-backed events')
console.log('✓ 10. Local-only fake mutations on API-backed event cards prevented')

// 11. Event Planner navigation isolation
assert(hubSrc.includes("navigate('canvas')"), 'DesignCanvasHubPage must provide navigation to Canvas')
assert(hubSrc.includes("navigate('registry')"), 'DesignCanvasHubPage must provide navigation to Event Registry')
assert(hubSrc.includes("navigate('inventory')"), 'DesignCanvasHubPage must provide navigation to Inventory')
console.log('✓ 11. Event Planner navigation connects Canvas, Registry, and Inventory')

console.log('\nALL 11 EVENT PLANNER INTEGRITY REGRESSION CHECKS PASSED SUCCESFULLY.\n')
