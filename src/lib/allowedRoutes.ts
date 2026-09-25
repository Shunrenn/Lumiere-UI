import type { Route } from './types'

// Admin scope — per DSD (dsd-lumiere.md §3) admin-destinations.ts list:
// overview (System Dashboard), workforce, damage, rbac, security-audit.
export const ADMIN_ROUTES = new Set<Route>([
  'overview',
  'workforce',
  'damage',
  'rbac',
  'security-audit',
])

// Executive scope — per owner decision (2026-09-25):
// dashboard (Event Ops Dashboard), registry (Event Operations Registry),
// damage (Damage Validation Oversight), logs (Activity Audit Logs),
// inventory (read-only Inventory Stock Catalog).
export const EXECUTIVE_ROUTES = new Set<Route>([
  'dashboard',
  'registry',
  'damage',
  'logs',
  'inventory',
])

// Planner: canvas, canvas-workspace, overview, event-detail, inventory, and registry (for event registration).
export const PLANNER_ROUTES = new Set<Route>([
  'canvas',
  'canvas-workspace',
  'overview',
  'event-detail',
  'inventory',
  'registry',
])

// WOM: overview, inventory, damage, replenishment, warehouse-logs, crew, deployments, dispatch.
export const WOM_ROUTES = new Set<Route>([
  'overview',
  'inventory',
  'damage',
  'replenishment',
  'warehouse-logs',
  'crew',
  'deployments',
  'dispatch',
])

// PWA-only routes.
export const PWA_ROUTES = new Set<Route>([
  'field-ops',
  'crew-warehouse',
  'crew-field',
  'crew-inventory',
  'crew-production',
  'crew-event-admin',
])

export const GROUND_CREW_WAREHOUSE_ROUTES = new Set<Route>(['crew-warehouse'])
export const GROUND_CREW_FIELD_ROUTES = new Set<Route>(['crew-field'])
export const GROUND_CREW_INVENTORY_ROUTES = new Set<Route>(['crew-inventory'])
export const GROUND_CREW_PRODUCTION_ROUTES = new Set<Route>(['crew-production'])
export const GROUND_CREW_EVENT_ADMIN_ROUTES = new Set<Route>(['crew-event-admin'])

export interface UserRouteContext {
  isAdmin?: boolean
  isExecutive?: boolean
  isPlanner?: boolean
  isWarehouse?: boolean
  isGroundCrew?: boolean
  isGroundCrewWarehouse?: boolean
  isGroundCrewField?: boolean
  isGroundCrewInventory?: boolean
  isGroundCrewProduction?: boolean
  isGroundCrewEventAdmin?: boolean
  isManningOfficer?: boolean
  isProductionManager?: boolean
  isInventoryOfficer?: boolean
  hasFullWarehouseAccess?: boolean
}

/**
 * Pure function returning the exact set of routes an authenticated identity may access.
 * FAIL-CLOSED: returns an empty set for any unrecognized or unmapped identity.
 */
export function allowedRoutes(user: UserRouteContext): Set<Route> {
  if (user.isAdmin) return ADMIN_ROUTES
  if (user.isExecutive) return EXECUTIVE_ROUTES
  if (user.isPlanner) return PLANNER_ROUTES
  if (user.isGroundCrew) return new Set<Route>(['field-ops'])
  if (user.isGroundCrewWarehouse) return GROUND_CREW_WAREHOUSE_ROUTES
  if (user.isGroundCrewField) return GROUND_CREW_FIELD_ROUTES
  if (user.isGroundCrewInventory) return GROUND_CREW_INVENTORY_ROUTES
  if (user.isGroundCrewProduction) return GROUND_CREW_PRODUCTION_ROUTES
  if (user.isGroundCrewEventAdmin) return GROUND_CREW_EVENT_ADMIN_ROUTES
  if (user.isManningOfficer) return new Set<Route>(['manning'])
  if (user.isProductionManager) return new Set<Route>(['production-manager'])
  if (user.isInventoryOfficer) return new Set<Route>(['inventory-officer'])
  if (user.isWarehouse) return WOM_ROUTES
  return new Set<Route>()
}
