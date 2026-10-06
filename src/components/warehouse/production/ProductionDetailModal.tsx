import { useState } from 'react'
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Truck,
  Check,
  Ban,
  Sliders,
  Sparkles,
  PackageCheck,
} from 'lucide-react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import {
  elapsedLabel,
  verifyMaterialsOnItem,
  updateItemProgress,
  approveProductionItem,
  rejectProductionItem,
  resumeProductionItemRework,
  handoffProductionItem,
  type ProductionItem,
  type CanonicalProductionStage,
} from '@/lib/warehouse-production'
import {
  verifyProductionMaterials,
  updateProductionProgress,
  approveProductionTask,
  rejectProductionTask,
  resumeProductionRework,
  handoffProductionTask,
  canVerifyProductionMaterials,
  canUpdateProductionProgress,
  canApproveOrRejectProduction,
  canWarehouseHandoffProduction,
  formatProductionStatus,
  getProductionStatusTone,
} from '@/features/production/api/productionApi'
import { Pill } from '@/components/warehouse/shared/Pill'
import {
  ProductionConfirmationModal,
  type ProductionConfirmationAction,
} from '@/components/warehouse/production/ProductionConfirmationModal'

interface ProductionDetailModalProps {
  item: ProductionItem
  isProductionManager?: boolean
  onClose: () => void
}

function normalizeStage(stage: string): CanonicalProductionStage {
  if (stage === 'Unprepped') return 'Pending'
  if (stage === 'Prepping') return 'InProgress'
  if (stage === 'Awaiting Approval') return 'CompletedAwaitingApproval'
  if (stage === 'Ready') return 'DispatchReady'
  return (stage as CanonicalProductionStage) || 'Pending'
}

export function ProductionDetailModal({ item, onClose }: ProductionDetailModalProps) {
  const { inventory } = usePortal()
  const { currentUser } = useAuth()

  const normalizedStage = normalizeStage(item.status || item.stage)

  const canVerify = canVerifyProductionMaterials(currentUser)
  const canProgress = canUpdateProductionProgress(currentUser)
  const canReview = canApproveOrRejectProduction(currentUser)
  const canHandoff = canWarehouseHandoffProduction(currentUser)

  // Form input states
  const [verificationNotes, setVerificationNotes] = useState(item.verificationNotes ?? '')
  const [progressPercentage, setProgressPercentage] = useState<number>(() => {
    if (item.progressPercentage != null) return item.progressPercentage
    if (normalizedStage === 'CompletedAwaitingApproval' || normalizedStage === 'Approved' || normalizedStage === 'DispatchReady') return 100
    if (normalizedStage === 'InProgress') return 50
    return 0
  })
  const [completedQuantity, setCompletedQuantity] = useState<number>(() => {
    if (item.completedQuantity != null) return item.completedQuantity
    if (normalizedStage === 'CompletedAwaitingApproval' || normalizedStage === 'Approved' || normalizedStage === 'DispatchReady') return item.quota
    return 0
  })
  const [progressNotes, setProgressNotes] = useState(item.accomplishment?.notes ?? '')
  const [approvalNotes, setApprovalNotes] = useState(item.approvalNotes ?? '')
  const [handoffNotes, setHandoffNotes] = useState(item.handoffNotes ?? '')
  const rejectionReason = item.rejectionReason ?? ''

  // Confirmation Modal Trigger State
  const [activeConfirmation, setActiveConfirmation] = useState<ProductionConfirmationAction | null>(null)

  // Async submission & error states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handlePercentageChange = (pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct))
    setProgressPercentage(clamped)
    setCompletedQuantity(Math.round((clamped / 100) * (item.quota || 1)))
  }

  const handleQuantityChange = (qty: number) => {
    const clamped = Math.min(item.quota || 1, Math.max(0, qty))
    setCompletedQuantity(clamped)
    setProgressPercentage(Math.round((clamped / (item.quota || 1)) * 100))
  }

  // 1. Verify Materials
  const executeVerifyMaterials = async (notes?: string) => {
    if (!canVerify || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const result = await verifyProductionMaterials(item.id, {
      verificationNotes: notes || verificationNotes.trim() || undefined,
    })

    setIsSubmitting(false)
    if (result.success) {
      verifyMaterialsOnItem(item.id, notes || verificationNotes.trim())
      setSuccessMessage('Raw materials successfully verified and logged.')
      setActiveConfirmation(null)
    } else {
      setErrorMessage(result.message)
    }
  }

  // 2. Record Progress (Regular or 100% completion)
  const executeRecordProgress = async (notes?: string) => {
    if (!canProgress || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const result = await updateProductionProgress(item.id, {
      progressPercentage,
      completedQuantity,
      notes: notes || progressNotes.trim() || undefined,
    })

    setIsSubmitting(false)
    if (result.success) {
      updateItemProgress(item.id, progressPercentage, completedQuantity, notes || progressNotes.trim())
      setSuccessMessage(
        progressPercentage >= 100
          ? 'Production marked 100% complete and submitted for Quality Review.'
          : `Progress updated to ${progressPercentage}%.`,
      )
      setActiveConfirmation(null)
    } else {
      setErrorMessage(result.message)
    }
  }

  // 3. Quality Review: Approve
  const executeApprove = async (notes?: string) => {
    if (!canReview || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const result = await approveProductionTask(item.id, {
      notes: notes || approvalNotes.trim() || undefined,
    })

    setIsSubmitting(false)
    if (result.success) {
      approveProductionItem(item.id, notes || approvalNotes.trim())
      setSuccessMessage('Production quality approved. Ready for warehouse dispatch handoff.')
      setActiveConfirmation(null)
    } else {
      setErrorMessage(result.message)
    }
  }

  // 4. Quality Review: Reject
  const executeReject = async (reason?: string) => {
    if (!canReview || isSubmitting) return
    const reasonToSubmit = reason || rejectionReason.trim()
    if (!reasonToSubmit) {
      setErrorMessage('A rejection reason is mandatory to send back for rework.')
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const result = await rejectProductionTask(item.id, {
      reason: reasonToSubmit,
    })

    setIsSubmitting(false)
    if (result.success) {
      rejectProductionItem(item.id, reasonToSubmit)
      setSuccessMessage('Task rejected and returned for rework.')
      setActiveConfirmation(null)
    } else {
      setErrorMessage(result.message)
    }
  }

  // 5. Resume Rework
  const executeResumeRework = async (notes?: string) => {
    if (!canProgress || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const result = await resumeProductionRework(item.id, {
      notes: notes || progressNotes.trim() || undefined,
    })

    setIsSubmitting(false)
    if (result.success) {
      resumeProductionItemRework(item.id, notes || progressNotes.trim())
      setSuccessMessage('Rework resumed. Active workshop fabrication tracking restored.')
      setActiveConfirmation(null)
    } else {
      setErrorMessage(result.message)
    }
  }

  // 6. Warehouse Handoff
  const executeHandoff = async (notes?: string) => {
    if (!canHandoff || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const result = await handoffProductionTask(item.id, {
      notes: notes || handoffNotes.trim() || undefined,
    })

    setIsSubmitting(false)
    if (result.success) {
      handoffProductionItem(item.id, notes || handoffNotes.trim())
      setSuccessMessage('Warehouse handoff complete. Unit is marked Dispatch Ready.')
      setActiveConfirmation(null)
    } else {
      setErrorMessage(result.message)
    }
  }

  const tone = getProductionStatusTone(normalizedStage)
  const displayLabel = formatProductionStatus(normalizedStage)

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="flex h-full max-h-[46rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                <img
                  src={item.thumbnail || '/placeholder.svg'}
                  alt={item.itemName}
                  crossOrigin="anonymous"
                  className="size-full object-cover"
                />
              </div>
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Production Lifecycle Detail
                </p>
                <h2 className="mt-0.5 font-serif text-xl font-medium text-card-foreground">
                  {item.itemName}
                </h2>
                <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">
                  {item.eventTitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Metadata & Canonical Status Pill */}
            <div className="flex flex-wrap items-center gap-3">
              <Pill tone={tone}>{displayLabel}</Pill>
              <span className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                Quota: <span className="font-semibold text-card-foreground">{item.quota} pcs</span>
              </span>
              <span className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                Crew: <span className="font-semibold text-card-foreground">{item.assignedCrew} ({item.manCount}w)</span>
              </span>
              <span className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                Elapsed: <span className="font-semibold text-card-foreground">{elapsedLabel(item.startedAt)}</span>
              </span>
            </div>

            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* Rejection Alert (when RejectedRework) */}
            {normalizedStage === 'RejectedRework' && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="size-4" />
                  <span>Quality Review Rejected — Rework Required</span>
                </div>
                <p className="text-xs text-foreground/90">
                  <strong>Rejection Reason:</strong> {item.rejectionReason || 'Deficiencies flagged during supervisor review.'}
                </p>
                {canProgress && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveConfirmation('resume-rework')}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3.5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                      <RotateCcw className="size-3.5" />
                      Resume Rework
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Section 1: Raw Material Requirements */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Raw Material Requirements &amp; Live Stockroom Sync
                </p>
                <span className="text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Canonical Requirements
                </span>
              </div>

              <ul className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                {item.rawMaterials.map((material) => {
                  const match = inventory.find((inv) => {
                    const a = inv.name.toLowerCase().replace(/—|-/g, '').trim()
                    const b = material.name.toLowerCase().replace(/—|-/g, '').trim()
                    return a.includes(b) || b.includes(a) || a.split(' ')[0] === b.split(' ')[0]
                  })
                  const currentStock = match ? match.stock : 15
                  const isAvailable = currentStock >= material.qty

                  return (
                    <li
                      key={material.id}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        {isAvailable ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" />
                          </span>
                        ) : (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="size-3.5" />
                          </span>
                        )}
                        <div>
                          <p className="text-xs font-medium text-card-foreground">{material.name}</p>
                          <p className="text-[0.6rem] text-muted-foreground">
                            Job Requirement:{' '}
                            <span className="font-semibold text-card-foreground">
                              {material.qty} {material.unit}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            Available (Stock: {currentStock} {material.unit})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                            Insufficient ({currentStock} / {material.qty} {material.unit})
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Verification action for Pending items */}
              {normalizedStage === 'Pending' && (
                <div className="rounded-lg border border-border bg-card p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                      Material Verification Action
                    </span>
                    {!canVerify && (
                      <span className="text-[0.55rem] text-muted-foreground italic">
                        Requires Warehouse/Production authority to verify
                      </span>
                    )}
                  </div>

                  {canVerify && (
                    <div className="space-y-2.5">
                      <textarea
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="Optional material verification notes (e.g. inspected in Bay 3)..."
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveConfirmation('verify-materials')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        <PackageCheck className="size-3.5" />
                        Verify Materials
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Progress Tracking (when MaterialsVerified, InProgress, or RejectedRework) */}
            {(normalizedStage === 'MaterialsVerified' ||
              normalizedStage === 'InProgress' ||
              normalizedStage === 'RejectedRework') && (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="size-4 text-primary" />
                    <span className="text-[0.62rem] font-bold uppercase tracking-wider text-card-foreground">
                      Record Production Progress
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">
                    {progressPercentage}% · {completedQuantity} / {item.quota} units
                  </span>
                </div>

                {canProgress ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress Slider:</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={progressPercentage}
                        onChange={(e) => handlePercentageChange(Number(e.target.value))}
                        className="w-full cursor-pointer accent-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">
                          Percentage
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={progressPercentage}
                          onChange={(e) => handlePercentageChange(Number(e.target.value))}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-bold"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-[0.58rem] font-bold uppercase text-muted-foreground">
                          Completed Units
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={item.quota}
                          value={completedQuantity}
                          onChange={(e) => handleQuantityChange(Number(e.target.value))}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-bold"
                        />
                      </label>
                    </div>

                    <textarea
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      placeholder="Describe build progress or accomplishments..."
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    />

                    {progressPercentage >= 100 ? (
                      <button
                        type="button"
                        onClick={() => setActiveConfirmation('complete-100')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Sparkles className="size-3.5" />
                        100% — Submit for Quality Review
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => executeRecordProgress()}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Send className="size-3.5" />
                        {isSubmitting ? 'Saving Progress...' : 'Record Progress'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Progress tracking is restricted to assigned workshop crew and leads.
                  </p>
                )}
              </div>
            )}

            {/* Section 3: Quality Review (when CompletedAwaitingApproval) */}
            {normalizedStage === 'CompletedAwaitingApproval' && (
              <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <Sparkles className="size-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Quality Review &amp; Dispatch Approval
                  </h3>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Build is declared 100% complete. Authorized supervisor review is required before releasing to warehouse dispatch.
                </p>

                {canReview ? (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder="Optional QA approval notes (e.g. dimensions & finish confirmed)..."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveConfirmation('approve')}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          Approve Quality
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveConfirmation('reject')}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1.5 rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                        >
                          <Ban className="size-3.5" />
                          Reject with Reason
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Awaiting Quality Review by a Production Manager or Warehouse Operations Manager.
                  </p>
                )}
              </div>
            )}

            {/* Section 4: Approved & Handoff (when Approved) */}
            {normalizedStage === 'Approved' && (
              <div className="space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Quality Approved · Warehouse Handoff Ready
                  </h3>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Quality review approved. Handoff releases the item into the warehouse dispatch queue as Dispatch Ready.
                </p>

                {canHandoff && (
                  <div className="space-y-2.5 pt-1">
                    <input
                      type="text"
                      value={handoffNotes}
                      onChange={(e) => setHandoffNotes(e.target.value)}
                      placeholder="Optional handoff staging notes (e.g. Placed in Staging Bay 4)..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveConfirmation('handoff')}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Truck className="size-3.5" />
                      Complete Warehouse Handoff
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Section 5: Dispatch Ready (when DispatchReady) */}
            {normalizedStage === 'DispatchReady' && (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Truck className="size-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                      Dispatch Ready
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      Item is physically staged and available for vehicle loading.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider">
                  Staged
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end border-t border-border px-6 py-4 bg-muted/20">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Reusable Canonical Confirmation Modal */}
      {activeConfirmation && (
        <ProductionConfirmationModal
          isOpen={Boolean(activeConfirmation)}
          action={activeConfirmation}
          taskName={item.itemName}
          eventTitle={item.eventTitle}
          initialNotes={
            activeConfirmation === 'verify-materials'
              ? verificationNotes
              : activeConfirmation === 'approve'
                ? approvalNotes
                : activeConfirmation === 'reject'
                  ? rejectionReason
                  : activeConfirmation === 'handoff'
                    ? handoffNotes
                    : progressNotes
          }
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onClose={() => {
            setActiveConfirmation(null)
            setErrorMessage(null)
          }}
          onConfirm={(notesOrReason) => {
            if (activeConfirmation === 'verify-materials') {
              void executeVerifyMaterials(notesOrReason)
            } else if (activeConfirmation === 'complete-100') {
              void executeRecordProgress(notesOrReason)
            } else if (activeConfirmation === 'approve') {
              void executeApprove(notesOrReason)
            } else if (activeConfirmation === 'reject') {
              void executeReject(notesOrReason)
            } else if (activeConfirmation === 'resume-rework') {
              void executeResumeRework(notesOrReason)
            } else if (activeConfirmation === 'handoff') {
              void executeHandoff(notesOrReason)
            }
          }}
        />
      )}
    </>
  )
}
