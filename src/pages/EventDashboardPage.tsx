import { useMemo, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react'
import {
  ExecutiveDashboardCalendarModal,
  ExecutiveEventDetailsModal,
  ExecutiveSettlementQueueModal,
  ExecutiveSettlementReviewModal,
} from '@/components/executive/ExecutiveDashboardModals'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { ExecutiveLiteDashboard } from '@/components/executive-lite/ExecutiveLiteDashboard'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const keyFor = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
const formatMonth = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(value)).toUpperCase()
const formatWeekday = (value: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(value))

function ExecutiveDashboard() {
  const { events } = usePortal()
  const { navigate } = useNav()
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isSettlementQueueOpen, setIsSettlementQueueOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewMonth)
  const monthEvents = useMemo(() => events.filter((event) => {
    const date = new Date(event.targetDate)
    return date.getMonth() === viewMonth.getMonth() && date.getFullYear() === viewMonth.getFullYear()
  }), [events, viewMonth])
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return monthEvents.filter((event) => {
      const matchesSearch = !query || [event.title, event.client, event.venue, event.refId].some((field) => field.toLowerCase().includes(query))
      const matchesDate = !selectedDate || keyFor(new Date(event.targetDate)) === selectedDate
      return matchesSearch && matchesDate
    })
  }, [monthEvents, search, selectedDate])
  const bookedDates = useMemo(() => new Set(monthEvents.map((event) => keyFor(new Date(event.targetDate)))), [monthEvents])
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) ?? null, [events, selectedEventId])
  const settlementQueue = useMemo(() => events.filter((event) => event.status === 'Completed'), [events])
  const selectedSettlement = useMemo(() => settlementQueue.find((event) => event.id === selectedSettlementId) ?? null, [settlementQueue, selectedSettlementId])
  const days = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
    const count = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]
  }, [viewMonth])
  const moveMonth = (amount: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
    setSelectedDate(null)
  }
  const resetMonth = () => {
    const now = new Date()
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(null)
  }
  const openEvent = (id: string) => navigate('event-detail', { kind: 'view-event', payload: { id } })
  const openSettlement = (id: string) => { setSelectedSettlementId(id); setIsSettlementQueueOpen(false) }
  const destination = (id: ExecutiveDestinationId) => navigate(id)

  return (
    <ExecutiveShell activeId="dashboard" onSelect={destination} stickyHeader={
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary"><Sparkles className="size-3" aria-hidden="true" />Operations Console</span><h1 className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">Executive Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Event schedule, calendar oversight, and portfolio visibility.</p></div>
        <label className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm lg:w-72"><Search className="size-4 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Search events, clients, venues, or references</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events, venues, ref..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label>
      </div>
    }>
      {!events ? <LoadingSkeleton variant="dashboard" /> : <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,0.52fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" /><h2 className="text-xs font-bold uppercase tracking-[0.14em]">Booking Calendar</h2></div><button type="button" onClick={resetMonth} className="rounded-md border border-border px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted">Current Month</button></div>
            <div className="mb-4 flex items-center justify-between"><button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted"><ChevronLeft className="size-4" /></button><button type="button" onClick={() => setIsCalendarOpen(true)} className="rounded-md px-3 py-1 font-serif text-base font-medium underline-offset-4 hover:bg-muted hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open full booking calendar for ${monthLabel}`}>{monthLabel}</button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted"><ChevronRight className="size-4" /></button></div>
            <div className="grid grid-cols-7 gap-1 text-center text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="mt-2 grid grid-cols-7 gap-1">{days.map((day, index) => { if (!day) return <span key={`empty-${index}`} />; const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day); const key = keyFor(date); const selected = selectedDate === key; const booked = bookedDates.has(key); return <button key={key} type="button" aria-label={`${monthLabel} ${day}${booked ? ', booked' : ''}`} onClick={() => setSelectedDate(selected ? null : key)} className={cn('relative flex aspect-square items-center justify-center rounded-md text-xs transition-colors hover:bg-muted', selected && 'bg-primary text-primary-foreground', !selected && booked && 'bg-primary/15 text-primary')}>{day}{booked && <span className={cn('absolute bottom-1 size-1 rounded-full bg-primary', selected && 'bg-primary-foreground')} />}</button> })}</div>
            <div className="mt-5 flex items-center gap-4 border-t border-border pt-3 text-[0.62rem] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-primary" />Booked</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-foreground" />Selected</span></div>
          </section>
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{monthLabel} Summary</h2><span className="rounded-full bg-primary/10 px-2 py-1 text-[0.6rem] font-semibold text-primary">{monthEvents.length} Events</span></div>{monthEvents.length === 0 ? <p className="py-5 text-xs text-muted-foreground">No events scheduled for this month.</p> : <div className="max-h-64 space-y-3 overflow-y-auto">{monthEvents.map((event) => <button key={event.id} type="button" onClick={() => openEvent(event.id)} className="flex w-full items-center gap-3 text-left"><span className="w-8 shrink-0 rounded border border-border px-1 py-1 text-center text-[0.55rem] font-semibold leading-tight"><b className="block text-primary">{formatMonth(event.targetDate)}</b>{new Date(event.targetDate).getDate()}</span><span className="min-w-0 flex-1 truncate text-xs font-medium">{event.title}</span><span className="max-w-24 truncate text-right text-[0.58rem] font-semibold uppercase tracking-wide text-muted-foreground">{event.status}</span></button>)}</div>}</section>
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-serif text-xl font-medium">Settlement Queue</h2><p className="mt-1 text-xs text-muted-foreground">Completed events awaiting executive review.</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[0.6rem] font-semibold text-primary">{settlementQueue.length} Pending</span></div>
            {settlementQueue.length === 0 ? <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">No completed events awaiting settlement.</p> : <div className="space-y-2">{settlementQueue.slice(0, 3).map((event) => <button key={event.id} type="button" onClick={() => openSettlement(event.id)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted"><span className="min-w-0"><span className="block font-mono text-[0.58rem] text-muted-foreground">{event.refId}</span><span className="mt-1 block truncate font-serif text-sm">{event.title}</span></span><span className="shrink-0 text-[0.58rem] font-bold uppercase tracking-wider text-primary">Review</span></button>)}</div>}
            {settlementQueue.length > 3 && <button type="button" onClick={() => setIsSettlementQueueOpen(true)} className="mt-3 w-full rounded-md border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted">View All ({settlementQueue.length})</button>}
          </section>
        </div>
        <section className="min-w-0"><div className="mb-4 rounded-xl border border-border bg-card px-4 py-4"><div className="flex items-center gap-2"><h2 className="font-serif text-xl font-medium">{monthLabel} Events</h2><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">{filteredEvents.length}</span></div><p className="mt-1 text-xs text-muted-foreground">All active and scheduled events for {monthLabel}.</p></div>{filteredEvents.length === 0 ? <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">No events scheduled for this {selectedDate ? 'date' : 'month'}.</div> : <div className="space-y-3">{filteredEvents.map((event) => <article key={event.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center"><div className="flex items-center gap-3 sm:w-24 sm:shrink-0"><span className="w-11 rounded border border-border px-1 py-1.5 text-center text-[0.55rem] font-semibold leading-tight"><b className="block text-primary">{formatMonth(event.targetDate)}</b><strong className="block text-base text-foreground">{new Date(event.targetDate).getDate()}</strong><span>{formatWeekday(event.targetDate)}</span></span><span className="text-[0.62rem] font-mono text-muted-foreground sm:hidden">{event.refId}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="hidden text-[0.62rem] font-mono text-muted-foreground sm:inline">{event.refId}</span><span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-primary">{event.status}</span></div><h3 className="mt-1 truncate font-serif text-base font-medium">{event.title}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{event.client} <span className="mx-1">•</span> {event.venue} <span className="mx-1">•</span> {formatDate(event.targetDate)}</p></div><div className="flex shrink-0 gap-2 self-start sm:self-center"><button type="button" onClick={() => setSelectedEventId(event.id)} className="rounded-md border border-border px-3.5 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">View Event</button></div></article>)}</div>}</section>
      </div>}
      {isCalendarOpen && <ExecutiveDashboardCalendarModal month={viewMonth} selectedDate={selectedDate} bookedDates={bookedDates} onMonthChange={moveMonth} onCurrentMonth={resetMonth} onSelect={(date) => { const selected = new Date(`${date}T00:00:00`); setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setSelectedDate(keyFor(selected)); setIsCalendarOpen(false) }} onClose={() => setIsCalendarOpen(false)} />}
      {isSettlementQueueOpen && <ExecutiveSettlementQueueModal events={settlementQueue} onReview={openSettlement} onClose={() => setIsSettlementQueueOpen(false)} />}
      <ExecutiveSettlementReviewModal event={selectedSettlement} onClose={() => setSelectedSettlementId(null)} />
      <ExecutiveEventDetailsModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />
    </ExecutiveShell>
  )
}

export function EventDashboardPage() {
  const { isExecutiveLite, isExecutive } = useAuth()
  if (isExecutiveLite) return <ExecutiveLiteDashboard />
  return isExecutive ? <ExecutiveDashboard /> : <ExecutiveDashboard />
}

export default EventDashboardPage

void ErrorFallback
