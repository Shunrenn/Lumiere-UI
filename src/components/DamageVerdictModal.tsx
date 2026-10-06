import { useEffect, useMemo, useState } from 'react'
import {
  X,
  MapPin,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  UserRound,
  Banknote,
  Camera,
  CheckCircle2,
  XCircle,
  Scale,
  AlertTriangle,
  Wrench,
  Ban,
  UserCheck2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  FileEdit,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DamageException, DamageVerdict } from '@/lib/types'
import { StatusBadge } from '@/components/StatusBadge'
import { usePortal } from '@/lib/store'

type ResolvableVerdict = Exclude<DamageVerdict, 'Pending Verdict'>

// Copy + styling for the revalidation confirmation step, keyed by verdict.
const verdictConfig: Record<
  ResolvableVerdict,
  { label: string; confirmTitle: string; confirmBody: string; tone: string; Icon: typeof Scale }
> = {
  Validated: {
    label: 'Validate Claim',
    confirmTitle: 'Confirm Claim Validation',
    confirmBody:
      'This confirms that the damage claim is valid and moves it to the final disposition stage, where Repair or Write-off can be selected.',
    tone: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  Dismissed: {
    label: 'Dismiss Claim',
    confirmTitle: 'Confirm Claim Dismissal',
    confirmBody:
      'This will dismiss the exception with no financial impact. The asset will be returned to available stock.',
    tone: 'text-destructive',
    Icon: XCircle,
  },
  'Held for Audit': {
    label: 'Hold for Audit',
    confirmTitle: 'Hold Exception for Audit',
    confirmBody:
      'This places the exception on a formal audit hold. The asset is frozen and liability remains open pending review.',
    tone: 'text-amber-700',
    Icon: Scale,
  },
  'Pending Second Sign-off': {
    label: 'Sign Off',
    confirmTitle: 'Confirm Sign-off',
    confirmBody: 'This records your WOM sign-off on this audit-held exception.',
    tone: 'text-amber-700',
    Icon: UserCheck2,
  },
  Repair: {
    label: 'Sign Off · Repair',
    confirmTitle: 'Confirm Sign-off · Repair',
    confirmBody:
      'This records your sign-off recommending Repair. The asset status will transition to In Maintenance in the Asset Registry and an audit entry will be logged.',
    tone: 'text-sky-700',
    Icon: Wrench,
  },
  'Write-off': {
    label: 'Sign Off · Write-off',
    confirmTitle: 'Confirm Sign-off · Write-off',
    confirmBody:
      'This records your sign-off recommending Write-off. Asset stock will be decremented and a loss ledger entry will be logged.',
    tone: 'text-destructive',
    Icon: Ban,
  },
}

interface Props {
  exception: DamageException | null
  onClose: () => void
  onResolve: (
    id: string,
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>,
    note: string,
    unblockMetadata?: any,
    selfValRecord?: any,
  ) => void
  editable?: boolean
  currentExecutiveEmail?: string
  currentExecutiveName?: string
  activeExecutiveCount?: number
  allowSelfValidation?: boolean
  permanentlyEnabledViaEmergency?: boolean
  womSubRoleName?: string
  onPermanentUnblockSubRole?: (subRoleName: string, metadata: any) => void
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)

export function DamageVerdictModal({
  exception,
  onClose,
  onResolve,
  editable = false,
  currentExecutiveEmail = '',
  currentExecutiveName = '',
  activeExecutiveCount = 2,
  allowSelfValidation = true,
  permanentlyEnabledViaEmergency = false,
  womSubRoleName = 'Warehouse Manager',
  onPermanentUnblockSubRole,
}: Props) {
  if (!exception) return null

  const { amendDamageReport, refetchDamageReport } = usePortal()

  const [note, setNote] = useState('')
  const [pendingVerdict, setPendingVerdict] = useState<ResolvableVerdict | null>(null)
  const [currentImgIndex, setCurrentImgIndex] = useState(0)

  // Supervisory amendment states
  const [showAmendModal, setShowAmendModal] = useState(false)
  const [amendReason, setAmendReason] = useState('')
  const [amendQuantity, setAmendQuantity] = useState(exception.damagedQuantity ?? 1)
  const [amendDamageType, setAmendDamageType] = useState(exception.damageType)
  const [amendError, setAmendError] = useState<string | null>(null)
  const [isAmending, setIsAmending] = useState(false)

  const allImages = useMemo(() => {
    if (exception.images && exception.images.length > 0) return exception.images
    return [exception.imageUrl || '/placeholder.svg']
  }, [exception])

  // Self-validation fields
  const [selfValJustification, setSelfValJustification] = useState('')

  // Emergency Unblock Modal fields
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [adminReason, setAdminReason] = useState('')
  const [unblockMode, setUnblockMode] = useState<'ONE_TIME' | 'PERMANENT'>('ONE_TIME')
  const [showHighFrictionWarning, setShowHighFrictionWarning] = useState(false)
  const [ackChecked, setAckChecked] = useState(false)

  const isReviewable = exception.declarationState === 'Reviewable'

  useEffect(() => {
    setNote('')
    setPendingVerdict(null)
    setSelfValJustification('')
    setShowEmergencyModal(false)
    setShowHighFrictionWarning(false)
    setAckChecked(false)
    setShowAmendModal(false)
    setAmendReason('')
    setAmendError(null)
    setAmendQuantity(exception.damagedQuantity ?? 1)
    setAmendDamageType(exception.damageType)

    if (!exception) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exception])

  const handleAmend = async () => {
    if (amendReason.trim().length < 10) {
      setAmendError('A reason of at least 10 characters is required for supervisory amendments.')
      return
    }
    setIsAmending(true)
    setAmendError(null)
    try {
      const res = await amendDamageReport(exception.id, {
        reason: amendReason.trim(),
        expectedVersion: exception.version ?? 1,
        damagedQuantity: amendQuantity,
        severity: amendDamageType,
      })
      if (res.kind === 'success') {
        setShowAmendModal(false)
        await refetchDamageReport(exception.id)
      } else if (res.kind === 'stale_version') {
        setAmendError(
          'Version Conflict (409 STALE_VERSION): This declaration was modified elsewhere. The current authoritative state has been refetched. Please review updated values before reapplying.',
        )
        await refetchDamageReport(exception.id)
      } else {
        setAmendError(res.message || 'Failed to submit supervisory amendment.')
      }
    } catch (err: any) {
      setAmendError(err.message || 'An unexpected error occurred while submitting amendment.')
    } finally {
      setIsAmending(false)
    }
  }

  const showControls = editable
  const isHeldForAudit = exception.status === 'Held for Audit'
  const isPendingSecondSignOff = exception.status === 'Pending Second Sign-off'
  const isFinalAuditVerdict = exception.status === 'Repair' || exception.status === 'Write-off'

  // Dual custody checks
  const isStrictBlock = !allowSelfValidation && activeExecutiveCount < 2 && (isHeldForAudit || isPendingSecondSignOff)

  const selfValJustificationValid = selfValJustification.trim().length >= 20

  const confirm = (overrideUnblockMeta?: any) => {
    if (!pendingVerdict) return

    let selfRecord = undefined
    if (allowSelfValidation && (isHeldForAudit || isPendingSecondSignOff)) {
      selfRecord = {
        validatedByEmail: currentExecutiveEmail || 'wom@lumiere.com',
        validatedByName: currentExecutiveName || 'Warehouse Ops Officer',
        womRole: womSubRoleName,
        pinVerified: true,
        justification: selfValJustification.trim(),
        timestamp: new Date().toISOString(),
        custodyMode: (overrideUnblockMeta ? 'admin-enabled-override' : 'standing-self-validation') as any,
        convertedViaEmergency: permanentlyEnabledViaEmergency,
      }
    }

    const effectiveNote = note.trim() || selfValJustification.trim()
    // A validated claim advances to the second, WOM-owned disposition stage.
    // The existing API represents that intermediate state as Held for Audit.
    const resolvedVerdict = pendingVerdict === 'Validated' ? 'Held for Audit' : pendingVerdict
    onResolve(
      exception.id,
      resolvedVerdict,
      effectiveNote,
      overrideUnblockMeta,
      selfRecord
    )
    setNote('')
    setPendingVerdict(null)
    setSelfValJustification('')
  }

  const handleExecuteEmergencyUnblock = () => {
    if (!adminPin || !adminReason.trim()) return
    const meta = {
      originatedFromEmergency: true,
      emergencyReason: adminReason.trim(),
      unblockedByAdminEmail: 'admin@lumiere.com',
      unblockScope: unblockMode === 'PERMANENT' ? ('permanent' as const) : ('instance' as const),
    }

    if (unblockMode === 'PERMANENT') {
      setShowHighFrictionWarning(true)
    } else {
      setShowEmergencyModal(false)
      confirm(meta)
    }
  }

  const handleConfirmPermanentUnblock = () => {
    if (!ackChecked) return
    const meta = {
      originatedFromEmergency: true,
      emergencyReason: adminReason.trim(),
      unblockedByAdminEmail: 'admin@lumiere.com',
      unblockScope: 'permanent' as const,
      madePermanentAt: new Date().toISOString(),
      permanentAcknowledged: true,
    }
    onPermanentUnblockSubRole?.(womSubRoleName, meta)
    setShowHighFrictionWarning(false)
    setShowEmergencyModal(false)
    confirm(meta)
  }

  const closeAll = () => {
    setPendingVerdict(null)
    setShowEmergencyModal(false)
    setShowHighFrictionWarning(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="damage-verdict-title"
      onClick={closeAll}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between bg-sidebar px-6 py-5 text-sidebar-foreground">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Exception {exception.logId} · Visual Verdict
            </p>
            <h2 id="damage-verdict-title" className="mt-1 font-serif text-2xl font-medium leading-tight text-sidebar-primary text-balance">
              {exception.assetName}
            </h2>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.15em] text-sidebar-foreground/60">
              SKU: {exception.assetSku}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAll}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sidebar-foreground/70 transition hover:text-sidebar-primary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {/* Declaration Review Window Banner (Provisional State) */}
          {isReviewable && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 p-4">
              <div className="flex items-start gap-3">
                <Clock className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                      Provisional Declaration · Server Review Window Active
                    </span>
                    <StatusBadge variant="warning" showDot={false}>
                      Reviewable
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Persistence ≠ Finality. This damage declaration was durably saved by Ground Crew but remains provisional and reviewable until the authoritative server deadline. Ground crew may correct permitted fields. Supervisory verdicts remain locked until finalization.
                  </p>
                  {exception.reviewDeadlineAt && (
                    <p className="text-[0.68rem] font-mono text-amber-900 dark:text-amber-400">
                      Authoritative Server Deadline: {new Date(exception.reviewDeadlineAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Field-captured evidence photo uploaded by ground crew */}
          {exception.noPhotographicEvidence ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-[0.1em]">
                No photographic evidence captured on site
              </p>
            </div>
          ) : (
            <figure className="overflow-hidden rounded-lg border border-border bg-muted/40">
              <div className="relative">
                <img
                  src={allImages[currentImgIndex] || '/placeholder.svg'}
                  alt={`Field-captured damage evidence for ${exception.assetName}`}
                  className="aspect-video w-full object-cover"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-foreground/70 px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-background backdrop-blur-sm">
                  <Camera className="size-3" />
                  Field Capture {allImages.length > 1 ? `(${currentImgIndex + 1}/${allImages.length})` : ''}
                </span>

                {allImages.length > 1 && (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImgIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
                      }}
                      className="pointer-events-auto rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/90"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImgIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
                      }}
                      className="pointer-events-auto rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/90"
                      aria-label="Next image"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
                <span>
                  Uploaded by {exception.reportingOfficer} · {exception.officerRole}
                </span>
                <span className="font-mono normal-case tracking-normal">
                  {allImages.length > 1 ? `Photo ${currentImgIndex + 1} of ${allImages.length} · ` : ''}
                  {exception.capturedAt}
                </span>
              </figcaption>
            </figure>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Reporting Officer
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">{exception.reportingOfficer}</p>
                <p className="text-[0.65rem] text-muted-foreground">{exception.officerRole}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Bound Event
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">{exception.boundEvent}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  GPS Telemetry
                </p>
                <p className="mt-0.5 font-mono text-xs text-card-foreground">{exception.gps}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Captured At
                </p>
                <p className="mt-0.5 font-mono text-xs text-card-foreground">{exception.capturedAt}</p>
              </div>
            </div>
          </div>

          {/* Damage + Evidence banner */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Reported Damage
                </p>
                <p className="mt-1 text-sm font-semibold text-card-foreground">
                  {exception.damageType}
                  {exception.damagedQuantity !== undefined && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({exception.damagedQuantity} {exception.damagedQuantity === 1 ? 'unit' : 'units'} affected)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {exception.noPhotographicEvidence || (!exception.photoUrl && !exception.sha256Hash) ? (
                  <StatusBadge variant="neutral" icon={<Ban className="size-3" />}>
                    No Photo Attached
                  </StatusBadge>
                ) : exception.evidenceStatus === 'Temporally Valid' ? (
                  <StatusBadge variant="success" icon={<ShieldCheck className="size-3" />}>
                    Temporally Valid
                  </StatusBadge>
                ) : exception.evidenceStatus === 'Temporally Invalid' ? (
                  <StatusBadge variant="destructive" icon={<AlertTriangle className="size-3" />}>
                    Temporally Invalid
                  </StatusBadge>
                ) : (
                  <StatusBadge variant="warning" icon={<ShieldAlert className="size-3" />}>
                    Unverifiable
                  </StatusBadge>
                )}
                <span className="text-[0.55rem] text-muted-foreground">
                  {isReviewable ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Provisional (Reviewable)</span>
                  ) : (
                    <span>Finalized (v{exception.version ?? 1})</span>
                  )}
                </span>
              </div>
            </div>

            {/* Concise operational explanation for temporal evidence status */}
            {!exception.noPhotographicEvidence && (exception.photoUrl || exception.sha256Hash) && (
              <div className="mt-2.5 rounded border border-border/60 bg-background/50 px-3 py-1.5 text-[0.62rem] text-muted-foreground">
                {exception.evidenceStatus === 'Temporally Valid' ? (
                  <p className="text-emerald-700 dark:text-emerald-300">
                    <strong>Temporal Integrity:</strong> Photo capture timestamp independently verified within event operational window by backend.
                  </p>
                ) : exception.evidenceStatus === 'Temporally Invalid' ? (
                  <p className="text-rose-700 dark:text-rose-300">
                    <strong>Temporal Integrity:</strong> Photo capture timestamp fell outside the authorized operational window ({exception.evidenceDerivationError || 'Timestamp out of range'}).
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>Temporal Integrity:</strong> System lacks sufficient trustworthy metadata to establish temporal validity ({exception.evidenceDerivationError || 'No verifiable camera timestamp'}). Unverifiable does not imply physical fabrication.
                  </p>
                )}
              </div>
            )}

            {/* Bulk damage invariant explanation */}
            <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2.5 text-[0.62rem]">
              <span className="text-muted-foreground">
                <strong>Bulk Invariant:</strong> Photo provides condition evidence; numeric quantity ({exception.damagedQuantity ?? 1}) governs accountability.
              </span>
            </div>

            {/* SHA-256 transport payload checksum — truthful trust boundary */}
            {exception.sha256Hash && (
              <div className="mt-2.5 border-t border-border/60 pt-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Transport Payload Digest (Client SHA-256 Checksum)
                  </p>
                  <span className="text-[0.55rem] text-muted-foreground italic">
                    Network integrity check · Not photographic proof
                  </span>
                </div>
                <p className="mt-0.5 break-all font-mono text-[0.6rem] text-muted-foreground">
                  {exception.sha256Hash}
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
              <Banknote className="size-4 text-primary" />
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Estimated Liability ·{' '}
                <span className="text-card-foreground">{currency(exception.estimatedCost)}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Field Notes
            </p>
            <p className="mt-1 text-sm italic leading-relaxed text-muted-foreground">
              {exception.notes}
            </p>
          </div>

          {/* Sign-off trail for audit-held exceptions */}
          {(exception.firstSignOff || exception.secondSignOff) && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Audit Sign-off Trail
              </p>
              {exception.firstSignOff && (
                <div className="flex items-start gap-2 text-xs text-card-foreground">
                  <UserCheck2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p>
                    <span className="font-semibold">{exception.firstSignOff.staffName}</span> signed off{' '}
                    <span className="font-semibold">{exception.firstSignOff.verdict}</span> ·{' '}
                    {exception.firstSignOff.timestamp}
                  </p>
                </div>
              )}
              {exception.secondSignOff && (
                <div className="flex items-start gap-2 text-xs text-card-foreground">
                  <UserCheck2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p>
                    <span className="font-semibold">{exception.secondSignOff.staffName}</span> confirmed{' '}
                    <span className="font-semibold">{exception.secondSignOff.verdict}</span> · finalized ·{' '}
                    {exception.secondSignOff.timestamp}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Supervisory Amendment Audit History */}
          {exception.amendments && exception.amendments.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Authoritative Amendment Ledger ({exception.amendments.length})
                </p>
              </div>
              <div className="space-y-2 pt-1">
                {exception.amendments.map((am) => (
                  <div key={am.id} className="rounded-md border border-border/60 bg-card p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[0.6rem] text-muted-foreground">
                      <span className="font-semibold text-card-foreground">
                        {am.correctedBy || 'Warehouse Supervisor'}
                      </span>
                      <span className="font-mono">{new Date(am.correctedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[0.68rem] text-card-foreground">
                      {am.previousValues && (
                        <span>
                          Prior: <span className="font-mono text-muted-foreground">{am.previousValues}</span>
                        </span>
                      )}
                      {am.correctedValues && (
                        <span>
                          Corrected: <span className="font-mono text-primary font-semibold">{am.correctedValues}</span>
                        </span>
                      )}
                      <span className="text-[0.58rem] font-mono text-muted-foreground">Version v{am.fromVersion} → v{am.toVersion}</span>
                    </div>
                    <p className="text-[0.68rem] italic text-muted-foreground bg-muted/40 p-2 rounded">
                      "{am.reason}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supervisory note — editable when in edit mode for pending reports */}
          <div>
            <label
              htmlFor="verdict-note"
              className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Supervisory Note
            </label>
            <textarea
              id="verdict-note"
              value={note}
              onChange={(e) => showControls && setNote(e.target.value)}
              readOnly={!showControls || isReviewable}
              rows={3}
              placeholder={isReviewable ? "Supervisory sign-off note locked while in declaration review window..." : showControls ? "Document the rationale for this verdict or sign-off..." : ""}
              className={cn(
                "mt-2 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none",
                showControls && !isReviewable
                  ? "border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                  : "border-input bg-muted text-muted-foreground"
              )}
            />
          </div>

          {exception.status === 'Validated' || exception.status === 'Dismissed' ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]',
                exception.status === 'Validated' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                exception.status === 'Dismissed' && 'border-border bg-muted/50 text-muted-foreground',
              )}
            >
              {exception.status === 'Validated' && <CheckCircle2 className="size-4" />}
              {exception.status === 'Dismissed' && <XCircle className="size-4" />}
              {`Verdict recorded · ${exception.status}`}
            </div>
          ) : null}

          {isFinalAuditVerdict && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]',
                exception.status === 'Repair' && 'border-sky-200 bg-sky-50 text-sky-700',
                exception.status === 'Write-off' && 'border-border bg-muted/50 text-muted-foreground',
              )}
            >
              {exception.status === 'Repair' && <Wrench className="size-4" />}
              {exception.status === 'Write-off' && <Ban className="size-4" />}
              {`Audit resolved · ${exception.status} · two WOM sign-offs recorded`}
            </div>
          )}

          {isHeldForAudit && !showControls && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
              <Scale className="size-4" />
              On audit hold · awaiting first WOM sign-off
            </div>
          )}

          {isPendingSecondSignOff && !showControls && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
              <UserCheck2 className="size-4" />
              Pending a second, different WOM sign-off
            </div>
          )}

          {isStrictBlock && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-destructive">
                <AlertTriangle className="size-4" />
                Strict Block — Dual-Custody Deadlock
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Self-validation is disabled for the <strong>{womSubRoleName}</strong> sub-role, but only 1 active account exists in Workforce Management. Dual-custody sign-off cannot be completed.
              </p>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(true)}
                className="mt-1 self-start rounded bg-destructive px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90"
              >
                Admin Emergency Unblock
              </button>
            </div>
          )}

          {!editable && exception.status === 'Pending Verdict' && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Scale className="size-4" />
              Awaiting WOM verdict · read-only
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-stretch gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
          {isReviewable ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <Clock className="size-4 shrink-0" />
              <span>Declaration in Review Window. Supervisory sign-offs locked until finalized.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            {!isReviewable && showControls && exception.status === 'Pending Verdict' ? (
              <>
                <span className="mr-auto text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Part 1 · Claim review</span>
                <button
                  type="button"
                  onClick={() => setPendingVerdict('Dismissed')}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                >
                  <XCircle className="size-3.5" />
                  Dismiss Claim
                </button>
                <button
                  type="button"
                  onClick={() => setPendingVerdict('Validated')}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
                >
                  <CheckCircle2 className="size-3.5" />
                  Validate Claim
                </button>
              </>
            ) : !isReviewable && showControls && (isHeldForAudit || isPendingSecondSignOff) && !isStrictBlock ? (
              <>
                <span className="mr-auto text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Part 2 · Final disposition</span>
                <button
                  type="button"
                  onClick={() => setPendingVerdict('Write-off')}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                >
                  <Ban className="size-3.5" />
                  Sign Off · Write-off
                </button>
                <button
                  type="button"
                  onClick={() => setPendingVerdict('Repair')}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:bg-sky-100"
                >
                  <Wrench className="size-3.5" />
                  Sign Off · Repair
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={closeAll}
                className="rounded-md bg-primary px-6 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Revalidation confirmation step */}
      {pendingVerdict && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            setPendingVerdict(null)
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                'flex size-11 items-center justify-center rounded-full',
                pendingVerdict === 'Validated' && 'bg-emerald-100',
                pendingVerdict === 'Held for Audit' && 'bg-amber-100',
                pendingVerdict === 'Dismissed' && 'bg-muted',
                pendingVerdict === 'Repair' && 'bg-sky-100',
                pendingVerdict === 'Write-off' && 'bg-muted',
              )}
            >
              <AlertTriangle className={cn('size-5', verdictConfig[pendingVerdict].tone)} />
            </div>
            <h3 className="mt-4 font-serif text-lg font-medium text-card-foreground">
              {verdictConfig[pendingVerdict].confirmTitle}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {verdictConfig[pendingVerdict].confirmBody}
            </p>
            <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
              {exception.logId} · {exception.assetName}
            </p>
            {allowSelfValidation && (isHeldForAudit || isPendingSecondSignOff) && (
              <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-left">
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-card-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Standing Self-Validation Justification
                </p>
                <div>
                  <label className="block text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Written Rationale (≥20 Characters Required)
                  </label>
                  <textarea
                    rows={2}
                    value={selfValJustification}
                    onChange={(e) => setSelfValJustification(e.target.value)}
                    placeholder="Provide mandatory rationale bypassing dual custody..."
                    className="mt-1 w-full rounded border border-input bg-card p-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <div className="mt-1 flex items-center justify-between text-[0.58rem]">
                    <span className={selfValJustificationValid ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                      {selfValJustification.trim().length} / 20 characters minimum
                    </span>
                    {selfValJustificationValid && <span className="text-emerald-600 font-bold">✓ Valid</span>}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingVerdict(null)}
                className="rounded-md border border-border bg-card px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={allowSelfValidation && (isHeldForAudit || isPendingSecondSignOff) && !selfValJustificationValid}
                onClick={() => confirm()}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
                  pendingVerdict === 'Validated' && 'bg-emerald-600',
                  pendingVerdict === 'Held for Audit' && 'bg-amber-600',
                  pendingVerdict === 'Dismissed' && 'bg-neutral-900',
                  pendingVerdict === 'Repair' && 'bg-sky-600',
                  pendingVerdict === 'Write-off' && 'bg-neutral-900',
                )}
              >
                {(() => {
                  const Icon = verdictConfig[pendingVerdict].Icon
                  return <Icon className="size-3.5" />
                })()}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Emergency Unblock Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-medium text-card-foreground">Admin Emergency Unblock</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Resolve dual-custody deadlock for exception <strong className="text-foreground">{exception.logId}</strong>. Requires Admin confirmation PIN + rationale.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Admin Confirmation PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter 6-digit PIN"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Emergency Reason / Justification</label>
                <textarea
                  rows={2}
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  placeholder="Explain why emergency unblock is required..."
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-2">Unblock Scope Mode</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 rounded border border-border p-2.5 cursor-pointer hover:bg-muted/30">
                    <input
                      type="radio"
                      name="unblockMode"
                      checked={unblockMode === 'ONE_TIME'}
                      onChange={() => setUnblockMode('ONE_TIME')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-card-foreground">Option 1: One-Time Emergency Override</p>
                      <p className="text-[0.65rem] text-muted-foreground">Bypasses dual-custody for this current exception only. Sub-role RBAC settings remain unchanged.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 rounded border border-border p-2.5 cursor-pointer hover:bg-muted/30">
                    <input
                      type="radio"
                      name="unblockMode"
                      checked={unblockMode === 'PERMANENT'}
                      onChange={() => setUnblockMode('PERMANENT')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-destructive">Option 2: Permanent Sub-Role Re-configuration</p>
                      <p className="text-[0.65rem] text-muted-foreground">Permanently sets allowSelfValidation = true for {womSubRoleName} in RBAC.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteEmergencyUnblock}
                disabled={!adminPin || !adminReason.trim()}
                className="rounded-md bg-destructive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {unblockMode === 'PERMANENT' ? 'Proceed to Warning' : 'Execute Emergency Unblock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Friction Confirmation Warning Modal */}
      {showHighFrictionWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-lg rounded-xl border border-destructive bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-6 shrink-0" />
              <h3 className="font-serif text-xl font-bold">WARNING: Permanent Sub-Role Policy Change</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This action <strong className="text-destructive">permanently overwrites the dual-custody policy</strong> for the <strong className="text-foreground">{womSubRoleName}</strong> sub-role across the platform.
              Going forward, officers in this sub-role will be permitted to self-validate audit holds standing alone.
              This emergency conversion will be permanently traced in security logs and sub-role audit records.
            </p>

            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-1 size-4 rounded border-input"
                />
                <span className="text-xs font-semibold text-card-foreground leading-snug">
                  I understand and accept this permanent policy change for the {womSubRoleName} sub-role.
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowHighFrictionWarning(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!ackChecked}
                onClick={handleConfirmPermanentUnblock}
                className="rounded-md bg-destructive px-5 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Permanent Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supervisory Amendment Modal */}
      {showAmendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            if (!isAmending) setShowAmendModal(false)
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileEdit className="size-5 text-primary" />
                <h3 className="font-serif text-lg font-medium text-card-foreground">
                  Authoritative Supervisory Amendment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isAmending && setShowAmendModal(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              This declaration is <strong>Finalized</strong>. Ordinary crew editing is locked. As an authorized supervisor, you may record an audited amendment to correct values. This action requires a mandatory operational rationale and increments the authoritative version.
            </p>

            {amendError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p>{amendError}</p>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs">
                <div>
                  <p className="text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground">Current Version</p>
                  <p className="font-mono font-bold text-card-foreground">v{exception.version ?? 1}</p>
                </div>
                <div>
                  <p className="text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground">Declaration Status</p>
                  <p className="font-semibold text-emerald-600">Finalized</p>
                </div>
              </div>

              <div>
                <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Damaged Quantity (Bulk Accountability)
                </label>
                <input
                  type="number"
                  min="1"
                  value={amendQuantity}
                  onChange={(e) => setAmendQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
                <p className="mt-1 text-[0.55rem] text-muted-foreground">
                  Previous value: {exception.damagedQuantity ?? 1} unit(s)
                </p>
              </div>

              <div>
                <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Damage Type / Severity
                </label>
                <input
                  type="text"
                  value={amendDamageType}
                  onChange={(e) => setAmendDamageType(e.target.value)}
                  placeholder="e.g. Scratched surface, Broken frame"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
                <p className="mt-1 text-[0.55rem] text-muted-foreground">
                  Previous value: {exception.damageType}
                </p>
              </div>

              <div>
                <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Mandatory Supervisory Rationale (≥10 characters)
                </label>
                <textarea
                  rows={3}
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  placeholder="Detail the operational reason for this supervisory amendment..."
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
                <div className="mt-1 flex items-center justify-between text-[0.58rem]">
                  <span className={amendReason.trim().length >= 10 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {amendReason.trim().length} / 10 characters minimum
                  </span>
                  {amendReason.trim().length >= 10 && <span className="text-emerald-600 font-bold">✓ Valid Rationale</span>}
                </div>
              </div>

              {/* Effective values preview */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-primary">Effective Values Confirmation Preview</p>
                <p className="text-[0.65rem] text-card-foreground">
                  Quantity: <strong className="line-through text-muted-foreground">{exception.damagedQuantity ?? 1}</strong> → <strong className="text-primary">{amendQuantity}</strong>
                </p>
                <p className="text-[0.65rem] text-card-foreground">
                  Damage Type: <strong className="line-through text-muted-foreground">{exception.damageType}</strong> → <strong className="text-primary">{amendDamageType}</strong>
                </p>
                <p className="text-[0.65rem] text-card-foreground">
                  Authoritative Version: <strong>v{exception.version ?? 1}</strong> → <strong className="text-primary">v{(exception.version ?? 1) + 1}</strong>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                disabled={isAmending}
                onClick={() => setShowAmendModal(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAmending || amendReason.trim().length < 10}
                onClick={handleAmend}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAmending ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Amending...
                  </>
                ) : (
                  <>
                    <FileEdit className="size-3.5" />
                    Confirm Authoritative Amendment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
