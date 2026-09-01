import { WAREHOUSE_MODULES, type WarehouseModuleId } from '@/lib/warehouse-modules'

interface ModuleEntryRowProps {
  onOpenModule: (id: WarehouseModuleId) => void
}

export function ModuleEntryRow({ onOpenModule }: ModuleEntryRowProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {WAREHOUSE_MODULES.map((module) => {
        const Icon = module.icon
        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onOpenModule(module.id)}
            className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-4 text-center transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="text-[0.62rem] font-semibold uppercase leading-tight tracking-[0.08em] text-card-foreground">
              {module.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
