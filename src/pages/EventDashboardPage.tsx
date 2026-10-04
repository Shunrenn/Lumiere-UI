import { useState, useMemo } from 'react'
import { CalendarClock, ShieldAlert, Sparkles } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import {
  ExecutiveStatCard,
  EventDistributionCard,
  ReportDistributionCard,
  ExecutiveTrendAnalyticsCard,
} from '@/components/executive/ExecutiveAnalytics'
import { ExecutiveLiveFeed } from '@/components/executive/ExecutiveLiveFeed'
import { ExecutivePendingActions, type ExecutivePendingItem } from '@/components/executive/ExecutivePendingActions'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { cn } from '@/lib/utils'
import { ExecutiveLiteDashboard } from '@/components/executive-lite/ExecutiveLiteDashboard'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'
import { ExecutiveSummaryDetailModal, type ExecutiveSummaryDetail } from '@/components/executive/ExecutiveSummaryDetailModal'

type DashboardMetricMode = 'events' | 'reports'

export function EventDashboardPage() {
  const { navigate } = useNav()
  const { isExecutiveLite } = useAuth()

  if (isExecutiveLite) {
    return <ExecutiveLiteDashboard />
  }

  const { events, damageExceptions } = usePortal()
  const [metricMode, setMetricMode] = useState<DashboardMetricMode>('events')
  const [summaryDetail, setSummaryDetail] = useState<ExecutiveSummaryDetail | null>(null)

  // Event metrics
  const totalEvents = events.length
  const completedEvents = useMemo(
    () => events.filter((e) => e.status === 'Completed').length,
    [events],
  )
  const ongoingEvents = useMemo(
    () => events.filter((e) => e.status !== 'Completed' && e.status !== 'Cancelled').length,
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

  // Report metrics
  const totalReports = damageExceptions.length
  const resolvedCases = useMemo(
    () =>
      damageExceptions.filter(
        (d) =>
          d.status !== 'Pending Verdict' &&
          d.status !== 'Held for Audit' &&
          d.status !== 'Pending Second Sign-off',
      ).length,
    [damageExceptions],
  )
  const pendingVerdicts = useMemo(
    () =>
      damageExceptions.filter(
        (d) =>
          d.status === 'Pending Verdict' ||
          d.status === 'Held for Audit' ||
          d.status === 'Pending Second Sign-off',
      ).length,
    [damageExceptions],
  )

  // Report distribution counts
  const reportCounts = useMemo(() => {
    const tally: Record<string, number> = {
      'Pending Verdict': 0,
      Validated: 0,
      'Held for Audit': 0,
      'Second Sign-off': 0,
      Dismissed: 0,
    }
    damageExceptions.forEach((d) => {
      if (d.status === 'Pending Second Sign-off') {
        tally['Second Sign-off'] = (tally['Second Sign-off'] ?? 0) + 1
      } else if (tally[d.status] !== undefined) {
        tally[d.status] += 1
      }
    })
    return tally
  }, [damageExceptions])

  // Operations-oriented pending actions
  const pendingActionItems: ExecutivePendingItem[] = useMemo(() => {
    const items: ExecutivePendingItem[] = []

    const awaitingEvent = events.find(
      (e) => e.status === 'Initialized' || e.status === 'On Hold',
    )
    if (awaitingEvent) {
      items.push({
        id: `ev-${awaitingEvent.id}`,
        title: 'Event Awaiting Confirmation',
        subtitle: awaitingEvent.title,
        tone: 'sky',
        icon: CalendarClock,
        actionLabel: 'Review',
        onAction: () =>
          navigate('registry', { kind: 'view-event', payload: { id: awaitingEvent.id } }),
      })
    }

    const pendingDamage = damageExceptions.find((d) => d.status === 'Pending Verdict')
    if (pendingDamage) {
      items.push({
        id: `dm-${pendingDamage.id}`,
        title: 'Damage Report Insight',
        subtitle: `${pendingDamage.logId} · ${pendingDamage.assetName}`,
        tone: 'rose',
        icon: ShieldAlert,
        actionLabel: 'View Report',
        onAction: () =>
          navigate('damage', { kind: 'review-damage', payload: { id: pendingDamage.id } }),
      })
    }

    const auditDamage = damageExceptions.find(
      (d) => d.status === 'Held for Audit' || d.status === 'Pending Second Sign-off',
    )
    if (auditDamage) {
      items.push({
        id: `dm-audit-${auditDamage.id}`,
        title: 'Audit Exception Insight',
        subtitle: `${auditDamage.logId} · ${auditDamage.assetName}`,
        tone: 'amber',
        icon: ShieldAlert,
        actionLabel: 'View Report',
        onAction: () =>
          navigate('damage', { kind: 'review-damage', payload: { id: auditDamage.id } }),
      })
    }

    return items
  }, [events, damageExceptions, navigate])

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const isEvents = metricMode === 'events'
  const [selectedDate, setSelectedDate] = useState(() => new Date().getDate())
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
    return date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear()
  }).slice(0, 5), [events])

  const stickyHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary"><Sparkles className="size-3" aria-hidden="true" />Operations Console</span>
        <h1 className="mt-1 font-serif text-2xl font-medium tracking-tight text-foreground sm:text-4xl">
          Executive Dashboard
        </h1>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block sm:text-sm">
          Cross-operation portfolio oversight, asset readiness, and live activity streams.
        </p>
      </div>

      {/* Metric Mode Toggle (Events vs Reports) */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setMetricMode('events')}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition',
            isEvents
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Events
        </button>
        <button
          type="button"
          onClick={() => setMetricMode('reports')}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition',
            !isEvents
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Reports
        </button>
      </div>
    </div>
  )

  const [isLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  return (
    <>
      <ExecutiveShell activeId="dashboard" onSelect={destination} stickyHeader={stickyHeader}>
        {isError ? (
          <ErrorFallback title="Executive Dashboard Unavailable" message="Could not retrieve portfolio status." onRetry={() => setIsError(false)} />
        ) : isLoading ? (
          <LoadingSkeleton variant="dashboard" />
        ) : (
          <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-4 lg:col-span-5 xl:col-span-4">
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm max-sm:p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" /><h2 className="text-xs font-bold uppercase tracking-[0.14em] text-card-foreground">Booking Calendar</h2></div>
                  <span className="rounded-md border border-border bg-background px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">{monthLabel}</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
                <div className="mt-1.5 grid grid-cols-7 gap-1">{calendarDays.map((day, index) => day ? <button key={index} type="button" onClick={() => setSelectedDate(day)} className={cn('group relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition', selectedDate === day ? 'bg-primary font-bold text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted', events.some((event) => event.targetDate && new Date(event.targetDate).getDate() === day) && selectedDate !== day && 'bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400')} aria-label={`Select ${monthLabel} ${day}`}>{day}</button> : <span key={index} />)}</div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[0.6rem] text-muted-foreground"><span>{events.filter((event) => event.targetDate && new Date(event.targetDate).getMonth() === new Date().getMonth()).length} scheduled this month</span><span className="text-primary">{selectedDate} selected</span></div>
              </section>
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm max-sm:p-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold uppercase tracking-wider text-muted-foreground">Month Preview</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold text-primary">{monthEvents.length}</span></div><div className="mt-2 divide-y divide-border/40">{monthEvents.length ? monthEvents.map((event) => <button type="button" key={event.id} onClick={() => navigate('registry', { kind: 'view-event', payload: { id: event.id } })} className="flex w-full items-center gap-2.5 py-2 text-left hover:bg-muted/50"><span className="flex size-8 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-muted/40 text-[0.58rem] font-bold"><span>{event.targetDate ? new Date(event.targetDate).getDate() : '—'}</span></span><span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{event.title}</span><span className="text-[0.6rem] text-muted-foreground">View</span></button>) : <p className="py-4 text-xs text-muted-foreground">No events scheduled this month.</p>}</div></section>
            </div>
            <div className="space-y-4 lg:col-span-7 xl:col-span-8">
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-xl font-medium text-card-foreground">Event Operations</h2><p className="mt-0.5 text-xs text-muted-foreground">Current production portfolios and scheduled work.</p></div><span className="rounded-full bg-muted px-2.5 py-0.5 text-[0.65rem] font-bold text-foreground">{events.length} events</span></div><div className="mt-3 space-y-3">{events.slice(0, 4).map((event) => <article key={event.id} className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-4"><span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/40 text-center"><span className="text-[0.6rem] uppercase text-muted-foreground">{event.targetDate ? new Date(event.targetDate).toLocaleDateString('en-US', { month: 'short' }) : 'TBD'}</span><strong className="text-lg text-foreground">{event.targetDate ? new Date(event.targetDate).getDate() : '—'}</strong></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">{event.id}</span><span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">{event.status}</span></div><h3 className="mt-1 truncate font-serif text-base font-medium text-card-foreground transition-colors group-hover:text-primary">{event.title}</h3><p className="mt-1.5 text-xs text-muted-foreground">{event.client} <span className="mx-1">•</span> {event.venue}</p></div></div><button type="button" onClick={() => navigate('registry', { kind: 'view-event', payload: { id: event.id } })} className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-card-foreground transition hover:border-primary/30 hover:bg-muted">View</button></article>)}</div></section>
            </div>
          </div>

          {/* Current metric, distribution, feed, and trend modules remain data-driven below the reference overview. */}
          <div data-testid="executive-dashboard-stats" className="grid gap-4 lg:grid-cols-2">
            {/* 4 Cards (keyed to animate on toggle) */}
            <div key={metricMode} className="admin-fade grid grid-cols-2 gap-3">
              {isEvents ? (
                <>
                  <ExecutiveStatCard
                    agentSelector="data-agent-portfolio-health"
                    label="In Production"
                    value={String(eventCounts['In Production'] ?? 0)}
                    caption="Active staging & execution"
                    onSelect={() => setSummaryDetail('in-production')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-total-events"
                    label="Total Events"
                    value={String(totalEvents)}
                    caption="Registered event portfolios"
                    onSelect={() => setSummaryDetail('total-events')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-completed-events"
                    label="Completed Events"
                    value={String(completedEvents)}
                    caption="Successfully executed"
                    onSelect={() => setSummaryDetail('completed-events')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-ongoing-events"
                    label="Ongoing Events"
                    value={String(ongoingEvents)}
                    caption="Active production & reserved"
                    onSelect={() => setSummaryDetail('ongoing-events')}
                  />
                </>
              ) : (
                <>
                  <ExecutiveStatCard
                    agentSelector="data-agent-portfolio-health"
                    label="Audit Exceptions"
                    value={String((reportCounts['Held for Audit'] ?? 0) + (reportCounts['Second Sign-off'] ?? 0))}
                    caption="Held for audit review"
                    onSelect={() => setSummaryDetail('audit-exceptions')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-total-reports"
                    label="Total Reports"
                    value={String(totalReports)}
                    caption="Post-event damage filings"
                    onSelect={() => setSummaryDetail('total-reports')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-resolved-cases"
                    label="Resolved Cases"
                    value={String(resolvedCases)}
                    caption="Closed & validated verdicts"
                    onSelect={() => setSummaryDetail('resolved-cases')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-pending-verdicts"
                    label="Pending Verdicts"
                    value={String(pendingVerdicts)}
                    caption="Awaiting executive review"
                    onSelect={() => setSummaryDetail('pending-verdicts')}
                  />
                </>
              )}
            </div>

            {/* Donut Chart (left half) + Live Operations Feed (right half) */}
            <div className="grid h-[21rem] grid-cols-2 gap-3">
              {isEvents ? (
                <EventDistributionCard
                  key="donut-events"
                  compact
                  counts={eventCounts}
                  onSelect={() => setSummaryDetail('total-events')}
                />
              ) : (
                <ReportDistributionCard
                  key="donut-reports"
                  compact
                  counts={reportCounts}
                  onSelect={() => setSummaryDetail('total-reports')}
                />
              )}

              <ExecutiveLiveFeed onViewLogs={isExecutiveLite ? undefined : () => navigate('logs')} />
            </div>
          </div>

          {/* Row 2: Pending Actions (30%) + Trend Analytics (70%) */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-10">
            <div className="lg:col-span-3">
              <ExecutivePendingActions items={pendingActionItems} onViewDetails={() => setSummaryDetail('pending-actions')} />
            </div>
            <div className="lg:col-span-7">
              <ExecutiveTrendAnalyticsCard onViewRegistry={() => navigate('registry')} />
            </div>
          </div>
        </div>
        )}
      </ExecutiveShell>
      <ExecutiveSummaryDetailModal
        detail={summaryDetail}
        events={events}
        damageExceptions={damageExceptions}
        pendingActions={pendingActionItems}
        onClose={() => setSummaryDetail(null)}
      />
    </>
  )
}

export default EventDashboardPage
