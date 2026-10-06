import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { EmptyState } from '@/components/EmptyState'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { PortalEvent, EventStatus } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

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
    case 'Completed':
    case 'Settled':
      return 100
    case 'In Production':
      return 65
    case 'Reserved':
      return 45
    case 'On Hold':
      return 35
    case 'Initialized':
      return 25
    case 'Cancelled':
      return 0
    default:
      return 50
  }
}

function formatDateOrTime(rawDateOrTime?: string, fallbackDate?: string): string {
  if (!rawDateOrTime) return fallbackDate || '—'
  if (rawDateOrTime.includes('T')) {
    return rawDateOrTime.split('T')[0]
  }
  return rawDateOrTime
}

export function ExecutiveLiteEventOperations() {
  const { navigate } = useNav()
  const { events } = usePortal()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'All'>('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  // Active events for the operational progress area (top 4 items matching reference)
  const activeProgressEvents = useMemo(() => {
    return events.filter((e) => e.status !== 'Cancelled').slice(0, 4)
  }, [events])

  const openView = (ev: PortalEvent) => {
    setSelectedEvent(ev)
    setDrawerOpen(true)
  }

  const stickyHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-neutral-900 dark:text-foreground">
          Event Operations
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-muted-foreground">
          Register and orchestrate event portfolios across venues, timelines, and production stages.
        </p>
      </div>

      {/* Search field positioned toward upper-right matching Reference 3 */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, client, ref ID, venue..."
          className="w-full rounded-lg border border-[#DDD7CD] bg-white/80 dark:bg-card/80 py-2.5 pl-10 pr-4 text-xs text-neutral-800 dark:text-foreground placeholder:text-neutral-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
        />
      </div>
    </div>
  )

  return (
    <>
      <ExecutiveShell activeId="registry" onSelect={destination} stickyHeader={stickyHeader}>
        <div className="flex flex-col gap-6">
          {/* Operational Progress / Summary Area matching Reference 3 */}
          {activeProgressEvents.length > 0 && (
            <div className="rounded-xl border border-[#E6DFD5] bg-[#F7F4EE] dark:bg-card/70 dark:border-border/70 p-5 space-y-4 shadow-2xs">
              {activeProgressEvents.map((ev) => {
                const pct = calculateEventProgress(ev)
                const isComplete = pct === 100
                return (
                  <div key={ev.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-normal text-neutral-800 dark:text-neutral-200 truncate pr-4">
                        {ev.title}
                      </span>
                      <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5DFD4] dark:bg-muted/40">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isComplete ? 'bg-[#00B050]' : 'bg-[#0088FF]',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

            {/* Read-only filter bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
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
                      'rounded-full px-3.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider transition-colors',
                      active
                        ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'border border-[#DDD7CD] bg-[#EFECE6] text-neutral-700 hover:bg-[#E5E0D5] dark:border-border/60 dark:bg-muted/40 dark:text-neutral-300 dark:hover:bg-muted',
                    )}
                  >
                    {status.toUpperCase()} ({count})
                  </button>
                )
              })}
            </div>

          </div>

          {/* Event Table Container with Quick Stats Ribbon matching Reference 3 */}
          <div className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F4] dark:bg-card/70 dark:border-border/70 overflow-hidden shadow-2xs">
            {/* Quick Stats Ribbon */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-5 py-3 border-b border-[#E6DFD5] dark:border-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900 dark:text-foreground text-sm font-mono">
                  {metrics.total}
                </span>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-500">
                  TOTAL EVENTS
                </span>
              </div>
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900 dark:text-foreground text-sm font-mono">
                  {metrics.executed}
                </span>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-500">
                  TOTAL EXECUTED
                </span>
              </div>
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900 dark:text-foreground text-sm font-mono">
                  {metrics.reserved}
                </span>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-500">
                  TOTAL RESERVED
                </span>
              </div>
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900 dark:text-foreground text-sm font-mono">
                  {metrics.cancelled}
                </span>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-500">
                  TOTAL CANCELLED
                </span>
              </div>
            </div>

            {/* Event List Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="border-b border-[#E6DFD5] dark:border-border/60">
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
                        className="px-5 py-3.5 text-[0.65rem] font-bold uppercase tracking-wider text-neutral-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD5]/70 dark:divide-border/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12">
                        <EmptyState
                          title="No events found"
                          message={
                            query || statusFilter !== 'All'
                              ? 'No events match your current search and filter selections.'
                              : 'No event records are currently registered in the system.'
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e) => (
                      <tr
                        key={e.id}
                        className="hover:bg-[#F2ECE1]/40 dark:hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-4 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                          {e.refId}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-neutral-900 dark:text-foreground">
                          {e.title}
                        </td>
                        <td className="px-5 py-4 text-xs text-neutral-600 dark:text-neutral-400">
                          {e.client || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs text-neutral-600 dark:text-neutral-400">
                          {e.venue || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                          {e.targetDate || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                          {formatDateOrTime(e.eventStart || e.installationStart, e.targetDate)}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                          {formatDateOrTime(e.eventEnd || e.installationEnd, e.targetDate)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              'font-bold text-xs uppercase tracking-wide leading-tight inline-block',
                              e.status === 'In Production'
                                ? 'text-[#0070BA] dark:text-sky-400'
                                : e.status === 'Completed' || e.status === 'Settled'
                                ? 'text-[#00B050] dark:text-emerald-400'
                                : e.status === 'Initialized'
                                ? 'text-amber-600 dark:text-amber-400'
                                : e.status === 'On Hold'
                                ? 'text-amber-700 dark:text-amber-500'
                                : e.status === 'Cancelled'
                                ? 'text-neutral-400 line-through'
                                : 'text-indigo-600 dark:text-indigo-400',
                            )}
                          >
                            {e.status === 'In Production' ? (
                              <>
                                IN<br />PRODUCTION
                              </>
                            ) : (
                              e.status
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openView(e)}
                              className="text-xs font-bold uppercase tracking-wider text-[#A07040] hover:text-[#805020] dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                            >
                              VIEW EVENT
                            </button>

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

      {/* Canonical Register / View / Edit Drawer Modal */}
      <RegisterEventDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedEvent(null)
        }}
        mode="view"
        event={selectedEvent}
      />
    </>
  )
}
