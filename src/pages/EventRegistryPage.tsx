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
import { ExecutiveSegmentedProgress } from '@/components/executive/ExecutiveSegmentedProgress'
import { ProjectValuationPanel } from '@/components/executive/ProjectValuationPanel'
import type { PortalEvent } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

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
  // Admin and Executive have read-only oversight; Planners register & edit events.
  const { isAdmin, isExecutive } = useAuth()
  const { intent, clearIntent, navigate } = useNav()
  const readOnly = isAdmin || isExecutive
  // A single drawer instance serves create / view / edit.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  const [activeEvent, setActiveEvent] = useState<PortalEvent | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showSegmentedTracks, setShowSegmentedTracks] = useState(false)
  // Tracks which event the Project Valuation Panel should show budget for
  const [budgetEvent, setBudgetEvent] = useState<PortalEvent | null>(null)

  const openCreate = () => {
    setActiveEvent(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }
  const openView = (e: PortalEvent) => {
    setActiveEvent(e)
    setDrawerMode('view')
    setDrawerOpen(true)
    // Pin the budget panel to this event when Executive opens its detail
    setBudgetEvent(e)
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

  if (showSegmentedTracks) {
    return (
      <ExecutiveShell activeId="registry" onSelect={destination}>
        <ExecutiveSegmentedProgress onBack={() => setShowSegmentedTracks(false)} />
      </ExecutiveShell>
    )
  }

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

          {/* Segmented Operational Progress — chunked 4-stage milestones */}
          <div className="mt-7 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                  Segmented Operational Progress
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chunked milestone progress: Rose Red (Init) → Amber (Prod) → Emerald (Install) → Cyan (Settled).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSegmentedTracks(true)}
                className="button-primary text-xs shrink-0 whitespace-nowrap"
              >
                Open Full Operational Tracks
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {events.filter((e) => e.status !== 'Cancelled').length === 0 ? (
                <p className="text-xs text-muted-foreground">No active events to track.</p>
              ) : (
                events
                  .filter((e) => e.status !== 'Cancelled')
                  .map((e) => {
                    const getStageLevel = (status: string) => {
                      switch (status) {
                        case 'Initialized': return 0
                        case 'In Production': case 'Reserved': return 1
                        case 'On Hold': return 2
                        case 'Completed': case 'Settled': return 3
                        default: return 0
                      }
                    }
                    const level = getStageLevel(e.status)
                    const stageColors = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500']
                    const stageLabels = ['Initialization', 'Production', 'Installation', 'Egress & Check-In']

                    return (
                      <div key={e.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-xs font-medium text-card-foreground">
                            {e.title}
                          </span>
                          <span className="shrink-0 text-[0.65rem] font-bold text-primary">
                            {stageLabels[level]}
                          </span>
                        </div>
                        {/* Chunked 4-segment bar — no numerical percentages */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {stageColors.map((color, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                'h-2 rounded-full transition-all',
                                idx <= level ? color : 'bg-muted/50',
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
          {/* Project Valuation Panel — R14: per-event budget breakdown */}
          {events.filter((e) => e.status !== 'Cancelled').length > 0 && (
            <div className="mt-7">
              {/* Event selector for budget panel when no event is pinned */}
              {!budgetEvent && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                      Project Valuation
                    </p>
                    <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                      Select an event to view its real-time budget breakdown.
                    </p>
                  </div>
                  <select
                    className="rounded-md border border-input bg-card py-2 pl-3 pr-8 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    defaultValue=""
                    onChange={(ev) => {
                      const found = events.find((e) => e.id === ev.target.value)
                      if (found) setBudgetEvent(found)
                    }}
                  >
                    <option value="" disabled>Choose event…</option>
                    {events
                      .filter((e) => e.status !== 'Cancelled')
                      .map((e) => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                  </select>
                </div>
              )}
              {budgetEvent && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[0.65rem] text-muted-foreground">
                      Showing valuation for: <strong className="text-foreground">{budgetEvent.title}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setBudgetEvent(null)}
                      className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary hover:underline"
                    >
                      Switch event
                    </button>
                  </div>
                  <ProjectValuationPanel event={budgetEvent} />
                </div>
              )}
            </div>
          )}
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
