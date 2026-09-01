import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import type { CrewRow } from '@/lib/warehouse-crew'
import { cn } from '@/lib/utils'

interface CrewCalendarViewProps {
  rows: CrewRow[]
  events: PortalEvent[]
  onSelect: (row: CrewRow) => void
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Event `targetDate` values are stored as display strings (e.g. "Oct 14,
// 2026"), while calendar cells key off ISO dates — normalize both to the
// same ISO key so chips line up with the right day.
function toIsoKey(value: string): string | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function CrewCalendarView({ rows, events, onSelect }: CrewCalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const first = events[0]?.targetDate ? new Date(events[0].targetDate) : null
    return first && !Number.isNaN(first.getTime()) ? first : new Date(2026, 1, 1)
  })

  // ISO key of the day whose full crew list is expanded via "+N more".
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // One entry per assigned crew member (not aggregated by event), so each chip
  // in the day cell corresponds to a single person and can open their detail modal.
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CrewRow[]>()
    rows.forEach((row) => {
      if (!row.allocation) return
      const key = toIsoKey(row.allocation.date)
      if (!key) return
      const existing = map.get(key) ?? []
      existing.push(row)
      map.set(key, existing)
    })
    return map
  }, [rows])

  const totalDays = daysInMonth(year, month)
  const firstWeekday = new Date(year, month, 1).getDay()
  const cells: { date: string | null; day: number | null }[] = []
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ date: null, day: null })
  for (let d = 1; d <= totalDays; d += 1) {
    const date = new Date(year, month, d).toISOString().slice(0, 10)
    cells.push({ date, day: d })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-serif text-lg font-medium text-card-foreground">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          const entries = cell.date ? entriesByDate.get(cell.date) ?? [] : []
          return (
            <div
              key={index}
              className={cn(
                'min-h-24 border-b border-r border-border/60 p-1.5 sm:p-2',
                index % 7 === 6 && 'border-r-0',
                !cell.day && 'bg-muted/20',
              )}
            >
              {cell.day && (
                <>
                  <p className="text-[0.65rem] font-semibold text-muted-foreground">{cell.day}</p>
                  <div className="mt-1 flex flex-col gap-1">
                    {entries.slice(0, 2).map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => onSelect(row)}
                        title={`${row.name} · ${row.allocation?.event}`}
                        className="truncate rounded-sm bg-primary/10 px-1.5 py-0.5 text-left text-[0.55rem] font-semibold text-primary transition hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        {row.name}
                      </button>
                    ))}
                    {entries.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setExpandedDay(cell.date)}
                        className="rounded-sm px-1.5 py-0.5 text-left text-[0.55rem] font-semibold text-muted-foreground underline-offset-2 transition hover:bg-muted hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        +{entries.length - 2} more
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {expandedDay && (
        <DayCrewModal
          date={expandedDay}
          entries={entriesByDate.get(expandedDay) ?? []}
          onClose={() => setExpandedDay(null)}
          onSelect={(row) => {
            setExpandedDay(null)
            onSelect(row)
          }}
        />
      )}
    </div>
  )
}

// Full crew list for a single day — reachable from the "+N more" overflow chip
// so the hidden personnel are never a dead end.
function DayCrewModal({
  date,
  entries,
  onClose,
  onSelect,
}: {
  date: string
  entries: CrewRow[]
  onClose: () => void
  onSelect: (row: CrewRow) => void
}) {
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Assigned crew
            </p>
            <h2 className="mt-1 font-serif text-lg font-medium text-card-foreground">{label}</h2>
            <p className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              {entries.length} crew member{entries.length === 1 ? '' : 's'} on shift
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto px-4 py-4">
          {entries.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row)}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-border bg-background px-3.5 py-2.5 text-left transition hover:border-primary/50 hover:bg-accent"
              >
                <span className="text-sm font-medium text-card-foreground">{row.name}</span>
                <span className="text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">
                  {row.allocation?.task ?? row.role} · {row.allocation?.event ?? 'Unassigned'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
