import { useState } from 'react'
import { cn } from '@/shared/utils'
import { ADMIN_DESTINATIONS, type AdminDestinationId } from '@/lib/admin-destinations'
interface AdminRailProps {
  activeId: AdminDestinationId
  onSelect: (id: AdminDestinationId) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

// Collapsible left navigation sidebar for the Admin console.
// Supports both icon-only collapsed (w-16) and fully labeled expanded (w-64) states,
// with persistent collapse memory in localStorage, keyboard/screen-reader accessibility,
// and a clean navigation-only lower edge.
export function AdminRail({
  activeId,
  onSelect,
  collapsed: externalCollapsed,
  onToggleCollapse: externalToggleCollapse,
}: AdminRailProps) {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('_lumiere_admin_sidebar_collapsed') === 'true'
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
          localStorage.setItem('_lumiere_admin_sidebar_collapsed', String(next))
        } catch {}
        return next
      })
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out select-none z-30',
        isCollapsed ? 'w-16 items-center py-4 px-2' : 'w-64 py-4 px-3',
      )}
      aria-label="Admin Navigation Sidebar"
    >
      {/* Navigation items control expansion when the current item is clicked again. */}
      <div className={cn('flex items-center px-2 pb-1', isCollapsed ? 'justify-center' : 'gap-2.5')}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/10 font-serif text-lg font-medium leading-none text-sidebar-primary" aria-hidden="true">L</span>
        {!isCollapsed && <span className="font-serif text-sm font-semibold tracking-[0.2em] text-sidebar-primary">LUMIÈRE</span>}
      </div>

      <div className={cn('my-3 h-px bg-sidebar-border', isCollapsed ? 'w-8' : 'w-full')} aria-hidden="true" />

      {/* Nav destinations */}
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden" aria-label="Admin destinations">
        {ADMIN_DESTINATIONS.map((destination) => {
          const Icon = destination.icon
          const active = destination.id === activeId

          if (isCollapsed) {
            return (
              <button
                key={destination.id}
                type="button"
                onClick={() => { if (active) handleToggle(); else onSelect(destination.id) }}
                aria-label={destination.label}
                aria-current={active ? 'true' : undefined}
                title={destination.label}
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
          }

          return (
            <button
              key={destination.id}
              type="button"
              onClick={() => { if (active) handleToggle(); else onSelect(destination.id) }}
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
