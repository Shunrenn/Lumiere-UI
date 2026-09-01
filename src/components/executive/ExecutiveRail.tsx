import { cn } from '@/lib/utils'
import { EXECUTIVE_DESTINATIONS, type ExecutiveDestinationId } from '@/lib/executive-destinations'

interface ExecutiveRailProps {
  activeId: ExecutiveDestinationId
  onSelect: (id: ExecutiveDestinationId) => void
}

// Constant left icon rail for the Executive console — matches AdminRail
// exactly (same dimensions, brand mark, and button styling). Every Executive
// screen sits at the same level, so the rail never hides or collapses, and it
// lives outside the scroll container so it stays fixed.
export function ExecutiveRail({ activeId, onSelect }: ExecutiveRailProps) {
  return (
    <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-4">
      <span
        className="flex size-8 items-center justify-center font-serif text-lg font-medium leading-none text-sidebar-primary"
        aria-hidden="true"
      >
        L
      </span>

      <div className="my-3 h-px w-8 bg-sidebar-border" aria-hidden="true" />

      <nav className="flex flex-col items-center gap-2" aria-label="Executive destinations">
        {EXECUTIVE_DESTINATIONS.map((destination) => {
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
