import { useState, useMemo } from 'react'
import { Search, Plus, MoreVertical, Edit3 } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { StatusBadge, type StatusVariant } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { PortalEvent, EventStatus } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const eventStatusVariants: Record<string, StatusVariant> = {
  Initialized: 'warning',
  'In Production': 'info',
  Reserved: 'accent',
  'On Hold': 'warning',
  Completed: 'success',
  Settled: 'success',
  Cancelled: 'neutral',
}

const statuses: (EventStatus | 'All')[] = [
  'All',
  'Initialized',
  'In Production',
  'On Hold',
  'Completed',
  'Settled',
]

// Derive a representative progress percentage for an event based on its lifecycle status
function calculateEventProgress(event: PortalEvent): number {
  switch (event.status) {
    case 'Initialized':
      return 15
    case 'Reserved':
      return 35
    case 'In Production':
      return 65
    case 'On Hold':
      return 45
    case 'Completed':
    case 'Settled':
      return 100
    case 'Cancelled':
      return 0
    default:
      return 50
  }
}

function formatDisplayTime(timeStr?: string, fallback = '09:00 AM'): string {
  if (!timeStr) return fallback
  if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(timeStr.trim())) return timeStr.trim()
  return timeStr
}

export function ExecutiveLiteEventOperations() {
  const { navigate } = useNav()
  const { events } = usePortal()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'All'>('All')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Drawer modal states
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedEvent, setSelectedEvent] = useState<PortalEvent | null>(null)

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const metrics = useMemo(
    () => ({
      total: events.length,
      executed: events.filter((e) => e.status === 'Completed' || e.status === 'Settled').length,
      reserved: events.filter((e) => e.status === 'Reserved' || e.status === 'In Production').length,
      cancelled: events.filter((e) => e.status === 'Cancelled').length,
    }),
    [events],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.client.toLowerCase().includes(q) ||
        e.refId.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [events, query, statusFilter])

  // Active events for the operational progress area (top 4-5 items)
  const activeProgressEvents = useMemo(() => {
    return events
      .filter((e) => e.status !== 'Cancelled')
      .slice(0, 4)
  }, [events])

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
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Event Operations
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Register and orchestrate event portfolios across venues, timelines, and production stages.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, client, ref ID, venue..."
            className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-72"
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <ExecutiveShell activeId="registry" onSelect={destination} stickyHeader={stickyHeader}>
        <div className="flex flex-col gap-6">
          {/* Operational Progress / Summary Area matching Reference 3 */}
          {activeProgressEvents.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              {activeProgressEvents.map((ev) => {
                const pct = calculateEventProgress(ev)
                const isComplete = pct === 100
                return (
                  <div key={ev.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-serif font-medium text-foreground tracking-wide truncate pr-4">
                        {ev.title}
                      </span>
                      <span className="font-mono text-[0.7rem] font-bold text-muted-foreground shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          isComplete ? 'bg-emerald-500' : 'bg-sky-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Filter Bar with Status Pills & REGISTER NEW EVENT Button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => {
                const count =
                  status === 'All'
                    ? events.length
                    : events.filter((e) => e.status === status).length
                const active = statusFilter === status
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] transition',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {status} ({count})
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 px-5 py-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] shadow-sm transition hover:opacity-90 self-start sm:self-auto"
            >
              <Plus className="size-3.5" />
              REGISTER NEW EVENT
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <CompactStatStrip
              stats={[
                { label: 'Total Events', value: metrics.total },
                { label: 'Total Executed', value: metrics.executed },
                { label: 'Total Reserved', value: metrics.reserved },
                { label: 'Total Cancelled', value: metrics.cancelled },
              ]}
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[
                      'REFERENCE ID',
                      'EVENT TITLE',
                      'CLIENT NAME',
                      'EVENT VENUE',
                      'EVENT DATE',
                      'START TIME',
                      'END TIME',
                      'STATUS',
                      'ACTION',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12">
                        <EmptyState
                          title="No events found"
                          message="No registered events match your search query or status filters."
                          actionLabel="Register New Event"
                          onAction={openCreate}
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-4 font-mono text-xs font-semibold text-foreground">
                          {e.refId || 'PRT-PENDING'}
                        </td>
                        <td className="px-4 py-4 font-serif text-sm font-medium text-foreground">
                          {e.title}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {e.client}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {e.venue}
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-muted-foreground">
                          {e.targetDate}
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-muted-foreground">
                          {formatDisplayTime(e.eventStart || e.installationStart, '09:00 AM')}
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-muted-foreground">
                          {formatDisplayTime(e.eventEnd || e.installationEnd, '11:00 PM')}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            variant={eventStatusVariants[e.status] ?? 'neutral'}
                            className={e.status === 'Cancelled' ? 'line-through opacity-70' : undefined}
                          >
                            {e.status}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openView(e)}
                              className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                            >
                              VIEW EVENT
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenMenuId(openMenuId === e.id ? null : e.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-muted"
                                aria-label="More actions"
                              >
                                <MoreVertical className="size-4" />
                              </button>
                              {openMenuId === e.id && (
                                <div className="absolute right-0 z-20 w-32 rounded-md border border-border bg-card shadow-lg py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEdit(e)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted font-medium"
                                  >
                                    <Edit3 className="size-3.5" />
                                    Edit Event
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ExecutiveShell>

      {/* Drawer bound to real events and store */}
      <RegisterEventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        event={selectedEvent}
        mode={drawerMode}
      />
    </>
  )
}

export default ExecutiveLiteEventOperations
