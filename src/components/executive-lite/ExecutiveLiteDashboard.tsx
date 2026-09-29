import { useState, useMemo } from 'react'
import { Plus, Search, Calendar, MapPin, User, Clock, Eye, Edit3 } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { ExecutiveStatCard, EventDistributionCard } from '@/components/executive/ExecutiveAnalytics'
import { ExecutiveLiveFeed } from '@/components/executive/ExecutiveLiveFeed'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { EventCalendar } from '@/components/EventCalendar'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { PortalEvent, EventStatus } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const statusBadgeStyles: Record<EventStatus, string> = {
  Initialized: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  'In Production': 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
  Reserved: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
  'On Hold': 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  Settled: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
  Cancelled: 'bg-muted text-muted-foreground line-through opacity-70 border border-border',
}

export function ExecutiveLiteDashboard() {
  const { navigate } = useNav()
  const { events } = usePortal()

  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [calendarDate, setCalendarDate] = useState<string>('')

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedEvent, setSelectedEvent] = useState<PortalEvent | null>(null)

  // Event metrics
  const totalEvents = events.length
  const completedEvents = useMemo(
    () => events.filter((e) => e.status === 'Completed' || e.status === 'Settled').length,
    [events],
  )
  const inProductionEvents = useMemo(
    () => events.filter((e) => e.status === 'In Production').length,
    [events],
  )
  const upcomingEvents = useMemo(
    () => events.filter((e) => e.status === 'Reserved' || e.status === 'Initialized').length,
    [events],
  )

  // Event distribution counts
  const eventCounts = useMemo(() => {
    const tally: Record<string, number> = {
      Completed: 0,
      'In Production': 0,
      Reserved: 0,
      Initialized: 0,
      'On Hold': 0,
    }
    events.forEach((e) => {
      if (tally[e.status] !== undefined) {
        tally[e.status] += 1
      }
    })
    return tally
  }, [events])

  // Filtered schedule list
  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      if (e.status === 'Cancelled') return false
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.client.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.refId.toLowerCase().includes(q)
      const matchesStatus = selectedStatus === 'All' || e.status === selectedStatus
      const matchesDate = !calendarDate || (e.targetDate && e.targetDate.includes(calendarDate))
      return matchesQuery && matchesStatus && matchesDate
    })
  }, [events, query, selectedStatus, calendarDate])

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const openCreate = () => {
    setSelectedEvent(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }

  const openView = (ev: PortalEvent) => {
    setSelectedEvent(ev)
    setDrawerMode('view')
    setDrawerOpen(true)
  }

  const openEdit = (ev: PortalEvent) => {
    setSelectedEvent(ev)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }

  const stickyHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-medium leading-tight text-foreground sm:text-4xl">
          Executive Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-operation portfolio oversight, event schedules, and live booking activity.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, venues..."
            className="w-56 rounded-md border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-64"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          + Event
        </button>
      </div>
    </div>
  )

  return (
    <>
      <ExecutiveShell activeId="dashboard" onSelect={destination} stickyHeader={stickyHeader}>
        <div className="flex flex-col gap-6">
          {/* Row 1: Executive Stat Cards (Left) + Distribution & Live Activity (Right) */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
              <ExecutiveStatCard
                agentSelector="data-agent-in-production"
                label="In Production"
                value={String(inProductionEvents)}
                caption="Active staging & execution"
                onSelect={() => navigate('registry')}
              />
              <ExecutiveStatCard
                agentSelector="data-agent-total-events"
                label="Total Events"
                value={String(totalEvents)}
                caption="Registered client portfolios"
                onSelect={() => navigate('registry')}
              />
              <ExecutiveStatCard
                agentSelector="data-agent-completed-events"
                label="Completed Events"
                value={String(completedEvents)}
                caption="Successfully executed"
                onSelect={() => navigate('registry')}
              />
              <ExecutiveStatCard
                agentSelector="data-agent-upcoming-events"
                label="Reserved & Upcoming"
                value={String(upcomingEvents)}
                caption="Scheduled client reservations"
                onSelect={() => navigate('registry')}
              />
            </div>

            {/* Event Distribution Donut + Live Operations Feed */}
            <div className="grid h-[21rem] grid-cols-2 gap-3">
              <EventDistributionCard
                compact
                counts={eventCounts}
                onSelect={() => navigate('registry')}
              />
              <ExecutiveLiveFeed />
            </div>
          </div>

          {/* Row 2: Booking & Calendar Emphasis with Event Schedule */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Calendar & Date Filter Panel (4 cols) */}
            <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                    Booking Calendar
                  </h2>
                </div>
                {calendarDate && (
                  <button
                    type="button"
                    onClick={() => setCalendarDate('')}
                    className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Select a scheduled date to filter the upcoming portfolio schedule.
              </p>
              <div className="mt-2">
                <EventCalendar
                  value={calendarDate}
                  events={events}
                  onSelect={(date) => setCalendarDate((prev) => (prev === date ? '' : date))}
                />
              </div>
              {calendarDate && (
                <div className="mt-3 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                  <span>Filtered: <strong>{calendarDate}</strong></span>
                  <span className="text-[0.65rem] font-semibold uppercase">{filteredEvents.length} events</span>
                </div>
              )}
            </div>

            {/* Event Schedule & Portfolio Cards (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                <div>
                  <h2 className="font-serif text-xl font-medium tracking-tight text-foreground">
                    Upcoming Events & Portfolio Schedule
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Authoritative timeline, client details, and registered venue allocations.
                  </p>
                </div>
                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'In Production', 'Reserved', 'Initialized', 'Completed'].map((status) => {
                    const count =
                      status === 'All'
                        ? events.filter((e) => e.status !== 'Cancelled').length
                        : events.filter((e) => e.status === status).length
                    const active = selectedStatus === status
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedStatus(status)}
                        className={cn(
                          'rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] transition',
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {status} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Event Cards List */}
              {filteredEvents.length === 0 ? (
                <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <Calendar className="size-8 text-muted-foreground/60 mb-3" />
                  <p className="font-serif text-base font-medium text-foreground">No events found</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                    {query || calendarDate || selectedStatus !== 'All'
                      ? 'No events match your search or filter criteria. Try adjusting the filter or calendar selection.'
                      : 'There are no active events registered in the portfolio.'}
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="button-primary mt-4 text-xs"
                  >
                    <Plus className="size-3.5" />
                    Register New Event
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                              statusBadgeStyles[ev.status] || 'bg-muted text-muted-foreground',
                            )}
                          >
                            {ev.status}
                          </span>
                          <span className="font-mono text-[0.6rem] text-muted-foreground font-semibold">
                            {ev.refId || 'NO-REF'}
                          </span>
                        </div>

                        <h3 className="mt-2.5 font-serif text-base font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {ev.title}
                        </h3>

                        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{ev.client}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{ev.venue}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span>
                              {ev.targetDate} · {ev.eventStart || ev.installationStart || '09:00'} — {ev.eventEnd || ev.installationEnd || '23:00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                        <button
                          type="button"
                          onClick={() => openView(ev)}
                          className="inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(ev)}
                          className="inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-primary hover:underline transition-colors"
                        >
                          <Edit3 className="size-3.5" />
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ExecutiveShell>

      {/* Drawer bound to real events */}
      <RegisterEventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        event={selectedEvent}
        mode={drawerMode}
      />
    </>
  )
}

export default ExecutiveLiteDashboard
