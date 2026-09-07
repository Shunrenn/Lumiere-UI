import type { CrewRow, Staff } from '@/lib/warehouse-crew'
import { isTeamLead } from '@/lib/warehouse-crew'
import { cn } from '@/lib/utils'

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border">
      {initials}
    </span>
  )
}

interface FifoSelectorProps {
  fifoPicks: CrewRow[]
  slotCount: number
  availableCount: number
  staffList?: Staff[]
  declarations?: any[]
  date?: string
}

export function FifoSelector({
  fifoPicks,
  slotCount,
  availableCount,
  staffList = [],
  declarations = [],
  date,
}: FifoSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">First-In, First-Out (FIFO) Auto-Selection</p>
        <p className="mt-0.5 text-[0.7rem]">
          Auto-retrieving the first {slotCount} available, non-conflicting crew members in roster order ({availableCount} available in pool).
        </p>
      </div>

      {fifoPicks.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No available crew members found for FIFO auto-assignment.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fifoPicks.map((crew) => {
            const isLead = isTeamLead(crew, staffList, declarations, date)
            return (
              <div
                key={crew.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Avatar name={crew.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-foreground">{crew.name}</p>
                      {isLead && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[0.52rem] font-bold uppercase tracking-wider text-primary">
                          Lead
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                      {crew.role}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded bg-emerald-500/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Auto-Picked
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
