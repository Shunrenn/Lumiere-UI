import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Truck,
  Ban,
  RotateCcw,
  Sparkles,
  PackageCheck,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProductionConfirmationAction =
  | 'verify-materials'
  | 'complete-100'
  | 'approve'
  | 'reject'
  | 'resume-rework'
  | 'handoff'

interface ProductionConfirmationModalProps {
  isOpen: boolean
  action: ProductionConfirmationAction
  taskName: string
  eventTitle?: string
  initialNotes?: string
  isSubmitting?: boolean
  errorMessage?: string | null
  onClose: () => void
  onConfirm: (notesOrReason?: string) => void
}

const ACTION_CONFIG: Record<
  ProductionConfirmationAction,
  {
    title: string
    resultingState: string
    confirmLabel: string
    confirmVariant: 'primary' | 'destructive' | 'emerald'
    icon: typeof CheckCircle2
    impactDescription: string
    notesPlaceholder: string
    notesLabel: string
    isReasonRequired?: boolean
  }
> = {
  'verify-materials': {
    title: 'Verify Raw Material Requirements?',
    resultingState: 'MaterialsVerified',
    confirmLabel: 'Confirm Material Verification',
    confirmVariant: 'primary',
    icon: PackageCheck,
    impactDescription:
      'This certifies that all required raw materials are physically allocated and verified in the workshop stockroom. Production may begin.',
    notesLabel: 'Verification Notes (Optional)',
    notesPlaceholder: 'Add verification notes (e.g. Inspected in Stockroom Bay 3)...',
  },
  'complete-100': {
    title: 'Submit 100% Build for Quality Review?',
    resultingState: 'CompletedAwaitingApproval',
    confirmLabel: 'Submit for Quality Review',
    confirmVariant: 'primary',
    icon: Sparkles,
    impactDescription:
      'This locks fabrication progress at 100% and places the unit into the Quality Review queue for supervisor approval.',
    notesLabel: 'Completion & Accomplishment Notes (Optional)',
    notesPlaceholder: 'Describe completed fabrication details...',
  },
  approve: {
    title: 'Approve Production Quality?',
    resultingState: 'Approved',
    confirmLabel: 'Approve Quality Review',
    confirmVariant: 'emerald',
    icon: CheckCircle2,
    impactDescription:
      'This formally certifies that the completed unit meets all build specifications. The unit will become eligible for warehouse handoff and dispatch preparation.',
    notesLabel: 'QA Approval Notes (Optional)',
    notesPlaceholder: 'Confirm quality standards (e.g. Dimensions, structural integrity, and finish verified)...',
  },
  reject: {
    title: 'Reject Production Task for Rework?',
    resultingState: 'RejectedRework',
    confirmLabel: 'Confirm & Return for Rework',
    confirmVariant: 'destructive',
    icon: Ban,
    impactDescription:
      'This rejects the build quality and returns the task to the workshop floor for rework. The assigned fabrication team will be alerted of the defects.',
    notesLabel: 'Mandatory Rejection Justification',
    notesPlaceholder: 'Explicitly describe defects or required rework modifications (Mandatory)...',
    isReasonRequired: true,
  },
  'resume-rework': {
    title: 'Resume Fabrication Rework?',
    resultingState: 'InProgress',
    confirmLabel: 'Resume Active Rework',
    confirmVariant: 'primary',
    icon: RotateCcw,
    impactDescription:
      'This marks the rejected task as actively undergoing rework in the workshop. Progress tracking will resume.',
    notesLabel: 'Rework Action Notes (Optional)',
    notesPlaceholder: 'Describe corrective actions taken...',
  },
  handoff: {
    title: 'Complete Warehouse Dispatch Handoff?',
    resultingState: 'DispatchReady',
    confirmLabel: 'Release to Warehouse Dispatch',
    confirmVariant: 'emerald',
    icon: Truck,
    impactDescription:
      'This physically transfers custody of the approved bespoke unit to the Warehouse Logistics team. The item will transition to "Dispatch Ready" in the event loading queue.',
    notesLabel: 'Warehouse Handoff Notes (Optional)',
    notesPlaceholder: 'Specify staging location (e.g. Staged in Outbound Loading Bay 2)...',
  },
}

export function ProductionConfirmationModal({
  isOpen,
  action,
  taskName,
  eventTitle,
  initialNotes = '',
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onConfirm,
}: ProductionConfirmationModalProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!isOpen) return null

  const config = ACTION_CONFIG[action]
  const Icon = config.icon

  const handleConfirmClick = () => {
    const trimmed = notes.trim()
    if (config.isReasonRequired && !trimmed) {
      setValidationError('A justification reason is strictly required before rejecting this task.')
      return
    }
    setValidationError(null)
    onConfirm(trimmed || undefined)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 space-y-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-lg',
                config.confirmVariant === 'destructive'
                  ? 'bg-destructive/15 text-destructive'
                  : config.confirmVariant === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/15 text-primary',
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-foreground">
                {config.title}
              </h3>
              <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-semibold">
                Operational Milestone Confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Task Summary Card */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground truncate">{taskName}</span>
            <span className="rounded font-mono px-2 py-0.5 text-[0.58rem] font-bold uppercase bg-primary/10 text-primary">
              &rarr; {config.resultingState}
            </span>
          </div>
          {eventTitle && (
            <p className="text-[0.65rem] text-muted-foreground">Target Event: {eventTitle}</p>
          )}
        </div>

        {/* Impact Notice */}
        <div className="rounded-lg border border-border/80 bg-background/80 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-[0.7rem] uppercase tracking-wider">
            Workflow &amp; Inter-Department Impact:
          </p>
          <p className="leading-relaxed text-[0.72rem]">{config.impactDescription}</p>
        </div>

        {/* Notes / Reason Input */}
        <div className="space-y-1.5">
          <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
            {config.notesLabel} {config.isReasonRequired && <span className="text-destructive">*</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              if (validationError) setValidationError(null)
            }}
            disabled={isSubmitting}
            placeholder={config.notesPlaceholder}
            rows={3}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring',
              validationError ? 'border-destructive focus:ring-destructive' : 'border-input',
            )}
          />
          {validationError && (
            <p className="text-[0.72rem] font-semibold text-destructive">{validationError}</p>
          )}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-input bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition shadow-xs disabled:opacity-50',
              config.confirmVariant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : config.confirmVariant === 'emerald'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
            )}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              config.confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
