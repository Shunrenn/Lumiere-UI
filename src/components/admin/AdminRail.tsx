import { cn } from '@/lib/utils'
import { ADMIN_DESTINATIONS, type AdminDestinationId } from '@/lib/admin-destinations'

interface AdminRailProps {
  activeId: AdminDestinationId
  onSelect: (id: AdminDestinationId) => void
}

// Constant left icon rail for the Admin console. Unlike WOM's rail this never
// hides or collapses — every Admin screen sits at the same level (Canva-style),
// so the rail is a true constant present on the dashboard and every future
// destination. Lives outside the scroll container so it stays fixed.
export function AdminRail({ activeId, onSelect }: AdminRailProps) {
  return (
    <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-4">
      <span
        className="flex size-8 items-center justify-center font-serif text-lg font-medium leading-none text-sidebar-primary"
        aria-hidden="true"
      >
        L
      </span>

      <div className="my-3 h-px w-8 bg-sidebar-border" aria-hidden="true" />

      <nav className="flex flex-col items-center gap-2" aria-label="Admin destinations">
        {ADMIN_DESTINATIONS.map((destination) => {
          const Icon = destination.icon
          const active = destination.id === activeId
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
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
