import { useState, useMemo } from 'react'
import { cn } from '@/shared/utils'
import { EXECUTIVE_DESTINATIONS, type ExecutiveDestinationId, type SharedRailDestination } from '@/lib/executive-destinations'
import { useAuth } from '@/lib/auth'
import { canAccessRoute } from '@/lib/route-guard'

interface ExecutiveRailProps<T extends string = ExecutiveDestinationId> {
  activeId: T
  onSelect: (id: T) => void
  destinations?: readonly SharedRailDestination[]
  identityRoleLabel?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

// Collapsible left navigation sidebar for the Executive console.
// Supports both icon-only collapsed (w-16) and fully labeled expanded (w-64) states,
// with persistent collapse memory in localStorage, keyboard/screen-reader accessibility,
// conditional RBAC filtering, and accessible profile/theme/logout controls.
export function ExecutiveRail<T extends string = ExecutiveDestinationId>({
  activeId,
  onSelect,
  collapsed: externalCollapsed,
  onToggleCollapse: externalToggleCollapse,
  destinations,
  identityRoleLabel: _identityRoleLabel,
}: ExecutiveRailProps<T>) {
  const { canAccessAssetInventory, isExecutiveLite, currentUser } = useAuth()

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
    if (destinations) return destinations
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
  }, [destinations, isExecutiveLite, canAccessAssetInventory, currentUser])

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
      <div className={cn('flex items-center px-2 pb-1', effectiveCollapsed ? 'justify-center' : 'gap-2.5')}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 font-serif text-lg font-bold leading-none text-amber-600 shadow-sm ring-1 ring-amber-500/20 dark:text-amber-400" aria-hidden="true">L</span>
        {!effectiveCollapsed && <span className="font-serif text-sm font-semibold tracking-[0.2em] text-sidebar-primary">LUMIÈRE</span>}
      </div>

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
                onClick={() => { if (active && !isExecutiveLite) handleToggle(); else onSelect(destination.id as T) }}
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
              onClick={() => { if (active && !isExecutiveLite) handleToggle(); else onSelect(destination.id as T) }}
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

    </aside>
  )
}
