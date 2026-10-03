import {
  normalizeNotificationDto,
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../src/lib/notificationsApi'
import {
  normalizeCollaboratorDto,
  normalizeCandidateDto,
  fetchCanvasAccessApi,
  fetchCollaboratorCandidatesApi,
  grantCanvasAccessApi,
  updateCanvasAccessApi,
  revokeCanvasAccessApi,
} from '../src/lib/canvasApi'
import {
  normalizePaintColor,
  normalizePaintBrand,
  canManagePaintRegistry,
} from '../src/lib/paintApi'

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++
    console.log(`✓ [PASS] ${name}`)
  } else {
    failed++
    console.error(`✗ [FAIL] ${name}`)
  }
}

async function runAllTests() {
  console.log('====================================================')
  console.log('LUMIÈRE EVENT PLANNER OPERATIONAL CLOSURE TEST SUITE')
  console.log('====================================================\n')

  // -----------------------------------------------------------------------------
  // NOTIFICATIONS SUITE (Points 1-12)
  // -----------------------------------------------------------------------------
  console.log('--- NOTIFICATIONS VERIFICATION ---')

  const rawNotifPascal = {
    Id: 'notif-101',
    UserId: 'user-001',
    Title: 'Canvas Approved',
    Message: 'Spring Gala 2026 canvas layout was approved by Lead Planner.',
    IsRead: false,
    CreatedAt: '2026-10-03T10:00:00Z',
    EventId: 'evt-47',
  }

  const norm1 = normalizeNotificationDto(rawNotifPascal)
  assert(norm1.id === 'notif-101', '1. Notification DTO parses Id correctly')
  assert(norm1.title === 'Canvas Approved', '2. Notification title parsed correctly')
  assert(norm1.message.includes('Spring Gala 2026'), '3. Notification message parsed correctly')
  assert(norm1.isRead === false, '4. Unread state parsed correctly as false')
  assert(norm1.eventId === 'evt-47', '5. Event ID reference preserved')

  const rawNotifCamel = {
    id: 'notif-102',
    userId: 'user-001',
    title: 'Deficit Resolved',
    message: '5 Chiavari Chairs restocked from vendor replenishment.',
    isRead: true,
    createdAt: '2026-10-03T09:00:00Z',
  }
  const norm2 = normalizeNotificationDto(rawNotifCamel)
  assert(norm2.id === 'notif-102', '6. CamelCase notification parses id')
  assert(norm2.isRead === true, '7. Read notification has isRead: true')

  // Mock server for notification tests
  globalThis.fetch = async (url: any, opts: any) => {
    const urlStr = String(url)
    if (urlStr.includes('/api/notifications/read-all')) {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }
    if (urlStr.includes('/api/notifications/notif-101/read')) {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }
    if (urlStr.includes('/api/notifications')) {
      return new Response(JSON.stringify([rawNotifPascal, rawNotifCamel]), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  }

  const list = await fetchNotificationsApi()
  assert(list.length === 2, '8. fetchNotificationsApi returns 2 items')
  assert(list[0].id === 'notif-101', '9. Newest notification is sorted first')

  const readSuccess = await markNotificationReadApi('notif-101')
  assert(readSuccess === true, '10. markNotificationReadApi returns true on success')

  const readAllSuccess = await markAllNotificationsReadApi()
  assert(readAllSuccess === true, '11. markAllNotificationsReadApi returns true on success')

  // Mock server error for non-empty error handling
  globalThis.fetch = async () => new Response('Internal Server Error', { status: 500 })
  try {
    await fetchNotificationsApi()
    assert(false, '12. fetchNotificationsApi throws on 500 so UI enters Error state (not empty)')
  } catch {
    assert(true, '12. fetchNotificationsApi throws on 500 so UI enters Error state (not empty)')
  }

  // -----------------------------------------------------------------------------
  // COLLABORATION SUITE (Points 13-27)
  // -----------------------------------------------------------------------------
  console.log('\n--- CANVAS COLLABORATION VERIFICATION ---')

  const rawCollabPascal = {
    UserId: 'usr-99',
    EventId: 'evt-47',
    DisplayName: 'Elena Rostova',
    Role: 'Event Planner',
    Email: 'elena@lumiere.com',
    AccessLevel: 'CO_EDIT',
  }
  const collab1 = normalizeCollaboratorDto(rawCollabPascal)
  assert(collab1.userId === 'usr-99', '13. Collaborator userId parsed correctly')
  assert(collab1.displayName === 'Elena Rostova', '14. Collaborator displayName parsed correctly')
  assert(collab1.role === 'Event Planner', '15. Collaborator role parsed correctly')
  assert(collab1.accessLevel === 'CO_EDIT', '16. CO_EDIT access level parsed correctly')

  const rawCandidate = {
    Id: 'usr-100',
    DisplayName: 'Marc Chen',
    Role: 'Event Planner Lead',
    Email: 'marc@lumiere.com',
  }
  const cand1 = normalizeCandidateDto(rawCandidate)
  assert(cand1.userId === 'usr-100', '17. Candidate userId parsed')
  assert(cand1.isEventPlanner === true, '18. Event Planner candidate prioritized flag set')

  // Mock server for collaboration tests
  globalThis.fetch = async (url: any, opts: any) => {
    const urlStr = String(url)
    const method = opts?.method || 'GET'
    if (urlStr.includes('/collaborator-candidates')) {
      return new Response(JSON.stringify([rawCandidate]), { status: 200 })
    }
    if (urlStr.includes('/access/usr-99') && method === 'PUT') {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }
    if (urlStr.includes('/access/usr-99') && method === 'DELETE') {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }
    if (urlStr.includes('/access') && method === 'POST') {
      return new Response(JSON.stringify({ success: true }), { status: 201 })
    }
    if (urlStr.includes('/access') && method === 'GET') {
      return new Response(JSON.stringify([rawCollabPascal]), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  }

  const collabs = await fetchCanvasAccessApi('evt-47')
  assert(collabs.length === 1 && collabs[0].displayName === 'Elena Rostova', '19. fetchCanvasAccessApi returns canonical collaborators')

  const candidates = await fetchCollaboratorCandidatesApi('evt-47')
  assert(candidates.length === 1 && candidates[0].displayName === 'Marc Chen', '20. fetchCollaboratorCandidatesApi returns candidate list')

  const grantRes = await grantCanvasAccessApi('evt-47', 'usr-100', 'CO_EDIT')
  assert(grantRes.ok === true, '21. grantCanvasAccessApi calls backend POST /api/events/{id}/access')

  const updateRes = await updateCanvasAccessApi('evt-47', 'usr-99', 'VIEW')
  assert(updateRes.ok === true, '22. updateCanvasAccessApi calls backend PUT /api/events/{id}/access/{userId}')

  const revokeRes = await revokeCanvasAccessApi('evt-47', 'usr-99')
  assert(revokeRes.ok === true, '23. revokeCanvasAccessApi calls backend DELETE /api/events/{id}/access/{userId}')

  // -----------------------------------------------------------------------------
  // PAINT SUITE (Points 28-37)
  // -----------------------------------------------------------------------------
  console.log('\n--- PAINT REGISTRY & SWATCH VERIFICATION ---')

  const rawPaintPascal = {
    Id: 'clr-201',
    AssetId: 'ast-paint-01',
    AssetName: 'Boysen Acrylic Enamel',
    HexCode: '#D4AF37',
    PaintBrand: 'Davies',
    MaterialFinish: 'Gloss Finish',
    ColorOrder: 1,
    QuantityInStock: 50,
    AvailableQuantity: 42,
    OperationalDomain: 'Stockroom',
    Category: 'Paints & Finishes',
  }

  const paint1 = normalizePaintColor(rawPaintPascal)
  assert(paint1.id === 'clr-201', '24. Paint color id parsed')
  assert(paint1.assetId === 'ast-paint-01', '25. Paint linked Stockroom AssetId parsed')
  assert(paint1.hexCode === '#D4AF37', '26. HexCode digital swatch parsed')
  assert(paint1.paintBrand === 'Davies', '27. PaintBrand parsed')
  assert(paint1.materialFinish === 'Gloss Finish', '28. MaterialFinish parsed')
  assert(paint1.quantityInStock === 50, '29. QuantityInStock parsed from server response')
  assert(paint1.availableQuantity === 42, '30. AvailableQuantity parsed from server response')

  const zeroStockPaint = normalizePaintColor({
    Id: 'clr-202',
    Name: 'Depleted Indigo',
    HexCode: '#000080',
    QuantityInStock: 0,
    AvailableQuantity: 0,
  })
  assert(zeroStockPaint.availableQuantity === 0, '31. Zero availability recognized for Not Available rendering')

  // Test permission boundary for Event Planner
  const plannerUser = { role: 'Event Planner', subRole: '', fullWarehouseAccess: false }
  const canPlannerEditPaint = canManagePaintRegistry(plannerUser)
  assert(canPlannerEditPaint === false, '32. Event Planner cannot mutate Paint Registry (READ-ONLY enforced)')

  const adminUser = { role: 'SystemAdmin', subRole: '', fullWarehouseAccess: true }
  assert(canManagePaintRegistry(adminUser) === true, '33. Admin / Warehouse Manager can edit Paint Registry')

  console.log('\n====================================================')
  console.log(`TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================')
  if (failed > 0) process.exit(1)
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
