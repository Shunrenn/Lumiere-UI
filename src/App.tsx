import './App.css'
import { useEffect, useState } from 'react'
import { NavProvider, useNav } from '@/lib/nav'
import { PortalProvider } from '@/lib/store'
import { AdminGrowthSummaryProvider } from '@/lib/admin-growth-summary'
import { AuthProvider, useAuth } from '@/lib/auth'
import { LogoutModal } from '@/components/LogoutModal'
import { loadRosterFromDatabase } from '@/lib/roster'
import { LoginPage } from '@/pages/LoginPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { AdminSystemDashboardPage } from '@/pages/AdminSystemDashboardPage'
import { AdminWorkforcePage } from '@/pages/AdminWorkforcePage'
import { AdminSecurityAuditPage } from '@/pages/AdminSecurityAuditPage'
import { AdminRolesPage } from '@/pages/AdminRolesPage'
import { WarehouseHomePage } from '@/pages/WarehouseHomePage'
import { EventDashboardPage } from '@/pages/EventDashboardPage'
import { EventRegistryPage } from '@/pages/EventRegistryPage'
import { ReplenishmentPage } from '@/pages/ReplenishmentPage'
import { ActivityLogsPage } from '@/pages/ActivityLogsPage'
import { DamageValidationPage } from '@/pages/DamageValidationPage'
import { InventoryStockPage } from '@/pages/InventoryStockPage'
import { WarehouseLogsPage } from '@/pages/WarehouseLogsPage'
import { CrewRosterPage } from '@/pages/CrewRosterPage'
import { TaskDeploymentsPage } from '@/pages/TaskDeploymentsPage'
import { DispatchManifestPage } from '@/pages/DispatchManifestPage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { DesignCanvasHubPage } from '@/pages/DesignCanvasHubPage'
import { CanvasWorkspacePage } from '@/pages/CanvasWorkspacePage'
import { GroundCrewPage } from '@/pages/GroundCrewPage'
import { GroundCrewLoginPage } from '@/pages/GroundCrewLoginPage'
import { WarehouseLeadPage } from '@/pages/WarehouseLeadPage'
import { WarehouseMemberPage } from '@/pages/WarehouseMemberPage'
import { ManningPage } from '@/pages/ManningPage'
import { ProductionManagerPage } from '@/pages/ProductionManagerPage'
import { InventoryOfficerPage } from '@/pages/InventoryOfficerPage'
import { PlannerProvider } from '@/lib/planner'
import { WarehouseProvider } from '@/lib/warehouse'

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
  const { route } = useNav()
  const { portal, isWarehouse, isAdmin, isProductionManager, isInventoryOfficer, hasFullWarehouseAccess } = useAuth()
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
      ) : isWarehouse ? (
        <WarehouseHomePage />
      ) : (
        <OverviewPage />
      )
  }
}

function Gate() {
  const { isAuthenticated, isWarehouse, isWarehouseLead, isWarehouseMember, isPlanner, isGroundCrew, isExecutive, isProductionManager, isInventoryOfficer, isManningOfficer, hasFullWarehouseAccess } = useAuth()
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

  // A deep-linked ?highlight=<staffId> (from the User Growth Summary modal)
  // should land straight on Workforce Management on a fresh load/refresh —
  // scoped to this one param, not a general URL-routing migration.
  const hasWorkforceHighlight =
    new URLSearchParams(window.location.search).has('highlight') || Boolean(window.history.state?.highlight)

  const initialRoute = isManningOfficer
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
            : isWarehouse
              ? 'overview'
              : hasWorkforceHighlight
                ? 'workforce'
                : isExecutive
                  ? 'dashboard'
                  : 'overview'

  return (
    <NavProvider initialRoute={initialRoute}>
      <AdminGrowthSummaryProvider>
        <Router />
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
            <Gate />
            <LogoutModal />
          </WarehouseProvider>
        </PlannerProvider>
      </PortalProvider>
    </AuthProvider>
  )
}

export default App
