import { useState } from 'react'
import { AlertTriangle, Archive, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmArchiveBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  batchCode: string
  driverName?: string
  vehicleType: string
  itemCount: number
}

export function ConfirmArchiveBatchModal({
  isOpen,
  onClose,
  onConfirm,
  batchCode,
  driverName,
  vehicleType,
  itemCount,
}: ConfirmArchiveBatchModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirm = () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('A justification reason is strictly required before archiving a batch.')
      return
    }
    setError(null)
    onConfirm(trimmed)
    setReason('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5 text-destructive">
            <Archive className="h-5 w-5" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Archive Dispatch Batch</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Soft-Delete & Manifest Reconciliation Invariant</span>
            </div>
            <p className="text-[0.75rem] text-muted-foreground">
              Archiving <strong className="text-foreground">{batchCode}</strong> removes it from active dispatch operations. All manifest items ({itemCount} total) and driver details ({driverName || 'Unassigned'}, {vehicleType}) will be preserved in the archived reconciliation history.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cancellation / Archive Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Provide explicit operational justification (e.g. Vehicle breakdown, reassigned items to Batch 02)..."
              rows={3}
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring',
                error ? 'border-destructive focus:ring-destructive' : 'border-input',
              )}
            />
            {error && <p className="text-[0.72rem] font-medium text-destructive">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-lg border border-input bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Keep Active
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 shadow-xs"
          >
            Confirm & Archive Batch
          </button>
        </div>
      </div>
    </div>
  )
}
