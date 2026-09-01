import { useEffect } from 'react'
import {
  LayoutGrid,
  ClipboardList,
  PackageSearch,
  Boxes,
  Warehouse,
  Users,
  Truck,
  User,
  LogOut,
  X,
  PenTool,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNav } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { useDarkMode } from '@/lib/theme'

import type { Route } from '@/lib/types'

type NavItem = { label: string; icon: typeof LayoutGrid; route: Route }

// NOTE: Admins no longer use this legacy sidebar shell at all — they run
// entirely on the icon-rail AdminShell (AdminRail + AdminTopBar). The old
// admin nav config was removed so the superseded admin sidebar can never
// render again.
//
// Executives are the same: they run entirely on the icon-rail ExecutiveShell
// (ExecutiveRail + ExecutiveTopBar). The old executive nav config was removed
// so the superseded labeled sidebar can never render for Executive either.

const warehouseNavItems: NavItem[] = [
  { label: 'Overview', icon: LayoutGrid, route: 'overview' },
  { label: 'Inventory Stock', icon: Boxes, route: 'inventory' },
  { label: 'Replenishment', icon: PackageSearch, route: 'replenishment' },
  { label: 'Warehouse Logs', icon: Warehouse, route: 'warehouse-logs' },
  { label: 'Crew Roster', icon: Users, route: 'crew' },
  { label: 'Task Deployments', icon: ClipboardList, route: 'deployments' },
  { label: 'Dispatch Records', icon: Truck, route: 'dispatch' },
]

const plannerNavItems: NavItem[] = [
  { label: 'Design Canvas', icon: PenTool, route: 'canvas' },
]

/* Sub-routes highlight their parent nav entry. */
const routeParent: Partial<Record<Route, Route>> = {
  'event-detail': 'canvas',
  'canvas-workspace': 'canvas',
}

interface ContentProps {
  collapsed: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
  showBrand?: boolean
}

export interface ConsoleSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function ConsoleSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: ConsoleSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 hidden flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out lg:flex',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} showBrand />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Overlay */}
        <div
          onClick={onCloseMobile}
          className={cn(
            'absolute inset-0 bg-neutral-900/60 transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        {/* Panel */}
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex items-center justify-between px-6 pt-8 pb-6">
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

          <SidebarContent collapsed={false} onNavigate={onCloseMobile} />
        </aside>
      </div>
    </>
  )
}

function SidebarContent({ collapsed, onNavigate, onToggleCollapse, showBrand }: ContentProps) {
  const { route, navigate } = useNav()
  const { adminName, adminRole, isWarehouse, isPlanner, setConfirmLogout, confirmLogout } =
    useAuth()
  const { dark, toggle } = useDarkMode()

  // This legacy shell is only used by planner / warehouse roles now. Admins
  // run on the icon-rail AdminShell and Executives run on the icon-rail
  // ExecutiveShell, so there is no admin or executive case here.
  const navItems = isPlanner ? plannerNavItems : isWarehouse ? warehouseNavItems : []

  const go = (r: Route) => {
    const isActive = route === r || routeParent[route] === r
    if (isActive && onToggleCollapse) {
      // Clicking the already-active item toggles the sidebar collapse/expand
      onToggleCollapse()
    } else {
      navigate(r)
      onNavigate?.()
    }
  }

  // Disable scroll when logout modal is open
  useEffect(() => {
    if (confirmLogout) {
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [confirmLogout])

  return (
    <>
      {/* Brand header (desktop) — click to collapse/expand */}
      {showBrand && (
        <div
          className={cn(
            'flex items-center pt-8 pb-6',
            collapsed ? 'justify-center px-3' : 'px-6',
          )}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center rounded-md transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
          >
            {collapsed ? (
              <span className="flex size-9 items-center justify-center font-serif text-2xl font-medium leading-none text-sidebar-primary">
                L
              </span>
            ) : (
              <h1 className="font-serif text-xl font-medium tracking-[0.3em] text-sidebar-primary">
                LUMIÈRE
              </h1>
            )}
          </button>
        </div>
      )}

      {/* Navigation — scrollable area */}
      <nav className={cn('flex flex-1 flex-col gap-1.5 overflow-y-auto', collapsed ? 'px-3' : 'px-4')}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = route === item.route || routeParent[route] === item.route
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => go(item.route)}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md text-left text-xs font-semibold uppercase tracking-[0.15em] transition-colors',
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed && item.label}
            </button>
          )
        })}

      </nav>

      {/* User card */}
      <div
        className={cn(
          'm-4 flex items-center rounded-lg bg-sidebar-accent',
          collapsed ? 'flex-col gap-3 px-2 py-3' : 'gap-3 px-4 py-4',
        )}
      >
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 ring-1 ring-sidebar-border">
          <User className="size-5 text-sidebar-accent-foreground" aria-hidden="true" />
          <span
            className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar-accent"
            aria-label="Online"
          />
        </span>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.15em] text-sidebar-accent-foreground">
              {adminName}
            </p>
            <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-sidebar-foreground/60">
              {adminRole}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={toggle}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-primary/20 hover:text-sidebar-accent-foreground"
        >
          {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          aria-label="Sign out"
          title="Sign out"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-primary/20 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </>
  )
}
