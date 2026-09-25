import { describe, it, expect } from 'vitest'
import { mapBackendUserToPortalAccount, buildUserRouteContext } from '../auth'
import { allowedRoutes } from '../allowedRoutes'

/**
 * Creates a mock JWT string with standard header and base64url-encoded payload.
 */
function createMockJwt(payload: Record<string, any>): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  return `${encode(header)}.${encode(payload)}.signature_placeholder`
}

describe('End-to-End JWT -> PortalAccount -> RouteContext -> allowedRoutes integration', () => {
  const TEST_CASES = [
    {
      name: 'System Admin',
      backendRole: 'Admin',
      jwtPayload: { role_name: 'Admin' },
      expectedMinRoute: 'overview',
    },
    {
      name: 'Executive Oversight',
      backendRole: 'Executive',
      jwtPayload: { role_name: 'Executive' },
      expectedMinRoute: 'dashboard',
    },
    {
      name: 'Event Planner',
      backendRole: 'Event Planner',
      jwtPayload: { role_name: 'Event Planner' },
      expectedMinRoute: 'canvas',
    },
    {
      name: 'WOM Parent (with explicit wom_parent claim)',
      backendRole: 'Warehouse Operations Manager',
      jwtPayload: { role_name: 'Warehouse Operations Manager', wom_parent: true },
      expectedMinRoute: 'overview',
    },
    {
      name: 'WOM Parent (seeded fallback without wom_parent claim)',
      backendRole: 'Warehouse Operations Manager',
      jwtPayload: { role_name: 'Warehouse Operations Manager' },
      expectedMinRoute: 'overview',
    },
    {
      name: 'WOM Sub-Role: Manning Officer (pwa)',
      backendRole: 'Warehouse Operations Manager',
      jwtPayload: { role_name: 'Warehouse Operations Manager', wom_subrole: 'ManningOfficer' },
      expectedMinRoute: 'manning',
    },
    {
      name: 'WOM Sub-Role: Warehouse Manager (web)',
      backendRole: 'Warehouse Operations Manager',
      jwtPayload: { role_name: 'Warehouse Operations Manager', wom_subrole: 'WarehouseManager' },
      expectedMinRoute: 'overview',
    },
    {
      name: 'WOM Sub-Role: Production Manager (mobile)',
      backendRole: 'Warehouse Operations Manager',
      jwtPayload: { role_name: 'Warehouse Operations Manager', wom_subrole: 'ProductionManager' },
      expectedMinRoute: 'production-manager',
    },
    {
      name: 'WOM Sub-Role: Inventory Officer (mobile)',
      backendRole: 'Warehouse Operations Manager',
      jwtPayload: { role_name: 'Warehouse Operations Manager', wom_subrole: 'InventoryOfficer' },
      expectedMinRoute: 'inventory-officer',
    },
    {
      name: 'WOM Sub-Role: Purchasing Officer (web)',
      backendRole: 'Warehouse Operations Manager',
      jwtPayload: { role_name: 'Warehouse Operations Manager', wom_subrole: 'PurchasingOfficer' },
      expectedMinRoute: 'overview',
    },
    {
      name: 'Ground Crew (Warehouse sub-role)',
      backendRole: 'Ground Crew',
      jwtPayload: { role_name: 'Ground Crew', ground_crew_subrole: 'Warehouse' },
      expectedMinRoute: 'crew-warehouse',
    },
    {
      name: 'Ground Crew (Field sub-role)',
      backendRole: 'Ground Crew',
      jwtPayload: { role_name: 'Ground Crew', ground_crew_subrole: 'Field' },
      expectedMinRoute: 'crew-field',
    },
    {
      name: 'Ground Crew (Legacy Warehouse Lead role)',
      backendRole: 'Warehouse Lead',
      jwtPayload: { role_name: 'Warehouse Lead' },
      expectedMinRoute: 'crew-warehouse',
    },
  ]

  TEST_CASES.forEach(({ name, backendRole, jwtPayload, expectedMinRoute }) => {
    it(`correctly produces non-empty allowedRoutes for ${name}`, () => {
      const token = createMockJwt({
        sub: '00000000-0000-0000-0000-000000000000',
        email: 'test@lumiere.com',
        ...jwtPayload,
      })

      // Step 1: Map raw backend response + JWT payload to PortalAccount
      const portalAccount = mapBackendUserToPortalAccount({
        userId: '00000000-0000-0000-0000-000000000000',
        email: 'test@lumiere.com',
        fullName: 'Integration Test User',
        role: backendRole,
        token,
      })

      // Step 2: Derive UserRouteContext flags exactly as AuthContext does
      const routeContext = buildUserRouteContext(portalAccount)

      // Step 3: Evaluate allowed routes through pure policy engine
      const allowedSet = allowedRoutes(routeContext)

      // Step 4: Verification assertions to ensure no string-mismatch fail-closed drops
      expect(allowedSet.size).toBeGreaterThan(0)
      expect(allowedSet.has(expectedMinRoute as any)).toBe(true)
    })
  })
})
