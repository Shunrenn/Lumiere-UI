import { describe, it, expect } from 'vitest'
import { allowedRoutes, type UserRouteContext } from '../allowedRoutes'
import type { Route } from '../types'

const ALL_ROUTES: Route[] = [
  'overview',
  'workforce',
  'dashboard',
  'registry',
  'replenishment',
  'logs',
  'security-audit',
  'rbac',
  'damage',
  'inventory',
  'warehouse-logs',
  'crew',
  'deployments',
  'dispatch',
  'event-detail',
  'canvas',
  'canvas-workspace',
  'field-ops',
  'manning',
  'production-manager',
  'inventory-officer',
  'warehouse-lead',
  'warehouse-member',
]

interface RoleTestCase {
  roleName: string
  user: UserRouteContext
  expectedAllowed: Route[]
}

const TEST_CASES: RoleTestCase[] = [
  {
    roleName: 'Admin',
    user: { isAdmin: true },
    expectedAllowed: ['overview', 'workforce', 'damage', 'rbac', 'security-audit'],
  },
  {
    roleName: 'Executive',
    user: { isExecutive: true },
    expectedAllowed: ['dashboard', 'registry', 'damage', 'logs', 'inventory'],
  },
  {
    roleName: 'Event Planner',
    user: { isPlanner: true },
    expectedAllowed: ['canvas', 'canvas-workspace', 'overview', 'event-detail', 'inventory', 'registry'],
  },
  {
    roleName: 'WOM Parent',
    user: { isWarehouse: true, hasFullWarehouseAccess: true },
    expectedAllowed: ['overview', 'inventory', 'damage', 'replenishment', 'warehouse-logs', 'crew', 'deployments', 'dispatch'],
  },
  {
    roleName: 'WOM: Manning Officer',
    user: { isManningOfficer: true },
    expectedAllowed: ['manning'],
  },
  {
    roleName: 'WOM: Warehouse Manager (web)',
    user: { isWarehouse: true, hasFullWarehouseAccess: false },
    expectedAllowed: ['overview', 'inventory', 'damage', 'replenishment', 'warehouse-logs', 'crew', 'deployments', 'dispatch'],
  },
  {
    roleName: 'WOM: Production Manager (mobile)',
    user: { isProductionManager: true, hasFullWarehouseAccess: false },
    expectedAllowed: ['production-manager'],
  },
  {
    roleName: 'WOM: Inventory Officer (mobile)',
    user: { isInventoryOfficer: true, hasFullWarehouseAccess: false },
    expectedAllowed: ['inventory-officer'],
  },
  {
    roleName: 'WOM: Purchasing Officer (web)',
    user: { isWarehouse: true, hasFullWarehouseAccess: false },
    expectedAllowed: ['overview', 'inventory', 'damage', 'replenishment', 'warehouse-logs', 'crew', 'deployments', 'dispatch'],
  },
  {
    roleName: 'Ground Crew (all sub-roles)',
    user: { isGroundCrew: true },
    expectedAllowed: ['field-ops'],
  },
  {
    roleName: 'Unrecognized Role',
    user: {},
    expectedAllowed: [],
  },
]

describe('allowedRoutes pure matrix generator and verifier', () => {
  it('correctly maps allowed and denied routes for every role', () => {
    TEST_CASES.forEach(({ roleName, user, expectedAllowed }) => {
      const allowedSet = allowedRoutes(user)
      const expectedSet = new Set(expectedAllowed)

      ALL_ROUTES.forEach((route) => {
        const isAllowed = allowedSet.has(route)
        const shouldBeAllowed = expectedSet.has(route)
        expect(
          isAllowed,
          `Role [${roleName}] for route [${route}] expected ${shouldBeAllowed ? 'ALLOW' : 'DENY'}, got ${isAllowed ? 'ALLOW' : 'DENY'}`,
        ).toBe(shouldBeAllowed)
      })
    })
  })

  it('fails closed (returns empty set) for unmapped identities', () => {
    const emptySet = allowedRoutes({})
    expect(emptySet.size).toBe(0)
  })
})
