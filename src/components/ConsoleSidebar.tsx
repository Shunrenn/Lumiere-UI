import { useEffect } from 'react'
import {
  LayoutGrid,
  Boxes,
  Users,
  LogOut,
  X,
  PenTool,
  Sun,
  Moon,
  ShieldCheck,
  ScrollText,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNav } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { useDarkMode } from '@/lib/theme'
import type { Route } from '@/lib/types'
import { getWarehouseModule, type WarehouseModuleId, WAREHOUSE_DESTINATIONS } from '@/lib/warehouse-modules'
import { canAccessRoute } from '@/lib/route-guard'

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

const warehouseNavItems: NavItem[] = WAREHOUSE_DESTINATIONS.map((destination) => {
  const module = getWarehouseModule(destination.id as WarehouseModuleId)
  return { label: destination.label, blurb: module?.blurb ?? `${destination.label} workspace`, icon: destination.icon, route: destination.route, moduleId: module?.id }
})

const plannerNavItems: NavItem[] = [
  { label: 'Dashboard', blurb: 'Assigned events and recent design work', icon: LayoutGrid, route: 'dashboard' },
  { label: 'Design Projects', blurb: 'Assigned event canvases', icon: PenTool, route: 'design-projects' },
  { label: 'Mood Boards', blurb: 'Creative references and inspiration', icon: Palette, route: 'mood-boards' },
  { label: 'Asset Catalog', blurb: 'Read-only décor and asset catalog', icon: Boxes, route: 'inventory' },
]

const routeParent: Partial<Record<Route, Route>> = {
  'event-detail': 'design-projects',
  'canvas-workspace': 'design-projects',
}

export interface ConsoleSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function ConsoleSidebar({ mobileOpen, onCloseMobile }: ConsoleSidebarProps) {
  const { route, navigate } = useNav()
  const { currentUser, adminName, adminRole, isWarehouse, isPlanner, isAdmin, setConfirmLogout } = useAuth()
  const { dark, toggle } = useDarkMode()

  const baseNavItems = isAdmin ? adminNavItems : isPlanner ? plannerNavItems : isWarehouse ? warehouseNavItems : warehouseNavItems
  const navItems = baseNavItems.filter((item) => canAccessRoute(currentUser, item.route))

  useEffect(() => {
    if (!mobileOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen, onCloseMobile])

  const isActive = (item: NavItem) => route === item.route || routeParent[route] === item.route

  const navigation = (mobile = false) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6" aria-label="Console destinations">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item)
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              navigate(item.route)
              if (mobile) onCloseMobile()
            }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
              active
                ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )

  const footer = (
    <div className="flex items-center justify-between gap-3 border-t border-sidebar-border px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-sidebar-foreground">{adminName}</p>
        <p className="truncate text-[0.62rem] uppercase tracking-[0.14em] text-sidebar-foreground/55">{adminRole}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary">
          {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => setConfirmLogout(true)} aria-label="Sign out" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary">
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-sidebar-border bg-sidebar lg:flex" aria-label="Console navigation">
        <div className="px-6 pb-5 pt-8">
          <div className="font-serif font-medium uppercase tracking-[0.28em] text-sidebar-primary logo-text">LUMIERE</div>
        </div>
        <div className="mx-5 h-px bg-sidebar-border" aria-hidden="true" />
        {navigation()}
        {footer}
      </aside>

      <div className={cn('fixed inset-0 z-40 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!mobileOpen}>
        <button type="button" onClick={onCloseMobile} aria-label="Close navigation menu" className={cn('absolute inset-0 cursor-default bg-neutral-950/60 transition-opacity duration-300', mobileOpen ? 'opacity-100' : 'opacity-0')} />
        <aside className={cn('absolute inset-y-0 left-0 flex w-[260px] max-w-[85%] flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-in-out', mobileOpen ? 'translate-x-0' : '-translate-x-full')} role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="flex items-center justify-between px-6 pb-5 pt-8">
            <div className="font-serif font-medium uppercase tracking-[0.28em] text-sidebar-primary logo-text">LUMIERE</div>
            <button type="button" onClick={onCloseMobile} aria-label="Close menu" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mx-5 h-px bg-sidebar-border" aria-hidden="true" />
          {navigation(true)}
          {footer}
        </aside>
      </div>
    </>
  )
}
