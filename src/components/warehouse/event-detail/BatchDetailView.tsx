import { Fragment, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, User, X } from 'lucide-react'
import { nextStage, type DispatchBatch, type ReconciliationStatus } from '@/lib/event-detail'
import { DispatchStepper } from '@/components/warehouse/event-detail/DispatchStepper'
import { toneClasses, toneDot, type Tone } from '@/components/warehouse/event-detail/status-tone'
import { cn } from '@/lib/utils'

const RECONCILIATION_TONE: Record<ReconciliationStatus, Tone> = {
  Matched: 'positive',
  Short: 'caution',
  Pahabol: 'critical',
}

interface BatchDetailViewProps {
  batch: DispatchBatch
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  onClose: () => void
  onJustificationChange: (rowId: string, value: string) => void
  onHandoffNoteChange: (value: string) => void
  onAdvanceStage: () => void
  onStall?: (reason: string) => void
  onResume?: () => void
}

export function BatchDetailView({
  batch,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onClose,
  onJustificationChange,
  onHandoffNoteChange,
  onAdvanceStage,
  onStall,
  onResume,
}: BatchDetailViewProps) {
  const [handoffError, setHandoffError] = useState(false)
  const [stallModalOpen, setStallModalOpen] = useState(false)
  const [stallReason, setStallReason] = useState('')
  const finalStage = batch.direction === 'outbound' ? 'Delivered' : 'Returned'
  const isFinal = batch.stage === finalStage
  // The action advances exactly one checkpoint, so the label has to name the
  // *next* stage — labelling it with the final stage made a single click look
  // like it had failed to jump straight to Delivered.
  const upcomingStage = nextStage(batch.direction, batch.stage)
  const missingJustifications = batch.reconciliation.some(
    (row) => row.status === 'Pahabol' && row.justification.trim().length === 0,
  )

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Batch detail
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <span
                className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary"
                aria-hidden="true"
              >
                {batch.direction === 'outbound' ? (
                  <ArrowUp className="size-4" />
                ) : (
                  <ArrowDown className="size-4" />
                )}
              </span>
              <div>
                <h2 className="font-serif text-xl font-medium text-card-foreground">{batch.vehicleType}</h2>
                <p className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
                  {batch.plateNumber} · {batch.direction === 'outbound' ? 'Outbound / egress' : 'Return / ingress'}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close batch detail"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Dispatch stage
              </p>
              {!batch.stalled && !isFinal && (
                <button
                  type="button"
                  onClick={() => setStallModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50/80 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.06em] text-amber-900 transition hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                  Interrupt / Report Breakdown
                </button>
              )}
            </div>
            <DispatchStepper direction={batch.direction} stage={batch.stage} stalled={batch.stalled} />
          </div>

          {batch.stalled && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-4 dark:border-amber-700/60 dark:bg-amber-950/40" role="alert">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-white dark:bg-amber-600">
                    <AlertTriangle className="size-3" />
                  </span>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-amber-900 dark:text-amber-200">
                    Stalled In Transit
                  </p>
                </div>
                {onResume && (
                  <button
                    type="button"
                    onClick={onResume}
                    className="rounded-md border border-amber-400/80 bg-background px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  >
                    Resume Transit
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-amber-950 dark:text-amber-100">
                {batch.stalledReason || 'No disruption reason provided by the crew on-site.'}
              </p>
            </div>
          )}

          {batch.direction === 'outbound' && batch.stage === 'Planned' && (
            <div>
              <label htmlFor="egress-handoff-note" className="mb-2 block text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Field Lead handoff note <span className="text-destructive">*</span>
              </label>
              <textarea
                id="egress-handoff-note"
                value={batch.handoffNote}
                onChange={(event) => { onHandoffNoteChange(event.target.value); if (event.target.value.trim()) setHandoffError(false) }}
                placeholder="Describe where damaged items are placed…"
                rows={3}
                aria-required="true"
                aria-invalid={handoffError}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {handoffError && <p className="mt-2 text-[0.65rem] font-medium text-destructive" role="alert">Add a handoff note before starting Egress</p>}
            </div>
          )}

          <div>
            <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Assigned crew
            </p>
            {batch.crew.length === 0 ? (
              <p className="text-sm text-muted-foreground">No crew assigned to this batch.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {batch.crew.map((member) => (
                  <span
                    key={member.id}
                    className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-card-foreground"
                  >
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <User className="size-3" aria-hidden="true" />
                    </span>
                    {member.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Item reconciliation
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-background">
                    <th className="px-4 py-2.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Item
                    </th>
                    <th className="px-4 py-2.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Planned
                    </th>
                    <th className="px-4 py-2.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Actual
                    </th>
                    <th className="px-4 py-2.5 text-right text-[0.56rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batch.reconciliation.map((row) => {
                    const tone = RECONCILIATION_TONE[row.status]
                    return (
                      <Fragment key={row.id}>
                        <tr className="border-t border-border bg-card">
                          <td className="px-4 py-3 text-sm text-card-foreground">{row.itemName}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{row.planned}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{row.actual}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.56rem] font-bold uppercase tracking-[0.06em]',
                                toneClasses[tone],
                              )}
                            >
                              <span className={cn('size-1.5 rounded-full', toneDot[tone])} aria-hidden="true" />
                              {row.status}
                            </span>
                          </td>
                        </tr>
                        {row.status === 'Pahabol' && (
                          <tr className="border-t border-border/60 bg-destructive/5">
                            <td colSpan={4} className="px-4 py-3">
                              <label
                                htmlFor={`justification-${row.id}`}
                                className="mb-1.5 block text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-destructive"
                              >
                                Justification required — unplanned addition
                              </label>
                              <textarea
                                id={`justification-${row.id}`}
                                value={row.justification}
                                onChange={(event) => onJustificationChange(row.id, event.target.value)}
                                placeholder="Explain why this item was added outside the original plan…"
                                rows={2}
                                className="w-full rounded-md border border-destructive/40 bg-card px-3 py-2 text-xs text-card-foreground outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {missingJustifications && (
              <p className="mt-2 text-[0.65rem] font-medium text-destructive">
                All pahabol items require a justification before this batch can be marked {finalStage.toLowerCase()}.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Previous batch
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
            >
              Next batch
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          {isFinal ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-primary">
              {finalStage}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (batch.direction === 'outbound' && batch.stage === 'Planned' && !batch.handoffNote.trim()) {
                  setHandoffError(true)
                  return
                }
                onAdvanceStage()
              }}
              disabled={missingJustifications || batch.stalled}
              title={batch.stalled ? 'Resolve the stall before advancing this batch' : undefined}
              className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            >
              Mark as {upcomingStage}
            </button>
          )}
        </div>
      </div>

      {stallModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setStallModalOpen(false)}
        >
          <div
            className="flex w-full max-w-md flex-col rounded-xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              <h3 className="font-serif text-lg font-medium text-card-foreground">Report Transit Breakdown / Delay</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Marking <strong>{batch.vehicleType} ({batch.plateNumber})</strong> as Stalled In Transit will halt stage progression while preserving its current checkpoint.
            </p>
            <div className="mt-4">
              <label htmlFor="stall-reason-input" className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Reason for interruption <span className="text-destructive">*</span>
              </label>
              <textarea
                id="stall-reason-input"
                value={stallReason}
                onChange={(e) => setStallReason(e.target.value)}
                placeholder="Vehicle breakdown, tire failure, road closure, accident..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setStallModalOpen(false)
                  setStallReason('')
                }}
                className="rounded-md border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!stallReason.trim()}
                onClick={() => {
                  if (!stallReason.trim() || !onStall) return
                  onStall(stallReason.trim())
                  setStallReason('')
                  setStallModalOpen(false)
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-40"
              >
                Confirm Stall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
