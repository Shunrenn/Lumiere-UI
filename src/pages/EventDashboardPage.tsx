import { useMemo, useState } from 'react'
import { CalendarClock, Sparkles } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { cn } from '@/lib/utils'
import { ExecutiveLiteDashboard } from '@/components/executive-lite/ExecutiveLiteDashboard'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

export function EventDashboardPage() {
  const { navigate } = useNav()
  const { isExecutiveLite } = useAuth()

  if (isExecutiveLite) return <ExecutiveLiteDashboard />

  const { events } = usePortal()
  const [selectedDate, setSelectedDate] = useState(() => new Date().getDate())
  const [isError, setIsError] = useState(false)
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())
  const calendarDays = useMemo(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
    const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]
  }, [])
  const monthEvents = useMemo(() => events.filter((event) => {
    if (!event.targetDate) return false
    const date = new Date(event.targetDate)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).slice(0, 5), [events])

  const destination = (id: ExecutiveDestinationId) => navigate(id)
  const stickyHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary"><Sparkles className="size-3" aria-hidden="true" />Operations Console</span>
        <h1 className="mt-1 font-serif text-2xl font-medium tracking-tight text-foreground sm:text-4xl">Executive Dashboard</h1>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block sm:text-sm">Cross-operation portfolio oversight and scheduled event portfolios.</p>
      </div>
    </div>
  )

  return (
    <ExecutiveShell activeId="dashboard" onSelect={destination} stickyHeader={stickyHeader}>
      {isError ? <ErrorFallback title="Executive Dashboard Unavailable" message="Could not retrieve portfolio status." onRetry={() => setIsError(false)} /> : !events ? <LoadingSkeleton variant="dashboard" /> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-5 xl:col-span-4">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm max-sm:p-3">
              <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" /><h2 className="text-xs font-bold uppercase tracking-[0.14em] text-card-foreground">Booking Calendar</h2></div><span className="rounded-md border border-border bg-background px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">{monthLabel}</span></div>
              <div className="grid grid-cols-7 gap-1 text-center text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
              <div className="mt-1.5 grid grid-cols-7 gap-1">{calendarDays.map((day, index) => day ? <button key={index} type="button" onClick={() => setSelectedDate(day)} className={cn('flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition', selectedDate === day ? 'bg-primary font-bold text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted', events.some((event) => event.targetDate && new Date(event.targetDate).getDate() === day) && selectedDate !== day && 'bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400')} aria-label={`Select ${monthLabel} ${day}`}>{day}</button> : <span key={index} />)}</div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[0.6rem] text-muted-foreground"><span>{monthEvents.length} scheduled this month</span><span className="text-primary">{selectedDate} selected</span></div>
            </section>
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm max-sm:p-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold uppercase tracking-wider text-muted-foreground">Month Preview</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold text-primary">{monthEvents.length}</span></div><div className="mt-2 divide-y divide-border/40">{monthEvents.length ? monthEvents.map((event) => <button type="button" key={event.id} onClick={() => navigate('registry', { kind: 'view-event', payload: { id: event.id } })} className="flex w-full items-center gap-2.5 py-2 text-left hover:bg-muted/50"><span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-[0.58rem] font-bold">{event.targetDate ? new Date(event.targetDate).getDate() : '—'}</span><span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{event.title}</span><span className="text-[0.6rem] text-muted-foreground">View</span></button>) : <p className="py-4 text-xs text-muted-foreground">No events scheduled this month.</p>}</div></section>
          </div>
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-7 xl:col-span-8"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-xl font-medium text-card-foreground">Event Operations</h2><p className="mt-0.5 text-xs text-muted-foreground">Current production portfolios and scheduled work.</p></div><span className="rounded-full bg-muted px-2.5 py-0.5 text-[0.65rem] font-bold text-foreground">{events.length} events</span></div><div className="mt-3 space-y-3">{events.slice(0, 4).map((event) => <article key={event.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-4"><span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/40 text-center"><span className="text-[0.6rem] uppercase text-muted-foreground">{event.targetDate ? new Date(event.targetDate).toLocaleDateString('en-US', { month: 'short' }) : 'TBD'}</span><strong className="text-lg text-foreground">{event.targetDate ? new Date(event.targetDate).getDate() : '—'}</strong></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">{event.id}</span><span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">{event.status}</span></div><h3 className="mt-1 truncate font-serif text-base font-medium text-card-foreground">{event.title}</h3><p className="mt-1.5 text-xs text-muted-foreground">{event.client} <span className="mx-1">•</span> {event.venue}</p></div></div><button type="button" onClick={() => navigate('registry', { kind: 'view-event', payload: { id: event.id } })} className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-card-foreground transition hover:bg-muted">View</button></article>)}</div></section>
        </div>
      )}
    </ExecutiveShell>
  )
}

export default EventDashboardPage
