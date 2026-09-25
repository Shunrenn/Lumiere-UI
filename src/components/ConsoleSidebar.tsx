import { useState } from 'react'
import {
  LayoutGrid,
  ClipboardList,
  PackageSearch,
  Boxes,
  Warehouse,
  Users,
  Truck,
  LogOut,
  X,
  PenTool,
  Sun,
  Moon,
  AlertTriangle,
  PanelLeft,
  ChevronRight,
  ShieldCheck,
  ScrollText,
  FileText,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNav } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { useDarkMode } from '@/lib/theme'
import type { Route } from '@/lib/types'
import { getWarehouseModule, type WarehouseModuleId } from '@/lib/warehouse-modules'

type NavItem = {
  label: string
  blurb: string
  icon: typeof LayoutGrid
  route: Route
  moduleId?: WarehouseModuleId
}

const adminNavItems: NavItem[] = [
  { label: 'System Dashboard', blurb: 'Overall system performance & metrics', icon: LayoutGrid, route: 'overview' },
  { label: 'Workforce Management', blurb: 'Manage users, roles & accounts', icon: Users, route: 'workforce' },
  { label: 'Roles & Sub-Roles', blurb: 'Configure access permissions & sub-roles', icon: ShieldCheck, route: 'rbac' },
  { label: 'Security Audit Logs', blurb: 'Review security events & system audit trail', icon: ScrollText, route: 'security-audit' },
]

// Executive: strategic view — per owner decision (2026-09-25).
// Scope (5 exact items): dashboard, registry, damage, logs, inventory.
const executiveNavItems: NavItem[] = [
  { label: 'Event Dashboard', blurb: 'Cross-portfolio event analytics & KPI dashboard', icon: LayoutGrid, route: 'dashboard' },
  { label: 'Event Registry', blurb: 'Operations portfolio registry and event records', icon: FileText, route: 'registry' },
  { label: 'Damage Oversight', blurb: 'Damage validation & Held-for-Audit dual-custody sign-off', icon: AlertTriangle, route: 'damage' },
  { label: 'Activity Logs', blurb: 'Audit trail and system event logs', icon: Shield, route: 'logs' },
  { label: 'Stock Catalog', blurb: 'Read-only inventory stock catalog', icon: Boxes, route: 'inventory' },
]

const warehouseNavItems: NavItem[] = [
  { label: 'Overview', blurb: 'Operations metrics & activity dashboard', icon: LayoutGrid, route: 'overview' },
  { label: 'Inventory Stock', blurb: 'Category-specific asset levels and stock tracking', icon: Boxes, route: 'inventory', moduleId: 'assets' },
  { label: 'Damage Validation', blurb: 'Item damage history and inspection reports', icon: AlertTriangle, route: 'damage', moduleId: 'incidents' },
  { label: 'Replenishment', blurb: 'Deficit tracking & reorder requisitions', icon: PackageSearch, route: 'replenishment', moduleId: 'replenishment' },
  { label: 'Warehouse Logs', blurb: 'Audit trail and ledger entries', icon: Warehouse, route: 'warehouse-logs' },
  { label: 'Crew Roster', blurb: 'Staff shift roster & auto-allocations', icon: Users, route: 'crew', moduleId: 'manning' },
  { label: 'Task Deployments', blurb: 'Active event task force deployments', icon: ClipboardList, route: 'deployments' },
  { label: 'Dispatch Records', blurb: 'Fleet manifests and transit checkpoints', icon: Truck, route: 'dispatch', moduleId: 'dispatch' },
]

const plannerNavItems: NavItem[] = [
  { label: 'Design Canvas', blurb: 'Visual 2D/3D event layout canvas hub', icon: PenTool, route: 'canvas' },
  { label: 'Overview & Events', blurb: 'Event scheduling & project overview', icon: LayoutGrid, route: 'overview' },
  { label: 'Event Registry', blurb: 'Register and manage event portfolio records', icon: FileText, route: 'registry' },
  { label: 'Inventory Catalog', blurb: 'Browse venue décor and asset catalog', icon: Boxes, route: 'inventory' },
]

/* Sub-routes highlight their parent nav entry. */
const routeParent: Partial<Record<Route, Route>> = {
  'event-detail': 'canvas',
  'canvas-workspace': 'canvas',
}

export interface ConsoleSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function ConsoleSidebar({
  mobileOpen,
  onCloseMobile,
}: ConsoleSidebarProps) {
  const { route, navigate } = useNav()
  const { adminName, adminRole, isWarehouse, isPlanner, isAdmin, isExecutive, setConfirmLogout, subRole, hasFullWarehouseAccess, getModuleAccessLevel } = useAuth()
  const { dark, toggle } = useDarkMode()
  const [companionOpen, setCompanionOpen] = useState(false)

  // Nav item set is strictly scoped to each role group — no cross-role links.
  const navItems = isAdmin
    ? adminNavItems
    : isExecutive
    ? executiveNavItems
    : isPlanner
    ? plannerNavItems
    : isWarehouse
    ? warehouseNavItems
    : warehouseNavItems // fallback for unrecognized web roles

  const activeItem = navItems.find((item) => route === item.route || routeParent[route] === item.route) ?? navItems[0]

  const go = (r: Route) => {
    const isActive = route === r || routeParent[route] === r
    if (isActive) {
      setCompanionOpen((prev) => !prev)
    } else {
      navigate(r)
      setCompanionOpen(true)
    }
  }

  const moduleDetail = activeItem.moduleId ? getWarehouseModule(activeItem.moduleId) : null

  return (
    <>
      {/* ── Desktop Fixed Icon Rail (w-16) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-4 lg:flex">
        {/* Brand Mark */}
        <span
          className="flex size-8 items-center justify-center font-serif text-lg font-medium leading-none text-sidebar-primary"
          aria-hidden="true"
        >
          L
        </span>

        {/* Companion Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => setCompanionOpen((prev) => !prev)}
          aria-label={companionOpen ? 'Close companion panel' : 'Open companion panel'}
          title={companionOpen ? 'Close companion panel' : 'Open companion panel'}
          className={cn(
            'mt-4 flex size-10 items-center justify-center rounded-lg transition-colors',
            companionOpen
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <PanelLeft className="size-4" aria-hidden="true" />
        </button>

        <div className="my-3 h-px w-8 bg-sidebar-border" aria-hidden="true" />

        {/* Icon Navigation Rail */}
        <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Console destinations">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = route === item.route || routeParent[route] === item.route
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => go(item.route)}
                aria-label={item.label}
                aria-current={active ? 'true' : undefined}
                title={item.label}
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions: Theme + Logout */}
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-sidebar-border w-full">
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
            className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Sign out"
            title="Sign out"
            className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* ── Companion Panel Drawer (Desktop slide-over next to Icon Rail) ── */}
      {companionOpen && (
        <aside
          className="fixed inset-y-0 left-16 z-40 hidden w-72 flex-col border-r border-border bg-card shadow-2xl transition-all duration-200 lg:flex"
          aria-label="Companion Panel"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-5 py-5">
            <div>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
                {isAdmin ? 'Admin Console' : isExecutive ? 'Executive View' : isPlanner ? 'Planner Console' : 'Warehouse Module'}
              </p>
              <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">
                {activeItem.label}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{activeItem.blurb}</p>
            </div>
            <button
              type="button"
              onClick={() => setCompanionOpen(false)}
              aria-label="Close companion panel"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Module preview / sub-navigation items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {moduleDetail && (
              <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Module Capabilities
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {moduleDetail.previewPoints.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1">
              <p className="px-2 text-[0.56rem] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Console Navigation
              </p>
              {navItems.map((item) => {
                const Icon = item.icon
                const active = route === item.route || routeParent[route] === item.route
                const accessLevel = item.moduleId && subRole && !hasFullWarehouseAccess
                  ? getModuleAccessLevel(item.moduleId)
                  : null

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      navigate(item.route)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {accessLevel && (
                        <span className={cn(
                          'text-[0.55rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                          active
                            ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                            : accessLevel === 'Modify'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : accessLevel === 'Interact'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-muted text-muted-foreground border-border',
                        )}>
                          {accessLevel}
                        </span>
                      )}
                      <ChevronRight className="size-3.5 opacity-60" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* User footer */}
          <div className="border-t border-border p-4 bg-muted/20 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{adminName}</p>
              <p className="truncate text-[0.62rem] uppercase tracking-wider text-muted-foreground">{adminRole}</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="text-xs font-semibold text-destructive hover:underline"
            >
              Sign out
            </button>
          </div>
        </aside>
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className={cn(
            'absolute inset-0 bg-neutral-900/60 transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex items-center justify-between px-6 pt-8 pb-6 border-b border-sidebar-border">
            <h1 className="font-serif text-xl font-medium tracking-[0.3em] text-sidebar-primary">
              LUMIÈRE
            </h1>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = route === item.route || routeParent[route] === item.route
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    navigate(item.route)
                    onCloseMobile()
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sidebar-accent-foreground">{adminName}</p>
              <p className="text-[0.6rem] uppercase tracking-wider text-sidebar-foreground/60">{adminRole}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent"
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
