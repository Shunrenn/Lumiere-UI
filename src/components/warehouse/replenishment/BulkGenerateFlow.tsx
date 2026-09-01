import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import type { DeficitLine } from '@/lib/warehouse-replenishment'
import { lineCost } from '@/lib/warehouse-replenishment'
import { cn } from '@/lib/utils'

type Step = 'select' | 'queue' | 'finalize'

const STEP_LABELS: Record<Step, string> = {
  select: '1 · Select items',
  queue: '2 · Pending queue',
  finalize: '3 · Finalize tray',
}

interface BulkGenerateFlowProps {
  candidates: DeficitLine[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

export function BulkGenerateFlow({ candidates, onClose, onConfirm }: BulkGenerateFlowProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [finalizeIds, setFinalizeIds] = useState<Set<string>>(new Set())
  const [showAck, setShowAck] = useState(false)

  const byId = (id: string) => candidates.find((line) => line.id === id)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const moveSelectedToPending = () => {
    setPendingIds((prev) => new Set([...prev, ...selectedIds]))
    setSelectedIds(new Set())
    setStep('queue')
  }

  const removeFromPending = (id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const moveToFinalize = (id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setFinalizeIds((prev) => new Set([...prev, id]))
  }

  const moveAllToFinalize = () => {
    setFinalizeIds((prev) => new Set([...prev, ...pendingIds]))
    setPendingIds(new Set())
    setStep('finalize')
  }

  const removeFromFinalize = (id: string) => {
    setFinalizeIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const totalCost = [...finalizeIds].reduce((sum, id) => {
    const line = byId(id)
    return line ? sum + lineCost(line) : sum
  }, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[36rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Bulk Generate Master PO
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-card-foreground">{STEP_LABELS[step]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-6 py-3">
          {(['select', 'queue', 'finalize'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[0.6rem] font-bold',
                  step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              {i < 2 && <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'select' && (
            <div className="flex flex-col gap-2">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open deficit lines to select.</p>
              ) : (
                candidates.map((line) => (
                  <label
                    key={line.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3.5 py-3 transition',
                      selectedIds.has(line.id) ? 'border-primary/50 bg-primary/10' : 'border-border bg-background',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(line.id)}
                      onChange={() => toggleSelect(line.id)}
                      className="size-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">{line.itemName}</p>
                      <p className="truncate text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                        {line.eventTitle ?? 'General stockroom'} · {line.status}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">₱{lineCost(line).toLocaleString()}</span>
                  </label>
                ))
              )}
            </div>
          )}

          {step === 'queue' && (
            <div className="flex flex-col gap-2">
              {pendingIds.size === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Pending queue is empty. Go back to select more items, or finalize what you have.
                </p>
              ) : (
                [...pendingIds].map((id) => {
                  const line = byId(id)
                  if (!line) return null
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3.5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-card-foreground">{line.itemName}</p>
                        <p className="truncate text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {line.eventTitle ?? 'General stockroom'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => moveToFinalize(id)}
                        className="shrink-0 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-primary hover:underline"
                      >
                        Move to finalize
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromPending(id)}
                        aria-label={`Remove ${line.itemName} from queue`}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {step === 'finalize' && (
            <div className="flex flex-col gap-2">
              {finalizeIds.size === 0 ? (
                <p className="text-sm text-muted-foreground">No items finalized yet.</p>
              ) : (
                [...finalizeIds].map((id) => {
                  const line = byId(id)
                  if (!line) return null
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-3">
                      <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-card-foreground">{line.itemName}</p>
                        <p className="truncate text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {line.eventTitle ?? 'General stockroom'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">₱{lineCost(line).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => removeFromFinalize(id)}
                        aria-label={`Remove ${line.itemName} from finalize tray`}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
              {finalizeIds.size > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-border bg-background px-4 py-3">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Estimated total
                  </span>
                  <span className="text-lg font-semibold text-card-foreground">₱{totalCost.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {step !== 'select' && (
              <button
                type="button"
                onClick={() => setStep(step === 'finalize' ? 'queue' : 'select')}
                className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
              >
                Back
              </button>
            )}
          </div>
          {step === 'select' && (
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={moveSelectedToPending}
              className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            >
              Add to pending queue ({selectedIds.size})
            </button>
          )}
          {step === 'queue' && (
            <button
              type="button"
              disabled={pendingIds.size === 0}
              onClick={moveAllToFinalize}
              className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            >
              Move all to finalize tray
            </button>
          )}
          {step === 'finalize' && (
            <button
              type="button"
              disabled={finalizeIds.size === 0}
              onClick={() => setShowAck(true)}
              className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            >
              Confirm &amp; Generate POs
            </button>
          )}
        </div>
      </div>

      {showAck && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 p-4"
          role="alertdialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl">
            <p className="font-serif text-lg text-card-foreground">
              You&apos;re about to generate POs for {finalizeIds.size} item{finalizeIds.size === 1 ? '' : 's'}.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAck(false)}
                className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm([...finalizeIds])}
                className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
