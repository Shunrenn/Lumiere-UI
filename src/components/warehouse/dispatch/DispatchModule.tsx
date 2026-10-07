import { Fragment, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  SlidersHorizontal,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import {
  advanceBatchStage,
  deleteBatch,
  exportBatchPdf,
  getEventDispatchSummaries,
  markBatchStalled,
  updateBatchHandoffNote,
  updateBatchInfo,
  useDispatchStore,
  type BatchDirection,
  type BatchStage,
  type EventDispatchSummary,
  type ReconciliationRow,
} from '@/lib/warehouse-dispatch'
import { nextStage, stageSequenceFor } from '@/lib/event-detail'
import { exportDispatchConsolidatedPdf, exportDispatchEventPdf } from '@/lib/pdf-exporter'
import { cn } from '@/lib/utils'

type TabType = 'event-grouped' | 'dispatch-overview' | 'completed-events'
type ModalSubTab = 'overview' | 'items' | 'requests'

interface DispatchModuleProps {
  onClose?: () => void
}

/** Step Pipeline for Dispatch Status */
function DispatchStatusPipeline({
  stage,
  direction,
  onSelectStage,
}: {
  stage: BatchStage
  direction: BatchDirection
  onSelectStage?: (stage: BatchStage) => void
}) {
  const sequence = stageSequenceFor(direction)
  const activeIdx = sequence.indexOf(stage)

  return (
    <div className="flex items-center gap-1">
      {sequence.map((step, idx) => {
        const isCurrent = idx === activeIdx
        const isPast = idx < activeIdx

        return (
          <Fragment key={step}>
            <button
              type="button"
              disabled={!onSelectStage}
              onClick={() => onSelectStage?.(step)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wider transition-all',
                isCurrent
                  ? 'bg-[#8C6B4B] text-white shadow-2xs dark:bg-amber-700'
                  : isPast
                    ? 'bg-[#8C6B4B]/20 text-[#8C6B4B] dark:text-amber-300'
                    : 'bg-muted/70 text-muted-foreground',
                onSelectStage && 'hover:opacity-80 cursor-pointer',
              )}
            >
              {step}
            </button>
            {idx < sequence.length - 1 && (
              <span className="text-muted-foreground/40 font-mono text-[0.6rem]">—</span>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

/** Reconciliation Status Badge */
function ReconciliationBadge({ rows }: { rows: ReconciliationRow[] }) {
  if (!rows || rows.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider">
        <span className="size-1 rounded-full bg-emerald-500" /> Matched
      </span>
    )
  }

  const hasPahabol = rows.some((r) => r.status === 'Pahabol')
  const hasShort = rows.some((r) => r.status === 'Short')

  if (hasPahabol) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8C3A2B] text-white px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider shadow-2xs">
        <span className="size-1.5 rounded-full bg-white/80" /> Additional Delivery
      </span>
    )
  }

  if (hasShort) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider shadow-2xs">
        <span className="size-1.5 rounded-full bg-white/80" /> Missing Items
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider shadow-2xs">
      <span className="size-1.5 rounded-full bg-white/80" /> Matched
    </span>
  )
}

export function DispatchModule(_props?: DispatchModuleProps) {
  const { events, staff, procurement } = usePortal()
  const { adminName } = useAuth()
  const batchStore = useDispatchStore(events, staff, procurement)

  const summaries = useMemo(
    () => getEventDispatchSummaries(events, staff, procurement),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, staff, procurement, batchStore],
  )

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<TabType>('event-grouped')
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [reconciliationFilter, setReconciliationFilter] = useState('all')

  // Modals & Navigation
  const [selectedEventModalId, setSelectedEventModalId] = useState<string | null>(null)
  const [eventModalSubTab, setEventModalSubTab] = useState<ModalSubTab>('overview')
  const [activeBatchDetail, setActiveBatchDetail] = useState<{ eventId: string; batchId: string } | null>(null)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ eventId: string; batchId: string } | null>(null)
  const [reportBreakdownModal, setReportBreakdownModal] = useState<{ eventId: string; batchId: string } | null>(null)
  const [breakdownReason, setBreakdownReason] = useState('')

  // Batch Editing in Modal
  const [isEditingVehicleInfo, setIsEditingVehicleInfo] = useState(false)
  const [editVehicle, setEditVehicle] = useState('')
  const [editPlate, setEditPlate] = useState('')
  const [editDriver, setEditDriver] = useState('')

  // Selected event for Level 2 modal
  const selectedEventModal = useMemo(
    () => summaries.find((s) => s.eventId === selectedEventModalId) ?? null,
    [summaries, selectedEventModalId],
  )

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return summaries.filter((summary) => {
      // Completed events tab filter
      const isCompleted =
        summary.batches.length > 0 &&
        summary.batches.every((b) => b.stage === 'Delivered' || b.stage === 'Returned')
      if (activeTab === 'completed-events' && !isCompleted) return false
      if (activeTab === 'event-grouped' && isCompleted && summary.batches.length > 0) return false

      // Search matching
      const matchesSearch =
        !q ||
        [summary.eventTitle, summary.venue, summary.targetDate].some((val) =>
          val.toLowerCase().includes(q),
        ) ||
        summary.batches.some((b) =>
          [b.vehicleType, b.plateNumber, b.driverName, b.id]
            .filter(Boolean)
            .some((val) => String(val).toLowerCase().includes(q)),
        )

      if (!matchesSearch) return false

      // Stage filter
      if (stageFilter !== 'all') {
        const hasStage = summary.batches.some((b) => b.stage === stageFilter)
        if (!hasStage) return false
      }

      // Direction filter
      if (directionFilter !== 'all') {
        const hasDirection = summary.batches.some((b) => b.direction === directionFilter)
        if (!hasDirection) return false
      }

      // Reconciliation filter
      if (reconciliationFilter !== 'all') {
        const hasRecon = summary.batches.some((b) =>
          b.reconciliation.some((r) => r.status === reconciliationFilter),
        )
        if (!hasRecon) return false
      }

      return true
    })
  }, [summaries, activeTab, searchQuery, stageFilter, directionFilter, reconciliationFilter])

  // Overview stats
  const allBatches = useMemo(() => summaries.flatMap((s) => s.batches), [summaries])
  const totalDispatchesCount = allBatches.length
  const inTransitCount = allBatches.filter((b) => b.stage === 'In Transit').length
  const attentionCount = allBatches.filter(
    (b) => b.stalled || b.reconciliation.some((r) => r.status !== 'Matched'),
  ).length

  // Batch Detail active item & previous/next navigation
  const currentBatchNavList = useMemo(() => {
    if (selectedEventModal) {
      return selectedEventModal.batches.map((b) => ({ eventId: selectedEventModal.eventId, batch: b }))
    }
    return summaries.flatMap((s) => s.batches.map((b) => ({ eventId: s.eventId, batch: b })))
  }, [selectedEventModal, summaries])

  const activeBatchIndex = useMemo(() => {
    if (!activeBatchDetail) return -1
    return currentBatchNavList.findIndex(
      (entry) =>
        entry.eventId === activeBatchDetail.eventId && entry.batch.id === activeBatchDetail.batchId,
    )
  }, [activeBatchDetail, currentBatchNavList])

  const activeBatchEntry = activeBatchIndex >= 0 ? currentBatchNavList[activeBatchIndex] : null
  const activeBatch = activeBatchEntry ? activeBatchEntry.batch : null

  // Open Batch Detail handler
  const openBatchDetail = (eventId: string, batchId: string) => {
    const summary = summaries.find((s) => s.eventId === eventId)
    const batch = summary?.batches.find((b) => b.id === batchId)
    if (batch) {
      setEditVehicle(batch.vehicleType)
      setEditPlate(batch.plateNumber)
      setEditDriver(batch.driverName || '')
      setIsEditingVehicleInfo(false)
    }
    setActiveBatchDetail({ eventId, batchId })
  }

  // Next / Previous batch navigation
  const handleNextBatch = () => {
    if (activeBatchIndex < currentBatchNavList.length - 1) {
      const nextEntry = currentBatchNavList[activeBatchIndex + 1]
      openBatchDetail(nextEntry.eventId, nextEntry.batch.id)
    }
  }

  const handlePrevBatch = () => {
    if (activeBatchIndex > 0) {
      const prevEntry = currentBatchNavList[activeBatchIndex - 1]
      openBatchDetail(prevEntry.eventId, prevEntry.batch.id)
    }
  }

  // Advance stage for active batch
  const handleAdvanceStage = () => {
    if (!activeBatchEntry) return
    advanceBatchStage(activeBatchEntry.eventId, activeBatchEntry.batch.id)
  }

  // Save vehicle info
  const handleSaveVehicleInfo = () => {
    if (!activeBatchEntry) return
    updateBatchInfo(activeBatchEntry.eventId, activeBatchEntry.batch.id, {
      vehicleType: editVehicle,
      plateNumber: editPlate,
      driverName: editDriver,
    })
    setIsEditingVehicleInfo(false)
  }

  // Export handlers
  const exportConsolidatedManifest = () => {
    exportDispatchConsolidatedPdf(summaries)
  }

  const exportEventManifest = (summary: EventDispatchSummary) => {
    exportDispatchEventPdf(summary)
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-6 border-b border-border/80 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Dispatch &amp; Logistics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dispatch manifests, vehicle assignments, and transit checkpoints.
          </p>
        </div>

        {/* Tab Selection & Top Action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-xl border border-border/80 bg-card p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('event-grouped')}
              className={cn(
                'rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition',
                activeTab === 'event-grouped'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Event-Grouped
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dispatch-overview')}
              className={cn(
                'rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition',
                activeTab === 'dispatch-overview'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Dispatch Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed-events')}
              className={cn(
                'rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition',
                activeTab === 'completed-events'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Completed Events
            </button>
          </div>

          {activeTab === 'dispatch-overview' && (
            <button
              type="button"
              onClick={exportConsolidatedManifest}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wider text-card-foreground shadow-2xs transition hover:bg-accent hover:border-primary/40"
            >
              <Download className="size-3.5" />
              Export All (PDF)
            </button>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-sm shadow-2xs">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, vehicles, batch IDs..."
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-9.5 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground">
              <SlidersHorizontal className="size-4" />
            </span>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-medium text-foreground outline-none hover:bg-accent"
            >
              <option value="all">All stages</option>
              <option value="Planned">Planned</option>
              <option value="Loaded">Loaded</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
            </select>

            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-medium text-foreground outline-none hover:bg-accent"
            >
              <option value="all">All directions</option>
              <option value="outbound">Outbound</option>
              <option value="return">Return</option>
            </select>

            <select
              value={reconciliationFilter}
              onChange={(e) => setReconciliationFilter(e.target.value)}
              className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-medium text-foreground outline-none hover:bg-accent"
            >
              <option value="all">All reconciliation</option>
              <option value="Matched">Matched</option>
              <option value="Pahabol">Pahabol (Additional)</option>
              <option value="Short">Short (Missing)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="py-6 flex-1">
        {/* TAB 1: EVENT-GROUPED (Image 2) */}
        {activeTab === 'event-grouped' && (
          <div className="flex flex-col gap-4">
            {filteredSummaries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                No active events matching your search or filters.
              </div>
            ) : (
              filteredSummaries.map((summary) => {
                const outboundCount = summary.batches.filter((b) => b.direction === 'outbound').length
                const returnCount = summary.batches.filter((b) => b.direction === 'return').length
                const hasAttention =
                  summary.hasStalled ||
                  summary.hasPahabol ||
                  summary.batches.some((b) => b.reconciliation.some((r) => r.status !== 'Matched'))

                return (
                  <div
                    key={summary.eventId}
                    onClick={() => {
                      setSelectedEventModalId(summary.eventId)
                      setEventModalSubTab('overview')
                    }}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs transition-all duration-150 hover:border-primary/60 hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-serif text-lg sm:text-xl font-medium text-card-foreground group-hover:text-primary transition-colors">
                          {summary.eventTitle}
                        </h2>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
                          {summary.venue}
                        </p>
                      </div>

                      {hasAttention && (
                        <span className="flex size-7 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-900/40 shrink-0">
                          <AlertTriangle className="size-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4">
                      <div className="flex flex-wrap items-center gap-4 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-card-foreground">
                          <Truck className="size-3.5 text-muted-foreground" />
                          {summary.batches.length} BATCHES
                        </span>
                        <span>{outboundCount} OUTBOUND</span>
                        <span>{returnCount} RETURN</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 sm:w-32 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#8C6B4B] dark:bg-amber-600 transition-all duration-300"
                            style={{ width: `${summary.handshakePercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground min-w-8 text-right">
                          {summary.handshakePercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* TAB 2: DISPATCH OVERVIEW (Image 3) */}
        {activeTab === 'dispatch-overview' && (
          <div className="space-y-6">
            {/* 3 Metric Column Strip */}
            <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-y-0 sm:divide-x divide-border/80 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
              <div className="px-4 py-2">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Dispatch Overview
                </span>
                <div className="mt-1 font-serif text-2xl font-medium text-foreground">
                  {totalDispatchesCount} dispatches
                </div>
              </div>
              <div className="px-4 py-2">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  In Transit
                </span>
                <div className="mt-1 font-serif text-2xl font-medium text-foreground">
                  {inTransitCount}
                </div>
              </div>
              <div className="px-4 py-2">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Attention
                </span>
                <div className="mt-1 font-serif text-2xl font-medium text-rose-600 dark:text-rose-400">
                  {attentionCount}
                </div>
              </div>
            </div>

            {/* Sectioned Table */}
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/20 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="px-5 py-3.5">Event</th>
                    <th className="px-5 py-3.5">Vehicle</th>
                    <th className="px-5 py-3.5">Direction</th>
                    <th className="px-5 py-3.5">Crew</th>
                    <th className="px-5 py-3.5">Dispatch Status</th>
                    <th className="px-5 py-3.5">Reconciliation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSummaries.map((group) => (
                    <Fragment key={group.eventId}>
                      <tr className="bg-muted/30 border-y border-border/80">
                        <td colSpan={6} className="px-5 py-3">
                          <span className="font-serif text-sm font-medium text-foreground">{group.eventTitle}</span>
                          <span className="text-[0.65rem] text-muted-foreground font-sans uppercase tracking-wider ml-2">
                            · {group.venue}
                          </span>
                        </td>
                      </tr>
                      {group.batches.map((batch) => (
                        <tr
                          key={batch.id}
                          onClick={() => openBatchDetail(group.eventId, batch.id)}
                          className="hover:bg-accent/40 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5 font-medium text-muted-foreground">Dispatch batch</td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-foreground">{batch.vehicleType}</div>
                            <div className="text-[0.65rem] font-mono text-muted-foreground uppercase">{batch.plateNumber}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                              {batch.direction === 'outbound' ? '↑ Outbound' : '↓ Return'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {batch.crew && batch.crew.length > 0 ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary">
                                {batch.crew.map((c) => (typeof c === 'string' ? c : c.name)).join(', ')}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[0.65rem] font-medium text-amber-800 dark:text-amber-300">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <DispatchStatusPipeline stage={batch.stage} direction={batch.direction} />
                          </td>
                          <td className="px-5 py-3.5">
                            <ReconciliationBadge rows={batch.reconciliation} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: COMPLETED EVENTS */}
        {activeTab === 'completed-events' && (
          <div className="flex flex-col gap-4">
            {filteredSummaries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                No completed event dispatches found.
              </div>
            ) : (
              filteredSummaries.map((summary) => (
                <div
                  key={summary.eventId}
                  onClick={() => {
                    setSelectedEventModalId(summary.eventId)
                    setEventModalSubTab('overview')
                  }}
                  className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:border-primary/50 cursor-pointer"
                >
                  <div>
                    <h2 className="font-serif text-lg font-medium text-card-foreground group-hover:text-primary">
                      {summary.eventTitle}
                    </h2>
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                      {summary.venue} · {summary.targetDate}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    Completed (100%)
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── LEVEL 2: EVENT DETAIL MODAL (Image 4) ─── */}
      {selectedEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEventModalId(null)}
        >
          <div
            className="flex h-full max-h-[46rem] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/80 px-6 py-5 shrink-0">
              <div>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Event Detail
                </span>
                <h2 className="font-serif text-2xl font-medium text-card-foreground mt-0.5">
                  {selectedEventModal.eventTitle}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedEventModal.venue}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventModalId(null)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 4 Mini KPI Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border/80 bg-background p-4">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">Planned</span>
                  <div className="mt-1 font-serif text-2xl font-medium text-foreground">
                    {selectedEventModal.batches.filter((b) => b.stage === 'Planned').length}
                  </div>
                </div>
                <div className="rounded-xl border border-border/80 bg-background p-4">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">Loaded</span>
                  <div className="mt-1 font-serif text-2xl font-medium text-foreground">
                    {selectedEventModal.batches.filter((b) => b.stage === 'Loaded').length}
                  </div>
                </div>
                <div className="rounded-xl border border-border/80 bg-background p-4">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">In Transit</span>
                  <div className="mt-1 font-serif text-2xl font-medium text-foreground">
                    {selectedEventModal.batches.filter((b) => b.stage === 'In Transit').length}
                  </div>
                </div>
                <div className="rounded-xl border border-border/80 bg-background p-4">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">Delivered</span>
                  <div className="mt-1 font-serif text-2xl font-medium text-foreground">
                    {selectedEventModal.batches.filter((b) => b.stage === 'Delivered' || b.stage === 'Returned').length}
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: OVERVIEW | ITEMS | REQUESTS */}
              <div className="border-b border-border flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setEventModalSubTab('overview')}
                  className={cn(
                    'pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2',
                    eventModalSubTab === 'overview'
                      ? 'border-[#8C6B4B] text-[#8C6B4B] dark:border-amber-400 dark:text-amber-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setEventModalSubTab('items')}
                  className={cn(
                    'pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2',
                    eventModalSubTab === 'items'
                      ? 'border-[#8C6B4B] text-[#8C6B4B] dark:border-amber-400 dark:text-amber-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  Items
                </button>
                <button
                  type="button"
                  onClick={() => setEventModalSubTab('requests')}
                  className={cn(
                    'pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2',
                    eventModalSubTab === 'requests'
                      ? 'border-[#8C6B4B] text-[#8C6B4B] dark:border-amber-400 dark:text-amber-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  Requests
                </button>
              </div>

              {/* Sub-tab 1: OVERVIEW */}
              {eventModalSubTab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      Handshake rate <strong className="text-foreground">{selectedEventModal.handshakePercent}%</strong> across{' '}
                      {selectedEventModal.batches.length} batches.
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => exportEventManifest(selectedEventModal)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-accent"
                      >
                        <Download className="size-3.5" />
                        Export Manifest (PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const event = events.find((e) => e.id === selectedEventModal.eventId)
                          if (event && selectedEventModal.batches[0]) {
                            advanceBatchStage(selectedEventModal.eventId, selectedEventModal.batches[0].id)
                          }
                        }}
                        className="rounded-xl bg-[#8C6B4B] hover:bg-[#78593c] text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider shadow-xs"
                      >
                        + New Outbound Batch
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // new return batch trigger
                        }}
                        className="rounded-xl border border-border bg-background hover:bg-accent px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider"
                      >
                        + New Return Batch
                      </button>
                    </div>
                  </div>

                  {/* Batch Cards List */}
                  <div className="space-y-3">
                    {selectedEventModal.batches.map((batch) => (
                      <div
                        key={batch.id}
                        onClick={() => openBatchDetail(selectedEventModal.eventId, batch.id)}
                        className="group flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-4 transition-all hover:border-primary/50 hover:shadow-2xs cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              {batch.direction === 'outbound' ? (
                                <ArrowUp className="size-4" />
                              ) : (
                                <ArrowDown className="size-4" />
                              )}
                            </span>
                            <div>
                              <h4 className="font-serif text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {batch.vehicleType}
                              </h4>
                              <p className="text-[0.62rem] font-mono text-muted-foreground uppercase">
                                {batch.plateNumber} · Driver: {batch.driverName || 'Unassigned'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                exportBatchPdf(
                                  {
                                    eventTitle: selectedEventModal.eventTitle,
                                    venue: selectedEventModal.venue,
                                    targetDate: selectedEventModal.targetDate,
                                  },
                                  batch,
                                )
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[0.62rem] font-bold uppercase text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <Download className="size-3" /> PDF
                            </button>
                            <DispatchStatusPipeline stage={batch.stage} direction={batch.direction} />
                          </div>
                        </div>

                        {batch.reconciliation && batch.reconciliation.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5 text-xs">
                            <span className="text-[0.62rem] font-bold uppercase text-muted-foreground">
                              Contained Assets ({batch.reconciliation.length}):
                            </span>
                            {batch.reconciliation.map((item) => (
                              <span
                                key={item.id}
                                className="rounded-md bg-muted/60 px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                              >
                                {item.itemName} <strong className="text-foreground">({item.planned})</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-tab 2: ITEMS */}
              {eventModalSubTab === 'items' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-[0.62rem] font-bold uppercase text-muted-foreground">
                          <th className="pb-2.5">Item Name</th>
                          <th className="pb-2.5">Planned</th>
                          <th className="pb-2.5">Actual</th>
                          <th className="pb-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {selectedEventModal.batches.flatMap((b) => b.reconciliation).map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 font-medium">{item.itemName}</td>
                            <td className="py-2.5">{item.planned}</td>
                            <td className="py-2.5">{item.actual}</td>
                            <td className="py-2.5">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase',
                                  item.status === 'Matched'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : item.status === 'Pahabol'
                                      ? 'bg-rose-500/10 text-rose-600'
                                      : 'bg-amber-500/10 text-amber-600',
                                )}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: REQUESTS */}
              {eventModalSubTab === 'requests' && (
                <div className="rounded-xl border border-dashed border-border bg-background p-12 text-center text-xs text-muted-foreground">
                  No pending field requests or escalations for this event.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── LEVEL 3: BATCH DETAIL MODAL (Image 5) ─── */}
      {activeBatch && activeBatchEntry && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveBatchDetail(null)}
        >
          <div
            className="flex h-full max-h-[46rem] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/80 px-6 py-5 shrink-0">
              <div>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Batch Detail
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {activeBatch.direction === 'outbound' ? (
                      <ArrowUp className="size-3.5" />
                    ) : (
                      <ArrowDown className="size-3.5" />
                    )}
                  </span>
                  <h2 className="font-serif text-2xl font-medium text-card-foreground">
                    {activeBatch.vehicleType}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  {activeBatch.plateNumber} · {activeBatch.direction.toUpperCase()} /{' '}
                  {activeBatch.direction === 'outbound' ? 'EGRESS' : 'INGRESS'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const evt = summaries.find((s) => s.eventId === activeBatchEntry.eventId)
                    if (evt) {
                      exportBatchPdf(
                        { eventTitle: evt.eventTitle, venue: evt.venue, targetDate: evt.targetDate },
                        activeBatch,
                      )
                    }
                  }}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-accent"
                >
                  Export Manifest (PDF)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDeleteModal({
                      eventId: activeBatchEntry.eventId,
                      batchId: activeBatch.id,
                    })
                  }
                  className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                >
                  Cancel / Delete Batch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBatchDetail(null)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Vehicle & Driver Assignment */}
              <div className="rounded-xl border border-border/80 bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Vehicle &amp; Driver Assignment
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingVehicleInfo) {
                        handleSaveVehicleInfo()
                      } else {
                        setIsEditingVehicleInfo(true)
                      }
                    }}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-foreground hover:bg-accent"
                  >
                    {isEditingVehicleInfo ? 'Save Changes' : 'Edit Vehicle & Driver'}
                  </button>
                </div>

                {isEditingVehicleInfo ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Vehicle</span>
                      <input
                        type="text"
                        value={editVehicle}
                        onChange={(e) => setEditVehicle(e.target.value)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Plate #</span>
                      <input
                        type="text"
                        value={editPlate}
                        onChange={(e) => setEditPlate(e.target.value)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Driver</span>
                      <input
                        type="text"
                        value={editDriver}
                        onChange={(e) => setEditDriver(e.target.value)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-[0.58rem] font-bold uppercase text-muted-foreground block">Vehicle</span>
                      <strong className="text-xs text-foreground font-medium">{activeBatch.vehicleType}</strong>
                    </div>
                    <div>
                      <span className="text-[0.58rem] font-bold uppercase text-muted-foreground block">Plate #</span>
                      <strong className="text-xs text-foreground font-mono">{activeBatch.plateNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[0.58rem] font-bold uppercase text-muted-foreground block">Driver</span>
                      <strong className="text-xs text-foreground font-medium">{activeBatch.driverName || 'Unassigned'}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Dispatch Stage */}
              <div className="rounded-xl border border-border/80 bg-background p-4 space-y-3">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground block">
                  Dispatch Stage
                </span>
                <div className="pt-1">
                  <DispatchStatusPipeline
                    stage={activeBatch.stage}
                    direction={activeBatch.direction}
                    onSelectStage={(_targetStage) => {
                      advanceBatchStage(activeBatchEntry.eventId, activeBatch.id)
                    }}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setReportBreakdownModal({
                        eventId: activeBatchEntry.eventId,
                        batchId: activeBatch.id,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#8C6B4B]/80 hover:bg-[#8C6B4B] text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider shadow-xs"
                  >
                    <AlertTriangle className="size-3.5" />
                    Interrupt / Report Breakdown
                  </button>
                </div>
              </div>

              {/* Section 3: Field Lead Handoff */}
              <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
                <label className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground block">
                  Field Lead Handoff *
                </label>
                <textarea
                  rows={4}
                  value={activeBatch.handoffNote}
                  onChange={(e) =>
                    updateBatchHandoffNote(activeBatchEntry.eventId, activeBatch.id, e.target.value)
                  }
                  placeholder="Describe where damaged items are placed..."
                  className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Footer Navigation & Stage Action */}
            <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-card shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeBatchIndex <= 0}
                  onClick={handlePrevBatch}
                  className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-accent"
                >
                  &lt; Previous Batch
                </button>
                <button
                  type="button"
                  disabled={activeBatchIndex >= currentBatchNavList.length - 1}
                  onClick={handleNextBatch}
                  className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-accent"
                >
                  Next Batch &gt;
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdvanceStage}
                className="rounded-xl bg-[#8C6B4B] hover:bg-[#78593c] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider shadow-xs"
              >
                Mark as {nextStage(activeBatch.direction, activeBatch.stage)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl space-y-4 border border-border">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-card-foreground">Delete this batch?</h3>
                <p className="text-xs text-muted-foreground">
                  This will archive the batch and return allocated assets to available status.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold uppercase hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBatch(confirmDeleteModal.eventId, confirmDeleteModal.batchId, 'Deleted by manager', {
                    id: 'wom-1',
                    name: adminName || 'Warehouse Operations Manager',
                  })
                  setConfirmDeleteModal(null)
                  setActiveBatchDetail(null)
                }}
                className="rounded-xl bg-rose-600 text-white px-3.5 py-1.5 text-xs font-bold uppercase shadow-sm hover:bg-rose-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown / Interruption Modal */}
      {reportBreakdownModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl space-y-4 border border-border">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-card-foreground">Report Transit Interruption</h3>
                <p className="text-xs text-muted-foreground">
                  Document any vehicle breakdown, traffic stall, or transit delay.
                </p>
              </div>
            </div>
            <textarea
              rows={3}
              value={breakdownReason}
              onChange={(e) => setBreakdownReason(e.target.value)}
              placeholder="Enter breakdown / delay reason..."
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setReportBreakdownModal(null)}
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold uppercase hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  markBatchStalled(
                    reportBreakdownModal.eventId,
                    reportBreakdownModal.batchId,
                    breakdownReason || 'Vehicle breakdown / delay',
                  )
                  setReportBreakdownModal(null)
                }}
                className="rounded-xl bg-amber-600 text-white px-3.5 py-1.5 text-xs font-bold uppercase shadow-sm hover:bg-amber-700"
              >
                Flag Delay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DispatchModule
