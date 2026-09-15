import { cn } from '@/lib/utils'
import { useNav } from '@/lib/nav'
import { ADMIN_DESTINATIONS, type AdminDestinationId } from '@/lib/admin-destinations'

interface AdminRailProps {
  activeId: AdminDestinationId
  onSelect: (id: AdminDestinationId) => void
}

// The Admin rail is collapsed by default. Only the Lumière mark toggles its
// expanded state; destination buttons always navigate and preserve the active tab.
export function AdminRail({ activeId, onSelect }: AdminRailProps) {
  const { sidebarExpanded: expanded, setSidebarExpanded: setExpanded } = useNav()

  return (
    <aside className={cn('flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 transition-[width] duration-200', expanded ? 'w-56' : 'w-16')}>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded} className={cn('flex items-center text-sidebar-primary', expanded ? 'justify-start px-5' : 'justify-center')}><span className="font-serif text-lg font-medium leading-none">{expanded ? 'LUMIÈRE' : 'L'}</span></button>
      <div className={cn('my-3 h-px bg-sidebar-border', expanded ? 'mx-5' : 'mx-4')} aria-hidden="true" />
      <nav className={cn('flex flex-col gap-2', expanded ? 'px-3' : 'items-center')} aria-label="Admin destinations">
        {ADMIN_DESTINATIONS.map((destination) => { const Icon = destination.icon; const active = destination.id === activeId; return <button key={destination.id} type="button" onClick={(event) => { event.stopPropagation(); setExpanded((value) => destination.id === activeId ? !value : value); onSelect(destination.id) }} aria-label={destination.label} aria-current={active ? 'true' : undefined} title={!expanded ? destination.label : undefined} className={cn('flex h-10 items-center rounded-lg transition-colors', expanded ? 'w-full gap-3 px-3' : 'size-10 justify-center', active ? 'border-l-4 border-[#2c2825] bg-[#e6e0d8] text-[#2c2825] font-semibold shadow-sm dark:border-[#e8dfd2] dark:bg-[#3a342e] dark:text-[#f5eee5]' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}><Icon className="size-4 shrink-0" aria-hidden="true" />{expanded && <span className="truncate text-xs font-semibold uppercase tracking-[0.12em]">{destination.label}</span>}</button> })}
      </nav>
    </aside>
  )
}
