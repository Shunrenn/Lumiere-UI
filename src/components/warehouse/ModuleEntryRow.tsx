import { WAREHOUSE_MODULES, type WarehouseModuleId } from '@/lib/warehouse-modules'

interface ModuleEntryRowProps {
  onOpenModule: (id: WarehouseModuleId) => void
}

export function ModuleEntryRow({ onOpenModule }: ModuleEntryRowProps) {
  return (
    <div className="grid grid-cols-7 gap-2.5 sm:gap-3.5 w-full">
      {WAREHOUSE_MODULES.map((module) => {
        const Icon = module.icon
        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onOpenModule(module.id)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-border/80 bg-card/95 px-2 py-3.5 text-center shadow-xs backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-md hover:ring-1 hover:ring-primary/20"
          >
            <span className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25">
              <Icon className="size-4 sm:size-4.5" aria-hidden="true" />
            </span>
            <span className="text-[0.58rem] sm:text-[0.62rem] font-bold uppercase leading-tight tracking-[0.05em] text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
              {module.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
