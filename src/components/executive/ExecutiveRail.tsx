import { useState, useMemo } from 'react'
import { PanelLeft, Sun, Moon, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXECUTIVE_DESTINATIONS, type ExecutiveDestinationId } from '@/lib/executive-destinations'
import { useAuth } from '@/lib/auth'
import { useDarkMode } from '@/lib/theme'
import { canAccessRoute } from '@/lib/route-guard'

interface ExecutiveRailProps {
  activeId: ExecutiveDestinationId
  onSelect: (id: ExecutiveDestinationId) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

// Collapsible left navigation sidebar for the Executive console.
// Supports both icon-only collapsed (w-16) and fully labeled expanded (w-64) states,
// with persistent collapse memory in localStorage, keyboard/screen-reader accessibility,
// conditional RBAC filtering, and accessible profile/theme/logout controls.
export function ExecutiveRail({
  activeId,
  onSelect,
  collapsed: externalCollapsed,
  onToggleCollapse: externalToggleCollapse,
}: ExecutiveRailProps) {
  const { canAccessAssetInventory, isExecutiveLite, adminName, adminRole, setConfirmLogout, currentUser } = useAuth()
  const { dark, toggle: toggleTheme } = useDarkMode()

  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('_lumiere_executive_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const isControlled = externalCollapsed !== undefined && externalToggleCollapse !== undefined
  const isCollapsed = isControlled ? externalCollapsed : internalCollapsed

  const handleToggle = () => {
    if (isControlled) {
      externalToggleCollapse()
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev
        try {
          localStorage.setItem('_lumiere_executive_sidebar_collapsed', String(next))
        } catch {}
        return next
      })
    }
  }

  // Order and filter destinations based on role:
  // For Executive Lite: 1. Dashboard, 2. Event Operations, 3. Asset Allocation
  // For Full Executive: Preserve existing EXECUTIVE_DESTINATIONS order and capabilities
  // For other shared shell consumers (e.g. Event Planner): filter strictly by canAccessRoute to prevent role leaks
  const visibleDestinations = useMemo(() => {
    if (isExecutiveLite) {
      const liteOrder: ExecutiveDestinationId[] = ['dashboard', 'registry', 'inventory']
      return liteOrder
        .map((id) => EXECUTIVE_DESTINATIONS.find((d) => d.id === id)!)
        .filter((destination) => {
          if (!destination) return false
          if (destination.id === 'inventory') return canAccessAssetInventory
          return canAccessRoute(currentUser, destination.id)
        })
    }
    return EXECUTIVE_DESTINATIONS.filter((destination) => {
      if (destination.id === 'inventory' && !canAccessAssetInventory) return false
      return canAccessRoute(currentUser, destination.id)
    })
  }, [isExecutiveLite, canAccessAssetInventory, currentUser])

  // Executive Lite uses a fixed compact dark rail per client references
  const effectiveCollapsed = isExecutiveLite ? true : isCollapsed

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out select-none z-30',
        effectiveCollapsed ? 'w-16 items-center py-4 px-2' : 'w-64 py-4 px-3',
      )}
      aria-label="Executive Navigation Sidebar"
    >
      {/* Brand & Toggle header */}
      {effectiveCollapsed ? (
        <div className="flex flex-col items-center gap-3">
          <span
            className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 font-serif text-xl font-bold leading-none text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/20"
            aria-hidden="true"
          >
            L
          </span>
          {!isExecutiveLite && (
            <button
              type="button"
              onClick={handleToggle}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <PanelLeft className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary/10 font-serif text-lg font-medium leading-none text-sidebar-primary"
              aria-hidden="true"
            >
              L
            </span>
            <span className="font-serif text-sm font-semibold tracking-[0.2em] text-sidebar-primary">
              LUMIÈRE
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <PanelLeft className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className={cn('my-3 h-px bg-sidebar-border', effectiveCollapsed ? 'w-8' : 'w-full')} aria-hidden="true" />

      {/* Nav destinations */}
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden" aria-label="Executive destinations">
        {visibleDestinations.map((destination) => {
          const Icon = destination.icon
          const active = destination.id === activeId

          if (effectiveCollapsed) {
            return (
              <button
                key={destination.id}
                type="button"
                onClick={() => onSelect(destination.id)}
                aria-label={destination.label}
                aria-current={active ? 'true' : undefined}
                title={destination.label}
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg transition-colors',
                  active
                    ? isExecutiveLite
                      ? 'bg-amber-200 text-neutral-950 font-bold dark:bg-amber-400 dark:text-neutral-950 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            )
          }

          return (
            <button
              key={destination.id}
              type="button"
              onClick={() => onSelect(destination.id)}
              aria-current={active ? 'true' : undefined}
              title={destination.label}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition-colors text-left',
                active
                  ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{destination.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom Profile, Theme & Logout Region */}
      <div className={cn('pt-2 border-t border-sidebar-border flex flex-col gap-1', effectiveCollapsed ? 'items-center' : '')}>
        {/* Expanded Profile Info */}
        {!effectiveCollapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg bg-sidebar-accent/40">
            <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-primary/15 text-sidebar-primary shrink-0">
              <User className="size-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">{adminName || 'Executive'}</p>
              <p className="truncate text-[0.62rem] uppercase tracking-wider text-sidebar-foreground/60">{adminRole || 'Executive'}</p>
            </div>
          </div>
        )}

        {/* Theme Toggle */}
        {effectiveCollapsed ? (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
            className="flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {dark ? <Sun className="size-4 shrink-0" aria-hidden="true" /> : <Moon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        )}

        {/* Sign Out */}
        {effectiveCollapsed ? (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Sign out"
            title="Sign out"
            className="flex size-10 items-center justify-center rounded-lg text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Sign out</span>
          </button>
        )}
      </div>
    </aside>
  )
}
