import { useState, useMemo } from 'react'
import { CalendarClock, ShieldAlert, PackageSearch } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { PendingUserActions, type PendingActionItem } from '@/components/PendingUserActions'
import { EventUpdates } from '@/components/EventUpdates'
import { TrendChart } from '@/components/TrendChart'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

import { CompactStatStrip } from '@/components/CompactStatStrip'

// Mock donut chart for Asset Distribution
const ASSET_STATUSES = [
  { label: 'In Use', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { label: 'Available', color: 'text-sky-500', dot: 'bg-sky-500' },
  { label: 'Maintenance', color: 'text-amber-500', dot: 'bg-amber-500' },
  { label: 'Damaged', color: 'text-rose-500', dot: 'bg-rose-500' },
]

function AssetDistributionChart({ counts }: { counts: Record<string, number> }) {
  const total = ASSET_STATUSES.reduce((sum, s) => sum + (counts[s.label] ?? 0), 0)
  const circumference = 2 * Math.PI * 45 // r = 45

  let offset = 0
  const arcs = ASSET_STATUSES.map((seg) => {
    const value = counts[seg.label] ?? 0
    const fraction = total > 0 ? value / total : 0
    const dash = fraction * circumference
    const arc = { seg, dash, offset: -offset }
    offset += dash
    return arc
  })

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        Asset Distribution
      </h3>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative inline-flex items-center justify-center">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
            {arcs.map(({ seg, dash, offset: dashOffset }) => (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                className={seg.color}
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-[0.65rem]">
        {ASSET_STATUSES.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${seg.dot}`} />
            <span>
              {seg.label} ({counts[seg.label] ?? 0})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EventDashboardPage() {
  const { navigate } = useNav()
  const { events, inventory, damageExceptions } = usePortal()
  const [chartMode, setChartMode] = useState('events')

  const metrics = useMemo(
    () => ({
      totalEvents: events.length,
      totalAssets: inventory.length,
      totalReports: damageExceptions.length,
    }),
    [events, inventory, damageExceptions],
  )

  const assetCounts = useMemo(() => {
    const tally: Record<string, number> = {}
    inventory.forEach((item) => {
      tally[item.status] = (tally[item.status] ?? 0) + 1
    })
    return tally
  }, [inventory])

  // Operations-oriented pending actions (not the security items from the
  // System Dashboard). Each "Open" jumps to the right page and triggers there.
  const pendingItems = useMemo(() => {
    const items: (PendingActionItem & { intent: Parameters<typeof navigate>[1] })[] = []

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
        intent: { kind: 'view-event', payload: { id: awaitingEvent.id } },
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
        intent: { kind: 'review-damage', payload: { id: pendingDamage.id } },
      })
    }

    const restock = inventory.find(
      (i) => i.status === 'Critical Deficit' || i.status === 'Low Stock',
    )
    if (restock) {
      items.push({
        id: `rs-${restock.id}`,
        title: 'Asset Restock Request',
        subtitle: `${restock.assetId} · ${restock.name}`,
        tone: 'amber',
        icon: PackageSearch,
        intent: { kind: 'reorder-asset', payload: { id: restock.id } },
      })
    }

    return items
  }, [events, damageExceptions, inventory, navigate])

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stickyHeader = (
    <div>
      <h1 className="font-serif text-3xl font-medium leading-tight text-foreground sm:text-4xl">
        Executive Dashboard
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Event portfolio tracking, asset distribution, and operational event analytics.
      </p>

      {/* Compact Stat Strip */}
      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
        <CompactStatStrip
          stats={[
            { label: 'Total Events', value: metrics.totalEvents },
            { label: 'Total Assets', value: metrics.totalAssets },
            { label: 'Total Reports', value: metrics.totalReports },
          ]}
        />
      </div>
    </div>
  )

  return (
    <ExecutiveShell activeId="dashboard" onSelect={destination} stickyHeader={stickyHeader}>
      {/* Row 2: Pending Actions + Live Operations Feed (side-by-side) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <PendingUserActions
            variant="dark"
            items={pendingItems}
            onOpen={(item) => {
              const withIntent = item as (typeof pendingItems)[number]
              const target =
                withIntent.intent?.kind === 'view-event'
                  ? 'registry'
                  : withIntent.intent?.kind === 'review-damage'
                    ? 'damage'
                    : 'inventory'
              navigate(target, withIntent.intent)
            }}
          />
        </div>
        <div>
          <EventUpdates onViewLogs={() => navigate('logs')} />
        </div>
      </div>

      {/* Row 3: Asset Distribution + Trend Analytics (side-by-side) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <AssetDistributionChart counts={assetCounts} />
        </div>
        <div>
          <TrendChart
            mode={chartMode}
            onModeChange={setChartMode}
            options={[
              { value: 'events', label: 'Event Activity' },
              { value: 'assets', label: 'Asset Tracking' },
            ]}
          />
        </div>
      </div>
    </ExecutiveShell>
  )
}
