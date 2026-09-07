import { useEffect, useMemo, useState } from 'react'
import { dispatchProgress, getProgressBarColor, getIncompleteEvents } from '@/lib/event-progress'
import { Search, MoreVertical, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import type { PortalEvent } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const statusStyles: Record<string, string> = {
  Reserved: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  Initialized: 'text-amber-700 bg-amber-50 border-amber-200',
  'In Production': 'text-sky-700 bg-sky-50 border-sky-200',
  'On Hold': 'text-rose-700 bg-rose-50 border-rose-200',
  Completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Cancelled: 'text-neutral-500 line-through bg-neutral-100 border-neutral-200',
}

export function EventRegistryPage() {
  const { events, updateEvent } = usePortal()
  // Admin has read-only oversight; Executives manage the operations registry.
  const { isAdmin, adminRole } = useAuth()
  const { intent, clearIntent, navigate } = useNav()
  const readOnly = isAdmin
  // Sub-tab state: 'registry' (table & static record) vs 'readiness' (Operational Progress & execution state)
  const [activeTab, setActiveTab] = useState<'registry' | 'readiness'>('registry')

  // A single drawer instance serves create / view / edit.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  const [activeEvent, setActiveEvent] = useState<PortalEvent | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Operational Progress modal state
  const [progressModalEvent, setProgressModalEvent] = useState<PortalEvent | null>(null)

  // Cancellation confirmation modal state
  const [cancelEventTarget, setCancelEventTarget] = useState<PortalEvent | null>(null)

  // Pagination state (10 rows per page)
  const [currentPage, setCurrentPage] = useState(1)

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

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter])

  const statuses = ['All', 'Reserved', 'Initialized', 'In Production', 'On Hold', 'Completed', 'Cancelled']

  const metrics = useMemo(
    () => ({
      total: (events || []).filter(Boolean).length,
      executed: (events || []).filter((e) => e && e.status === 'Completed').length,
      reserved: (events || []).filter((e) => e && e.status === 'Reserved').length,
      cancelled: (events || []).filter((e) => e && e.status === 'Cancelled').length,
    }),
    [events],
  )

  // Operational Progress: Filter out Completed & Cancelled events, sort ascending by %
  const incompleteEvents = useMemo(() => getIncompleteEvents(events), [events])

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase()
    return (events || [])
      .filter(Boolean)
      .filter((e) => {
        const matchesQuery =
          !q ||
          (e.title || '').toLowerCase().includes(q) ||
          (e.client || '').toLowerCase().includes(q) ||
          (e.refId || '').toLowerCase().includes(q) ||
          (e.venue || '').toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'All' || e.status === statusFilter
        return matchesQuery && matchesStatus
      })
  }, [events, query, statusFilter])

  const totalPages = Math.ceil(filtered.length / 10) || 1
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * 10
    return filtered.slice(start, start + 10)
  }, [filtered, currentPage])

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

  return (
    <ExecutiveShell activeId="registry" onSelect={destination} stickyHeader={stickyHeader}>
      {/* Sub-tab navigation */}
      <div className="mt-6 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('registry')}
          className={cn(
            'px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] border-b-2 transition-all',
            activeTab === 'registry'
              ? 'border-neutral-900 text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Registry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('readiness')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] border-b-2 transition-all',
            activeTab === 'readiness'
              ? 'border-neutral-900 text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Readiness
          {incompleteEvents.length > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-[0.55rem] font-bold text-primary">
              {incompleteEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: REGISTRY (Static Event Records Table) */}
      {activeTab === 'registry' && (
        <div className="animate-in fade-in duration-150">
          {/* Filter bar */}
          <div id="events-table-section" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {/* Status filter pills */}
              {statuses.map((status) => {
                const count = status === 'All'
                  ? (events || []).filter(Boolean).length
                  : (events || []).filter((e) => e && e.status === status).length
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

          {/* Main Table */}
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
                  {paginatedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">
                        No events registered matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedEvents.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => openView(e)}
                        className="border-t border-border/60 transition-colors hover:bg-muted/40 cursor-pointer"
                      >
                        <td className="px-4 py-4 text-xs font-medium text-card-foreground">
                          {e.refId}
                        </td>
                        <td className="px-4 py-4 text-xs font-medium text-card-foreground">{e.title}</td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">{e.client || '—'}</td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">{e.venue || '—'}</td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {e.targetDate || '—'}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {e.installationStart || '—'}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {e.installationEnd || '—'}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 rounded-full border text-[0.6rem] font-bold uppercase tracking-[0.12em]',
                              statusStyles[e.status],
                            )}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-4" onClick={(evt) => evt.stopPropagation()}>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(evt) => {
                                evt.stopPropagation()
                                setOpenMenuId(openMenuId === e.id ? null : e.id)
                              }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted transition"
                              aria-label="Actions"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                            {openMenuId === e.id && (
                              <div className="absolute right-0 z-10 w-36 rounded-md border border-border bg-card shadow-lg py-1">
                                {!readOnly ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        openEdit(e)
                                        setOpenMenuId(null)
                                      }}
                                      className="block w-full px-3 py-1.5 text-left text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground hover:bg-muted"
                                    >
                                      Edit
                                    </button>
                                    {e.status !== 'Cancelled' && (
                                      <button
                                        type="button"
                                        onClick={(evt) => {
                                          evt.stopPropagation()
                                          setCancelEventTarget(e)
                                          setOpenMenuId(null)
                                        }}
                                        className="block w-full px-3 py-1.5 text-left text-[0.65rem] font-bold uppercase tracking-[0.12em] text-destructive hover:bg-destructive/10"
                                      >
                                        Cancel Event
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className="block px-3 py-1.5 text-left text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground opacity-50">
                                    Read Only
                                  </span>
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

            {/* Numbered Pagination (10 rows per page) */}
            {filtered.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-[0.65rem] text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{(currentPage - 1) * 10 + 1}</span> to{' '}
                  <span className="font-semibold text-foreground">{Math.min(currentPage * 10, filtered.length)}</span> of{' '}
                  <span className="font-semibold text-foreground">{filtered.length}</span> events
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex size-7 items-center justify-center rounded-md border border-border text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'flex size-7 items-center justify-center rounded-md text-xs font-semibold transition',
                        currentPage === page
                          ? 'bg-neutral-900 text-white'
                          : 'border border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="flex size-7 items-center justify-center rounded-md border border-border text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: READINESS (Live Execution State & Operational Progress) */}
      {activeTab === 'readiness' && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                Operational Progress
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Dispatch readiness for all active event portfolios — sorted by lowest progress first.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            {incompleteEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No incomplete active events to track.</p>
            ) : (
              incompleteEvents.map((e) => {
                const pct = dispatchProgress[e.status] ?? 0
                return (
                  <div
                    key={e.id}
                    onClick={() => setProgressModalEvent(e)}
                    className="group flex flex-col justify-between gap-3 rounded-xl border border-border/80 bg-background/60 p-4 transition-all hover:border-primary/50 hover:bg-accent/40 cursor-pointer sm:flex-row sm:items-center"
                  >
                    {/* Left: Icon + Title & Metadata */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs group-hover:border-primary/40 group-hover:text-primary transition-colors">
                        <Calendar className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate text-xs font-semibold text-card-foreground group-hover:text-primary transition-colors">
                            {e.title}
                          </span>
                          <span className={cn('px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] rounded border', statusStyles[e.status])}>
                            {e.status}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">
                          {e.venue || 'Venue Pending'} &bull; {e.targetDate || 'TBD'}
                        </p>
                      </div>
                    </div>

                    {/* Center/Right: Progress Bar & Chevron Icon Affordance */}
                    <div className="flex items-center justify-between gap-4 shrink-0 sm:justify-end">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-24 sm:w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', getProgressBarColor(pct))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-bold text-card-foreground">
                          {pct}%
                        </span>
                      </div>

                      {/* Chevron affordance signaling full-row clickability */}
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-4 border-t border-border/60 pt-3">
            <span className="text-[0.65rem] text-muted-foreground">
              {incompleteEvents.length} active event{incompleteEvents.length === 1 ? '' : 's'} tracked
            </span>
          </div>
        </div>
      )}

      {/* Per-Event Summary Modal */}
      {progressModalEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setProgressModalEvent(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {progressModalEvent.refId}
                  </span>
                  <span className={cn('px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] rounded border', statusStyles[progressModalEvent.status])}>
                    {progressModalEvent.status}
                  </span>
                </div>
                <h2 className="mt-1 font-serif text-xl font-medium text-foreground truncate">
                  {progressModalEvent.title}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  Client: <span className="font-medium text-card-foreground">{progressModalEvent.client || '—'}</span> &bull; Venue: <span className="font-medium text-card-foreground">{progressModalEvent.venue || '—'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalEvent(null)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-5 space-y-5">
              {/* Dispatch Readiness Progress */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
                    Dispatch Readiness Progress
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {dispatchProgress[progressModalEvent.status] ?? 0}%
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      getProgressBarColor(dispatchProgress[progressModalEvent.status] ?? 0),
                    )}
                    style={{ width: `${dispatchProgress[progressModalEvent.status] ?? 0}%` }}
                  />
                </div>
              </div>

              {/* 3 Summary Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col justify-between gap-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                  <span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Asset Availability
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-card-foreground">
                      {(dispatchProgress[progressModalEvent.status] ?? 0) >= 65
                        ? 'Assets Allocated & Staged'
                        : (dispatchProgress[progressModalEvent.status] ?? 0) >= 40
                          ? 'Partial Allocation Locked'
                          : 'Inventory Reserved'}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                      {(dispatchProgress[progressModalEvent.status] ?? 0) >= 65
                        ? 'Ready for final loading'
                        : 'Procurement verification active'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                  <span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Crew &amp; Staffing
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-card-foreground">
                      {progressModalEvent.status === 'In Production'
                        ? 'Field Crew Active On-Site'
                        : progressModalEvent.status === 'On Hold'
                          ? 'Staffing Paused'
                          : 'Roster Scheduled'}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                      {progressModalEvent.status === 'On Hold' ? 'Awaiting resume signal' : 'Assignments verified'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                  <span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Venue &amp; Date Status
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-card-foreground truncate">
                      {progressModalEvent.venue || 'Venue Pending'}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                      {progressModalEvent.targetDate || 'TBD'} ({progressModalEvent.installationStart || '—'} - {progressModalEvent.installationEnd || '—'})
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setProgressModalEvent(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const ev = progressModalEvent
                  setProgressModalEvent(null)
                  openView(ev)
                }}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                Open Full Event Details &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog for Cancel Event */}
      <ConfirmDialog
        open={Boolean(cancelEventTarget)}
        title="Cancel Event Registration"
        eyebrow="Terminal Action Confirmation"
        description={
          <span>
            Are you sure you want to cancel <strong>{cancelEventTarget?.title}</strong> ({cancelEventTarget?.refId})? This action will set the event status to <strong>Cancelled</strong>.
          </span>
        }
        confirmLabel="Yes, Cancel Event"
        cancelLabel="Keep Event Active"
        tone="destructive"
        onConfirm={() => {
          if (cancelEventTarget) {
            updateEvent(
              cancelEventTarget.id,
              {
                title: cancelEventTarget.title,
                client: cancelEventTarget.client,
                venue: cancelEventTarget.venue,
                targetDate: cancelEventTarget.targetDate,
                installationStart: cancelEventTarget.installationStart,
                installationEnd: cancelEventTarget.installationEnd,
                moodPlan: cancelEventTarget.moodPlan,
                status: 'Cancelled',
              },
              adminRole || 'Executive',
            )
            setCancelEventTarget(null)
          }
        }}
        onCancel={() => setCancelEventTarget(null)}
      />

      <RegisterEventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        event={activeEvent}
        mode={drawerMode}
      />
    </ExecutiveShell>
  )
}


