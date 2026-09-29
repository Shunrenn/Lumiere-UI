import './App.css'
import { useEffect, useState, lazy, Suspense } from 'react'
import type { Route } from '@/lib/types'
import { NavProvider, useNav } from '@/lib/nav'
import { PortalProvider } from '@/lib/store'
import { AdminGrowthSummaryProvider } from '@/lib/admin-growth-summary'
import { AuthProvider, useAuth } from '@/lib/auth'
import { LogoutModal } from '@/components/LogoutModal'
import { OfflineBanner } from '@/components/OfflineBanner'
import { WelcomeModal } from '@/components/WelcomeModal'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { loadRosterFromDatabase } from '@/lib/roster'
import { PlannerProvider } from '@/lib/planner'
import { WarehouseProvider } from '@/lib/warehouse'

// Code-split page components for minimal initial bundle latency
import { LoginPage } from '@/pages/LoginPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { AdminSystemDashboardPage } from '@/pages/AdminSystemDashboardPage'
import { AdminWorkforcePage } from '@/pages/AdminWorkforcePage'
import { WarehouseHomePage } from '@/pages/WarehouseHomePage'
import { GroundCrewPage } from '@/pages/GroundCrewPage'
import { PinSetupScreen } from '@/pages/PinSetupScreen'
import { TempPasswordResetScreen } from '@/pages/TempPasswordResetScreen'

// Code-split heavy subpages for feature-level chunking
const AdminSecurityAuditPage = lazy(() => import('@/pages/AdminSecurityAuditPage').then((m) => ({ default: m.AdminSecurityAuditPage })))
const AdminRolesPage = lazy(() => import('@/pages/AdminRolesPage').then((m) => ({ default: m.AdminRolesPage })))
const EventDashboardPage = lazy(() => import('@/pages/EventDashboardPage').then((m) => ({ default: m.EventDashboardPage })))
const EventRegistryPage = lazy(() => import('@/pages/EventRegistryPage').then((m) => ({ default: m.EventRegistryPage })))
const ReplenishmentPage = lazy(() => import('@/pages/ReplenishmentPage').then((m) => ({ default: m.ReplenishmentPage })))
const ActivityLogsPage = lazy(() => import('@/pages/ActivityLogsPage').then((m) => ({ default: m.ActivityLogsPage })))
const DamageValidationPage = lazy(() => import('@/pages/DamageValidationPage').then((m) => ({ default: m.DamageValidationPage })))
const InventoryStockPage = lazy(() => import('@/pages/InventoryStockPage').then((m) => ({ default: m.InventoryStockPage })))
const WarehouseLogsPage = lazy(() => import('@/pages/WarehouseLogsPage').then((m) => ({ default: m.WarehouseLogsPage })))
const CrewRosterPage = lazy(() => import('@/pages/CrewRosterPage').then((m) => ({ default: m.CrewRosterPage })))
const TaskDeploymentsPage = lazy(() => import('@/pages/TaskDeploymentsPage').then((m) => ({ default: m.TaskDeploymentsPage })))
const DispatchManifestPage = lazy(() => import('@/pages/DispatchManifestPage').then((m) => ({ default: m.DispatchManifestPage })))
const EventDetailPage = lazy(() => import('@/pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })))
const DesignCanvasHubPage = lazy(() => import('@/pages/DesignCanvasHubPage').then((m) => ({ default: m.DesignCanvasHubPage })))
const CanvasWorkspacePage = lazy(() => import('@/pages/CanvasWorkspacePage').then((m) => ({ default: m.CanvasWorkspacePage })))
const GroundCrewLoginPage = lazy(() => import('@/pages/GroundCrewLoginPage').then((m) => ({ default: m.GroundCrewLoginPage })))
const WarehouseLeadPage = lazy(() => import('@/pages/WarehouseLeadPage').then((m) => ({ default: m.WarehouseLeadPage })))
const WarehouseMemberPage = lazy(() => import('@/pages/WarehouseMemberPage').then((m) => ({ default: m.WarehouseMemberPage })))
const ManningPage = lazy(() => import('@/pages/ManningPage').then((m) => ({ default: m.ManningPage })))
const ProductionManagerPage = lazy(() => import('@/pages/ProductionManagerPage').then((m) => ({ default: m.ProductionManagerPage })))
const InventoryOfficerPage = lazy(() => import('@/pages/InventoryOfficerPage').then((m) => ({ default: m.InventoryOfficerPage })))
const ProjectManagerDashboardPage = lazy(() => import('@/pages/ProjectManagerDashboardPage').then((m) => ({ default: m.ProjectManagerDashboardPage })))
const ExecutiveAssetInventoryPage = lazy(() => import('@/pages/ExecutiveAssetInventoryPage').then((m) => ({ default: m.ExecutiveAssetInventoryPage })))
const WarehouseDrilldown = lazy(() => import('@/components/warehouse/WarehouseDrilldown').then((m) => ({ default: m.WarehouseDrilldown })))
import type { WarehouseModuleId } from '@/lib/warehouse-modules'

function PortalAccessError({ portal }: { portal: 'web' | 'pwa' }) {
  const { logout } = useAuth()
  const isPwa = portal === 'pwa'
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <section className="paper-card w-full max-w-md text-center">
        <p className="eyebrow">Access boundary</p>
        <h1 className="mt-2 font-serif text-3xl">Wrong portal</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This account is registered for the {isPwa ? 'Lumière PWA' : 'Lumière web app'}. The {isPwa ? 'web app' : 'PWA'} cannot be opened with this account.
        </p>
        <button type="button" className="button-primary mt-6 w-full" onClick={logout}>Return to login</button>
      </section>
    </main>
  )
}

function Router() {
  const { route, navigate } = useNav()
  const {
    portal,
    isWarehouse,
    isAdmin,
    isExecutive,
    isExecutiveLite,
    isProjectManager,
    isProjectManagerLite,
    isWarehouseAssociate,
    isProductionManager,
    isInventoryOfficer,
    hasFullWarehouseAccess,
    canAccessAssetInventory,
  } = useAuth()
  // The Production Manager WOM sub-role gets its own mobile PWA page (matching
  // the Ground Crew / Warehouse Lead / Warehouse Member mobile accounts)
  // instead of the desktop sidebar shell — but only when scoped to that single
  // sub-role. The full-access Warehouse Ops Manager super-account still uses
  // the desktop WarehouseHomePage even if its subRole happens to be unset.
  const isMobileProductionManager = isProductionManager && !hasFullWarehouseAccess
  const isMobileInventoryOfficer = isInventoryOfficer && !hasFullWarehouseAccess
  const pwaRoutes = new Set(['field-ops', 'warehouse-lead', 'warehouse-member', 'manning', 'production-manager', 'inventory-officer'])
  const isPwaRoute = pwaRoutes.has(route)
  if (portal && ((portal === 'pwa') !== isPwaRoute)) return <PortalAccessError portal={portal} />

  // Client-side scoped role guard for Executive Lite:
  // Allowed client routes: dashboard, inventory (conditional), registry.
  // Fails closed to EventDashboardPage.
  if (isExecutiveLite) {
    switch (route) {
      case 'dashboard':
        return <EventDashboardPage />
      case 'inventory':
        return canAccessAssetInventory ? <ExecutiveAssetInventoryPage /> : <EventDashboardPage />
      case 'registry':
        return <EventRegistryPage />
      default:
        return <EventDashboardPage />
    }
  }

  // Client-side scoped role guard for Project Manager Lite:
  // PM Lite is restricted to event management and read-only event-scoped allocation visibility.
  // Explicitly denied: Canvas, Canvas Workspace, Manning, Production, Workforce, Admin governance.
  if (isProjectManagerLite) {
    switch (route) {
      case 'registry':
        return <EventRegistryPage />
      case 'project-manager':
      default:
        return <ProjectManagerDashboardPage />
    }
  }

  // Client-side scoped role guard for Warehouse Associate:
  // Allowed client routes: overview (dashboard), inventory (assets), replenishment, vendors, dispatch.
  // Explicitly denied: Manning, Production, Workforce, Logs, full WOM super-role admin.
  if (isWarehouseAssociate) {
    switch (route) {
      case 'inventory':
      case 'replenishment':
      case 'vendors':
      case 'dispatch': {
        const modId = route === 'inventory' ? 'assets' : (route as WarehouseModuleId)
        return (
          <WarehouseDrilldown
            entry={{ kind: 'module', moduleId: modId }}
            onExit={() => navigate('overview')}
          />
        )
      }
      case 'overview':
      default:
        return <WarehouseHomePage />
    }
  }

  // Client-side role guard for Project Manager:
  // PM is restricted to project manager dashboard and design canvas oversight surfaces.
  // PM cannot mount Admin/Executive operational pages (security-audit, workforce, rbac, executive dashboard/logs).
  if (isProjectManager) {
    switch (route) {
      case 'canvas':
        return <DesignCanvasHubPage />
      case 'canvas-workspace':
        return <CanvasWorkspacePage />
      case 'project-manager':
      default:
        return <ProjectManagerDashboardPage />
    }
  }

  switch (route) {
    case 'dashboard':
      return <EventDashboardPage />
    case 'registry':
      return <EventRegistryPage />
    case 'replenishment':
      return <ReplenishmentPage />
    case 'logs':
      return <ActivityLogsPage />
    case 'damage':
      return <DamageValidationPage />
    case 'inventory':
      if (isExecutive) {
        return canAccessAssetInventory ? <ExecutiveAssetInventoryPage /> : <EventDashboardPage />
      }
      return <InventoryStockPage />
    case 'warehouse-logs':
      return <WarehouseLogsPage />
    case 'crew':
      return <CrewRosterPage />
    case 'deployments':
      return <TaskDeploymentsPage />
    case 'dispatch':
      return <DispatchManifestPage />
    case 'vendors':
      return (
        <WarehouseDrilldown
          entry={{ kind: 'module', moduleId: 'vendors' }}
          onExit={() => navigate('overview')}
        />
      )
    case 'event-detail':
      return <EventDetailPage />
    case 'canvas':
      return <DesignCanvasHubPage />
    case 'canvas-workspace':
      return <CanvasWorkspacePage />
    case 'field-ops':
      return <GroundCrewPage />
    case 'warehouse-lead':
      return <WarehouseLeadPage />
    case 'warehouse-member':
      return <WarehouseMemberPage />
    case 'manning':
      return <ManningPage />
    case 'production-manager':
      return <ProductionManagerPage />
    case 'inventory-officer':
      return <InventoryOfficerPage />
    case 'project-manager':
      return <ProjectManagerDashboardPage />
    case 'workforce':
      return <AdminWorkforcePage />
    case 'security-audit':
      return <AdminSecurityAuditPage />
    case 'rbac':
      return <AdminRolesPage />
    case 'overview':
    default:
      // Role-aware home. Admins always land on the icon-rail System Dashboard —
      // never the legacy sidebar shell — even for unknown routes.
      return isAdmin ? (
        <AdminSystemDashboardPage />
      ) : isMobileProductionManager ? (
        <ProductionManagerPage />
      ) : isMobileInventoryOfficer ? (
        <InventoryOfficerPage />
      ) : isProjectManager ? (
        <ProjectManagerDashboardPage />
      ) : isWarehouse ? (
        <WarehouseHomePage />
      ) : (
        <OverviewPage />
      )
  }
}

function Gate() {
  const {
    isAuthenticated,
    isTempPassword,
    hasConfirmationPin,
    isWarehouse,
    isWarehouseLead,
    isWarehouseMember,
    isPlanner,
    isProjectManager,
    isProjectManagerLite,
    isGroundCrew,
    isExecutive,
    isExecutiveLite,
    isWarehouseAssociate,
    isProductionManager,
    isInventoryOfficer,
    isManningOfficer,
    hasFullWarehouseAccess,
    canAccessAssetInventory,
  } = useAuth()
  const [portal, setPortal] = useState<'staff' | 'crew'>('staff')
  const isMobileProductionManager = isProductionManager && !hasFullWarehouseAccess
  const isMobileInventoryOfficer = isInventoryOfficer && !hasFullWarehouseAccess

  if (!isAuthenticated) {
    return portal === 'crew' ? (
      <GroundCrewLoginPage onStaffPortal={() => setPortal('staff')} />
    ) : (
      <LoginPage onCrewPortal={() => setPortal('crew')} />
    )
  }

  if (isTempPassword) {
    return <TempPasswordResetScreen />
  }

  if (!hasConfirmationPin) {
    return <PinSetupScreen />
  }

  // A deep-linked ?highlight=<staffId> (from the User Growth Summary modal)
  // should land straight on Workforce Management on a fresh load/refresh —
  // scoped to this one param, not a general URL-routing migration.
  const hasWorkforceHighlight =
    new URLSearchParams(window.location.search).has('highlight') || Boolean(window.history.state?.highlight)
  const urlParamRoute = (new URLSearchParams(window.location.search).get('route') || window.location.pathname.replace('/', '')) as Route | null
  const validRoutes = new Set(['dashboard', 'registry', 'replenishment', 'logs', 'damage', 'inventory', 'warehouse-logs', 'crew', 'deployments', 'dispatch', 'vendors', 'event-detail', 'canvas', 'canvas-workspace', 'field-ops', 'warehouse-lead', 'warehouse-member', 'manning', 'production-manager', 'inventory-officer', 'workforce', 'security-audit', 'rbac', 'overview', 'project-manager'])
  const targetUrlRoute = urlParamRoute && validRoutes.has(urlParamRoute) ? urlParamRoute : null

  // Scoped-role route whitelists
  const executiveLiteAllowedRoutes = new Set<Route>(['dashboard', 'inventory', 'registry'])
  const pmLiteAllowedRoutes = new Set<Route>(['project-manager', 'registry', 'event-detail'])
  const warehouseAssociateAllowedRoutes = new Set<Route>(['overview', 'inventory', 'replenishment', 'vendors', 'dispatch'])
  const pmAllowedRoutes = new Set<Route>(['project-manager', 'canvas', 'canvas-workspace'])

  let isAllowed = true
  if (isExecutiveLite) {
    isAllowed = targetUrlRoute ? executiveLiteAllowedRoutes.has(targetUrlRoute) : true
    if (targetUrlRoute === 'inventory' && !canAccessAssetInventory) isAllowed = false
  } else if (isProjectManagerLite) {
    isAllowed = targetUrlRoute ? pmLiteAllowedRoutes.has(targetUrlRoute) : true
  } else if (isWarehouseAssociate) {
    isAllowed = targetUrlRoute ? warehouseAssociateAllowedRoutes.has(targetUrlRoute) : true
  } else if (isProjectManager) {
    isAllowed = targetUrlRoute ? pmAllowedRoutes.has(targetUrlRoute) : true
  } else if (isExecutive) {
    if (targetUrlRoute === 'inventory' && !canAccessAssetInventory) isAllowed = false
  }

  const resolvedTargetRoute = targetUrlRoute && isAllowed ? targetUrlRoute : null

  const initialRoute = resolvedTargetRoute || (
    isExecutiveLite
      ? 'dashboard'
      : isProjectManagerLite
      ? 'project-manager'
      : isWarehouseAssociate
      ? 'overview'
      : isManningOfficer
      ? 'manning'
      : isGroundCrew
      ? 'field-ops'
      : isWarehouseLead
      ? 'warehouse-lead'
      : isWarehouseMember
      ? 'warehouse-member'
      : isMobileProductionManager
      ? 'production-manager'
      : isMobileInventoryOfficer
      ? 'inventory-officer'
      : isPlanner
      ? 'canvas'
      : isProjectManager
      ? 'project-manager'
      : isWarehouse
      ? 'overview'
      : hasWorkforceHighlight
      ? 'workforce'
      : isExecutive
      ? 'dashboard'
      : 'overview')

  return (
    <NavProvider initialRoute={initialRoute}>
      <AdminGrowthSummaryProvider>
        <Suspense fallback={<LoadingSkeleton variant="page" />}>
          <Router />
        </Suspense>
        <WelcomeModal />
      </AdminGrowthSummaryProvider>
    </NavProvider>
  )
}
function App() {
  useEffect(() => {
    // Load the crew roster from the database on app initialization
    loadRosterFromDatabase()
  }, [])

  return (
    <AuthProvider>
      <PortalProvider>
        <PlannerProvider>
          <WarehouseProvider>
            <OfflineBanner />
            <Gate />
            <LogoutModal />
          </WarehouseProvider>
        </PlannerProvider>
      </PortalProvider>
    </AuthProvider>
  )
}

export default App
