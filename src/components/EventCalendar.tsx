import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PortalEvent } from '@/lib/types'

interface Props {
  /* Currently selected date string, e.g. "Oct 14, 2026" */
  value: string
  /* Existing events used to flag booked days */
  events: PortalEvent[]
  onSelect: (dateString: string) => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const fmtIso = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function EventCalendar({ value, events, onSelect }: Props) {
  // Map of booked day keys -> event title for tooltips/labels
  const booked = useMemo(() => {
    const map = new Map<string, string>()
    for (const ev of events) {
      if (!ev.targetDate) continue
      let d: Date | null = null
      if (/^\d{4}-\d{2}-\d{2}$/.test(ev.targetDate.trim())) {
        const [y, m, day] = ev.targetDate.trim().split('-').map(Number)
        d = new Date(y, m - 1, day)
      } else {
        const parsed = new Date(ev.targetDate)
        if (!Number.isNaN(parsed.getTime())) d = parsed
      }
      if (d) {
        map.set(dayKey(d), ev.title)
      }
    }
    return map
  }, [events])

  const selectedDate = useMemo(() => {
    if (!value) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const [y, m, d] = value.trim().split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }, [value])

  const initial = selectedDate ?? new Date()
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <div className="mt-2 rounded-lg border border-input bg-background p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-card-foreground">
          {MONTHS[view.month]} {view.year}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[0.55rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />
          const date = new Date(view.year, view.month, day)
          const key = dayKey(date)
          const isBooked = booked.has(key)
          const isSelected = selectedDate !== null && dayKey(selectedDate) === key
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const isPast = date < today

          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              onClick={() => !isPast && onSelect(fmtIso(date))}
              title={
                isPast
                  ? 'Cannot select a date in the past'
                  : isBooked
                    ? `Booked: ${booked.get(key)}`
                    : undefined
              }
              className={cn(
                'relative flex h-8 items-center justify-center rounded-md text-xs transition',
                isPast
                  ? 'cursor-not-allowed opacity-30 text-muted-foreground/60'
                  : isSelected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : isBooked
                      ? 'bg-destructive/10 font-medium text-destructive hover:bg-destructive/20'
                      : 'text-card-foreground hover:bg-muted',
              )}
            >
              {day}
              {isBooked && !isSelected && !isPast && (
                <span className="absolute bottom-1 size-1 rounded-full bg-destructive" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 border-t border-border pt-2.5">
        <span className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
          <span className="size-2 rounded-full bg-destructive" /> Booked
        </span>
        <span className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" /> Selected
        </span>
      </div>
    </div>
  )
}
