import { useEffect, useState } from 'react'
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
  ArrowUpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DamageException, DamageVerdict } from '@/lib/types'

export type ResolvableVerdict = Exclude<DamageVerdict, 'Pending Verdict'>
export type ExecutiveModalMode =
  | 'view'
  | 'evaluate-round1'
  | 'evaluate-round2'
  | 'edit-round1'
  | 'edit-round2'

// Copy + styling for the revalidation confirmation step, keyed by active verdicts.
const verdictConfig: Record<
  ResolvableVerdict,
  { label: string; confirmTitle: string; confirmBody: string; tone: string; Icon: typeof Scale }
> = {
  Dismissed: {
    label: 'Dismiss Claim',
    confirmTitle: 'Confirm Claim Dismissal',
    confirmBody:
      'This will dismiss the exception with no financial impact. The asset will be returned to available stock.',
    tone: 'text-destructive',
    Icon: XCircle,
  },
  'Pending Resolution': {
    label: 'Pending Resolution',
    confirmTitle: 'Confirm Pending Resolution',
    confirmBody:
      'This validates the exception and flags it for disposition processing. Liability is recorded in the audit trail.',
    tone: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  'Escalated — Round 1 Review': {
    label: 'Escalated (Round 1)',
    confirmTitle: 'Escalated for Round 1 Executive Review',
    confirmBody: 'This exception has been escalated for Round 1 Executive review.',
    tone: 'text-rose-700',
    Icon: ArrowUpCircle,
  },
  'Escalated — Round 2 Review': {
    label: 'Escalated (Round 2)',
    confirmTitle: 'Escalated for Round 2 Executive Review',
    confirmBody: 'This exception has been escalated for final Round 2 Executive review.',
    tone: 'text-rose-700',
    Icon: ArrowUpCircle,
  },
  'Sent for Repair': {
    label: 'Sign Off · Repair',
    confirmTitle: 'Confirm Sign-off · Repair',
    confirmBody:
      'This records your sign-off recommending Repair. The asset status will transition to In Maintenance in the Asset Registry.',
    tone: 'text-sky-700',
    Icon: Wrench,
  },
  'Sent for Write-off': {
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
  mode?: ExecutiveModalMode
  editable?: boolean
  evaluateForExecutive?: boolean
  currentExecutiveEmail?: string
  currentExecutiveName?: string
  activeExecutiveCount?: number
  allowSelfValidation?: boolean
  permanentlyEnabledViaEmergency?: boolean
  womSubRoleName?: string
  onClose: () => void
  onResolve: (
    id: string,
    verdict: ResolvableVerdict,
    note: string,
    unblockMetadata?: any,
    selfValRecord?: any
  ) => void
  onPermanentUnblockSubRole?: (subRoleName: string, metadata: any) => void
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)

export function DamageVerdictModal({
  exception,
  onClose,
  onResolve,
  editable = false,
  evaluateForExecutive = false,
  currentExecutiveEmail = '',
  currentExecutiveName = '',
  activeExecutiveCount = 2,
  allowSelfValidation = true,
  permanentlyEnabledViaEmergency = false,
  womSubRoleName = 'Warehouse Manager',
  onPermanentUnblockSubRole,
}: Props) {
  if (!exception) return null

  const [note, setNote] = useState('')
  const [pendingVerdict, setPendingVerdict] = useState<ResolvableVerdict | null>(null)

  // Self-validation fields
  const [selfValJustification, setSelfValJustification] = useState('')

  // Emergency Unblock Modal fields
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [adminReason, setAdminReason] = useState('')
  const [unblockMode, setUnblockMode] = useState<'ONE_TIME' | 'PERMANENT'>('ONE_TIME')
  const [showHighFrictionWarning, setShowHighFrictionWarning] = useState(false)
  const [ackChecked, setAckChecked] = useState(false)

  useEffect(() => {
    setNote('')
    setPendingVerdict(null)
    setSelfValJustification('')
    setShowEmergencyModal(false)
    setShowHighFrictionWarning(false)
    setAckChecked(false)
  }, [exception])

  const showControls = editable
  const isEscalatedForExecutive =
    exception.status === 'Escalated — Round 1 Review' ||
    exception.status === 'Escalated — Round 2 Review'
  const isPendingResolution = exception.status === 'Pending Resolution'
  const isFinalAuditVerdict =
    exception.status === 'Sent for Repair' || exception.status === 'Sent for Write-off'

  const handleConfirmAction = (overrideUnblockMeta?: any) => {
    if (!pendingVerdict) return

    let selfRecord = undefined
    if (allowSelfValidation && isPendingResolution) {
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
    onResolve(
      exception.id,
      pendingVerdict,
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
      handleConfirmAction(meta)
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
    handleConfirmAction(meta)
  }

  const closeAll = () => {
    setPendingVerdict(null)
    setShowEmergencyModal(false)
    setShowHighFrictionWarning(false)
    onClose()
  }

  const isStrictBlock = !allowSelfValidation && activeExecutiveCount < 2 && isPendingResolution
  const selfValJustificationValid = selfValJustification.trim().length >= 20

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Damage verdict for ${exception.assetName}`}
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
            <h2 className="mt-1 font-serif text-2xl font-medium leading-tight text-sidebar-primary text-balance">
              {exception.assetName}
            </h2>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.15em] text-sidebar-foreground/60">
              SKU: {exception.assetSku}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAll}
            className="text-sidebar-foreground/70 transition hover:text-sidebar-primary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
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
                  src={exception.imageUrl || '/placeholder.svg'}
                  alt={`Field-captured damage evidence for ${exception.assetName}`}
                  className="aspect-video w-full object-cover"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-foreground/70 px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-background backdrop-blur-sm">
                  <Camera className="size-3" />
                  Field Capture
                </span>
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
                <span>Uploaded by {exception.reportingOfficer} · {exception.officerRole}</span>
                <span className="font-mono normal-case tracking-normal">{exception.capturedAt}</span>
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

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Reported Damage
                </p>
                <p className="mt-1 text-sm font-semibold text-card-foreground">{exception.damageType}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                  exception.exifVerified
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800',
                )}
              >
                <ShieldCheck className="size-3" />
                {exception.exifVerified ? 'EXIF Authenticated' : 'EXIF Unverified'}
              </span>
            </div>
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
              readOnly={!showControls}
              rows={3}
              placeholder={showControls ? "Document the rationale for this verdict or sign-off..." : ""}
              className={cn(
                "mt-2 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none",
                showControls
                  ? "border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                  : "border-input bg-muted text-muted-foreground"
              )}
            />
          </div>

          {exception.status === 'Pending Resolution' || exception.status === 'Dismissed' ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]',
                exception.status === 'Pending Resolution' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                exception.status === 'Dismissed' && 'border-border bg-muted/50 text-muted-foreground',
              )}
            >
              {exception.status === 'Pending Resolution' && <CheckCircle2 className="size-4" />}
              {exception.status === 'Dismissed' && <XCircle className="size-4" />}
              {`Verdict recorded · ${exception.status}`}
            </div>
          ) : null}

          {isFinalAuditVerdict && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]',
                exception.status === 'Sent for Repair' && 'border-sky-200 bg-sky-50 text-sky-700',
                exception.status === 'Sent for Write-off' && 'border-border bg-muted/50 text-muted-foreground',
              )}
            >
              {exception.status === 'Sent for Repair' && <Wrench className="size-4" />}
              {exception.status === 'Sent for Write-off' && <Ban className="size-4" />}
              {`Audit resolved · ${exception.status} · Executive sign-off recorded`}
            </div>
          )}

          {isEscalatedForExecutive && !showControls && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-rose-700">
              <ArrowUpCircle className="size-4" />
              Escalated for Executive Review · awaiting Executive verdict
            </div>
          )}

          {isStrictBlock && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-destructive">
                <AlertTriangle className="size-4" />
                Strict Block — Dual-Custody Deadlock
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Self-validation is disabled for the <strong>{womSubRoleName}</strong> sub-role, but only 1 active account exists in Workforce Management.
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

        {/* Footer actions */}
        <div className="flex flex-col items-stretch gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-end shrink-0">
          {showControls && evaluateForExecutive ? (
            <>
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
                onClick={() => setPendingVerdict('Pending Resolution')}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
              >
                <CheckCircle2 className="size-3.5" />
                Validate Damage
              </button>
            </>
          ) : showControls && exception.status === 'Pending Verdict' ? (
            <>
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
                onClick={() => setPendingVerdict('Escalated — Round 1 Review')}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-amber-800 transition hover:bg-amber-100"
              >
                <ArrowUpCircle className="size-3.5" />
                Escalate (Round 1)
              </button>
              <button
                type="button"
                onClick={() => setPendingVerdict('Pending Resolution')}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
              >
                <CheckCircle2 className="size-3.5" />
                Validate Damage
              </button>
            </>
          ) : showControls && isPendingResolution && !isStrictBlock ? (
            <>
              <button
                type="button"
                onClick={() => setPendingVerdict('Sent for Write-off')}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              >
                <Ban className="size-3.5" />
                Sign Off · Write-off
              </button>
              <button
                type="button"
                onClick={() => setPendingVerdict('Sent for Repair')}
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
                pendingVerdict === 'Pending Resolution' && 'bg-emerald-100',
                pendingVerdict === 'Dismissed' && 'bg-muted',
                pendingVerdict === 'Sent for Repair' && 'bg-sky-100',
                pendingVerdict === 'Sent for Write-off' && 'bg-muted',
                (pendingVerdict === 'Escalated — Round 1 Review' || pendingVerdict === 'Escalated — Round 2 Review') && 'bg-rose-100',
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
            {allowSelfValidation && isPendingResolution && (
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
                disabled={allowSelfValidation && isPendingResolution && !selfValJustificationValid}
                onClick={() => handleConfirmAction()}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
                  pendingVerdict === 'Pending Resolution' && 'bg-emerald-600',
                  pendingVerdict === 'Dismissed' && 'bg-neutral-900',
                  pendingVerdict === 'Sent for Repair' && 'bg-sky-600',
                  pendingVerdict === 'Sent for Write-off' && 'bg-neutral-900',
                  (pendingVerdict === 'Escalated — Round 1 Review' || pendingVerdict === 'Escalated — Round 2 Review') && 'bg-rose-600',
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
    </div>
  )
}