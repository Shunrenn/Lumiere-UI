import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, ExternalLink } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProjectManagerMasterCalendarProps {
  events: PortalEvent[]
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  onOpenEvent: (eventId: string) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ProjectManagerMasterCalendar({
  events,
  selectedDate,
  onSelectDate,
  onOpenEvent,
}: ProjectManagerMasterCalendarProps) {
  // Use first event date or current date as default viewing month
  const initialDate = useMemo(() => {
    if (events.length > 0 && events[0].targetDate) {
      const parts = events[0].targetDate.split('T')[0].split('-')
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1)
      }
    }
    return new Date(2026, 8, 1) // September 2026 default baseline
  }, [events])

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const resetToToday = () => {
    if (events.length > 0 && events[0].targetDate) {
      const parts = events[0].targetDate.split('T')[0].split('-')
      if (parts.length === 3) {
        setCurrentMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1))
        onSelectDate(events[0].targetDate.split('T')[0])
        return
      }
    }
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    onSelectDate(now.toISOString().slice(0, 10))
  }

  // Days calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Map events to date strings "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = new Map<string, PortalEvent[]>()
    events.forEach((e) => {
      const raw = e.targetDate || e.installationStart
      if (!raw) return
      const clean = raw.split('T')[0]
      const existing = map.get(clean) || []
      existing.push(e)
      map.set(clean, existing)
    })
    return map
  }, [events])

  // Get events on the selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    return eventsByDate.get(selectedDate) || []
  }, [selectedDate, eventsByDate])

  // Count events this month
  const monthEventCount = useMemo(() => {
    let count = 0
    eventsByDate.forEach((list, dateStr) => {
      const [y, m] = dateStr.split('-').map(Number)
      if (y === year && m === month + 1) {
        count += list.length
      }
    })
    return count
  }, [eventsByDate, year, month])

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      {/* Calendar Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Master Project Calendar
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[0.62rem] font-bold text-primary">
              {monthEventCount} Scheduled
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Strategic overview of execution dates, milestones & ingress
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToToday}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
          >
            Current View
          </button>
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="flex size-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground hover:bg-accent"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-foreground min-w-[120px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex size-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground hover:bg-accent"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4">
        {/* Calendar Grid (3 columns on desktop) */}
        <div className="lg:col-span-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Prev month fill days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1
              return (
                <div
                  key={`prev-${i}`}
                  className="min-h-[72px] sm:min-h-[84px] rounded-xl border border-dashed border-border/40 bg-muted/20 p-1.5 opacity-40 select-none"
                >
                  <span className="text-[0.65rem] text-muted-foreground font-medium">
                    {dayNum}
                  </span>
                </div>
              )
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const monthStr = String(month + 1).padStart(2, '0')
              const dayStr = String(dayNum).padStart(2, '0')
              const fullDate = `${year}-${monthStr}-${dayStr}`
              const dayEvents = eventsByDate.get(fullDate) || []
              const isSelected = selectedDate === fullDate
              const hasEvents = dayEvents.length > 0

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => onSelectDate(isSelected ? null : fullDate)}
                  className={cn(
                    'min-h-[72px] sm:min-h-[84px] rounded-xl border p-1.5 transition flex flex-col justify-between cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                      : hasEvents
                      ? 'border-border bg-background/90 hover:border-primary/50 hover:bg-accent/40'
                      : 'border-border/60 bg-background/40 hover:bg-accent/20',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full text-[0.68rem] font-semibold',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : hasEvents
                          ? 'text-foreground font-bold'
                          : 'text-muted-foreground',
                      )}
                    >
                      {dayNum}
                    </span>
                    {hasEvents && (
                      <span className="text-[0.6rem] font-bold text-primary">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events preview chips */}
                  <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenEvent(ev.id)
                        }}
                        title={`${ev.title} · ${ev.venue}`}
                        className={cn(
                          'truncate rounded px-1 py-0.5 text-[0.6rem] font-medium transition flex items-center gap-1',
                          ev.tier?.includes('Tier-1')
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                            : ev.status === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-primary/15 text-primary hover:bg-primary/25',
                        )}
                      >
                        <span className="size-1 rounded-full bg-current shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[0.58rem] text-muted-foreground pl-1">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Date / Upcoming Milestones Side Panel */}
        <div className="flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-border/80 pt-4 lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-primary" />
              {selectedDate ? `Schedule for ${selectedDate}` : 'Upcoming Highlights'}
            </h3>
            {selectedDate && (
              <button
                type="button"
                onClick={() => onSelectDate(null)}
                className="text-[0.65rem] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {selectedDateEvents.length > 0 ? (
            <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {selectedDateEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-border bg-background p-3 flex flex-col gap-2 transition hover:border-primary/40 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[0.65rem] font-bold text-primary uppercase tracking-wider">
                      {ev.refId || 'PRT-2026'}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[0.6rem] font-semibold border',
                        ev.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : ev.status === 'In Production'
                          ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {ev.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                    {ev.title}
                  </h4>

                  <div className="flex flex-col gap-1 text-[0.68rem] text-muted-foreground">
                    <span className="flex items-center gap-1.5 truncate">
                      <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                      {ev.ingressTime ? `Ingress ${ev.ingressTime}` : '08:00 AM Call'} · Full Stop {ev.fullStop || '11:00 PM'}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                      {ev.venue}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenEvent(ev.id)}
                    className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1.5 text-[0.68rem] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    Open Event Workspace
                    <ExternalLink className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              <CalendarIcon className="size-6 mb-2 text-muted-foreground/50" />
              <p className="text-xs font-medium">No events scheduled on this date</p>
              <p className="text-[0.65rem] mt-0.5">Click another date or register an event</p>
            </div>
          ) : (
            /* Upcoming 3 Events preview */
            <div className="flex flex-col gap-2.5">
              {events.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onOpenEvent(ev.id)}
                  className="rounded-xl border border-border/70 bg-background/80 p-3 flex flex-col gap-1.5 cursor-pointer transition hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between text-[0.65rem]">
                    <span className="font-bold text-foreground truncate">{ev.title}</span>
                    <span className="text-muted-foreground shrink-0">{ev.targetDate}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{ev.venue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
