import type { Route } from '@/shared/types'
import type { PortalAccount } from './auth'
import type { WarehouseModuleId } from './warehouse-modules'
import { womModuleAccessLevel } from './rbac'

export const VALID_ROUTES = new Set<Route>([
  'overview',
  'workforce',
  'dashboard',
  'registry',
  'logs',
  'security-audit',
  'rbac',
  'damage',
  'replenishment',
  'production',
  'inventory',
  'warehouse-logs',
  'crew',
  'deployments',
  'dispatch',
  'vendors',
  'event-detail',
  'canvas',
  'canvas-workspace',
  'design-projects',
  'mood-boards',
  'field-ops',
  'warehouse-lead',
  'warehouse-member',
  'manning',
  'production-manager',
  'inventory-officer',
  'project-manager',
])

export const PWA_STANDALONE_ROUTES = new Set<Route>([
  'field-ops',
  'warehouse-lead',
  'warehouse-member',
  'manning',
  'production-manager',
  'inventory-officer',
])

/**
 * Resolves the canonical landing route for an authenticated account.
 * This is the single authoritative source of truth for post-login destination
 * and unauthorized fallback redirection.
 */
export function getDefaultRouteForUser(user: PortalAccount | null | undefined): Route {
  if (!user) return 'overview'

  const role = user.role
  const subRole = user.subRole
  const fullAccess = user.fullWarehouseAccess ?? false

  // Scoped PWA portal accounts
  if (user.portal === 'pwa') {
    if (subRole === 'Manning Officer' || role === 'Manning Officer') return 'manning'
    if (subRole === 'Production Manager' && !fullAccess) return 'production-manager'
    if (subRole === 'Inventory Officer' && !fullAccess) return 'inventory-officer'
    if (role === 'Warehouse Lead') return 'warehouse-lead'
    if (role === 'Warehouse Member') return 'warehouse-member'
    if (role === 'Ground Crew') return 'field-ops'
    return 'field-ops'
  }

  // Web portal accounts
  if (role === 'Admin') return 'overview'
  if (role === 'Executive Lite') return 'dashboard'
  if (role === 'Executive') return 'dashboard'
  if (role === 'Project Manager Lite') return 'project-manager'
  if (role === 'Project Manager') return 'project-manager'
  if (role === 'Event Planner') return 'dashboard'
  if (role === 'Warehouse Associate') return 'overview'
  if (role === 'Warehouse Manager' || role === 'Warehouse Operations Manager') return 'overview'

  return 'overview'
}

/**
 * Centrally validates whether an authenticated account is authorized
 * to view a given route pathname before any page component is rendered.
 */
export function canAccessRoute(
  user: PortalAccount | null | undefined,
  routeOrPath: string,
  canAssetOverride?: boolean,
): boolean {
  if (!user) return false

  const raw = routeOrPath.split('?')[0].replace(/^\/+|\/+$/g, '') || 'overview'
  if (!VALID_ROUTES.has(raw as Route)) return false
  const cleanRoute = raw as Route

  const role = user.role
  const subRole = user.subRole
  const portal = user.portal
  const fullAccess = user.fullWarehouseAccess ?? false
  const canAsset = canAssetOverride !== undefined ? canAssetOverride : Boolean(user.canAccessAssetInventoryAndAllocation)
  const isPwaRoute = PWA_STANDALONE_ROUTES.has(cleanRoute)

  // Portal boundary: PWA users cannot access web-only routes
  if (portal === 'pwa') {
    if (!isPwaRoute) return false
    if (subRole === 'Manning Officer' || role === 'Manning Officer') {
      return cleanRoute === 'manning'
    }
    if (subRole === 'Production Manager' && !fullAccess) {
      return cleanRoute === 'production-manager'
    }
    if (subRole === 'Inventory Officer' && !fullAccess) {
      return cleanRoute === 'inventory-officer'
    }
    if (role === 'Warehouse Lead') {
      return cleanRoute === 'warehouse-lead' || cleanRoute === 'manning'
    }
    if (role === 'Warehouse Member') {
      return cleanRoute === 'warehouse-member'
    }
    if (role === 'Ground Crew') {
      return cleanRoute === 'field-ops' || cleanRoute === 'manning'
    }
    return isPwaRoute
  }

  // Web users cannot mount mobile standalone PWA routes directly
  if (isPwaRoute) {
    return false
  }

  // Admin has full access to all web console surfaces
  if (role === 'Admin') {
    return true
  }

  // Executive Lite:
  // Allowed: dashboard, registry, inventory (conditional on asset capability)
  // Denied: Admin, Audit, Workforce, Canvas, Manning, Production, Overview
  if (role === 'Executive Lite') {
    if (cleanRoute === 'dashboard' || cleanRoute === 'registry') return true
    if (cleanRoute === 'inventory' && canAsset) return true
    return false
  }

  // Executive (standard):
  // Allowed: dashboard, registry, inventory (conditional), event-detail, damage, logs, overview
  // Denied: Admin, Workforce, Security Audit, RBAC, Canvas, Manning, Production
  if (role === 'Executive') {
    if (
      cleanRoute === 'dashboard' ||
      cleanRoute === 'registry' ||
      cleanRoute === 'event-detail' ||
      cleanRoute === 'damage' ||
      cleanRoute === 'logs' ||
      cleanRoute === 'overview'
    ) {
      return true
    }
    if (cleanRoute === 'inventory' && canAsset) return true
    return false
  }

  // Project Manager Lite:
  // Allowed: approved event-management surfaces (project-manager, registry, event-detail)
  // Denied: Canvas, canvas-workspace, bulk reservation, reservation delete, canvas validation, Manning, Production, Workforce, Admin
  if (role === 'Project Manager Lite') {
    return cleanRoute === 'project-manager' || cleanRoute === 'registry' || cleanRoute === 'event-detail'
  }

  // Project Manager (standard):
  // Allowed: project-manager, canvas, canvas-workspace, registry, event-detail
  // Denied: Workforce, Security Audit, RBAC, Manning, Warehouse supervisor console
  if (role === 'Project Manager') {
    return (
      cleanRoute === 'project-manager' ||
      cleanRoute === 'canvas' ||
      cleanRoute === 'canvas-workspace' ||
      cleanRoute === 'registry' ||
      cleanRoute === 'event-detail'
    )
  }

  // Event Planner:
  // Allowed: planner dashboard, projects, mood boards, read-only catalog, and
  // canvas sub-surfaces. Event Registry and Damage Validation are deliberately
  // denied: planners receive API-assigned events and do not administer them.
  if (role === 'Event Planner') {
    return (
      cleanRoute === 'dashboard' ||
      cleanRoute === 'design-projects' ||
      cleanRoute === 'mood-boards' ||
      cleanRoute === 'canvas' ||
      cleanRoute === 'canvas-workspace' ||
      cleanRoute === 'event-detail' ||
      cleanRoute === 'inventory'
    )
  }

  // Warehouse Associate:
  // Allowed: overview (Warehouse Dashboard), inventory, replenishment, vendors, dispatch
  // Denied: Manning, Production, Workforce, Security Audit, RBAC, Canvas, Logs, Warehouse Logs, Crew, Deployments
  if (role === 'Warehouse Associate') {
    return (
      cleanRoute === 'overview' ||
      cleanRoute === 'inventory' ||
      cleanRoute === 'replenishment' ||
      cleanRoute === 'vendors' ||
      cleanRoute === 'dispatch'
    )
  }

  // Warehouse Manager / Operations Manager (fullWarehouseAccess)
  if (role === 'Warehouse Manager' || role === 'Warehouse Operations Manager') {
    return (
      cleanRoute === 'overview' ||
      cleanRoute === 'inventory' ||
      cleanRoute === 'replenishment' ||
      cleanRoute === 'production' ||
      cleanRoute === 'vendors' ||
      cleanRoute === 'dispatch' ||
      cleanRoute === 'warehouse-logs' ||
      cleanRoute === 'crew' ||
      cleanRoute === 'deployments' ||
      cleanRoute === 'damage' ||
      cleanRoute === 'event-detail'
    )
  }

  return false
}

/**
 * Centrally validates whether an authenticated account is authorized
 * to open a given warehouse module drilldown under /overview?module=...
 */
export function canAccessWarehouseModule(
  user: PortalAccount | null | undefined,
  moduleId: WarehouseModuleId,
): boolean {
  if (!user) return false

  // If user cannot access overview, they cannot access any warehouse module under /overview
  if (!canAccessRoute(user, 'overview') && user.role !== 'Admin') {
    return false
  }

  // Admin has access to all warehouse modules
  if (user.role === 'Admin') return true

  // Warehouse Associate:
  // Allowed: assets, replenishment, vendors, dispatch
  // Denied: manning and production
  if (user.role === 'Warehouse Associate') {
    return (
      moduleId === 'assets' ||
      moduleId === 'replenishment' ||
      moduleId === 'vendors' ||
      moduleId === 'dispatch'
    )
  }

  // Full Warehouse Access (WOM)
  if (user.fullWarehouseAccess || user.role === 'Warehouse Manager' || user.role === 'Warehouse Operations Manager') {
    return true
  }

  // Scoped WOM subroles
  if (user.subRole) {
    return womModuleAccessLevel(user.subRole, moduleId) !== 'None'
  }

  return false
}
