import { useEffect, useMemo, useState } from 'react'
import { Search, MoreVertical } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { EmptyState } from '@/components/EmptyState'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import type { PortalEvent } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

// Deterministic dispatch progress derived from an event's lifecycle status,
// used to render the Operational Progress bars.
const dispatchProgress: Record<string, number> = {
  Settled: 100,
  Completed: 100,
  'In Production': 65,
  'On Hold': 40,
  Reserved: 25,
  Initialized: 15,
  Cancelled: 0,
}

const statusStyles: Record<string, string> = {
  Initialized: 'text-amber-700',
  'In Production': 'text-sky-700',
  Completed: 'text-emerald-700',
  Settled: 'text-emerald-800 font-semibold',
  'On Hold': 'text-rose-700',
  Reserved: 'text-indigo-700',
  Cancelled: 'text-muted-foreground line-through',
}

function formatDisplayTime(timeOrDate?: string, defaultTime = '06:00 PM'): string {
  if (!timeOrDate) return defaultTime
  if (/^\d{4}-\d{2}-\d{2}$/.test(timeOrDate)) return defaultTime
  const match = timeOrDate.match(/(\d{1,2}):(\d{2})/)
  if (match) {
    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`
  }
  return timeOrDate
}

export function EventRegistryPage() {
  const { events } = usePortal()
  // Admin has read-only oversight; Executives manage the operations registry.
  const { isAdmin } = useAuth()
  const { intent, clearIntent, navigate } = useNav()
  const readOnly = isAdmin
  // A single drawer instance serves create / view / edit.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  const [activeEvent, setActiveEvent] = useState<PortalEvent | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const openCreate = () => {
    setActiveEvent(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }
  const openView = (e: PortalEvent) => {
    setActiveEvent(e)
    setDrawerMode('view')
    setDrawerOpen(true)
  }
  const openEdit = (e: PortalEvent) => {
    setActiveEvent(e)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }

  // Consume a "view-event" intent handed over from a dashboard "Open" button.
  useEffect(() => {
    if (intent?.kind === 'view-event') {
      const target = events.find((e) => e.id === intent.payload?.id)
      if (target) openView(target)
      clearIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  const statuses = ['All', 'Initialized', 'In Production', 'On Hold', 'Completed', 'Settled']

  const metrics = useMemo(
    () => ({
      total: events.length,
      executed: events.filter((e) => e.status === 'Completed').length,
      reserved: events.filter(
        (e) =>
          e.status === 'Reserved' ||
          e.status === 'On Hold' ||
          e.status === 'Initialized',
      ).length,
      cancelled: events.filter((e) => e.status === 'Cancelled').length,
    }),
    [events],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
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

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stickyHeader = (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground">
            Event Operations
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {readOnly
              ? 'Portfolio registry oversight — event concepts, venues, timelines, and production status.'
              : 'Register and orchestrate event portfolios across venues, timelines, and production stages.'}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, client, ref ID, venue..."
            className="w-64 rounded-md border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
    </div>
  )

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const handleRefetch = async () => {
    setIsError(false)
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [])

  return (
    <ExecutiveShell activeId="registry" onSelect={destination} stickyHeader={stickyHeader}>
      {isError ? (
        <ErrorFallback
          title="Event Operations Registry Unavailable"
          message="Could not load event portfolio registry records."
          onRetry={handleRefetch}
        />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <>
          {/* Filter bar */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {/* Status filter pills */}
              {statuses.map((status) => {
                const count = status === 'All' 
                  ? events.length 
                  : events.filter((e) => e.status === status).length
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] transition',
                      statusFilter === status
                        ? 'bg-neutral-900 text-white'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {status} ({count})
                  </button>
                )
              })}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-md bg-neutral-900 px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800"
              >
                Register New Event
              </button>
            )}
          </div>

          {/* Table */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
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
                <tr className="bg-muted/50">
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
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8">
                      <EmptyState
                        title="No events found"
                        message="No registered events match your search query or status filters."
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="border-t border-border/60">
                      <td className="px-4 py-4 text-xs font-medium text-card-foreground">
                        {e.refId}
                      </td>
                      <td className="px-4 py-4 text-xs text-card-foreground">{e.title}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{e.client}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{e.venue || '—'}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {e.targetDate || '—'}
                      </td>
                      <td className="px-4 py-4 text-xs font-mono text-muted-foreground">
                        {formatDisplayTime(e.eventStart || e.installationStart, '06:00 PM')}
                      </td>
                      <td className="px-4 py-4 text-xs font-mono text-muted-foreground">
                        {formatDisplayTime(e.eventEnd || e.installationEnd, '11:00 PM')}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'text-[0.6rem] font-bold uppercase tracking-[0.12em]',
                            statusStyles[e.status],
                          )}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openView(e)}
                            className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary underline-offset-4 transition hover:underline"
                          >
                            View Event
                          </button>
                          {!readOnly && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenMenuId(openMenuId === e.id ? null : e.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-muted"
                              >
                                <MoreVertical className="size-4" />
                              </button>
                              {openMenuId === e.id && (
                                <div className="absolute right-0 z-10 rounded-md border border-border bg-card shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEdit(e)
                                      setOpenMenuId(null)
                                    }}
                                    className="block w-full px-4 py-2 text-left text-[0.6rem] font-bold uppercase tracking-[0.12em] text-card-foreground hover:bg-muted first:rounded-t last:rounded-b"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Operational Progress — dispatch readiness per active event */}
          <div className="mt-7 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
              Operational Progress
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Asset dispatch readiness across active event portfolios.
            </p>
            <div className="mt-4 space-y-4">
              {events.filter((e) => e.status !== 'Cancelled').length === 0 ? (
                <p className="text-xs text-muted-foreground">No active events to track.</p>
              ) : (
                events
                  .filter((e) => e.status !== 'Cancelled')
                  .map((e) => {
                    const pct = dispatchProgress[e.status] ?? 0
                    return (
                      <div key={e.id}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-xs font-medium text-card-foreground">
                            {e.title}
                          </span>
                          <span className="shrink-0 text-[0.65rem] font-semibold text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-500' : 'bg-amber-500',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </>
      )}

      <RegisterEventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        event={activeEvent}
        mode={drawerMode}
      />
    </ExecutiveShell>
  )
}
