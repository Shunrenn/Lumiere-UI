import { useState, useMemo } from 'react'
import { CalendarClock, ShieldAlert } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import {
  ExecutiveStatCard,
  EventDistributionCard,
  ReportDistributionCard,
  ExecutiveTrendAnalyticsCard,
} from '@/components/executive/ExecutiveAnalytics'
import { ExecutiveLiveFeed } from '@/components/executive/ExecutiveLiveFeed'
import { ExecutivePendingActions, type ExecutivePendingItem } from '@/components/executive/ExecutivePendingActions'
import { PortfolioHealthMethodologyModal } from '@/components/executive/PortfolioHealthMethodologyModal'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

type DashboardMetricMode = 'events' | 'reports'

export function EventDashboardPage() {
  const { navigate } = useNav()
  const { events, damageExceptions } = usePortal()
  const [metricMode, setMetricMode] = useState<DashboardMetricMode>('events')
  const [healthModalOpen, setHealthModalOpen] = useState(false)

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
        title: 'Damage Report Awaiting Review',
        subtitle: `${pendingDamage.logId} · ${pendingDamage.assetName}`,
        tone: 'rose',
        icon: ShieldAlert,
        actionLabel: 'Adjudicate',
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
        title: 'Audit Exception Sign-off',
        subtitle: `${auditDamage.logId} · ${auditDamage.assetName}`,
        tone: 'amber',
        icon: ShieldAlert,
        actionLabel: 'Sign off',
        onAction: () =>
          navigate('damage', { kind: 'review-damage', payload: { id: auditDamage.id } }),
      })
    }

    return items
  }, [events, damageExceptions, navigate])

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const isEvents = metricMode === 'events'

  const stickyHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-medium leading-tight text-foreground sm:text-4xl">
          Executive Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
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

  return (
    <>
      <ExecutiveShell activeId="dashboard" onSelect={destination} stickyHeader={stickyHeader}>
        <div className="flex flex-col gap-4">
          {/* Row 1: 4 small stat cards (left) + Distribution Donut / Live Operations Feed (right) */}
          <div data-testid="executive-dashboard-stats" className="grid gap-4 lg:grid-cols-2">
            {/* 4 Cards (keyed to animate on toggle) */}
            <div key={metricMode} className="admin-fade grid grid-cols-2 gap-3">
              {isEvents ? (
                <>
                  <ExecutiveStatCard
                    agentSelector="data-agent-portfolio-health"
                    label="Portfolio Health"
                    value="98.5%"
                    caption="30-day operational readiness"
                    onSelect={() => setHealthModalOpen(true)}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-total-events"
                    label="Total Events"
                    value={String(totalEvents)}
                    caption="Registered event portfolios"
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
                    agentSelector="data-agent-ongoing-events"
                    label="Ongoing Events"
                    value={String(ongoingEvents)}
                    caption="Active production & reserved"
                    onSelect={() => navigate('registry')}
                  />
                </>
              ) : (
                <>
                  <ExecutiveStatCard
                    agentSelector="data-agent-portfolio-health"
                    label="Portfolio Health"
                    value="98.5%"
                    caption="30-day operational readiness"
                    onSelect={() => setHealthModalOpen(true)}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-total-reports"
                    label="Total Reports"
                    value={String(totalReports)}
                    caption="Post-event damage filings"
                    onSelect={() => navigate('damage')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-resolved-cases"
                    label="Resolved Cases"
                    value={String(resolvedCases)}
                    caption="Closed & validated verdicts"
                    onSelect={() => navigate('damage')}
                  />
                  <ExecutiveStatCard
                    agentSelector="data-agent-pending-verdicts"
                    label="Pending Verdicts"
                    value={String(pendingVerdicts)}
                    caption="Awaiting executive review"
                    onSelect={() => navigate('damage')}
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
                  onSelect={() => navigate('registry')}
                />
              ) : (
                <ReportDistributionCard
                  key="donut-reports"
                  compact
                  counts={reportCounts}
                  onSelect={() => navigate('damage')}
                />
              )}

              <ExecutiveLiveFeed onViewLogs={() => navigate('logs')} />
            </div>
          </div>

          {/* Row 2: Pending Actions (30%) + Trend Analytics (70%) */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-10">
            <div className="lg:col-span-3">
              <ExecutivePendingActions items={pendingActionItems} />
            </div>
            <div className="lg:col-span-7">
              <ExecutiveTrendAnalyticsCard onViewRegistry={() => navigate('registry')} />
            </div>
          </div>
        </div>
      </ExecutiveShell>

      <PortfolioHealthMethodologyModal
        open={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />
    </>
  )
}

export default EventDashboardPage
