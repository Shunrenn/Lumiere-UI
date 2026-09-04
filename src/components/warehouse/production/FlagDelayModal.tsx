import { useState } from 'react'
import { X, AlertTriangle, Clock } from 'lucide-react'
import type { ProductionItem } from '@/lib/warehouse-production'

interface FlagDelayModalProps {
  item: ProductionItem
  onClose: () => void
  onSaveDelay: (delay: { reason: string; delayHours: number; loggedBy: string }) => void
}

export function FlagDelayModal({ item, onClose, onSaveDelay }: FlagDelayModalProps) {
  const [reason, setReason] = useState('')
  const [delayHours, setDelayHours] = useState<number>(8)
  const [loggedBy, setLoggedBy] = useState('Ronnie (Fab Lead)')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || delayHours <= 0) return
    onSaveDelay({
      reason: reason.trim(),
      delayHours,
      loggedBy: loggedBy.trim() || 'Warehouse Manager',
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-amber-500">Production Exception</p>
              <h2 className="font-serif text-lg font-medium text-foreground">Flag Build Delay</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 text-xs">
          <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-1">
            <p className="font-semibold text-foreground text-sm">{item.itemName}</p>
            <p className="text-muted-foreground text-[0.65rem]">
              Event: <span className="text-foreground font-medium">{item.eventTitle}</span> · Scheduled Finish:{' '}
              <span className="font-mono text-primary font-semibold">{item.computedEndDate}</span>
            </p>
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[0.68rem] text-muted-foreground">
            <p className="font-semibold text-amber-600 dark:text-amber-400">Strict Audit Rule:</p>
            <p className="mt-0.5">
              Production completion dates cannot be manually overridden. Logging a delay creates an immutable audit
              event that extends the Gantt timeline while preserving the original baseline calculation.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
              Delay Impact (Hours)
            </label>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <input
                type="number"
                min={1}
                max={120}
                value={delayHours}
                onChange={(e) => setDelayHours(Math.max(1, Number(e.target.value) || 1))}
                className="w-28 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono font-bold text-foreground outline-none focus:border-primary"
              />
              <span className="text-muted-foreground text-[0.68rem]">
                (~{Math.ceil(delayHours / 8)} working day{Math.ceil(delayHours / 8) === 1 ? '' : 's'})
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
              Delay Reason / Root Cause <span className="text-destructive">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken router spindle, supplier shipment missed deadline, sick lead carpenter..."
              className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
              Reported By
            </label>
            <input
              type="text"
              value={loggedBy}
              onChange={(e) => setLoggedBy(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Footer Buttons */}
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason.trim()}
              className="rounded-md bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              Log Delay Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
