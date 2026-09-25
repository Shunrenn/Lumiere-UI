import './App.css'
import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
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
import {
  allowedRoutes,
  PWA_ROUTES,
  type UserRouteContext,
} from '@/lib/allowedRoutes'

// Code-split page components for minimal initial bundle latency
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const OverviewPage = lazy(() => import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const AdminSystemDashboardPage = lazy(() => import('@/pages/AdminSystemDashboardPage').then((m) => ({ default: m.AdminSystemDashboardPage })))
const AdminWorkforcePage = lazy(() => import('@/pages/AdminWorkforcePage').then((m) => ({ default: m.AdminWorkforcePage })))
const AdminSecurityAuditPage = lazy(() => import('@/pages/AdminSecurityAuditPage').then((m) => ({ default: m.AdminSecurityAuditPage })))
const AdminRolesPage = lazy(() => import('@/pages/AdminRolesPage').then((m) => ({ default: m.AdminRolesPage })))
const WarehouseHomePage = lazy(() => import('@/pages/WarehouseHomePage').then((m) => ({ default: m.WarehouseHomePage })))
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
const GroundCrewPage = lazy(() => import('@/pages/GroundCrewPage').then((m) => ({ default: m.GroundCrewPage })))
const GroundCrewLoginPage = lazy(() => import('@/pages/GroundCrewLoginPage').then((m) => ({ default: m.GroundCrewLoginPage })))
const ManningPage = lazy(() => import('@/pages/ManningPage').then((m) => ({ default: m.ManningPage })))
const ProductionManagerPage = lazy(() => import('@/pages/ProductionManagerPage').then((m) => ({ default: m.ProductionManagerPage })))
const InventoryOfficerPage = lazy(() => import('@/pages/InventoryOfficerPage').then((m) => ({ default: m.InventoryOfficerPage })))
const PinSetupScreen = lazy(() => import('@/pages/PinSetupScreen').then((m) => ({ default: m.PinSetupScreen })))
const TempPasswordResetScreen = lazy(() => import('@/pages/TempPasswordResetScreen').then((m) => ({ default: m.TempPasswordResetScreen })))

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
  const { navigate, route } = useNav()
  const {
    portal,
    isWarehouse,
    isAdmin,
    isExecutive,
    isPlanner,
    isGroundCrew,
    isGroundCrewWarehouse,
    isGroundCrewField,
    isGroundCrewInventory,
    isGroundCrewProduction,
    isGroundCrewEventAdmin,
    isProductionManager,
    isInventoryOfficer,
    isManningOfficer,
    hasFullWarehouseAccess,
    logout,
  } = useAuth()

  // ── Portal boundary check ─────────────────────────────────────────────────
  // A PWA-portal account must only be shown PWA routes, and vice versa.
  const isPwaRoute = PWA_ROUTES.has(route)
  if (portal && ((portal === 'pwa') !== isPwaRoute)) return <PortalAccessError portal={portal} />

  // ── Role-aware route guard ────────────────────────────────────────────────────
  const userContext: UserRouteContext = useMemo(
    () => ({
      isAdmin,
      isExecutive,
      isPlanner,
      isWarehouse,
      isGroundCrew,
      isGroundCrewWarehouse,
      isGroundCrewField,
      isGroundCrewInventory,
      isGroundCrewProduction,
      isGroundCrewEventAdmin,
      isManningOfficer,
      isProductionManager,
      isInventoryOfficer,
      hasFullWarehouseAccess,
    }),
    [
      isAdmin,
      isExecutive,
      isPlanner,
      isWarehouse,
      isGroundCrew,
      isGroundCrewWarehouse,
      isGroundCrewField,
      isGroundCrewInventory,
      isGroundCrewProduction,
      isGroundCrewEventAdmin,
      isManningOfficer,
      isProductionManager,
      isInventoryOfficer,
      hasFullWarehouseAccess,
    ],
  )

  const allowed = useMemo(() => allowedRoutes(userContext), [userContext])

  const roleHome: Route = useMemo(() => {
    if (isAdmin) return 'overview'
    if (isExecutive) return 'dashboard'
    if (isPlanner) return 'canvas'
    if (isGroundCrewWarehouse) return 'crew-warehouse'
    if (isGroundCrewField) return 'crew-field'
    if (isGroundCrewInventory) return 'crew-inventory'
    if (isGroundCrewProduction) return 'crew-production'
    if (isGroundCrewEventAdmin) return 'crew-event-admin'
    if (isGroundCrew) return 'field-ops'
    if (isManningOfficer) return 'manning'
    if (isProductionManager) return 'production-manager'
    if (isInventoryOfficer) return 'inventory-officer'
    return 'overview'
  }, [
    isAdmin,
    isExecutive,
    isPlanner,
    isGroundCrewWarehouse,
    isGroundCrewField,
    isGroundCrewInventory,
    isGroundCrewProduction,
    isGroundCrewEventAdmin,
    isGroundCrew,
    isManningOfficer,
    isProductionManager,
    isInventoryOfficer,
  ])

  // Fail-closed: empty set means unrecognized/unmapped role — force logout inside useEffect.
  useEffect(() => {
    if (allowed.size === 0) {
      logout()
    }
  }, [allowed.size, logout])

  // Route redirection inside useEffect to prevent state mutations during render.
  useEffect(() => {
    if (allowed.size > 0 && !allowed.has(route)) {
      navigate(roleHome)
    }
  }, [allowed, route, roleHome, navigate])

  if (allowed.size === 0) {
    return null
  }

  if (!allowed.has(route)) {
    return null
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
      return <InventoryStockPage />
    case 'warehouse-logs':
      return <WarehouseLogsPage />
    case 'crew':
      return <CrewRosterPage />
    case 'deployments':
      return <TaskDeploymentsPage />
    case 'dispatch':
      return <DispatchManifestPage />
    case 'event-detail':
      return <EventDetailPage />
    case 'canvas':
      return <DesignCanvasHubPage />
    case 'canvas-workspace':
      return <CanvasWorkspacePage />
    case 'field-ops':
    case 'crew-warehouse':
    case 'crew-field':
    case 'crew-inventory':
    case 'crew-production':
    case 'crew-event-admin':
      return <GroundCrewPage />
    case 'manning':
      return <ManningPage />
    case 'production-manager':
      return <ProductionManagerPage />
    case 'inventory-officer':
      return <InventoryOfficerPage />
    case 'workforce':
      return <AdminWorkforcePage />
    case 'security-audit':
      return <AdminSecurityAuditPage />
    case 'rbac':
      return <AdminRolesPage />
    case 'overview':
    default:
      // Role-aware home. Admins always land on the icon-rail System Dashboard.
      return isAdmin ? (
        <AdminSystemDashboardPage />
      ) : isProductionManager ? (
        <ProductionManagerPage />
      ) : isInventoryOfficer ? (
        <InventoryOfficerPage />
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
    isAdmin,
    isExecutive,
    isWarehouse,
    isPlanner,
    isGroundCrew,
    isGroundCrewWarehouse,
    isGroundCrewField,
    isGroundCrewInventory,
    isGroundCrewProduction,
    isGroundCrewEventAdmin,
    isProductionManager,
    isInventoryOfficer,
    isManningOfficer,
  } = useAuth()
  const [portal, setPortal] = useState<'staff' | 'crew'>('staff')

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
  const validRoutes = new Set<Route>([
    'dashboard', 'registry', 'replenishment', 'logs', 'damage', 'inventory',
    'warehouse-logs', 'crew', 'deployments', 'dispatch', 'event-detail',
    'canvas', 'canvas-workspace', 'field-ops', 'crew-warehouse', 'crew-field',
    'crew-inventory', 'crew-production', 'crew-event-admin', 'manning',
    'production-manager', 'inventory-officer', 'workforce', 'security-audit',
    'rbac', 'overview',
  ])
  const targetUrlRoute = (urlParamRoute && validRoutes.has(urlParamRoute as Route)) ? (urlParamRoute as Route) : null

  // Role-priority initial route: first matching condition wins.
  const roleHome: Route =
    isManningOfficer           ? 'manning'
    : isGroundCrewWarehouse    ? 'crew-warehouse'
    : isGroundCrewField        ? 'crew-field'
    : isGroundCrewInventory    ? 'crew-inventory'
    : isGroundCrewProduction   ? 'crew-production'
    : isGroundCrewEventAdmin   ? 'crew-event-admin'
    : isGroundCrew             ? 'field-ops'
    : isProductionManager      ? 'production-manager'
    : isInventoryOfficer       ? 'inventory-officer'
    : isPlanner                 ? 'canvas'
    : isExecutive               ? 'dashboard'
    : isAdmin                   ? 'overview'
    : isWarehouse               ? 'overview'
    : hasWorkforceHighlight     ? 'workforce'
    :                             'overview'

  const initialRoute = targetUrlRoute || roleHome

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
