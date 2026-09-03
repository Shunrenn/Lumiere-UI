import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, Download, Truck, User, X } from 'lucide-react'
import { usePortal } from '@/lib/store'
import {
  addNewCustomBatch,
  advanceBatchStage,
  buildConsolidatedManifestCsv,
  buildManifestCsv,
  createReturnBatchFromDelivered,
  deleteBatch,
  downloadCsv,
  exportBatchPdf,
  getEventDispatchSummaries,
  markBatchStalled,
  resolveBatchStall,
  updateBatchHandoffNote,
  updateBatchInfo,
  updateReconciliationRow,
  useDispatchStore,
  type BatchDirection,
  type DispatchBatch,
  type EventDispatchSummary,
} from '@/lib/warehouse-dispatch'
import { getEventDetailSnapshot } from '@/lib/event-detail'
import { DispatchStepper } from '@/components/warehouse/event-detail/DispatchStepper'
import { BatchDetailView } from '@/components/warehouse/event-detail/BatchDetailView'
import { Pill } from '@/components/warehouse/shared/Pill'
import { cn } from '@/lib/utils'

type ViewMode = 'grouped' | 'consolidated'

interface DispatchModuleProps {
  onClose: () => void
}

// A flattened, navigable batch reference — used so Level 3 (batch detail)
// can page Previous/Next across whichever list it was opened from, be that
// a single event's batches (Event-Grouped) or every batch fleet-wide
// (Consolidated).
interface NavigableBatch {
  eventId: string
  eventTitle: string
  batch: DispatchBatch
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      title={name}
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.58rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border"
    >
      {initials}
    </span>
  )
}

export function DispatchModule({ onClose }: DispatchModuleProps) {
  const { events, staff, procurement } = usePortal()
  // The store snapshot has to be part of the memo key — without it a stage
  // advance or a newly staged batch mutates the store but never re-derives
  // the summaries the UI renders from.
  const batchStore = useDispatchStore(events, staff, procurement)
  const summaries = useMemo(
    () => getEventDispatchSummaries(events, staff, procurement),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, staff, procurement, batchStore],
  )

  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [activeBatchIndex, setActiveBatchIndex] = useState<number | null>(null)
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null)
  const [newBatchModal, setNewBatchModal] = useState<{ eventId: string; direction: BatchDirection } | null>(null)

  const selectedEvent = summaries.find((s) => s.eventId === selectedEventId) ?? null

  // The list currently being navigated in the Level 3 overlay.
  const navList: NavigableBatch[] = useMemo(() => {
    if (viewMode === 'consolidated') {
      return summaries.flatMap((summary) =>
        summary.batches.map((batch) => ({ eventId: summary.eventId, eventTitle: summary.eventTitle, batch })),
      )
    }
    if (selectedEvent) {
      return selectedEvent.batches.map((batch) => ({
        eventId: selectedEvent.eventId,
        eventTitle: selectedEvent.eventTitle,
        batch,
      }))
    }
    return []
  }, [viewMode, summaries, selectedEvent])

  const activeNav = activeBatchIndex !== null ? navList[activeBatchIndex] : undefined

  const openBatch = (eventId: string, batchId: string) => {
    const list =
      viewMode === 'consolidated'
        ? summaries.flatMap((summary) =>
            summary.batches.map((batch) => ({ eventId: summary.eventId, eventTitle: summary.eventTitle, batch })),
          )
        : (summaries.find((s) => s.eventId === eventId)?.batches ?? []).map((batch) => ({
            eventId,
            eventTitle: summaries.find((s) => s.eventId === eventId)?.eventTitle ?? '',
            batch,
          }))
    const index = list.findIndex((entry) => entry.batch.id === batchId)
    setActiveBatchIndex(index === -1 ? null : index)
  }


  useEffect(() => {
    if (!pendingBatchId) return
    const index = navList.findIndex((entry) => entry.batch.id === pendingBatchId)
    if (index === -1) return
    setActiveBatchIndex(index)
    setPendingBatchId(null)
  }, [pendingBatchId, navList])

  const exportEventManifest = (summary: EventDispatchSummary) => {
    downloadCsv(`dispatch-manifest-${summary.eventTitle.toLowerCase().replace(/\s+/g, '-')}.csv`, buildManifestCsv(summary))
  }

  const exportConsolidatedManifest = () => {
    downloadCsv('dispatch-manifest-consolidated.csv', buildConsolidatedManifestCsv(summaries))
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Dispatch &amp; Logistics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dispatch manifests, vehicle assignments, and transit checkpoints.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and return to dashboard"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => {
                setViewMode('grouped')
              }}
              aria-pressed={viewMode === 'grouped'}
              className={cn(
                'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                viewMode === 'grouped' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              Event-Grouped
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('consolidated')
                setSelectedEventId(null)
              }}
              aria-pressed={viewMode === 'consolidated'}
              className={cn(
                'rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                viewMode === 'consolidated' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              Consolidated
            </button>
          </div>

          {viewMode === 'consolidated' && (
            <button
              type="button"
              onClick={exportConsolidatedManifest}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-accent"
            >
              <Download className="size-3.5" />
              Export Manifest
            </button>
          )}
        </div>

        {viewMode === 'grouped' && selectedEvent && (
          <div className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <button type="button" onClick={() => setSelectedEventId(null)} className="text-primary hover:underline">
              All Events
            </button>
            <ChevronRight className="size-3" />
            <span className="text-card-foreground">{selectedEvent.eventTitle}</span>
          </div>
        )}
      </div>

      <div className="flex-1 px-6 py-6 sm:px-10">
        {viewMode === 'consolidated' ? (
          <ConsolidatedBatchTable summaries={summaries} onOpenBatch={openBatch} />
        ) : selectedEvent ? (
          <EventBatchLevel
            summary={selectedEvent}
            onNewBatch={(direction) => setNewBatchModal({ eventId: selectedEvent.eventId, direction })}
            onOpenBatch={(batchId) => openBatch(selectedEvent.eventId, batchId)}
            onExportManifest={() => exportEventManifest(selectedEvent)}
          />
        ) : (
          <EventCardGrid summaries={summaries} onOpenEvent={setSelectedEventId} />
        )}
      </div>

      {activeNav && (
        <BatchDetailView
          batch={activeNav.batch}
          hasPrevious={activeBatchIndex !== null && activeBatchIndex > 0}
          hasNext={activeBatchIndex !== null && activeBatchIndex < navList.length - 1}
          onPrevious={() => setActiveBatchIndex((i) => (i !== null ? Math.max(0, i - 1) : i))}
          onNext={() => setActiveBatchIndex((i) => (i !== null ? Math.min(navList.length - 1, i + 1) : i))}
          onClose={() => setActiveBatchIndex(null)}
          onJustificationChange={(rowId, value) =>
            updateReconciliationRow(activeNav.eventId, activeNav.batch.id, rowId, { justification: value })
          }
          onHandoffNoteChange={(value) =>
            updateBatchHandoffNote(activeNav.eventId, activeNav.batch.id, value)
          }
          onAdvanceStage={() => advanceBatchStage(activeNav.eventId, activeNav.batch.id)}
          onStall={(reason) => markBatchStalled(activeNav.eventId, activeNav.batch.id, reason)}
          onResume={() => resolveBatchStall(activeNav.eventId, activeNav.batch.id)}
          onUpdateInfo={(info) => updateBatchInfo(activeNav.eventId, activeNav.batch.id, info)}
          onExportPdf={() => {
            const ev = events.find((e) => e.id === activeNav.eventId)
            exportBatchPdf({ eventTitle: activeNav.eventTitle, venue: ev?.venue || '', targetDate: ev?.targetDate || '' }, activeNav.batch)
          }}
          onCreateReturnBatch={() => createReturnBatchFromDelivered(activeNav.eventId, activeNav.batch)}
          onDelete={() => {
            deleteBatch(activeNav.eventId, activeNav.batch.id)
            setActiveBatchIndex(null)
          }}
        />
      )}

      {newBatchModal && (
        <NewBatchModal
          eventId={newBatchModal.eventId}
          direction={newBatchModal.direction}
          onClose={() => setNewBatchModal(null)}
        />
      )}
    </div>
  )
}

function EventCardGrid({
  summaries,
  onOpenEvent,
}: {
  summaries: EventDispatchSummary[]
  onOpenEvent: (eventId: string) => void
}) {
  if (summaries.length === 0) {
    return <p className="text-sm text-muted-foreground">No events on the registry yet.</p>
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {summaries.map((summary) => (
        <button
          key={summary.eventId}
          type="button"
          onClick={() => onOpenEvent(summary.eventId)}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left transition hover:border-primary/50 hover:bg-accent"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-serif text-base font-medium text-card-foreground">{summary.eventTitle}</p>
              <p className="truncate text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">{summary.venue}</p>
            </div>
            {summary.hasStalled && (
              <span
                title="A batch is stalled in transit"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-background"
              >
                <AlertTriangle className="size-3.5" />
              </span>
            )}
            {summary.hasPahabol && (
              <span
                title="Pahabol items flagged"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"
              >
                <AlertTriangle className="size-3.5" />
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <Truck className="size-3.5" />
              {summary.batches.length} batch{summary.batches.length === 1 ? '' : 'es'}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', summary.handshakePercent >= 90 ? 'bg-primary' : summary.handshakePercent >= 60 ? 'bg-accent-foreground/60' : 'bg-destructive')}
                  style={{ width: `${summary.handshakePercent}%` }}
                />
              </div>
              <span className="text-[0.6rem] font-bold text-card-foreground">{summary.handshakePercent}%</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function EventBatchLevel({
  summary,
  onNewBatch,
  onOpenBatch,
  onExportManifest,
}: {
  summary: EventDispatchSummary
  onNewBatch: (direction: BatchDirection) => void
  onOpenBatch: (batchId: string) => void
  onExportManifest: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Handshake rate <span className="font-semibold text-card-foreground">{summary.handshakePercent}%</span> across{' '}
          {summary.batches.length} batch{summary.batches.length === 1 ? '' : 'es'}.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportManifest}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-3.5 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-accent"
          >
            <Download className="size-3.5" />
            Export Manifest
          </button>
          <button
            type="button"
            onClick={() => onNewBatch('outbound')}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3.5 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
          >
            + New Outbound Batch
          </button>
          <button
            type="button"
            onClick={() => onNewBatch('return')}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background px-3.5 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-accent"
          >
            + New Return Batch
          </button>
        </div>
      </div>

      {summary.batches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          No dispatch batches created for this event yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.batches.map((batch) => (
            <li key={batch.id} className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
              <div
                onClick={() => onOpenBatch(batch.id)}
                className="flex w-full flex-wrap items-center gap-4 cursor-pointer hover:opacity-95"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                  aria-label={batch.direction === 'outbound' ? 'Outbound / egress' : 'Return / ingress'}
                >
                  {batch.direction === 'outbound' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                </span>
                <div className="min-w-0 shrink-0">
                  <p className="truncate text-sm font-bold text-card-foreground">{batch.vehicleType}</p>
                  <p className="truncate text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">
                    {batch.plateNumber} · Driver: <span className="font-semibold text-foreground">{batch.driverName || 'Unassigned'}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {batch.crew.length === 0 ? (
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="size-3.5" />
                    </span>
                  ) : (
                    batch.crew.slice(0, 3).map((member) => <Avatar key={member.id} name={member.name} />)
                  )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      exportBatchPdf({ eventTitle: summary.eventTitle, venue: summary.venue, targetDate: summary.targetDate }, batch)
                    }}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wider text-card-foreground hover:bg-accent"
                  >
                    <Download className="size-3" />
                    PDF
                  </button>

                  {batch.direction === 'outbound' && batch.stage === 'Delivered' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        createReturnBatchFromDelivered(summary.eventId, batch)
                      }}
                      className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wider text-white hover:bg-emerald-700"
                    >
                      + Return Batch
                    </button>
                  )}

                  <DispatchStepper direction={batch.direction} stage={batch.stage} stalled={batch.stalled} />
                </div>
              </div>

              {/* Contained Assets Summary Row */}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
                <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Contained Assets ({batch.reconciliation.length}):
                </span>
                {batch.reconciliation.length === 0 ? (
                  <span className="text-[0.62rem] text-muted-foreground">No assets staged yet.</span>
                ) : (
                  batch.reconciliation.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[0.62rem] font-medium text-foreground"
                    >
                      <span>{item.itemName}</span>
                      <span className="font-bold text-primary">({item.planned})</span>
                    </span>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ConsolidatedBatchTable({
  summaries,
  onOpenBatch,
}: {
  summaries: EventDispatchSummary[]
  onOpenBatch: (eventId: string, batchId: string) => void
}) {
  const rows = summaries.flatMap((summary) => summary.batches.map((batch) => ({ summary, batch })))

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No dispatch batches across any event yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['Event', 'Vehicle', 'Direction', 'Crew', 'Stage', 'Reconciliation'].map((h) => (
              <th key={h} className="px-5 py-3.5 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ summary, batch }) => {
            const hasPahabol = batch.reconciliation.some((row) => row.status === 'Pahabol')
            const hasShort = batch.reconciliation.some((row) => row.status === 'Short')
            return (
              <tr
                key={batch.id}
                onClick={() => onOpenBatch(summary.eventId, batch.id)}
                className="cursor-pointer border-t border-border/60 align-middle transition hover:bg-muted/40"
              >
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-card-foreground">{summary.eventTitle}</p>
                  <p className="text-[0.6rem] uppercase tracking-[0.06em] text-muted-foreground">{summary.venue}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-xs text-card-foreground">{batch.vehicleType}</p>
                  <p className="text-[0.6rem] uppercase tracking-[0.06em] text-muted-foreground">{batch.plateNumber}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-card-foreground">
                    {batch.direction === 'outbound' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                    {batch.direction === 'outbound' ? 'Outbound' : 'Return'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {batch.crew.length === 0 ? (
                      <span className="text-[0.6rem] text-muted-foreground/60">Unassigned</span>
                    ) : (
                      batch.crew.slice(0, 3).map((member) => <Avatar key={member.id} name={member.name} />)
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <DispatchStepper direction={batch.direction} stage={batch.stage} stalled={batch.stalled} />
                </td>
                <td className="px-5 py-3.5">
                  {hasPahabol ? (
                    <Pill tone="critical">Pahabol</Pill>
                  ) : hasShort ? (
                    <Pill tone="caution">Short</Pill>
                  ) : (
                    <Pill tone="positive">Matched</Pill>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function NewBatchModal({
  eventId,
  direction,
  onClose,
}: {
  eventId: string
  direction: BatchDirection
  onClose: () => void
}) {
  const { events, staff, procurement } = usePortal()
  const event = events.find((e) => e.id === eventId)
  const batchStore = useDispatchStore(events, staff, procurement)
  const existingBatches = batchStore.get(eventId) ?? []

  const [vehicleType, setVehicleType] = useState('Box Truck (14ft)')
  const [plateNumber, setPlateNumber] = useState('NBC 1234')
  const [driverName, setDriverName] = useState('')

  // Event Master Inventory Items
  const masterItems = useMemo(() => {
    if (!event) return []
    return getEventDetailSnapshot(event, staff, procurement).items
  }, [event, staff, procurement])

  // Deduplication: Calculate open/committed quantities across active outbound batches for this event
  const itemAvailabilityMap = useMemo(() => {
    const map = new Map<string, number>()
    masterItems.forEach((item) => map.set(item.name, item.quantity))

    if (direction === 'outbound') {
      const openOutboundBatches = existingBatches.filter(
        (b) => b.direction === 'outbound' && b.stage !== 'Delivered' && b.stage !== 'Returned',
      )
      openOutboundBatches.forEach((b) => {
        b.reconciliation.forEach((r) => {
          const current = map.get(r.itemName) ?? 0
          map.set(r.itemName, Math.max(0, current - r.planned))
        })
      })
    }
    return map
  }, [masterItems, existingBatches, direction])

  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})

  const toggleItem = (name: string, available: number) => {
    setSelectedQuantities((prev) => {
      const next = { ...prev }
      if (next[name] !== undefined) {
        delete next[name]
      } else {
        next[name] = Math.min(available, Math.max(1, available))
      }
      return next
    })
  }

  const updateQuantity = (name: string, qty: number, available: number) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [name]: Math.min(available, Math.max(1, qty)),
    }))
  }

  const handleCreate = () => {
    const itemsToAssign = Object.entries(selectedQuantities).map(([itemName, planned]) => ({
      itemName,
      planned,
    }))

    addNewCustomBatch(eventId, direction, vehicleType, plateNumber, driverName, itemsToAssign)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[44rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">
              Dispatch &amp; Logistics
            </span>
            <h2 className="font-serif text-xl font-bold text-card-foreground">
              New {direction === 'outbound' ? 'Outbound (Egress)' : 'Return (Ingress)'} Batch
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Target Event: {event?.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Vehicle & Driver Info Form */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Vehicle Type</span>
              <input
                type="text"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="Vehicle type..."
                className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Plate Number</span>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="Plate number..."
                className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Driver Name</span>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Assigned driver..."
                className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>

          {/* Asset Selection with Active Open Batch Deduplication */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Select Event Assets to Allocate
              </h3>
              <span className="text-[0.6rem] text-muted-foreground">
                {Object.keys(selectedQuantities).length} assets selected
              </span>
            </div>

            <div className="rounded-lg border border-border bg-background p-3 space-y-2 max-h-56 overflow-y-auto">
              {masterItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No allocated master items found for this event.</p>
              ) : (
                masterItems.map((item) => {
                  const available = itemAvailabilityMap.get(item.name) ?? 0
                  const isSelected = selectedQuantities[item.name] !== undefined
                  const isFullyReserved = available <= 0

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between rounded-md border p-2.5 text-xs transition',
                        isFullyReserved
                          ? 'border-border bg-muted/40 opacity-60'
                          : isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card',
                      )}
                    >
                      <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isFullyReserved}
                          onChange={() => toggleItem(item.name, available)}
                          className="size-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.name}</p>
                          <p className="text-[0.6rem] text-muted-foreground">
                            Event Total: {item.quantity} · Available: <span className="font-bold text-primary">{available}</span>
                          </p>
                        </div>
                      </label>

                      {isFullyReserved ? (
                        <span className="rounded bg-muted px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground border border-border">
                          Reserved in Open Batch
                        </span>
                      ) : isSelected ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">Load Qty:</span>
                          <input
                            type="number"
                            min={1}
                            max={available}
                            value={selectedQuantities[item.name]}
                            onChange={(e) => updateQuantity(item.name, Number(e.target.value) || 1, available)}
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-xs text-foreground font-bold outline-none focus:border-primary"
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm hover:opacity-90"
          >
            Create Batch ({Object.keys(selectedQuantities).length} Assets)
          </button>
        </div>
      </div>
    </div>
  )
}
