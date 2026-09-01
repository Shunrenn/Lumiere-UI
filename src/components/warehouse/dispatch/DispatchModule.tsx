import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, Download, Truck, User, X } from 'lucide-react'
import { usePortal } from '@/lib/store'
import {
  addNewBatch,
  advanceBatchStage,
  buildConsolidatedManifestCsv,
  buildManifestCsv,
  downloadCsv,
  getEventDispatchSummaries,
  markBatchStalled,
  resolveBatchStall,
  updateBatchHandoffNote,
  updateReconciliationRow,
  useDispatchStore,
  type BatchDirection,
  type DispatchBatch,
  type EventDispatchSummary,
} from '@/lib/warehouse-dispatch'
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

  // Staging a batch opens its detail drawer as soon as the store re-derives,
  // so the action has an unmistakable result instead of appearing inert.
  const handleNewBatch = (eventId: string, direction: BatchDirection) => {
    const batch = addNewBatch(eventId, direction, procurement)
    setPendingBatchId(batch.id)
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
            onNewBatch={(direction) => handleNewBatch(selectedEvent.eventId, direction)}
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
        <ul className="flex flex-col gap-2.5">
          {summary.batches.map((batch) => (
            <li key={batch.id}>
              <button
                type="button"
                onClick={() => onOpenBatch(batch.id)}
                className="flex w-full flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3.5 text-left transition hover:bg-accent"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                  aria-label={batch.direction === 'outbound' ? 'Outbound / egress' : 'Return / ingress'}
                >
                  {batch.direction === 'outbound' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                </span>
                <div className="min-w-0 shrink-0">
                  <p className="truncate text-sm font-medium text-card-foreground">{batch.vehicleType}</p>
                  <p className="truncate text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">{batch.plateNumber}</p>
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
                <div className="ml-auto shrink-0">
                  <DispatchStepper direction={batch.direction} stage={batch.stage} stalled={batch.stalled} />
                </div>
              </button>
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
