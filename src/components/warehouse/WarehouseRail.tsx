import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WAREHOUSE_MODULES, type WarehouseModuleId } from '@/lib/warehouse-modules'

interface WarehouseRailProps {
  activeModuleId: WarehouseModuleId
  onSelectModule: (id: WarehouseModuleId) => void
  onExit: () => void
}

export function WarehouseRail({ activeModuleId, onSelectModule, onExit }: WarehouseRailProps) {
  return (
    <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-4">
      <span
        className="flex size-8 items-center justify-center font-serif text-lg font-medium leading-none text-sidebar-primary"
        aria-hidden="true"
      >
        L
      </span>

      <button
        type="button"
        onClick={onExit}
        aria-label="Back to dashboard"
        title="Back to dashboard"
        className="mt-5 flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
      </button>

      <div className="my-3 h-px w-8 bg-sidebar-border" aria-hidden="true" />

      <nav className="flex flex-col items-center gap-2" aria-label="Warehouse modules">
        {WAREHOUSE_MODULES.map((module) => {
          const Icon = module.icon
          const active = module.id === activeModuleId
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onSelectModule(module.id)}
              aria-label={module.label}
              aria-current={active ? 'true' : undefined}
              title={module.label}
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
