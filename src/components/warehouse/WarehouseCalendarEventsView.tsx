import { useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Circle, Star, Calendar as CalendarIcon } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface WarehouseCalendarEventsViewProps {
  events: PortalEvent[]
  onSelectEvent: (event: PortalEvent) => void
}

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function shortCodeFor(title: string): string {
  const words = title.trim().split(/\s+/)
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase()
  }
  if (words.length === 2) {
    return (words[0][0] + words[1].slice(0, 2)).toUpperCase()
  }
  return title.slice(0, 3).toUpperCase()
}

// Robust Event Date Parsing Helper (Handles 'Oct 14, 2026', '2026-10-14', etc.)
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null

  // Standard JS Date parsing
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  // Fallback ISO split YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
  }

  return null
}

// Ingress Countdown Indicator Helper (Calculated dynamically against runtime Date with Guard Clause)
function getIngressCountdownBadge(targetDateStr: string): { label: string; style: string } {
  const evtDateObj = parseEventDate(targetDateStr)

  // Guard clause: Invalid Date fallback
  if (!evtDateObj || isNaN(evtDateObj.getTime())) {
    return {
      label: 'Date TBD',
      style: 'bg-muted border-border/50 text-muted-foreground font-medium',
    }
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const targetStart = new Date(evtDateObj.getFullYear(), evtDateObj.getMonth(), evtDateObj.getDate()).getTime()

  const diffMs = targetStart - todayStart
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  // Guard clause: NaN diffDays fallback
  if (isNaN(diffDays)) {
    return {
      label: 'Date TBD',
      style: 'bg-muted border-border/50 text-muted-foreground font-medium',
    }
  }

  // Muted Gray (< 0 days): Completed
  if (diffDays < 0) {
    return {
      label: 'Completed',
      style: 'bg-muted border-border/50 text-muted-foreground font-medium',
    }
  }

  // Red (0–3 days): High Urgency
  if (diffDays === 0) {
    return {
      label: 'Today',
      style: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold',
    }
  }
  if (diffDays === 1) {
    return {
      label: 'Tomorrow',
      style: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold',
    }
  }
  if (diffDays >= 2 && diffDays <= 3) {
    return {
      label: `${diffDays} days left`,
      style: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold',
    }
  }

  // Amber (4–13 days): Medium Urgency
  if (diffDays >= 4 && diffDays <= 6) {
    return {
      label: `${diffDays} days left`,
      style: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold',
    }
  }
  if (diffDays >= 7 && diffDays <= 13) {
    return {
      label: '1 week left',
      style: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold',
    }
  }

  // Gray (14–29 days): Standard Warning
  if (diffDays >= 14 && diffDays <= 29) {
    const weeks = Math.floor(diffDays / 7)
    return {
      label: `${weeks} week${weeks === 1 ? '' : 's'} left`,
      style: 'bg-slate-500/15 border-slate-500/30 text-slate-600 dark:text-slate-400 font-medium',
    }
  }

  // Green (30+ days): Low Urgency
  if (diffDays >= 30 && diffDays <= 59) {
    return {
      label: '1 month left',
      style: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium',
    }
  }

  // 60+ days
  const months = Math.floor(diffDays / 30)
  return {
    label: `${months} month${months === 1 ? '' : 's'} left`,
    style: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium',
  }
}

export function WarehouseCalendarEventsView({ events, onSelectEvent }: WarehouseCalendarEventsViewProps) {
  // Compute initial active calendar date matching the earliest event month so calendar cells display events immediately
  const initialCalendarDate = useMemo(() => {
    if (events.length > 0) {
      const parsedDates = events
        .map((e) => parseEventDate(e.targetDate))
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())

      if (parsedDates.length > 0) {
        // Return 1st of month of earliest seeded event
        return new Date(parsedDates[0].getFullYear(), parsedDates[0].getMonth(), 1)
      }
    }
    return new Date()
  }, [events])

  const [currentDate, setCurrentDate] = useState<Date>(initialCalendarDate)

  // Keep currentDate synchronized if initialCalendarDate resolves after mount
  useEffect(() => {
    setCurrentDate(initialCalendarDate)
  }, [initialCalendarDate])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Real runtime ISO date string for today (e.g. "2026-09-02")
  const realNow = new Date()
  const realTodayIso = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}-${String(realNow.getDate()).padStart(2, '0')}`

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // Days in current month grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ dateNum: number | null; isoDate: string | null; colIndex: number }> = []

    // Padding empty cells before 1st of month
    for (let i = 0; i < firstDay; i++) {
      cells.push({ dateNum: null, isoDate: null, colIndex: i % 7 })
    }

    // Month days
    for (let day = 1; day <= totalDays; day++) {
      const colIndex = (firstDay + day - 1) % 7
      const monthStr = String(month + 1).padStart(2, '0')
      const dayStr = String(day).padStart(2, '0')
      const isoDate = `${year}-${monthStr}-${dayStr}`
      cells.push({ dateNum: day, isoDate, colIndex })
    }

    return cells
  }, [year, month])

  // Events map by ISO date for fast calendar cell lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, PortalEvent[]>()
    events.forEach((evt) => {
      const d = parseEventDate(evt.targetDate)
      if (d) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const list = map.get(iso) ?? []
        list.push(evt)
        map.set(iso, list)
      }
    })
    return map
  }, [events])

  // Right Side Upcoming Events List: Default-sorts automatically by nearest target date ascending
  const upcomingEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = parseEventDate(a.targetDate)?.getTime() ?? 0
      const dateB = parseEventDate(b.targetDate)?.getTime() ?? 0
      return dateA - dateB
    })
  }, [events])

  // Group events by Month Year for month-grouped sticky headers
  const monthGroups = useMemo(() => {
    const map = new Map<string, PortalEvent[]>()
    upcomingEvents.forEach((evt) => {
      const d = parseEventDate(evt.targetDate)
      const groupKey = d ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` : 'OTHER EVENTS'
      const list = map.get(groupKey) ?? []
      list.push(evt)
      map.set(groupKey, list)
    })
    return Array.from(map.entries())
  }, [upcomingEvents])

  const monthLabel = `${MONTH_NAMES[month]} ${year}`

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
      {/* ─── LEFT SIDE: Month Calendar Grid (8 cols) ─── */}
      <div className="flex flex-col min-h-[35rem] rounded-2xl border border-border/90 bg-card/95 p-5 sm:p-6 lg:col-span-8 shadow-sm sm:shadow-md backdrop-blur-xs">
        {/* Calendar Header & Month Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <CalendarIcon className="size-5" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-medium text-card-foreground">{monthLabel}</h2>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Monthly Event &amp; Ingress Roster
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="flex size-8.5 items-center justify-center rounded-lg border border-border bg-background/80 text-foreground transition-all duration-150 hover:bg-accent hover:border-primary/40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="flex size-8.5 items-center justify-center rounded-lg border border-border bg-background/80 text-foreground transition-all duration-150 hover:bg-accent hover:border-primary/40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="my-3.5 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
          <span className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">Legend:</span>
          <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-card-foreground">
            <Circle className="size-3 fill-sky-500 text-sky-500" /> Ingress/Egress
          </span>
          <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-card-foreground">
            <Star className="size-3.5 fill-amber-500 text-amber-500" /> Actual Event
          </span>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {DAYS_OF_WEEK.map((d, colIdx) => (
            <div
              key={d}
              className={cn(
                'py-1.5 rounded-md',
                (colIdx === 0 || colIdx === 6) && 'text-muted-foreground/75 bg-muted/20 font-bold',
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Month Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 mt-1.5 flex-1">
          {calendarGrid.map((cell, idx) => {
            if (!cell.dateNum || !cell.isoDate) {
              return (
                <div
                  key={`empty-${idx}`}
                  className={cn(
                    'min-h-[4.75rem] rounded-lg border border-border/30 bg-muted/10',
                    (cell.colIndex === 0 || cell.colIndex === 6) && 'bg-muted/20',
                  )}
                />
              )
            }

            const dayEvents = eventsByDate.get(cell.isoDate) ?? []
            const isToday = cell.isoDate === realTodayIso
            const isWeekend = cell.colIndex === 0 || cell.colIndex === 6

            return (
              <div
                key={cell.isoDate}
                className={cn(
                  'group flex min-h-[4.75rem] flex-col rounded-lg border border-border/80 bg-background p-1.5 transition-all duration-150 hover:border-primary/50 hover:bg-accent/40',
                  isWeekend && 'bg-muted/15',
                  isToday && 'bg-primary/10 ring-1.5 ring-primary/40 border-primary/50',
                )}
              >
                <div className="flex items-center justify-between">
                  {isToday ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground shadow-xs">
                      {cell.dateNum}
                    </span>
                  ) : (
                    <span className="text-right text-[0.65rem] font-bold text-muted-foreground group-hover:text-foreground">
                      {cell.dateNum}
                    </span>
                  )}
                </div>

                {/* Calendar Cell Event Markers */}
                <div className="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[3.3rem]">
                  {dayEvents.map((evt, i) => {
                    const isActualEvent = i % 2 === 0
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="flex w-full items-center gap-1 rounded bg-card border border-border/60 px-1 py-0.5 text-left text-[0.55rem] font-semibold text-card-foreground shadow-xs transition hover:border-primary hover:bg-primary/10 hover:text-primary truncate"
                      >
                        {isActualEvent ? (
                          <Star className="size-2.5 shrink-0 fill-amber-500 text-amber-500" />
                        ) : (
                          <Circle className="size-2 shrink-0 fill-sky-500 text-sky-500" />
                        )}
                        <span className="font-bold shrink-0">{shortCodeFor(evt.title)}</span>
                        <span className="truncate opacity-85">{evt.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── RIGHT SIDE: Upcoming Events Side Panel (Month-Grouped Sticky Headers) ─── */}
      <div className="flex flex-col h-[35rem] max-h-[35rem] rounded-2xl border border-border/90 bg-card/95 p-5 sm:p-6 lg:col-span-4 shadow-sm sm:shadow-md backdrop-blur-xs overflow-hidden">
        {/* Side Panel Header (Static / Non-Scrolling) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-4 shrink-0">
          <div>
            <h3 className="font-serif text-lg font-medium text-card-foreground">
              Upcoming Events ({upcomingEvents.length})
            </h3>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Month-Grouped Roster
            </p>
          </div>
        </div>

        {/* Scrollable Row List with Sticky Month Headers */}
        <div className="mt-3 flex-1 overflow-y-auto pr-1.5 space-y-4 scrollbar-thin">
          {monthGroups.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No upcoming events found.</p>
          ) : (
            monthGroups.map(([groupKey, groupEvents]) => (
              <div key={groupKey} className="space-y-2">
                {/* Sticky Month Section Header */}
                <div className="sticky top-0 z-10 border-b border-border/80 bg-card/95 py-1.5 backdrop-blur-sm">
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary">
                    {groupKey} ({groupEvents.length})
                  </span>
                </div>

                {/* Event Row Buttons for this Month Group */}
                <div className="space-y-2.5">
                  {groupEvents.map((evt) => {
                    const countdown = getIngressCountdownBadge(evt.targetDate)
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="group flex w-full flex-col gap-1.5 rounded-xl border border-border/80 bg-background/90 p-3.5 text-left shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif text-sm font-medium text-card-foreground group-hover:text-primary transition-colors">
                            {evt.title}
                          </h4>
                          {/* Urgency-Colored Ingress Countdown Badge */}
                          <span
                            className={cn(
                              'shrink-0 rounded-full border px-2.5 py-0.5 text-[0.55rem] uppercase tracking-wider',
                              countdown.style,
                            )}
                          >
                            {countdown.label}
                          </span>
                        </div>

                        {/* Venue & Date Row: Date is ALWAYS fully visible without truncation */}
                        <div className="flex items-center justify-between gap-2 text-[0.62rem] text-muted-foreground">
                          <span className="min-w-0 flex-1 truncate font-semibold text-card-foreground">
                            {evt.venue}
                          </span>
                          <span className="shrink-0 font-medium text-muted-foreground whitespace-nowrap">
                            · {evt.targetDate}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
