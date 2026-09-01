import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Staff } from '@/lib/types'
import { cycleShift, dayLabel, getCrewPool, getOpsWeekDates, useShiftGrid } from '@/lib/warehouse-crew'
import { cn } from '@/lib/utils'

const SHIFT_STYLE: Record<'AM' | 'PM' | 'OFF', string> = {
  AM: 'bg-primary/15 text-primary',
  PM: 'bg-accent text-accent-foreground',
  OFF: 'bg-muted text-muted-foreground',
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border">
      {initials}
    </span>
  )
}

interface CrewOpsGridProps {
  staff: Staff[]
}

// Daily-Weekly Ops — a shift-roster grid (days as columns, crew as rows) for
// non-event-bound warehouse staffing, independent of any specific event.
export function CrewOpsGrid({ staff }: CrewOpsGridProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const dates = getOpsWeekDates(weekOffset)
  const grid = useShiftGrid(staff, dates)
  const pool = getCrewPool(staff)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-card-foreground">Daily-Weekly Ops</h2>
          <p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
            Shift roster for warehouse staffing — independent of any specific event. Click a cell to cycle AM / PM / OFF.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Previous week"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Next week"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Crew Member
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="px-3 py-3 text-center text-[0.56rem] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {dayLabel(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pool.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 1} className="px-5 py-16 text-center text-xs text-muted-foreground">
                  No field &amp; production crew on the roster yet.
                </td>
              </tr>
            ) : (
              pool.map((member) => (
                <tr key={member.id} className="border-t border-border/60 align-middle">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${member.firstName} ${member.surname}`} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-card-foreground">
                          {member.firstName} {member.surname}
                        </p>
                        <p className="truncate text-[0.58rem] uppercase tracking-[0.06em] text-muted-foreground">
                          {member.employeeId}
                        </p>
                      </div>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const shift = grid[`${member.id}__${date}`] ?? 'OFF'
                    return (
                      <td key={date} className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => cycleShift(member.id, date)}
                          aria-label={`Cycle shift for ${member.firstName} ${member.surname} on ${dayLabel(date)}, currently ${shift}`}
                          className={cn(
                            'w-full rounded-md px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] transition hover:opacity-80',
                            SHIFT_STYLE[shift],
                          )}
                        >
                          {shift}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
