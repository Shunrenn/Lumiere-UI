import { useNav } from '@/lib/nav'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WAREHOUSE_MODULES, type WarehouseModuleId } from '@/lib/warehouse-modules'

interface WarehouseRailProps {
  activeModuleId?: WarehouseModuleId
  onSelectModule: (id: WarehouseModuleId) => void
  onExit: () => void
}

export function WarehouseRail({ activeModuleId, onSelectModule, onExit }: WarehouseRailProps) {
  const { sidebarExpanded: expanded, setSidebarExpanded: setExpanded } = useNav()

  return (
    <aside className={cn('flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 transition-[width] duration-200', expanded ? 'w-56' : 'w-16')}>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded} className={cn('flex items-center text-sidebar-primary', expanded ? 'justify-start px-5' : 'justify-center')}><span className="font-serif text-lg font-medium leading-none">{expanded ? 'LUMIÈRE' : 'L'}</span></button>
      <button type="button" onClick={onExit} aria-label="Back to dashboard" title={!expanded ? 'Back to dashboard' : undefined} className={cn('mt-5 flex h-10 items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', expanded ? 'mx-3 w-auto gap-3 px-3' : 'size-10 justify-center')}><ArrowLeft className="size-4 shrink-0" aria-hidden="true" />{expanded && <span className="text-xs font-semibold uppercase tracking-[0.12em]">Dashboard</span>}</button>
      <div className={cn('my-3 h-px bg-sidebar-border', expanded ? 'mx-5' : 'mx-4')} aria-hidden="true" />
      <nav className={cn('flex flex-col gap-2', expanded ? 'px-3' : 'items-center')} aria-label="Warehouse modules">
        {WAREHOUSE_MODULES.map((module) => { const Icon = module.icon; const active = module.id === activeModuleId; return <button key={module.id} type="button" onClick={(event) => { event.stopPropagation(); setExpanded((value) => module.id === activeModuleId ? !value : value); onSelectModule(module.id) }} aria-label={module.label} aria-current={active ? 'true' : undefined} title={!expanded ? module.label : undefined} className={cn('flex h-10 items-center rounded-lg transition-colors', expanded ? 'w-full gap-3 px-3' : 'size-10 justify-center', active ? 'border-l-4 border-[#2c2825] bg-[#e6e0d8] text-[#2c2825] font-semibold shadow-sm dark:border-[#e8dfd2] dark:bg-[#3a342e] dark:text-[#f5eee5]' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}><Icon className="size-4 shrink-0" aria-hidden="true" />{expanded && <span className="truncate text-xs font-semibold uppercase tracking-[0.12em]">{module.label}</span>}</button> })}
      </nav>
    </aside>
  )
}
