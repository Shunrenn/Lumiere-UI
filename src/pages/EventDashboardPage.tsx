import { useState, useMemo } from 'react'
import { ArrowUpCircle, AlertTriangle, CheckCircle2, PackageSearch } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import {
  ExecutiveStatCard,
  EventDistributionCard,
  ReportDistributionCard,
  ExecutiveTrendAnalyticsCard,
} from '@/components/executive/ExecutiveAnalytics'
import { ExecutiveLiveFeed } from '@/components/executive/ExecutiveLiveFeed'
import { ExecutiveOngoingAlerts, type TickerItem } from '@/components/executive/ExecutiveOngoingAlerts'
import { getEventProgress, getUrgentLowReadinessEvents } from '@/lib/event-progress'
import { getOperationalEvents } from '@/lib/operational-events'
import { ExecutiveTrendSummaryModal } from '@/components/executive/ExecutiveTrendSummaryModal'
import { PortfolioHealthMethodologyModal } from '@/components/executive/PortfolioHealthMethodologyModal'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

type DashboardMetricMode = 'events' | 'reports'

export function EventDashboardPage() {
  const { navigate } = useNav()
  const { events, damageExceptions, procurement } = usePortal()
  const [metricMode, setMetricMode] = useState<DashboardMetricMode>('events')
  const [healthModalOpen, setHealthModalOpen] = useState(false)
  const [trendSummaryOpen, setTrendSummaryOpen] = useState(false)
  const [trendSummaryMode, setTrendSummaryMode] = useState<'events' | 'damage'>('events')

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
          d.status === 'Dismissed' ||
          d.status === 'Sent for Repair' ||
          d.status === 'Sent for Write-off',
      ).length,
    [damageExceptions],
  )
  const pendingVerdicts = useMemo(
    () =>
      damageExceptions.filter(
        (d) =>
          d.status === 'Escalated — Round 1 Review' ||
          d.status === 'Escalated — Round 2 Review',
      ).length,
    [damageExceptions],
  )

  // Damage Case Status counts (for the current status-based donut — see note
  // above: Phase 5 calls for this to become a Damaged vs. Missing split
  // instead, pending a data-model decision).
  const reportCounts = useMemo(() => {
    const tally: Record<string, number> = {
      'Pending Verdict': 0,
      'Escalated — Round 1 Review': 0,
      'Escalated — Round 2 Review': 0,
      'Pending Resolution': 0,
      'Sent for Repair': 0,
      'Sent for Write-off': 0,
      Dismissed: 0,
    }
    damageExceptions.forEach((d) => {
      if (tally[d.status] !== undefined) {
        tally[d.status] += 1
      }
    })
    return tally
  }, [damageExceptions])

  // Single shared source — same one Live Operations Feed and Operational
  // Audit Logs read from, so the Ongoing Alerts ticker uses identical
  // wording for the same underlying events (Phase 6, item 2).
  const operationalEvents = useMemo(
    () => getOperationalEvents(events, damageExceptions, procurement),
    [events, damageExceptions, procurement],
  )

  // Urgent: escalated damage reports (actionable) + low-readiness events
  // with an approaching date (informational flag, no action button — no
  // OperationalEventType exists for this yet, see event-progress.ts).
  const urgentItems: TickerItem[] = useMemo(() => {
    const items: TickerItem[] = []

    // 1. Map escalated damage exceptions (both Round 1 and Round 2)
    damageExceptions
      .filter(
        (d) =>
          d.status === 'Escalated — Round 1 Review' ||
          d.status === 'Escalated — Round 2 Review',
      )
      .forEach((d) => {
        items.push({
          id: `urgent-damage-${d.id}`,
          title: d.status,
          subtitle: `${d.logId} · ${d.assetName} (${d.boundEvent})`,
          tone: 'rose',
          icon: ArrowUpCircle,
          actionLabel: 'Evaluate',
          onAction: () =>
            navigate('damage', { kind: 'review-damage', payload: { id: d.id } }),
        })
      })

    // 2. Map low-readiness events with an approaching target date
    getUrgentLowReadinessEvents(events).forEach((e) => {
      items.push({
        id: `readiness-${e.id}`,
        title: 'Low Dispatch Readiness — Date Approaching',
        subtitle: `${e.title} · ${getEventProgress(e)}% ready · ${e.targetDate}`,
        tone: 'amber',
        icon: AlertTriangle,
      })
    })

    return items
  }, [damageExceptions, events, navigate])

  // Highlight: notable, informational-only outcomes.
  const highlightItems: TickerItem[] = useMemo(() => {
    return operationalEvents
      .filter(
        (op) => op.eventType === 'Damage Verdict Recorded' || op.eventType === 'Event Registered',
      )
      .slice(0, 5)
      .map((op) => ({
        id: op.id,
        title: op.eventType,
        subtitle: op.title,
        tone: 'emerald' as const,
        icon: CheckCircle2,
      }))
  }, [operationalEvents])

  // Soft Alert: FYI-only items WOM owns resolution for.
  const softAlertItems: TickerItem[] = useMemo(() => {
    return operationalEvents
      .filter(
        (op) =>
          op.eventType === 'Asset Restock Requested' || op.eventType === 'Damage Report Submitted',
      )
      .map((op) => ({
        id: op.id,
        title: op.eventType,
        subtitle: op.title,
        tone: 'sky' as const,
        icon: PackageSearch,
      }))
  }, [operationalEvents])

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

          {/* Row 2: Ongoing Alerts (30%) + Trend Analytics (70%) */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-10">
            <div className="lg:col-span-3">
              <ExecutiveOngoingAlerts
                urgent={urgentItems}
                highlight={highlightItems}
                softAlert={softAlertItems}
              />
            </div>
            <div className="lg:col-span-7">
              <ExecutiveTrendAnalyticsCard
                onViewSummary={(mode) => {
                  setTrendSummaryMode(mode)
                  setTrendSummaryOpen(true)
                }}
              />
            </div>
          </div>
        </div>
      </ExecutiveShell>

      <ExecutiveTrendSummaryModal
        open={trendSummaryOpen}
        mode={trendSummaryMode}
        events={events}
        damageExceptions={damageExceptions}
        onClose={() => setTrendSummaryOpen(false)}
        onViewEvent={(id) => {
          setTrendSummaryOpen(false)
          navigate('registry', { kind: 'view-event', payload: { id } })
        }}
        onViewDamageReport={(id) => {
          setTrendSummaryOpen(false)
          navigate('damage', { kind: 'review-damage', payload: { id } })
        }}
      />

      <PortfolioHealthMethodologyModal
        open={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />
    </>
  )
}

export default EventDashboardPage