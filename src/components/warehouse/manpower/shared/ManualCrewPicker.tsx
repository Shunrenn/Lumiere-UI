import { useMemo, useState } from 'react'
import { Check, Lock, Search } from 'lucide-react'
import type { CrewRow, Staff, DutyCategory } from '@/lib/warehouse-crew'
import { isTeamLead, checkSymmetricConflict, crewHasConflict } from '@/lib/warehouse-crew'
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

interface ManualCrewPickerProps {
  crewRows: CrewRow[]
  selectedIds: Set<string>
  onToggle: (crew: CrewRow) => void
  eventId?: string
  date?: string
  targetCategory?: DutyCategory
  overriddenStaffIds?: Set<string>
  staffList?: Staff[]
  declarations?: any[]
}

export function ManualCrewPicker({
  crewRows,
  selectedIds,
  onToggle,
  eventId,
  date,
  targetCategory = 'Field',
  overriddenStaffIds = new Set(),
  staffList = [],
  declarations = [],
}: ManualCrewPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return crewRows
    return crewRows.filter((c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q))
  }, [crewRows, search])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search crew member by name or role..."
          className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No crew members match the search query.</p>
        ) : (
          filtered.map((crew) => {
            const isSelected = selectedIds.has(crew.staffId)
            const isOverridden = overriddenStaffIds.has(crew.staffId)
            const isLead = isTeamLead(crew, staffList, declarations, date)

            // Event-based conflict
            const hasEventConflict = eventId ? crewHasConflict(crew, eventId) : false

            // Symmetric conflict (Field vs Daily Duty)
            const symmetric = date ? checkSymmetricConflict(crew.staffId, date, targetCategory) : { hasConflict: false }
            const hasSymmetricConflict = symmetric.hasConflict

            const isHardBlocked = (hasEventConflict || hasSymmetricConflict) && !isOverridden

            return (
              <button
                key={crew.id}
                type="button"
                onClick={() => onToggle(crew)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition',
                  isSelected
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-border bg-background hover:bg-accent/40',
                )}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <Avatar name={crew.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs text-foreground">{crew.name}</p>
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

                <div className="flex items-center gap-2 shrink-0">
                  {crew.status === 'On Leave' ? (
                    <span className="rounded bg-destructive/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-destructive">
                      On Leave
                    </span>
                  ) : isHardBlocked ? (
                    <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-destructive">
                      <Lock className="size-3" />
                      {symmetric.conflictType ? `Blocked (${symmetric.conflictType})` : 'Double Booked'}
                    </span>
                  ) : isOverridden ? (
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Overridden
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Available
                    </span>
                  )}

                  {isSelected && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
