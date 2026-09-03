import { cn } from '@/lib/utils'
import type { WarehouseModuleId } from '@/lib/warehouse-modules'

interface StatDefinition {
  label: string
  value: number
  border: string
  moduleId: WarehouseModuleId
}

interface StatStripProps {
  criticalDeficits: number
  pendingProcurements: number
  activeBatchesInTransit: number
  crewConflictsFlagged: number
  onOpenModule: (id: WarehouseModuleId) => void
}

export function StatStrip({
  criticalDeficits,
  pendingProcurements,
  activeBatchesInTransit,
  crewConflictsFlagged,
  onOpenModule,
}: StatStripProps) {
  const stats: StatDefinition[] = [
    { label: 'Critical Deficits', value: criticalDeficits, border: 'border-l-destructive', moduleId: 'replenishment' },
    { label: 'Pending Procurements', value: pendingProcurements, border: 'border-l-primary', moduleId: 'replenishment' },
    { label: 'Active Batches In Transit', value: activeBatchesInTransit, border: 'border-l-accent-foreground/40', moduleId: 'dispatch' },
    { label: 'Crew Conflicts Flagged', value: crewConflictsFlagged, border: 'border-l-muted-foreground', moduleId: 'manning' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <button
          key={stat.label}
          type="button"
          onClick={() => onOpenModule(stat.moduleId)}
          className={cn(
            'rounded-lg border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent',
            'border-l-4',
            stat.border,
          )}
        >
          <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{stat.value}</p>
          <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
            {stat.label}
          </p>
        </button>
      ))}
    </div>
  )
}
