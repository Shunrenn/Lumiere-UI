import { cn } from '@/lib/utils'
import { useNav } from '@/lib/nav'
import { EXECUTIVE_DESTINATIONS, type ExecutiveDestinationId } from '@/lib/executive-destinations'

interface ExecutiveRailProps {
  activeId: ExecutiveDestinationId
  onSelect: (id: ExecutiveDestinationId) => void
}

// The Executive rail is collapsed by default. Only the Lumière mark toggles
// its expanded state; destination buttons always navigate and preserve the active tab.
export function ExecutiveRail({ activeId, onSelect }: ExecutiveRailProps) {
  const { sidebarExpanded: expanded, setSidebarExpanded: setExpanded } = useNav()

  return (
    <aside className={cn('fixed bottom-0 inset-x-0 z-40 flex w-full flex-col border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] pt-2 md:static md:h-full md:w-auto md:border-r md:border-t-0 md:py-4 md:transition-[width] md:duration-200', expanded ? 'md:w-56' : 'md:w-16')}>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded} className={cn('hidden min-h-11 items-center text-sidebar-primary md:flex md:min-h-0', expanded ? 'justify-start px-4 md:px-5' : 'justify-center')}><span className="font-serif text-lg font-medium leading-none">{expanded ? 'LUMIÈRE' : 'L'}</span></button>
      <div className={cn('my-2 hidden h-px bg-sidebar-border md:my-3 md:block', expanded ? 'mx-4 md:mx-5' : 'mx-4')} aria-hidden="true" />
      <nav className={cn('flex min-w-0 gap-1 overflow-x-auto px-2 pb-1 md:flex-col md:gap-2 md:overflow-visible md:pb-0', expanded ? 'md:px-3' : 'md:items-center')} aria-label="Executive destinations">
        {EXECUTIVE_DESTINATIONS.map((destination) => { const Icon = destination.icon; const active = destination.id === activeId; return <button key={destination.id} type="button" onClick={(event) => { event.stopPropagation(); setExpanded((value) => destination.id === activeId ? !value : value); onSelect(destination.id) }} aria-label={destination.label} aria-current={active ? 'true' : undefined} title={!expanded ? destination.label : undefined} className={cn('flex min-h-11 shrink-0 items-center rounded-lg transition-colors md:h-10 md:min-h-0', expanded ? 'w-full gap-2 px-3 md:gap-3' : 'size-11 justify-center md:size-10', active ? 'border-l-4 border-[#2c2825] bg-[#e6e0d8] text-[#2c2825] font-semibold shadow-sm dark:border-[#e8dfd2] dark:bg-[#3a342e] dark:text-[#f5eee5]' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}><Icon className="size-4 shrink-0" aria-hidden="true" />{expanded && <span className="max-w-24 truncate text-[0.6rem] font-semibold uppercase tracking-[0.08em] md:max-w-none md:text-xs md:tracking-[0.12em]">{destination.label}</span>}</button> })}
      </nav>
    </aside>
  )
}
